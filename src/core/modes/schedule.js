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

  for (let offset = -1; offset < 8; offset += 1) {
    const dayDate = getDayStart(now);
    dayDate.setDate(dayDate.getDate() + offset);

    for (const windowConfig of windows) {
      const occurrence = buildWindowOccurrence(windowConfig, dayDate);

      if (!occurrence) {
        continue;
      }

      if (occurrence.startDate > now) {
        candidates.push(occurrence.startDate);
      }

      if (occurrence.endDate > now) {
        candidates.push(occurrence.endDate);
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
  const todayOccurrence = buildWindowOccurrence(windowConfig, getDayStart(now));
  const previousDay = getDayStart(now);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayOccurrence = buildWindowOccurrence(windowConfig, previousDay);

  return [todayOccurrence, previousDayOccurrence].some((occurrence) =>
    occurrence ? now >= occurrence.startDate && now < occurrence.endDate : false
  );
}

function buildWindowOccurrence(windowConfig, startDayDate) {
  if (!windowConfig.days.includes(startDayDate.getDay())) {
    return null;
  }

  const startDate = buildDateWithClock(startDayDate, windowConfig.start);
  const endDate = buildDateWithClock(startDayDate, windowConfig.end);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return { startDate, endDate };
}

function buildDateWithClock(baseDate, clock) {
  const [hours, minutes] = clock.split(":").map(Number);
  const date = new Date(baseDate);

  date.setHours(hours, minutes, 0, 0);

  return date;
}

function getDayStart(baseDate) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  return date;
}
