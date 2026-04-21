import { saveSettings } from "../../core/settings/storage.js";
import { applyI18n, t } from "../../lib/i18n.js";
import { formatDurationMmSs } from "../../lib/time.js";

const enabledToggle = document.querySelector("#enabledToggle");
const statusText = document.querySelector("#statusText");
const blockedCount = document.querySelector("#blockedCount");
const scheduleStatus = document.querySelector("#scheduleStatus");
const pomodoroPhase = document.querySelector("#pomodoroPhase");
const pomodoroStatus = document.querySelector("#pomodoroStatus");
const startPomodoroButton = document.querySelector("#startPomodoroButton");
const stopPomodoroButton = document.querySelector("#stopPomodoroButton");
const openOptionsButton = document.querySelector("#openOptionsButton");

let latestState = null;
let timerId = null;

async function init() {
  applyI18n();
  document.title = t("appName");
  await refreshState();
  timerId = window.setInterval(() => {
    if (latestState) {
      render(latestState);
    }
  }, 1000);
}

async function refreshState() {
  const response = await chrome.runtime.sendMessage({ type: "focus:get-state" });

  if (!response.ok) {
    throw new Error(response.error);
  }

  latestState = response.result;
  render(latestState);
}

function render(statePayload) {
  const { settings, focusState } = statePayload;
  const enabledCount = focusState.enabledDomains.length;
  const totalCount = settings.blockedSites.length;

  enabledToggle.checked = settings.enabled;
  blockedCount.textContent = `${enabledCount} / ${totalCount}`;
  scheduleStatus.textContent = focusState.scheduleState.active
    ? t("popupScheduleActive")
    : focusState.scheduleState.enabled
      ? t("popupScheduleReady")
      : t("popupScheduleOff");
  statusText.textContent = focusState.active
    ? t("popupStatusEnabled")
    : t("popupStatusDisabled");

  pomodoroPhase.textContent = getPomodoroPhaseLabel(focusState.pomodoroState.phase);
  pomodoroStatus.textContent = buildPomodoroStatus(focusState);
  stopPomodoroButton.disabled = !focusState.pomodoroState.active;
}

enabledToggle.addEventListener("change", async () => {
  if (!latestState) {
    return;
  }

  const nextSettings = await saveSettings({
    ...latestState.settings,
    enabled: enabledToggle.checked
  });

  latestState.settings = nextSettings;
  await refreshState();
});

startPomodoroButton.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "focus:start-pomodoro" });

  if (response.ok) {
    latestState = response.result;
    render(latestState);
  }
});

stopPomodoroButton.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "focus:stop-pomodoro" });

  if (response.ok) {
    latestState = response.result;
    render(latestState);
  }
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

window.addEventListener("unload", () => {
  if (timerId) {
    window.clearInterval(timerId);
  }
});

function buildPomodoroStatus(focusState) {
  const { pomodoroState } = focusState;

  if (!pomodoroState.active || !pomodoroState.endsAt) {
    return t("popupPomodoroIdle");
  }

  return pomodoroState.phase === "focus"
    ? t("popupPomodoroFocus", formatRemainingMs(pomodoroState.remainingMs))
    : t("popupPomodoroBreak", formatRemainingMs(pomodoroState.remainingMs));
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

function formatRemainingMs(remainingMs) {
  return formatDurationMmSs(remainingMs);
}

init();
