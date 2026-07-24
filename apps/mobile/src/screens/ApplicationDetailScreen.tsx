import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  type Application,
  type ApplicationEvent,
  type FollowUpTask,
  type FollowUpTaskInput,
  createFollowUpTask,
  createEvent,
  deleteApplication,
  deleteEvent,
  deleteFollowUpTask,
  formatDate,
  getStatus,
  listApplications,
  setFollowUpTaskCompleted,
  todayISO,
  updateFollowUpTask,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import TimelineItem from "../components/TimelineItem";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "../navigation/types";
import FollowUpTaskSection from "../components/FollowUpTaskSection";

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "ApplicationDetail">;
  route: { params: DashboardStackParamList["ApplicationDetail"] };
};

export default function ApplicationDetailScreen({ navigation, route }: Props) {
  const [application, setApplication] = useState<Application>(route.params.application);
  const [eventTitle, setEventTitle] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listApplications(supabase as never);
      const found = data.find((a) => a.id === application.id);
      if (found) setApplication(found);
    } catch { /* ignore */ }
  }, [application.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", refresh);
    return unsubscribe;
  }, [navigation, refresh]);

  async function addEvent() {
    if (!eventTitle.trim()) return;
    try {
      await createEvent(supabase as never, {
        application_id: application.id,
        type: "note",
        title: eventTitle.trim(),
        description: null,
        event_date: todayISO(),
      });
      setEventTitle("");
      setShowAddEvent(false);
      await refresh();
    } catch (e) {
      Alert.alert("添加失败", e instanceof Error ? e.message : "未知错误");
    }
  }

  async function removeEvent(id: string) {
    try {
      await deleteEvent(supabase as never, id);
      await refresh();
    } catch (e) {
      Alert.alert("删除失败", e instanceof Error ? e.message : "未知错误");
    }
  }

  function confirmDeleteApplication() {
    Alert.alert(
      "永久删除投递",
      `将删除 ${application.company_name} · ${application.position_name}，以及关联的时间线和待办。个人地址标签会保留。此操作无法撤销。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "永久删除",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteApplication(supabase as never, application.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert("删除失败", error instanceof Error ? error.message : "请稍后重试");
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const statusInfo = getStatus(application.status);
  const events = application.events ?? [];

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>投递详情</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate("AddApplication", { application, mode: "edit" })}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="删除投递"
            style={[styles.headerBtn, deleting && styles.disabled]}
            disabled={deleting}
            onPress={confirmDeleteApplication}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Company Card */}
        <View style={styles.companyCard}>
          <View style={styles.logo}>
            <Ionicons name="business" size={28} color={colors.primary} />
          </View>
          <Text style={styles.companyName}>{application.company_name}</Text>
          <Text style={styles.positionName}>{application.position_name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{application.city || "未填写"} / {application.channel || "未填写"}</Text>
          </View>
          <StatusBadge status={application.status} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>地址标签</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddApplication", { application, mode: "edit" })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>维护</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.locationRow}>
            {(application.locations ?? []).length > 0 ? application.locations?.map((location) => (
              <View key={location.id} style={styles.locationChip}>
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <Text style={styles.locationText}>{location.label}</Text>
              </View>
            )) : <Text style={styles.emptyTimeline}>暂未设置地址</Text>}
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.infoCard}>
          <InfoRow label="投递日期" value={application.applied_date ? formatDate(application.applied_date) : "待投递"} />
          <InfoRow label="优先级" value={<PriorityBadge priority={application.priority} />} />
          <InfoRow label="当前状态" value={statusInfo.label} />
          <InfoRow label="招聘渠道" value={application.channel || "未填写"} />
          <InfoRow label="简历版本" value={application.resume_version || "未指定"} />
        </View>

        {application.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>备注</Text>
            <Text style={styles.notesText}>{application.notes}</Text>
          </View>
        ) : null}

        <FollowUpTaskSection
          applicationId={application.id}
          tasks={application.follow_up_tasks ?? []}
          onCreate={async (input: FollowUpTaskInput) => {
            await createFollowUpTask(supabase as never, input);
            await refresh();
          }}
          onUpdate={async (id: string, input: FollowUpTaskInput) => {
            await updateFollowUpTask(supabase as never, id, input);
            await refresh();
          }}
          onToggle={async (task: FollowUpTask, completed: boolean) => {
            await setFollowUpTaskCompleted(supabase as never, task.id, completed);
            await refresh();
          }}
          onDelete={async (task: FollowUpTask) => {
            await deleteFollowUpTask(supabase as never, task.id);
            await refresh();
          }}
        />

        {/* Timeline */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>时间线</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddEvent(!showAddEvent)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>添加进展</Text>
            </TouchableOpacity>
          </View>

          {showAddEvent && (
            <View style={styles.addEventRow}>
              <TextInput
                style={styles.eventInput}
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="输入进展内容..."
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity style={styles.eventSubmitBtn} onPress={addEvent}>
                <Text style={styles.eventSubmitText}>添加</Text>
              </TouchableOpacity>
            </View>
          )}

          {events.length === 0 ? (
            <Text style={styles.emptyTimeline}>暂无进展记录</Text>
          ) : (
            events.map((event, i) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={i === events.length - 1}
                isActive={event.type !== "note" || i < 2}
                onDelete={() => removeEvent(event.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode | string }) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={infoRowStyles.label}>{label}</Text>
      {typeof value === "string" ? <Text style={infoRowStyles.value}>{value}</Text> : value}
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm - 2 },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 14, color: colors.text, fontWeight: fonts.semibold },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: fonts.bold, color: colors.text },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerBtn: { padding: spacing.sm },
  disabled: { opacity: 0.5 },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 2 },

  /* Company card */
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: { fontSize: 20, fontWeight: fonts.bold, color: colors.text },
  positionName: { fontSize: 15, color: colors.muted },
  metaRow: { marginBottom: spacing.xs },
  metaText: { fontSize: 13, color: colors.muted },

  /* Info card */
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  /* Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: fonts.bold, color: colors.text },
  notesText: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 13, color: colors.primary, fontWeight: fonts.semibold },
  locationRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  locationChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  locationText: { color: colors.primaryText, fontSize: 13, fontWeight: fonts.semibold },
  addEventRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  eventInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  eventSubmitBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  eventSubmitText: { color: colors.headerText, fontWeight: fonts.bold, fontSize: 14 },
  emptyTimeline: { color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: spacing.lg },
});
