import { expect, test } from "@playwright/test";

test("demo landing has three roles and no credential fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /more room for learning/i })).toBeVisible();
  for (const role of ["Parent", "Teacher", "Admin"]) {
    await expect(page.getByRole("button", { name: new RegExp(`Log in as Demo ${role}`) })).toBeVisible();
  }
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
});

test("GET never signs a visitor in", async ({ request }) => {
  const response = await request.get("/api/auth/demo-login?kind=admin", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/login?auth=required");
  expect(response.headers()["set-cookie"]).toBeUndefined();
});

test("cross-origin demo requests are rejected", async ({ request }) => {
  const response = await request.post("/api/auth/demo-login", { headers: { Origin: "https://untrusted.example" }, form: { kind: "admin" } });
  expect(response.status()).toBe(403);
});

test("anonymous API requests do not expose student records", async ({ request }) => {
  const response = await request.get("/api/data/students");
  expect([401, 503]).toContain(response.status());
});
