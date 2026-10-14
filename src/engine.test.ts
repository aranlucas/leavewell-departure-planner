import { describe, expect, it } from "vitest";
import { airportDemo, appointmentDemo } from "./demo";
import {
  analyze,
  checkpointRisks,
  SEED,
  backward,
  connectionRisks,
  coverageAt,
  departureQuantile,
  forward,
  prepare,
  random,
  triangular,
} from "./engine";
import type { Scenario } from "./model";
import { MINUTE, offsetLabel, parseTime } from "./time";
import { exportScenario, parseScenarioFile, validateScenario } from "./validation";

function fixed(minutes = 60): Scenario {
  const s = appointmentDemo();
  s.timeZone = "America/Los_Angeles";
  s.arrivalLocal = "2026-10-03T08:00";
  s.finalBuffer = 0;
  s.earliestLocal = "";
  s.plans = [s.plans[0]];
  s.plans[0].steps = [
    {
      ...s.plans[0].steps[0],
      min: minutes,
      mode: minutes,
      max: minutes,
      buffer: 0,
    },
  ];
  s.activePlanId = s.plans[0].id;

  return s;
}

function transitScenario(): Scenario {
  const s = fixed(10);
  s.arrivalLocal = "2026-10-03T10:00";
  s.plans[0].steps.push({
    id: "bus",
    label: "Bus",
    kind: "transit",
    min: 20,
    mode: 20,
    max: 20,
    buffer: 0,
    boardingBuffer: 2,
    departures: "2026-10-03T09:15\n2026-10-03T09:30\n2026-10-03T09:45",
  });

  return s;
}

const epoch = (v: string) => parseTime(v, "America/Los_Angeles");

describe("time zones, DST and overnight trips", () => {
  it("resolves equivalent exact instants across zones", () =>
    expect(parseTime("2026-10-03T11:00", "America/New_York")).toBe(epoch("2026-10-03T08:00")));
  it("rejects nonexistent civil times even when an occurrence is chosen", () => {
    for (const choice of ["reject", "earlier", "later"] as const) {
      expect(() => parseTime("2026-03-08T02:30", "America/Los_Angeles", choice)).toThrow(
        /does not exist/,
      );
    }
  });
  it("requires a choice for repeated civil times", () =>
    expect(() => parseTime("2026-11-01T01:30", "America/Los_Angeles")).toThrow(/occurs twice/));
  it("distinguishes repeated times by exactly one elapsed hour", () => {
    const a = parseTime("2026-11-01T01:30", "America/Los_Angeles", "earlier");
    const b = parseTime("2026-11-01T01:30", "America/Los_Angeles", "later");
    expect(b - a).toBe(60 * MINUTE);
    expect(offsetLabel(a, "America/Los_Angeles")).toBe("-07:00");
    expect(offsetLabel(b, "America/Los_Angeles")).toBe("-08:00");
  });
  it("accepts an explicit offset to disambiguate a schedule", () =>
    expect(parseTime("2026-11-01T01:30-08:00", "America/Los_Angeles")).toBe(
      parseTime("2026-11-01T01:30", "America/Los_Angeles", "later"),
    ));
  it("subtracts elapsed time across spring-forward correctly", () => {
    const s = fixed(60);
    s.arrivalLocal = "2026-03-08T03:30";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-03-08T01:30"));
  });
  it("subtracts elapsed time across fall-back correctly", () => {
    const s = fixed(60);
    s.arrivalLocal = "2026-11-01T01:30";
    s.disambiguation = "later";
    expect(analyze(s, s.plans[0]).recommendation).toBe(
      parseTime(s.arrivalLocal, s.timeZone, "earlier"),
    );
  });
  it("keeps the previous date on overnight departures", () => {
    const s = fixed(90);
    s.arrivalLocal = "2026-10-03T00:30";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-02T23:00"));
  });
  it("supports overnight scheduled connections", () => {
    const s = transitScenario();
    s.arrivalLocal = "2026-10-03T00:30";
    s.plans[0].steps[1].departures = "2026-10-02T23:45\n2026-10-03T00:00";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-02T23:48"));
  });
  it("rejects invalid calendar dates and time zones", () => {
    expect(() => parseTime("2026-02-30T08:00", "UTC")).toThrow(/Invalid date/);
    expect(() => parseTime("2026-10-03T08:00", "Not/AZone")).toThrow(/IANA/);
  });
});

