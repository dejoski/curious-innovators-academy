import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /log in to the school/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("demo login shortcuts stay hidden", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continue as admin/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /continue as parent/i })).toHaveCount(0);
  });

  test("GET /dashboard/classes returns 200", async ({ page }) => {
    const response = await page.goto("/dashboard/classes");
    expect(response, "navigation should return a response").toBeTruthy();
    expect(response!.ok(), `expected 200, got ${response!.status()}`).toBe(true);
  });
});
