const STORAGE_KEY = "autumn-job-tracker:v1";
const SETTINGS_KEY = "autumn-job-tracker:settings:v1";
const SEED_KEY = "autumn-job-tracker:seeded:v1";
const DEFAULT_APP_TITLE = "秋招投递助手";

const statuses = [
  { id: "todo", label: "待投递", closed: false },
  { id: "applied", label: "已投递", closed: false },
  { id: "screening", label: "简历筛选", closed: false },
  { id: "exam", label: "笔试", closed: false },
  { id: "interview1", label: "一面", closed: false },
  { id: "interview2", label: "二面", closed: false },
  { id: "interview3", label: "三面", closed: false },
  { id: "hr", label: "HR 面", closed: false },
  { id: "offer", label: "Offer", closed: true },
  { id: "rejected", label: "已拒绝", closed: true },
  { id: "silent", label: "无回应", closed: true },
  { id: "closed", label: "已结束", closed: true },
];

const priorityMap = {
  high: "高",
  medium: "中",
  low: "低",
};

const eventTypeMap = {
  note: "备注",
  exam: "笔试",
  interview: "面试",
  follow: "跟进",
  result: "结果",
  status: "状态",
  create: "创建",
};

const state = {
  applications: [],
  selectedId: null,
  navFilter: "all",
  statusFilter: "all",
  query: "",
  sort: "updated-desc",
  calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  settings: {
    appTitle: DEFAULT_APP_TITLE,
  },
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  brandMark: $("#brandMark"),
  brandTitle: $("#brandTitle"),
  editTitleBtn: $("#editTitleBtn"),
  brandTitleForm: $("#brandTitleForm"),
  brandTitleInput: $("#brandTitleInput"),
  saveTitleBtn: $("#saveTitleBtn"),
  cancelTitleBtn: $("#cancelTitleBtn"),
  todayLabel: $("#todayLabel"),
  addApplicationBtn: $("#addApplicationBtn"),
  emptyAddBtn: $("#emptyAddBtn"),
  exportBtn: $("#exportBtn"),
  exportMenu: $("#exportMenu"),
  exportJsonBtn: $("#exportJsonBtn"),
  exportExcelBtn: $("#exportExcelBtn"),
  importInput: $("#importInput"),
  searchInput: $("#searchInput"),
  statusSelect: $("#statusSelect"),
  sortSelect: $("#sortSelect"),
  statusBoard: $("#statusBoard"),
  applicationList: $("#applicationList"),
  detailEmpty: $("#detailEmpty"),
  detailView: $("#detailView"),
  detailCompanyMeta: $("#detailCompanyMeta"),
  detailTitle: $("#detailTitle"),
  detailStatusSelect: $("#detailStatusSelect"),
  detailNextAction: $("#detailNextAction"),
  detailChannel: $("#detailChannel"),
  detailAppliedDate: $("#detailAppliedDate"),
  detailPriority: $("#detailPriority"),
  detailResume: $("#detailResume"),
  detailNotesWrap: $("#detailNotesWrap"),
  editApplicationBtn: $("#editApplicationBtn"),
  deleteApplicationBtn: $("#deleteApplicationBtn"),
  eventTypeSelect: $("#eventTypeSelect"),
  eventTitleInput: $("#eventTitleInput"),
  addEventBtn: $("#addEventBtn"),
  eventCount: $("#eventCount"),
  timeline: $("#timeline"),
  statsSummary: $("#statsSummary"),
  statsGrid: $("#statsGrid"),
  calendarTitle: $("#calendarTitle"),
  calendarGrid: $("#calendarGrid"),
  prevMonthBtn: $("#prevMonthBtn"),
  currentMonthBtn: $("#currentMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  metricTotal: $("#metricTotal"),
  metricInterview: $("#metricInterview"),
  metricOffer: $("#metricOffer"),
  metricFollow: $("#metricFollow"),
  applicationDialog: $("#applicationDialog"),
  applicationForm: $("#applicationForm"),
  dialogTitle: $("#dialogTitle"),
  closeDialogBtn: $("#closeDialogBtn"),
  cancelDialogBtn: $("#cancelDialogBtn"),
  applicationId: $("#applicationId"),
  companyInput: $("#companyInput"),
  positionInput: $("#positionInput"),
  cityInput: $("#cityInput"),
  channelInput: $("#channelInput"),
  statusInput: $("#statusInput"),
  priorityInput: $("#priorityInput"),
  appliedDateInput: $("#appliedDateInput"),
  nextActionInput: $("#nextActionInput"),
  jobUrlInput: $("#jobUrlInput"),
  salaryInput: $("#salaryInput"),
  resumeInput: $("#resumeInput"),
  contactInput: $("#contactInput"),
  notesInput: $("#notesInput"),
};

function todayISO() {
  return localDateISO(new Date());
}

function localDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStatus(id) {
  return statuses.find((status) => status.id === id) || statuses[0];
}

function formatDate(dateValue) {
  if (!dateValue) return "未设置";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(dateValue) {
  if (!dateValue) return "未设置";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isDue(application) {
  if (!application.nextActionDate) return false;
  const today = todayISO();
  return application.nextActionDate <= today && !getStatus(application.status).closed;
}

function isInterview(statusId) {
  return ["interview1", "interview2", "interview3", "hr"].includes(statusId);
}

function isNotApplied(application) {
  return application.status === "todo";
}

function getAppliedMeta(application) {
  if (isNotApplied(application)) return "未投递";
  return `${formatDate(application.appliedDate)} 投递`;
}

function getAppliedDetail(application) {
  if (isNotApplied(application)) return "尚未投递";
  return formatFullDate(application.appliedDate);
}

function loadApplications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applications));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { appTitle: DEFAULT_APP_TITLE };

  try {
    const parsed = JSON.parse(raw);
    return {
      appTitle: typeof parsed.appTitle === "string" && parsed.appTitle.trim()
        ? parsed.appTitle.trim()
        : DEFAULT_APP_TITLE,
    };
  } catch {
    return { appTitle: DEFAULT_APP_TITLE };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function applyAppTitle() {
  const title = state.settings.appTitle || DEFAULT_APP_TITLE;
  elements.brandTitle.textContent = title;
  elements.brandMark.textContent = title.trim().charAt(0) || "秋";
  document.title = title;
}

function startTitleEdit() {
  elements.brandTitleInput.value = state.settings.appTitle || DEFAULT_APP_TITLE;
  elements.brandTitle.classList.add("hidden");
  elements.editTitleBtn.classList.add("hidden");
  elements.brandTitleForm.classList.remove("hidden");
  elements.brandTitleInput.focus();
  elements.brandTitleInput.select();
}

function saveTitleEdit() {
  const title = elements.brandTitleInput.value.trim() || DEFAULT_APP_TITLE;
  state.settings.appTitle = title;
  saveSettings();
  applyAppTitle();
  cancelTitleEdit();
}

function cancelTitleEdit() {
  elements.brandTitleForm.classList.add("hidden");
  elements.brandTitle.classList.remove("hidden");
  elements.editTitleBtn.classList.remove("hidden");
}

function toggleExportMenu(forceOpen = null) {
  const shouldOpen = forceOpen ?? elements.exportMenu.classList.contains("hidden");
  elements.exportMenu.classList.toggle("hidden", !shouldOpen);
  elements.exportBtn.setAttribute("aria-expanded", String(shouldOpen));
}

function populateSelects() {
  const options = statuses
    .map((status) => `<option value="${status.id}">${status.label}</option>`)
    .join("");

  elements.statusSelect.insertAdjacentHTML("beforeend", options);
  elements.statusInput.innerHTML = options;
  elements.detailStatusSelect.innerHTML = options;
}

function setTodayLabel() {
  elements.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function getFilteredApplications() {
  const query = state.query.trim().toLowerCase();

  const filtered = state.applications.filter((application) => {
    const status = getStatus(application.status);
    const searchable = [
      application.companyName,
      application.positionName,
      application.city,
      application.channel,
      application.notes,
    ]
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (state.statusFilter !== "all" && application.status !== state.statusFilter) return false;

    if (state.navFilter === "active") return !status.closed;
    if (state.navFilter === "follow") return isDue(application);
    if (state.navFilter === "offer") return application.status === "offer";
    if (state.navFilter === "closed") return status.closed;
    return true;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "applied-desc") {
      return (b.appliedDate || "").localeCompare(a.appliedDate || "");
    }

    if (state.sort === "priority-desc") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    }

    if (state.sort === "follow-asc") {
      return (a.nextActionDate || "9999-12-31").localeCompare(
        b.nextActionDate || "9999-12-31",
      );
    }

    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

function renderMetrics() {
  const total = state.applications.length;
  const interview = state.applications.filter((item) => isInterview(item.status)).length;
  const offers = state.applications.filter((item) => item.status === "offer").length;
  const follow = state.applications.filter((item) => isDue(item)).length;

  elements.metricTotal.textContent = total;
  elements.metricInterview.textContent = interview;
  elements.metricOffer.textContent = offers;
  elements.metricFollow.textContent = follow;
}

function renderStatusBoard() {
  const counts = statuses.map((status) => ({
    ...status,
    count: state.applications.filter((item) => item.status === status.id).length,
  }));

  elements.statusBoard.innerHTML = counts
    .filter((status) => status.count > 0)
    .map(
      (status) => `
        <button class="status-chip" type="button" data-chip-status="${status.id}">
          <span>${status.label}</span>
          <strong>${status.count}</strong>
        </button>
      `,
    )
    .join("");
}

function renderList() {
  const applications = getFilteredApplications();

  if (!applications.length) {
    elements.applicationList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⌕</div>
        <h3>没有匹配的投递</h3>
        <p>调整筛选条件，或新增一条记录。</p>
      </div>
    `;
    return;
  }

  elements.applicationList.innerHTML = applications
    .map((application) => {
      const status = getStatus(application.status);
      const isActive = application.id === state.selectedId ? "active" : "";
      const followText = application.nextActionDate
        ? `跟进 ${formatDate(application.nextActionDate)}`
        : "未设跟进";

      return `
        <button class="application-card ${isActive}" type="button" data-application-id="${application.id}">
          <div class="card-main">
            <div class="card-title">
              <h3>${escapeHTML(application.companyName)} · ${escapeHTML(application.positionName)}</h3>
              <p>${escapeHTML(application.city || "未填写城市")} · ${escapeHTML(application.channel || "未填写渠道")}</p>
            </div>
            <span class="badge ${status.id}">${status.label}</span>
          </div>
          <div class="card-meta">
            <span>${getAppliedMeta(application)}</span>
            <span class="${isDue(application) ? "text-warning" : ""}">${followText}</span>
            <span class="badge priority-${application.priority || "medium"}">优先级 ${priorityMap[application.priority] || "中"}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderDetail() {
  const application = state.applications.find((item) => item.id === state.selectedId);

  if (!application) {
    elements.detailEmpty.classList.remove("hidden");
    elements.detailView.classList.add("hidden");
    return;
  }

  elements.detailEmpty.classList.add("hidden");
  elements.detailView.classList.remove("hidden");

  const status = getStatus(application.status);
  elements.detailCompanyMeta.textContent = `${application.city || "未填写城市"} · ${status.label}`;
  elements.detailTitle.textContent = `${application.companyName} · ${application.positionName}`;
  elements.detailStatusSelect.value = application.status;
  elements.detailNextAction.value = application.nextActionDate || "";
  elements.detailChannel.textContent = application.channel || "未填写";
  elements.detailAppliedDate.textContent = getAppliedDetail(application);
  elements.detailPriority.textContent = priorityMap[application.priority] || "中";
  elements.detailResume.textContent = application.resumeVersion || "未填写";
  elements.detailNotesWrap.textContent = application.notes || "";

  const events = [...(application.events || [])].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );
  elements.eventCount.textContent = `${events.length} 条记录`;
  elements.timeline.innerHTML = events.length
    ? events
        .map(
          (event) => `
            <div class="timeline-item">
              <div class="timeline-item-header">
                <h5>${escapeHTML(event.title)}</h5>
                <button class="timeline-delete-button" type="button" data-event-id="${event.id}" title="删除进展记录">×</button>
              </div>
              <p>${eventTypeMap[event.type] || "记录"} · ${formatFullDate(event.date)}</p>
              ${event.description ? `<p>${escapeHTML(event.description)}</p>` : ""}
            </div>
          `,
        )
        .join("")
    : `<p class="card-meta">暂无时间线记录</p>`;
}

function renderStats() {
  const total = state.applications.length;
  const exam = state.applications.filter((item) => item.status === "exam").length;
  const interview = state.applications.filter((item) => isInterview(item.status)).length;
  const offer = state.applications.filter((item) => item.status === "offer").length;
  const rejected = state.applications.filter((item) => item.status === "rejected").length;
  const active = state.applications.filter((item) => !getStatus(item.status).closed).length;

  const rate = (count) => (total ? `${Math.round((count / total) * 100)}%` : "0%");
  elements.statsSummary.textContent = total ? `${active} 个流程仍在推进` : "暂无数据";
  elements.statsGrid.innerHTML = [
    ["笔试率", rate(exam)],
    ["面试率", rate(interview)],
    ["Offer 率", rate(offer)],
    ["拒绝率", rate(rejected)],
  ]
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `,
    )
    .join("");
}

function getCalendarEvents() {
  const events = [];

  state.applications.forEach((application) => {
    const status = getStatus(application.status);
    const company = application.companyName || "未填写公司";
    const position = application.positionName || "未填写岗位";

    if (application.appliedDate && !isNotApplied(application)) {
      events.push({
        date: application.appliedDate,
        type: "applied",
        label: "投递",
        title: `${company} · ${position}`,
        applicationId: application.id,
      });
    }

    if (application.nextActionDate && !status.closed) {
      events.push({
        date: application.nextActionDate,
        type: "follow",
        label: "跟进",
        title: `${company} · ${position}`,
        applicationId: application.id,
      });
    }

    (application.events || []).forEach((event) => {
      if (!event.date) return;
      events.push({
        date: event.date,
        type: "timeline",
        label: eventTypeMap[event.type] || "记录",
        title: `${company} · ${event.title}`,
        applicationId: application.id,
      });
    });
  });

  return events.sort((a, b) => {
    const typeOrder = { follow: 1, applied: 2, timeline: 3 };
    return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
  });
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const firstWeekday = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const startDate = new Date(year, month, 1 - firstWeekday);
  const today = todayISO();

  const eventsByDate = getCalendarEvents().reduce((result, event) => {
    if (!result[event.date]) result[event.date] = [];
    result[event.date].push(event);
    return result;
  }, {});

  elements.calendarTitle.textContent = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(state.calendarDate);

  elements.calendarGrid.innerHTML = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateISO = localDateISO(date);
    const dayEvents = eventsByDate[dateISO] || [];
    const visibleEvents = dayEvents.slice(0, 3);
    const muted = date.getMonth() === month ? "" : "muted";
    const current = dateISO === today ? "today" : "";

    return `
      <article class="calendar-day ${muted} ${current}">
        <div class="calendar-date">
          <span>${date.getDate()}</span>
          ${dayEvents.length ? `<span class="calendar-count">${dayEvents.length} 项</span>` : ""}
        </div>
        ${visibleEvents
          .map(
            (event) => `
              <button class="calendar-event ${event.type}" type="button" data-calendar-application-id="${event.applicationId}">
                ${event.label}｜${escapeHTML(event.title)}
              </button>
            `,
          )
          .join("")}
        ${dayEvents.length > visibleEvents.length ? `<span class="calendar-more">还有 ${dayEvents.length - visibleEvents.length} 项</span>` : ""}
      </article>
    `;
  }).join("");
}

function render() {
  renderMetrics();
  renderStatusBoard();
  renderList();
  renderDetail();
  renderStats();
  renderCalendar();
}

function openApplicationDialog(application = null) {
  const isEdit = Boolean(application);
  elements.dialogTitle.textContent = isEdit ? "编辑投递" : "新增投递";
  elements.applicationId.value = application?.id || "";
  elements.companyInput.value = application?.companyName || "";
  elements.positionInput.value = application?.positionName || "";
  elements.cityInput.value = application?.city || "";
  elements.channelInput.value = application?.channel || "";
  elements.statusInput.value = application?.status || "applied";
  elements.priorityInput.value = application?.priority || "medium";
  elements.appliedDateInput.value = application?.appliedDate || todayISO();
  elements.nextActionInput.value = application?.nextActionDate || "";
  elements.jobUrlInput.value = application?.jobUrl || "";
  elements.salaryInput.value = application?.salaryRange || "";
  elements.resumeInput.value = application?.resumeVersion || "";
  elements.contactInput.value = application?.contactName || "";
  elements.notesInput.value = application?.notes || "";
  elements.applicationDialog.showModal();
  elements.companyInput.focus();
}

function closeApplicationDialog() {
  elements.applicationDialog.close();
  elements.applicationForm.reset();
}

function upsertApplication(event) {
  event.preventDefault();

  const now = new Date().toISOString();
  const id = elements.applicationId.value || generateId();
  const existing = state.applications.find((item) => item.id === id);
  const status = elements.statusInput.value;

  const nextApplication = {
    id,
    companyName: elements.companyInput.value.trim(),
    positionName: elements.positionInput.value.trim(),
    city: elements.cityInput.value.trim(),
    channel: elements.channelInput.value.trim(),
    status,
    priority: elements.priorityInput.value,
    appliedDate: elements.appliedDateInput.value,
    nextActionDate: elements.nextActionInput.value,
    jobUrl: elements.jobUrlInput.value.trim(),
    salaryRange: elements.salaryInput.value.trim(),
    resumeVersion: elements.resumeInput.value.trim(),
    contactName: elements.contactInput.value.trim(),
    notes: elements.notesInput.value.trim(),
    events: existing?.events || [
      {
        id: generateId(),
        type: "create",
        title: `创建投递记录，状态为「${getStatus(status).label}」`,
        date: elements.appliedDateInput.value || todayISO(),
        description: "",
      },
    ],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existing && existing.status !== status) {
    nextApplication.events = [
      ...(existing.events || []),
      {
        id: generateId(),
        type: "status",
        title: `状态从「${getStatus(existing.status).label}」变更为「${getStatus(status).label}」`,
        date: todayISO(),
        description: "",
      },
    ];
  }

  state.applications = existing
    ? state.applications.map((item) => (item.id === id ? nextApplication : item))
    : [nextApplication, ...state.applications];
  state.selectedId = id;
  saveApplications();
  closeApplicationDialog();
  render();
}

function updateSelectedApplication(patch, timelineEvent = null) {
  const now = new Date().toISOString();
  state.applications = state.applications.map((application) => {
    if (application.id !== state.selectedId) return application;
    return {
      ...application,
      ...patch,
      updatedAt: now,
      events: timelineEvent
        ? [...(application.events || []), { id: generateId(), ...timelineEvent }]
        : application.events,
    };
  });
  saveApplications();
  render();
}

function deleteSelectedApplication() {
  const application = state.applications.find((item) => item.id === state.selectedId);
  if (!application) return;

  const confirmed = confirm(`删除「${application.companyName} · ${application.positionName}」？`);
  if (!confirmed) return;

  state.applications = state.applications.filter((item) => item.id !== state.selectedId);
  state.selectedId = state.applications[0]?.id || null;
  saveApplications();
  render();
}

function deleteEventFromSelected(eventId) {
  const application = state.applications.find((item) => item.id === state.selectedId);
  if (!application) return;

  const targetEvent = (application.events || []).find((event) => event.id === eventId);
  if (!targetEvent) return;

  const confirmed = confirm(`删除进展记录「${targetEvent.title}」？`);
  if (!confirmed) return;

  state.applications = state.applications.map((item) =>
    item.id === application.id
      ? {
          ...item,
          updatedAt: new Date().toISOString(),
          events: (item.events || []).filter((event) => event.id !== eventId),
        }
      : item,
  );
  saveApplications();
  render();
}

function addEventToSelected(event) {
  event?.preventDefault();
  const title = elements.eventTitleInput.value.trim();
  const application = state.applications.find((item) => item.id === state.selectedId);

  if (!application) {
    alert("请先选择一条投递记录。");
    return;
  }

  if (!title) {
    alert("请输入进展内容。");
    elements.eventTitleInput.focus();
    return;
  }

  const nextEvent = {
    id: generateId(),
    type: elements.eventTypeSelect.value,
    title,
    date: todayISO(),
    description: "",
  };

  state.applications = state.applications.map((item) =>
    item.id === application.id
      ? {
          ...item,
          updatedAt: new Date().toISOString(),
          events: [...(item.events || []), nextEvent],
        }
      : item,
  );
  saveApplications();
  elements.eventTitleInput.value = "";
  render();
  elements.eventTitleInput.focus();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.applications, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `job-applications-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function excelXML(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return safeText
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function excelCell(value, style = "Cell", type = "String") {
  const content = type === "Number" ? Number(value || 0) : excelXML(value);
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${content}</Data></Cell>`;
}

function excelRow(cells, style = "Cell") {
  return `<Row>${cells.map((cell) => Array.isArray(cell) ? excelCell(...cell) : excelCell(cell, style)).join("")}</Row>`;
}

function excelSheet(name, columns, rows, options = {}) {
  const freeze = options.freezeHeader
    ? `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>`
    : "";

  return `
    <Worksheet ss:Name="${excelXML(name)}">
      <Table>
        ${columns.map((width) => `<Column ss:Width="${width}"/>`).join("")}
        ${rows.join("")}
      </Table>
      ${freeze}
    </Worksheet>
  `;
}

function countBy(items, getKey) {
  return items.reduce((result, item) => {
    const key = getKey(item) || "未填写";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function percentage(count, total) {
  return total ? `${Math.round((count / total) * 100)}%` : "0%";
}

function barText(count, total) {
  const blocks = total ? Math.max(1, Math.round((count / total) * 12)) : 0;
  return `${"█".repeat(blocks)} ${percentage(count, total)}`;
}

function statusExcelStyle(statusId) {
  if (statusId === "offer") return "StatusOffer";
  if (statusId === "rejected") return "StatusRejected";
  if (["interview1", "interview2", "interview3", "hr"].includes(statusId)) return "StatusInterview";
  if (statusId === "exam") return "StatusExam";
  if (["silent", "closed"].includes(statusId)) return "StatusClosed";
  return "StatusApplied";
}

function priorityExcelStyle(priority) {
  if (priority === "high") return "PriorityHigh";
  if (priority === "low") return "PriorityLow";
  return "PriorityMedium";
}

function normalizeStatusLabel(label) {
  const text = String(label || "").trim();
  const byLabel = statuses.find((status) => status.label === text);
  if (byLabel) return byLabel.id;

  const aliases = {
    未投递: "todo",
    待投: "todo",
    投递: "applied",
    面试: "interview1",
    一面: "interview1",
    二面: "interview2",
    三面: "interview3",
    HR: "hr",
    HR面: "hr",
    拒绝: "rejected",
    结束: "closed",
  };

  return aliases[text] || "applied";
}

function normalizePriorityLabel(label) {
  const text = String(label || "").trim();
  if (text === "高" || text.toLowerCase() === "high") return "high";
  if (text === "低" || text.toLowerCase() === "low") return "low";
  return "medium";
}

function buildOverviewSheet() {
  const total = state.applications.length;
  const active = state.applications.filter((item) => !getStatus(item.status).closed).length;
  const interview = state.applications.filter((item) => isInterview(item.status)).length;
  const offer = state.applications.filter((item) => item.status === "offer").length;
  const follow = state.applications.filter((item) => isDue(item)).length;
  const statusCounts = statuses
    .map((status) => ({ label: status.label, count: state.applications.filter((item) => item.status === status.id).length }))
    .filter((item) => item.count > 0);
  const channelCounts = Object.entries(countBy(state.applications, (item) => item.channel));
  const cityCounts = Object.entries(countBy(state.applications, (item) => item.city));

  const rows = [
    excelRow([["秋招投递复盘概览", "Title"], ["导出日期", "Muted"], [todayISO(), "Muted"]]),
    excelRow([]),
    excelRow([["核心指标", "Section"], ["数量", "Section"], ["说明", "Section"]]),
    excelRow([["总投递", "MetricLabel"], [total, "MetricNumber", "Number"], ["全部公司投递记录", "Cell"]]),
    excelRow([["进行中", "MetricLabel"], [active, "MetricNumber", "Number"], ["仍未结束的流程", "Cell"]]),
    excelRow([["面试中", "MetricLabel"], [interview, "MetricNumber", "Number"], ["一面、二面、三面和 HR 面", "Cell"]]),
    excelRow([["Offer", "MetricLabel"], [offer, "MetricNumber", "Number"], [`Offer 率 ${percentage(offer, total)}`, "Cell"]]),
    excelRow([["待跟进", "MetricLabel"], [follow, "MetricNumber", "Number"], ["跟进日期已到且流程未结束", "Cell"]]),
    excelRow([]),
    excelRow([["状态分布", "Section"], ["数量", "Section"], ["占比", "Section"]]),
    ...statusCounts.map((item) => excelRow([[item.label, "Cell"], [item.count, "NumberCell", "Number"], [barText(item.count, total), "Bar"]])),
    excelRow([]),
    excelRow([["渠道分布", "Section"], ["数量", "Section"], ["占比", "Section"]]),
    ...channelCounts.map(([channel, count]) => excelRow([[channel, "Cell"], [count, "NumberCell", "Number"], [barText(count, total), "Bar"]])),
    excelRow([]),
    excelRow([["城市分布", "Section"], ["数量", "Section"], ["占比", "Section"]]),
    ...cityCounts.map(([city, count]) => excelRow([[city, "Cell"], [count, "NumberCell", "Number"], [barText(count, total), "Bar"]])),
  ];

  return excelSheet("概览", [160, 80, 280], rows);
}

function buildApplicationsSheet() {
  const header = excelRow([
    ["公司", "Header"],
    ["岗位", "Header"],
    ["城市", "Header"],
    ["渠道", "Header"],
    ["状态", "Header"],
    ["优先级", "Header"],
    ["投递日期", "Header"],
    ["下次跟进", "Header"],
    ["薪资范围", "Header"],
    ["简历版本", "Header"],
    ["联系人", "Header"],
    ["备注", "Header"],
    ["JD 链接", "Header"],
  ]);

  const rows = state.applications.map((application) =>
    excelRow([
      [application.companyName, "Company"],
      [application.positionName, "Cell"],
      [application.city, "Cell"],
      [application.channel, "Cell"],
      [getStatus(application.status).label, statusExcelStyle(application.status)],
      [priorityMap[application.priority] || "中", priorityExcelStyle(application.priority)],
      [application.appliedDate, "Date"],
      [application.nextActionDate || "未设置", isDue(application) ? "Due" : "Date"],
      [application.salaryRange, "Cell"],
      [application.resumeVersion, "Cell"],
      [application.contactName, "Cell"],
      [application.notes, "Wrap"],
      [application.jobUrl, "Link"],
    ]),
  );

  return excelSheet("投递记录", [120, 150, 80, 90, 90, 70, 90, 90, 90, 100, 100, 260, 220], [header, ...rows], { freezeHeader: true });
}

function buildTimelineSheet() {
  const header = excelRow([
    ["日期", "Header"],
    ["公司", "Header"],
    ["岗位", "Header"],
    ["类型", "Header"],
    ["进展标题", "Header"],
    ["描述", "Header"],
  ]);

  const rows = state.applications
    .flatMap((application) =>
      (application.events || []).map((event) => ({
        application,
        event,
      })),
    )
    .sort((a, b) => (b.event.date || "").localeCompare(a.event.date || ""))
    .map(({ application, event }) =>
      excelRow([
        [event.date, "Date"],
        [application.companyName, "Company"],
        [application.positionName, "Cell"],
        [eventTypeMap[event.type] || "记录", "Cell"],
        [event.title, "Wrap"],
        [event.description, "Wrap"],
      ]),
    );

  return excelSheet("时间线", [90, 120, 150, 80, 260, 260], [header, ...rows], { freezeHeader: true });
}

function buildExcelWorkbook() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>${excelXML(state.settings.appTitle || DEFAULT_APP_TITLE)}</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Size="11"/></Style>
    <Style ss:ID="Cell"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="Wrap"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17202A" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F766E"/></Borders></Style>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="20" ss:Color="#0F172A"/></Style>
    <Style ss:ID="Section"><Font ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#E7F4F2" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Muted"><Font ss:Color="#64748B"/></Style>
    <Style ss:ID="MetricLabel"><Font ss:Bold="1" ss:Color="#334155"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="MetricNumber"><Font ss:Bold="1" ss:Size="16" ss:Color="#0F766E"/><Interior ss:Color="#F0FDFA" ss:Pattern="Solid"/></Style>
    <Style ss:ID="NumberCell"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="Bar"><Font ss:Color="#0F766E" ss:Bold="1"/></Style>
    <Style ss:ID="Company"><Font ss:Bold="1" ss:Color="#0F172A"/></Style>
    <Style ss:ID="Date"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Color="#475569"/></Style>
    <Style ss:ID="Due"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#B45309"/><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Link"><Font ss:Color="#2563EB" ss:Underline="Single"/></Style>
    <Style ss:ID="StatusApplied"><Font ss:Bold="1" ss:Color="#1D4ED8"/><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusExam"><Font ss:Bold="1" ss:Color="#6D28D9"/><Interior ss:Color="#EDE9FE" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusInterview"><Font ss:Bold="1" ss:Color="#C2410C"/><Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusOffer"><Font ss:Bold="1" ss:Color="#15803D"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusRejected"><Font ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusClosed"><Font ss:Bold="1" ss:Color="#475569"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
    <Style ss:ID="PriorityHigh"><Font ss:Bold="1" ss:Color="#991B1B"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
    <Style ss:ID="PriorityMedium"><Font ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="PriorityLow"><Font ss:Bold="1" ss:Color="#166534"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/></Style>
  </Styles>
  ${buildOverviewSheet()}
  ${buildApplicationsSheet()}
  ${buildTimelineSheet()}
</Workbook>`;
}

function exportExcel() {
  const blob = new Blob(["\ufeff", buildExcelWorkbook()], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `job-applications-report-${todayISO()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function getWorksheetByName(xmlDocument, sheetName) {
  const worksheets = [...xmlDocument.getElementsByTagName("Worksheet")];
  return worksheets.find((sheet) => sheet.getAttribute("ss:Name") === sheetName || sheet.getAttribute("Name") === sheetName);
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];
  return [...worksheet.getElementsByTagName("Row")].map((row) =>
    [...row.getElementsByTagName("Cell")].map((cell) => {
      const data = cell.getElementsByTagName("Data")[0];
      return (data?.textContent || "").trim();
    }),
  );
}

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) =>
    headers.reduce((result, header, index) => {
      result[header] = row[index] || "";
      return result;
    }, {}),
  );
}

function parseExcelApplications(text) {
  const xmlDocument = new DOMParser().parseFromString(text.replace(/^\ufeff/, ""), "text/xml");
  const parserError = xmlDocument.getElementsByTagName("parsererror")[0];
  if (parserError) throw new Error("Invalid Excel XML");

  const applicationRows = rowsToObjects(worksheetToRows(getWorksheetByName(xmlDocument, "投递记录")));
  if (!applicationRows.length) throw new Error("Missing applications sheet");

  const now = new Date().toISOString();
  const applications = applicationRows.map((row) => {
    const status = normalizeStatusLabel(row["状态"]);
    return {
      id: generateId(),
      companyName: row["公司"] || "未填写公司",
      positionName: row["岗位"] || "未填写岗位",
      city: row["城市"] || "",
      channel: row["渠道"] || "",
      status,
      priority: normalizePriorityLabel(row["优先级"]),
      appliedDate: status === "todo" ? "" : row["投递日期"],
      nextActionDate: row["下次跟进"] === "未设置" ? "" : row["下次跟进"],
      jobUrl: row["JD 链接"] || "",
      salaryRange: row["薪资范围"] || "",
      resumeVersion: row["简历版本"] || "",
      contactName: row["联系人"] || "",
      notes: row["备注"] || "",
      events: [],
      createdAt: now,
      updatedAt: now,
    };
  });

  const applicationByKey = new Map(
    applications.map((application) => [
      `${application.companyName}||${application.positionName}`,
      application,
    ]),
  );

  const timelineRows = rowsToObjects(worksheetToRows(getWorksheetByName(xmlDocument, "时间线")));
  timelineRows.forEach((row) => {
    const application = applicationByKey.get(`${row["公司"]}||${row["岗位"]}`);
    if (!application) return;
    const type = Object.entries(eventTypeMap).find(([, label]) => label === row["类型"])?.[0] || "note";
    application.events.push({
      id: generateId(),
      type,
      title: row["进展标题"] || "导入的进展记录",
      date: row["日期"] || todayISO(),
      description: row["描述"] || "",
    });
  });

  applications.forEach((application) => {
    if (application.events.length) return;
    application.events.push({
      id: generateId(),
      type: "create",
      title: `导入投递记录，状态为「${getStatus(application.status).label}」`,
      date: application.appliedDate || todayISO(),
      description: "",
    });
  });

  return applications;
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const isJson = file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("[");
      const parsed = isJson ? JSON.parse(text) : parseExcelApplications(text);
      if (!Array.isArray(parsed)) throw new Error("Invalid data");
      state.applications = parsed;
      state.selectedId = parsed[0]?.id || null;
      saveApplications();
      render();
    } catch {
      alert("导入失败，请选择由本应用导出的 JSON 或 Excel .xls 文件。");
    }
  };
  reader.readAsText(file);
}

function makeEvent(type, title, date, description = "") {
  return {
    id: generateId(),
    type,
    title,
    date,
    description,
  };
}

function createSampleApplications() {
  const now = new Date().toISOString();
  const samples = [
    {
      companyName: "腾讯",
      positionName: "前端开发工程师",
      city: "深圳",
      channel: "官网",
      status: "interview2",
      priority: "high",
      appliedDate: "2026-05-01",
      nextActionDate: "2026-05-18",
      jobUrl: "https://careers.tencent.com",
      salaryRange: "25k-35k",
      resumeVersion: "前端-v3",
      contactName: "校招 HR",
      notes: "重点岗位，二面前复习浏览器原理、React 性能优化和项目难点。",
      events: [
        makeEvent("create", "创建投递记录，状态为「已投递」", "2026-05-01"),
        makeEvent("exam", "完成在线笔试", "2026-05-05", "算法 2 题，前端基础 20 题。"),
        makeEvent("interview", "完成一面", "2026-05-10", "追问项目架构和组件封装。"),
        makeEvent("follow", "等待二面反馈", "2026-05-15"),
      ],
    },
    {
      companyName: "字节跳动",
      positionName: "后端开发工程师",
      city: "北京",
      channel: "内推",
      status: "exam",
      priority: "high",
      appliedDate: "2026-05-03",
      nextActionDate: "2026-05-17",
      jobUrl: "https://jobs.bytedance.com",
      salaryRange: "28k-40k",
      resumeVersion: "后端-v2",
      contactName: "内推同学",
      notes: "笔试前重点看数据库索引、缓存一致性和并发控制。",
      events: [
        makeEvent("create", "通过内推投递", "2026-05-03"),
        makeEvent("exam", "收到笔试邀请", "2026-05-12", "牛客平台，90 分钟。"),
      ],
    },
    {
      companyName: "美团",
      positionName: "产品经理",
      city: "上海",
      channel: "Boss",
      status: "screening",
      priority: "medium",
      appliedDate: "2026-05-04",
      nextActionDate: "2026-05-19",
      jobUrl: "https://campus.meituan.com",
      salaryRange: "18k-26k",
      resumeVersion: "产品-v1",
      contactName: "招聘专员",
      notes: "准备本地生活业务分析，补充竞品调研案例。",
      events: [
        makeEvent("create", "提交产品经理岗位", "2026-05-04"),
        makeEvent("status", "状态变更为「简历筛选」", "2026-05-08"),
      ],
    },
    {
      companyName: "阿里云",
      positionName: "云计算研发工程师",
      city: "杭州",
      channel: "官网",
      status: "hr",
      priority: "high",
      appliedDate: "2026-04-28",
      nextActionDate: "2026-05-20",
      jobUrl: "https://talent.alibaba.com",
      salaryRange: "26k-38k",
      resumeVersion: "后端-v2",
      contactName: "阿里云 HR",
      notes: "技术面反馈较好，HR 面关注城市意向、实习经历和薪资预期。",
      events: [
        makeEvent("create", "官网投递云计算研发", "2026-04-28"),
        makeEvent("interview", "完成一面", "2026-05-06"),
        makeEvent("interview", "完成二面", "2026-05-13", "系统设计题：秒杀库存扣减。"),
        makeEvent("follow", "预约 HR 面", "2026-05-15"),
      ],
    },
    {
      companyName: "米哈游",
      positionName: "游戏客户端开发",
      city: "上海",
      channel: "官网",
      status: "applied",
      priority: "medium",
      appliedDate: "2026-05-11",
      nextActionDate: "2026-05-21",
      jobUrl: "https://jobs.mihoyo.com",
      salaryRange: "22k-32k",
      resumeVersion: "客户端-v1",
      contactName: "校招邮箱",
      notes: "补充 Unity 项目亮点，准备图形学基础。",
      events: [
        makeEvent("create", "提交客户端开发岗位", "2026-05-11"),
        makeEvent("note", "更新作品集链接", "2026-05-12"),
      ],
    },
    {
      companyName: "小红书",
      positionName: "数据分析师",
      city: "上海",
      channel: "拉勾",
      status: "interview1",
      priority: "medium",
      appliedDate: "2026-05-02",
      nextActionDate: "2026-05-16",
      jobUrl: "https://job.xiaohongshu.com",
      salaryRange: "20k-30k",
      resumeVersion: "数据分析-v2",
      contactName: "业务 HR",
      notes: "一面准备增长指标体系、A/B 实验和 SQL 窗口函数。",
      events: [
        makeEvent("create", "投递数据分析岗位", "2026-05-02"),
        makeEvent("interview", "收到一面邀请", "2026-05-14", "视频面试。"),
      ],
    },
    {
      companyName: "快手",
      positionName: "测试开发工程师",
      city: "北京",
      channel: "内推",
      status: "offer",
      priority: "high",
      appliedDate: "2026-04-20",
      nextActionDate: "",
      jobUrl: "https://zhaopin.kuaishou.cn",
      salaryRange: "24k-34k",
      resumeVersion: "测试开发-v2",
      contactName: "快手 HR",
      notes: "已收到 Offer，待比较薪资、城市和成长空间。",
      events: [
        makeEvent("create", "内推投递测试开发", "2026-04-20"),
        makeEvent("exam", "完成笔试", "2026-04-24"),
        makeEvent("interview", "完成终面", "2026-05-08"),
        makeEvent("result", "收到 Offer", "2026-05-12", "等待书面 offer。"),
      ],
    },
    {
      companyName: "华为",
      positionName: "软件开发工程师",
      city: "南京",
      channel: "官网",
      status: "rejected",
      priority: "medium",
      appliedDate: "2026-04-18",
      nextActionDate: "",
      jobUrl: "https://career.huawei.com",
      salaryRange: "20k-30k",
      resumeVersion: "通用-v1",
      contactName: "招聘系统",
      notes: "笔试后未进入面试，复盘算法题速度不足。",
      events: [
        makeEvent("create", "官网投递软件开发", "2026-04-18"),
        makeEvent("exam", "完成机试", "2026-04-22"),
        makeEvent("result", "收到流程结束通知", "2026-04-29"),
      ],
    },
    {
      companyName: "网易",
      positionName: "交互设计师",
      city: "广州",
      channel: "官网",
      status: "silent",
      priority: "low",
      appliedDate: "2026-04-26",
      nextActionDate: "",
      jobUrl: "https://hr.163.com",
      salaryRange: "16k-24k",
      resumeVersion: "设计-v1",
      contactName: "官网系统",
      notes: "投递后暂无反馈，可作为低优先级备选。",
      events: [
        makeEvent("create", "提交交互设计岗位", "2026-04-26"),
        makeEvent("follow", "一周未收到反馈", "2026-05-03"),
      ],
    },
    {
      companyName: "蔚来",
      positionName: "嵌入式软件工程师",
      city: "合肥",
      channel: "猎头",
      status: "closed",
      priority: "low",
      appliedDate: "2026-04-15",
      nextActionDate: "",
      jobUrl: "https://nio.jobs",
      salaryRange: "18k-28k",
      resumeVersion: "嵌入式-v1",
      contactName: "猎头顾问",
      notes: "岗位方向与个人规划匹配度一般，已主动结束流程。",
      events: [
        makeEvent("create", "猎头推荐嵌入式岗位", "2026-04-15"),
        makeEvent("interview", "完成电话沟通", "2026-04-19"),
        makeEvent("result", "主动结束流程", "2026-04-23"),
      ],
    },
  ];

  return samples.map((sample, index) => ({
    id: generateId(),
    ...sample,
    createdAt: new Date(Date.parse(now) - (samples.length - index) * 3600000).toISOString(),
    updatedAt: new Date(Date.parse(now) - index * 1800000).toISOString(),
  }));
}

function seedSampleApplicationsIfNeeded() {
  if (state.applications.length || localStorage.getItem(SEED_KEY)) return;
  state.applications = createSampleApplications();
  state.selectedId = state.applications[0]?.id || null;
  saveApplications();
  localStorage.setItem(SEED_KEY, "true");
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  elements.editTitleBtn.addEventListener("click", startTitleEdit);
  elements.saveTitleBtn.addEventListener("click", saveTitleEdit);
  elements.cancelTitleBtn.addEventListener("click", cancelTitleEdit);
  elements.brandTitleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveTitleEdit();
    if (event.key === "Escape") cancelTitleEdit();
  });

  elements.addApplicationBtn.addEventListener("click", () => openApplicationDialog());
  elements.emptyAddBtn.addEventListener("click", () => openApplicationDialog());
  elements.closeDialogBtn.addEventListener("click", closeApplicationDialog);
  elements.cancelDialogBtn.addEventListener("click", closeApplicationDialog);
  elements.applicationForm.addEventListener("submit", upsertApplication);
  elements.exportBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleExportMenu();
  });
  elements.exportJsonBtn.addEventListener("click", () => {
    exportData();
    toggleExportMenu(false);
  });
  elements.exportExcelBtn.addEventListener("click", () => {
    exportExcel();
    toggleExportMenu(false);
  });
  document.addEventListener("click", (event) => {
    if (elements.exportMenu.classList.contains("hidden")) return;
    const clickedInsideMenu = elements.exportMenu.contains(event.target);
    const clickedExportButton = elements.exportBtn.contains(event.target);
    if (!clickedInsideMenu && !clickedExportButton) toggleExportMenu(false);
  });
  elements.importInput.addEventListener("change", (event) => importData(event.target.files[0]));

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderList();
  });

  elements.statusSelect.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderList();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderList();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.navFilter = button.dataset.statusFilter;
      renderList();
    });
  });

  elements.applicationList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-application-id]");
    if (!card) return;
    state.selectedId = card.dataset.applicationId;
    render();
  });

  elements.statusBoard.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-chip-status]");
    if (!chip) return;
    state.statusFilter = chip.dataset.chipStatus;
    elements.statusSelect.value = state.statusFilter;
    renderList();
  });

  elements.calendarGrid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-calendar-application-id]");
    if (!item) return;
    state.selectedId = item.dataset.calendarApplicationId;
    render();
    elements.detailView.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.prevMonthBtn.addEventListener("click", () => {
    state.calendarDate = new Date(
      state.calendarDate.getFullYear(),
      state.calendarDate.getMonth() - 1,
      1,
    );
    renderCalendar();
  });

  elements.currentMonthBtn.addEventListener("click", () => {
    state.calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    renderCalendar();
  });

  elements.nextMonthBtn.addEventListener("click", () => {
    state.calendarDate = new Date(
      state.calendarDate.getFullYear(),
      state.calendarDate.getMonth() + 1,
      1,
    );
    renderCalendar();
  });

  elements.editApplicationBtn.addEventListener("click", () => {
    const application = state.applications.find((item) => item.id === state.selectedId);
    if (application) openApplicationDialog(application);
  });

  elements.deleteApplicationBtn.addEventListener("click", deleteSelectedApplication);
  elements.timeline.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-event-id]");
    if (!deleteButton) return;
    deleteEventFromSelected(deleteButton.dataset.eventId);
  });

  elements.detailStatusSelect.addEventListener("change", (event) => {
    const application = state.applications.find((item) => item.id === state.selectedId);
    if (!application) return;
    const nextStatus = event.target.value;
    updateSelectedApplication(
      { status: nextStatus },
      {
        type: "status",
        title: `状态从「${getStatus(application.status).label}」变更为「${getStatus(nextStatus).label}」`,
        date: todayISO(),
        description: "",
      },
    );
  });

  elements.detailNextAction.addEventListener("change", (event) => {
    updateSelectedApplication(
      { nextActionDate: event.target.value },
      {
        type: "follow",
        title: event.target.value
          ? `设置跟进日期：${formatFullDate(event.target.value)}`
          : "清除跟进日期",
        date: todayISO(),
        description: "",
      },
    );
  });

  elements.addEventBtn.addEventListener("click", addEventToSelected);
  elements.eventTitleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addEventToSelected(event);
  });
}

function init() {
  state.settings = loadSettings();
  applyAppTitle();
  setTodayLabel();
  populateSelects();
  state.applications = loadApplications();
  seedSampleApplicationsIfNeeded();
  state.selectedId = state.applications[0]?.id || null;
  bindEvents();
  render();
}

init();
