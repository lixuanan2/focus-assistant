import {
  DEFAULT_GROUP_ID,
  DEFAULT_RUNTIME_STATE,
  DEFAULT_SETTINGS,
  STORAGE_KEYS
} from "./defaults.js";
import {
  normalizeBlockedSiteEntries,
  normalizeDomain
} from "../blocking/domain.js";

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const raw = stored[STORAGE_KEYS.settings] ?? {};

  return sanitizeSettings(raw);
}

export async function saveSettings(settings) {
  const nextSettings = sanitizeSettings(settings);

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: nextSettings
  });

  return nextSettings;
}

export async function getRuntimeState() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.runtime);
  const raw = stored[STORAGE_KEYS.runtime] ?? {};

  return sanitizeRuntimeState(raw);
}

export async function saveRuntimeState(runtimeState) {
  const nextRuntimeState = sanitizeRuntimeState(runtimeState);

  await chrome.storage.local.set({
    [STORAGE_KEYS.runtime]: nextRuntimeState
  });

  return nextRuntimeState;
}

export function sanitizeSettings(settings) {
  const groups = sanitizeGroups(settings.groups);

  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_SETTINGS.enabled,
    blockedPageMode: settings.blockedPageMode === "external" ? "external" : DEFAULT_SETTINGS.blockedPageMode,
    blockedPageUrl: typeof settings.blockedPageUrl === "string" ? settings.blockedPageUrl.trim() : DEFAULT_SETTINGS.blockedPageUrl,
    groups,
    blockedSites: sanitizeBlockedSites(
      Array.isArray(settings.blockedSites) ? settings.blockedSites : DEFAULT_SETTINGS.blockedSites,
      groups
    ),
    schedule: sanitizeSchedule(settings.schedule),
    pomodoro: sanitizePomodoro(settings.pomodoro),
    bypass: sanitizeBypassSettings(settings.bypass),
    recovery: sanitizeRecovery(settings.recovery)
  };
}

export function sanitizeRuntimeState(runtimeState) {
  return {
    pomodoroSession: sanitizePomodoroSession(runtimeState.pomodoroSession),
    bypassSession: sanitizeBypassSession(runtimeState.bypassSession)
  };
}

function sanitizeSchedule(schedule) {
  const rawWindows = Array.isArray(schedule?.windows)
    ? schedule.windows
    : DEFAULT_SETTINGS.schedule.windows;

  const windows = rawWindows
    .map(sanitizeScheduleWindow)
    .filter(Boolean);

  return {
    enabled: typeof schedule?.enabled === "boolean" ? schedule.enabled : DEFAULT_SETTINGS.schedule.enabled,
    windows: windows.length > 0 ? windows : DEFAULT_SETTINGS.schedule.windows
  };
}

function sanitizeGroups(groups) {
  const entries = Array.isArray(groups) ? groups : DEFAULT_SETTINGS.groups;
  const byId = new Map();

  for (let index = 0; index < entries.length; index += 1) {
    const normalizedGroup = sanitizeGroup(entries[index], index);

    if (normalizedGroup) {
      byId.set(normalizedGroup.id, normalizedGroup);
    }
  }

  if (!byId.has(DEFAULT_GROUP_ID)) {
    byId.set(DEFAULT_GROUP_ID, DEFAULT_SETTINGS.groups[0]);
  }

  return Array.from(byId.values());
}

function sanitizeGroup(group, index) {
  if (!group || typeof group !== "object") {
    return null;
  }

  const id = typeof group.id === "string" && group.id.trim()
    ? group.id.trim()
    : `group-${index + 1}`;
  const name = typeof group.name === "string" && group.name.trim()
    ? group.name.trim().slice(0, 40)
    : id === DEFAULT_GROUP_ID
      ? DEFAULT_SETTINGS.groups[0].name
      : `分组 ${index + 1}`;

  return {
    id,
    name,
    modes: {
      manual: typeof group.modes?.manual === "boolean" ? group.modes.manual : true,
      schedule: typeof group.modes?.schedule === "boolean" ? group.modes.schedule : true,
      pomodoro: typeof group.modes?.pomodoro === "boolean" ? group.modes.pomodoro : true
    }
  };
}

