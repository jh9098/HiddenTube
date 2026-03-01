export const HISTORY_LIMIT = 100;

export function createHistoryState(initialPresent) {
  return {
    past: [],
    present: initialPresent,
    future: [],
  };
}

export function pushHistorySnapshot(history, nextPresent, options = {}) {
  const { limit = HISTORY_LIMIT } = options;
  const previousPresent = history.present;

  if (previousPresent === nextPresent) {
    return history;
  }

  const nextPast = [...history.past, previousPresent];
  if (nextPast.length > limit) {
    nextPast.splice(0, nextPast.length - limit);
  }

  return {
    past: nextPast,
    present: nextPresent,
    future: [],
  };
}

export function replacePresent(history, nextPresent) {
  if (history.present === nextPresent) {
    return history;
  }

  return {
    ...history,
    present: nextPresent,
  };
}

export function undoHistory(history) {
  if (!history.past.length) {
    return history;
  }

  const previousPresent = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);

  return {
    past: nextPast,
    present: previousPresent,
    future: [history.present, ...history.future],
  };
}

export function redoHistory(history) {
  if (!history.future.length) {
    return history;
  }

  const [nextPresent, ...nextFuture] = history.future;

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: nextFuture,
  };
}
