import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";
import { APPLICATION_STATUSES, PRIORITIES } from "@job-tracker/core";
import { Ionicons } from "@expo/vector-icons";

interface FilterState {
  status: string | null;
  priority: string | null;
  city: string | null;
  channel: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  cities: string[];
  channels: string[];
}

export default function FilterSheet({ visible, onClose, filters, onApply, cities, channels }: Props) {
  const toggle = (key: keyof FilterState, value: string) => {
    const current = filters[key];
    onApply({ ...filters, [key]: current === value ? null : value });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>筛选</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.sectionTitle}>状态</Text>
            <View style={styles.chipRow}>
              {APPLICATION_STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, filters.status === s.id && styles.chipActive]}
                  onPress={() => toggle("status", s.id)}
                >
                  <Text style={[styles.chipText, filters.status === s.id && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>优先级</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, filters.priority === p.id && styles.chipActive]}
                  onPress={() => toggle("priority", p.id)}
                >
                  <Text style={[styles.chipText, filters.priority === p.id && styles.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {cities.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>城市</Text>
                <View style={styles.chipRow}>
                  {cities.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, filters.city === c && styles.chipActive]}
                      onPress={() => toggle("city", c)}
                    >
                      <Text style={[styles.chipText, filters.city === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {channels.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>渠道</Text>
                <View style={styles.chipRow}>
                  {channels.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, filters.channel === c && styles.chipActive]}
                      onPress={() => toggle("channel", c)}
                    >
                      <Text style={[styles.chipText, filters.channel === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => onApply({ status: null, priority: null, city: null, channel: null })}
            >
              <Text style={styles.resetText}>重置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneText}>完成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "75%",
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: fonts.bold, color: colors.text },
  body: { padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: fonts.bold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.tabInactive,
  },
  chipActive: { backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
  footer: {
    flexDirection: "row",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  resetBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tabInactive,
  },
  resetText: { fontWeight: fonts.bold, color: colors.text },
  doneBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  doneText: { fontWeight: fonts.bold, color: colors.headerText },
});
