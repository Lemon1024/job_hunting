import { describe, expect, it } from "@jest/globals";
import { buildFeedbackMailto, validatePasswordChange } from "./settings";

describe("settings helpers", () => {
  it("encodes feedback context for the configured mailbox", () => {
    const link = buildFeedbackMailto({ version: "0.2.0", build: "2", platform: "android" });
    expect(link).toContain("mailto:418154155@qq.com");
    expect(link).toContain("subject=%E6%B1%82%E8%81%8C%E6%8A%95%E9%80%92%E5%8A%A9%E6%89%8B%E5%8F%8D%E9%A6%88");
    expect(decodeURIComponent(link)).toContain("版本：0.2.0 (2)");
    expect(decodeURIComponent(link)).toContain("平台：android");
  });

  it("requires matching passwords with a minimum length", () => {
    expect(validatePasswordChange("12345", "12345")).toBe("新密码至少需要 6 个字符。");
    expect(validatePasswordChange("123456", "654321")).toBe("两次输入的新密码不一致。");
    expect(validatePasswordChange("123456", "123456")).toBeNull();
  });
});
