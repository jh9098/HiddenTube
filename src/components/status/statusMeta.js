export const STATUS_TOKENS = ["pending", "ready", "running", "done", "error"];

const STATUS_META = {
  pending: {
    token: "pending",
    label: "입력 대기",
    shortLabel: "대기",
    icon: "⏳",
    className: "status-pending",
  },
  ready: {
    token: "ready",
    label: "실행 준비",
    shortLabel: "준비",
    icon: "🟢",
    className: "status-ready",
  },
  running: {
    token: "running",
    label: "실행 중",
    shortLabel: "실행",
    icon: "🔄",
    className: "status-running",
  },
  done: {
    token: "done",
    label: "완료",
    shortLabel: "완료",
    icon: "✅",
    className: "status-done",
  },
  error: {
    token: "error",
    label: "오류",
    shortLabel: "오류",
    icon: "❌",
    className: "status-error",
  },
};

export function normalizeStatusToken(status) {
  if (status === "idle") return "pending";
  return STATUS_TOKENS.includes(status) ? status : "pending";
}

export function getStatusMeta(status) {
  const token = normalizeStatusToken(status);
  return STATUS_META[token];
}
