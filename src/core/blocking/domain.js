export function normalizeDomain(input) {
  const value = input.trim().toLowerCase();

  if (!value) {
    return "";
  }

  const withoutProtocol = value.replace(/^[a-z]+:\/\//, "");
  const [hostname] = withoutProtocol.split(/[/?#]/, 1);

  return hostname.replace(/^\*\./, "").replace(/\.+$/, "");
}

export function normalizeBlockedSiteEntries(items) {
  const entriesByDomain = new Map();

  for (const item of items) {
    const normalizedEntry = normalizeBlockedSiteEntry(item);

    if (normalizedEntry) {
      entriesByDomain.set(normalizedEntry.domain, normalizedEntry);
    }
  }

  return Array.from(entriesByDomain.values()).sort((left, right) => left.domain.localeCompare(right.domain));
}

export function normalizeBlockedSiteEntry(item) {
  if (typeof item === "string") {
    const domain = normalizeDomain(item);

    return domain ? { domain, enabled: true, groupId: "" } : null;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const domain = normalizeDomain(item.domain ?? "");

  if (!domain) {
    return null;
  }

  return {
    domain,
    enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    groupId: typeof item.groupId === "string" ? item.groupId.trim() : ""
  };
}

export function getEnabledBlockedDomains(entries) {
  return normalizeBlockedSiteEntries(entries)
    .filter((entry) => entry.enabled)
    .map((entry) => entry.domain);
}

export function isBlockedUrl(url, blockedSites) {
  try {
    const { hostname, protocol } = new URL(url);

    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return blockedSites.some((domain) => matchesDomain(hostname, domain));
  } catch {
    return false;
  }
}

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}
