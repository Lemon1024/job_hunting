import { useState } from "react";
import { Alert, Pressable as TouchableOpacity, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LocationTag } from "@job-tracker/core";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  tags: LocationTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreate: (label: string) => void | Promise<void>;
  onRename?: (tag: LocationTag, nextLabel: string) => void | Promise<void>;
  onDelete?: (tag: LocationTag) => void | Promise<void>;
  usageCounts?: Record<string, number>;
}

export default function LocationTagSelector({
  tags,
  selectedIds,
  onToggle,
  onCreate,
  onRename,
  onDelete,
  usageCounts = {},
}: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  async function create() {
    const label = newLabel.trim();
    if (!label) return;
    await onCreate(label);
    setNewLabel("");
  }

  async function rename(tag: LocationTag) {
    const label = editingLabel.trim();
    if (!label || label === tag.label) {
      setEditingId(null);
      return;
    }
    await onRename?.(tag, label);
    setEditingId(null);
  }

  function confirmDelete(tag: LocationTag) {
    const count = usageCounts[tag.id] ?? 0;
    Alert.alert(
      "删除地址标签",
      count > 0 ? `该标签用于 ${count} 条投递。删除后只会解除关联，不会删除投递。` : "确定删除这个个人地址标签吗？",
      [
        { text: "取消", style: "cancel" },
        { text: "永久删除", style: "destructive", onPress: () => void onDelete?.(tag) },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <View key={tag.id} style={styles.tagRow}>
              {editingId === tag.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    accessibilityLabel={`重命名 ${tag.label}`}
                    style={styles.editInput}
                    value={editingLabel}
                    onChangeText={setEditingLabel}
                    maxLength={32}
                    autoFocus
                  />
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="保存地址标签" onPress={() => void rename(tag)}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={tag.label}
                    accessibilityState={{ selected }}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => onToggle(tag.id)}
                  >
                    <Ionicons name={selected ? "checkmark-circle" : "location-outline"} size={15} color={selected ? colors.primary : colors.muted} />
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{tag.label}</Text>
                  </TouchableOpacity>
                  {onRename ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`重命名 ${tag.label}`}
                      style={styles.iconButton}
                      onPress={() => { setEditingId(tag.id); setEditingLabel(tag.label); }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  ) : null}
                  {onDelete ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`删除 ${tag.label}`}
                      style={styles.iconButton}
                      onPress={() => confirmDelete(tag)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="输入新地址标签"
          placeholderTextColor={colors.muted}
          maxLength={32}
          returnKeyType="done"
          onSubmitEditing={() => void create()}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="创建地址标签"
          style={[styles.createButton, !newLabel.trim() && styles.createButtonDisabled]}
          disabled={!newLabel.trim()}
          onPress={() => void create()}
        >
          <Ionicons name="add" size={20} color={colors.headerText} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>最多选择 10 个；新标签会保存到个人地址库。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tagRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
  iconButton: { padding: spacing.xs },
  editRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  editInput: {
    minWidth: 120,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  createRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  createButton: {
    width: 44,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  createButtonDisabled: { opacity: 0.45 },
  hint: { color: colors.muted, fontSize: 11 },
});
