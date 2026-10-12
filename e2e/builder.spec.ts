import { expect, type Page, test } from "@playwright/test";

import { chooseFiles, createSite, pngFile, publish, waitForSaved } from "./helpers";

async function startBuilding(page: Page) {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Build your own section/ }).click();
  return page.getByRole("dialog", { name: "Build your own section" });
}

test("build your own: goal, design, guided questions, background", async ({ page, browser }) => {
  const site = await createSite(page);
  const outline = page.getByRole("navigation", { name: "Page sections" });

  // A logo carousel, answering the questions (SB-1 to SB-3).
  let journey = await startBuilding(page);
  await journey.getByRole("radio", { name: /Show client logos/ }).click();
  await journey.getByRole("button", { name: /^Logo carousel/ }).click();
  await expect(journey.getByText("Question 1 of 2")).toBeVisible();
  await journey.getByLabel("Your headline").fill("Trusted by 2,000 teams");
  await journey.getByRole("button", { name: "Next question" }).click();
  await expect(journey.getByText("Your client logos")).toBeVisible();
  await journey.getByRole("button", { name: "Next: background" }).click();
  await journey.getByRole("tab", { name: "Gradient" }).click();
  await journey.getByRole("radio", { name: "Soft" }).click();
  await journey.getByRole("button", { name: "Add section" }).click();

  // Afterwards, a one-time look at the phone version (SB-4).
  await expect(page.getByText("This is how it looks on phones")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Phone preview" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "Back to desktop" }).click();
  await expect(outline.getByRole("button", { name: /^Logo carousel/ })).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "Section settings" });
  await expect(inspector.getByRole("heading", { name: "Logo carousel" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /^Logos/ })).toBeVisible();

  // An image hero with all questions answered, including a photo.
  journey = await startBuilding(page);
  await journey.getByRole("radio", { name: /Introduce your business/ }).click();
  await journey.getByRole("button", { name: /^Image hero/ }).click();
  await journey.getByLabel("Your headline").fill("Fresh bread every morning");
  await journey.getByRole("button", { name: "Next question" }).click();
  await journey.getByRole("textbox").first().fill("Baked at 5 a.m. in the heart of town.");
  await journey.getByRole("button", { name: "Next question" }).click();
  await journey.getByLabel("Button text").fill("Visit us");
  await journey.getByRole("button", { name: "Next question" }).click();
  await journey.getByRole("button", { name: /^Choose image/ }).click();
  const picker = page.getByRole("dialog", { name: "Choose an image" });
  await chooseFiles(
    page,
    picker.getByRole("button", { name: "Choose images" }),
    pngFile("bread.png"),
  );
  await picker.getByLabel("Describe the image").fill("Loaves on a wooden table");
  await picker.getByRole("button", { name: "Use this image" }).click();
  await expect(journey.locator('img[src*="bread-"]').first()).toBeVisible();
  await journey.getByRole("button", { name: "Next: background" }).click();
  await journey.getByRole("button", { name: "Add section" }).click();
  await expect(outline.getByRole("button", { name: /^Image hero/ })).toBeVisible();

  // Leaving part-way keeps what's there (SB-5).
  journey = await startBuilding(page);
  await journey.getByRole("radio", { name: /Show photos/ }).click();
  await journey.getByRole("button", { name: /^Image slider/ }).click();
  await journey.getByLabel("Your headline").fill("Inside the bakery");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Added the section with what you filled in.")).toBeVisible();
  await expect(outline.getByRole("button", { name: /^Image slider/ })).toBeVisible();
  await waitForSaved(page);

  await publish(page, { selectAll: true });

  await page.goto(site.url);
  // Not the first section, so its title is an h2 (the template's hero keeps the h1).
  await expect(
    page.getByRole("heading", { name: "Fresh bread every morning", level: 2 }),
  ).toBeVisible();
  await expect(page.getByAltText("Loaves on a wooden table")).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit us" })).toBeVisible();

  // The carousel: one readable copy of the logos, a pause button (SB-42).
  const marquee = page.locator(".sq-marquee");
  await expect(marquee.getByRole("listitem")).toHaveCount(6);
  await marquee.getByRole("button", { name: "Pause logo animation" }).click();
  await expect(marquee).toHaveAttribute("data-paused", "true");

  // The slider: arrows, slide labels, a pause button.
  const slider = page.getByRole("region", { name: "Photos" });
  await expect(slider.getByRole("group", { name: "1 of 3" })).toBeVisible();
  await slider.getByRole("button", { name: "Next photo" }).click();
  await expect(slider.getByRole("group", { name: "2 of 3" })).toBeVisible();
  await expect(slider.getByRole("button", { name: "Pause slideshow" })).toBeVisible();

  // Visitors who turn off motion: still logos and no autoplay (SB-43).
  const calm = await browser.newContext({ reducedMotion: "reduce", storageState: undefined });
  const visitor = await calm.newPage();
  await visitor.goto(site.url);
  const track = visitor.locator(".sq-marquee-track");
  await expect(track).toHaveCSS("animation-name", "none");
  await expect(visitor.getByRole("button", { name: "Pause slideshow" })).toHaveCount(0);
  await calm.close();
});
