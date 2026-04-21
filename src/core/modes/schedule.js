export function getScheduleState(settings, now = new Date()) {
  if (!settings.schedule.enabled) {
    return {
      enabled: false,
      active: false,
      activeWindow: null,
      nextBoundaryAt: null
    };
  }

  const activeWindow = settings.schedule.windows.find((windowConfig) =>
    isInsideScheduleWindow(windowConfig, now)
  ) ?? null;

  return {
    enabled: true,
    active: Boolean(activeWindow),
    activeWindow,
    nextBoundaryAt: findNextScheduleBoundary(settings.schedule.windows, now)
  };
}

export function findNextScheduleBoundary(windows, now = new Date()) {
  const candidates = [];

  for (let offset = 0; offset < 8; offset += 1) {
    const dayDate = new Date(now);
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(now.getDate() + offset);

    for (const windowConfig of windows) {
      const dayOfWeek = dayDate.getDay();

      if (!windowConfig.days.includes(dayOfWeek)) {
        continue;
      }

      const startDate = buildDateWithClock(dayDate, windowConfig.start);
      const endDate = buildDateWithClock(dayDate, windowConfig.end);

      if (startDate > now) {
        candidates.push(startDate);
      }

      if (endDate > now) {
        candidates.push(endDate);
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => left.getTime() - right.getTime());

  return candidates[0].toISOString();
}

function isInsideScheduleWindow(windowConfig, now) {
  const dayOfWeek = now.getDay();

  if (!windowConfig.days.includes(dayOfWeek)) {
    return false;
  }

  const startDate = buildDateWithClock(now, windowConfig.start);
  const endDate = buildDateWithClock(now, windowConfig.end);

  return now >= startDate && now < endDate;
}

function buildDateWithClock(baseDate, clock) {
  const [hours, minutes] = clock.split(":").map(Number);
  const date = new Date(baseDate);

  date.setHours(hours, minutes, 0, 0);

  return date;
}
