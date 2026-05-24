import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import { supabase } from "../supabaseClient";

export default function LoginScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("请输入邮箱和密码");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) Alert.alert("登录失败", error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) Alert.alert("注册失败", error.message);
        else Alert.alert("注册成功", "请查看邮箱验证链接");
      }
    } catch (e: unknown) {
      Alert.alert("错误", e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "center" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        {/* Logo + Title */}
        <View style={styles.logoWrap}>
          <Ionicons name="briefcase" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>秋招投递助手</Text>
        <Text style={styles.subtitle}>高效管理你的秋招投递进度</Text>

        {/* Tab switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={tab === "login" ? styles.tabActive : styles.tab} onPress={() => setTab("login")}>
            <Text style={tab === "login" ? styles.tabTextActive : styles.tabText}>登录</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tab === "register" ? styles.tabActive : styles.tab} onPress={() => setTab("register")}>
            <Text style={tab === "register" ? styles.tabTextActive : styles.tabText}>注册</Text>
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.input}
            placeholder="邮箱"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.input}
            placeholder="密码"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Remember + Forgot */}
        <View style={styles.optionRow}>
          <TouchableOpacity style={styles.checkRow} onPress={() => setRemember(!remember)}>
            <Ionicons name={remember ? "checkbox" : "square-outline"} size={18} color={colors.primary} />
            <Text style={styles.optionText}>记住我</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>忘记密码</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? "处理中..." : tab === "login" ? "登录" : "注册"}</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legal}>
          登录即表示同意 <Text style={styles.legalLink}>用户协议</Text> 和 <Text style={styles.legalLink}>隐私政策</Text>
        </Text>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontSize: 24, fontWeight: fonts.bold, color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: -spacing.sm },
  tabRow: { flexDirection: "row", backgroundColor: colors.tabInactive, borderRadius: radius.md, padding: 3 },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md - 2 },
  tabActive: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md - 2, backgroundColor: colors.surface },
  tabText: { fontSize: 14, color: colors.muted, fontWeight: fonts.semibold },
  tabTextActive: { fontSize: 14, color: colors.primary, fontWeight: fonts.bold },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  optionText: { fontSize: 13, color: colors.muted },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: fonts.semibold },
  submitBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.headerText, fontSize: 16, fontWeight: fonts.bold },
  legal: { fontSize: 11, color: colors.muted, textAlign: "center" },
  legalLink: { color: colors.primary },
});
