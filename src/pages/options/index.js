import { getSettings, saveSettings } from "../../core/settings/storage.js";
import { normalizeBlockedSiteEntry } from "../../core/blocking/domain.js";
import { applyI18n, t } from "../../lib/i18n.js";

const PLACEHOLDER_ROW_COUNT = 6;

const settingsForm = document.querySelector("#settingsForm");
const enabledInput = document.querySelector("#enabledInput");
const blockedPageModeInput = document.querySelector("#blockedPageModeInput");
const blockedPageUrlField = document.querySelector("#blockedPageUrlField");
const blockedPageUrlInput = document.querySelector("#blockedPageUrlInput");
const domainCount = document.querySelector("#domainCount");
const newDomainInput = document.querySelector("#newDomainInput");
const addDomainButton = document.querySelector("#addDomainButton");
const domainList = document.querySelector("#domainList");
const feedback = document.querySelector("#feedback");

let currentSettings = null;

async function init() {
  applyI18n();
  document.title = t("optionsPageTitle");
  blockedPageUrlInput.placeholder = t("blockedPageUrlPlaceholder");
  newDomainInput.placeholder = t("newDomainPlaceholder");
  const settings = await getSettings();
  render(settings);
}

function render(settings) {
  currentSettings = settings;
  enabledInput.checked = settings.enabled;
  blockedPageModeInput.value = settings.blockedPageMode;
  blockedPageUrlInput.value = settings.blockedPageUrl;
  blockedPageUrlField.hidden = settings.blockedPageMode !== "external";
  domainCount.textContent = `${settings.blockedSites.filter((site) => site.enabled).length} / ${settings.blockedSites.length}`;
  renderDomainList(settings.blockedSites);
}

function syncDraftSettingsFromForm() {
  currentSettings.enabled = enabledInput.checked;
  currentSettings.blockedPageMode = blockedPageModeInput.value;
  currentSettings.blockedPageUrl = blockedPageUrlInput.value;
}

function renderDomainList(blockedSites) {
  const rows = blockedSites.map((site, index) => createDomainRow(site, index));
  const placeholderCount = Math.max(PLACEHOLDER_ROW_COUNT - blockedSites.length, 0);

  for (let index = 0; index < placeholderCount; index += 1) {
    rows.push(createPlaceholderRow());
  }

  if (rows.length === 0) {
    rows.push(createPlaceholderRow());
  }

  domainList.replaceChildren(...rows);
}

function createDomainRow(site, index) {
  const row = document.createElement("div");
  row.className = "domain-row";
  row.role = "listitem";
  row.dataset.index = String(index);

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "domain-toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = site.enabled;
  checkbox.addEventListener("change", () => {
    syncDraftSettingsFromForm();
    currentSettings.blockedSites[index].enabled = checkbox.checked;
    render(currentSettings);
  });

  toggleLabel.append(checkbox);

  const domainName = document.createElement("span");
  domainName.className = "domain-name";
  domainName.textContent = site.domain;
  domainName.title = site.domain;

  const removeButton = document.createElement("button");
  removeButton.className = "icon-button";
  removeButton.type = "button";
  removeButton.textContent = t("removeDomainButton");
  removeButton.addEventListener("click", () => {
    syncDraftSettingsFromForm();
    currentSettings.blockedSites.splice(index, 1);
    render(currentSettings);
  });

  row.append(toggleLabel, domainName, removeButton);

  return row;
}

function createPlaceholderRow() {
  const row = document.createElement("div");
  row.className = "domain-row";
  row.dataset.placeholder = "true";
  row.setAttribute("aria-hidden", "true");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const domainName = document.createElement("span");
  domainName.className = "domain-name";
  domainName.textContent = "placeholder.local";

  const removeButton = document.createElement("button");
  removeButton.className = "icon-button";
  removeButton.type = "button";
  removeButton.textContent = t("removeDomainButton");

  row.append(checkbox, domainName, removeButton);

  return row;
}

function addDomain() {
  syncDraftSettingsFromForm();
  const entry = normalizeBlockedSiteEntry(newDomainInput.value);

  if (!entry) {
    feedback.textContent = t("invalidDomainMessage");
    return;
  }

  const exists = currentSettings.blockedSites.some((site) => site.domain === entry.domain);

  if (exists) {
    feedback.textContent = t("duplicateDomainMessage");
    return;
  }

  currentSettings.blockedSites.push(entry);
  currentSettings.blockedSites.sort((left, right) => left.domain.localeCompare(right.domain));
  newDomainInput.value = "";
  feedback.textContent = "";
  render(currentSettings);
}

blockedPageModeInput.addEventListener("change", () => {
  syncDraftSettingsFromForm();
  blockedPageUrlField.hidden = blockedPageModeInput.value !== "external";
});

addDomainButton.addEventListener("click", addDomain);

newDomainInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addDomain();
  }
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncDraftSettingsFromForm();

  const nextSettings = await saveSettings({
    enabled: currentSettings.enabled,
    blockedPageMode: currentSettings.blockedPageMode,
    blockedPageUrl: currentSettings.blockedPageUrl,
    blockedSites: currentSettings.blockedSites
  });

  render(nextSettings);
  feedback.textContent = t("settingsSavedMessage", String(nextSettings.blockedSites.filter((site) => site.enabled).length));

  window.setTimeout(() => {
    feedback.textContent = "";
  }, 2500);
});

init();
