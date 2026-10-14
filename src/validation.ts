import { z } from "zod";
import type { Scenario, ScenarioFile } from "./model";
import { parseTime } from "./time";

const SCENARIO_ERROR =
  "This scenario has missing or unsupported fields. Import a Leavewell version 1 or 2 file.";

const PLAN_ERROR = "Each plan needs a unique ID, a name, and 1–20 steps.";

const STEP_ERROR =
  "Step durations and buffers must be finite, nonnegative minutes within the supported limits.";

// Preserve the file format's existing UTF-16 length limits without trimming user text.
const boundaryText = (maximum = 100, minimum = 1) =>
  z.string().refine((value) => value.length >= minimum && value.length <= maximum);

const minutes = (maximum: number) => z.number().min(0).max(maximum);

const stepSchema = z
  .looseObject({
    id: boundaryText(),
    label: boundaryText(),
    kind: z.enum(["walk", "drive", "transit", "task"]),
    min: minutes(1440),
    mode: minutes(1440),
    max: minutes(1440),
    buffer: minutes(240),
    boardingBuffer: minutes(120),
    departures: boundaryText(20_000, 0),
    finishByLocal: boundaryText(40, 0).optional(),
  })
  .superRefine((step, context) => {
    if (step.min > step.mode || step.mode > step.max) {
      context.addIssue({
        code: "custom",
        message: `${step.label}: use fastest ≤ typical ≤ slowest.`,
      });
    }
  });

const planSchema = z
  .looseObject({
    id: boundaryText(),
    name: boundaryText(),
    steps: z.array(stepSchema).min(1).max(20),
  })
  .superRefine((plan, context) => {
    const ids = new Set<string>();

    for (const step of plan.steps) {
      if (ids.has(step.id)) {
        context.addIssue({ code: "custom", message: STEP_ERROR });
      }

      ids.add(step.id);
    }
  });

/** Structural JSON boundary; date/time executability is checked only on file import. */
export const scenarioSchema = z
  .looseObject({
    id: boundaryText(),
    name: boundaryText(),
    arrivalLocal: boundaryText(40),
    timeZone: boundaryText(),
    disambiguation: z.enum(["reject", "earlier", "later"]),
    earliestLocal: boundaryText(40, 0),
    confidence: z.number().min(0.5).max(1),
    linkedDelays: z.number().min(0).max(1).optional(),
    finalBuffer: minutes(240),
    activePlanId: boundaryText(),
    assumption: boundaryText(2000, 0),
    plans: z.array(planSchema).min(1).max(5),
  })
  .superRefine((scenario, context) => {
    const ids = new Set<string>();

    for (const plan of scenario.plans) {
      if (ids.has(plan.id)) {
        context.addIssue({ code: "custom", message: PLAN_ERROR });
      }

      ids.add(plan.id);
    }

    if (!ids.has(scenario.activePlanId)) {
      context.addIssue({ code: "custom", message: "The selected plan is missing." });
    }
  }) satisfies z.ZodType<Scenario>;

const scenarioFileSchema = z.object({
  format: z.literal("leavewell"),
  version: z.union([z.literal(1), z.literal(2)]),
  scenario: z.unknown().optional(),
});

/** Validate imported/localStorage data before allowing it to enter the engine. */
export function validateScenario(data: unknown): asserts data is Scenario {
  const result = scenarioSchema.safeParse(data, {
    error: (issue) => {
      const path = issue.path ?? [];

      if (path[0] === "plans" && path.length >= 2) {
        return path[2] === "steps" && path.length >= 4 ? STEP_ERROR : PLAN_ERROR;
      }

      return SCENARIO_ERROR;
    },
  });

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? SCENARIO_ERROR);
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

  const envelope = scenarioFileSchema.safeParse(file);

  if (!envelope.success) {
    throw new Error("Unsupported file format. Choose a Leavewell version 1 or 2 scenario.");
  }

  validateScenario(envelope.data.scenario);
  // Imported files must be runnable. Editor drafts can temporarily be invalid.
  const s = envelope.data.scenario;
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
