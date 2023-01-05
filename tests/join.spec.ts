import { test, expect } from "@playwright/test";

test("attempting to join game with no name shows error", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
});

test("attempting to join game with a name that has only special characters shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("@£$%^&*()_+");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
});

test("attempting to join a game with a name that has only spaces shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("   ");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
});

test("attempting to join a game with a name that has only numbers shows error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("1234567890");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).toHaveText("Please enter a name");
});

test("attempting to join a game with scandic characters does not show error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("åäöÅÄÖ");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).not.toHaveText("Please enter a name");
});

test("attempting to join a game with a name that has a space in the middle does not show error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("name").fill("test name");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("error")).not.toHaveText("Please enter a name");
});
