import { expect, test } from "@playwright/test";

/** Matches login page validation + email placeholder (`name.example@gmail.com`). */
const VALID_EMAIL = "name.example@gmail.com";
const VALID_PASSWORD = "secret12";

test.describe("smoke", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /log in to the school/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder("name.example@gmail.com")).toBeVisible();
  });

  test("valid credentials navigate to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name.example@gmail.com").fill(VALID_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(VALID_PASSWORD);
    await page.getByRole("button", { name: /start your journey/i }).click();
    await expect(page).toHaveURL(/\/dashboard(\/|$)/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("GET /dashboard/classes returns 200", async ({ page }) => {
    const response = await page.goto("/dashboard/classes");
    expect(response, "navigation should return a response").toBeTruthy();
    expect(response!.ok(), `expected 200, got ${response!.status()}`).toBe(true);
  });
});
