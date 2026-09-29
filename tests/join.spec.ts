import { test as liveTest } from "@playwright/test";
import { expect, test } from "./fixtures";

// Unlike the UI-only fixtures, this exercises the real socket and game loop.
liveTest(
  "joining equips the chosen starter instead of a random weapon",
  async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("name").fill("Starter Tester");
    const starter = page.getByRole("combobox", { name: "Starting weapon" });
    await expect(starter.getByRole("option")).toHaveCount(3);
    await starter.selectOption("dagger");
    await page.getByTestId("start").click();
    const weapons = page.getByRole("region", { name: "Active spells" });
    await expect(weapons.locator(".active-spell-card")).toHaveCount(1);
    await expect(weapons).toContainText("Throwing Dagger");
  },
);

test("attempting to join game with no name shows error", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start").isDisabled();
});

test("attempting to join game with a name that has only special characters shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("@£$%^&*()_+");
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
  await page.getByTestId("start").isDisabled();
});

test("attempting to join a game with a name that has only spaces shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("   ");
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
  await page.getByTestId("start").isDisabled();
});

test("attempting to join a game with a name that has only numbers shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("1234567890");
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
  await page.getByTestId("start").isDisabled();
});

test("attempting to join a game with scandic characters does not show error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("åäöÅÄÖ");
  await expect(page.getByTestId("error")).not.toHaveText("Please enter a name");
  await page.getByTestId("start").isEnabled();
});

test("attempting to join a game with a name that has a space in the middle does not show error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("test name");
  await expect(page.getByTestId("error")).not.toHaveText("Please enter a name");
  await page.getByTestId("start").isEnabled();
});
