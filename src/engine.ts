import { errorMessage } from "./model";
import type { Plan, Scenario, Step } from "./model";
import { MINUTE, parseTime } from "./time";
import { validateScenario } from "./validation";

export const SAMPLE_COUNT = 4096;

export const SEED = 0x1eaf2026;

interface PreparedStep extends Step {
  schedule: number[];
  finishBy: number | null;
}

export interface PreparedPlan {
  steps: PreparedStep[];
  deadline: number;
  arrival: number;
  earliest: number | null;
}

export interface TimelineRow {
  step: Step;
  start: number;
  end: number;
  completed: number;
  finishBy: number | null;
  ready: number;
  departure: number | null;
  cutoff: number | null;
  wait: number;
}

export interface ForwardResult {
  arrival: number;
  rows: TimelineRow[];
  missedCutoffs: string[];
}

export interface Sensitivity {
  id: string;
  label: string;
  minutes: number;
  range: number;
  kind: Step["kind"];
}

export interface Analysis {
  planId: string;
  error: string | null;
  prepared: PreparedPlan | null;
  recommendation: number | null;
  typical: number | null;
  bounded: number | null;
  coverage: number;
  earliestCoverage: number | null;
  impossibleFraction: number;
  status: "ready" | "constraint" | "impossible" | "invalid";
  samples: number[];
  durations: number[][];
  sensitivities: Sensitivity[];
}

