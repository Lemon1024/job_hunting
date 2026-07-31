import { render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { Application } from "@job-tracker/core";
import ApplicationDetailScreen from "./ApplicationDetailScreen";

jest.mock("../supabaseClient", () => ({ supabase: {} }));

const application: Application = {
  id: "application-1",
  user_id: "user-1",
  company_name: "中兴微电子",
  position_name: "数字芯片设计工程师",
  city: "深圳",
  channel: "内推",
  status: "applied",
  priority: "medium",
  applied_date: "2026-07-07",
  next_action_date: null,
  job_url: null,
  salary_range: null,
  resume_version: "芯片设计-v3",
  contact_name: null,
  contact_info: null,
  notes: null,
  created_at: "2026-07-07T00:00:00Z",
  updated_at: "2026-07-07T00:00:00Z",
  events: [],
  follow_up_tasks: [],
  locations: [{
    id: "location-1",
    user_id: "user-1",
    label: "深圳南山",
    created_at: "2026-07-07T00:00:00Z",
    updated_at: "2026-07-07T00:00:00Z",
  }],
};

describe("ApplicationDetailScreen", () => {
  it("hides the legacy location card and keeps city, channel, and resume version visible", () => {
    const screen = render(
      <ApplicationDetailScreen
        navigation={{ addListener: jest.fn(() => jest.fn()), goBack: jest.fn(), navigate: jest.fn() } as never}
        route={{ params: { applicationId: application.id, application } }}
      />,
    );

    expect(screen.queryByText("地址标签")).toBeNull();
    expect(screen.queryByText("维护")).toBeNull();
    expect(screen.getByText("深圳 / 内推")).toBeTruthy();
    expect(screen.getByText("简历版本")).toBeTruthy();
    expect(screen.getByText("芯片设计-v3")).toBeTruthy();
  });
});
