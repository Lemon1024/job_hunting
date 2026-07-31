import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Alert } from "react-native";
import { type Application, createApplication, createEvent, updateApplication } from "@job-tracker/core";
import AddApplicationScreen from "./AddApplicationScreen";

jest.mock("@react-native-community/datetimepicker", () => () => null);

jest.mock("../supabaseClient", () => ({ supabase: {} }));

jest.mock("@job-tracker/core", () => ({
  APPLICATION_STATUSES: [
    { id: "todo", label: "待投递" },
    { id: "applied", label: "已投递" },
  ],
  createApplication: jest.fn(),
  createEvent: jest.fn(),
  createLocationTag: jest.fn(),
  deleteLocationTag: jest.fn(),
  getStatus: (status: string) => ({ id: status, label: status === "todo" ? "待投递" : "已投递" }),
  listApplications: jest.fn(async () => []),
  listLocationTags: jest.fn(async () => []),
  renameLocationTag: jest.fn(),
  todayISO: () => "2026-07-31",
  updateApplication: jest.fn(),
}));

const mockCreateApplication = jest.mocked(createApplication);
const mockCreateEvent = jest.mocked(createEvent);
const mockUpdateApplication = jest.mocked(updateApplication);

const existingApplication = {
  id: "application-1",
  user_id: "user-1",
  company_name: "示例公司",
  position_name: "产品经理",
  city: null,
  channel: "Boss 直聘",
  status: "applied" as const,
  priority: "medium" as const,
  applied_date: "2026-07-20",
  next_action_date: "2026-08-01",
  job_url: null,
  salary_range: null,
  resume_version: null,
  contact_name: null,
  contact_info: null,
  notes: null,
  created_at: "2026-07-20T00:00:00Z",
  updated_at: "2026-07-20T00:00:00Z",
  locations: [{
    id: "location-1",
    user_id: "user-1",
    label: "惠州",
    created_at: "2026-07-20T00:00:00Z",
    updated_at: "2026-07-20T00:00:00Z",
  }],
};

function renderScreen(application = existingApplication) {
  const goBack = jest.fn();
  const screen = render(
    <AddApplicationScreen
      navigation={{ goBack } as never}
      route={{ params: { application, mode: "edit" } }}
    />,
  );
  return { ...screen, goBack };
}

describe("AddApplicationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockCreateApplication.mockResolvedValue({ ...existingApplication, id: "new-application", locations: [] });
    mockCreateEvent.mockResolvedValue({ id: "event-1" });
    mockUpdateApplication.mockResolvedValue(existingApplication);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("edits with a single compatible city and normalized channel without touching location links", async () => {
    const screen = renderScreen();

    expect(screen.queryByText("地址标签")).toBeNull();
    expect(screen.getByText("惠州")).toBeTruthy();
    expect(screen.getByText("招聘APP")).toBeTruthy();

    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockUpdateApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      expect.objectContaining({ city: "惠州", channel: "招聘APP", next_action_date: "2026-08-01" }),
    ));
    expect(screen.goBack).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalledWith("保存失败", expect.anything());
  });

  it("shows the approved long city list in a scrollable picker", () => {
    const screen = renderScreen({ ...existingApplication, city: null, locations: [] });

    fireEvent.press(screen.getByRole("button", { name: "选择城市" }));

    expect(screen.getByText("惠州")).toBeTruthy();
    expect(screen.getByText("其他")).toBeTruthy();
    expect(screen.getByText("远程")).toBeTruthy();
    expect(screen.getByTestId("picker-options-scroll-view")).toBeTruthy();
  });

  it("creates an application with the selected city", async () => {
    const goBack = jest.fn();
    const screen = render(
      <AddApplicationScreen navigation={{ goBack } as never} route={{ params: undefined }} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText("输入公司名称"), "新公司");
    fireEvent.changeText(screen.getByPlaceholderText("输入岗位名称"), "新岗位");
    fireEvent.press(screen.getByRole("button", { name: "选择城市" }));
    fireEvent.press(screen.getByRole("button", { name: "惠州" }));

    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockCreateApplication).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ city: "惠州" }),
    ));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("does not report a failed save when the non-blocking create event fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockCreateEvent.mockRejectedValue({ message: "event insert failed" });
    const goBack = jest.fn();
    const screen = render(
      <AddApplicationScreen navigation={{ goBack } as never} route={{ params: undefined }} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText("输入公司名称"), "新公司");
    fireEvent.changeText(screen.getByPlaceholderText("输入岗位名称"), "新岗位");

    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
    expect(Alert.alert).not.toHaveBeenCalledWith("保存失败", expect.anything());
    expect(warn).toHaveBeenCalledWith("Failed to create application event", { message: "event insert failed" });
  });

  it("reports the real primary write error and stays on the form", async () => {
    mockUpdateApplication.mockRejectedValue({ message: "会话已失效" });
    const screen = renderScreen();

    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("保存失败", "会话已失效"));
    expect(screen.goBack).not.toHaveBeenCalled();
  });

  it("ignores repeated save presses while the primary write is in flight", async () => {
    let resolveUpdate: ((value: Application) => void) | undefined;
    mockUpdateApplication.mockImplementation(() => new Promise<Application>((resolve) => { resolveUpdate = resolve; }));
    const screen = renderScreen();

    fireEvent.press(screen.getByText("保存"));
    fireEvent.press(screen.getByText("保存中..."));

    expect(mockUpdateApplication).toHaveBeenCalledTimes(1);
    await act(async () => resolveUpdate?.(existingApplication));
    await waitFor(() => expect(screen.goBack).toHaveBeenCalledTimes(1));
  });
});
