import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  type Application,
  calculateMetrics,
  getProfile,
  getReminderTasks,
  isInterviewStatus,
  listApplications,
  todayISO,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import StatsBar from "../components/StatsBar";
import type { QuickFilterKey } from "../components/StatsBar";
import SearchBar from "../components/SearchBar";
import ApplicationCard from "../components/ApplicationCard";
import FilterSheet from "../components/FilterSheet";
import EmptyState from "../components/EmptyState";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "../navigation/types";
import { CITY_OPTIONS, matchesCityFilter } from "../applicationForm";

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "DashboardMain">;
};

interface FilterState {
  status: string | null;
  priority: string | null;
  cities: string[];
  channel: string | null;
}

export default function DashboardScreen({ navigation }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderLeadDays, setReminderLeadDays] = useState(0);
  const [filters, setFilters] = useState<FilterState>({ status: null, priority: null, cities: [], channel: null });
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("submitted");

  const load = useCallback(async () => {
    try {
      const data = await listApplications(supabase as never);
      setApplications(data);
      getProfile(supabase as never).then((profile) => {
        setRemindersEnabled(profile.in_app_reminders_enabled);
        setReminderLeadDays(profile.reminder_lead_days);
      }).catch(() => undefined);
    } catch (e) {
      Alert.alert("加载失败", e instanceof Error ? e.message : "请检查网络");
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const metrics = useMemo(() => calculateMetrics(applications), [applications]);
  const reminderTasks = useMemo(() => remindersEnabled
    ? getReminderTasks(applications.flatMap((application) => application.follow_up_tasks ?? []), todayISO(), reminderLeadDays)
    : [], [applications, reminderLeadDays, remindersEnabled]);

  const channels = useMemo(
    () => [...new Set(applications.map((a) => a.channel).filter(Boolean))] as string[],
    [applications],
  );

  const filtered = useMemo(() => {
    let result = applications;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.company_name.toLowerCase().includes(q) ||
          a.position_name.toLowerCase().includes(q) ||
          (a.locations ?? []).some((location) => location.label.toLowerCase().includes(q)) ||
          (a.city ?? "").toLowerCase().includes(q) ||
          (a.channel ?? "").toLowerCase().includes(q),
      );
    }
    result = result.filter((application) => {
      if (quickFilter === "todo") return application.status === "todo";
      if (quickFilter === "submitted") return application.status !== "todo";
      if (quickFilter === "interview") return isInterviewStatus(application.status);
      return application.status === "offer";
    });
    if (filters.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter((a) => a.priority === filters.priority);
    }
    result = result.filter((application) => matchesCityFilter(application, filters.cities));
    if (filters.channel) {
      result = result.filter((a) => a.channel === filters.channel);
    }
    return result;
  }, [applications, search, quickFilter, filters]);

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>JOB APPLICATION TRACKER</Text>
          <Text style={styles.headerTitle}>投递工作台</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`应用内提醒 ${reminderTasks.length}`}
          style={styles.notificationButton}
          onPress={() => setReminderVisible(true)}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.headerText} />
          {reminderTasks.length > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{Math.min(reminderTasks.length, 99)}</Text></View> : null}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <StatsBar metrics={metrics} activeKey={quickFilter} onPress={setQuickFilter} />
            <View style={styles.searchRow}>
              <SearchBar value={search} onChangeText={setSearch} onFilterPress={() => setFilterVisible(true)} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ApplicationCard
              application={item}
              onPress={() => navigation.navigate("ApplicationDetail", { applicationId: item.id, application: item })}
            />
          </View>
        )}
        ListEmptyComponent={<EmptyState message={search ? "暂无匹配投递" : "暂无投递记录"} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("AddApplication", {})}
      >
        <Ionicons name="add" size={28} color={colors.headerText} />
      </TouchableOpacity>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={setFilters}
        cities={CITY_OPTIONS}
        channels={channels}
      />

      <Modal visible={reminderVisible} transparent animationType="slide" onRequestClose={() => setReminderVisible(false)}>
        <View style={styles.reminderBackdrop}>
          <View style={styles.reminderSheet}>
            <View style={styles.reminderHeader}>
              <View>
                <Text style={styles.reminderTitle}>应用内提醒</Text>
                <Text style={styles.reminderSubtitle}>提前 {reminderLeadDays} 天 · {reminderTasks.length} 项</Text>
              </View>
              <TouchableOpacity onPress={() => setReminderVisible(false)}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.reminderList}>
              {!remindersEnabled ? <Text style={styles.reminderEmpty}>应用内提醒已在“我的”中关闭。</Text> : null}
              {remindersEnabled && reminderTasks.length === 0 ? <Text style={styles.reminderEmpty}>暂无即将到期或已逾期待办。</Text> : null}
              {reminderTasks.map((task) => {
                const application = applications.find((item) => item.id === task.application_id);
                const overdue = task.due_date < todayISO();
                if (!application) return null;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.reminderItem}
                    onPress={() => {
                      setReminderVisible(false);
                      navigation.navigate("ApplicationDetail", { applicationId: application.id, application });
                    }}
                  >
                    <View style={[styles.reminderIndicator, { backgroundColor: overdue ? colors.danger : colors.warning }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderItemTitle}>{task.title}</Text>
                      <Text style={styles.reminderItemMeta}>{application.company_name} · {task.due_date}</Text>
                    </View>
                    <Text style={[styles.reminderState, overdue && styles.reminderStateOverdue]}>{overdue ? "已逾期" : "即将到期"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerEyebrow: { color: colors.headerMuted, fontSize: 11, fontWeight: fonts.bold, letterSpacing: 1 },
  headerTitle: { color: colors.headerText, fontSize: 22, fontWeight: fonts.bold, marginTop: 2 },
  notificationButton: { padding: spacing.sm },
  notificationBadge: { position: "absolute", top: 1, right: 0, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger },
  notificationBadgeText: { color: "#ffffff", fontSize: 9, fontWeight: fonts.bold },
  listHeader: { padding: spacing.md, gap: spacing.md },
  searchRow: { marginTop: spacing.xs },
  listContent: { paddingBottom: 80 },
  cardWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  reminderBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  reminderSheet: { maxHeight: "78%", minHeight: "35%", backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  reminderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  reminderTitle: { color: colors.text, fontSize: 18, fontWeight: fonts.bold },
  reminderSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  reminderList: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 },
  reminderEmpty: { color: colors.muted, textAlign: "center", paddingVertical: spacing.xxl },
  reminderItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg },
  reminderIndicator: { width: 7, height: 36, borderRadius: 4 },
  reminderItemTitle: { color: colors.text, fontSize: 14, fontWeight: fonts.bold },
  reminderItemMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  reminderState: { color: colors.warning, fontSize: 11, fontWeight: fonts.bold },
  reminderStateOverdue: { color: colors.dangerText },
});
