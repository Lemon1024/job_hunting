import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { CITY_OPTIONS } from "../applicationForm";
import FilterSheet from "./FilterSheet";

describe("FilterSheet city filters", () => {
  it("always renders the approved city choices and toggles multiple cities", () => {
    const onApply = jest.fn();
    const screen = render(
      <FilterSheet
        visible
        onClose={jest.fn()}
        filters={{ status: null, priority: null, cities: [], channel: null }}
        onApply={onApply}
        cities={[...CITY_OPTIONS]}
        channels={[]}
      />,
    );

    expect(screen.getByText("地址")).toBeTruthy();
    expect(screen.getByText("惠州")).toBeTruthy();
    expect(screen.queryByText("郑州")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "筛选城市 惠州" }));
    expect(onApply).toHaveBeenCalledWith({ status: null, priority: null, cities: ["惠州"], channel: null });
  });

  it("clears selected cities when filters are reset", () => {
    const onApply = jest.fn();
    const screen = render(
      <FilterSheet
        visible
        onClose={jest.fn()}
        filters={{ status: null, priority: null, cities: ["惠州", "深圳"], channel: null }}
        onApply={onApply}
        cities={[...CITY_OPTIONS]}
        channels={[]}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "重置筛选" }));
    expect(onApply).toHaveBeenCalledWith({ status: null, priority: null, cities: [], channel: null });
  });
});
