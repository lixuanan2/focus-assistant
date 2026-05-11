const DAY_OPTIONS = [
  { value: 1, labelKey: "dayMon" },
  { value: 2, labelKey: "dayTue" },
  { value: 3, labelKey: "dayWed" },
  { value: 4, labelKey: "dayThu" },
  { value: 5, labelKey: "dayFri" },
  { value: 6, labelKey: "daySat" },
  { value: 0, labelKey: "daySun" }
];

export function createScheduleSection({
  elements,
  t,
  withDraftMutation,
  setFeedback
}) {
  let selectedWindowId = null;
  let currentWindows = [];

  initializeEvents();

  return {
    render
  };

  function initializeEvents() {
    elements.addScheduleWindowButton.addEventListener("click", addWindow);
    elements.scheduleBackButton.addEventListener("click", () => {
      selectedWindowId = null;
      renderView(currentWindows);
    });
  }

  function render(settings) {
    const windows = settings.schedule.windows;
    currentWindows = windows;
    const selectedWindow = windows.find((windowConfig) => windowConfig.id === selectedWindowId) ?? null;

    if (!selectedWindow) {
      selectedWindowId = null;
    }

    elements.scheduleWindowCount.textContent = t("scheduleWindowsCount", String(windows.length));
    renderView(windows, selectedWindow);
  }

  function renderView(windows, selectedWindow = null) {
    const hasSelectedWindow = Boolean(selectedWindowId && selectedWindow);

    elements.scheduleOverviewPage.hidden = hasSelectedWindow;
    elements.scheduleDetailPage.hidden = !hasSelectedWindow;
    elements.scheduleDetailCount.textContent = `${windows.length} / ${windows.length}`;

    if (hasSelectedWindow) {
      renderDetail(selectedWindow, windows);
      return;
    }

    renderOverview(windows);
  }

  function renderOverview(windows) {
    if (windows.length === 0) {
      elements.scheduleWindowList.replaceChildren(createEmptyState());
      return;
    }

    const shell = document.createElement("div");
    shell.className = "schedule-list-shell";

    const header = document.createElement("div");
    header.className = "schedule-list-header";
    header.role = "presentation";

    header.append(
      createTextCell("scheduleWindowColumn"),
      createTextCell("scheduleDaysColumn"),
      createTextCell("scheduleTimeColumn"),
      createTextCell("scheduleActionColumn")
    );

    const rows = windows.map((windowConfig, index) => createWindowRow(windowConfig, index));

    shell.append(header, ...rows);
    elements.scheduleWindowList.replaceChildren(shell);
  }

  function renderDetail(windowConfig, windows) {
    const index = windows.findIndex((item) => item.id === windowConfig.id);

    elements.selectedScheduleLabel.textContent = t("scheduleWindowTitle", String(index + 1));
    elements.selectedScheduleMeta.textContent = t("scheduleDetailMeta", formatDaysSummary(windowConfig.days));
    elements.scheduleDetailCount.textContent = `${index + 1} / ${windows.length}`;
    elements.scheduleStartInput.value = windowConfig.start;
    elements.scheduleEndInput.value = windowConfig.end;

    elements.scheduleStartInput.onchange = () => {
      updateWindow(windowConfig.id, (target) => {
        target.start = elements.scheduleStartInput.value || target.start;
      });
    };

    elements.scheduleEndInput.onchange = () => {
      updateWindow(windowConfig.id, (target) => {
        target.end = elements.scheduleEndInput.value || target.end;
      });
    };

    elements.scheduleDayList.replaceChildren(...DAY_OPTIONS.map((dayOption) => createDayChip(windowConfig, dayOption)));
  }

  function createWindowRow(windowConfig, index) {
    const row = document.createElement("div");
    row.className = "schedule-window-row";
    row.role = "button";
    row.tabIndex = 0;
    row.addEventListener("click", () => {
      selectedWindowId = windowConfig.id;
      renderView(currentWindows, windowConfig);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectedWindowId = windowConfig.id;
        renderView(currentWindows, windowConfig);
      }
    });

    const title = document.createElement("span");
    title.className = "schedule-window-title";
    title.textContent = t("scheduleWindowTitle", String(index + 1));

    const days = document.createElement("span");
    days.className = "schedule-window-days";
    days.textContent = formatDaysSummary(windowConfig.days);
    days.title = days.textContent;

    const time = document.createElement("span");
    time.className = "schedule-window-time";
    time.textContent = `${windowConfig.start} - ${windowConfig.end}`;

    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.textContent = t("removeScheduleWindowButton");
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeWindow(windowConfig.id);
    });

    row.append(title, days, time, removeButton);

    return row;
  }

  function createDayChip(windowConfig, dayOption) {
    const dayLabel = document.createElement("label");
    dayLabel.className = "schedule-day-chip";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = windowConfig.days.includes(dayOption.value);
    checkbox.addEventListener("change", () => {
      updateWindow(windowConfig.id, (target) => {
        const nextDays = checkbox.checked
          ? [...target.days, dayOption.value]
          : target.days.filter((day) => day !== dayOption.value);

        target.days = Array.from(new Set(nextDays)).sort((left, right) => left - right);
      });
    });

    const text = document.createElement("span");
    text.textContent = t(dayOption.labelKey);

    dayLabel.append(checkbox, text);

    return dayLabel;
  }

  function createEmptyState() {
    const empty = document.createElement("div");
    empty.className = "schedule-empty";
    empty.textContent = t("scheduleEmptyState");
    return empty;
  }

  function createTextCell(labelKey) {
    const span = document.createElement("span");
    span.textContent = t(labelKey);
    return span;
  }

  function addWindow() {
    const nextWindowId = `window-${Date.now()}`;
    selectedWindowId = nextWindowId;

    withDraftMutation((settings) => {
      settings.schedule.windows.push({
        id: nextWindowId,
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "12:00"
      });
    });

    setFeedback("");
  }

  function removeWindow(windowId) {
    withDraftMutation((settings) => {
      settings.schedule.windows = settings.schedule.windows.filter((windowConfig) => windowConfig.id !== windowId);
    });

    if (selectedWindowId === windowId) {
      selectedWindowId = null;
    }

    setFeedback("");
  }

  function updateWindow(windowId, mutator) {
    withDraftMutation((settings) => {
      const target = settings.schedule.windows.find((windowConfig) => windowConfig.id === windowId);

      if (target) {
        mutator(target);
      }
    });

    setFeedback("");
  }

  function formatDaysSummary(days) {
    if (!Array.isArray(days) || days.length === 0) {
      return t("scheduleNoDays");
    }

    if (isWeekdaySet(days)) {
      return t("scheduleWeekdaysSummary");
    }

    if (days.length === 7) {
      return t("scheduleEverydaySummary");
    }

    return days
      .map((day) => DAY_OPTIONS.find((option) => option.value === day))
      .filter(Boolean)
      .map((option) => t(option.labelKey))
      .join(" / ");
  }
}

function isWeekdaySet(days) {
  const weekdayDays = [1, 2, 3, 4, 5];

  return days.length === weekdayDays.length && weekdayDays.every((day) => days.includes(day));
}
