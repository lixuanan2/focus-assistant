import { normalizeDomain } from "../blocking/domain.js";
import { DEFAULT_RUNTIME_STATE } from "./defaults.js";

export function sanitizeRuntimeState(runtimeState) {
  return {
    pomodoroSession: sanitizePomodoroSession(runtimeState.pomodoroSession),
    bypassSession: sanitizeBypassSession(runtimeState.bypassSession)
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

function normalizeTimestamp(value) {
  if (value == null) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
