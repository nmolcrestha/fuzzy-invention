import { expect, test } from "@playwright/test";

import { chooseFiles, createSite, pngFile, publish } from "./helpers";

test("search settings, logo, and forwarding moved pages", async ({ page }) => {
  const site = await createSite(page);
  const pagesTab = `/dashboard/sites/${site.id}`;

  // Per-page search & social settings (PAGE-8), with a social image uploaded from the picker.
  await page.goto(pagesTab);
  await page.getByRole("button", { name: "More actions for Pricing" }).click();
  await page.getByRole("menuitem", { name: "Search & social settings" }).click();
  const settings = page.getByRole("dialog", { name: "Page settings" });
  await settings.getByLabel("Title in search results").fill("Simple pricing for teams");
  await settings
    .getByLabel("Description")
    .fill("Plans for every team size. Start free, upgrade when you grow.");
  await expect(settings.getByText("Preview in Google")).toBeVisible();
  await settings.getByRole("button", { name: "Choose image: Social media image" }).click();
  const picker = page.getByRole("dialog", { name: "Choose a social media image" });
  await chooseFiles(
    page,
    picker.getByRole("button", { name: "Choose images" }),
    pngFile("share.png"),
  );
  await expect(picker.getByRole("button", { name: /share\.png/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await picker.getByRole("button", { name: "Use this image" }).click();
  await settings.getByRole("switch", { name: "Hide this page from search engines" }).click();
  await settings.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.", { exact: false }).first()).toBeVisible();

  // Site logo (SITE-3).
  await page.goto(`${pagesTab}/settings`);
  await page.getByRole("button", { name: "Choose image: Logo" }).click();
  const logoPicker = page.getByRole("dialog", { name: "Choose your logo" });
  await chooseFiles(
    page,
    logoPicker.getByRole("button", { name: "Choose images" }),
    pngFile("logo.png"),
  );
  await logoPicker.getByLabel("Describe the image").fill("E2E Test Co logo");
  await logoPicker.getByRole("button", { name: "Use this image" }).click();
  await page.getByRole("button", { name: "Save changes" }).nth(1).click();
  await expect(page.getByText("Publish the site design to show it")).toBeVisible();

  await page.goto(pagesTab);
  await publish(page, { selectAll: true });

  // The live page carries the search settings and the logo.
  await page.goto(`${site.url}/pricing`);
  await expect(page).toHaveTitle("Simple pricing for teams");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Plans for every team size. Start free, upgrade when you grow.",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /share-/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("header img")).toHaveAttribute("src", /logo-/);

  // Move the published page: publishing offers to forward the old address (PAGE-7).
  await page.goto(pagesTab);
  await page.getByRole("button", { name: "More actions for Pricing" }).click();
  await page.getByRole("menuitem", { name: "Rename or change address" }).click();
  const details = page.getByRole("dialog", { name: "Page settings" });
  await details.getByLabel("Page address").fill("/plans");
  await expect(details.getByText("This page is live at /pricing.")).toBeVisible();
  await details.getByRole("button", { name: "Save changes" }).click();
  await expect(details).toBeHidden();

  await page
    .getByRole("button", { name: /^Publish/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Moves from /pricing to /plans.")).toBeVisible();
  await expect(
    dialog.getByRole("checkbox", { name: /Forward visitors from \/pricing/ }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: /^Publish \d+ items?$/ }).click();
  await expect(page.getByText(/^Published .* Your website is live\./)).toBeVisible();

  await page.goto(`${site.url}/pricing`);
  await page.waitForURL(`${site.url}/plans`);
  await expect(page).toHaveTitle("Simple pricing for teams");

  // Forwarded addresses are listed in Settings and can be stopped.
  await page.goto(`${pagesTab}/settings`);
  await page.getByRole("button", { name: "Stop forwarding /pricing" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Stop forwarding" }).click();
  await expect(page.getByText("/pricing no longer forwards.")).toBeVisible();
  await page.goto(`${site.url}/pricing`);
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();

  // Taking a page offline can send its visitors to the homepage instead (PUB-7).
  await page.goto(pagesTab);
  await page.getByRole("button", { name: "More actions for Contact" }).click();
  await page.getByRole("menuitem", { name: "Take offline" }).click();
  const offline = page.getByRole("alertdialog");
  await expect(offline.getByRole("checkbox")).toBeChecked();
  await offline.getByRole("button", { name: "Take page offline" }).click();
  await expect(page.getByText("Visitors to /contact are sent to your homepage.")).toBeVisible();
  await page.goto(`${site.url}/contact`);
  await page.waitForURL(`${site.url}/`);
});
