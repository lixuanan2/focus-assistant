import { isBlockedUrl } from "../blocking/domain.js";
import { getGroupMap, isGroupModeEnabled } from "../grouping/groups.js";
import { getBypassState, isBypassActiveForUrl } from "./bypass.js";
import { getPomodoroState } from "./pomodoro.js";
import { getScheduleState } from "./schedule.js";

export function getFocusState(settings, runtimeState, now = new Date()) {
  const scheduleState = getScheduleState(settings, now);
  const pomodoroState = getPomodoroState(runtimeState, now);
  const bypassState = getBypassState(runtimeState, now);
  const activeSources = [];

  if (pomodoroState.active && pomodoroState.phase === "focus") {
    activeSources.push("pomodoro");
  }

  if (scheduleState.active) {
    activeSources.push("schedule");
  }

  if (settings.enabled) {
    activeSources.push("manual");
  }

  return {
    active: activeSources.length > 0,
    activeSources,
    primarySource: activeSources[0] ?? "none",
    enabledDomains: getEnabledDomainsForSources(settings, activeSources),
    scheduleState,
    pomodoroState,
    bypassState
  };
}

export function shouldBlockUrl(url, settings, runtimeState, now = new Date()) {
  const focusState = getFocusState(settings, runtimeState, now);

  if (!focusState.active || focusState.enabledDomains.length === 0) {
    return false;
  }

  if (isBypassActiveForUrl(url, runtimeState, now)) {
    return false;
  }

  return isBlockedUrl(url, focusState.enabledDomains);
}

function getEnabledDomainsForSources(settings, activeSources) {
  if (activeSources.length === 0) {
    return [];
  }

  const groupMap = getGroupMap(settings.groups);

  return settings.blockedSites
    .filter((site) => site.enabled)
    .filter((site) => {
      const group = groupMap.get(site.groupId) ?? groupMap.values().next().value;

      return activeSources.some((source) => isGroupModeEnabled(group, source));
    })
    .map((site) => site.domain);
}
