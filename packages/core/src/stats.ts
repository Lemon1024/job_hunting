import { getEventTypeLabel, getStatus, isInterviewStatus } from "./constants";
import { todayISO } from "./date";
import type { Application, CalendarItem, DashboardMetrics } from "./types";

export function isDue(application: Application) {
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
  const interview = applications.filter((item) => isInterviewStatus(item.status)).length;
  const offer = applications.filter((item) => item.status === "offer").length;
  const rejected = applications.filter((item) => item.status === "rejected").length;
  const active = applications.filter((item) => !getStatus(item.status).closed).length;
  const follow = applications.filter(isDue).length;

  return {
    total,
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
        items.push({
          date: application.next_action_date,
          type: "follow",
          label: "\u8ddf\u8fdb",
          title: `${application.company_name} \u00b7 ${application.position_name}`,
          applicationId: application.id
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
