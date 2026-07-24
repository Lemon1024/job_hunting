import { getEventTypeLabel, getStatus, isInterviewStatus } from "./constants";
import { todayISO } from "./date";
import type { Application, CalendarItem, DashboardMetrics, FollowUpTask } from "./types";

function addDaysISO(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isFollowUpTaskDue(task: FollowUpTask, today = todayISO()) {
  return !task.completed_at && task.due_date <= today;
}

export function getReminderTasks(
  tasks: FollowUpTask[],
  today = todayISO(),
  leadDays = 0,
) {
  const lastDate = addDaysISO(today, Math.max(0, leadDays));
  return tasks
    .filter((task) => !task.completed_at && task.due_date <= lastDate)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function matchesLocationFilter(application: Application, selectedTagIds: string[]) {
  if (selectedTagIds.length === 0) return true;
  const selected = new Set(selectedTagIds);
  return (application.locations ?? []).some((location) => selected.has(location.id));
}

export function isDue(application: Application) {
  if ((application.follow_up_tasks?.length ?? 0) > 0) {
    return application.follow_up_tasks!.some((task) => isFollowUpTaskDue(task));
  }
  return Boolean(
    application.next_action_date &&
      application.next_action_date <= todayISO() &&
      !getStatus(application.status).closed
  );
}

export function isNotApplied(application: Application) {
  return application.status === "todo";
}

export function calculateMetrics(applications: Application[]): DashboardMetrics {
  const total = applications.length;
  const todo = applications.filter((item) => item.status === "todo").length;
  const submitted = total - todo;
  const interview = applications.filter((item) => isInterviewStatus(item.status)).length;
  const offer = applications.filter((item) => item.status === "offer").length;
  const rejected = applications.filter((item) => item.status === "rejected").length;
  const active = applications.filter((item) => !getStatus(item.status).closed).length;
  const follow = applications.filter(isDue).length;

  return {
    total,
    todo,
    submitted,
    active,
    interview,
    offer,
    follow,
    rejected,
    offerRate: total ? Math.round((offer / total) * 100) : 0,
    interviewRate: total ? Math.round((interview / total) * 100) : 0
  };
}

export function buildCalendarItems(applications: Application[]): CalendarItem[] {
  return applications
    .flatMap((application) => {
      const items: CalendarItem[] = [];
      if (application.applied_date && !isNotApplied(application)) {
        items.push({
          date: application.applied_date,
          type: "applied",
          label: "\u6295\u9012",
          title: `${application.company_name} \u00b7 ${application.position_name}`,
          applicationId: application.id
        });
      }
      if (application.next_action_date && !getStatus(application.status).closed) {
        if ((application.follow_up_tasks?.length ?? 0) === 0) {
        items.push({
          date: application.next_action_date,
          type: "follow",
          label: "\u8ddf\u8fdb",
          title: `${application.company_name} \u00b7 ${application.position_name}`,
          applicationId: application.id
        });
        }
      }
      for (const task of application.follow_up_tasks ?? []) {
        items.push({
          date: task.due_date,
          type: "follow-task",
          label: task.completed_at ? "\u5df2\u5b8c\u6210" : "\u5f85\u529e",
          title: `${application.company_name} \u00b7 ${task.title}`,
          applicationId: application.id,
          taskId: task.id,
          completed: Boolean(task.completed_at)
        });
      }
      for (const event of application.events ?? []) {
        items.push({
          date: event.event_date,
          type: "timeline",
          label: getEventTypeLabel(event.type),
          title: `${application.company_name} \u00b7 ${event.title}`,
          applicationId: application.id
        });
      }
      return items;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
