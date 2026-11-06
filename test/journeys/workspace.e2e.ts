import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("edit, save, reload and reopen a named scenario with error recovery", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/");
  await screen.getByLabel("Scenario name", { exact: true }).fill("CI appointment");
  await screen.getByLabel("Time zone", { exact: true }).fill("Invalid/Zone");
  await expect(screen.getByRole("alert")).toContainText("not a valid IANA time zone");
  await screen.getByLabel("Time zone", { exact: true }).fill("America/Los_Angeles");
  await expect(screen.getByRole("alert")).toHaveCount(0);
  await screen.getByRole("button", "Save scenario", { exact: true }).click();
  await expect(screen.getByRole("status")).toContainText("saved on this device");
  await browser.reload();
  await expect(screen.getByLabel("Scenario name", { exact: true })).toHaveValue("CI appointment");
  await screen.getByRole("button", "Reset draft to demo", { exact: true }).click();
  await screen.getByRole("dialog").getByRole("button", "Reset draft", { exact: true }).click();
  await expect(screen.getByLabel("Scenario name", { exact: true })).toHaveValue(
    "Morning at the airport",
  );
  await screen.getByRole("button", "Scenarios", { exact: true }).click();
  await screen
    .getByRole("dialog")
    .getByRole("button", /^CI appointment/)
    .click();
  await expect(screen.getByLabel("Scenario name", { exact: true })).toHaveValue("CI appointment");
  await expect(browser.locator('[data-testid="recommendation"]')).not.toHaveText("—");
});
