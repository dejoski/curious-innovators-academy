import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /log in to the school/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("demo login shortcuts are visible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continue as admin/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue as parent/i })).toBeVisible();
  });

  test("demo login route is wired", async ({ page }) => {
    const response = await page.request.get("/api/auth/demo-login?kind=admin", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const location = response.headers()["location"];
    expect(location).toMatch(/\/(dashboard|login\?auth=error)/);
  });

  test("GET /dashboard/classes returns 200", async ({ page }) => {
    const response = await page.goto("/dashboard/classes");
    expect(response, "navigation should return a response").toBeTruthy();
    expect(response!.ok(), `expected 200, got ${response!.status()}`).toBe(true);
  });
});
