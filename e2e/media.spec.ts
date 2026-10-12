import { expect, test } from "@playwright/test";

import { chooseFiles, createSite, pngFile, selectSection, waitForSaved } from "./helpers";

test("upload, describe, use and delete an image", async ({ page }) => {
  const site = await createSite(page);

  // Upload in the Media tab: a single upload asks for a description right away (MED-3).
  await page.goto(`/dashboard/sites/${site.id}/media`);
  const choose = page.getByRole("button", { name: "Choose files" });
  await chooseFiles(page, choose, pngFile("team.png"));
  const describe = page.getByRole("dialog", { name: "Describe your image" });
  await describe.getByLabel("Image description").fill("Our team at work");
  await describe.getByRole("button", { name: "Save description" }).click();
  await expect(describe).toBeHidden();
  const library = page.getByRole("list", { name: "Your images and videos" });
  await expect(library.getByRole("button")).toHaveCount(1);
  await expect(library.getByText("No description")).toHaveCount(0);

  // Wrong types are refused in the browser, and fake images by the server.
  await chooseFiles(page, choose, {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hi"),
  });
  await expect(page.getByText("“notes.txt” isn't a supported image or video")).toBeVisible();
  await chooseFiles(page, choose, {
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("definitely not a png"),
  });
  await expect(page.getByText("“fake.png” doesn't look like an image")).toBeVisible();
  await expect(library.getByRole("button")).toHaveCount(1);

  // The file is served with safe headers.
  const src = await library.getByRole("img").getAttribute("src");
  expect(src).toContain(`/media/sites/${site.id}/team-`);
  const served = await page.request.get(src!);
  expect(served.headers()["content-type"]).toBe("image/png");
  expect(served.headers()["content-security-policy"]).toContain("sandbox");

  // Pick it from the library in the editor (MED-2); the description comes along.
  await page.goto(`/editor/${site.id}/${site.homePageId}`);
  await selectSection(page, /^Hero/);
  const inspector = page.getByRole("complementary", { name: "Section settings" });
  await inspector.getByRole("button", { name: "Choose image: Image" }).click();
  const picker = page.getByRole("dialog", { name: "Choose an image" });
  await picker.getByRole("button", { name: /team\.png/ }).click();
  await expect(picker.getByLabel("Describe the image")).toHaveValue("Our team at work");
  await picker.getByRole("button", { name: "Use this image" }).click();
  await expect(
    page.frameLocator("iframe").locator(`img[src="${src}"][alt="Our team at work"]`),
  ).toBeVisible();
  await waitForSaved(page);

  // Deleting an image that's in use says where, and removes it from there (MED-5).
  await page.goto(`/dashboard/sites/${site.id}/media`);
  await library.getByRole("button", { name: /team\.png/ }).click();
  const details = page.getByRole("dialog", { name: "team.png" });
  await expect(details.getByText("Home › Hero")).toBeVisible();
  await details.getByRole("button", { name: "Delete image" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm.getByText("It will be removed from: Home › Hero.")).toBeVisible();
  await confirm.getByRole("button", { name: "Delete and remove from pages" }).click();
  await expect(page.getByText("Deleted “team.png” and removed it from 1 place.")).toBeVisible();
  await expect(library).toHaveCount(0);
  // Never published, so the file itself is gone too.
  expect((await page.request.get(src!)).status()).toBe(404);

  await page.goto(`/editor/${site.id}/${site.homePageId}`);
  await selectSection(page, /^Hero/);
  await expect(inspector.getByRole("button", { name: "Choose image: Image" })).toBeVisible();
});
