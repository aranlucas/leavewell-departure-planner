import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { airportDemo } from "../src/demo";
import { exportScenario } from "../src/validation";
import type { Page } from "@playwright/test";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") list.push(m.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("recommendation")).not.toHaveText("—");
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
async function expandSettings(page: Page) {
  await page.getByText("Time settings & assumptions", { exact: true }).click();
}
async function resetDraft(page: Page) {
  await page.getByRole("button", { name: "Reset draft to demo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset draft", exact: true })
    .click();
}

test("page identity, meaningful screen, responsive layout and screenshot", async ({
  page,
}, info) => {
  await expect(page).toHaveTitle("Leavewell — a little room to breathe");
  await expect(
    page.getByRole("heading", { name: "On time. With room to breathe." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Everything between here & there" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mkdir(resolve("artifacts"), { recursive: true });
  await page.screenshot({
    path: resolve(`artifacts/leavewell-${info.project.name}.png`),
    fullPage: true,
  });
  await page.screenshot({
    path: resolve(`artifacts/leavewell-${info.project.name}-viewport.png`),
    fullPage: false,
  });
});

test("duration, arrival buffer and coverage target interactions update the result", async ({
  page,
}) => {
  const original = await page.getByTestId("recommendation").innerText();
  const step = page
    .locator(".step-editor")
    .filter({ has: page.getByRole("button", { name: /Security queue/ }) });
  await step.getByRole("button", { name: /Security queue/ }).click();
  await step
    .getByRole("spinbutton", { name: "Slowest", exact: true })
    .fill("80");
  await expect(page.getByTestId("recommendation")).not.toHaveText(original);
  await page
    .getByRole("spinbutton", { name: "Arrival buffer", exact: true })
    .fill("25");
  await expect(page.locator(".coverage-line")).toContainText(
    "25 min arrival buffer",
  );
  await page.getByLabel("Model coverage target").fill("95");
  await expect(page.getByText("95%", { exact: true }).first()).toBeVisible();
});

test("alternative plans, add, reorder and remove steps work", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Drive \+ park/ }).click();
  await expect(
    page.getByRole("button", { name: /Drive to the airport/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add alternative" }).click();
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue(
    "Drive + park copy",
  );
  await page.getByRole("button", { name: "Task", exact: true }).click();
  const step = page
    .locator(".step-editor")
    .filter({ has: page.getByRole("button", { name: /New step/ }) });
  await step.getByRole("button", { name: /New step/ }).click();
  await step.getByLabel("Step name", { exact: true }).fill("Pack documents");
  await page.getByRole("button", { name: "Move Pack documents up" }).click();
  await expect(page.locator(".step-toggle").nth(4)).toContainText(
    "Pack documents",
  );
  await page.getByRole("button", { name: "Remove step", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Pack documents/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Remove selected plan" }).click();
  await expect(
    page.getByRole("button", { name: /Drive \+ park copy/ }),
  ).toHaveCount(0);
});

test("what-if departure updates model risk, missed connection, and resets", async ({
  page,
}) => {
  await page.getByLabel("Explore departure offset in minutes").fill("60");
  await expect(page.locator(".what-if-result")).toContainText(
    "0% on time in model",
  );
  await expect(page.locator(".arrival-line")).toHaveClass(/late/);
  await page
    .getByRole("button", { name: "Back to recommended departure" })
    .click();
  await expect(
    page.getByLabel("Explore departure offset in minutes"),
  ).toHaveValue("0");
  await expect(page.locator(".what-if-result")).not.toContainText(
    "0% on time in model",
  );
});

test("invalid duration and missing connections show errors and recover", async ({
  page,
}, info) => {
  const step = page
    .locator(".step-editor")
    .filter({
      has: page.getByRole("button", { name: /Train to the airport/ }),
    });
  await step.getByRole("button", { name: /Train to the airport/ }).click();
  await step
    .getByRole("spinbutton", { name: "Fastest", exact: true })
    .fill("90");
  await expect(page.getByRole("alert")).toContainText(
    "fastest ≤ typical ≤ slowest",
  );
  await step
    .getByRole("spinbutton", { name: "Fastest", exact: true })
    .fill("36");
  await step.getByLabel("Scheduled departures").fill("2026-10-03T09:00");
  await expect(page.getByRole("alert")).toContainText("cannot meet");
  await page.screenshot({
    path: resolve(`artifacts/leavewell-impossible-${info.project.name}.png`),
    fullPage: true,
  });
  await step
    .getByLabel("Scheduled departures")
    .fill(airportDemo().plans[0].steps[1].departures);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("earliest departure constraint fails clearly and can be corrected", async ({
  page,
}) => {
  await expandSettings(page);
  await page.getByLabel("Earliest allowed departure").fill("2026-10-03T08:00");
  await expect(page.getByRole("alert")).toContainText(
    "earliest allowed departure is too late",
  );
  await page.getByLabel("Earliest allowed departure").fill("2026-10-03T05:00");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("DST overlap requires an occurrence; gap rejects; overnight shows the previous day", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Drive \+ park/ }).click();
  await expandSettings(page);
  await page.getByLabel("Earliest allowed departure").fill("");
  await page.getByLabel("Hard arrival deadline").fill("2026-11-01T01:30");
  await expect(page.getByRole("alert")).toContainText("occurs twice");
  await page.getByLabel("Repeated clock times (DST)").selectOption("later");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByLabel("Hard arrival deadline").fill("2026-03-08T02:30");
  await expect(page.getByRole("alert")).toContainText("does not exist");
  await page.getByLabel("Hard arrival deadline").fill("2026-10-03T00:30");
  await expect(page.locator(".departure-card>p")).toContainText("Oct 2");
});

test("draft and named scenario persist through reload and demo reset", async ({
  page,
}) => {
  await page.getByLabel("Scenario name", { exact: true }).fill("My test trip");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved on this device");
  const before = await page.getByTestId("recommendation").innerText();
  await page.reload();
  await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(
    "My test trip",
  );
  await expect(page.getByTestId("recommendation")).toHaveText(before);
  await resetDraft(page);
  await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(
    "Morning at the airport",
  );
  await page.getByRole("button", { name: "Scenarios", exact: true }).click();
  await page.getByRole("button", { name: /^My test trip/ }).click();
  await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(
    "My test trip",
  );
});

test("portable export downloads inputs, invalid import rejects, valid import recovers", async ({
  page,
}) => {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/leavewell.*\.json/);
  await file.saveAs(resolve("artifacts/exported-scenario.json"));
  await page
    .getByLabel("Import scenario file", { exact: true })
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.getByRole("status")).toContainText("not valid JSON");
  const s = airportDemo();
  s.name = "Imported portable trip";
  await page
    .getByLabel("Import scenario file", { exact: true })
    .setInputFiles({
      name: "trip.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportScenario(s)),
    });
  await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(
    s.name,
  );
});

test("offline production shell reloads, editing and persistence work without network", async ({
  page,
  context,
}) => {
  await expect(
    page.getByText("Available offline · inputs stay on this device"),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "On time. With room to breathe." }),
  ).toBeVisible();
  await page.getByLabel("Scenario name", { exact: true }).fill("Offline trip");
  await page
    .getByRole("spinbutton", { name: "Arrival buffer", exact: true })
    .fill("12");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(
    "Offline trip",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Arrival buffer", exact: true }),
  ).toHaveValue("12");
  await expect(
    page.getByText("Offline · all calculations stay on this device"),
  ).toBeVisible();
  await context.setOffline(false);
});

test("storage failure warns, preserves in-memory work, exports and retries", async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page
    .getByLabel("Scenario name", { exact: true })
    .fill("Still in memory");
  await expect(page.getByRole("alert")).toContainText("changes are in memory");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export/ }).click();
  expect((await download).suggestedFilename()).toContain("still-in-memory");
  await page.getByRole("button", { name: "Retry device saving" }).click();
  await expect(page.getByRole("status")).toContainText("still unavailable");
});

test("corrupt stored draft is preserved until an explicit retry and dialogs support keyboard", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem("leavewell.v1", "{bad"));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("has not been erased");
  expect(await page.evaluate(() => localStorage.getItem("leavewell.v1"))).toBe(
    "{bad",
  );
  await page.getByRole("button", { name: "Retry device saving" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Scenarios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Scenarios", exact: true }),
  ).toBeFocused();
});

test("missing the final listed connection stays readable and never crashes the timeline", async ({
  page,
}) => {
  const step = page
    .locator(".step-editor")
    .filter({
      has: page.getByRole("button", { name: /Train to the airport/ }),
    });
  await step.getByRole("button", { name: /Train to the airport/ }).click();
  await step.getByLabel("Scheduled departures").fill("2026-10-03T06:12");
  await expect(page.getByTestId("recommendation")).not.toHaveText("—");
  await page.getByLabel("Explore departure offset in minutes").fill("60");
  await expect(
    page.getByText(
      "No listed departure remains after you reach this connection.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("This connection is missed", { exact: true }),
  ).toBeVisible();
});
