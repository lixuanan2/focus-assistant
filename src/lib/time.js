export function formatDurationMmSs(totalMsOrSeconds, unit = "ms") {
  const totalSeconds = unit === "seconds"
    ? Math.max(Math.floor(totalMsOrSeconds), 0)
    : Math.max(Math.ceil(totalMsOrSeconds / 1000), 0);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}
