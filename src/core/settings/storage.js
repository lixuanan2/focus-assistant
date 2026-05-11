import {
  STORAGE_KEYS
} from "./defaults.js";
import { sanitizeRuntimeState } from "./sanitize-runtime.js";
import { sanitizeSettings } from "./sanitize-settings.js";

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

export async function getRuntimeState() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.runtime);
  const raw = stored[STORAGE_KEYS.runtime] ?? {};

  return sanitizeRuntimeState(raw);
}

export async function saveRuntimeState(runtimeState) {
  const nextRuntimeState = sanitizeRuntimeState(runtimeState);

  await chrome.storage.local.set({
    [STORAGE_KEYS.runtime]: nextRuntimeState
  });

  return nextRuntimeState;
}

export { sanitizeSettings, sanitizeRuntimeState };
