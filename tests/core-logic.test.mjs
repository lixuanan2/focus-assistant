import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBlockedSiteEntries,
  normalizeDomain
} from "../src/core/blocking/domain.js";
import {
  clearBypassSession,
  isBypassActiveForUrl,
  startBypassSession
} from "../src/core/modes/bypass.js";
import { findNextScheduleBoundary, getScheduleState } from "../src/core/modes/schedule.js";
import { getFocusState, shouldBlockUrl } from "../src/core/modes/focus-state.js";
import { DEFAULT_GROUP_ID, DEFAULT_RUNTIME_STATE, DEFAULT_SETTINGS } from "../src/core/settings/defaults.js";
import { sanitizeSettings } from "../src/core/settings/storage.js";

test("normalizeDomain strips protocol, path, wildcard, and trailing dots", () => {
  assert.equal(normalizeDomain("https://*.YouTube.com/watch?v=1..."), "youtube.com");
  assert.equal(normalizeDomain("example.com/path"), "example.com");
  assert.equal(normalizeDomain(""), "");
});

test("normalizeBlockedSiteEntries de-duplicates and sorts domains", () => {
  const entries = normalizeBlockedSiteEntries([
    "youtube.com",
    { domain: "https://bilibili.com/feed", enabled: false, groupId: "g1" },
    "youtube.com",
    "*.douyin.com"
  ]);

  assert.deepEqual(entries, [
    { domain: "bilibili.com", enabled: false, groupId: "g1" },
    { domain: "douyin.com", enabled: true, groupId: "" },
    { domain: "youtube.com", enabled: true, groupId: "" }
  ]);
});

test("bypass session applies to matching subdomains and can be cleared", () => {
  const now = new Date("2026-05-10T10:00:00.000Z");
  const runtimeState = startBypassSession(
    DEFAULT_RUNTIME_STATE,
    {
      url: "https://youtube.com/watch?v=1",
      durationMinutes: 5,
      reason: "quick-bypass"
    },
    now
  );

  assert.equal(
    isBypassActiveForUrl("https://m.youtube.com/feed", runtimeState, new Date("2026-05-10T10:03:00.000Z")),
    true
  );
  assert.equal(
    isBypassActiveForUrl("https://bilibili.com", runtimeState, new Date("2026-05-10T10:03:00.000Z")),
    false
  );
  assert.equal(
    isBypassActiveForUrl("https://www.youtube.com", clearBypassSession(runtimeState), now),
    false
  );
});

test("focus state prioritizes permanent blocking and blocks matching URLs", () => {
  const settings = clone(DEFAULT_SETTINGS);
  settings.enabled = false;
  settings.schedule.enabled = false;
  settings.groups = [
    {
      id: DEFAULT_GROUP_ID,
      name: "默认组",
      modes: {
        permanent: true,
        manual: false,
        schedule: false,
        pomodoro: false
      }
    }
  ];
  settings.blockedSites = [
    { domain: "youtube.com", enabled: true, groupId: DEFAULT_GROUP_ID },
    { domain: "example.com", enabled: false, groupId: DEFAULT_GROUP_ID }
  ];

  const focusState = getFocusState(settings, DEFAULT_RUNTIME_STATE, new Date("2026-05-10T10:00:00.000Z"));

  assert.equal(focusState.active, true);
  assert.equal(focusState.primarySource, "permanent");
  assert.deepEqual(focusState.enabledDomains, ["youtube.com"]);
  assert.equal(
    shouldBlockUrl("https://www.youtube.com/watch?v=1", settings, DEFAULT_RUNTIME_STATE, new Date("2026-05-10T10:00:00.000Z")),
    true
  );
});

