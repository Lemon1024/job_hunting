import type { Application } from "@job-tracker/core";

export function countLocationUsage(applications: Application[]) {
  return applications.reduce<Record<string, number>>((counts, application) => {
    const uniqueIds = new Set((application.locations ?? []).map((location) => location.id));
    uniqueIds.forEach((id) => { counts[id] = (counts[id] ?? 0) + 1; });
    return counts;
  }, {});
}

export function getNextPendingTaskDate(application: Application) {
  return (application.follow_up_tasks ?? [])
    .filter((task) => task.completed_at === null)
    .map((task) => task.due_date)
    .sort()[0] ?? null;
}
