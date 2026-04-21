import { DEFAULT_GROUP_ID } from "../settings/defaults.js";

export function getGroupMap(groups) {
  return new Map(groups.map((group) => [group.id, group]));
}

export function getDefaultGroup(groups) {
  return groups.find((group) => group.id === DEFAULT_GROUP_ID) ?? groups[0] ?? null;
}

export function isGroupModeEnabled(group, source) {
  if (!group?.modes) {
    return false;
  }

  return Boolean(group.modes[source]);
}
