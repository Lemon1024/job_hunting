import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUSES,
  buildCalendarItems,
  calculateMetrics,
  getReminderTasks,
  isFollowUpTaskDue,
  isInterviewStatus,
  matchesLocationFilter,
  type Application,
  type FollowUpTask,
} from "./index";

function application(overrides: Partial<Application>): Application {
  return {
    id: "application-1",
    user_id: "user-1",
    company_name: "示例公司",
    position_name: "产品经理",
    city: null,
    channel: null,
    status: "applied",
    priority: "medium",
    applied_date: "2026-07-01",
    next_action_date: null,
    job_url: null,
    salary_range: null,
    resume_version: null,
    contact_name: null,
    contact_info: null,
    notes: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    locations: [],
    follow_up_tasks: [],
    events: [],
    ...overrides,
  };
}

function task(overrides: Partial<FollowUpTask>): FollowUpTask {
  return {
    id: "task-1",
    user_id: "user-1",
    application_id: "application-1",
    title: "联系 HR",
    notes: null,
    due_date: "2026-07-25",
    completed_at: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("workbench status and metrics", () => {
  it("places manager interview between interview3 and hr", () => {
    const ids = APPLICATION_STATUSES.map((status) => status.id);

    expect(ids.indexOf("manager")).toBe(ids.indexOf("interview3") + 1);
    expect(ids.indexOf("hr")).toBe(ids.indexOf("manager") + 1);
    expect(isInterviewStatus("manager")).toBe(true);
  });

  it("separates todo records from submitted applications", () => {
    const metrics = calculateMetrics([
      application({ id: "todo", status: "todo", applied_date: null }),
      application({ id: "applied", status: "applied" }),
      application({ id: "manager", status: "manager" as Application["status"] }),
      application({ id: "offer", status: "offer" }),
    ]);

    expect(metrics.total).toBe(4);
    expect(metrics.todo).toBe(1);
    expect(metrics.submitted).toBe(3);
    expect(metrics.interview).toBe(1);
    expect(metrics.offer).toBe(1);
  });
});

describe("location filtering", () => {
  const beijing = { id: "beijing", user_id: "user-1", label: "北京", created_at: "", updated_at: "" };
  const shanghai = { id: "shanghai", user_id: "user-1", label: "上海", created_at: "", updated_at: "" };

  it("matches when any selected location belongs to the application", () => {
    const item = application({ locations: [beijing, shanghai] });

    expect(matchesLocationFilter(item, ["shenzhen", "shanghai"])).toBe(true);
    expect(matchesLocationFilter(item, ["shenzhen"])).toBe(false);
    expect(matchesLocationFilter(item, [])).toBe(true);
  });
});

describe("follow-up tasks", () => {
  it("treats only incomplete tasks due today or earlier as due", () => {
    expect(isFollowUpTaskDue(task({ due_date: "2026-07-25" }), "2026-07-25")).toBe(true);
    expect(isFollowUpTaskDue(task({ due_date: "2026-07-26" }), "2026-07-25")).toBe(false);
    expect(isFollowUpTaskDue(task({ completed_at: "2026-07-24T10:00:00Z" }), "2026-07-25")).toBe(false);
  });

  it("returns overdue and upcoming tasks inside the reminder window", () => {
    const reminders = getReminderTasks([
      task({ id: "overdue", due_date: "2026-07-20" }),
      task({ id: "today", due_date: "2026-07-25" }),
      task({ id: "tomorrow", due_date: "2026-07-26" }),
      task({ id: "later", due_date: "2026-07-28" }),
      task({ id: "done", due_date: "2026-07-24", completed_at: "2026-07-24T10:00:00Z" }),
    ], "2026-07-25", 1);

    expect(reminders.map((item) => item.id)).toEqual(["overdue", "today", "tomorrow"]);
  });

  it("adds follow-up tasks to calendar items with edit metadata", () => {
    const items = buildCalendarItems([
      application({
        applied_date: null,
        follow_up_tasks: [task({ id: "calendar-task", due_date: "2026-07-30" })],
      }),
    ]);

    expect(items).toContainEqual(expect.objectContaining({
      date: "2026-07-30",
      type: "follow-task",
      taskId: "calendar-task",
      completed: false,
    }));
  });
});
