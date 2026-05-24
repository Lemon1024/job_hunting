import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  type Application,
  type CalendarItem,
  buildCalendarItems,
  formatDate,
  isDue,
  listApplications,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import CalendarGrid from "../components/CalendarGrid";
import ApplicationCard from "../components/ApplicationCard";
import EmptyState from "../components/EmptyState";

export default function CalendarScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [subTab, setSubTab] = useState<"calendar" | "follow">("calendar");
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
  const followItems = useMemo(() => applications.filter(isDue), [applications]);

  const selectedDateItems = useMemo(
    () => calendarItems.filter((item) => item.date === selectedDate),
    [calendarItems, selectedDate],
  );

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
            <Text style={styles.sectionTitle}>{selectedDate} · {selectedDateItems.length} 个事件</Text>
            {selectedDateItems.length === 0 ? (
              <Text style={styles.emptyText}>当日无事件</Text>
            ) : (
              selectedDateItems.map((item, idx) => (
                <View key={`${item.applicationId}-${idx}`} style={styles.eventCard}>
                  <View style={[styles.eventDot, { backgroundColor: item.type === "applied" ? "#3b82f6" : item.type === "follow" ? "#10b981" : "#f97316" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventLabel}>{item.label}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={followItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState message="暂无待跟进事项" icon="checkmark-circle-outline" />}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <View style={styles.followCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.followCompany}>{item.company_name} · {item.position_name}</Text>
                  <Text style={styles.followMeta}>
                    跟进日期: {item.next_action_date ? formatDate(item.next_action_date) : "未设置"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </View>
          )}
        />
      )}
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
  sectionTitle: { fontSize: 15, fontWeight: fonts.bold, color: colors.text, marginBottom: spacing.sm },
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
});
