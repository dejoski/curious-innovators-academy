import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /log in to the school/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder("name.example@gmail.com")).toBeVisible();
  });

  test("admin demo login starts at admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /continue as admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("parent demo login starts at parent dashboard, not profile", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /continue as parent/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/parents\/home(?:\?|$)/);
    await expect(page.getByText(/Attendance/i).first()).toBeVisible();
  });

  test("GET /dashboard/classes returns 200", async ({ page }) => {
    const response = await page.goto("/dashboard/classes");
    expect(response, "navigation should return a response").toBeTruthy();
    expect(response!.ok(), `expected 200, got ${response!.status()}`).toBe(true);
  });
});
