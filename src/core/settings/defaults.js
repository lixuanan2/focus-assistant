export const STORAGE_KEYS = {
  settings: "focusSettings"
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  blockedPageMode: "internal",
  blockedPageUrl: "",
  blockedSites: [
    { domain: "facebook.com", enabled: true },
    { domain: "instagram.com", enabled: true },
    { domain: "youtube.com", enabled: true }
  ]
};