test("active bypass overrides blocking for the same domain", () => {
  const settings = clone(DEFAULT_SETTINGS);
  settings.enabled = true;
  settings.groups = [
    {
      id: DEFAULT_GROUP_ID,
      name: "默认组",
      modes: {
        permanent: false,
        manual: true,
        schedule: false,
        pomodoro: false
      }
    }
  ];
  settings.blockedSites = [{ domain: "youtube.com", enabled: true, groupId: DEFAULT_GROUP_ID }];

  const runtimeState = startBypassSession(
    DEFAULT_RUNTIME_STATE,
    {
      url: "https://youtube.com",
      durationMinutes: 5,
      reason: "quick-bypass"
    },
    new Date("2026-05-10T10:00:00.000Z")
  );

  assert.equal(
    shouldBlockUrl("https://www.youtube.com", settings, runtimeState, new Date("2026-05-10T10:01:00.000Z")),
    false
  );
});

test("schedule state supports arbitrary windows and returns the next boundary", () => {
  const settings = clone(DEFAULT_SETTINGS);
  settings.schedule = {
    enabled: true,
    windows: [
      {
        id: "lunch-focus",
        days: [1, 3, 5],
        start: "12:30",
        end: "13:45"
      },
      {
        id: "night-focus",
        days: [2, 4],
        start: "20:00",
        end: "22:00"
      }
    ]
  };

  const activeState = getScheduleState(settings, new Date(2026, 4, 11, 12, 45, 0, 0));
  assert.equal(activeState.active, true);
  assert.equal(activeState.activeWindow?.id, "lunch-focus");

  const inactiveState = getScheduleState(settings, new Date(2026, 4, 11, 10, 0, 0, 0));
  assert.equal(inactiveState.active, false);
  assert.equal(inactiveState.nextBoundaryAt, new Date(2026, 4, 11, 12, 30, 0, 0).toISOString());

  const boundary = findNextScheduleBoundary(settings.schedule.windows, new Date(2026, 4, 12, 21, 30, 0, 0));
  assert.equal(boundary, new Date(2026, 4, 12, 22, 0, 0, 0).toISOString());
});

test("schedule state supports overnight windows across midnight", () => {
  const settings = clone(DEFAULT_SETTINGS);
  settings.schedule = {
    enabled: true,
    windows: [
      {
        id: "late-night",
        days: [1, 2, 3, 4, 5],
        start: "23:00",
        end: "01:00"
      }
    ]
  };

  const activeBeforeMidnight = getScheduleState(settings, new Date(2026, 4, 11, 23, 30, 0, 0));
  assert.equal(activeBeforeMidnight.active, true);
  assert.equal(activeBeforeMidnight.activeWindow?.id, "late-night");

  const activeAfterMidnight = getScheduleState(settings, new Date(2026, 4, 12, 0, 30, 0, 0));
  assert.equal(activeAfterMidnight.active, true);
  assert.equal(activeAfterMidnight.activeWindow?.id, "late-night");

  const nextBoundary = findNextScheduleBoundary(settings.schedule.windows, new Date(2026, 4, 12, 0, 30, 0, 0));
  assert.equal(nextBoundary, new Date(2026, 4, 12, 1, 0, 0, 0).toISOString());
});

test("sanitizeSettings keeps valid custom schedule windows and allows an empty list", () => {
  const sanitized = sanitizeSettings({
    enabled: true,
    groups: [{ id: "g1", name: "G1", modes: { manual: true, schedule: true, pomodoro: false, permanent: false } }],
    blockedSites: [{ domain: "youtube.com", enabled: true, groupId: "missing" }],
    schedule: {
      enabled: true,
      windows: [
        { id: "valid", days: [1, 2, 2], start: "08:00", end: "09:30" },
        { id: "overnight", days: [5], start: "23:00", end: "01:00" },
        { id: "bad-days", days: [], start: "10:00", end: "11:00" },
        { id: "bad-time", days: [1], start: "10:00", end: "10:00" }
      ]
    }
  });

  assert.deepEqual(sanitized.schedule.windows, [
    { id: "valid", days: [1, 2], start: "08:00", end: "09:30" },
    { id: "overnight", days: [5], start: "23:00", end: "01:00" }
  ]);
  assert.equal(sanitized.blockedSites[0].groupId, DEFAULT_GROUP_ID);

  const emptyWindows = sanitizeSettings({
    ...clone(DEFAULT_SETTINGS),
    schedule: {
      enabled: true,
      windows: []
    }
  });

  assert.deepEqual(emptyWindows.schedule.windows, []);
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
