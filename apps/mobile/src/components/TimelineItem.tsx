import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import { formatDate } from "@job-tracker/core";
import type { ApplicationEvent } from "@job-tracker/core";

interface Props {
  event: ApplicationEvent;
  isLast: boolean;
  isActive: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

export default function TimelineItem({ event, isLast, isActive, onPress, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.lineCol}>
        <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <TouchableOpacity style={[styles.content, isActive && styles.contentActive]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.title, isActive && styles.titleActive]}>{event.title}</Text>
        {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}
        <Text style={styles.date}>{formatDate(event.event_date)}</Text>
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.dangerText} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  lineCol: { width: 28, alignItems: "center", paddingTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  dotActive: { backgroundColor: colors.primary },
  dotInactive: { backgroundColor: colors.border, borderWidth: 2, borderColor: colors.muted },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  content: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contentActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  title: { fontSize: 14, fontWeight: fonts.bold, color: colors.text },
  titleActive: { color: colors.primaryText },
  desc: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  date: { fontSize: 11, color: colors.muted, marginTop: spacing.xs },
  deleteBtn: { padding: spacing.sm, marginTop: spacing.sm },
});
