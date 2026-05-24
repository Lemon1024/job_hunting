import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import { formatDate, getStatus } from "@job-tracker/core";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import type { Application } from "@job-tracker/core";

interface Props {
  application: Application;
  onPress: () => void;
}

export default function ApplicationCard({ application, onPress }: Props) {
  const status = getStatus(application.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.logo}>
          <Ionicons name="business-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.company} numberOfLines={1}>{application.company_name}</Text>
          <Text style={styles.position} numberOfLines={1}>{application.position_name}</Text>
        </View>
        <StatusBadge status={application.status} />
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.muted} />
          <Text style={styles.metaText}>{application.city || "未填写"}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.muted} />
          <Text style={styles.metaText}>
            {application.applied_date ? formatDate(application.applied_date) : "未投递"}
          </Text>
        </View>
        <PriorityBadge priority={application.priority} />
      </View>
      {status.closed && (
        <View style={styles.closedOverlay}>
          <Text style={styles.closedText}>已结束</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  company: { fontSize: 16, fontWeight: fonts.bold, color: colors.text },
  position: { fontSize: 13, color: colors.muted, marginTop: 2 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 12, color: colors.muted },
  closedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  closedText: { fontSize: 14, fontWeight: fonts.bold, color: colors.muted },
});
