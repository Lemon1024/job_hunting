import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import StatsBar from "./StatsBar";

const metrics = {
  total: 8,
  todo: 2,
  submitted: 6,
  active: 5,
  interview: 3,
  offer: 1,
  follow: 2,
  rejected: 1,
  offerRate: 13,
  interviewRate: 38,
};

describe("StatsBar", () => {
  it("renders workbench filters in the approved order", () => {
    const screen = render(<StatsBar metrics={metrics} activeKey="submitted" onPress={jest.fn()} />);

    const labels = screen.getAllByTestId("stat-label").map((node) => node.props.children);
    expect(labels).toEqual(["待投递", "总投递", "面试中", "Offer"]);
  });

  it("uses the metric key when a card is pressed and exposes selected state", () => {
    const onPress = jest.fn();
    const screen = render(<StatsBar metrics={metrics} activeKey="submitted" onPress={onPress} />);

    fireEvent.press(screen.getByRole("button", { name: "待投递 2" }));

    expect(onPress).toHaveBeenCalledWith("todo");
    expect(screen.getByRole("button", { name: "总投递 6" }).props.accessibilityState)
      .toEqual(expect.objectContaining({ selected: true }));
  });
});
