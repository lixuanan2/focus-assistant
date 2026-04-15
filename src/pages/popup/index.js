import { getSettings, saveSettings } from "../../core/settings/storage.js";
import { getEnabledBlockedDomains } from "../../core/blocking/domain.js";
import { applyI18n, t } from "../../lib/i18n.js";

const enabledToggle = document.querySelector("#enabledToggle");
const statusText = document.querySelector("#statusText");
const blockedCount = document.querySelector("#blockedCount");
const openOptionsButton = document.querySelector("#openOptionsButton");

async function init() {
  applyI18n();
  document.title = t("appName");
  const settings = await getSettings();
  render(settings);
}

function render(settings) {
  const enabledDomains = getEnabledBlockedDomains(settings.blockedSites);
  enabledToggle.checked = settings.enabled;
  blockedCount.textContent = `${enabledDomains.length} / ${settings.blockedSites.length}`;
  statusText.textContent = settings.enabled
    ? t("popupStatusEnabled")
    : t("popupStatusDisabled");
}

enabledToggle.addEventListener("change", async () => {
  const settings = await getSettings();
  const nextSettings = await saveSettings({
    ...settings,
    enabled: enabledToggle.checked
  });

  render(nextSettings);
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
