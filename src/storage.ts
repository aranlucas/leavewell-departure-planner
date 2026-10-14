import { z } from "zod";
import { airportDemo } from "./demo";
import type { Scenario } from "./model";
import { normalizeScenario, scenarioSchema, validateScenario } from "./validation";

export const STORAGE_KEY = "leavewell.v1";

export interface Workspace {
  draft: Scenario;
  saved: Scenario[];
  warning: string;
}

const workspaceSchema = z.object({
  draft: scenarioSchema,
  saved: z.array(scenarioSchema).max(20),
});

export function readWorkspace(): Workspace {
  const fallback = { draft: airportDemo(), saved: [], warning: "" };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const data: unknown = JSON.parse(raw);

    const workspace = workspaceSchema.parse(data);

    return {
      draft: normalizeScenario(workspace.draft),
      saved: workspace.saved.map((scenario) => normalizeScenario(scenario)),
      warning: "",
    };
  } catch {
    return {
      ...fallback,
      warning:
        "Device storage could not be read. The demo is open; your existing storage has not been erased. Export your work as a backup.",
    };
  }
}

export function persistWorkspace(draft: Scenario, saved: Scenario[]): boolean {
  try {
    validateScenario(draft);
  } catch {
    return false;
  } // Never overwrite a valid stored draft with an incomplete editor value.

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, saved }));

  return true;
}
