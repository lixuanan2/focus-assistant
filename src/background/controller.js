import { buildRedirectUrl, redirectMatchingTabs, shouldRedirectUrl } from "../core/blocking/redirect.js";
import { FOCUS_MESSAGE_TYPES } from "../core/runtime/messages.js";
import { clearBypassSession, startBypassSession } from "../core/modes/bypass.js";
import { getFocusState } from "../core/modes/focus-state.js";
import {
  advancePomodoroSession,
  startPomodoroSession
} from "../core/modes/pomodoro.js";
import { getScheduleState } from "../core/modes/schedule.js";
import {
  ALARM_NAMES,
  DEFAULT_RUNTIME_STATE,
  DEFAULT_SETTINGS,
  STORAGE_KEYS
} from "../core/settings/defaults.js";
import {
  getRuntimeState,
  getSettings,
  sanitizeRuntimeState,
  saveRuntimeState,
  saveSettings
} from "../core/settings/storage.js";

export function createBackgroundController() {
  let currentSettings = DEFAULT_SETTINGS;
  let currentRuntimeState = DEFAULT_RUNTIME_STATE;
  const stateReady = loadState();

  return {
    loadState,
    handleInstalled,
    handleStorageChanged,
    handleTabUpdated,
    handleAlarm,
    handleMessage
  };

  async function loadState() {
    currentSettings = await getSettings();
    currentRuntimeState = await getRuntimeState();
    await reconcileState();
  }

  async function handleInstalled() {
    currentSettings = await saveSettings({
      ...DEFAULT_SETTINGS,
      ...(await getSettings())
    });
    currentRuntimeState = await saveRuntimeState({
      ...DEFAULT_RUNTIME_STATE,
      ...(await getRuntimeState())
    });
    await reconcileState();
  }

  async function handleStorageChanged(changes, areaName) {
    if (areaName !== "local") {
      return;
    }

    if (changes[STORAGE_KEYS.settings]) {
      currentSettings = changes[STORAGE_KEYS.settings].newValue;
    }

    if (changes[STORAGE_KEYS.runtime]) {
      currentRuntimeState = changes[STORAGE_KEYS.runtime].newValue;
    }

    await reconcileState();
  }

  async function handleTabUpdated(tabId, changeInfo, tab) {
    await stateReady;
    const candidateUrl = changeInfo.url || tab.url;

    if (!candidateUrl || !shouldRedirectUrl(candidateUrl, currentSettings, currentRuntimeState)) {
      return;
    }

    const redirectUrl = buildRedirectUrl(candidateUrl, currentSettings, currentRuntimeState);

    if (!redirectUrl || candidateUrl === redirectUrl) {
      return;
    }

    await chrome.tabs.update(tabId, { url: redirectUrl });
  }

  async function handleAlarm(alarm) {
    await stateReady;

    switch (alarm.name) {
      case ALARM_NAMES.pomodoroPhaseEnd:
        await persistRuntimeState(
          advancePomodoroSession(currentSettings, currentRuntimeState)
        );
        return;
      case ALARM_NAMES.bypassExpire:
        await persistRuntimeState(clearBypassSession(currentRuntimeState));
        return;
      case ALARM_NAMES.scheduleTick:
        await reconcileState();
        return;
      default:
        return;
    }
  }

  async function handleMessage(message) {
    await stateReady;

    switch (message?.type) {
      case FOCUS_MESSAGE_TYPES.getState:
        return buildStatePayload();
      case FOCUS_MESSAGE_TYPES.startPomodoro:
        return applyRuntimeMessage(() =>
          startPomodoroSession(currentSettings, currentRuntimeState)
        );
      case FOCUS_MESSAGE_TYPES.startBypass:
        return applyRuntimeMessage(() =>
          startBypassSession(currentRuntimeState, {
            url: message.url,
            durationMinutes: Number(message.durationMinutes) || currentSettings.bypass.defaultDurationMinutes,
            reason: message.reason
          })
        );
      default:
        throw new Error("Unsupported message type.");
    }
  }

  async function reconcileState() {
    const now = new Date();
    const nextRuntimeState = sanitizeRuntimeState(currentRuntimeState);
    let mutableRuntimeState = nextRuntimeState;
    let didMutateRuntimeState = false;

    if (mutableRuntimeState.bypassSession.active && mutableRuntimeState.bypassSession.expiresAt) {
      if (new Date(mutableRuntimeState.bypassSession.expiresAt) <= now) {
        mutableRuntimeState = clearBypassSession(mutableRuntimeState);
        didMutateRuntimeState = true;
      }
    }

    while (mutableRuntimeState.pomodoroSession.active && mutableRuntimeState.pomodoroSession.endsAt) {
      if (new Date(mutableRuntimeState.pomodoroSession.endsAt) > now) {
        break;
      }

      mutableRuntimeState = advancePomodoroSession(currentSettings, mutableRuntimeState, now);
      didMutateRuntimeState = true;
    }

    currentRuntimeState = didMutateRuntimeState
      ? await saveRuntimeState(mutableRuntimeState)
      : mutableRuntimeState;

    await rebuildAlarms();
    await redirectMatchingTabs(currentSettings, currentRuntimeState, now);
  }

  async function rebuildAlarms() {
    await Promise.all([
      chrome.alarms.clear(ALARM_NAMES.scheduleTick),
      chrome.alarms.clear(ALARM_NAMES.pomodoroPhaseEnd),
      chrome.alarms.clear(ALARM_NAMES.bypassExpire)
    ]);

    const scheduleState = getScheduleState(currentSettings);

    if (scheduleState.nextBoundaryAt) {
      await chrome.alarms.create(ALARM_NAMES.scheduleTick, {
        when: new Date(scheduleState.nextBoundaryAt).getTime()
      });
    }

    if (currentRuntimeState.pomodoroSession.active && currentRuntimeState.pomodoroSession.endsAt) {
      await chrome.alarms.create(ALARM_NAMES.pomodoroPhaseEnd, {
        when: new Date(currentRuntimeState.pomodoroSession.endsAt).getTime()
      });
    }

    if (currentRuntimeState.bypassSession.active && currentRuntimeState.bypassSession.expiresAt) {
      await chrome.alarms.create(ALARM_NAMES.bypassExpire, {
        when: new Date(currentRuntimeState.bypassSession.expiresAt).getTime()
      });
    }
  }

  function buildStatePayload() {
    return {
      settings: currentSettings,
      runtimeState: currentRuntimeState,
      focusState: getFocusState(currentSettings, currentRuntimeState)
    };
  }

  async function applyRuntimeMessage(mutator) {
    await persistRuntimeState(mutator());
    return buildStatePayload();
  }

  async function persistRuntimeState(nextRuntimeState) {
    currentRuntimeState = await saveRuntimeState(nextRuntimeState);
  }
}
