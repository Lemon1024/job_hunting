import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import { supabase } from "../supabaseClient";

export default function ProfileScreen() {
  const user = supabase.auth.currentUser;

  return (
    <View style={styles.shell}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </View>

      {/* User info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <Text style={styles.email}>{user?.email ?? "未登录"}</Text>
      </View>

      {/* Settings */}
      <View style={styles.menuCard}>
        <MenuItem icon="settings-outline" label="设置" />
        <MenuItem icon="information-circle-outline" label="关于" />
        <MenuItem icon="help-circle-outline" label="帮助与反馈" />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </View>
  );
}

function MenuItem({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={menuStyles.row}>
      <Ionicons name={icon as any} size={20} color={colors.text} />
      <Text style={menuStyles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { flex: 1, fontSize: 15, color: colors.text, fontWeight: fonts.medium },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.headerBg,
  },
  headerTitle: { color: colors.headerText, fontSize: 22, fontWeight: fonts.bold },
  profileCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  email: { fontSize: 16, color: colors.text, fontWeight: fonts.semibold },
  menuCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  logoutText: { fontSize: 15, fontWeight: fonts.bold, color: colors.dangerText },
});
