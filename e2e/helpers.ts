import { deflateSync } from "node:zlib";

import { expect, type Page } from "@playwright/test";

export type TestSite = { id: string; homePageId: string; subdomain: string; url: string };

/** Creates a website through the onboarding wizard and lands in the homepage editor. */
export async function createSite(
  page: Page,
  { name = "E2E Test Co", template = "Launch" }: { name?: string; template?: string } = {},
): Promise<TestSite> {
  const subdomain = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.goto("/dashboard/new");
  await page.getByRole("radio", { name: /SaaS/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Business or website name").fill(name);
  await page.getByLabel("Web address").fill(subdomain);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: new RegExp(`^${template}`) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create my website" }).click();
  await page.waitForURL(/\/editor\/[0-9a-f-]{36}\/[0-9a-f-]{36}/);
  const [, , id, homePageId] = new URL(page.url()).pathname.split("/");
  return { id: id!, homePageId: homePageId!, subdomain, url: `http://${subdomain}.localhost:3000` };
}

/** Waits until the editor says everything is saved. */
export async function waitForSaved(page: Page) {
  await expect(page.getByText("Draft saved").first()).toBeVisible({ timeout: 15_000 });
}

/** Opens the publish dialog (from the editor or the Pages tab) and publishes what's selected. */
export async function publish(
  page: Page,
  { selectAll = false, note }: { selectAll?: boolean; note?: string } = {},
) {
  await page
    .getByRole("button", { name: /^Publish/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /^Publish \d+ items?$/ })).toBeVisible();
  if (selectAll) {
    for (const box of await dialog.getByRole("checkbox").all()) {
      if ((await box.isEnabled()) && !(await box.isChecked())) await box.check();
    }
  }
  if (note) await dialog.getByLabel(/What changed/).fill(note);
  await dialog.getByRole("button", { name: /^Publish \d+ items?$/ }).click();
  await expect(page.getByText(/^Published .* Your website is live\./)).toBeVisible();
}

/** Selects a section in the editor by its name in the outline. */
export async function selectSection(page: Page, name: string | RegExp) {
  await page
    .getByRole("navigation", { name: "Page sections" })
    .getByRole("button", { name, exact: typeof name === "string" ? false : undefined })
    .first()
    .click();
}

/** A small valid PNG (solid color), generated so tests don't need binary fixtures. */
export function pngFile(
  name = "photo.png",
  size = 24,
  rgb: [number, number, number] = [79, 70, 229],
) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill(rgb).flat())]);
  const pixels = Buffer.concat(Array(size).fill(row));
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return { name, mimeType: "image/png", buffer };
}

type Files = Parameters<Page["setInputFiles"]>[1];

/** Picks files through the button's file chooser (retries until the page is interactive). */
export async function chooseFiles(page: Page, button: ReturnType<Page["getByRole"]>, files: Files) {
  await expect(async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 2_000 });
    await button.click();
    await (await chooser).setFiles(files);
  }).toPass({ timeout: 20_000 });
}

/** Records a short WebM clip in the browser (canvas + MediaRecorder), so no binary fixtures. */
export async function webmFile(page: Page, name = "clip.webm") {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d")!;
    const recorder = new MediaRecorder(canvas.captureStream(15), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    for (let frame = 0; frame < 20; frame++) {
      context.fillStyle = `hsl(${frame * 18}, 70%, 45%)`;
      context.fillRect(0, 0, 160, 90);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.stop();
    await stopped;
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  return { name, mimeType: "video/webm", buffer: Buffer.from(base64, "base64") };
}
