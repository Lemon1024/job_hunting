import type { APPLICATION_STATUSES, EVENT_TYPES, PRIORITIES } from "./constants";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["id"];
export type Priority = (typeof PRIORITIES)[number]["id"];
export type EventType = (typeof EVENT_TYPES)[number]["id"];
export type ThemePreference = "system" | "light" | "dark";

export interface Profile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  theme_preference: ThemePreference;
  in_app_reminders_enabled: boolean;
  reminder_lead_days: 0 | 1 | 3 | 7;
  created_at: string;
  updated_at: string;
}

export type ProfilePreferences = Pick<
  Profile,
  "theme_preference" | "in_app_reminders_enabled" | "reminder_lead_days"
>;

export interface LocationTag {
  id: string;
  user_id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpTask {
  id: string;
  user_id: string;
  application_id: string;
  title: string;
  notes: string | null;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  position_name: string;
  city: string | null;
  channel: string | null;
  status: ApplicationStatus;
  priority: Priority;
  applied_date: string | null;
  next_action_date: string | null;
  job_url: string | null;
  salary_range: string | null;
  resume_version: string | null;
  contact_name: string | null;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  locations?: LocationTag[];
  follow_up_tasks?: FollowUpTask[];
  events?: ApplicationEvent[];
}

export interface ApplicationEvent {
  id: string;
  user_id: string;
  application_id: string;
  type: EventType;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
}

export type ApplicationInput = Omit<
  Application,
  "id" | "user_id" | "created_at" | "updated_at" | "events" | "locations" | "follow_up_tasks"
>;

export type EventInput = Omit<ApplicationEvent, "id" | "user_id" | "created_at">;
export type FollowUpTaskInput = Omit<
  FollowUpTask,
  "id" | "user_id" | "created_at" | "updated_at" | "completed_at"
>;

export interface DashboardMetrics {
  total: number;
  todo: number;
  submitted: number;
  active: number;
  interview: number;
  offer: number;
  follow: number;
  rejected: number;
  offerRate: number;
  interviewRate: number;
}

export interface CalendarItem {
  date: string;
  type: "applied" | "follow" | "follow-task" | "timeline";
  label: string;
  title: string;
  applicationId: string;
  taskId?: string;
  completed?: boolean;
}
