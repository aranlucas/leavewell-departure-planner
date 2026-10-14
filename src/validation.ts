import type { Scenario, ScenarioFile } from "./model";
import { parseTime } from "./time";

interface BoundaryObject {
  id?: unknown;
  name?: unknown;
  arrivalLocal?: unknown;
  timeZone?: unknown;
  disambiguation?: unknown;
  earliestLocal?: unknown;
  confidence?: unknown;
  linkedDelays?: unknown;
  finalBuffer?: unknown;
  activePlanId?: unknown;
  assumption?: unknown;
  plans?: unknown;
  steps?: unknown;
  label?: unknown;
  kind?: unknown;
  min?: unknown;
  mode?: unknown;
  max?: unknown;
  buffer?: unknown;
  boardingBuffer?: unknown;
  departures?: unknown;
  finishByLocal?: unknown;
  format?: unknown;
  version?: unknown;
  scenario?: unknown;
}

const object = (x: unknown): x is BoundaryObject =>
  !!x && typeof x === "object" && !Array.isArray(x);

const text = (x: unknown, max = 100): x is string =>
  typeof x === "string" && x.length > 0 && x.length <= max;

const number = (x: unknown, max: number, min = 0): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;

/** Validate imported/localStorage data before allowing it to enter the engine. */
export function validateScenario(data: unknown): asserts data is Scenario {
  if (
    !object(data) ||
    !text(data.id) ||
    !text(data.name) ||
    !text(data.arrivalLocal, 40) ||
    !text(data.timeZone) ||
    !["reject", "earlier", "later"].includes(String(data.disambiguation)) ||
    typeof data.earliestLocal !== "string" ||
    data.earliestLocal.length > 40 ||
    !number(data.confidence, 1, 0.5) ||
    (data.linkedDelays !== undefined && !number(data.linkedDelays, 1)) ||
    !number(data.finalBuffer, 240) ||
    !text(data.activePlanId) ||
    typeof data.assumption !== "string" ||
    data.assumption.length > 2000 ||
    !Array.isArray(data.plans) ||
    data.plans.length < 1 ||
    data.plans.length > 5
  ) {
    throw new Error(
      "This scenario has missing or unsupported fields. Import a Leavewell version 1 or 2 file.",
    );
  }

  const planIds = new Set<string>();

  for (const p of data.plans) {
    if (
      !object(p) ||
      !text(p.id) ||
      !text(p.name) ||
      planIds.has(p.id) ||
      !Array.isArray(p.steps) ||
      p.steps.length < 1 ||
      p.steps.length > 20
    ) {
      throw new Error("Each plan needs a unique ID, a name, and 1–20 steps.");
    }

    planIds.add(p.id);
    const stepIds = new Set<string>();

    for (const s of p.steps) {
      if (
        !object(s) ||
        !text(s.id) ||
        stepIds.has(s.id) ||
        !text(s.label) ||
        !["walk", "drive", "transit", "task"].includes(String(s.kind)) ||
        !number(s.min, 1440) ||
        !number(s.mode, 1440) ||
        !number(s.max, 1440) ||
        !number(s.buffer, 240) ||
        !number(s.boardingBuffer, 120) ||
        typeof s.departures !== "string" ||
        s.departures.length > 20_000 ||
        (s.finishByLocal !== undefined &&
          (typeof s.finishByLocal !== "string" || s.finishByLocal.length > 40))
      ) {
        throw new Error(
          "Step durations and buffers must be finite, nonnegative minutes within the supported limits.",
        );
      }

      if (s.min > s.mode || s.mode > s.max) {
        throw new Error(`${s.label}: use fastest ≤ typical ≤ slowest.`);
      }

      stepIds.add(s.id);
    }
  }

  if (!planIds.has(data.activePlanId)) {
    throw new Error("The selected plan is missing.");
  }
}

export function parseScenarioFile(raw: string): Scenario {
  if (raw.length > 500_000) {
    throw new Error("That file is too large. Choose a scenario file under 500 KB.");
  }

  let file: unknown;

  try {
    file = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON. Choose an exported Leavewell scenario.");
  }

  if (!object(file) || file.format !== "leavewell" || (file.version !== 1 && file.version !== 2)) {
    throw new Error("Unsupported file format. Choose a Leavewell version 1 or 2 scenario.");
  }

  validateScenario(file.scenario);
  // Imported files must be runnable. Editor drafts can temporarily be invalid.
  const s = file.scenario;
  parseTime(s.arrivalLocal, s.timeZone, s.disambiguation);

  if (s.earliestLocal) {
    parseTime(s.earliestLocal, s.timeZone, s.disambiguation);
  }

  for (const p of s.plans) {
    for (const step of p.steps) {
      if (step.finishByLocal) {
        parseTime(step.finishByLocal, s.timeZone, s.disambiguation);
      }

      if (step.kind === "transit") {
        const entries = step.departures
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean);

        if (!entries.length || entries.length > 200) {
          throw new Error(`${step.label}: enter 1–200 dated departures.`);
        }

        for (const v of entries) {
          parseTime(v, s.timeZone, s.disambiguation);
        }
      }
    }
  }

  return normalizeScenario(s);
}

export function exportScenario(scenario: Scenario): string {
  // eslint-disable-next-line anti-slop/no-known-value-widening -- Export is a runtime boundary callable from JavaScript; keep defensive validation of caller-owned data.
  validateScenario(scenario);

  const file: ScenarioFile = {
    format: "leavewell",
    version: 2,
    scenario: normalizeScenario(scenario),
  };

  return JSON.stringify(file, null, 2);
}

/** Add v2 defaults without changing old plans or mutating caller-owned inputs. */
export function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    linkedDelays: scenario.linkedDelays ?? 0,
    plans: scenario.plans.map((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        finishByLocal: s.finishByLocal ?? "",
      })),
    })),
  };
}
