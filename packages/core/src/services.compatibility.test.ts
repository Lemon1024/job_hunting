import { describe, expect, it, vi } from "vitest";
import { getProfile, listApplications, listLocationTags } from "./services";

const legacyApplication = {
  id: "application-1",
  user_id: "user-1",
  company_name: "示例公司",
  position_name: "产品经理",
  city: "北京",
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
  events: [],
};

describe("v0.1 database compatibility", () => {
  it("falls back to the base application query when v0.2 relations are missing", async () => {
    const from = vi.fn(() => {
      let selection = "";
      const query = {
        select: vi.fn((value: string) => {
          selection = value;
          return query;
        }),
        order: vi.fn(async () => selection.includes("follow_up_tasks")
          ? {
              data: null,
              error: {
                code: "PGRST200",
                message: "Could not find a relationship between applications and follow_up_tasks",
              },
            }
          : { data: [legacyApplication], error: null }),
      };
      return query;
    });

    const applications = await listApplications({ from } as never);

    expect(applications).toEqual([
      expect.objectContaining({
        id: "application-1",
        locations: [],
        follow_up_tasks: [],
        events: [],
      }),
    ]);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("does not hide authentication or network failures behind the compatibility fallback", async () => {
    const from = vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        order: vi.fn(async () => ({
          data: null,
          error: { code: "PGRST301", message: "JWT expired" },
        })),
      };
      return query;
    });

    await expect(listApplications({ from } as never)).rejects.toMatchObject({ code: "PGRST301" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns no location tags when the v0.2 table has not been migrated yet", async () => {
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: null,
        error: { code: "PGRST205", message: "Could not find the table public.location_tags" },
      })),
    };

    await expect(listLocationTags({ from: vi.fn(() => query) } as never)).resolves.toEqual([]);
  });

  it("fills safe preference defaults for a profile created before v0.2", async () => {
    const legacyProfile = {
      id: "user-1",
      display_name: "求职者",
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      single: vi.fn(async () => ({ data: legacyProfile, error: null })),
    };
    const client = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })) },
      from: vi.fn(() => query),
    };

    await expect(getProfile(client as never)).resolves.toEqual({
      ...legacyProfile,
      avatar_path: null,
      theme_preference: "system",
      in_app_reminders_enabled: true,
      reminder_lead_days: 1,
    });
  });
});
