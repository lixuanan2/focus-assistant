import { buildRedirectUrl, redirectMatchingTabs, shouldRedirectUrl } from "../core/blocking/redirect.js";
import { DEFAULT_SETTINGS } from "../core/settings/defaults.js";
import { getSettings, saveSettings } from "../core/settings/storage.js";

let currentSettings = DEFAULT_SETTINGS;
const settingsReady = loadCurrentSettings();

async function loadCurrentSettings() {
  currentSettings = await getSettings();
  return currentSettings;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadCurrentSettings();
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings
  };

  currentSettings = await saveSettings(merged);
});

chrome.runtime.onStartup.addListener(async () => {
  await loadCurrentSettings();
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local" || !changes.focusSettings) {
    return;
  }

  currentSettings = changes.focusSettings.newValue;
  await redirectMatchingTabs(currentSettings);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await settingsReady;
  const candidateUrl = changeInfo.url || tab.url;

  if (!candidateUrl || !shouldRedirectUrl(candidateUrl, currentSettings)) {
    return;
  }

  const redirectUrl = buildRedirectUrl(candidateUrl, currentSettings);

  if (!redirectUrl || candidateUrl === redirectUrl) {
    return;
  }

  await chrome.tabs.update(tabId, { url: redirectUrl });
});
