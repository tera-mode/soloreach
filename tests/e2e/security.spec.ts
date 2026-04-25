import { test, expect } from "@playwright/test";

test.describe("Security: Endpoint authentication", () => {
  test("Cron endpoint rejects missing CRON_SECRET", async ({ request }) => {
    const res = await request.post("/api/cron/poll-sources");
    // 401 (no secret) or 500 (env not configured) — never 200
    expect(res.status()).not.toBe(200);
  });

  test("Cron endpoint rejects wrong CRON_SECRET", async ({ request }) => {
    const res = await request.post("/api/cron/poll-sources", {
      headers: { Authorization: "Bearer wrong-secret-xxxx" },
    });
    expect(res.status()).not.toBe(200);
  });

  test("Cloud Tasks endpoint rejects missing OIDC token", async ({
    request,
  }) => {
    const res = await request.post("/api/tasks/generate-content-base", {
      data: { sourceUrl: "https://example.com", title: "Test", serviceId: "s1" },
    });
    expect(res.status()).not.toBe(200);
  });

  test("Slack interact rejects missing signature", async ({ request }) => {
    const res = await request.post("/api/slack/interact", {
      data: "payload=%7B%7D",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(res.status()).not.toBe(200);
  });

  test("Login page renders SoloReach branding", async ({ page }) => {
    await page.goto("/login");
    // Wait for client-side hydration
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("SoloReach")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Google でログイン")).toBeVisible();
  });

  test("Inbox page is accessible (dev mode without Firebase)", async ({
    page,
  }) => {
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");
    // Either shows inbox (dev without Firebase) or redirects to login
    const url = page.url();
    expect(url).toMatch(/\/(inbox|login)/);
  });

  test("Response headers contain security headers", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["strict-transport-security"]).toBeTruthy();
  });

  test("HTML responses do not expose real API keys or tokens", async ({
    page,
  }) => {
    await page.goto("/login");
    const html = await page.content();
    expect(html).not.toMatch(/xoxb-/);
    expect(html).not.toMatch(/-----BEGIN PRIVATE[\s]+KEY-----/);
    expect(html).not.toMatch(/"type"\s*:\s*"service_account"/);
  });
});
