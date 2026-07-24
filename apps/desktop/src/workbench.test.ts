import { describe, expect, it } from "vitest";
import { countLocationUsage, getNextPendingTaskDate } from "./workbench";
import type { Application } from "@job-tracker/core";

const application = {
  id: "app-1",
  locations: [{ id: "beijing" }, { id: "remote" }],
  follow_up_tasks: [
    { due_date: "2026-07-30", completed_at: null },
    { due_date: "2026-07-26", completed_at: "2026-07-25T00:00:00Z" },
    { due_date: "2026-07-28", completed_at: null },
  ],
} as Application;

describe("desktop workbench helpers", () => {
  it("counts each application once per location tag", () => {
    expect(countLocationUsage([application, { ...application, id: "app-2", locations: [{ id: "beijing" }] } as Application]))
      .toEqual({ beijing: 2, remote: 1 });
  });

  it("sorts by the next incomplete task and ignores completed tasks", () => {
    expect(getNextPendingTaskDate(application)).toBe("2026-07-28");
  });
});
