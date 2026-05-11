export const GROUP_MODES = ["permanent", "manual", "schedule", "pomodoro"];

export function getGroupModeLabelKey(mode) {
  return `groupMode${capitalize(mode)}`;
}

function capitalize(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
