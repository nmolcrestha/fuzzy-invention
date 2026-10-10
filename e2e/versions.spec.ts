import { expect, type Page, test } from "@playwright/test";

import { createSite, publish, selectSection, waitForSaved } from "./helpers";

async function setCtaHeading(page: Page, heading: string) {
  await selectSection(page, /^Call to action/);
  await page
    .getByRole("complementary", { name: "Section settings" })
    .getByLabel("Heading")
    .fill(heading);
  await waitForSaved(page);
}

test("version history: view, restore and discard", async ({ page, context }) => {
  const site = await createSite(page);
  const editorUrl = `/editor/${site.id}/${site.homePageId}`;
  const inspector = page.getByRole("complementary", { name: "Section settings" });

  await setCtaHeading(page, "Version one");
  await publish(page, { selectAll: true, note: "First launch" });
  await setCtaHeading(page, "Version two");
  await publish(page, { note: "Second try" });
  await setCtaHeading(page, "Draft three");

  // Every publish is a version, with who, when and the note (PUB-8).
  await page.goto(`/dashboard/sites/${site.id}/history`);
  const versions = page.getByRole("listitem").filter({ hasText: "Published" });
  await expect(versions).toHaveCount(2);
  await expect(versions.first()).toContainText("“Second try”");
  await expect(versions.first()).toContainText("Live now");
  await expect(versions.nth(1)).toContainText("“First launch”");

  // An earlier version can be viewed before restoring it.
  const popupPromise = context.waitForEvent("page");
  await versions.nth(1).getByRole("link", { name: "View" }).click();
  const popup = await popupPromise;
  await expect(popup.getByText("as published on")).toBeVisible();
  await expect(popup.getByRole("heading", { name: "Version one" })).toBeVisible();
  await popup.close();

  // Restore it into the draft: the live site doesn't change.
  await versions.nth(1).getByRole("button", { name: "Restore" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restore to draft" }).click();
  await expect(page.getByText("Restored the version from", { exact: false })).toBeVisible();
  await page.goto(site.url);
  await expect(page.getByRole("heading", { name: "Version two" })).toBeVisible();

  await page.goto(editorUrl);
  await selectSection(page, /^Call to action/);
  await expect(inspector.getByLabel("Heading")).toHaveValue("Version one");

  // Discard unpublished changes: the draft matches the live page again (PUB-9).
  await page.goto(`/dashboard/sites/${site.id}`);
  await page.getByRole("button", { name: "More actions for Home" }).click();
  await page.getByRole("menuitem", { name: "Discard unpublished changes" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByText("The draft matches the live page again.")).toBeVisible();
  const homeRow = page.getByRole("listitem").filter({ hasText: "Homepage" });
  await expect(homeRow.getByText("Live", { exact: true })).toBeVisible();

  await page.goto(editorUrl);
  await selectSection(page, /^Call to action/);
  await expect(inspector.getByLabel("Heading")).toHaveValue("Version two");

  // The site design has its own history.
  await page.goto(`/dashboard/sites/${site.id}/history?item=design`);
  await expect(page.getByRole("listitem").filter({ hasText: "Live now" })).toHaveCount(1);
});
