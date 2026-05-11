export function initializeFormFields(elements, t) {
  elements.blockedPageUrlInput.placeholder = t("blockedPageUrlPlaceholder");
}

export function renderFormFields(settings, elements) {
  elements.enabledInput.checked = settings.enabled;
  elements.scheduleEnabledInput.checked = settings.schedule.enabled;
  elements.pomodoroWorkMinutesInput.value = String(settings.pomodoro.workMinutes);
  elements.pomodoroBreakMinutesInput.value = String(settings.pomodoro.breakMinutes);
  elements.focusTaskInput.value = settings.recovery.focusTask;
  elements.fallbackActionInput.value = settings.recovery.fallbackAction;
  elements.bypassDefaultDurationInput.value = String(settings.bypass.defaultDurationMinutes);
  elements.allowBlockedPageBypassInput.checked = settings.bypass.allowFromBlockedPage;
  elements.blockedPageModeInput.value = settings.blockedPageMode;
  elements.blockedPageUrlInput.value = settings.blockedPageUrl;
  elements.blockedPageUrlField.hidden = settings.blockedPageMode !== "external";
}

export function syncSettingsFromForm(settings, elements) {
  settings.enabled = elements.enabledInput.checked;
  settings.schedule = {
    enabled: elements.scheduleEnabledInput.checked,
    windows: settings.schedule.windows
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
    defaultDurationMinutes: Number(elements.bypassDefaultDurationInput.value) || settings.bypass.defaultDurationMinutes,
    allowFromBlockedPage: elements.allowBlockedPageBypassInput.checked
  };
  settings.blockedPageMode = elements.blockedPageModeInput.value;
  settings.blockedPageUrl = elements.blockedPageUrlInput.value.trim();
}
