export const CITY_OPTIONS = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "成都",
  "重庆",
  "武汉",
  "苏州",
  "西安",
  "南京",
  "长沙",
  "天津",
  "郑州",
  "青岛",
  "宁波",
  "合肥",
  "厦门",
  "福州",
  "济南",
  "惠州",
  "其他",
  "远程",
] as const;

export const CHANNEL_OPTIONS = ["官网投递", "内推", "招聘APP", "邮件", "线下招聘", "其他"] as const;

const LEGACY_APP_CHANNELS = new Set(["Boss 直聘", "Boss直聘", "猎聘", "脉脉", "实习僧", "牛客网"]);

export function normalizeChannel(value: string | null | undefined) {
  const channel = value?.trim();
  if (!channel) return "";
  if (LEGACY_APP_CHANNELS.has(channel)) return "招聘APP";
  if ((CHANNEL_OPTIONS as readonly string[]).includes(channel)) return channel;
  return "其他";
}

export function resolveInitialCity(application?: {
  city?: string | null;
  locations?: ReadonlyArray<{ label: string }>;
}) {
  const city = application?.city?.trim();
  if (city) return (CITY_OPTIONS as readonly string[]).includes(city) ? city : "其他";

  const locations = application?.locations ?? [];
  const matchingLocation = locations.find((location) =>
    (CITY_OPTIONS as readonly string[]).includes(location.label.trim()),
  );
  if (matchingLocation) return matchingLocation.label.trim();
  return locations.some((location) => location.label.trim()) ? "其他" : "";
}

export function collectResumeVersionOptions(
  applications: ReadonlyArray<{ resume_version?: string | null }>,
  currentVersion?: string | null,
) {
  const options: string[] = [];
  const seen = new Set<string>();

  for (const value of [
    ...applications.map((application) => application.resume_version),
    currentVersion,
  ]) {
    const version = value?.trim();
    if (!version) continue;
    const normalized = version.toLocaleLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    options.push(version);
  }

  return options;
}

export function getErrorMessage(error: unknown, fallback = "请稍后重试") {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
