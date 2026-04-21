import { getSettings, saveSettings } from "../../core/settings/storage.js";
import { applyI18n, t } from "../../lib/i18n.js";
import {
  initializeFormFields,
  renderFormFields,
  syncSettingsFromForm
} from "./form-fields.js";
import { createGroupSection } from "./group-section.js";
import { createDomainSection } from "./domain-section.js";

const elements = {
  settingsForm: document.querySelector("#settingsForm"),
  navItems: Array.from(document.querySelectorAll("[data-nav-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  enabledInput: document.querySelector("#enabledInput"),
  scheduleEnabledInput: document.querySelector("#scheduleEnabledInput"),
  scheduleMorningStartInput: document.querySelector("#scheduleMorningStartInput"),
  scheduleMorningEndInput: document.querySelector("#scheduleMorningEndInput"),
  scheduleAfternoonStartInput: document.querySelector("#scheduleAfternoonStartInput"),
  scheduleAfternoonEndInput: document.querySelector("#scheduleAfternoonEndInput"),
  pomodoroWorkMinutesInput: document.querySelector("#pomodoroWorkMinutesInput"),
  pomodoroBreakMinutesInput: document.querySelector("#pomodoroBreakMinutesInput"),
  focusTaskInput: document.querySelector("#focusTaskInput"),
  fallbackActionInput: document.querySelector("#fallbackActionInput"),
  bypassDefaultDurationInput: document.querySelector("#bypassDefaultDurationInput"),
  blockedPageModeInput: document.querySelector("#blockedPageModeInput"),
  blockedPageUrlField: document.querySelector("#blockedPageUrlField"),
  blockedPageUrlInput: document.querySelector("#blockedPageUrlInput"),
  groupCount: document.querySelector("#groupCount"),
  newGroupInput: document.querySelector("#newGroupInput"),
  addGroupButton: document.querySelector("#addGroupButton"),
  groupList: document.querySelector("#groupList"),
  groupOverviewPage: document.querySelector("#groupOverviewPage"),
  groupDetailPage: document.querySelector("#groupDetailPage"),
  groupBackButton: document.querySelector("#groupBackButton"),
  selectedGroupLabel: document.querySelector("#selectedGroupLabel"),
  selectedGroupMeta: document.querySelector("#selectedGroupMeta"),
  selectedGroupNameInput: document.querySelector("#selectedGroupNameInput"),
  selectedGroupModes: document.querySelector("#selectedGroupModes"),
  domainCount: document.querySelector("#domainCount"),
  newDomainInput: document.querySelector("#newDomainInput"),
  addDomainButton: document.querySelector("#addDomainButton"),
  domainList: document.querySelector("#domainList"),
  dirtyHint: document.querySelector("#dirtyHint"),
  feedback: document.querySelector("#feedback")
};

let currentSettings = null;
let selectedGroupId = null;
let isDirty = false;

const groupSection = createGroupSection({
  elements,
  t,
  getSettings: () => currentSettings,
  getSelectedGroupId: () => selectedGroupId,
  setSelectedGroupId,
  withDraftMutation,
  setFeedback
});

const domainSection = createDomainSection({
  elements,
  t,
  getSettings: () => currentSettings,
  getSelectedGroupId: () => selectedGroupId,
  withDraftMutation,
  setFeedback
});

async function init() {
  applyI18n();
  document.title = t("optionsPageTitle");
  initializeFormFields(elements, t);
  initializeNavigation();
  initializeDirtyTracking();
  const settings = await getSettings();
  render(settings);
}

function render(settings) {
  currentSettings = settings;
  selectedGroupId = resolveSelectedGroupId(settings, selectedGroupId, getRequestedRoute());
  renderFormFields(settings, elements);
  groupSection.render(settings);
  domainSection.render(settings);
  renderDirtyState();
}

function withDraftMutation(mutator) {
  syncSettingsFromForm(currentSettings, elements);
  mutator(currentSettings);
  isDirty = true;
  render(currentSettings);
}

function setFeedback(message) {
  elements.feedback.textContent = message;
}

function setSelectedGroupId(nextGroupId, updateHash = true) {
  syncBeforeViewChange();
  selectedGroupId = nextGroupId;
  if (updateHash) {
    updateRouteHash("domains", nextGroupId);
  }
  render(currentSettings);
}

function initializeNavigation() {
  const initialRoute = getRequestedRoute();
  activatePanel(initialRoute.panel);

  for (const navItem of elements.navItems) {
    navItem.addEventListener("click", () => {
      if (navItem.dataset.navTarget === "domains") {
        selectedGroupId = null;
      }
      activatePanel(navItem.dataset.navTarget);
    });
  }

  window.addEventListener("hashchange", () => {
    const route = getRequestedRoute();
    selectedGroupId = route.panel === "domains" ? route.groupId : selectedGroupId;
    activatePanel(route.panel, false);
    if (currentSettings) {
      render(currentSettings);
    }
  });
}

function activatePanel(panelName, updateHash = true) {
  const activePanel = elements.panels.some((panel) => panel.dataset.panel === panelName)
    ? panelName
    : "modes";

  for (const navItem of elements.navItems) {
    navItem.classList.toggle("is-active", navItem.dataset.navTarget === activePanel);
  }

  for (const panel of elements.panels) {
    panel.classList.toggle("is-active", panel.dataset.panel === activePanel);
  }

  if (updateHash) {
    updateRouteHash(activePanel, activePanel === "domains" ? selectedGroupId : null);
  }
}

function getRequestedRoute() {
  const raw = window.location.hash.replace(/^#/, "");
  const [panel = "modes", groupId = null] = raw.split("/");

  return {
    panel,
    groupId: panel === "domains" ? groupId : null
  };
}

function resolveSelectedGroupId(settings, currentGroupId, route) {
  if (route.panel === "domains" && route.groupId && settings.groups.some((group) => group.id === route.groupId)) {
    return route.groupId;
  }

  if (route.panel === "domains" && !route.groupId) {
    return null;
  }

  if (settings.groups.some((group) => group.id === currentGroupId)) {
    return currentGroupId;
  }

  return null;
}

function updateRouteHash(panel, groupId) {
  const nextHash = panel === "domains" && groupId ? `#domains/${groupId}` : `#${panel}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

function initializeDirtyTracking() {
  elements.settingsForm.addEventListener("input", handleDirtyInput, true);
  elements.settingsForm.addEventListener("change", handleDirtyInput, true);
  elements.groupBackButton.addEventListener("click", () => {
    setSelectedGroupId(null);
  });
}

function handleDirtyInput(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.closest(".actions")) {
    return;
  }

  isDirty = true;
  renderDirtyState();
}

function renderDirtyState() {
  elements.dirtyHint.hidden = !isDirty;
}

function syncBeforeViewChange() {
  if (!currentSettings) {
    return;
  }

  syncSettingsFromForm(currentSettings, elements);
}

elements.blockedPageModeInput.addEventListener("change", () => {
  syncSettingsFromForm(currentSettings, elements);
  elements.blockedPageUrlField.hidden = elements.blockedPageModeInput.value !== "external";
});

elements.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncSettingsFromForm(currentSettings, elements);

  const nextSettings = await saveSettings(currentSettings);

  isDirty = false;
  render(nextSettings);
  setFeedback(
    t(
      "settingsSavedMessage",
      String(nextSettings.blockedSites.filter((site) => site.enabled).length)
    )
  );

  window.setTimeout(() => {
    setFeedback("");
  }, 2500);
});

init();
