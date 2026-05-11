import { getSettings, saveSettings } from "../../core/settings/storage.js";
import { applyI18n, t } from "../../lib/i18n.js";
import {
  initializeFormFields,
  renderFormFields,
  syncSettingsFromForm
} from "./form-fields.js";
import { createScheduleSection } from "./schedule-section.js";
import { createGroupSection } from "./group-section.js";
import { createDomainSection } from "./domain-section.js";

const DEFAULT_PANEL = "modes";
const DOMAINS_PANEL = "domains";

const elements = {
  settingsForm: document.querySelector("#settingsForm"),
  navItems: Array.from(document.querySelectorAll("[data-nav-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  enabledInput: document.querySelector("#enabledInput"),
  scheduleEnabledInput: document.querySelector("#scheduleEnabledInput"),
  scheduleWindowCount: document.querySelector("#scheduleWindowCount"),
  scheduleWindowList: document.querySelector("#scheduleWindowList"),
  addScheduleWindowButton: document.querySelector("#addScheduleWindowButton"),
  scheduleOverviewPage: document.querySelector("#scheduleOverviewPage"),
  scheduleDetailPage: document.querySelector("#scheduleDetailPage"),
  scheduleBackButton: document.querySelector("#scheduleBackButton"),
  scheduleDetailCount: document.querySelector("#scheduleDetailCount"),
  selectedScheduleLabel: document.querySelector("#selectedScheduleLabel"),
  selectedScheduleMeta: document.querySelector("#selectedScheduleMeta"),
  scheduleDayList: document.querySelector("#scheduleDayList"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  scheduleEndInput: document.querySelector("#scheduleEndInput"),
  pomodoroWorkMinutesInput: document.querySelector("#pomodoroWorkMinutesInput"),
  pomodoroBreakMinutesInput: document.querySelector("#pomodoroBreakMinutesInput"),
  focusTaskInput: document.querySelector("#focusTaskInput"),
  fallbackActionInput: document.querySelector("#fallbackActionInput"),
  bypassDefaultDurationInput: document.querySelector("#bypassDefaultDurationInput"),
  blockedPageModeInput: document.querySelector("#blockedPageModeInput"),
  blockedPageUrlField: document.querySelector("#blockedPageUrlField"),
  blockedPageUrlInput: document.querySelector("#blockedPageUrlInput"),
  allowBlockedPageBypassInput: document.querySelector("#allowBlockedPageBypassInput"),
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
let lastSavedSettings = null;
let selectedGroupId = null;
let isDirty = false;

const scheduleSection = createScheduleSection({
  elements,
  t,
  withDraftMutation,
  setFeedback
});

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
  initializeFormEvents();
  const settings = await getSettings();
  lastSavedSettings = cloneSettings(settings);
  render(settings);
}

function render(settings) {
  currentSettings = settings;
  selectedGroupId = resolveSelectedGroupId(settings, selectedGroupId, getRequestedRoute());
  renderFormFields(settings, elements);
  scheduleSection.render(settings);
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

function setSelectedGroupId(nextGroupId, updateHash = true, skipDirtyCheck = false) {
  if (nextGroupId !== selectedGroupId && !skipDirtyCheck && !canLeaveCurrentView()) {
    return;
  }

  syncBeforeViewChange();
  selectedGroupId = nextGroupId;
  if (updateHash) {
    updateRouteHash(DOMAINS_PANEL, nextGroupId);
  }
  render(currentSettings);
}

function initializeNavigation() {
  const initialRoute = getRequestedRoute();
  activatePanel(initialRoute.panel);

  for (const navItem of elements.navItems) {
    navItem.addEventListener("click", () => {
      if (!canLeaveCurrentView()) {
        return;
      }

      if (navItem.dataset.navTarget === DOMAINS_PANEL) {
        selectedGroupId = null;
      }
      activatePanel(navItem.dataset.navTarget);
    });
  }

  window.addEventListener("hashchange", () => {
    const route = getRequestedRoute();
    selectedGroupId = route.panel === DOMAINS_PANEL ? route.groupId : selectedGroupId;
    activatePanel(route.panel, false);
    if (currentSettings) {
      render(currentSettings);
    }
  });
}

function activatePanel(panelName, updateHash = true) {
  const activePanel = isKnownPanel(panelName) ? panelName : DEFAULT_PANEL;

  for (const navItem of elements.navItems) {
    navItem.classList.toggle("is-active", navItem.dataset.navTarget === activePanel);
  }

  for (const panel of elements.panels) {
    panel.classList.toggle("is-active", panel.dataset.panel === activePanel);
  }

  if (updateHash) {
    updateRouteHash(activePanel, activePanel === DOMAINS_PANEL ? selectedGroupId : null);
  }
}

function getRequestedRoute() {
  const raw = window.location.hash.replace(/^#/, "");
  const [panel = DEFAULT_PANEL, groupId = null] = raw.split("/");

  return {
    panel,
    groupId: panel === DOMAINS_PANEL ? groupId : null
  };
}

function resolveSelectedGroupId(settings, currentGroupId, route) {
  if (
    route.panel === DOMAINS_PANEL &&
    route.groupId &&
    settings.groups.some((group) => group.id === route.groupId)
  ) {
    return route.groupId;
  }

  if (route.panel === DOMAINS_PANEL && !route.groupId) {
    return null;
  }

  if (settings.groups.some((group) => group.id === currentGroupId)) {
    return currentGroupId;
  }

  return null;
}

function updateRouteHash(panel, groupId) {
  const nextHash = panel === DOMAINS_PANEL && groupId ? `#${DOMAINS_PANEL}/${groupId}` : `#${panel}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

function isKnownPanel(panelName) {
  return elements.panels.some((panel) => panel.dataset.panel === panelName);
}

function initializeDirtyTracking() {
  elements.settingsForm.addEventListener("input", handleDirtyInput, true);
  elements.settingsForm.addEventListener("change", handleDirtyInput, true);
  window.addEventListener("beforeunload", handleBeforeUnload);
  elements.groupBackButton.addEventListener("click", () => {
    setSelectedGroupId(null);
  });
}

function initializeFormEvents() {
  elements.blockedPageModeInput.addEventListener("change", () => {
    syncSettingsFromForm(currentSettings, elements);
    elements.blockedPageUrlField.hidden = elements.blockedPageModeInput.value !== "external";
  });

  elements.settingsForm.addEventListener("submit", handleSubmit);
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

function canLeaveCurrentView() {
  if (!isDirty) {
    return true;
  }

  const shouldDiscard = window.confirm(t("unsavedChangesConfirm"));

  if (!shouldDiscard) {
    return false;
  }

  discardUnsavedChanges();

  return true;
}

function handleBeforeUnload(event) {
  if (!isDirty) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

async function handleSubmit(event) {
  event.preventDefault();
  syncSettingsFromForm(currentSettings, elements);

  const nextSettings = await saveSettings(currentSettings);

  lastSavedSettings = cloneSettings(nextSettings);
  isDirty = false;
  render(nextSettings);
  setFeedback(t("settingsSavedMessage", String(countEnabledSites(nextSettings))));

  window.setTimeout(() => {
    setFeedback("");
  }, 2500);
}

function countEnabledSites(settings) {
  return settings.blockedSites.filter((site) => site.enabled).length;
}

function discardUnsavedChanges() {
  if (!lastSavedSettings) {
    return;
  }

  currentSettings = cloneSettings(lastSavedSettings);
  isDirty = false;
  setFeedback("");
  render(currentSettings);
}

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings));
}

init();
