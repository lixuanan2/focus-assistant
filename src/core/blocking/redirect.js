import { getFocusState, shouldBlockUrl } from "../modes/focus-state.js";

const INTERNAL_BLOCKED_PAGE_PATH = "src/pages/blocked/index.html";

export function shouldRedirectUrl(url, settings, runtimeState, now = new Date()) {
  if (isInternalBlockedPage(url)) {
    return false;
  }

  const externalRedirectUrl = getExternalRedirectUrl(settings);

  if (externalRedirectUrl && url === externalRedirectUrl) {
    return false;
  }

  return shouldBlockUrl(url, settings, runtimeState, now);
}

export function buildRedirectUrl(originalUrl, settings, runtimeState, now = new Date()) {
  if (settings.blockedPageMode === "external") {
    const externalRedirectUrl = getExternalRedirectUrl(settings);

    if (externalRedirectUrl) {
      return externalRedirectUrl;
    }
  }

  const focusState = getFocusState(settings, runtimeState, now);
  const blockedPageUrl = new URL(chrome.runtime.getURL(INTERNAL_BLOCKED_PAGE_PATH));

  blockedPageUrl.searchParams.set("url", originalUrl);
  blockedPageUrl.searchParams.set("source", focusState.primarySource);

  return blockedPageUrl.toString();
}

export async function redirectMatchingTabs(settings, runtimeState, now = new Date()) {
  if (!getFocusState(settings, runtimeState, now).active) {
    return;
  }

  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => typeof tab.id === "number" && typeof tab.url === "string")
      .filter((tab) => shouldRedirectUrl(tab.url, settings, runtimeState, now))
      .map((tab) => chrome.tabs.update(tab.id, { url: buildRedirectUrl(tab.url, settings, runtimeState, now) }))
  );
}

function getExternalRedirectUrl(settings) {
  const raw = settings.blockedPageUrl?.trim();

  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isInternalBlockedPage(url) {
  return url.startsWith(chrome.runtime.getURL(INTERNAL_BLOCKED_PAGE_PATH));
}
