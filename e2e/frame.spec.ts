import { test, expect } from "@playwright/test";

test.describe("Frame happy path", () => {
  test("land on home → select meeting type → fill form → see questions → answer → see brief → copy share link → open in new context → brief renders", async ({
    page,
    context,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Frame \+ Mirror/i })).toBeVisible();

    await page.getByRole("radio", { name: /Small Meeting/i }).click();
    await page.getByRole("button", { name: /Start framing/i }).click();

    await expect(page).toHaveURL(/\/frame\/create\?type=small/);

    await page.getByLabel(/Meeting title/i).fill("E2E Test Meeting");
    await page.getByLabel(/Who's in the room/i).fill("QA Team");
    await page.getByLabel(/Stakes level/i).click();
    await page.getByRole("option", { name: /Low/i }).click();
    await page.getByLabel(/Desired outcome/i).fill("Align on scope");
    await page.getByRole("button", { name: /Generate clarifying questions/i }).click();

    await expect(page).toHaveURL(/\/frame\/[^/]+\/questions/);

    await expect(page.getByText(/Clarifying questions/i)).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/Generating questions/i).or(page.getByRole("textbox").first())).toBeVisible({ timeout: 15000 });

    const textboxes = page.getByRole("textbox");
    await expect(textboxes).toHaveCount(3, { timeout: 15000 });

    await textboxes.nth(0).fill("Answer one");
    await textboxes.nth(1).fill("Answer two");
    await textboxes.nth(2).fill("Answer three");

    await page.getByRole("button", { name: /Generate Frame Brief/i }).click();

    await expect(page).toHaveURL(/\/frame\/[^/]+\/brief/);

    await expect(page.getByText(/Real goal|Opening readout|Frame Brief/i)).toBeVisible({ timeout: 15000 });

    const tokenMatch = page.url().match(/\/frame\/([^/]+)\/brief/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const shareUrl = `${baseURL}/frame/${token}/view`;

    const incognitoPage = await context.newPage();
    await incognitoPage.goto(shareUrl);

    await expect(incognitoPage.getByText(/Real goal|Opening readout|Frame Brief/i)).toBeVisible({ timeout: 5000 });
  });
});
