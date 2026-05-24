import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  type Application,
  calculateMetrics,
  listApplications,
  getStatus,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import StatsBar from "../components/StatsBar";
import SearchBar from "../components/SearchBar";
import ApplicationCard from "../components/ApplicationCard";
import FilterSheet from "../components/FilterSheet";
import EmptyState from "../components/EmptyState";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface FilterState {
  status: string | null;
  priority: string | null;
  city: string | null;
  channel: string | null;
}

export default function DashboardScreen({ navigation }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ status: null, priority: null, city: null, channel: null });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listApplications(supabase as never);
      setApplications(data);
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

  const cities = useMemo(
    () => [...new Set(applications.map((a) => a.city).filter(Boolean))] as string[],
    [applications],
  );
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
          (a.city ?? "").toLowerCase().includes(q) ||
          (a.channel ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (filters.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter((a) => a.priority === filters.priority);
    }
    if (filters.city) {
      result = result.filter((a) => a.city === filters.city);
    }
    if (filters.channel) {
      result = result.filter((a) => a.channel === filters.channel);
    }
    return result;
  }, [applications, search, statusFilter, filters]);

  const handleStatPress = (key: string) => {
    if (key === "total") { setStatusFilter(null); return; }
    if (key === "interview") { setStatusFilter("interview1"); return; }
    if (key === "offer") { setStatusFilter("offer"); return; }
    if (key === "follow") { setStatusFilter("todo"); return; }
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>JOB APPLICATION TRACKER</Text>
          <Text style={styles.headerTitle}>投递工作台</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <StatsBar metrics={metrics} onPress={handleStatPress} />
            <View style={styles.searchRow}>
              <SearchBar value={search} onChangeText={setSearch} onFilterPress={() => setFilterVisible(true)} />
            </View>
            {statusFilter && (
              <View style={styles.activeFilterRow}>
                <Text style={styles.activeFilterText}>筛选: {getStatus(statusFilter).label}</Text>
                <TouchableOpacity onPress={() => setStatusFilter(null)}>
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
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
        cities={cities}
        channels={channels}
      />
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
  listHeader: { padding: spacing.md, gap: spacing.md },
  searchRow: { marginTop: spacing.xs },
  activeFilterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  activeFilterText: { fontSize: 13, color: colors.primaryText, fontWeight: fonts.semibold },
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
});
