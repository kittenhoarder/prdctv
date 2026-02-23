import { test, expect } from "@playwright/test";

test.describe("Mirror-only happy path", () => {
  test("home → Mirror → 3 intent fields → share page → audience respond → overlay shows divergences", async ({
    page,
    context,
  }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: /^Mirror$/ }).click();
    await page.getByRole("button", { name: /See how it landed/i }).click();

    await expect(page).toHaveURL(/\/mirror\/create/);

    await page.getByLabel(/What you intend to convey/i).fill("Share the Q2 timeline");
    await page.getByLabel(/The one key message/i).fill("We ship in June");
    await page.getByLabel(/What you want the audience to do/i).fill("Review and feedback");

    await page.getByRole("button", { name: /Create Mirror session/i }).click();

    await expect(page).toHaveURL(/\/mirror\/[^/]+\/share/);
    await expect(page.getByText(/Your Mirror session is ready/i)).toBeVisible({ timeout: 5000 });

    const audienceLink = page.getByRole("button", { name: /Copy audience feedback link/i });
    await expect(audienceLink).toBeVisible();
    const shareUrl = await page.url();
    const mtokenMatch = shareUrl.match(/\/mirror\/([^/]+)\/share/);
    expect(mtokenMatch).not.toBeNull();
    const mtoken = mtokenMatch![1];
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const respondUrl = `${baseUrl}/mirror/${mtoken}/respond`;

    const audiencePage = await context.newPage();
    await audiencePage.goto(respondUrl);

    await expect(audiencePage.getByText(/How did that land/i)).toBeVisible({ timeout: 5000 });
    await audiencePage.getByLabel(/What did you understand/i).fill("Understood the timeline");
    await audiencePage.getByLabel(/What was unclear/i).fill("Unclear on scope");
    await audiencePage.getByLabel(/What concerns you/i).fill("Concerned about resources");
    await audiencePage.getByRole("button", { name: /Submit feedback/i }).click();
    await expect(audiencePage.getByText(/Thanks for your feedback/i)).toBeVisible({ timeout: 5000 });

    await page.goto(`/mirror/${mtoken}/overlay`);
    await expect(page.getByText(/Here is how your message actually landed/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Generate overlay/i }).click();

    await expect(page.getByText(/Gaps|Top divergences|Intended|Received/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Mirror via Presentation (Frame + Mirror)", () => {
  test("create intent → copy audience link → open in new context → submit response → return to communicator view → overlay renders", async ({
    page,
    context,
  }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: /Presentation/i }).click();
    await page.getByRole("button", { name: /Start framing/i }).click();

    await expect(page).toHaveURL(/\/frame\/create\?type=presentation/);

    await page.getByLabel(/Meeting title/i).fill("Mirror E2E Meeting");
    await page.getByLabel(/Who's in the room/i).fill("All hands");
    await page.getByLabel(/Stakes level/i).click();
    await page.getByRole("option", { name: /Medium/i }).click();
    await page.getByLabel(/Desired outcome/i).fill("Buy-in on timeline");

    await page.getByLabel(/Intent|What do you want/i).fill("Share the Q2 timeline");
    await page.getByLabel(/Key message/i).fill("We ship in June");
    await page.getByLabel(/Desired action/i).fill("Review and feedback");

    await page.getByRole("button", { name: /Generate clarifying questions/i }).click();

    await expect(page).toHaveURL(/\/frame\/[^/]+\/questions/);

    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15000 });

    const textboxes = page.getByRole("textbox");
    await expect(textboxes).toHaveCount(3, { timeout: 15000 });
    await textboxes.nth(0).fill("A1");
    await textboxes.nth(1).fill("A2");
    await textboxes.nth(2).fill("A3");

    await page.getByRole("button", { name: /Generate Frame Brief/i }).click();

    await expect(page).toHaveURL(/\/frame\/[^/]+\/brief/);
    await expect(page.getByText(/Real goal|Frame Brief/i)).toBeVisible({ timeout: 15000 });

    const overlayLink = page.getByRole("link", { name: /View Mirror overlay/i });
    await expect(overlayLink).toBeVisible({ timeout: 5000 });
    const overlayHref = await overlayLink.getAttribute("href");
    expect(overlayHref).toMatch(/\/mirror\/[^/]+\/overlay/);
    const mtokenMatch = overlayHref?.match(/\/mirror\/([^/]+)\//);
    expect(mtokenMatch).not.toBeNull();
    const mtoken = mtokenMatch![1];
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const respondUrl = `${baseUrl}/mirror/${mtoken}/respond`;

    const audiencePage = await context.newPage();
    await audiencePage.goto(respondUrl);

    await expect(audiencePage.getByText(/How did that land/i)).toBeVisible({ timeout: 5000 });
    await audiencePage.getByLabel(/What did you understand/i).fill("Understood the timeline");
    await audiencePage.getByLabel(/What was unclear/i).fill("Unclear on scope");
    await audiencePage.getByLabel(/What concerns you/i).fill("Concerned about resources");

    await audiencePage.getByRole("button", { name: /Submit feedback/i }).click();

    await expect(audiencePage.getByText(/Thanks for your feedback/i)).toBeVisible({ timeout: 5000 });

    await page.goto(`/mirror/${mtoken}/overlay`);
    await expect(page.getByText(/Mirror|Here is how your message actually landed/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Generate overlay/i }).click();

    await expect(page.getByText(/Gaps|Top divergences|Intended|Received/i)).toBeVisible({ timeout: 15000 });
  });
});