export function random(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function triangular(
  min: number,
  mode: number,
  max: number,
  u: number,
): number {
  if (min === max) {return min;}

  const split = (mode - min) / (max - min);

  return u < split
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

export function prepare(scenario: Scenario, plan: Plan): PreparedPlan {
  validateScenario(scenario);

  const arrival = parseTime(
    scenario.arrivalLocal,
    scenario.timeZone,
    scenario.disambiguation,
  );

  const earliest = scenario.earliestLocal
    ? parseTime(
        scenario.earliestLocal,
        scenario.timeZone,
        scenario.disambiguation,
      )
    : null;

  const steps = plan.steps.map((step) => {
    let schedule: number[] = [];

    if (step.kind === "transit") {
      const entries = step.departures
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (!entries.length || entries.length > 200)
        {throw new Error(`${step.label}: enter 1–200 dated departures.`);}

      try {
        schedule = [
          ...new Set(
            entries.map((t) =>
              parseTime(t, scenario.timeZone, scenario.disambiguation),
            ),
          ),
        ].sort((a, b) => a - b);
      } catch (error) {
        throw new Error(`${step.label}: ${errorMessage(error)}`, { cause: error });
      }
    }

    let finishBy: number | null = null;

    if (step.finishByLocal) {
      try {
        finishBy = parseTime(
          step.finishByLocal,
          scenario.timeZone,
          scenario.disambiguation,
        );
      } catch (error) {
        throw new Error(`${step.label} finish-by: ${errorMessage(error)}`, { cause: error });
      }
    }

    return { ...step, schedule, finishBy };
  });

  return {
    steps,
    arrival,
    deadline: arrival - scenario.finalBuffer * MINUTE,
    earliest,
  };
}

/** Invert each monotone FIFO step, including timetable discontinuities. */
export function backward(prepared: PreparedPlan, durations: number[]): number {
  let latest = prepared.deadline;

  for (let j = prepared.steps.length - 1; j >= 0; j--) {
    const s = prepared.steps[j];
    // The checkpoint bounds completion; the fixed buffer happens afterward.
    latest =
      Math.min(latest - s.buffer * MINUTE, s.finishBy ?? Infinity) -
      durations[j] * MINUTE;

    if (s.kind === "transit") {
      let departure = -Infinity;

      for (let k = s.schedule.length - 1; k >= 0; k--)
        {if (s.schedule[k] <= latest) {
          departure = s.schedule[k];
          break;
        }}

      if (!Number.isFinite(departure)) {return -Infinity;}

      latest = departure - s.boardingBuffer * MINUTE;
    }
  }

  return latest;
}

export function forward(
  prepared: PreparedPlan,
  leave: number,
  durations: number[],
): ForwardResult {
  let current = leave;
  const rows: TimelineRow[] = [];
  const missedCutoffs: string[] = [];

  for (let j = 0; j < prepared.steps.length; j++) {
    const s = prepared.steps[j];
    const ready = current;
    let departure: number | null = null;
    let cutoff: number | null = null;

    if (s.kind === "transit") {
      departure =
        s.schedule.find((t) => t >= current + s.boardingBuffer * MINUTE) ??
        Infinity;
      cutoff = departure - s.boardingBuffer * MINUTE;
      current = departure;
    }

    const start = current;
    const completed = current + durations[j] * MINUTE;
    current = completed + s.buffer * MINUTE;

    // Allow only sub-millisecond floating-point roundoff at inclusive equality.
    if (s.finishBy !== null && completed > s.finishBy + 0.01)
      {missedCutoffs.push(s.id);}

    rows.push({
      step: s,
      start,
      end: current,
      completed,
      finishBy: s.finishBy,
      ready,
      departure,
      cutoff,
      wait: (start - ready) / MINUTE,
    });
  }

  return { arrival: current, rows, missedCutoffs };
}

/** Inclusive lower-tail order statistic: at least ceil(p*n) sampled latest times >= d. */
export function departureQuantile(
  samples: number[],
  confidence: number,
): number | null {
  if (!samples.length) {return null;}

  const sorted = [...samples].sort((a, b) => a - b);
  const index = samples.length - Math.ceil(confidence * samples.length);
  const value = sorted[Math.max(0, index)];

  return Number.isFinite(value) ? Math.floor(value / MINUTE) * MINUTE : null;
}

export function coverageAt(
  samples: number[],
  departure: number | null,
): number {
  return departure === null || !Number.isFinite(departure)
    ? 0
    : samples.filter((t) => t >= departure).length / samples.length;
}

export function analyze(
  scenario: Scenario,
  plan: Plan,
  count = SAMPLE_COUNT,
): Analysis {
  const base: Analysis = {
    planId: plan.id,
    error: null,
    prepared: null,
    recommendation: null,
    typical: null,
    bounded: null,
    coverage: 0,
    earliestCoverage: null,
    impossibleFraction: 0,
    status: "invalid",
    samples: [],
    durations: [],
    sensitivities: [],
  };

  try {
    const prepared = prepare(scenario, plan);
    const rng = random(SEED);
    const linkageRng = random(SEED ^ 0x57e55);

    const durations = Array.from({ length: count }, () => {
      const linked = linkageRng() < (scenario.linkedDelays ?? 0);
      const shared = linkageRng();

      return prepared.steps.map((s) => {
        const independent = rng(); // Keep the original draw stream at every setting.

        return triangular(s.min, s.mode, s.max, linked ? shared : independent);
      });
    });

    const samples = durations.map((ds) => backward(prepared, ds));
    const recommendation = departureQuantile(samples, scenario.confidence);

    const typical = backward(
      prepared,
      prepared.steps.map((s) => s.mode),
    );

    const bounded = backward(
      prepared,
      prepared.steps.map((s) => s.max),
    );

    const earliestCoverage =
      prepared.earliest === null
        ? null
        : coverageAt(samples, prepared.earliest);

    const sensitivities = prepared.steps
      .map((step, j) => {
        const frozen = durations.map((ds) =>
          backward(
            prepared,
            ds.map((d, k) => (k === j ? step.mode : d)),
          ),
        );

        const fixedDeparture = departureQuantile(frozen, scenario.confidence);

        return {
          id: step.id,
          label: step.label,
          kind: step.kind,
          range: step.max - step.min,
          minutes:
            recommendation === null || fixedDeparture === null
              ? 0
              : Math.max(
                  0,
                  Math.round((fixedDeparture - recommendation) / MINUTE),
                ),
        };
      })
      .sort((a, b) => b.minutes - a.minutes || b.range - a.range);

    return {
      ...base,
      prepared,
      recommendation,
      typical: Number.isFinite(typical) ? typical : null,
      bounded: Number.isFinite(bounded)
        ? Math.floor(bounded / MINUTE) * MINUTE
        : null,
      samples,
      durations,
      sensitivities,
      coverage: coverageAt(samples, recommendation),
      earliestCoverage,
      impossibleFraction:
        samples.filter((t) => !Number.isFinite(t)).length / count,
      status:
        recommendation === null
          ? "impossible"
          : prepared.earliest !== null && recommendation < prepared.earliest
            ? "constraint"
            : "ready",
    };
  } catch (error) {
    return { ...base, error: errorMessage(error) };
  }
}

export function connectionRisks(
  analysis: Analysis,
  departure: number,
  rows: TimelineRow[],
): { id: string; cutoff: number; miss: number; next: number | null }[] {
  if (!analysis.prepared) {return [];}

  const p = analysis.prepared;
  const runs = analysis.durations.map((ds) => forward(p, departure, ds));

  return rows.flatMap((row, j) => {
    if (
      row.cutoff === null ||
      row.departure === null ||
      !Number.isFinite(row.departure)
    )
      {return [];}

    return [
      {
        id: row.step.id,
        cutoff: row.cutoff,
        miss:
          runs.filter((r) => r.rows[j].ready > row.cutoff!).length /
          runs.length,
        next: p.steps[j].schedule.find((t) => t > row.departure!) ?? null,
      },
    ];
  });
}

export function histogram(
  samples: number[],
  bins = 28,
): { min: number; max: number; counts: number[] } | null {
  const values = samples.filter(Number.isFinite);

  if (!values.length) {return null;}

  const min = Math.min(...values);
    const max = Math.max(...values);

  const width = Math.max(max - min, MINUTE);
  const counts = Array.from({ length: bins }, () => 0);
  values.forEach(
    (v) => counts[Math.min(bins - 1, Math.floor(((v - min) / width) * bins))]++,
  );

  return { min, max: Math.max(max, min + MINUTE), counts };
}

/** Each checkpoint’s marginal failure rate; these rates overlap and are not additive. */
export function checkpointRisks(
  analysis: Analysis,
  leave: number,
): { id: string; miss: number }[] {
  if (!analysis.prepared || !analysis.durations.length) {return [];}

  const steps = analysis.prepared.steps.filter((s) => s.finishBy !== null);

  if (!steps.length) {return [];}

  const counts = new Map(steps.map((s) => [s.id, 0]));

  for (const durations of analysis.durations) {
    const trip = forward(analysis.prepared, leave, durations);

    for (const id of trip.missedCutoffs)
      {counts.set(id, (counts.get(id) ?? 0) + 1);}
  }

  return steps.map((s) => ({
    id: s.id,
    miss: counts.get(s.id)! / analysis.durations.length,
  }));
}
