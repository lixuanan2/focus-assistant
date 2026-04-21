import { applyI18n, t } from "../../lib/i18n.js";
import { formatDurationMmSs } from "../../lib/time.js";

const BYPASS_DELAY_SECONDS = 15;
const RESET_DURATION_SECONDS = 120;

const blockedUrl = document.querySelector("#blockedUrl");
const blockedSourceLabel = document.querySelector("#blockedSourceLabel");
const focusTaskText = document.querySelector("#focusTaskText");
const fallbackActionText = document.querySelector("#fallbackActionText");
const reasonSelect = document.querySelector("#reasonSelect");
const noteInput = document.querySelector("#noteInput");
const startResetButton = document.querySelector("#startResetButton");
const resetStatus = document.querySelector("#resetStatus");
const durationSelect = document.querySelector("#durationSelect");
const startBypassButton = document.querySelector("#startBypassButton");
const bypassStatus = document.querySelector("#bypassStatus");
const openOptionsButton = document.querySelector("#openOptionsButton");

let originalUrl = "";
let source = "none";
let settings = null;
let bypassCountdownId = null;
let bypassCountdownRemaining = 0;
let resetCountdownId = null;
let resetCountdownRemaining = 0;

async function init() {
  applyI18n();
  document.title = t("blockedPageTitle");

  const params = new URLSearchParams(window.location.search);
  originalUrl = params.get("url") || "";
  source = params.get("source") || "none";
  blockedUrl.textContent = originalUrl || "-";

  const response = await chrome.runtime.sendMessage({ type: "focus:get-state" });

  if (!response.ok) {
    throw new Error(response.error);
  }

  settings = response.result.settings;
  blockedSourceLabel.textContent = getSourceLabel(source);
  focusTaskText.textContent = settings.recovery.focusTask;
  fallbackActionText.textContent = settings.recovery.fallbackAction;
  durationSelect.value = String(settings.bypass.defaultDurationMinutes);
  noteInput.placeholder = t("blockedPageNotePlaceholder");
  populateReasonOptions(settings.recovery.reasonOptions);
}

function populateReasonOptions(reasonOptions) {
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = t("blockedPageReasonPlaceholder");

  const options = [
    placeholderOption,
    ...reasonOptions.map((reason) => {
      const option = document.createElement("option");
      option.value = reason;
      option.textContent = reason;
      return option;
    })
  ];

  reasonSelect.replaceChildren(...options);
}

startResetButton.addEventListener("click", () => {
  if (resetCountdownId) {
    return;
  }

  resetCountdownRemaining = RESET_DURATION_SECONDS;
  renderResetCountdown();
  resetCountdownId = window.setInterval(() => {
    resetCountdownRemaining -= 1;

    if (resetCountdownRemaining <= 0) {
      window.clearInterval(resetCountdownId);
      resetCountdownId = null;
      resetStatus.textContent = t("blockedPageResetComplete");
      return;
    }

    renderResetCountdown();
  }, 1000);
});

startBypassButton.addEventListener("click", async () => {
  const combinedReason = buildCombinedReason();

  if (!combinedReason) {
    bypassStatus.textContent = t("blockedPageReasonRequired");
    return;
  }

  if (!bypassCountdownId && bypassCountdownRemaining === 0) {
    bypassCountdownRemaining = BYPASS_DELAY_SECONDS;
    renderBypassCountdown();
    bypassCountdownId = window.setInterval(() => {
      bypassCountdownRemaining -= 1;

      if (bypassCountdownRemaining <= 0) {
        window.clearInterval(bypassCountdownId);
        bypassCountdownId = null;
        renderBypassCountdown();
        return;
      }

      renderBypassCountdown();
    }, 1000);
    return;
  }

  if (bypassCountdownId || bypassCountdownRemaining > 0) {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "focus:start-bypass",
    url: originalUrl,
    durationMinutes: Number(durationSelect.value),
    reason: combinedReason
  });

  if (!response.ok) {
    bypassStatus.textContent = response.error;
    return;
  }

  window.location.href = originalUrl;
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

window.addEventListener("unload", () => {
  if (bypassCountdownId) {
    window.clearInterval(bypassCountdownId);
  }

  if (resetCountdownId) {
    window.clearInterval(resetCountdownId);
  }
});

function renderBypassCountdown() {
  if (bypassCountdownRemaining > 0) {
    startBypassButton.textContent = t("blockedPageBypassCountdown", String(bypassCountdownRemaining));
    startBypassButton.disabled = true;
    bypassStatus.textContent = t("blockedPageBypassCountdownHint");
    return;
  }

  startBypassButton.textContent = t("blockedPageUnlockNowButton", durationSelect.value);
  startBypassButton.disabled = false;
  bypassStatus.textContent = t("blockedPageBypassReady");
}

function renderResetCountdown() {
  startResetButton.disabled = true;
  resetStatus.textContent = t("blockedPageResetRunning", formatDuration(resetCountdownRemaining));
}

function buildCombinedReason() {
  const selectedReason = reasonSelect.value.trim();
  const note = noteInput.value.trim();

  if (!selectedReason && !note) {
    return "";
  }

  if (!selectedReason) {
    return note;
  }

  return note ? `${selectedReason} | ${note}` : selectedReason;
}

function getSourceLabel(rawSource) {
  switch (rawSource) {
    case "manual":
      return t("focusSourceManual");
    case "schedule":
      return t("focusSourceSchedule");
    case "pomodoro":
      return t("focusSourcePomodoro");
    default:
      return t("focusSourceUnknown");
  }
}

function formatDuration(totalSeconds) {
  return formatDurationMmSs(totalSeconds, "seconds");
}

init();
