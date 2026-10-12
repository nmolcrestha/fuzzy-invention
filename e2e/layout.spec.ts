import { expect, type Locator, type Page, test } from "@playwright/test";

import { createSite, publish, waitForSaved } from "./helpers";

/** dnd-kit listens to pointer moves, so drag in small steps. */
async function drag(page: Page, handle: Locator, target: Locator) {
  await handle.scrollIntoViewIfNeeded();
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

// Tall enough that both columns fit in the settings panel without scrolling.
test.use({ viewport: { width: 1440, height: 1300 } });

test("customize layout: drag items, columns, rows, phones, reset", async ({ page, browser }) => {
  const site = await createSite(page);

  // Start from "Text and photo" and skip the questions.
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Build your own section/ }).click();
  const journey = page.getByRole("dialog", { name: "Build your own section" });
  await journey.getByRole("radio", { name: /Show photos/ }).click();
  await journey.getByRole("button", { name: /^Text and photo/ }).click();
  await journey.getByRole("button", { name: "Skip the rest and add it" }).click();

  const inspector = page.getByRole("complementary", { name: "Section settings" });
  await inspector.getByRole("tab", { name: "Customize layout" }).click();
  const column1 = inspector.getByRole("list", { name: "Items in column 1 of row 1" });
  const column2 = inspector.getByRole("list", { name: "Items in column 2 of row 1" });
  await expect(column1.getByRole("listitem")).toHaveCount(3);
  await expect(column2.getByRole("listitem")).toHaveCount(1);

  // Drag the image from column 2 onto the heading in column 1 (SB-22).
  await drag(
    page,
    column2.getByRole("button", { name: "Drag to move Image" }),
    column1.getByRole("listitem").first(),
  );
  await expect(column1.getByRole("listitem")).toHaveCount(4);
  await expect(column1.getByRole("listitem").first()).toContainText("Image");
  await expect(inspector.getByText("Empty. Drag an item here or add one.")).toBeVisible();

  // The same without a mouse: "Move to…".
  await column1.getByRole("button", { name: "More actions for Image" }).click();
  await page.getByRole("menuitem", { name: "Move to…" }).click();
  await page.getByRole("menuitem", { name: "Row 1, column 2" }).click();
  await expect(column2.getByRole("listitem")).toHaveCount(1);

  // Change the split: fewer columns never loses content (SB-21).
  await inspector.getByRole("button", { name: /Columns in Row 1/ }).click();
  await page.getByRole("menuitemradio", { name: "One column" }).click();
  const single = inspector.getByRole("list", { name: "Items in the row of row 1" });
  await expect(single.getByRole("listitem")).toHaveCount(4);

  // Add a row with three columns, and an item in it.
  await inspector.getByRole("button", { name: "Add row" }).click();
  await page.getByRole("menuitem", { name: "Three columns" }).click();
  await inspector.getByRole("button", { name: "Add item to column 1 of row 2" }).click();
  await page.getByRole("menuitem", { name: /^Numbers/ }).click();
  await inspector.getByRole("button", { name: "Add item to column 2 of row 2" }).click();
  await page.getByRole("menuitem", { name: /^Text/ }).click();

  // Phones: hide the second column (SB-50).
  await inspector.getByRole("button", { name: "Settings for column 2 in row 2" }).click();
  await inspector.getByRole("switch", { name: "Hide on phones" }).click();
  await expect(inspector.getByText("Column 2 · hidden on phones")).toBeVisible();

  // The preview follows.
  const preview = page.frameLocator("iframe").locator('section[data-sq-type="custom"]');
  await expect(preview.locator("dl")).toBeVisible(); // the Numbers item

  // Reset to the starting design keeps the content and can be undone (SB-25).
  await inspector.getByRole("button", { name: "Reset to the starting design" }).click();
  await expect(page.getByText("Back to the “Text and photo” design.")).toBeVisible();
  await expect(inspector.getByRole("list", { name: "Items in column 2 of row 1" })).toBeVisible();
  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Back to the" })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(inspector.getByRole("list", { name: "Items in the row of row 1" })).toBeVisible();

  // An empty column is a publish warning (SB-52). Fill it instead.
  await inspector.getByRole("button", { name: "Add item to column 3 of row 2" }).click();
  await page.getByRole("menuitem", { name: /^Line/ }).click();
  await waitForSaved(page);
  await publish(page, { selectAll: true });

  // Live: the three-column row shows on a laptop; its hidden column is gone on phones.
  await page.goto(site.url);
  const live = page.locator('section[data-sq-type="custom"]');
  await expect(live.locator("dl")).toBeVisible();
  await expect(live.getByText("Explain in a sentence or two what you offer")).toBeVisible();
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: undefined,
  });
  const visitor = await phone.newPage();
  await visitor.goto(site.url);
  const mobile = visitor.locator('section[data-sq-type="custom"]');
  await expect(mobile.locator("dl")).toBeVisible();
  await expect(mobile.getByText("Explain in a sentence or two what you offer")).toBeHidden();
  await phone.close();
});
