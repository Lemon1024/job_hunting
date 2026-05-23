import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationInput,
  buildCalendarItems,
  calculateMetrics,
  createApplication,
  createEvent,
  deleteApplication,
  deleteEvent,
  formatDate,
  getPriorityLabel,
  getStatus,
  isDue,
  isNotApplied,
  listApplications,
  todayISO,
  updateApplication
} from "@job-tracker/core";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "./src/supabaseClient";

const S = {
  appName: "\u79cb\u62db\u6295\u9012\u52a9\u624b",
  subtitle: "\u767b\u5f55\u540e\u5728\u7535\u8111\u548c\u624b\u673a\u540c\u6b65\u6295\u9012\u8fdb\u5ea6",
  email: "\u90ae\u7bb1",
  password: "\u5bc6\u7801",
  login: "\u767b\u5f55",
  register: "\u6ce8\u518c",
  dashboard: "\u6295\u9012\u5de5\u4f5c\u53f0",
  total: "\u603b\u6295\u9012",
  offer: "Offer",
  follow: "\u5f85\u8ddf\u8fdb",
  applications: "\u6295\u9012",
  calendar: "\u65e5\u5386",
  profile: "\u6211\u7684",
  company: "\u516c\u53f8",
  position: "\u5c97\u4f4d",
  city: "\u57ce\u5e02",
  channel: "\u6e20\u9053",
  addApplication: "\u65b0\u589e\u6295\u9012",
  addProgress: "\u6dfb\u52a0\u8fdb\u5c55",
  progressPlaceholder: "\u6dfb\u52a0\u8fdb\u5c55\u8bb0\u5f55",
  current: "\u5f53\u524d",
  status: "\u72b6\u6001",
  priority: "\u4f18\u5148\u7ea7",
  applied: "\u6295\u9012",
  notApplied: "\u672a\u6295\u9012",
  noCity: "\u672a\u586b\u5199\u57ce\u5e02",
  nextStatus: "\u63a8\u8fdb\u72b6\u6001",
  nextFormStatus: "\u5207\u6362\u8868\u5355\u72b6\u6001",
  timeline: "\u65f6\u95f4\u7ebf",
  delete: "\u5220\u9664",
  logout: "\u9000\u51fa\u767b\u5f55",
  loadFail: "\u52a0\u8f7d\u5931\u8d25",
  checkConfig: "\u8bf7\u68c0\u67e5 Supabase \u914d\u7f6e",
  loginFail: "\u767b\u5f55\u5931\u8d25",
  registerFail: "\u6ce8\u518c\u5931\u8d25",
  required: "\u8bf7\u586b\u5199\u516c\u53f8\u548c\u5c97\u4f4d",
  createEventTitlePrefix: "\u521b\u5efa\u6295\u9012\u8bb0\u5f55\uff0c\u72b6\u6001\u4e3a\u300c",
  createEventTitleSuffix: "\u300d",
  noRecords: "\u6682\u65e0\u8bb0\u5f55",
  followSuffix: "\u8ddf\u8fdb"
};

const emptyInput: ApplicationInput = {
  company_name: "",
  position_name: "",
  city: "",
  channel: "",
  status: "applied",
  priority: "medium",
  applied_date: todayISO(),
  next_action_date: null,
  job_url: "",
  salary_range: "",
  resume_version: "",
  contact_name: "",
  contact_info: "",
  notes: ""
};

