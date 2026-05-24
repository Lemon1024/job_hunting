import { StyleSheet, Text, View } from "react-native";
import { priorityColors, radius, spacing } from "../theme";
import { getPriorityLabel } from "@job-tracker/core";

interface Props {
  priority: string;
}

export default function PriorityBadge({ priority }: Props) {
  const color = priorityColors[priority] ?? priorityColors.medium;
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.text }]}>{getPriorityLabel(priority)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "700" },
});
