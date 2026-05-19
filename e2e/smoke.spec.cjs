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

test("public menu category images render from upload paths", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#menu").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll("#menu .menu-card--image img"));
    return images.length > 0 && images.every((img) => img.complete && img.naturalWidth > 0);
  });

  const cardCount = await page.locator("#menu .menu-card").count();
  const imageCount = await page.locator("#menu .menu-card--image img").count();
  expect(imageCount).toBe(cardCount);
});

test("about map links target the Thunder Road listing", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#about").scrollIntoViewIfNeeded();

  const goTo = page.locator("#about a", { hasText: "Go To" });
  const directions = page.locator("#about a", { hasText: "Get Directions" });
  await expect(goTo).toHaveAttribute("href", /Thunder%20Road%20Bar%20and%20Grill/);
  await expect(goTo).toHaveAttribute("href", /query_place_id=/);
  await expect(directions).toHaveAttribute("href", /Thunder%20Road%20Bar%20and%20Grill/);
  await expect(directions).toHaveAttribute("href", /destination_place_id=/);
});

test("admin route loads the admin app", async ({ page }) => {
  const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });
  expect(response?.status() || 0).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/Thunder Road Admin/i);
  await expect(page.locator("body")).not.toContainText(/Page Not Found|couldn't find/i);
});
