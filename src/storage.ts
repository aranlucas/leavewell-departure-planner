import { airportDemo } from "./demo";
import type { Scenario } from "./model";
import { normalizeScenario, validateScenario } from "./validation";
export const STORAGE_KEY = "leavewell.v1";
export interface Workspace {
  draft: Scenario;
  saved: Scenario[];
  warning: string;
}
export function readWorkspace(): Workspace {
  const fallback = { draft: airportDemo(), saved: [], warning: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    validateScenario(data.draft);
    if (!Array.isArray(data.saved) || data.saved.length > 20)
      throw new Error("Invalid saved list");
    data.saved.forEach(validateScenario);
    return {
      draft: normalizeScenario(data.draft),
      saved: data.saved.map(normalizeScenario),
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
