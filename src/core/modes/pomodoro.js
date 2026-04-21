export function getPomodoroState(runtimeState, now = new Date()) {
  const session = runtimeState.pomodoroSession;

  if (!session.active || !session.endsAt) {
    return {
      active: false,
      phase: "idle",
      endsAt: null,
      remainingMs: 0,
      cycle: 0
    };
  }

  const endsAt = new Date(session.endsAt);
  const remainingMs = Math.max(endsAt.getTime() - now.getTime(), 0);

  return {
    active: session.active,
    phase: session.phase,
    endsAt: session.endsAt,
    remainingMs,
    cycle: session.cycle
  };
}

export function startPomodoroSession(settings, runtimeState, now = new Date()) {
  const endsAt = new Date(now.getTime() + settings.pomodoro.workMinutes * 60 * 1000);

  return {
    ...runtimeState,
    pomodoroSession: {
      active: true,
      phase: "focus",
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      cycle: (runtimeState.pomodoroSession?.cycle ?? 0) + 1
    }
  };
}

export function stopPomodoroSession(runtimeState) {
  return {
    ...runtimeState,
    pomodoroSession: {
      active: false,
      phase: "idle",
      startedAt: null,
      endsAt: null,
      cycle: runtimeState.pomodoroSession?.cycle ?? 0
    }
  };
}

export function advancePomodoroSession(settings, runtimeState, now = new Date()) {
  const session = runtimeState.pomodoroSession;

  if (!session.active || !session.endsAt) {
    return stopPomodoroSession(runtimeState);
  }

  if (session.phase === "focus") {
    const breakEndsAt = new Date(now.getTime() + settings.pomodoro.breakMinutes * 60 * 1000);

    return {
      ...runtimeState,
      pomodoroSession: {
        ...session,
        active: true,
        phase: "break",
        startedAt: now.toISOString(),
        endsAt: breakEndsAt.toISOString()
      }
    };
  }

  return stopPomodoroSession(runtimeState);
}
