import { chromium, type FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

/** Signs in once as the demo account and saves the session for every test. */
export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0]!.use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.SEED_EMAIL ?? "demo@example.com");
  await page.getByLabel("Password").fill(process.env.SEED_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL("**/dashboard**");
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}
