export const STORAGE_KEYS = {
  settings: "focusSettings",
  runtime: "focusRuntime"
};

export const DEFAULT_GROUP_ID = "default";

export const ALARM_NAMES = {
  scheduleTick: "focus-schedule-tick",
  pomodoroPhaseEnd: "focus-pomodoro-phase-end",
  bypassExpire: "focus-bypass-expire"
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  blockedPageMode: "internal",
  blockedPageUrl: "",
  groups: [
    {
      id: DEFAULT_GROUP_ID,
      name: "默认组",
      modes: {
        manual: true,
        schedule: true,
        pomodoro: true
      }
    }
  ],
  blockedSites: [
    { domain: "facebook.com", enabled: true, groupId: DEFAULT_GROUP_ID },
    { domain: "instagram.com", enabled: true, groupId: DEFAULT_GROUP_ID },
    { domain: "youtube.com", enabled: true, groupId: DEFAULT_GROUP_ID }
  ],
  schedule: {
    enabled: false,
    windows: [
      {
        id: "weekday-morning",
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "12:00"
      },
      {
        id: "weekday-afternoon",
        days: [1, 2, 3, 4, 5],
        start: "14:00",
        end: "18:00"
      }
    ]
  },
  pomodoro: {
    workMinutes: 25,
    breakMinutes: 5
  },
  bypass: {
    defaultDurationMinutes: 5
  },
  recovery: {
    focusTask: "完成当前最重要的一项任务",
    fallbackAction: "先只做 2 分钟，再决定要不要分心",
    reasonOptions: [
      "我卡住了",
      "我有点累了",
      "我只是想逃避",
      "我需要查资料"
    ]
  }
};

export const DEFAULT_RUNTIME_STATE = {
  pomodoroSession: {
    active: false,
    phase: "idle",
    startedAt: null,
    endsAt: null,
    cycle: 0
  },
  bypassSession: {
    active: false,
    domain: "",
    reason: "",
    startedAt: null,
    expiresAt: null
  }
};
