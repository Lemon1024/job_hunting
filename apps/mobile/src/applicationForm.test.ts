import { describe, expect, it } from "@jest/globals";
import {
  CHANNEL_OPTIONS,
  CITY_OPTIONS,
  getErrorMessage,
  normalizeChannel,
  resolveInitialCity,
} from "./applicationForm";

describe("application form options", () => {
  it("exposes the approved city and channel choices in display order", () => {
    expect(CITY_OPTIONS).toEqual([
      "北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "武汉", "苏州", "西安", "南京", "长沙",
      "天津", "郑州", "青岛", "宁波", "合肥", "厦门", "福州", "济南", "惠州", "其他", "远程",
    ]);
    expect(CHANNEL_OPTIONS).toEqual(["官网投递", "内推", "招聘APP", "邮件", "线下招聘", "其他"]);
  });

  it.each(["Boss 直聘", "Boss直聘", "猎聘", "脉脉", "实习僧", "牛客网"])(
    "maps the legacy app channel %s to 招聘APP",
    (channel) => {
      expect(normalizeChannel(channel)).toBe("招聘APP");
    },
  );

  it("preserves approved channels and maps unknown historical values to 其他", () => {
    expect(normalizeChannel("邮件")).toBe("邮件");
    expect(normalizeChannel("校园宣讲会")).toBe("其他");
    expect(normalizeChannel(null)).toBe("");
  });

  it("prefers the stored city and falls back to compatible historical location tags", () => {
    expect(resolveInitialCity({ city: "惠州", locations: [{ label: "上海" }] })).toBe("惠州");
    expect(resolveInitialCity({ city: null, locations: [{ label: "上海" }] })).toBe("上海");
    expect(resolveInitialCity({ city: null, locations: [{ label: "自定义地点" }] })).toBe("其他");
    expect(resolveInitialCity({ city: null, locations: [] })).toBe("");
  });

  it("extracts messages from Error and Supabase-style failures", () => {
    expect(getErrorMessage(new Error("网络中断"))).toBe("网络中断");
    expect(getErrorMessage({ message: "会话已失效" })).toBe("会话已失效");
    expect(getErrorMessage({ code: "UNKNOWN" })).toBe("请稍后重试");
  });
});
