import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import {
  getProfile,
  updateProfile,
  type Profile,
  type ProfilePreferences,
  type ThemePreference,
} from "@job-tracker/core";
import { colors, fonts, radius, spacing, useAppTheme } from "../theme";
import { buildFeedbackMailto, validatePasswordChange } from "../settings";
import { supabase } from "../supabaseClient";

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: "system", label: "跟随系统" },
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
];
const LEAD_DAY_OPTIONS: Profile["reminder_lead_days"][] = [0, 1, 3, 7];

export default function ProfileScreen() {
  const { preference, setPreference } = useAppTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [infoModal, setInfoModal] = useState<"about" | "help" | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: authData, error: authError }, loadedProfile] = await Promise.all([
        supabase.auth.getUser(),
        getProfile(supabase as never),
      ]);
      if (authError) throw authError;
      setEmail(authData.user?.email ?? null);
      setProfile(loadedProfile);
      setDisplayName(loadedProfile.display_name);
      setPreference(loadedProfile.theme_preference);
      if (loadedProfile.avatar_path) {
        const { data, error } = await supabase.storage.from("avatars").createSignedUrl(loadedProfile.avatar_path, 3600);
        if (error) throw error;
        setAvatarUrl(data.signedUrl);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      Alert.alert("设置加载失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }, [setPreference]);

  useEffect(() => { void load(); }, [load]);

  async function saveDisplayName() {
    if (!displayName.trim()) {
      Alert.alert("昵称不能为空");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(supabase as never, { display_name: displayName });
      setProfile(updated);
      setDisplayName(updated.display_name);
      Alert.alert("已保存", "昵称已同步到所有设备。");
    } catch (error) {
      Alert.alert("保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function chooseAvatar() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        Alert.alert("不支持的图片", "请选择 JPEG、PNG 或 WebP 图片。");
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("图片过大", "头像不能超过 5 MB。");
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("登录状态已失效，请重新登录。");
      setSaving(true);
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const path = `${authData.user.id}/${Date.now()}.${extension}`;
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const previousPath = profile?.avatar_path;
      try {
        const updated = await updateProfile(supabase as never, { avatar_path: path });
        setProfile(updated);
        const { data: signed, error: signedError } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
        if (signedError) throw signedError;
        setAvatarUrl(signed.signedUrl);
        if (previousPath) await supabase.storage.from("avatars").remove([previousPath]);
      } catch (error) {
        await supabase.storage.from("avatars").remove([path]);
        throw error;
      }
    } catch (error) {
      Alert.alert("头像更新失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    const validationError = validatePasswordChange(newPassword, passwordConfirmation);
    if (validationError) {
      Alert.alert("无法修改密码", validationError);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setPasswordConfirmation("");
      Alert.alert("密码已更新", "下次登录请使用新密码。");
    } catch (error) {
      Alert.alert("密码更新失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences(patch: Partial<ProfilePreferences>) {
    if (!profile) return;
    const previous = profile;
    const optimistic = { ...profile, ...patch };
    setProfile(optimistic);
    if (patch.theme_preference) setPreference(patch.theme_preference);
    try {
      const updated = await updateProfile(supabase as never, patch);
      setProfile(updated);
    } catch (error) {
      setProfile(previous);
      setPreference(previous.theme_preference);
      Alert.alert("偏好保存失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }

  const version = Constants.expoConfig?.version ?? "0.2.0";
  const build = Constants.nativeBuildVersion ?? (Platform.OS === "android" ? String(Constants.expoConfig?.android?.versionCode ?? "dev") : "dev");

  async function sendFeedback() {
    const url = buildFeedbackMailto({ version, build, platform: Platform.OS });
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("无法打开邮件应用", "请手动发送邮件到 418154155@qq.com。", [{ text: "知道了" }]);
    }
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
        <Text style={styles.headerSubtitle}>账号与应用设置</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="更换头像" style={styles.avatar} onPress={() => void chooseAvatar()}>
              {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Ionicons name="person" size={34} color={colors.primary} />}
              <View style={styles.avatarBadge}><Ionicons name="camera" size={13} color={colors.headerText} /></View>
            </TouchableOpacity>
            <View style={styles.profileIdentity}>
              <Text style={styles.loggedInLabel}>{email ? "已登录" : "登录状态异常"}</Text>
              <Text style={styles.email}>{email ?? "未获取到邮箱"}</Text>
            </View>
          </View>
          <SettingLabel>昵称</SettingLabel>
          <View style={styles.inlineEditor}>
            <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="输入昵称" placeholderTextColor={colors.muted} maxLength={50} />
            <TouchableOpacity style={styles.compactButton} disabled={saving} onPress={() => void saveDisplayName()}>
              <Text style={styles.compactButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>邮箱为只读账号标识，当前版本不支持修改。</Text>
        </View>

        <View style={styles.card}>
          <SectionTitle icon="key-outline">修改密码</SectionTitle>
          <TextInput style={styles.inputFull} value={newPassword} onChangeText={setNewPassword} placeholder="输入新密码" placeholderTextColor={colors.muted} secureTextEntry />
          <TextInput style={styles.inputFull} value={passwordConfirmation} onChangeText={setPasswordConfirmation} placeholder="再次输入新密码" placeholderTextColor={colors.muted} secureTextEntry />
          <TouchableOpacity style={styles.secondaryButton} disabled={saving} onPress={() => void changePassword()}>
            <Text style={styles.secondaryButtonText}>更新密码</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <SectionTitle icon="contrast-outline">主题</SectionTitle>
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: preference === option.id }}
                style={[styles.option, preference === option.id && styles.optionActive]}
                onPress={() => void savePreferences({ theme_preference: option.id })}
              >
                <Text style={[styles.optionText, preference === option.id && styles.optionTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingSwitchRow}>
            <View style={styles.switchCopy}>
              <SectionTitle icon="notifications-outline">应用内提醒</SectionTitle>
              <Text style={styles.hint}>仅在应用内显示即将到期和已逾期待办，不申请系统通知权限。</Text>
            </View>
            <Switch
              value={profile?.in_app_reminders_enabled ?? true}
              onValueChange={(enabled) => void savePreferences({ in_app_reminders_enabled: enabled })}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <SettingLabel>提前提醒</SettingLabel>
          <View style={styles.optionRow}>
            {LEAD_DAY_OPTIONS.map((days) => (
              <TouchableOpacity
                key={days}
                disabled={!profile?.in_app_reminders_enabled}
                style={[
                  styles.leadOption,
                  profile?.reminder_lead_days === days && styles.optionActive,
                  !profile?.in_app_reminders_enabled && styles.disabled,
                ]}
                onPress={() => void savePreferences({ reminder_lead_days: days })}
              >
                <Text style={[styles.optionText, profile?.reminder_lead_days === days && styles.optionTextActive]}>{days === 0 ? "当天" : `${days} 天`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <MenuItem icon="information-circle-outline" label="关于" onPress={() => setInfoModal("about")} />
          <MenuItem icon="help-circle-outline" label="帮助" onPress={() => setInfoModal("help")} />
          <MenuItem icon="mail-outline" label="邮件反馈" detail="418154155@qq.com" onPress={() => void sendFeedback()} last />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => void supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{infoModal === "about" ? "关于" : "使用帮助"}</Text>
              <TouchableOpacity onPress={() => setInfoModal(null)}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity>
            </View>
            {infoModal === "about" ? (
              <View style={styles.modalContent}>
                <Text style={styles.aboutName}>求职投递助手</Text>
                <Text style={styles.helpText}>版本：{version}</Text>
                <Text style={styles.helpText}>构建：{build}</Text>
                <Text style={styles.helpText}>平台：{Platform.OS}</Text>
              </View>
            ) : (
              <View style={styles.modalContent}>
                <HelpItem title="投递状态" text="待投递不计入总投递；面试中包含一面、二面、三面、主管面和 HR 面。" />
                <HelpItem title="地址标签" text="地址属于个人标签库，每条投递最多选择 10 个；筛选时命中任意已选标签即可。" />
                <HelpItem title="待跟进事项" text="一条投递可建立多个全天待办，并可从详情或日历完成、恢复、编辑和删除。" />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SettingLabel({ children }: { children: string }) {
  return <Text style={styles.settingLabel}>{children}</Text>;
}

function SectionTitle({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: string }) {
  return <View style={styles.sectionTitleRow}><Ionicons name={icon} size={18} color={colors.primary} /><Text style={styles.sectionTitle}>{children}</Text></View>;
}

function MenuItem({ icon, label, detail, onPress, last = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.menuRow, last && styles.menuRowLast]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.menuLabel}>{label}</Text>
      {detail ? <Text style={styles.menuDetail}>{detail}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

function HelpItem({ title, text }: { title: string; text: string }) {
  return <View style={styles.helpItem}><Text style={styles.helpTitle}>{title}</Text><Text style={styles.helpText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.headerBg },
  headerTitle: { color: colors.headerText, fontSize: 22, fontWeight: fonts.bold },
  headerSubtitle: { color: colors.headerMuted, fontSize: 11, marginTop: 2 },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryLight },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarBadge: { position: "absolute", right: -2, bottom: -2, width: 25, height: 25, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  profileIdentity: { flex: 1, gap: spacing.xs },
  loggedInLabel: { color: colors.primaryText, fontWeight: fonts.bold, fontSize: 13 },
  email: { color: colors.text, fontSize: 15, fontWeight: fonts.semibold },
  settingLabel: { color: colors.text, fontSize: 13, fontWeight: fonts.bold },
  inlineEditor: { flexDirection: "row", gap: spacing.sm },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.bg },
  inputFull: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.bg },
  compactButton: { minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  compactButtonText: { color: colors.headerText, fontWeight: fonts.bold },
  hint: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: fonts.bold },
  secondaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primaryLight },
  secondaryButtonText: { color: colors.primaryText, fontWeight: fonts.bold },
  optionRow: { flexDirection: "row", gap: spacing.sm },
  option: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg },
  leadOption: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight, borderWidth: 2 },
  optionText: { color: colors.muted, fontSize: 13, fontWeight: fonts.semibold },
  optionTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
  settingSwitchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchCopy: { flex: 1, gap: spacing.xs },
  disabled: { opacity: 0.45 },
  menuRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuRowLast: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: fonts.semibold },
  menuDetail: { color: colors.muted, fontSize: 11 },
  logoutButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.dangerLight },
  logoutText: { color: colors.dangerText, fontWeight: fonts.bold },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: "rgba(0,0,0,0.55)" },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: fonts.bold },
  modalContent: { padding: spacing.lg, gap: spacing.lg },
  aboutName: { color: colors.text, fontSize: 20, fontWeight: fonts.bold },
  helpItem: { gap: spacing.xs },
  helpTitle: { color: colors.text, fontSize: 14, fontWeight: fonts.bold },
  helpText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