function nextStatusId(current: ApplicationInput["status"]) {
  const currentIndex = APPLICATION_STATUSES.findIndex((status) => status.id === current);
  return APPLICATION_STATUSES[(currentIndex + 1) % APPLICATION_STATUSES.length].id;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"applications" | "follow" | "calendar" | "profile">("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [input, setInput] = useState<ApplicationInput>(emptyInput);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      void refresh();
    }
  }, [session]);

  async function refresh() {
    try {
      const data = await listApplications(supabase as never);
      setApplications(data);
      setSelected((current) => {
        if (!current) return data[0] ?? null;
        return data.find((application) => application.id === current.id) ?? data[0] ?? null;
      });
    } catch (error) {
      Alert.alert(S.loadFail, error instanceof Error ? error.message : S.checkConfig);
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert(S.loginFail, error.message);
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert(S.registerFail, error.message);
  }

  async function submitApplication() {
    if (!input.company_name.trim() || !input.position_name.trim()) {
      Alert.alert(S.required);
      return;
    }

    const payload: ApplicationInput = {
      ...input,
      applied_date: input.status === "todo" ? null : input.applied_date || todayISO()
    };
    const created = await createApplication(supabase as never, payload);
    await createEvent(supabase as never, {
      application_id: created.id,
      type: "create",
      title: `${S.createEventTitlePrefix}${getStatus(created.status).label}${S.createEventTitleSuffix}`,
      description: null,
      event_date: payload.applied_date ?? todayISO()
    });
    setInput({ ...emptyInput, applied_date: todayISO() });
    await refresh();
  }

  async function moveStatus(application: Application) {
    const currentIndex = APPLICATION_STATUSES.findIndex((status) => status.id === application.status);
    const nextStatus = APPLICATION_STATUSES[Math.min(currentIndex + 1, APPLICATION_STATUSES.length - 1)];
    await updateApplication(supabase as never, application.id, {
      status: nextStatus.id,
      applied_date: nextStatus.id === "todo" ? null : application.applied_date ?? todayISO()
    });
    await refresh();
  }

  async function removeApplication(application: Application) {
    await deleteApplication(supabase as never, application.id);
    await refresh();
  }

  async function addEvent() {
    if (!selected || !eventTitle.trim()) return;
    await createEvent(supabase as never, {
      application_id: selected.id,
      type: "note",
      title: eventTitle.trim(),
      description: null,
      event_date: todayISO()
    });
    setEventTitle("");
    await refresh();
  }

  async function removeEvent(id: string) {
    await deleteEvent(supabase as never, id);
    await refresh();
  }

  const metrics = useMemo(() => calculateMetrics(applications), [applications]);
  const followItems = applications.filter(isDue);
  const calendarItems = buildCalendarItems(applications);

  if (!session) {
    return (
      <SafeAreaView style={styles.authShell}>
        <View style={styles.authCard}>
          <Text style={styles.authTitle}>{S.appName}</Text>
          <Text style={styles.muted}>{S.subtitle}</Text>
          <TextInput style={styles.input} placeholder={S.email} autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder={S.password} secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity style={styles.primaryButton} onPress={signIn}>
            <Text style={styles.primaryText}>{S.login}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={signUp}>
            <Text style={styles.secondaryText}>{S.register}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>JOB APPLICATION TRACKER</Text>
        <Text style={styles.headerTitle}>{S.dashboard}</Text>
        <Text style={styles.headerMeta}>
          {S.total} {metrics.total} / {S.offer} {metrics.offer} / {S.follow} {metrics.follow}
        </Text>
      </View>
      <View style={styles.tabs}>
        {[
          ["applications", S.applications],
          ["follow", S.follow],
          ["calendar", S.calendar],
          ["profile", S.profile]
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={tab === key ? styles.tabActive : styles.tab} onPress={() => setTab(key as never)}>
            <Text style={tab === key ? styles.tabTextActive : styles.tabText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === "applications" && (
          <>
            <View style={styles.card}>
              <TextInput style={styles.input} placeholder={S.company} value={input.company_name} onChangeText={(value) => setInput({ ...input, company_name: value })} />
              <TextInput style={styles.input} placeholder={S.position} value={input.position_name} onChangeText={(value) => setInput({ ...input, position_name: value })} />
              <TextInput style={styles.input} placeholder={S.city} value={input.city ?? ""} onChangeText={(value) => setInput({ ...input, city: value })} />
              <TextInput style={styles.input} placeholder={S.channel} value={input.channel ?? ""} onChangeText={(value) => setInput({ ...input, channel: value })} />
              <View style={styles.row}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setInput({ ...input, status: nextStatusId(input.status) })}>
                  <Text style={styles.secondaryText}>{getStatus(input.status).label}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={submitApplication}>
                  <Text style={styles.primaryText}>{S.addApplication}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {applications.map((application) => (
              <TouchableOpacity key={application.id} style={styles.card} onPress={() => setSelected(application)}>
                <Text style={styles.cardTitle}>{application.company_name} / {application.position_name}</Text>
                <Text style={styles.muted}>{application.city || S.noCity} / {getStatus(application.status).label}</Text>
                <Text style={styles.muted}>
                  {isNotApplied(application) ? S.notApplied : `${formatDate(application.applied_date)} ${S.applied}`} / {S.priority} {getPriorityLabel(application.priority)}
                </Text>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => moveStatus(application)}>
                    <Text style={styles.secondaryText}>{S.nextStatus}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerButton} onPress={() => removeApplication(application)}>
                    <Text style={styles.dangerText}>{S.delete}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {applications.length === 0 && <Text style={styles.emptyText}>{S.noRecords}</Text>}

            {selected && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{S.current}: {selected.company_name}</Text>
                <Text style={styles.muted}>{S.status}: {getStatus(selected.status).label}</Text>
                <TextInput style={styles.input} placeholder={S.progressPlaceholder} value={eventTitle} onChangeText={setEventTitle} />
                <TouchableOpacity style={styles.primaryButton} onPress={addEvent}>
                  <Text style={styles.primaryText}>{S.addProgress}</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>{S.timeline}</Text>
                {(selected.events ?? []).map((event) => (
                  <View key={event.id} style={styles.timelineItem}>
                    <View>
                      <Text style={styles.timelineTitle}>{event.title}</Text>
                      <Text style={styles.muted}>{formatDate(event.event_date)}</Text>
                    </View>
                    <TouchableOpacity style={styles.smallDangerButton} onPress={() => removeEvent(event.id)}>
                      <Text style={styles.dangerText}>{S.delete}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "follow" && (
          <>
            {followItems.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.company_name}</Text>
                <Text>{item.next_action_date} {S.followSuffix}</Text>
              </View>
            ))}
            {followItems.length === 0 && <Text style={styles.emptyText}>{S.noRecords}</Text>}
          </>
        )}

        {tab === "calendar" && (
          <>
            {calendarItems.map((item, index) => (
              <View key={`${item.applicationId}-${item.date}-${index}`} style={styles.card}>
                <Text style={styles.muted}>{item.date} / {item.label}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
            ))}
            {calendarItems.length === 0 && <Text style={styles.emptyText}>{S.noRecords}</Text>}
          </>
        )}

        {tab === "profile" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{session.user.email}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => supabase.auth.signOut()}>
              <Text style={styles.secondaryText}>{S.logout}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f4f6f9" },
  authShell: { flex: 1, backgroundColor: "#f4f6f9", justifyContent: "center", padding: 20 },
  authCard: { gap: 12, backgroundColor: "#ffffff", borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#d9e0e8" },
  authTitle: { fontSize: 28, fontWeight: "800", color: "#101828" },
  header: { padding: 18, backgroundColor: "#17202a" },
  headerEyebrow: { color: "#9fb0c1", fontSize: 12, fontWeight: "800" },
  headerTitle: { marginTop: 4, fontSize: 28, fontWeight: "900", color: "#ffffff" },
  headerMeta: { marginTop: 8, color: "#c8d2dc" },
  muted: { color: "#657385", marginTop: 4 },
  tabs: { flexDirection: "row", gap: 8, padding: 10, backgroundColor: "#ffffff" },
  tab: { flex: 1, alignItems: "center", padding: 10, borderRadius: 8, backgroundColor: "#eef2f7" },
  tabActive: { flex: 1, alignItems: "center", padding: 10, borderRadius: 8, backgroundColor: "#d9f3ef" },
  tabText: { color: "#475467", fontWeight: "700" },
  tabTextActive: { color: "#0f766e", fontWeight: "900" },
  content: { padding: 14, gap: 12 },
  card: { gap: 10, padding: 14, backgroundColor: "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: "#d9e0e8" },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#17202a" },
  sectionTitle: { marginTop: 8, fontSize: 16, fontWeight: "900", color: "#17202a" },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#d9e0e8", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#ffffff" },
  row: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: "#0f766e", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  primaryText: { color: "#ffffff", fontWeight: "800" },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: "#e7f4f2", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  secondaryText: { color: "#0f4f49", fontWeight: "800" },
  dangerButton: { minHeight: 44, borderRadius: 8, backgroundColor: "#fff1f3", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  smallDangerButton: { borderRadius: 8, backgroundColor: "#fff1f3", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, minHeight: 36 },
  dangerText: { color: "#c01632", fontWeight: "800" },
  emptyText: { color: "#657385", textAlign: "center", padding: 20 },
  timelineItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: "#eef2f7", paddingTop: 10 },
  timelineTitle: { fontWeight: "800", color: "#17202a" }
});
