import { afterEach, expect, it, vi } from "vitest";
import { airportDemo } from "./demo";
import { persistWorkspace, readWorkspace, STORAGE_KEY } from "./storage";

function mockStorage(raw: string | null) {
  const getItem = vi.fn(() => raw);
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { getItem, setItem });

  return { getItem, setItem };
}

afterEach(() => vi.unstubAllGlobals());

it("normalizes legacy draft and saved entries without rewriting device storage", () => {
  const scenario = airportDemo();
  delete scenario.linkedDelays;

  for (const plan of scenario.plans) {
    for (const step of plan.steps) {
      delete step.finishByLocal;
    }
  }

  const storage = mockStorage(JSON.stringify({ draft: scenario, saved: [scenario] }));
  const workspace = readWorkspace();
  expect(workspace.warning).toBe("");
  expect(workspace.draft.linkedDelays).toBe(0);
  expect(workspace.saved).toHaveLength(1);
  expect(workspace.saved[0]).toEqual(workspace.draft);
  expect(workspace.saved[0].plans[0].steps[0].finishByLocal).toBe("");
  expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it.each([
  "null",
  "[]",
  '{"draft":null,"saved":[]}',
  JSON.stringify({ draft: airportDemo(), saved: [null] }),
  JSON.stringify({ draft: airportDemo(), saved: Array.from({ length: 21 }, airportDemo) }),
])("preserves unreadable device data while opening the fallback: %s", (raw) => {
  const storage = mockStorage(raw);
  const workspace = readWorkspace();
  expect(workspace.warning).toContain("has not been erased");
  expect(workspace.saved).toEqual([]);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("does not overwrite storage with an incomplete editor draft", () => {
  const storage = mockStorage("retained");
  const scenario = airportDemo();
  scenario.plans = [];
  expect(persistWorkspace(scenario, [])).toBe(false);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("accepts 20 saved scenarios and preserves extension data", () => {
  const scenario = { ...airportDemo(), extension: { note: "retained" } };

  const storage = mockStorage(
    JSON.stringify({ draft: scenario, saved: Array.from({ length: 20 }, () => scenario) }),
  );

  const workspace = readWorkspace();
  expect(workspace.warning).toBe("");
  expect(workspace.saved).toHaveLength(20);
  expect(workspace.draft).toMatchObject({ extension: { note: "retained" } });
  expect(workspace.saved[19]).toMatchObject({ extension: { note: "retained" } });
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("rejects a malformed later saved entry without partially loading or overwriting storage", () => {
  const scenario = airportDemo();
  const malformed = { ...scenario, confidence: "0.9" };
  const storage = mockStorage(JSON.stringify({ draft: scenario, saved: [scenario, malformed] }));
  const workspace = readWorkspace();
  expect(workspace.warning).toContain("has not been erased");
  expect(workspace.saved).toEqual([]);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("retains incomplete date text in a structurally valid editor draft", () => {
  const scenario = { ...airportDemo(), arrivalLocal: "incomplete date" };
  const storage = mockStorage(null);
  expect(persistWorkspace(scenario, [])).toBe(true);
  expect(storage.setItem).toHaveBeenCalledWith(
    STORAGE_KEY,
    JSON.stringify({ draft: scenario, saved: [] }),
  );
});
