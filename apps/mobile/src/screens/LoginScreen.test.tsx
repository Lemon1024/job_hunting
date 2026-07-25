import { render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import LoginScreen from "./LoginScreen";

jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

describe("LoginScreen", () => {
  it("keeps the form scrollable and accessible on compact screens", () => {
    const screen = render(<LoginScreen />);

    expect(screen.getByTestId("login-scroll-view")).toBeTruthy();
    expect(screen.getByTestId("login-keyboard-avoiding-view")).toBeTruthy();
    expect(screen.getByLabelText("邮箱")).toBeTruthy();
    expect(screen.getByLabelText("密码")).toBeTruthy();
    expect(screen.getByRole("button", { name: "显示密码" })).toBeTruthy();
  });

  it("does not present controls that have no implemented behavior", () => {
    const screen = render(<LoginScreen />);

    expect(screen.queryByText("记住我")).toBeNull();
    expect(screen.queryByText("忘记密码")).toBeNull();
  });
});