describe("distribution and percentile semantics", () => {
  it("triangular inverse respects endpoints and fixed bounds", () => {
    expect(triangular(5, 10, 20, 0)).toBe(5);
    expect(triangular(5, 10, 20, 1)).toBe(20);
    expect(triangular(10, 10, 10, 0.7)).toBe(10);
    expect(triangular(0, 0, 10, 0)).toBe(0);
    expect(triangular(0, 10, 10, 1)).toBe(10);
  });
  it("seeded draws are stable and inside [0,1)", () => {
    const a = random(42);
    const b = random(42);

    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("90% coverage takes the lower 10% departure order statistic, with equality counted", () => {
    const values = Array.from({ length: 100 }, (_, i) => i * MINUTE);
    const d = departureQuantile(values, 0.9);
    expect(d).toBe(10 * MINUTE);
    expect(coverageAt(values, d)).toBe(0.9);
    expect(departureQuantile(values, 1)).toBe(0);
  });
  it("ceil coverage works for a sample count that does not divide the target", () => {
    const values = [0, 1, 2].map((x) => x * MINUTE);
    expect(departureQuantile(values, 0.9)).toBe(0);
    expect(coverageAt(values, departureQuantile(values, 0.9))).toBeGreaterThanOrEqual(0.9);
  });
  it("rounds toward earlier departure, including negative epoch minutes", () => {
    expect(departureQuantile([MINUTE + 5000], 0.9)).toBe(MINUTE);
    expect(departureQuantile([-5000], 0.9)).toBe(-MINUTE);
  });
  it("counts impossible samples in the denominator rather than dropping them", () => {
    const v = [-Infinity, ...Array.from({ length: 9 }, () => 10 * MINUTE)];
    expect(coverageAt(v, 10 * MINUTE)).toBe(0.9);
    expect(departureQuantile(v, 0.9)).toBe(10 * MINUTE);
    expect(departureQuantile(v, 0.95)).toBeNull();
  });
  it("is repeatable and gets no later when confidence rises", () => {
    const s = airportDemo();
    const a = analyze(s, s.plans[0]);
    expect(analyze(s, s.plans[0]).samples).toEqual(a.samples);
    s.confidence = 0.99;
    expect(analyze(s, s.plans[0]).recommendation!).toBeLessThanOrEqual(a.recommendation!);
    expect(a.coverage).toBeGreaterThanOrEqual(0.9);
  });
  it("the recommendation is never later than the typical quantile for symmetric simple data", () => {
    const s = fixed(30);
    s.plans[0].steps[0].min = 10;
    s.plans[0].steps[0].max = 50;
    const a = analyze(s, s.plans[0]);
    expect(a.recommendation!).toBeLessThan(a.typical!);
    expect(a.bounded!).toBeLessThanOrEqual(a.recommendation!);
  });
});

describe("connections, buffers and constraints", () => {
  it("selects the latest feasible listed departure and accounts for boarding margin", () => {
    const s = transitScenario();
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-03T09:18"));
  });
  it("boarding cutoff equality catches the bus, 1 ms late misses it", () => {
    const s = transitScenario();
    const p = prepare(s, s.plans[0]);
    expect(forward(p, epoch("2026-10-03T09:18"), [10, 20]).rows[1].departure).toBe(
      epoch("2026-10-03T09:30"),
    );
    expect(forward(p, epoch("2026-10-03T09:18") + 1, [10, 20]).rows[1].departure).toBe(
      epoch("2026-10-03T09:45"),
    );
  });
  it("deduplicates and sorts schedules without inventing services", () => {
    const s = transitScenario();
    s.plans[0].steps[1].departures = "2026-10-03T09:30,2026-10-03T09:15,2026-10-03T09:30";
    expect(prepare(s, s.plans[0]).steps[1].schedule).toEqual([
      epoch("2026-10-03T09:15"),
      epoch("2026-10-03T09:30"),
    ]);
  });
  it("reports schedules that cannot fit instead of fabricating a departure", () => {
    const s = transitScenario();
    s.arrivalLocal = "2026-10-03T09:00";
    const a = analyze(s, s.plans[0]);
    expect(a.status).toBe("impossible");
    expect(a.recommendation).toBeNull();
    expect(a.impossibleFraction).toBe(1);
  });
  it("adding step and arrival buffers moves departure earlier", () => {
    const s = fixed(60);
    const original = analyze(s, s.plans[0]).recommendation!;
    s.finalBuffer = 10;
    s.plans[0].steps[0].buffer = 5;
    expect(analyze(s, s.plans[0]).recommendation).toBe(original - 15 * MINUTE);
  });
  it("an arrival buffer may force an earlier connection", () => {
    const s = transitScenario();
    s.finalBuffer = 15;
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-03T09:03"));
  });
  it("reports earliest departure conflicts with attainable coverage", () => {
    const s = fixed(60);
    s.earliestLocal = "2026-10-03T07:30";
    const a = analyze(s, s.plans[0]);
    expect(a.status).toBe("constraint");
    expect(a.earliestCoverage).toBe(0);
  });
  it("accepts earliest departure equal to the recommendation", () => {
    const s = fixed(60);
    s.earliestLocal = "2026-10-03T07:00";
    expect(analyze(s, s.plans[0]).status).toBe("ready");
  });
  it("backward inversion matches forward feasibility for sampled two-connection trips", () => {
    const s = transitScenario();
    s.arrivalLocal = "2026-10-03T11:00";
    s.plans[0].steps.push({
      ...s.plans[0].steps[1],
      id: "bus2",
      departures: "2026-10-03T10:00\n2026-10-03T10:15\n2026-10-03T10:30",
    });
    const p = prepare(s, s.plans[0]);
    const rng = random(17);

    for (let i = 0; i < 200; i++) {
      const ds = [5 + rng() * 15, 10 + rng() * 20, 15 + rng() * 15];
      const latest = backward(p, ds);
      expect(forward(p, latest, ds).arrival).toBeLessThanOrEqual(p.deadline + 0.01);
      expect(forward(p, latest + 1, ds).arrival).toBeGreaterThan(p.deadline);
    }
  });
  it("reports a missed boarding threshold and no later connection", () => {
    const s = transitScenario();
    s.plans[0].steps[1].departures = "2026-10-03T09:30";
    const a = analyze(s, s.plans[0]);
    const t = forward(a.prepared!, a.recommendation!, [10, 20]);
    const r = connectionRisks(a, a.recommendation! + 1, t.rows);
    expect(r[0].cutoff).toBe(epoch("2026-10-03T09:28"));
    expect(r[0].miss).toBe(1);
    expect(r[0].next).toBeNull();
  });
});

describe("portable files and defensive validation", () => {
  it("roundtrips exact scenario assumptions", () =>
    expect(parseScenarioFile(exportScenario(airportDemo()))).toEqual(airportDemo()));
  it("rejects malformed JSON and unsupported versions", () => {
    expect(() => parseScenarioFile("{bad")).toThrow(/valid JSON/);
    expect(() => parseScenarioFile('{"format":"leavewell","version":3}')).toThrow(/Unsupported/);
  });
  it("rejects inverted durations, NaN and negative buffers", () => {
    const s = fixed();
    s.plans[0].steps[0].min = 100;
    expect(() => validateScenario(s)).toThrow(/fastest/);
    s.plans[0].steps[0].min = NaN;
    expect(() => validateScenario(s)).toThrow(/finite/);
    s.plans[0].steps[0].min = 1;
    s.finalBuffer = -1;
    expect(() => validateScenario(s)).toThrow();
  });
  it("bounds plans, steps, imports and schedules", () => {
    const s = fixed();
    s.plans[0].steps = [];
    expect(() => validateScenario(s)).toThrow(/1–20/);
    expect(() => parseScenarioFile(" ".repeat(500001))).toThrow(/too large/);
    const t = transitScenario();
    t.plans[0].steps[1].departures = Array(201).fill("2026-10-03T09:00").join("\n");
    expect(analyze(t, t.plans[0]).error).toMatch(/1–200/);
  });
  it("rejects imported invalid dated departures", () => {
    const s = transitScenario();
    s.plans[0].steps[1].departures = "09:15";
    expect(() => parseScenarioFile(exportScenario(s))).toThrow(/full date/);
  });
  it("rejects duplicate plan and step IDs", () => {
    const s = appointmentDemo();
    s.plans[1].id = s.plans[0].id;
    expect(() => validateScenario(s)).toThrow(/unique/);
    const t = fixed();
    t.plans[0].steps.push({ ...t.plans[0].steps[0] });
    expect(() => validateScenario(t)).toThrow();
  });
});

describe("intermediate completion cutoffs", () => {
  it("enforces a checkpoint before the post-step buffer, with inclusive equality", () => {
    const s = fixed(10);
    s.plans[0].steps[0].buffer = 20;
    s.plans[0].steps[0].finishByLocal = "2026-10-03T07:00";
    s.plans[0].steps.push({
      ...s.plans[0].steps[0],
      id: "after",
      buffer: 0,
      finishByLocal: "",
    });
    const p = prepare(s, s.plans[0]);
    const latest = backward(p, [10, 10]);
    expect(latest).toBe(epoch("2026-10-03T06:50"));
    const trip = forward(p, latest, [10, 10]);
    expect(trip.rows[0].completed).toBe(epoch("2026-10-03T07:00"));
    expect(trip.rows[0].end).toBe(epoch("2026-10-03T07:20"));
    expect(trip.missedCutoffs).toEqual([]);
    const late = forward(p, latest + 1, [10, 10]);
    expect(late.arrival).toBeLessThan(p.deadline);
    expect(late.missedCutoffs).toEqual([s.plans[0].steps[0].id]);
  });
  it("ignores a nonbinding later checkpoint and tightens transit arrival cutoffs", () => {
    const s = transitScenario();
    const original = analyze(s, s.plans[0]).recommendation;
    s.plans[0].steps[1].finishByLocal = "2026-10-03T11:00";
    expect(analyze(s, s.plans[0]).recommendation).toBe(original);
    s.plans[0].steps[1].finishByLocal = "2026-10-03T09:45";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-03T09:03"));
    s.plans[0].steps[1].finishByLocal = "2026-10-03T09:00";
    expect(analyze(s, s.plans[0]).status).toBe("impossible");
  });
  it("checks every checkpoint when inverting stochastic two-connection trips", () => {
    const s = transitScenario();
    s.arrivalLocal = "2026-10-03T11:00";
    s.plans[0].steps[0].finishByLocal = "2026-10-03T09:20";
    s.plans[0].steps[1].finishByLocal = "2026-10-03T09:55";
    s.plans[0].steps.push({
      ...s.plans[0].steps[1],
      id: "bus2",
      departures: "2026-10-03T10:00\n2026-10-03T10:15",
      finishByLocal: "2026-10-03T10:40",
    });
    const p = prepare(s, s.plans[0]);
    const rng = random(91);

    for (let i = 0; i < 200; i++) {
      const ds = [5 + rng() * 15, 10 + rng() * 20, 15 + rng() * 15];
      const latest = backward(p, ds);

      if (!Number.isFinite(latest)) {
        continue;
      }

      const trip = forward(p, latest, ds);
      expect(trip.arrival).toBeLessThanOrEqual(p.deadline + 0.01);
      expect(trip.missedCutoffs).toEqual([]);
      const late = forward(p, latest + 1, ds);
      expect(late.arrival > p.deadline || late.missedCutoffs.length > 0).toBe(true);
    }
  });
  it("counts checkpoint failure separately and includes it in total coverage", () => {
    const s = fixed(10);
    s.plans[0].steps[0].finishByLocal = "2026-10-03T07:00";
    const a = analyze(s, s.plans[0]);
    expect(checkpointRisks(a, a.recommendation!)[0].miss).toBe(0);
    expect(checkpointRisks(a, a.recommendation! + MINUTE)[0].miss).toBe(1);
    expect(coverageAt(a.samples, a.recommendation! + MINUTE)).toBe(0);
  });
  it("resolves overnight and DST checkpoint dates rather than comparing clock strings", () => {
    const s = fixed(60);
    s.arrivalLocal = "2026-10-03T03:00";
    s.plans[0].steps[0].finishByLocal = "2026-10-03T00:30";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-10-02T23:30"));
    s.plans[0].steps[0].finishByLocal = "2026-03-08T02:30";
    expect(analyze(s, s.plans[0]).error).toMatch(/finish-by.*does not exist/);
    s.arrivalLocal = "2026-11-01T04:00";
    s.plans[0].steps[0].finishByLocal = "2026-11-01T01:30";
    expect(analyze(s, s.plans[0]).error).toMatch(/occurs twice/);
    s.plans[0].steps[0].finishByLocal = "2026-11-01T01:30-08:00";
    expect(analyze(s, s.plans[0]).recommendation).toBe(epoch("2026-11-01T01:30-07:00"));
  });
});

describe("linked-delay stress model", () => {
  it("keeps the original independent draw stream byte-for-byte at zero linkage", () => {
    const s = twoSteps();
    const rng = random(SEED);

    const original = Array.from({ length: 4096 }, () =>
      s.plans[0].steps.map((step) => triangular(step.min, step.mode, step.max, rng())),
    );

    delete s.linkedDelays;
    expect(analyze(s, s.plans[0]).durations).toEqual(original);
    s.linkedDelays = 0;
    expect(analyze(s, s.plans[0]).durations).toEqual(original);
  });
  it("makes identical distributions move exactly together at full linkage", () => {
    const s = twoSteps();
    s.linkedDelays = 1;
    const a = analyze(s, s.plans[0]);
    expect(a.durations.every(([first, second]) => first === second)).toBe(true);
    expect(analyze(s, s.plans[0]).samples).toEqual(a.samples);
    expect(a.coverage).toBeGreaterThanOrEqual(s.confidence);
  });
  it("mixes independent and shared-percentile runs without changing marginal bounds", () => {
    const s = twoSteps();
    s.linkedDelays = 0.5;
    const a = analyze(s, s.plans[0]);

    const linkedFraction = a.durations.filter(([x, y]) => x === y).length / a.durations.length;

    expect(linkedFraction).toBeGreaterThan(0.46);
    expect(linkedFraction).toBeLessThan(0.54);

    for (let j = 0; j < 2; j++) {
      const values = a.durations.map((ds) => ds[j]);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(5);
      expect(Math.max(...values)).toBeLessThanOrEqual(40);
      const mean = values.reduce((n, v) => n + v, 0) / values.length;
      expect(Math.abs(mean - (5 + 20 + 40) / 3)).toBeLessThan(0.4);
    }
  });
  it("moves the high-coverage departure earlier for linked identical simple steps", () => {
    const s = twoSteps();
    const independent = analyze(s, s.plans[0]).recommendation!;
    s.linkedDelays = 1;
    expect(analyze(s, s.plans[0]).recommendation!).toBeLessThan(independent);
  });
  it("enforces checkpoints and target coverage under partial linkage", () => {
    const s = twoSteps();
    s.linkedDelays = 0.7;
    s.plans[0].steps[0].finishByLocal = "2026-10-03T07:00";
    const a = analyze(s, s.plans[0]);

    const successes =
      a.durations.filter((ds) => {
        const t = forward(a.prepared!, a.recommendation!, ds);

        return t.arrival <= a.prepared!.deadline + 0.01 && t.missedCutoffs.length === 0;
      }).length / a.durations.length;

    expect(successes).toBeGreaterThanOrEqual(s.confidence);
    expect(successes).toBe(a.coverage);
  });
});

describe("version 2 migration", () => {
  it("loads a legacy v1 file with independent defaults and no checkpoints", () => {
    const s = airportDemo();
    delete s.linkedDelays;
    s.plans.forEach((p) => p.steps.forEach((step) => delete step.finishByLocal));
    const original = analyze(s, s.plans[0]).samples;

    const loaded = parseScenarioFile(
      JSON.stringify({ format: "leavewell", version: 1, scenario: s }),
    );

    expect(loaded.linkedDelays).toBe(0);
    expect(loaded.plans.every((p) => p.steps.every((step) => step.finishByLocal === ""))).toBe(
      true,
    );
    expect(analyze(loaded, loaded.plans[0]).samples).toEqual(original);
    expect(s.linkedDelays).toBeUndefined();
  });
  it("roundtrips linked assumptions and exact-offset checkpoints with version 2", () => {
    const s = fixed();
    s.linkedDelays = 0.6;
    s.plans[0].steps[0].finishByLocal = "2026-10-03T07:00-07:00";
    const raw = exportScenario(s);
    expect(JSON.parse(raw).version).toBe(2);
    expect(parseScenarioFile(raw)).toEqual(s);
  });
  it("rejects invalid linkage, malformed checkpoint fields and nonexistent imported dates", () => {
    const s = fixed();

    for (const invalid of [-1, 1.1, NaN]) {
      s.linkedDelays = invalid;
      expect(() => validateScenario(s)).toThrow();
    }

    s.linkedDelays = 0;
    s.plans[0].steps[0].finishByLocal = "x".repeat(41);
    expect(() => validateScenario(s)).toThrow();
    s.plans[0].steps[0].finishByLocal = "2026-03-08T02:30";
    expect(() => parseScenarioFile(exportScenario(s))).toThrow(/does not exist/);
  });
});

function twoSteps() {
  const s = fixed(20);
  s.plans[0].steps[0].min = 5;
  s.plans[0].steps[0].max = 40;
  s.plans[0].steps.push({ ...s.plans[0].steps[0], id: "second" });

  return s;
}
