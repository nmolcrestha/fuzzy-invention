import { expect, test } from "@playwright/test";

import {
  chooseFiles,
  createSite,
  pngFile,
  publish,
  selectSection,
  waitForSaved,
  webmFile,
} from "./helpers";

test("section backgrounds: gradient, image with overlay, and video", async ({ page, browser }) => {
  const site = await createSite(page);

  // Videos can be uploaded to the media library, with a still image made automatically (SB-40).
  await page.goto(`/dashboard/sites/${site.id}/media`);
  const clip = await webmFile(page);
  await chooseFiles(page, page.getByRole("button", { name: "Choose files" }), clip);
  const describe = page.getByRole("dialog", { name: "Describe your video" });
  await describe.getByRole("button", { name: "Skip for now" }).click();
  const library = page.getByRole("list", { name: "Your images and videos" });
  await expect(library.getByRole("button", { name: /Video: clip\.webm/ })).toBeVisible();
  await expect(page.getByText("1 video")).toBeVisible();

  await page.goto(`/editor/${site.id}/${site.homePageId}`);
  await selectSection(page, /^Hero/);
  const inspector = page.getByRole("complementary", { name: "Section settings" });
  const types = inspector.getByRole("tablist", { name: "Background type" });
  const hero = page.frameLocator("iframe").locator('section[data-sq-type="hero"]');

  // Gradient: the text tone follows it (SB-10).
  await types.getByRole("tab", { name: "Gradient" }).click();
  await inspector.getByRole("radio", { name: "Night" }).click();
  await expect(hero).toHaveAttribute("data-backdrop", "gradient");
  await expect(hero).toHaveAttribute("data-bg", "dark");

  // Image with overlay: a bright photo under a weak overlay is flagged (SB-11, SB-12).
  await types.getByRole("tab", { name: "Image" }).click();
  const picker = page.getByRole("dialog", { name: "Choose a background image" });
  await chooseFiles(
    page,
    picker.getByRole("button", { name: "Choose images" }),
    pngFile("bright.png", 24, [250, 250, 245]),
  );
  await picker.getByRole("button", { name: "Use this image" }).click();
  await expect(hero.locator(".sq-backdrop img")).toHaveAttribute("src", /bright-/);
  const focal = inspector.getByRole("slider", { name: /Focal point/ });
  await focal.focus();
  await page.keyboard.press("ArrowRight");
  await expect(focal).toHaveAttribute("aria-valuenow", "55");
  await inspector.getByLabel("Strength").fill("10");
  await expect(inspector.getByRole("alert")).toContainText("Text may be hard to read");
  await inspector.getByLabel("Strength").fill("70");
  await expect(inspector.getByRole("alert")).toHaveCount(0);
  await inspector.getByRole("radio", { name: "Light" }).click();
  await expect(hero).toHaveAttribute("data-bg", "light");

  // Video background: plays muted on wide screens, with its still image (SB-41).
  await types.getByRole("tab", { name: "Video" }).click();
  const videos = page.getByRole("dialog", { name: "Choose a background video" });
  await videos.getByRole("button", { name: /Video: clip\.webm/ }).click();
  await videos.getByRole("button", { name: "Use this video" }).click();
  await expect(hero).toHaveAttribute("data-backdrop", "video");
  // The editor's preview is narrower than a laptop, so it shows the still image, like phones.
  await expect(hero.locator(".sq-backdrop img")).toHaveAttribute("src", /-poster\.jpg$/);
  await waitForSaved(page);

  await publish(page, { selectAll: true });

  // Live: the video plays on a laptop...
  await page.goto(site.url);
  const liveHero = page.locator('section[data-sq-type="hero"]');
  const video = liveHero.locator(".sq-backdrop video");
  await expect(video).toHaveAttribute("src", /clip-/);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveJSProperty("loop", true);
  await expect(liveHero.locator(".sq-backdrop img")).toHaveAttribute("src", /-poster\.jpg$/);

  // ...but phones and visitors who turn off motion get only the still image.
  for (const options of [
    { viewport: { width: 390, height: 844 } },
    { reducedMotion: "reduce" as const },
  ]) {
    const context = await browser.newContext({ ...options, storageState: undefined });
    const visitor = await context.newPage();
    await visitor.goto(site.url);
    const visitorHero = visitor.locator('section[data-sq-type="hero"]');
    await expect(visitorHero.locator(".sq-backdrop img")).toBeVisible();
    await expect(visitorHero.locator(".sq-backdrop video")).toHaveCount(0);
    await context.close();
  }
});
