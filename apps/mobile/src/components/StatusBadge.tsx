import { StyleSheet, Text, View } from "react-native";
import { statusColors, radius, spacing } from "../theme";
import { getStatus } from "@job-tracker/core";

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const info = getStatus(status);
  const color = statusColors[status] ?? statusColors.todo;
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.text }]}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs - 1,
    borderRadius: radius.xl,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700" },
});
