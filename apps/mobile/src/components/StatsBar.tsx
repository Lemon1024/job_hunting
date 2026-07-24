import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import type { DashboardMetrics } from "@job-tracker/core";

interface Props {
  metrics: DashboardMetrics;
  activeKey: QuickFilterKey;
  onPress: (key: QuickFilterKey) => void;
}

export type QuickFilterKey = "todo" | "submitted" | "interview" | "offer";

const items = [
  { key: "todo", label: "待投递", icon: "time-outline" as const, color: "#8b5cf6" },
  { key: "submitted", label: "总投递", icon: "send-outline" as const, color: "#3b82f6" },
  { key: "interview", label: "面试中", icon: "people-outline" as const, color: "#f97316" },
  { key: "offer", label: "Offer", icon: "trophy-outline" as const, color: "#10b981" },
] satisfies ReadonlyArray<{
  key: QuickFilterKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}>;

export default function StatsBar({ metrics, activeKey, onPress }: Props) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const isActive = activeKey === item.key;
        const value = metrics[item.key];
        return (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${value}`}
            accessibilityState={{ selected: isActive }}
            style={[styles.card, isActive && styles.cardActive]}
            onPress={() => onPress(item.key)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.value, isActive && styles.valueActive]}>{value}</Text>
            <Text testID="stat-label" style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    padding: spacing.md - 1,
    backgroundColor: colors.primaryLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 22, fontWeight: fonts.bold, color: colors.text },
  valueActive: { color: colors.primaryText },
  label: { fontSize: 11, color: colors.muted, fontWeight: fonts.medium },
  labelActive: { color: colors.primaryText, fontWeight: fonts.bold },
});
