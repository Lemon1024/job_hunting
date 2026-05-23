import type { APPLICATION_STATUSES, EVENT_TYPES, PRIORITIES } from "./constants";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["id"];
export type Priority = (typeof PRIORITIES)[number]["id"];
export type EventType = (typeof EVENT_TYPES)[number]["id"];

export interface Profile {
  id: string;
  display_name: string;
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
  "id" | "user_id" | "created_at" | "updated_at" | "events"
>;

export type EventInput = Omit<ApplicationEvent, "id" | "user_id" | "created_at">;

export interface DashboardMetrics {
  total: number;
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
  type: "applied" | "follow" | "timeline";
  label: string;
  title: string;
  applicationId: string;
}
