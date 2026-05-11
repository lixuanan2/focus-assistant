import { applyI18n, t } from "../../lib/i18n.js";
import { FOCUS_MESSAGE_TYPES } from "../../core/runtime/messages.js";

const blockedUrl = document.querySelector("#blockedUrl");
const blockedSourceLabel = document.querySelector("#blockedSourceLabel");
const focusTaskText = document.querySelector("#focusTaskText");
const fallbackActionText = document.querySelector("#fallbackActionText");
const goBackButton = document.querySelector("#goBackButton");
const startBypassButton = document.querySelector("#startBypassButton");
const bypassStatus = document.querySelector("#bypassStatus");
const openOptionsButton = document.querySelector("#openOptionsButton");

let originalUrl = "";
let source = "none";
let settings = null;
let isBypassStarting = false;

async function init() {
  applyI18n();
  document.title = t("blockedPageTitle");
  readRouteParams();
  renderBlockedUrl();

  const statePayload = await requestStatePayload();
  settings = statePayload.settings;
  renderContext();
  renderBypassState();
}

goBackButton.addEventListener("click", () => {
  window.history.back();
});

startBypassButton.addEventListener("click", async () => {
  if (isBypassStarting || !settings?.bypass.allowFromBlockedPage) {
    return;
  }

  isBypassStarting = true;
  startBypassButton.disabled = true;
  bypassStatus.textContent = t("blockedPageQuickBypassStarting");

  const response = await chrome.runtime.sendMessage({
    type: FOCUS_MESSAGE_TYPES.startBypass,
    url: originalUrl,
    durationMinutes: settings?.bypass.defaultDurationMinutes,
    reason: "quick-bypass"
  });

  if (!response.ok) {
    isBypassStarting = false;
    startBypassButton.disabled = false;
    bypassStatus.textContent = response.error;
    return;
  }

  window.location.href = originalUrl;
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function getSourceLabel(rawSource) {
  switch (rawSource) {
    case "permanent":
      return t("focusSourcePermanent");
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

function readRouteParams() {
  const params = new URLSearchParams(window.location.search);
  originalUrl = params.get("url") || "";
  source = params.get("source") || "none";
}

function renderBlockedUrl() {
  blockedUrl.textContent = originalUrl || "-";
}

async function requestStatePayload() {
  const response = await chrome.runtime.sendMessage({ type: FOCUS_MESSAGE_TYPES.getState });

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.result;
}

function renderContext() {
  blockedSourceLabel.textContent = getSourceLabel(source);
  focusTaskText.textContent = settings.recovery.focusTask;
  fallbackActionText.textContent = settings.recovery.fallbackAction;
}

function renderBypassState() {
  if (!settings.bypass.allowFromBlockedPage) {
    startBypassButton.disabled = true;
    bypassStatus.textContent = t("blockedPageBypassDisabledHint");
    bypassStatus.classList.add("is-alert");
    return;
  }

  const durationText = String(settings.bypass.defaultDurationMinutes);
  startBypassButton.textContent = t("blockedPageQuickBypassButton", durationText);
  startBypassButton.disabled = false;
  bypassStatus.textContent = t("blockedPageQuickBypassHint", durationText);
  bypassStatus.classList.remove("is-alert");
}

init();
