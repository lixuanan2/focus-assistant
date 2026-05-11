import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, expect, test } from "@playwright/test";

const extensionPath = path.resolve(process.cwd());
const browserChannel = process.env.PW_BROWSER_CHANNEL || "chromium";
const headless = process.env.PW_HEADLESS === "true";

test("discarding unsaved changes reverts to the last saved state", async () => {
  const { context, extensionId, userDataDir } = await launchExtension();
  const page = await context.newPage();

  try {
    await page.goto(getOptionsUrl(extensionId, "modes"));

    const enabledInput = page.locator("#enabledInput");
    await expect(enabledInput).toBeChecked();

    await enabledInput.uncheck();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.locator('[data-nav-target="recovery"]').click();
    await expect(page.locator('[data-panel="recovery"].is-active')).toBeVisible();

    await page.locator('[data-nav-target="modes"]').click();
    await expect(page.locator('[data-panel="modes"].is-active').first()).toBeVisible();
    await expect(enabledInput).toBeChecked();
    await expect(page.locator("#dirtyHint")).toBeHidden();
  } finally {
    await closeExtensionContext(context, userDataDir);
  }
});

test("smoke flow: add schedule, add group and domain, save, then redirect to blocked page", async () => {
  const { context, extensionId, userDataDir } = await launchExtension();
  const page = await context.newPage();

  try {
    await page.goto(getOptionsUrl(extensionId, "modes"));

    await page.locator("#addScheduleWindowButton").click();
    await expect(page.locator("#scheduleDetailPage")).toBeVisible();
    await page.locator("#scheduleStartInput").fill("23:00");
    await page.locator("#scheduleEndInput").fill("01:00");
    await page.locator("#scheduleBackButton").click();
    await expect(page.locator("#scheduleOverviewPage")).toBeVisible();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("#dirtyHint")).toBeHidden();

    await page.locator('[data-nav-target="domains"]').click();
    await page.locator("#newGroupInput").fill("Smoke Group");
    await page.locator("#addGroupButton").click();
    await expect(page.locator("#groupDetailPage")).toBeVisible();
    await expect(page.locator("#selectedGroupNameInput")).toHaveValue("Smoke Group");

    await page.locator("#newDomainInput").fill("example.com");
    await page.locator("#addDomainButton").click();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("#dirtyHint")).toBeHidden();

    const targetPage = await context.newPage();
    await targetPage.goto("https://example.com", { waitUntil: "domcontentloaded" });

    await expect(targetPage).toHaveURL(new RegExp(`chrome-extension://${extensionId}/src/pages/blocked/index\\.html`));
    await expect(targetPage.locator("#blockedUrl")).toContainText("example.com");
  } finally {
    await closeExtensionContext(context, userDataDir);
  }
});

async function launchExtension() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-assistant-ui-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: browserChannel,
    headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const serviceWorker = context.serviceWorkers()[0]
    ?? await context.waitForEvent("serviceworker", { timeout: 15_000 });
  const extensionId = new URL(serviceWorker.url()).host;

  return { context, extensionId, userDataDir };
}

function getOptionsUrl(extensionId, panel = "modes") {
  return `chrome-extension://${extensionId}/src/pages/options/index.html#${panel}`;
}

async function closeExtensionContext(context, userDataDir) {
  await context.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}
