import { errorMessage, LIMITS } from "./model";
import type { Plan, Scenario, Step } from "./model";
import { MINUTE, parseTime } from "./time";

export interface PreparedStep extends Step {
  schedule: number[];
  finishBy: number | null;
}

export interface PreparedPlan {
  steps: PreparedStep[];
  deadline: number;
  arrival: number;
  earliest: number | null;
}

export function prepareTiming(scenario: Scenario, plan: Plan): PreparedPlan {
  const arrival = parseTime(scenario.arrivalLocal, scenario.timeZone, scenario.disambiguation);

  const earliest = scenario.earliestLocal
    ? parseTime(scenario.earliestLocal, scenario.timeZone, scenario.disambiguation)
    : null;

  const steps = plan.steps.map((step) => {
    let schedule: number[] = [];

    if (step.kind === "transit") {
      const entries = step.departures
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (!entries.length || entries.length > LIMITS.departures) {
        throw new Error(`${step.label}: enter 1–200 dated departures.`);
      }

      try {
        schedule = [
          ...new Set(entries.map((t) => parseTime(t, scenario.timeZone, scenario.disambiguation))),
          // oxlint-disable-next-line unicorn/no-array-sort -- Sort only a fresh or copied array; preserve the existing ES2022 browser target.
        ].sort((a, b) => a - b);
      } catch (error) {
        throw new Error(`${step.label}: ${errorMessage(error)}`, { cause: error });
      }
    }

    let finishBy: number | null = null;

    if (step.finishByLocal) {
      try {
        finishBy = parseTime(step.finishByLocal, scenario.timeZone, scenario.disambiguation);
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
