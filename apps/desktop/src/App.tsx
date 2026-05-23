import {
  APPLICATION_STATUSES,
  DEFAULT_APP_TITLE,
  EVENT_TYPES,
  PRIORITIES,
  type Application,
  type ApplicationInput,
  type ApplicationStatus,
  type EventType,
  type Priority,
  buildCalendarItems,
  calculateMetrics,
  createApplication,
  createEvent,
  deleteApplication,
  deleteEvent,
  exportApplicationsExcel,
  exportApplicationsJSON,
  formatDate,
  formatFullDate,
  getEventTypeLabel,
  getPriorityLabel,
  getStatus,
  isDue,
  isNotApplied,
  listApplications,
  todayISO,
  updateApplication
} from "@job-tracker/core";
import type { Session } from "@supabase/supabase-js";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

type NavFilter = "all" | "active" | "follow" | "offer" | "closed";
type SortMode = "updated-desc" | "applied-desc" | "priority-desc" | "follow-asc";

const SETTINGS_KEY = "autumn-job-tracker:desktop-settings:v1";

const T = {
  loading: "\u52a0\u8f7d\u4e2d...",
  loadFailed: "\u52a0\u8f7d\u5931\u8d25",
  importFailed: "\u5bfc\u5165\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u6587\u4ef6\u4e3a JSON \u683c\u5f0f",
  authSubtitle: "\u767b\u5f55\u540e\u5728\u7535\u8111\u548c\u624b\u673a\u4e0a\u540c\u6b65\u4f60\u7684\u79cb\u62db\u8fdb\u5ea6\u3002",
  email: "\u90ae\u7bb1",
  password: "\u5bc6\u7801",
  login: "\u767b\u5f55",
  register: "\u6ce8\u518c",
  goRegister: "\u6ca1\u6709\u8d26\u53f7\uff1f\u6ce8\u518c",
  goLogin: "\u5df2\u6709\u8d26\u53f7\uff1f\u767b\u5f55",
  save: "\u4fdd\u5b58",
  cancel: "\u53d6\u6d88",
  editName: "\u66f4\u6539\u540d\u79f0",
  all: "\u5168\u90e8\u6295\u9012",
  active: "\u8fdb\u884c\u4e2d",
  follow: "\u5f85\u8ddf\u8fdb",
  closed: "\u5df2\u7ed3\u675f",
  export: "\u5bfc\u51fa",
  import: "\u5bfc\u5165",
  logout: "\u9000\u51fa\u767b\u5f55",
  title: "\u6295\u9012\u5de5\u4f5c\u53f0",
  addApplication: "\u65b0\u589e\u6295\u9012",
  total: "\u603b\u6295\u9012",
  interviewing: "\u9762\u8bd5\u4e2d",
  search: "\u641c\u7d22\u516c\u53f8\u3001\u5c97\u4f4d\u3001\u57ce\u5e02",
  allStatus: "\u5168\u90e8\u72b6\u6001",
  updatedSort: "\u6700\u8fd1\u66f4\u65b0",
  appliedSort: "\u6295\u9012\u65f6\u95f4",
  prioritySort: "\u4f18\u5148\u7ea7",
  followSort: "\u8ddf\u8fdb\u65f6\u95f4",
  cityEmpty: "\u672a\u586b\u5199\u57ce\u5e02",
  channelEmpty: "\u672a\u586b\u5199\u6e20\u9053",
  notApplied: "\u672a\u6295\u9012",
  applied: "\u6295\u9012",
  noFollow: "\u672a\u8bbe\u8ddf\u8fdb",
  priorityPrefix: "\u4f18\u5148\u7ea7",
  edit: "\u7f16\u8f91",
  delete: "\u5220\u9664",
  currentStatus: "\u5f53\u524d\u72b6\u6001",
  nextFollow: "\u4e0b\u6b21\u8ddf\u8fdb",
  channel: "\u6295\u9012\u6e20\u9053",
  appliedDate: "\u6295\u9012\u65e5\u671f",
  priority: "\u4f18\u5148\u7ea7",
  resume: "\u7b80\u5386\u7248\u672c",
  unfilled: "\u672a\u586b\u5199",
  noAppliedYet: "\u5c1a\u672a\u6295\u9012",
  addEvent: "\u6dfb\u52a0\u8fdb\u5c55\u8bb0\u5f55",
  add: "\u6dfb\u52a0",
  timeline: "\u65f6\u95f4\u7ebf",
  records: "\u6761\u8bb0\u5f55",
  noTimeline: "\u6682\u65e0\u65f6\u95f4\u7ebf\u8bb0\u5f55",
  emptyTitle: "\u8fd8\u6ca1\u6709\u9009\u62e9\u6295\u9012\u8bb0\u5f55",
  emptyDesc: "\u4ece\u5de6\u4fa7\u9009\u62e9\u4e00\u5bb6\u516c\u53f8\uff0c\u6216\u65b0\u5efa\u7b2c\u4e00\u6761\u6295\u9012\u3002",
  stats: "\u590d\u76d8\u7edf\u8ba1",
  totalRecords: "\u6761\u8bb0\u5f55",
  rejected: "\u5df2\u62d2\u7edd",
  interviewRate: "\u9762\u8bd5\u7387",
  offerRate: "Offer \u7387",
  thisMonth: "\u672c\u6708",
  createApplication: "\u65b0\u589e\u6295\u9012",
  editApplication: "\u7f16\u8f91\u6295\u9012",
  close: "\u5173\u95ed",
  company: "\u516c\u53f8\u540d\u79f0",
  position: "\u5c97\u4f4d\u540d\u79f0",
  city: "\u57ce\u5e02",
  channelPlaceholder: "\u5b98\u7f51 / \u5185\u63a8 / Boss",
  jobUrl: "JD \u94fe\u63a5",
  salary: "\u85aa\u8d44\u8303\u56f4",
  contact: "\u8054\u7cfb\u4eba",
  notes: "\u5907\u6ce8",
  createEventTitle: "\u521b\u5efa\u6295\u9012\u8bb0\u5f55\uff0c\u72b6\u6001\u4e3a",
  statusFrom: "\u72b6\u6001\u4ece",
  statusTo: "\u53d8\u66f4\u4e3a",
  importCreate: "\u4ece\u5bfc\u5165\u6587\u4ef6\u521b\u5efa\u6295\u9012\u8bb0\u5f55",
  weekdays: ["\u5468\u4e00", "\u5468\u4e8c", "\u5468\u4e09", "\u5468\u56db", "\u5468\u4e94", "\u5468\u516d", "\u5468\u65e5"]
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

const priorityRank: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

function normalizeInput(input: ApplicationInput): ApplicationInput {
  return {
    ...input,
    company_name: input.company_name.trim(),
    position_name: input.position_name.trim(),
    city: input.city?.trim() || null,
    channel: input.channel?.trim() || null,
    applied_date: input.status === "todo" ? null : input.applied_date || todayISO(),
    next_action_date: input.next_action_date || null,
    job_url: input.job_url?.trim() || null,
    salary_range: input.salary_range?.trim() || null,
    resume_version: input.resume_version?.trim() || null,
    contact_name: input.contact_name?.trim() || null,
    contact_info: input.contact_info?.trim() || null,
    notes: input.notes?.trim() || null
  };
}

function inputFromApplication(application: Application): ApplicationInput {
  return {
    company_name: application.company_name,
    position_name: application.position_name,
    city: application.city ?? "",
    channel: application.channel ?? "",
    status: application.status,
    priority: application.priority,
    applied_date: application.applied_date ?? "",
    next_action_date: application.next_action_date ?? "",
    job_url: application.job_url ?? "",
    salary_range: application.salary_range ?? "",
    resume_version: application.resume_version ?? "",
    contact_name: application.contact_name ?? "",
    contact_info: application.contact_info ?? "",
    notes: application.notes ?? ""
  };
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
}

function getMonthMatrix(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [navFilter, setNavFilter] = useState<NavFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated-desc");
  const [input, setInput] = useState<ApplicationInput>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("note");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [appTitle, setAppTitle] = useState(DEFAULT_APP_TITLE);
  const [draftTitle, setDraftTitle] = useState(DEFAULT_APP_TITLE);
  const [editingTitle, setEditingTitle] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { title?: string };
      const title = parsed.title?.trim() || DEFAULT_APP_TITLE;
      setAppTitle(title);
      setDraftTitle(title);
    } catch {
      setAppTitle(DEFAULT_APP_TITLE);
      setDraftTitle(DEFAULT_APP_TITLE);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshApplications();
  }, [session]);

  const selected = applications.find((item) => item.id === selectedId) ?? applications[0] ?? null;
  const metrics = useMemo(() => calculateMetrics(applications), [applications]);
  const calendarItems = useMemo(() => buildCalendarItems(applications), [applications]);
  const statusCounts = useMemo(
    () => APPLICATION_STATUSES.map((status) => ({
      ...status,
      count: applications.filter((application) => application.status === status.id).length
    })).filter((status) => status.count > 0),
    [applications]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return applications
      .filter((application) => {
        if (statusFilter !== "all" && application.status !== statusFilter) return false;
        if (navFilter === "active" && getStatus(application.status).closed) return false;
        if (navFilter === "follow" && !isDue(application)) return false;
        if (navFilter === "offer" && application.status !== "offer") return false;
        if (navFilter === "closed" && !getStatus(application.status).closed) return false;
        if (!term) return true;
        return [application.company_name, application.position_name, application.city, application.channel]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        if (sortMode === "applied-desc") return (b.applied_date ?? "").localeCompare(a.applied_date ?? "");
        if (sortMode === "priority-desc") return priorityRank[b.priority] - priorityRank[a.priority];
        if (sortMode === "follow-asc") return (a.next_action_date ?? "9999-12-31").localeCompare(b.next_action_date ?? "9999-12-31");
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [applications, navFilter, query, sortMode, statusFilter]);

  const calendarByDate = useMemo(() => {
    return calendarItems.reduce<Record<string, typeof calendarItems>>((grouped, item) => {
      grouped[item.date] = [...(grouped[item.date] ?? []), item];
      return grouped;
    }, {});
  }, [calendarItems]);

  async function refreshApplications() {
    try {
      const data = await listApplications(supabase);
      setApplications(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : T.loadFailed);
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const action = authMode === "sign-in"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error: authError } = await action;
    if (authError) setError(authError.message);
  }

  function openCreateDialog() {
    setEditingId(null);
    setInput(emptyInput);
    setIsDialogOpen(true);
  }

  function openEditDialog(application: Application) {
    setEditingId(application.id);
    setInput(inputFromApplication(application));
    setIsDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = normalizeInput(input);
    if (editingId) {
      await updateApplication(supabase, editingId, payload);
      await refreshApplications();
      setSelectedId(editingId);
    } else {
      const created = await createApplication(supabase, payload);
      await createEvent(supabase, {
        application_id: created.id,
        type: "create",
        title: `${T.createEventTitle}\u300c${getStatus(created.status).label}\u300d`,
        description: null,
        event_date: payload.applied_date ?? todayISO()
      });
      await refreshApplications();
      setSelectedId(created.id);
    }
    setIsDialogOpen(false);
    setInput(emptyInput);
    setEditingId(null);
  }

  async function handleStatusChange(application: Application, status: string) {
    const next = await updateApplication(supabase, application.id, {
      status: status as ApplicationStatus,
      applied_date: status === "todo" ? null : application.applied_date ?? todayISO()
    });
    await createEvent(supabase, {
      application_id: application.id,
      type: "status",
      title: `${T.statusFrom}\u300c${getStatus(application.status).label}\u300d${T.statusTo}\u300c${getStatus(next.status).label}\u300d`,
      description: null,
      event_date: todayISO()
    });
    await refreshApplications();
  }

  async function handleNextActionChange(application: Application, value: string) {
    await updateApplication(supabase, application.id, { next_action_date: value || null });
    await refreshApplications();
  }

  async function handleAddEvent() {
    if (!selected || !eventTitle.trim()) return;
    await createEvent(supabase, {
      application_id: selected.id,
      type: eventType,
      title: eventTitle.trim(),
      description: null,
      event_date: todayISO()
    });
    setEventTitle("");
    await refreshApplications();
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ApplicationInput[] | { applications?: ApplicationInput[] };
      const rows = Array.isArray(parsed) ? parsed : parsed.applications ?? [];
      for (const row of rows) {
        if (!row.company_name || !row.position_name) continue;
        const created = await createApplication(supabase, normalizeInput({ ...emptyInput, ...row }));
        await createEvent(supabase, {
          application_id: created.id,
          type: "create",
          title: T.importCreate,
          description: null,
          event_date: created.applied_date ?? todayISO()
        });
      }
      await refreshApplications();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : T.importFailed);
    } finally {
      event.target.value = "";
    }
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob(["\ufeff", content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function saveTitle() {
    const next = draftTitle.trim() || DEFAULT_APP_TITLE;
    setAppTitle(next);
    setDraftTitle(next);
    setEditingTitle(false);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ title: next }));
  }

  const brandMark = appTitle.trim()[0] ?? "\u79cb";
  const currentMonthDays = getMonthMatrix(calendarMonth);
  const monthTitle = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(calendarMonth);

  if (loading) return <main className="centered">{T.loading}</main>;

  if (!session) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="brand-mark">{"\u79cb"}</div>
          <h1>{DEFAULT_APP_TITLE}</h1>
          <p>{T.authSubtitle}</p>
          <input placeholder={T.email} value={email} onChange={(event) => setEmail(event.target.value)} />
          <input placeholder={T.password} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="primary-button" type="submit">{authMode === "sign-in" ? T.login : T.register}</button>
          <button type="button" className="link-button" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}>
            {authMode === "sign-in" ? T.goRegister : T.goLogin}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="main navigation">
        <div className="brand">
          <div className="brand-mark">{brandMark}</div>
          <div>
            {editingTitle ? (
              <div className="brand-title-form">
                <input value={draftTitle} maxLength={24} onChange={(event) => setDraftTitle(event.target.value)} />
                <button className="mini-button" type="button" onClick={saveTitle} title={T.save}>{"\u2713"}</button>
                <button className="mini-button" type="button" onClick={() => setEditingTitle(false)} title={T.cancel}>{"\u00d7"}</button>
              </div>
            ) : (
              <div className="brand-title-row">
                <h1>{appTitle}</h1>
                <button className="title-edit-button" type="button" onClick={() => setEditingTitle(true)} title={T.editName}>{"\u270e"}</button>
              </div>
            )}
            <p>{getTodayLabel()}</p>
          </div>
        </div>

        <nav className="nav-stack">
          {[
            ["all", "\u25a6", T.all],
            ["active", "\u25cc", T.active],
            ["follow", "\u25c7", T.follow],
            ["offer", "\u2713", "Offer"],
            ["closed", "\u00d7", T.closed]
          ].map(([value, icon, label]) => (
            <button key={value} className={navFilter === value ? "nav-item active" : "nav-item"} type="button" onClick={() => setNavFilter(value as NavFilter)}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <div className="export-menu-wrap">
            <button className="ghost-button" type="button" onClick={() => setExportOpen((open) => !open)}>
              <span aria-hidden="true">{"\u21e9"}</span>
              {T.export}
            </button>
            {exportOpen && (
              <div className="export-menu" role="menu">
                <button type="button" onClick={() => download(`applications-${todayISO()}.json`, exportApplicationsJSON(applications), "application/json")}>JSON</button>
                <button type="button" onClick={() => download(`applications-${todayISO()}.xls`, exportApplicationsExcel(applications), "application/vnd.ms-excel")}>Excel</button>
              </div>
            )}
          </div>
          <label className="ghost-button file-button" title={T.import}>
            <span aria-hidden="true">{"\u21e7"}</span>
            {T.import}
            <input type="file" accept=".json,application/json" onChange={handleImport} />
          </label>
          <button className="ghost-button" type="button" onClick={() => supabase.auth.signOut()}>{T.logout}</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Job Application Tracker</p>
            <h2>{T.title}</h2>
          </div>
          <button className="primary-button" type="button" onClick={openCreateDialog}>
            <span aria-hidden="true">+</span>
            {T.addApplication}
          </button>
        </header>

        {error && <p className="error banner">{error}</p>}

        <section className="metric-grid" aria-label="metrics">
          <article className="metric-card"><span>{T.total}</span><strong>{metrics.total}</strong></article>
          <article className="metric-card"><span>{T.interviewing}</span><strong>{metrics.interview}</strong></article>
          <article className="metric-card"><span>Offer</span><strong>{metrics.offer}</strong></article>
          <article className="metric-card urgent"><span>{T.follow}</span><strong>{metrics.follow}</strong></article>
        </section>

        <section className="content-grid">
          <div className="panel list-panel">
            <div className="toolbar">
              <label className="search-box">
                <span aria-hidden="true">{"\u2315"}</span>
                <input placeholder={T.search} value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">{T.allStatus}</option>
                {APPLICATION_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="updated-desc">{T.updatedSort}</option>
                <option value="applied-desc">{T.appliedSort}</option>
                <option value="priority-desc">{T.prioritySort}</option>
                <option value="follow-asc">{T.followSort}</option>
              </select>
            </div>

            <div className="status-board">
              {statusCounts.map((status) => (
                <button className="status-chip" key={status.id} type="button" onClick={() => setStatusFilter(status.id)}>
                  <span>{status.label}</span>
                  <strong>{status.count}</strong>
                </button>
              ))}
            </div>

            <div className="application-list">
              {filtered.map((application) => (
                <button key={application.id} className={selected?.id === application.id ? "application-card active" : "application-card"} type="button" onClick={() => setSelectedId(application.id)}>
                  <div className="card-main">
                    <div className="card-title">
                      <h3>{application.company_name} {"\u00b7"} {application.position_name}</h3>
                      <p>{application.city || T.cityEmpty} {"\u00b7"} {application.channel || T.channelEmpty}</p>
                    </div>
                    <span className={`badge ${application.status}`}>{getStatus(application.status).label}</span>
                  </div>
                  <div className="card-meta">
                    <span>{isNotApplied(application) ? T.notApplied : `${formatDate(application.applied_date)} ${T.applied}`}</span>
                    <span>{application.next_action_date ? `${formatDate(application.next_action_date)} ${T.follow}` : T.noFollow}</span>
                    <span className={`badge priority-${application.priority}`}>{T.priorityPrefix} {getPriorityLabel(application.priority)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="panel detail-panel">
            {selected ? (
              <article className="detail-view">
                <div className="detail-header">
                  <div>
                    <p className="eyebrow">{selected.city || T.cityEmpty} {"\u00b7"} {getStatus(selected.status).label}</p>
                    <h3>{selected.company_name} {"\u00b7"} {selected.position_name}</h3>
                  </div>
                  <div className="detail-actions">
                    <button className="icon-button" type="button" onClick={() => openEditDialog(selected)} title={T.edit}>{"\u270e"}</button>
                    <button className="icon-button danger" type="button" onClick={() => deleteApplication(supabase, selected.id).then(refreshApplications)} title={T.delete}>{"\u00d7"}</button>
                  </div>
                </div>

                <div className="detail-status-row">
                  <label>{T.currentStatus}<select value={selected.status} onChange={(event) => handleStatusChange(selected, event.target.value)}>{APPLICATION_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
                  <label>{T.nextFollow}<input type="date" value={selected.next_action_date ?? ""} onChange={(event) => handleNextActionChange(selected, event.target.value)} /></label>
                </div>

                <dl className="info-grid">
                  <div><dt>{T.channel}</dt><dd>{selected.channel || T.unfilled}</dd></div>
                  <div><dt>{T.appliedDate}</dt><dd>{isNotApplied(selected) ? T.noAppliedYet : formatFullDate(selected.applied_date)}</dd></div>
                  <div><dt>{T.priority}</dt><dd>{getPriorityLabel(selected.priority)}</dd></div>
                  <div><dt>{T.resume}</dt><dd>{selected.resume_version || T.unfilled}</dd></div>
                </dl>

                {selected.notes && <div className="notes-wrap">{selected.notes}</div>}

                <section className="event-composer" aria-label="event composer">
                  <select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
                    {EVENT_TYPES.filter((type) => !["status", "create"].includes(type.id)).map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                  <input placeholder={T.addEvent} value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
                  <button className="secondary-button" type="button" onClick={handleAddEvent}>{T.add}</button>
                </section>

                <section>
                  <div className="section-title"><h4>{T.timeline}</h4><span>{selected.events?.length ?? 0} {T.records}</span></div>
                  <div className="timeline">
                    {(selected.events ?? []).map((event) => (
                      <article className="timeline-item" key={event.id}>
                        <div className="timeline-item-header">
                          <div><h5>{event.title}</h5><p>{getEventTypeLabel(event.type)} {"\u00b7"} {formatDate(event.event_date)}</p></div>
                          <button className="timeline-delete-button" type="button" onClick={() => deleteEvent(supabase, event.id).then(refreshApplications)}>{"\u00d7"}</button>
                        </div>
                      </article>
                    ))}
                    {!selected.events?.length && <p className="muted-text">{T.noTimeline}</p>}
                  </div>
                </section>
              </article>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">+</div>
                <h3>{T.emptyTitle}</h3>
                <p>{T.emptyDesc}</p>
                <button className="primary-button" type="button" onClick={openCreateDialog}>{T.addApplication}</button>
              </div>
            )}
          </aside>
        </section>

        <section className="panel stats-panel">
          <div className="section-title"><h4>{T.stats}</h4><span>{metrics.total} {T.totalRecords}</span></div>
          <div className="stats-grid">
            <article className="stat-card"><span>{T.active}</span><strong>{metrics.active}</strong></article>
            <article className="stat-card"><span>{T.rejected}</span><strong>{metrics.rejected}</strong></article>
            <article className="stat-card"><span>{T.interviewRate}</span><strong>{metrics.interviewRate}%</strong></article>
            <article className="stat-card"><span>{T.offerRate}</span><strong>{metrics.offerRate}%</strong></article>
          </div>
        </section>

        <section className="panel calendar-panel">
          <div className="calendar-header">
            <div><p className="eyebrow">Calendar</p><h4>{monthTitle}</h4></div>
            <div className="calendar-actions">
              <button className="icon-button" type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>{"\u2039"}</button>
              <button className="ghost-button" type="button" onClick={() => setCalendarMonth(new Date())}>{T.thisMonth}</button>
              <button className="icon-button" type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>{"\u203a"}</button>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">{T.weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid" aria-label="calendar">
            {currentMonthDays.map((date) => {
              const iso = toISODate(date);
              const dayItems = calendarByDate[iso] ?? [];
              const muted = date.getMonth() !== calendarMonth.getMonth();
              return (
                <div key={iso} className={`calendar-day ${muted ? "muted" : ""} ${iso === todayISO() ? "today" : ""}`}>
                  <div className="calendar-date"><span>{date.getDate()}</span>{dayItems.length > 0 && <span className="calendar-count">{dayItems.length}</span>}</div>
                  {dayItems.slice(0, 3).map((item, index) => (
                    <button key={`${item.applicationId}-${index}`} className={`calendar-event ${item.type}`} type="button" onClick={() => setSelectedId(item.applicationId)}>
                      {item.label} {"\u00b7"} {item.title}
                    </button>
                  ))}
                  {dayItems.length > 3 && <span className="calendar-more">+{dayItems.length - 3}</span>}
                </div>
              );
            })}
          </div>
        </section>
      </section>

      {isDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <form className="dialog-card" onSubmit={handleSubmit}>
            <div className="dialog-header">
              <div><p className="eyebrow">Application</p><h3>{editingId ? T.editApplication : T.createApplication}</h3></div>
              <button className="icon-button" type="button" onClick={() => setIsDialogOpen(false)} title={T.close}>{"\u00d7"}</button>
            </div>
            <div className="form-grid">
              <label>{T.company}<input required value={input.company_name} onChange={(event) => setInput({ ...input, company_name: event.target.value })} /></label>
              <label>{T.position}<input required value={input.position_name} onChange={(event) => setInput({ ...input, position_name: event.target.value })} /></label>
              <label>{T.city}<input value={input.city ?? ""} onChange={(event) => setInput({ ...input, city: event.target.value })} /></label>
              <label>{T.channel}<input value={input.channel ?? ""} placeholder={T.channelPlaceholder} onChange={(event) => setInput({ ...input, channel: event.target.value })} /></label>
              <label>{T.currentStatus}<select value={input.status} onChange={(event) => setInput({ ...input, status: event.target.value as ApplicationStatus, applied_date: event.target.value === "todo" ? null : input.applied_date || todayISO() })}>{APPLICATION_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
              <label>{T.priority}<select value={input.priority} onChange={(event) => setInput({ ...input, priority: event.target.value as Priority })}>{PRIORITIES.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}</select></label>
              <label>{T.appliedDate}<input type="date" disabled={input.status === "todo"} value={input.applied_date ?? ""} onChange={(event) => setInput({ ...input, applied_date: event.target.value })} /></label>
              <label>{T.nextFollow}<input type="date" value={input.next_action_date ?? ""} onChange={(event) => setInput({ ...input, next_action_date: event.target.value })} /></label>
              <label>{T.jobUrl}<input type="url" value={input.job_url ?? ""} onChange={(event) => setInput({ ...input, job_url: event.target.value })} /></label>
              <label>{T.salary}<input value={input.salary_range ?? ""} onChange={(event) => setInput({ ...input, salary_range: event.target.value })} /></label>
              <label>{T.resume}<input value={input.resume_version ?? ""} onChange={(event) => setInput({ ...input, resume_version: event.target.value })} /></label>
              <label>{T.contact}<input value={input.contact_name ?? ""} onChange={(event) => setInput({ ...input, contact_name: event.target.value })} /></label>
            </div>
            <label className="wide-label">{T.notes}<textarea rows={4} value={input.notes ?? ""} onChange={(event) => setInput({ ...input, notes: event.target.value })} /></label>
            <div className="dialog-footer">
              <button className="ghost-button" type="button" onClick={() => setIsDialogOpen(false)}>{T.cancel}</button>
              <button className="primary-button" type="submit">{T.save}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
