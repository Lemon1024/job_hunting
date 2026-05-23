export const APPLICATION_STATUSES = [
  { id: "todo", label: "\u5f85\u6295\u9012", closed: false },
  { id: "applied", label: "\u5df2\u6295\u9012", closed: false },
  { id: "screening", label: "\u7b80\u5386\u7b5b\u9009", closed: false },
  { id: "exam", label: "\u7b14\u8bd5", closed: false },
  { id: "interview1", label: "\u4e00\u9762", closed: false },
  { id: "interview2", label: "\u4e8c\u9762", closed: false },
  { id: "interview3", label: "\u4e09\u9762", closed: false },
  { id: "hr", label: "HR \u9762", closed: false },
  { id: "offer", label: "Offer", closed: true },
  { id: "rejected", label: "\u5df2\u62d2\u7edd", closed: true },
  { id: "silent", label: "\u65e0\u56de\u5e94", closed: true },
  { id: "closed", label: "\u5df2\u7ed3\u675f", closed: true }
] as const;

export const PRIORITIES = [
  { id: "high", label: "\u9ad8" },
  { id: "medium", label: "\u4e2d" },
  { id: "low", label: "\u4f4e" }
] as const;

export const EVENT_TYPES = [
  { id: "note", label: "\u5907\u6ce8" },
  { id: "exam", label: "\u7b14\u8bd5" },
  { id: "interview", label: "\u9762\u8bd5" },
  { id: "follow", label: "\u8ddf\u8fdb" },
  { id: "result", label: "\u7ed3\u679c" },
  { id: "status", label: "\u72b6\u6001" },
  { id: "create", label: "\u521b\u5efa" }
] as const;

export const DEFAULT_APP_TITLE = "\u79cb\u62db\u6295\u9012\u52a9\u624b";

export function getStatus(id: string) {
  return APPLICATION_STATUSES.find((status) => status.id === id) ?? APPLICATION_STATUSES[0];
}

export function getPriorityLabel(id: string) {
  return PRIORITIES.find((priority) => priority.id === id)?.label ?? "\u4e2d";
}

export function getEventTypeLabel(id: string) {
  return EVENT_TYPES.find((type) => type.id === id)?.label ?? "\u8bb0\u5f55";
}

export function isInterviewStatus(status: string) {
  return ["interview1", "interview2", "interview3", "hr"].includes(status);
}
