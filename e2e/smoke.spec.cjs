const { expect, test } = require("@playwright/test");

const routes = (process.env.E2E_ROUTES || "/")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

for (const route of routes) {
  test(`renders ${route}`, async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() || 0).toBeLessThan(500);
    await expect(page.locator("body")).toContainText(/[A-Za-z]/);
    await expect(page.locator(".vite-error-overlay, [data-nextjs-dialog-overlay]")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}

test("public home renders live-like menu/settings content in dev", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status() || 0).toBeLessThan(500);
  await expect(page.locator("body")).not.toContainText(/Menu is being updated|Failed to load/i);
  await expect(page.locator("body")).toContainText(/Order Online/i);
});
