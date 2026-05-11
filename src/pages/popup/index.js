import { saveSettings } from "../../core/settings/storage.js";
import { FOCUS_MESSAGE_TYPES } from "../../core/runtime/messages.js";
import { applyI18n, t } from "../../lib/i18n.js";
import { formatDurationMmSs } from "../../lib/time.js";

const enabledToggle = document.querySelector("#enabledToggle");
const statusText = document.querySelector("#statusText");
const blockedCount = document.querySelector("#blockedCount");
const scheduleStatus = document.querySelector("#scheduleStatus");
const pomodoroPhase = document.querySelector("#pomodoroPhase");
const pomodoroStatus = document.querySelector("#pomodoroStatus");
const startPomodoroButton = document.querySelector("#startPomodoroButton");
const openOptionsButton = document.querySelector("#openOptionsButton");

let latestState = null;
let timerId = null;

async function init() {
  applyI18n();
  document.title = t("appName");
  initializeEvents();
  await refreshState();
  timerId = window.setInterval(() => {
    if (latestState) {
      render(latestState);
    }
  }, 1000);
}

async function refreshState() {
  latestState = await requestStatePayload();
  render(latestState);
}

function render(statePayload) {
  const { settings, focusState } = statePayload;

  enabledToggle.checked = settings.enabled;
  blockedCount.textContent = buildBlockedCountText(statePayload);
  scheduleStatus.textContent = buildScheduleStatusText(focusState);
  statusText.textContent = buildFocusStatusText(focusState);
  pomodoroPhase.textContent = getPomodoroPhaseLabel(focusState.pomodoroState.phase);
  pomodoroStatus.textContent = buildPomodoroStatus(focusState);
  startPomodoroButton.disabled = focusState.pomodoroState.active;
}

function initializeEvents() {
  enabledToggle.addEventListener("change", handleManualToggleChange);
  startPomodoroButton.addEventListener("click", handlePomodoroStart);
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  window.addEventListener("unload", () => {
    if (timerId) {
      window.clearInterval(timerId);
    }
  });
}

function buildPomodoroStatus(focusState) {
  const { pomodoroState } = focusState;

  if (!pomodoroState.active || !pomodoroState.endsAt) {
    return t("popupPomodoroIdle");
  }

  return pomodoroState.phase === "focus"
    ? t("popupPomodoroFocusLocked", formatDurationMmSs(pomodoroState.remainingMs))
    : t("popupPomodoroBreak", formatDurationMmSs(pomodoroState.remainingMs));
}

function getPomodoroPhaseLabel(phase) {
  switch (phase) {
    case "focus":
      return t("pomodoroPhaseFocus");
    case "break":
      return t("pomodoroPhaseBreak");
    default:
      return t("pomodoroPhaseIdle");
  }
}

function buildBlockedCountText({ settings, focusState }) {
  return `${focusState.enabledDomains.length} / ${settings.blockedSites.length}`;
}

function buildScheduleStatusText(focusState) {
  return focusState.scheduleState.active
    ? t("popupScheduleActive")
    : focusState.scheduleState.enabled
      ? t("popupScheduleReady")
      : t("popupScheduleOff");
}

function buildFocusStatusText(focusState) {
  return focusState.active
    ? t("popupStatusEnabled")
    : t("popupStatusDisabled");
}

async function requestStatePayload() {
  const response = await chrome.runtime.sendMessage({ type: FOCUS_MESSAGE_TYPES.getState });

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.result;
}

async function handleManualToggleChange() {
  if (!latestState) {
    return;
  }

  await saveSettings({
    ...latestState.settings,
    enabled: enabledToggle.checked
  });

  await refreshState();
}

async function handlePomodoroStart() {
  const response = await chrome.runtime.sendMessage({ type: FOCUS_MESSAGE_TYPES.startPomodoro });

  if (response.ok) {
    latestState = response.result;
    render(latestState);
  }
}

init();
