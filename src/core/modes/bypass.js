import { normalizeDomain } from "../blocking/domain.js";

export function getBypassState(runtimeState, now = new Date()) {
  const session = runtimeState.bypassSession;

  if (!session.active || !session.expiresAt || !session.domain) {
    return {
      active: false,
      domain: "",
      expiresAt: null,
      remainingMs: 0,
      reason: ""
    };
  }

  const expiresAt = new Date(session.expiresAt);
  const remainingMs = Math.max(expiresAt.getTime() - now.getTime(), 0);

  return {
    active: remainingMs > 0,
    domain: session.domain,
    expiresAt: session.expiresAt,
    remainingMs,
    reason: session.reason
  };
}

export function startBypassSession(runtimeState, { url, durationMinutes, reason }, now = new Date()) {
  const domain = normalizeDomain(url);

  if (!domain) {
    return runtimeState;
  }

  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  return {
    ...runtimeState,
    bypassSession: {
      active: true,
      domain,
      reason: typeof reason === "string" ? reason.trim().slice(0, 200) : "",
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }
  };
}

export function clearBypassSession(runtimeState) {
  return {
    ...runtimeState,
    bypassSession: {
      active: false,
      domain: "",
      reason: "",
      startedAt: null,
      expiresAt: null
    }
  };
}

export function isBypassActiveForUrl(url, runtimeState, now = new Date()) {
  const bypassState = getBypassState(runtimeState, now);

  if (!bypassState.active) {
    return false;
  }

  const hostname = extractHostname(url);

  return hostname === bypassState.domain || hostname.endsWith(`.${bypassState.domain}`);
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
