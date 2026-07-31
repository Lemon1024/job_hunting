import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Alert } from "react-native";
import { type Application, createApplication, createEvent, listApplications, updateApplication } from "@job-tracker/core";
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
const mockListApplications = jest.mocked(listApplications);
const mockUpdateApplication = jest.mocked(updateApplication);

const existingApplication: Application = {
  id: "application-1",
  user_id: "user-1",
  company_name: "示例公司",
  position_name: "产品经理",
  city: null,
  channel: "Boss 直聘",
  status: "applied",
  priority: "medium",
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
    mockListApplications.mockResolvedValue([]);
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

  it.each(["惠州", "其他", "远程"])("selects and saves the city list tail option %s", async (city) => {
    const screen = renderScreen({ ...existingApplication, city: null, locations: [] });

    fireEvent.press(screen.getByRole("button", { name: "选择城市" }));
    fireEvent.press(screen.getByRole("button", { name: city }));
    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockUpdateApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      expect.objectContaining({ city }),
    ));
  });

  it("prefills and saves an existing resume version without clearing hidden fields", async () => {
    const application = {
      ...existingApplication,
      resume_version: "产品经理-v2",
      job_url: "https://example.com/job",
      salary_range: "20k-30k",
      contact_name: "招聘经理",
      contact_info: "hr@example.com",
    };
    const screen = renderScreen(application);

    expect(screen.getByText("产品经理-v2")).toBeTruthy();
    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockUpdateApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      expect.objectContaining({
        resume_version: "产品经理-v2",
        job_url: "https://example.com/job",
        salary_range: "20k-30k",
        contact_name: "招聘经理",
        contact_info: "hr@example.com",
      }),
    ));
  });

  it("selects a historical resume version on a new application", async () => {
    mockListApplications.mockResolvedValue([
      { ...existingApplication, id: "history-1", resume_version: "嵌入式-校招-v3" },
    ]);
    const goBack = jest.fn();
    const screen = render(
      <AddApplicationScreen navigation={{ goBack } as never} route={{ params: undefined }} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText("输入公司名称"), "新公司");
    fireEvent.changeText(screen.getByPlaceholderText("输入岗位名称"), "新岗位");

    await waitFor(() => expect(mockListApplications).toHaveBeenCalled());
    fireEvent.press(screen.getByRole("button", { name: "选择简历版本" }));
    fireEvent.press(screen.getByRole("button", { name: "嵌入式-校招-v3" }));
    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockCreateApplication).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resume_version: "嵌入式-校招-v3" }),
    ));
  });

  it("creates a trimmed custom resume version after history loading fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockListApplications.mockRejectedValue({ message: "history unavailable" });
    const screen = renderScreen();

    fireEvent.press(screen.getByRole("button", { name: "选择简历版本" }));
    fireEvent.changeText(screen.getByPlaceholderText("输入新版本名称"), "  中兴定制版-v1  ");
    fireEvent.press(screen.getByRole("button", { name: "使用新简历版本" }));
    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockUpdateApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      expect.objectContaining({ resume_version: "中兴定制版-v1" }),
    ));
    expect(warn).toHaveBeenCalledWith("Failed to load resume versions", { message: "history unavailable" });
  });

  it("clears the resume version to null", async () => {
    const screen = renderScreen({ ...existingApplication, resume_version: "旧版本" });

    fireEvent.press(screen.getByRole("button", { name: "选择简历版本" }));
    fireEvent.press(screen.getByRole("button", { name: "未指定" }));
    fireEvent.press(screen.getByText("保存"));

    await waitFor(() => expect(mockUpdateApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      expect.objectContaining({ resume_version: null }),
    ));
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
