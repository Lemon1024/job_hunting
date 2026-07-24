import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { FollowUpTask, FollowUpTaskInput } from "@job-tracker/core";
import FollowUpTaskSection from "./FollowUpTaskSection";

const task: FollowUpTask = {
  id: "task-1",
  user_id: "u1",
  application_id: "app-1",
  title: "发送感谢信",
  notes: null,
  due_date: "2026-07-26",
  completed_at: null,
  created_at: "",
  updated_at: "",
};

describe("FollowUpTaskSection", () => {
  it("creates an independent follow-up task", async () => {
    const onCreate = jest.fn<(input: FollowUpTaskInput) => void>();
    const screen = render(
      <FollowUpTaskSection
        applicationId="app-1"
        tasks={[]}
        onCreate={onCreate}
        onUpdate={jest.fn<(id: string, input: FollowUpTaskInput) => void>()}
        onToggle={jest.fn<(task: FollowUpTask, completed: boolean) => void>()}
        onDelete={jest.fn<(task: FollowUpTask) => void>()}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "新建待办" }));
    fireEvent.changeText(screen.getByPlaceholderText("待办标题"), "  联系招聘方  ");
    fireEvent.changeText(screen.getByPlaceholderText("YYYY-MM-DD"), "2026-07-30");
    fireEvent.press(screen.getByRole("button", { name: "保存待办" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      application_id: "app-1",
      title: "联系招聘方",
      notes: null,
      due_date: "2026-07-30",
    }));
  });

  it("completes and restores tasks", () => {
    const onToggle = jest.fn<(task: FollowUpTask, completed: boolean) => void>();
    const screen = render(
      <FollowUpTaskSection
        applicationId="app-1"
        tasks={[task]}
        onCreate={jest.fn<(input: FollowUpTaskInput) => void>()}
        onUpdate={jest.fn<(id: string, input: FollowUpTaskInput) => void>()}
        onToggle={onToggle}
        onDelete={jest.fn<(task: FollowUpTask) => void>()}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "完成 发送感谢信" }));
    expect(onToggle).toHaveBeenCalledWith(task, true);
  });
});
