import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Add initialization script to set test flag before any page loads
    await page.addInitScript(() => {
      (window as any).__PLAYWRIGHT_TEST__ = true;
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
