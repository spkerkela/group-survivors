import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
	await page.goto("/");

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/Group Survivors/);
});

test("homepage has canvas", async ({ page }) => {
	await page.goto("/");

	const canvas = page.getByTestId("canvas");
	await expect(canvas).toHaveAttribute("id", "canvas");
});
