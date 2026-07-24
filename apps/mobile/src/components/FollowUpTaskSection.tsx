import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDate, todayISO, type FollowUpTask, type FollowUpTaskInput } from "@job-tracker/core";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  applicationId: string;
  tasks: FollowUpTask[];
  onCreate: (input: FollowUpTaskInput) => void | Promise<void>;
  onUpdate: (id: string, input: FollowUpTaskInput) => void | Promise<void>;
  onToggle: (task: FollowUpTask, completed: boolean) => void | Promise<void>;
  onDelete: (task: FollowUpTask) => void | Promise<void>;
  initialEditingTaskId?: string;
  startCreating?: boolean;
  initialDueDate?: string;
}

export default function FollowUpTaskSection({
  applicationId,
  tasks,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  initialEditingTaskId,
  startCreating = false,
  initialDueDate,
}: Props) {
  const [editing, setEditing] = useState<FollowUpTask | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (startCreating) {
      beginCreate(initialDueDate);
      return;
    }
    const requestedTask = tasks.find((task) => task.id === initialEditingTaskId);
    if (requestedTask) beginEdit(requestedTask);
  }, [initialDueDate, initialEditingTaskId, startCreating]);

  function beginCreate(date = todayISO()) {
    setEditing("new");
    setTitle("");
    setNotes("");
    setDueDate(date);
  }

  function beginEdit(task: FollowUpTask) {
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDueDate(task.due_date);
  }

  async function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("请输入待办标题");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert("日期格式错误", "请使用 YYYY-MM-DD 格式。");
      return;
    }
    const input: FollowUpTaskInput = {
      application_id: applicationId,
      title: trimmedTitle,
      notes: notes.trim() || null,
      due_date: dueDate,
    };
    setSaving(true);
    try {
      if (editing === "new") await onCreate(input);
      else if (editing) await onUpdate(editing.id, input);
      setEditing(null);
    } catch (error) {
      Alert.alert("保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(task: FollowUpTask) {
    try {
      await onToggle(task, task.completed_at === null);
    } catch (error) {
      Alert.alert("更新失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }

  function confirmDelete(task: FollowUpTask) {
    Alert.alert("删除待办", `确定永久删除“${task.title}”吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => void Promise.resolve(onDelete(task)).catch((error) => {
          Alert.alert("删除失败", error instanceof Error ? error.message : "请稍后重试");
        }),
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>待跟进事项</Text>
          <Text style={styles.caption}>未完成 {tasks.filter((task) => task.completed_at === null).length} 项</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="新建待办" style={styles.addButton} onPress={() => beginCreate()}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>新建</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="待办标题"
            placeholderTextColor={colors.muted}
            maxLength={200}
          />
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="备注（可选）"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
          />
          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(null)}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="保存待办"
              style={[styles.saveButton, saving && styles.disabled]}
              disabled={saving}
              onPress={() => void save()}
            >
              <Text style={styles.saveText}>{saving ? "保存中…" : "保存"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {tasks.length === 0 ? (
        <Text style={styles.empty}>暂无待办，可为面试准备、感谢信等事项设置日期。</Text>
      ) : (
        [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date)).map((task) => {
          const completed = task.completed_at !== null;
          return (
            <View key={task.id} style={[styles.task, completed && styles.taskCompleted]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${completed ? "恢复" : "完成"} ${task.title}`}
                onPress={() => void toggle(task)}
              >
                <Ionicons name={completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={completed ? colors.primary : colors.muted} />
              </TouchableOpacity>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, completed && styles.taskTitleCompleted]}>{task.title}</Text>
                <Text style={styles.taskMeta}>{formatDate(task.due_date)}{task.notes ? ` · ${task.notes}` : ""}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`编辑 ${task.title}`} style={styles.iconButton} onPress={() => beginEdit(task)}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`删除 ${task.title}`} style={styles.iconButton} onPress={() => confirmDelete(task)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: fonts.bold, color: colors.text },
  caption: { marginTop: 2, color: colors.muted, fontSize: 11 },
  addButton: { flexDirection: "row", gap: spacing.xs, alignItems: "center", minHeight: 36, paddingHorizontal: spacing.sm },
  addButtonText: { color: colors.primary, fontWeight: fonts.bold, fontSize: 13 },
  editor: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  notesInput: { minHeight: 68, paddingTop: spacing.md, textAlignVertical: "top" },
  editorActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  cancelButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.lg },
  cancelText: { color: colors.muted, fontWeight: fonts.semibold },
  saveButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  saveText: { color: colors.headerText, fontWeight: fonts.bold },
  disabled: { opacity: 0.55 },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 18, paddingVertical: spacing.sm },
  task: { flexDirection: "row", gap: spacing.sm, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  taskCompleted: { opacity: 0.65 },
  taskBody: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 14, fontWeight: fonts.semibold },
  taskTitleCompleted: { textDecorationLine: "line-through" },
  taskMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  iconButton: { padding: spacing.xs },
});
