import { describe, expect, it } from "vitest";
import { airportDemo } from "./demo";
import {
  exportScenario,
  normalizeScenario,
  parseScenarioFile,
  validateScenario,
} from "./validation";

const example = airportDemo();

const plan = example.plans[0];

const step = plan.steps[0];

describe("Zod scenario boundaries", () => {
  it.each([
    ["null", null, /missing or unsupported/],
    ["an array", [], /missing or unsupported/],
    ["a numeric string", { ...example, confidence: "0.9" }, /missing or unsupported/],
    ["NaN", { ...example, confidence: NaN }, /missing or unsupported/],
    ["infinity", { ...example, finalBuffer: Infinity }, /missing or unsupported/],
    ["null linkage", { ...example, linkedDelays: null }, /missing or unsupported/],
    [
      "coerced disambiguation",
      { ...example, disambiguation: ["reject"] },
      /missing or unsupported/,
    ],
    ["an empty ID", { ...example, id: "" }, /missing or unsupported/],
    ["a missing selected plan", { ...example, activePlanId: "absent" }, /selected plan/],
    ["zero plans", { ...example, plans: [] }, /missing or unsupported/],
    ["a non-object plan", { ...example, plans: [null] }, /unique ID/],
    ["zero steps", { ...example, plans: [{ ...plan, steps: [] }] }, /1–20/],
    ["a non-object step", { ...example, plans: [{ ...plan, steps: [null] }] }, /finite/],
    [
      "a numeric step string",
      { ...example, plans: [{ ...plan, steps: [{ ...step, min: "5" }] }] },
      /finite/,
    ],
    [
      "a coerced step kind",
      { ...example, plans: [{ ...plan, steps: [{ ...step, kind: ["walk"] }] }] },
      /finite/,
    ],
    [
      "a null cutoff",
      { ...example, plans: [{ ...plan, steps: [{ ...step, finishByLocal: null }] }] },
      /finite/,
    ],
    [
      "an excessive step buffer",
      { ...example, plans: [{ ...plan, steps: [{ ...step, buffer: 241 }] }] },
      /finite/,
    ],
    [
      "an excessive boarding buffer",
      { ...example, plans: [{ ...plan, steps: [{ ...step, boardingBuffer: 121 }] }] },
      /finite/,
    ],
  ])("rejects %s without coercion", (_label, input, message) => {
    expect(() => validateScenario(input)).toThrow(message);
  });

  it("preserves UTF-16 length limits rather than switching to code-point limits", () => {
    expect(() => validateScenario({ ...example, name: "😀".repeat(50) })).not.toThrow();
    expect(() => validateScenario({ ...example, name: "😀".repeat(51) })).toThrow(
      /missing or unsupported/,
    );
    expect(() => validateScenario({ ...example, assumption: "😀".repeat(1000) })).not.toThrow();
    expect(() => validateScenario({ ...example, assumption: "😀".repeat(1001) })).toThrow(
      /missing or unsupported/,
    );
  });

  it("accepts fractional minutes and inclusive numeric bounds", () => {
    const scenario = {
      ...example,
      confidence: 0.5,
      linkedDelays: 1,
      finalBuffer: 240,
      activePlanId: plan.id,
      plans: [
        {
          ...plan,
          steps: [{ ...step, min: 0, mode: 0.5, max: 1440, buffer: 240, boardingBuffer: 120 }],
        },
      ],
    };

    expect(() => validateScenario(scenario)).not.toThrow();
  });

  it("keeps unknown extension fields through import and normalization", () => {
    const scenario = {
      ...example,
      extension: { source: "a future exporter" },
      activePlanId: plan.id,
      plans: [{ ...plan, extension: ["plan"], steps: [{ ...step, extension: { note: true } }] }],
    };

    expect(parseScenarioFile(exportScenario(scenario))).toEqual(normalizeScenario(scenario));
  });

  it("keeps structural editor validation separate from executable import dates", () => {
    const scenario = { ...example, arrivalLocal: "incomplete date" };
    expect(() => validateScenario(scenario)).not.toThrow();
    expect(() => parseScenarioFile(exportScenario(scenario))).toThrow(/full date/);
  });

  it.each(["1", true, 0, 3, null])(
    "rejects unsupported or coerced envelope version %s",
    (version) => {
      expect(() =>
        parseScenarioFile(JSON.stringify({ format: "leavewell", version, scenario: example })),
      ).toThrow(/Unsupported file format/);
    },
  );
});
