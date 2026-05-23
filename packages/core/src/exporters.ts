import { getEventTypeLabel, getPriorityLabel, getStatus } from "./constants";
import { todayISO } from "./date";
import type { Application } from "./types";

function escapeXML(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cell(value: unknown, style = "Cell") {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXML(value)}</Data></Cell>`;
}

function row(values: Array<unknown | [unknown, string]>) {
  return `<Row>${values.map((value) => Array.isArray(value) ? cell(value[0], value[1]) : cell(value)).join("")}</Row>`;
}

export function exportApplicationsJSON(applications: Application[]) {
  return JSON.stringify(applications, null, 2);
}

export function exportApplicationsExcel(applications: Application[], title = "秋招投递助手") {
  const applicationRows = applications.map((application) =>
    row([
      [application.company_name, "Strong"],
      application.position_name,
      application.city,
      application.channel,
      [getStatus(application.status).label, "Status"],
      getPriorityLabel(application.priority),
      application.status === "todo" ? "尚未投递" : application.applied_date,
      application.next_action_date,
      application.salary_range,
      application.resume_version,
      application.contact_name,
      application.notes,
      application.job_url
    ])
  );

  const eventRows = applications.flatMap((application) =>
    (application.events ?? []).map((event) =>
      row([
        event.event_date,
        [application.company_name, "Strong"],
        application.position_name,
        getEventTypeLabel(event.type),
        event.title,
        event.description
      ])
    )
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Cell"><Font ss:FontName="Microsoft YaHei" ss:Size="11"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17202A" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Strong"><Font ss:Bold="1" ss:Color="#0F172A"/></Style>
    <Style ss:ID="Status"><Font ss:Bold="1" ss:Color="#0F766E"/><Interior ss:Color="#E7F4F2" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="概览">
    <Table>
      ${row([[title, "Strong"], "导出日期", todayISO()])}
      ${row(["总投递", applications.length, "Offer", applications.filter((item) => item.status === "offer").length])}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="投递记录">
    <Table>
      ${row([
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
        ["JD 链接", "Header"]
      ])}
      ${applicationRows.join("")}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="时间线">
    <Table>
      ${row([["日期", "Header"], ["公司", "Header"], ["岗位", "Header"], ["类型", "Header"], ["标题", "Header"], ["描述", "Header"]])}
      ${eventRows.join("")}
    </Table>
  </Worksheet>
</Workbook>`;
}
