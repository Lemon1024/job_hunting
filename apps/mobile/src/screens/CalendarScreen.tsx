import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  type Application,
  type CalendarItem,
  type FollowUpTask,
  type FollowUpTaskInput,
  buildCalendarItems,
  createFollowUpTask,
  deleteFollowUpTask,
  listApplications,
  setFollowUpTaskCompleted,
  updateFollowUpTask,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import CalendarGrid from "../components/CalendarGrid";
import ApplicationCard from "../components/ApplicationCard";
import EmptyState from "../components/EmptyState";
import FollowUpTaskSection from "../components/FollowUpTaskSection";

interface TaskEditorState {
  applicationId: string | null;
  taskId?: string;
  create?: boolean;
  dueDate?: string;
}

export default function CalendarScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [subTab, setSubTab] = useState<"calendar" | "follow">("calendar");
  const [taskEditor, setTaskEditor] = useState<TaskEditorState | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const load = useCallback(async () => {
    try {
      const data = await listApplications(supabase as never);
      setApplications(data);
    } catch (e) {
      Alert.alert("加载失败", e instanceof Error ? e.message : "请检查网络");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const calendarItems = useMemo(() => buildCalendarItems(applications), [applications]);
  const followItems = useMemo(
    () => applications.flatMap((application) => (application.follow_up_tasks ?? [])
      .filter((task) => task.completed_at === null)
      .map((task) => ({ application, task })))
      .sort((a, b) => a.task.due_date.localeCompare(b.task.due_date)),
    [applications],
  );

  const selectedDateItems = useMemo(
    () => calendarItems.filter((item) => item.date === selectedDate),
    [calendarItems, selectedDate],
  );

  const editorApplication = taskEditor?.applicationId
    ? applications.find((application) => application.id === taskEditor.applicationId)
    : undefined;

  async function createTask(input: FollowUpTaskInput) {
    await createFollowUpTask(supabase as never, input);
    await load();
    setTaskEditor(null);
  }

  async function updateTask(id: string, input: FollowUpTaskInput) {
    await updateFollowUpTask(supabase as never, id, input);
    await load();
    setTaskEditor(null);
  }

  async function toggleTask(task: FollowUpTask, completed: boolean) {
    await setFollowUpTaskCompleted(supabase as never, task.id, completed);
    await load();
  }

  async function removeTask(task: FollowUpTask) {
    await deleteFollowUpTask(supabase as never, task.id);
    await load();
    setTaskEditor(null);
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>日历</Text>
        <TouchableOpacity>
          <Ionicons name="options-outline" size={20} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {/* Sub tabs */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={subTab === "calendar" ? styles.subTabActive : styles.subTab}
          onPress={() => setSubTab("calendar")}
        >
          <Text style={subTab === "calendar" ? styles.subTabTextActive : styles.subTabText}>日历视图</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={subTab === "follow" ? styles.subTabActive : styles.subTab}
          onPress={() => setSubTab("follow")}
        >
          <Text style={subTab === "follow" ? styles.subTabTextActive : styles.subTabText}>待跟进 ({followItems.length})</Text>
        </TouchableOpacity>
      </View>

      {subTab === "calendar" ? (
        <ScrollView contentContainerStyle={styles.body}>
          <CalendarGrid
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            today={today}
            events={calendarItems}
            onSelectDate={setSelectedDate}
            onPrevMonth={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
              else setCalMonth(calMonth - 1);
            }}
            onNextMonth={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
              else setCalMonth(calMonth + 1);
            }}
          />

          {/* Selected date items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{selectedDate} · {selectedDateItems.length} 个事项</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="为所选日期新建待办"
                style={styles.newTaskButton}
                onPress={() => setTaskEditor({ applicationId: null, create: true, dueDate: selectedDate })}
              >
                <Ionicons name="add" size={17} color={colors.primary} />
                <Text style={styles.newTaskText}>新建待办</Text>
              </TouchableOpacity>
            </View>
            {selectedDateItems.length === 0 ? (
              <Text style={styles.emptyText}>当日无事件</Text>
            ) : (
              selectedDateItems.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.applicationId}-${item.taskId ?? idx}`}
                  style={styles.eventCard}
                  disabled={!item.taskId}
                  onPress={() => item.taskId && setTaskEditor({ applicationId: item.applicationId, taskId: item.taskId })}
                >
                  <View style={[styles.eventDot, { backgroundColor: item.type === "applied" ? "#3b82f6" : item.type === "follow" ? "#10b981" : "#f97316" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventLabel}>{item.label}</Text>
                  </View>
                  {item.taskId ? <Ionicons name="create-outline" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={followItems}
          keyExtractor={({ task }) => task.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState message="暂无待跟进事项" icon="checkmark-circle-outline" />}
          renderItem={({ item: { application, task } }) => (
            <View style={styles.cardWrap}>
              <TouchableOpacity
                style={styles.followCard}
                onPress={() => setTaskEditor({ applicationId: application.id, taskId: task.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.followCompany}>{task.title}</Text>
                  <Text style={styles.followMeta}>
                    {task.due_date} · {application.company_name} · {application.position_name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={taskEditor !== null} transparent animationType="slide" onRequestClose={() => setTaskEditor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{taskEditor?.create ? "新建待办" : "编辑待办"}</Text>
              <TouchableOpacity onPress={() => setTaskEditor(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!editorApplication ? (
              <ScrollView contentContainerStyle={styles.applicationPicker}>
                <Text style={styles.pickerHint}>先选择待办所属投递</Text>
                {applications.map((application) => (
                  <TouchableOpacity
                    key={application.id}
                    style={styles.applicationOption}
                    onPress={() => setTaskEditor((current) => current ? { ...current, applicationId: application.id } : null)}
                  >
                    <Text style={styles.applicationOptionTitle}>{application.company_name}</Text>
                    <Text style={styles.applicationOptionMeta}>{application.position_name}</Text>
                  </TouchableOpacity>
                ))}
                {applications.length === 0 ? <Text style={styles.emptyText}>请先创建一条投递记录。</Text> : null}
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.editorContext}>{editorApplication.company_name} · {editorApplication.position_name}</Text>
                <FollowUpTaskSection
                  applicationId={editorApplication.id}
                  tasks={editorApplication.follow_up_tasks ?? []}
                  initialEditingTaskId={taskEditor?.taskId}
                  startCreating={taskEditor?.create}
                  initialDueDate={taskEditor?.dueDate}
                  onCreate={createTask}
                  onUpdate={updateTask}
                  onToggle={toggleTask}
                  onDelete={removeTask}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.headerBg,
  },
  headerTitle: { color: colors.headerText, fontSize: 22, fontWeight: fonts.bold },
  subTabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.tabInactive },
  subTabActive: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.tabActive },
  subTabText: { fontSize: 14, color: colors.tabInactiveText, fontWeight: fonts.semibold },
  subTabTextActive: { fontSize: 14, color: colors.tabActiveText, fontWeight: fonts.bold },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  section: { marginTop: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: fonts.bold, color: colors.text, marginBottom: spacing.sm },
  newTaskButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.sm },
  newTaskText: { color: colors.primary, fontWeight: fonts.bold, fontSize: 12 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: spacing.lg },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  eventTitle: { fontSize: 14, fontWeight: fonts.bold, color: colors.text },
  eventLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },
  cardWrap: { marginBottom: spacing.sm },
  followCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  followCompany: { fontSize: 15, fontWeight: fonts.bold, color: colors.text },
  followMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { maxHeight: "85%", minHeight: "45%", backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: fonts.bold },
  modalBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  editorContext: { color: colors.primaryText, fontWeight: fonts.bold },
  applicationPicker: { padding: spacing.lg, gap: spacing.sm },
  pickerHint: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  applicationOption: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg },
  applicationOptionTitle: { color: colors.text, fontWeight: fonts.bold, fontSize: 14 },
  applicationOptionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
