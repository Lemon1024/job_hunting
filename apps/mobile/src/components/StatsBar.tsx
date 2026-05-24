import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import type { DashboardMetrics } from "@job-tracker/core";

interface Props {
  metrics: DashboardMetrics;
  onPress: (key: string) => void;
}

const items = [
  { key: "total", label: "总投递", icon: "send-outline" as const, color: "#3b82f6" },
  { key: "interview", label: "面试中", icon: "people-outline" as const, color: "#f97316" },
  { key: "offer", label: "Offer", icon: "trophy-outline" as const, color: "#10b981" },
  { key: "follow", label: "待跟进", icon: "alarm-outline" as const, color: "#ef4444" },
];

export default function StatsBar({ metrics, onPress }: Props) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <TouchableOpacity key={item.key} style={styles.card} onPress={() => onPress(item.key)}>
          <View style={[styles.iconWrap, { backgroundColor: item.color + "18" }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <Text style={styles.value}>{metrics[item.key as keyof DashboardMetrics] ?? 0}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 22, fontWeight: fonts.bold, color: colors.text },
  label: { fontSize: 11, color: colors.muted, fontWeight: fonts.medium },
});
