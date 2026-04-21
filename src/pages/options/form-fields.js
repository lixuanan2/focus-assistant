export const WEEKDAY_DAYS = [1, 2, 3, 4, 5];

export function initializeFormFields(elements, t) {
  elements.blockedPageUrlInput.placeholder = t("blockedPageUrlPlaceholder");
}

export function renderFormFields(settings, elements) {
  elements.enabledInput.checked = settings.enabled;
  elements.scheduleEnabledInput.checked = settings.schedule.enabled;
  elements.scheduleMorningStartInput.value = settings.schedule.windows[0]?.start ?? "09:00";
  elements.scheduleMorningEndInput.value = settings.schedule.windows[0]?.end ?? "12:00";
  elements.scheduleAfternoonStartInput.value = settings.schedule.windows[1]?.start ?? "14:00";
  elements.scheduleAfternoonEndInput.value = settings.schedule.windows[1]?.end ?? "18:00";
  elements.pomodoroWorkMinutesInput.value = String(settings.pomodoro.workMinutes);
  elements.pomodoroBreakMinutesInput.value = String(settings.pomodoro.breakMinutes);
  elements.focusTaskInput.value = settings.recovery.focusTask;
  elements.fallbackActionInput.value = settings.recovery.fallbackAction;
  elements.bypassDefaultDurationInput.value = String(settings.bypass.defaultDurationMinutes);
  elements.blockedPageModeInput.value = settings.blockedPageMode;
  elements.blockedPageUrlInput.value = settings.blockedPageUrl;
  elements.blockedPageUrlField.hidden = settings.blockedPageMode !== "external";
}

export function syncSettingsFromForm(settings, elements) {
  settings.enabled = elements.enabledInput.checked;
  settings.schedule = {
    enabled: elements.scheduleEnabledInput.checked,
    windows: [
      {
        id: "weekday-morning",
        days: WEEKDAY_DAYS,
        start: elements.scheduleMorningStartInput.value || "09:00",
        end: elements.scheduleMorningEndInput.value || "12:00"
      },
      {
        id: "weekday-afternoon",
        days: WEEKDAY_DAYS,
        start: elements.scheduleAfternoonStartInput.value || "14:00",
        end: elements.scheduleAfternoonEndInput.value || "18:00"
      }
    ]
  };
  settings.pomodoro = {
    workMinutes: Number(elements.pomodoroWorkMinutesInput.value) || settings.pomodoro.workMinutes,
    breakMinutes: Number(elements.pomodoroBreakMinutesInput.value) || settings.pomodoro.breakMinutes
  };
  settings.recovery = {
    ...settings.recovery,
    focusTask: elements.focusTaskInput.value.trim(),
    fallbackAction: elements.fallbackActionInput.value.trim()
  };
  settings.bypass = {
    defaultDurationMinutes: Number(elements.bypassDefaultDurationInput.value) || settings.bypass.defaultDurationMinutes
  };
  settings.blockedPageMode = elements.blockedPageModeInput.value;
  settings.blockedPageUrl = elements.blockedPageUrlInput.value.trim();
}
