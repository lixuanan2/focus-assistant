import { getEnabledBlockedDomains, isBlockedUrl } from "./domain.js";

const INTERNAL_BLOCKED_PAGE_PATH = "src/pages/blocked/index.html";

export function shouldRedirectUrl(url, settings) {
  if (!settings.enabled) {
    return false;
  }

  if (isInternalBlockedPage(url)) {
    return false;
  }

  const externalRedirectUrl = getExternalRedirectUrl(settings);

  if (externalRedirectUrl && url === externalRedirectUrl) {
    return false;
  }

  return isBlockedUrl(url, getEnabledBlockedDomains(settings.blockedSites));
}

export function buildRedirectUrl(originalUrl, settings) {
  if (settings.blockedPageMode === "external") {
    const externalRedirectUrl = getExternalRedirectUrl(settings);

    if (externalRedirectUrl) {
      return externalRedirectUrl;
    }
  }

  const blockedPageUrl = new URL(chrome.runtime.getURL(INTERNAL_BLOCKED_PAGE_PATH));
  blockedPageUrl.searchParams.set("url", originalUrl);

  return blockedPageUrl.toString();
}

export async function redirectMatchingTabs(settings) {
  if (!settings.enabled || getEnabledBlockedDomains(settings.blockedSites).length === 0) {
    return;
  }

  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => typeof tab.id === "number" && typeof tab.url === "string")
      .filter((tab) => shouldRedirectUrl(tab.url, settings))
      .map((tab) => chrome.tabs.update(tab.id, { url: buildRedirectUrl(tab.url, settings) }))
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
