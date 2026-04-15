import { normalizeBlockedSiteEntries } from "../blocking/domain.js";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./defaults.js";

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const raw = stored[STORAGE_KEYS.settings] ?? {};

  return sanitizeSettings(raw);
}

export async function saveSettings(settings) {
  const nextSettings = sanitizeSettings(settings);

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: nextSettings
  });

  return nextSettings;
}

export function sanitizeSettings(settings) {
  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_SETTINGS.enabled,
    blockedPageMode: settings.blockedPageMode === "external" ? "external" : DEFAULT_SETTINGS.blockedPageMode,
    blockedPageUrl: typeof settings.blockedPageUrl === "string" ? settings.blockedPageUrl.trim() : DEFAULT_SETTINGS.blockedPageUrl,
    blockedSites: normalizeBlockedSiteEntries(
      Array.isArray(settings.blockedSites) ? settings.blockedSites : DEFAULT_SETTINGS.blockedSites
    )
  };
}