function sanitizeBlockedSites(blockedSites, groups) {
  const groupIds = new Set(groups.map((group) => group.id));

  return normalizeBlockedSiteEntries(blockedSites).map((entry) => ({
    ...entry,
    groupId: groupIds.has(entry.groupId) ? entry.groupId : DEFAULT_GROUP_ID
  }));
}

function sanitizeScheduleWindow(windowConfig, index) {
  if (!windowConfig || typeof windowConfig !== "object") {
    return null;
  }

  const id = typeof windowConfig.id === "string" && windowConfig.id.trim()
    ? windowConfig.id.trim()
    : `window-${index ?? crypto.randomUUID()}`;

  const days = Array.isArray(windowConfig.days)
    ? Array.from(new Set(windowConfig.days.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))).sort()
    : [];

  const start = normalizeClockTime(windowConfig.start);
  const end = normalizeClockTime(windowConfig.end);

  if (days.length === 0 || !start || !end || start === end) {
    return null;
  }

  return { id, days, start, end };
}

function sanitizePomodoro(pomodoro) {
  return {
    workMinutes: clampInteger(pomodoro?.workMinutes, DEFAULT_SETTINGS.pomodoro.workMinutes, 5, 180),
    breakMinutes: clampInteger(pomodoro?.breakMinutes, DEFAULT_SETTINGS.pomodoro.breakMinutes, 1, 60)
  };
}

function sanitizeBypassSettings(bypass) {
  return {
    defaultDurationMinutes: clampInteger(
      bypass?.defaultDurationMinutes,
      DEFAULT_SETTINGS.bypass.defaultDurationMinutes,
      1,
      30
    )
  };
}

function sanitizeRecovery(recovery) {
  const rawReasonOptions = Array.isArray(recovery?.reasonOptions)
    ? recovery.reasonOptions
    : DEFAULT_SETTINGS.recovery.reasonOptions;

  const reasonOptions = rawReasonOptions
    .map((reason) => String(reason).trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    focusTask: typeof recovery?.focusTask === "string" && recovery.focusTask.trim()
      ? recovery.focusTask.trim()
      : DEFAULT_SETTINGS.recovery.focusTask,
    fallbackAction: typeof recovery?.fallbackAction === "string" && recovery.fallbackAction.trim()
      ? recovery.fallbackAction.trim()
      : DEFAULT_SETTINGS.recovery.fallbackAction,
    reasonOptions: reasonOptions.length > 0 ? reasonOptions : DEFAULT_SETTINGS.recovery.reasonOptions
  };
}

function sanitizePomodoroSession(pomodoroSession) {
  return {
    active: Boolean(pomodoroSession?.active),
    phase: ["idle", "focus", "break"].includes(pomodoroSession?.phase)
      ? pomodoroSession.phase
      : DEFAULT_RUNTIME_STATE.pomodoroSession.phase,
    startedAt: normalizeTimestamp(pomodoroSession?.startedAt),
    endsAt: normalizeTimestamp(pomodoroSession?.endsAt),
    cycle: clampInteger(pomodoroSession?.cycle, DEFAULT_RUNTIME_STATE.pomodoroSession.cycle, 0, 999)
  };
}

function sanitizeBypassSession(bypassSession) {
  return {
    active: Boolean(bypassSession?.active),
    domain: normalizeDomain(bypassSession?.domain ?? ""),
    reason: typeof bypassSession?.reason === "string" ? bypassSession.reason.trim().slice(0, 200) : "",
    startedAt: normalizeTimestamp(bypassSession?.startedAt),
    expiresAt: normalizeTimestamp(bypassSession?.expiresAt)
  };
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

function normalizeClockTime(value) {
  if (typeof value !== "string") {
    return "";
  }

  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  return match ? `${match[1]}:${match[2]}` : "";
}

function normalizeTimestamp(value) {
  if (value == null) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
