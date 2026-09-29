import { expect, test } from "@playwright/test";

test("new games get shareable URLs that survive sharing and reloads", async ({
  page,
  context,
}) => {
  await page.goto("/?source=invite#lobby");
  await expect(page).toHaveURL(/[?&]game=[a-zA-Z0-9_-]+/);
  const sharedUrl = page.url();
  expect(new URL(sharedUrl).searchParams.get("source")).toBe("invite");
  expect(new URL(sharedUrl).hash).toBe("#lobby");
  await page.reload();
  await expect(page.getByTestId("name")).toBeVisible();
  expect(page.url()).toBe(sharedUrl);

  const friend = await context.newPage();
  await friend.goto(sharedUrl);
  await expect(friend.getByTestId("name")).toBeVisible();
  expect(friend.url()).toBe(sharedUrl);

  await page.getByTestId("name").fill("Alice");
  await page.getByTestId("start").click();
  await expect(page.locator("#ui")).toHaveAttribute("data-screen", "match");
  await friend.getByTestId("name").fill("Bob");
  await friend.getByTestId("start").click();
  await expect(friend.locator("#ui")).toHaveAttribute("data-screen", "match");

  await friend.goto("/");
  await expect(friend).toHaveURL(/[?&]game=[a-zA-Z0-9_-]+/);
  expect(new URL(friend.url()).searchParams.get("game")).not.toBe(
    new URL(sharedUrl).searchParams.get("game"),
  );

  await page.goto("/?game=invalid%2Fid");
  await expect(page).toHaveURL(/\?game=[a-zA-Z0-9_-]+$/);
});
