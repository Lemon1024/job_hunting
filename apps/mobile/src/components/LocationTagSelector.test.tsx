import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import LocationTagSelector from "./LocationTagSelector";

const tags = [
  { id: "beijing", user_id: "u1", label: "北京", created_at: "", updated_at: "" },
  { id: "remote", user_id: "u1", label: "远程", created_at: "", updated_at: "" },
];

describe("LocationTagSelector", () => {
  it("supports multi-select and exposes selected state", () => {
    const onToggle = jest.fn();
    const screen = render(
      <LocationTagSelector
        tags={tags}
        selectedIds={["beijing"]}
        onToggle={onToggle}
        onCreate={jest.fn<(label: string) => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "北京" }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole("button", { name: "远程" }));
    expect(onToggle).toHaveBeenCalledWith("remote");
  });

  it("trims a newly created personal tag", async () => {
    const onCreate = jest.fn<(label: string) => void>();
    const screen = render(
      <LocationTagSelector tags={tags} selectedIds={[]} onToggle={jest.fn()} onCreate={onCreate} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText("输入新地址标签"), "  上海  ");
    fireEvent.press(screen.getByRole("button", { name: "创建地址标签" }));
    await waitFor(() => expect(screen.getByPlaceholderText("输入新地址标签").props.value).toBe(""));
    expect(onCreate).toHaveBeenCalledWith("上海");
  });
});
