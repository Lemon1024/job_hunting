export interface FeedbackContext {
  version: string;
  build: string;
  platform: string;
}

export function buildFeedbackMailto({ version, build, platform }: FeedbackContext) {
  const subject = encodeURIComponent("求职投递助手反馈");
  const body = encodeURIComponent(
    `请在此描述问题或建议：\n\n版本：${version} (${build})\n平台：${platform}\n`,
  );
  return `mailto:418154155@qq.com?subject=${subject}&body=${body}`;
}

export function validatePasswordChange(password: string, confirmation: string) {
  if (password.length < 6) return "新密码至少需要 6 个字符。";
  if (password !== confirmation) return "两次输入的新密码不一致。";
  return null;
}
