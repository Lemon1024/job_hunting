# Spec：秋招投递助手（Job Hunting Tracker）

> 文档状态：已实现，待数据库部署与人工验收
> 基线版本：v0.2.0  
> 最后核验日期：2026-07-25  
> 适用范围：整个 `job_hunting` pnpm monorepo

## 1. Objective

### 1.1 产品目标

秋招投递助手面向需要同时跟踪多家公司、多岗位和多轮招聘流程的个人求职者。产品通过桌面端和移动端共享同一套 Supabase 数据，使用户能够持续记录投递信息、招聘进展、下一次行动日期和结果，并在不同设备间查看同一份进度。

产品成功意味着用户可以：

1. 使用邮箱和密码安全地访问仅属于自己的投递数据。
2. 从待投递到招聘结束，完整记录一条申请的状态、元数据和时间线。
3. 快速识别正在进行、需要跟进、进入面试、获得 Offer 或已经结束的申请。
4. 在桌面端和移动端读取一致的云端数据。
5. 在桌面端导入或导出数据，降低数据被应用锁定的风险。

### 1.2 目标用户

- 主要用户：参加校园招聘、实习招聘或社会招聘的个人求职者。
- 使用方式：单用户账号管理自己的数据；本基线不包含团队协作、招聘方后台或公开分享。
- 默认语言：简体中文；代码标识符、数据库字段和命令保持英文。

### 1.3 v0.1 范围

本规格记录 v0.1 现状，并约束已批准的 v0.2 投递工作台改造。v0.2 的新增范围见第 15 节；未列入该节的能力仍不授权实施。

范围内：

- Tauri 桌面应用及其 Vite Web 开发表面。
- Expo/React Native 移动应用，当前发布目标以 Android 为主。
- `@job-tracker/core` 共享类型与业务逻辑。
- 桌面端和移动端各自维护平台设计令牌，共享业务约束仍集中在 `@job-tracker/core`。
- Supabase Auth、PostgreSQL schema、RLS 和云端同步。
- 桌面端数据导入、导出与本地标题设置。

范围外：

- 团队协作、消息通知、职位抓取、AI 匹配和招聘平台集成。
- 离线写入队列及冲突合并。
- iOS 发布承诺；配置允许 iOS 构建，但当前没有验收基线。
- v0.2 未明确授权的代码、依赖、数据库或 CI 修改。

## 2. Product Requirements

### 2.1 认证与会话

**FR-AUTH-01** 用户可以用邮箱和密码注册。认证由 Supabase Auth 提供。

**FR-AUTH-02** 已注册用户可以用邮箱和密码登录；认证失败时必须显示错误，且不得加载其他用户的数据。

**FR-AUTH-03** 用户可以退出登录。退出后受保护的应用界面和数据不得继续可见。

**FR-AUTH-04** 桌面端应监听 Supabase 认证状态；移动端应使用 `AsyncStorage` 持久化会话并自动刷新 token。

**FR-AUTH-05** 所有业务查询和写入均受数据库 RLS 保护。客户端持有的 `anon`/publishable key 不是数据隔离边界，`auth.uid()` 才是授权依据。

### 2.2 投递记录

**FR-APP-01** 已登录用户可以创建投递记录。`company_name` 与 `position_name` 必填；可选字段包括城市、渠道、投递日期、下次跟进日期、JD 链接、薪资范围、简历版本、联系人、联系信息和备注。

**FR-APP-02** 新记录默认优先级为 `medium`。UI 默认状态为 `applied`；数据库默认状态同样为 `applied`。

**FR-APP-03** 状态为 `todo` 时，`applied_date` 必须为 `null`。状态从 `todo` 变为其他状态且没有投递日期时，客户端使用当天日期。

**FR-APP-04** 用户可以编辑自己的投递记录。字符串输入保存前应去除首尾空白；空的可选字符串应转为 `null`。

**FR-APP-05** 桌面端允许用户删除自己的投递记录。数据库删除申请时必须级联删除关联事件。

**FR-APP-06** 投递状态严格限制为以下 12 个值：

| ID | 中文标签 | 是否结束 |
|---|---|---:|
| `todo` | 待投递 | 否 |
| `applied` | 已投递 | 否 |
| `screening` | 简历筛选 | 否 |
| `exam` | 笔试 | 否 |
| `interview1` | 一面 | 否 |
| `interview2` | 二面 | 否 |
| `interview3` | 三面 | 否 |
| `hr` | HR 面 | 否 |
| `offer` | Offer | 是 |
| `rejected` | 已拒绝 | 是 |
| `silent` | 无回应 | 是 |
| `closed` | 已结束 | 是 |

**FR-APP-07** 优先级严格限制为 `high`、`medium`、`low`。

### 2.3 进展事件与状态变化

**FR-EVENT-01** 用户可以为自己的申请创建进展事件，事件包含类型、标题、可选描述和事件日期。

**FR-EVENT-02** 事件类型严格限制为 `note`、`exam`、`interview`、`follow`、`result`、`status`、`create`。

**FR-EVENT-03** 创建投递记录时，客户端同时创建一条 `create` 事件。桌面端改变申请状态时，客户端创建一条描述前后状态的 `status` 事件。

**FR-EVENT-04** 用户可以删除自己的事件。事件默认按 `event_date` 降序显示。

**FR-EVENT-05** 数据库插入事件时必须同时验证 `user_id` 属于当前用户，且目标申请也属于当前用户。

### 2.4 仪表盘与计算规则

以下指标由 `@job-tracker/core` 统一计算：

| 指标 | 规则 |
|---|---|
| `total` | 申请总数 |
| `active` | 状态未标记为结束的申请数 |
| `interview` | 状态为 `interview1`、`interview2`、`interview3` 或 `hr` 的申请数 |
| `offer` | 状态为 `offer` 的申请数 |
| `follow` | `next_action_date <= 今天` 且状态未结束的申请数 |
| `rejected` | 状态为 `rejected` 的申请数 |
| `offerRate` | `offer / total` 四舍五入为整数百分比；无数据时为 0 |
| `interviewRate` | `interview / total` 四舍五入为整数百分比；无数据时为 0 |

### 2.5 搜索、筛选与排序

**FR-DISCOVER-01** 桌面端搜索覆盖公司、岗位、城市和渠道，忽略大小写。

**FR-DISCOVER-02** 桌面端支持全部、进行中、待跟进、Offer、已结束导航筛选，支持按具体状态筛选。

**FR-DISCOVER-03** 桌面端支持最近更新、投递时间、优先级和跟进时间排序。

**FR-DISCOVER-04** 移动端支持文本搜索，以及按状态、优先级、城市和渠道筛选。

### 2.6 日历

**FR-CALENDAR-01** 非 `todo` 申请的 `applied_date` 映射为投递日历项。

**FR-CALENDAR-02** 未结束申请的 `next_action_date` 映射为跟进日历项。

**FR-CALENDAR-03** 每条申请事件映射为时间线日历项。所有日历项按日期升序排列。

### 2.7 桌面端专属能力

**FR-DESKTOP-01** 用户可以将全部已加载申请导出为格式化 JSON。

**FR-DESKTOP-02** 用户可以导出 Excel 2003 XML 格式的 `.xls` 文件，包含概览、投递记录和时间线工作表。

**FR-DESKTOP-03** 用户可以导入 JSON 数组，或包含 `applications` 数组的对象。缺少公司或岗位的行应跳过；合法行逐条创建申请和 `create` 事件。

**FR-DESKTOP-04** 非法 JSON 或导入失败必须显示错误，不得把文件内容当作可执行内容。

**FR-DESKTOP-05** 用户可以修改本机显示的应用标题。标题保存在 `localStorage` 的 `autumn-job-tracker:desktop-settings:v1` 键中，不在设备间同步。

### 2.8 移动端界面基线

移动端包含登录、仪表盘、申请详情、新增/编辑申请、日历和个人中心界面。底部导航承载主要入口，申请详情和编辑页位于仪表盘导航栈。个人中心提供退出登录。

## 3. Data and Public Interfaces

### 3.1 TypeScript 公共类型

`@job-tracker/core` 是跨端业务契约的唯一来源：

- `ApplicationStatus`、`Priority`、`EventType`：分别从只读常量数组推导的联合类型。
- `Profile`：用户显示名称和审计时间。
- `Application`：完整申请记录，可选携带 `events`。
- `ApplicationEvent`：申请进展记录。
- `ApplicationInput`：排除服务端生成字段和嵌套事件的申请写入输入。
- `EventInput`：排除服务端生成字段的事件写入输入。
- `DashboardMetrics`：仪表盘聚合指标。
- `CalendarItem`：跨端日历展示项。

共享服务接口包括：

- `listApplications`
- `createApplication`
- `updateApplication`
- `deleteApplication`
- `createEvent`
- `deleteEvent`
- `calculateMetrics`
- `buildCalendarItems`
- `exportApplicationsJSON`
- `exportApplicationsExcel`

本规格不修改这些接口。

### 3.2 数据库模型

数据库由 `profiles`、`applications` 和 `application_events` 三张表组成：

- `profiles.id` 一对一引用 `auth.users.id`。
- `applications.user_id` 引用用户；用户删除时申请级联删除。
- `application_events.application_id` 引用申请；申请删除时事件级联删除。
- `applications.updated_at` 与 `profiles.updated_at` 由数据库 trigger 更新。
- 关键访问路径按用户和更新时间、状态、跟进日期或事件日期建立索引。

### 3.3 跨层一致性约束

以下值必须同步变更，不允许只修改一层：

1. `APPLICATION_STATUSES` 与 PostgreSQL `application_status` enum。
2. `PRIORITIES` 与 PostgreSQL `application_priority` enum。
3. `EVENT_TYPES` 与 PostgreSQL `application_event_type` enum。
4. TypeScript 接口字段与 Supabase 表字段、空值能力和日期格式。

所有业务日期使用 `YYYY-MM-DD`；审计时间使用 Supabase/PostgreSQL 返回的 ISO 时间戳。

## 4. Tech Stack

| 层级 | 技术与当前版本约束 |
|---|---|
| Monorepo | pnpm 9.12.0 workspace，`node-linker=hoisted` |
| 语言 | TypeScript 5.6，严格模式，目标 ES2022 |
| 桌面 UI | React 18.3、Vite 5.4、Tauri 2.1 |
| Tauri 后端 | Rust，Tauri v2，Windows NSIS bundle |
| 移动端 | Expo SDK 52、React Native 0.76.9、React 18.3 |
| 移动导航 | React Navigation 7 |
| 数据与认证 | Supabase JS 2.46、PostgreSQL、Supabase Auth、RLS |
| Android | compileSdk/targetSdk 35、Kotlin 1.9.25、EAS Build |

依赖版本以各 `package.json`、`Cargo.toml` 和锁文件为准。本表用于说明架构，不替代锁文件。

## 5. Environment and Security

本地开发需要从 `.env.example` 创建未跟踪的环境文件并设置：

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- 这些变量会进入客户端包，只允许使用 Supabase `anon`/publishable key。
- `service_role` key、数据库密码、用户凭据及私有 token 永远不得进入客户端变量、源码、提交或构建日志。
- 移动端生产构建必须在 EAS 环境中配置 `EXPO_PUBLIC_*` 变量。
- 缺失或无效环境变量应视为配置错误，不得用生产密钥硬编码兜底。
- RLS 必须持续启用；所有表策略必须保持“用户仅访问自己的数据”这一不变量。

## 6. Commands

命令以 Windows PowerShell 和仓库根目录为基准。使用 `pnpm.cmd`，避免 PowerShell 执行策略阻止 `pnpm.ps1`。

### 6.1 安装与通用验证

| 目的 | 命令 | 当前状态 |
|---|---|---|
| 只读检查 Windows 开发环境 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -CheckOnly` | 已配置，不修改系统 |
| 安装 Windows 开发环境 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1` | 已配置，需要管理员权限、网络和交互接受 Android licenses |
| 安装依赖 | `pnpm.cmd install` | 已配置 |
| 全仓类型检查 | `pnpm.cmd typecheck` | 已配置，当前失败；见 11.1 |
| 桌面前端类型检查与构建 | `pnpm.cmd --filter @job-tracker/desktop build:check` | 已配置，当前失败；见 11.1 |
| Lint | 无 | 未配置 |
| 自动化测试 | 无 | 未配置 |
| CI | 无 | 未配置 |

### 6.2 桌面端

| 目的 | 命令 |
|---|---|
| 启动 Vite 开发模式 | `pnpm.cmd desktop:dev` |
| 启动 Tauri 开发客户端 | `pnpm.cmd desktop:tauri` |
| 仅构建桌面 Web 前端 | `pnpm.cmd --filter @job-tracker/desktop build` |
| 构建 Tauri 应用 | `pnpm.cmd desktop:build` |
| 构建无安装包的可执行程序 | `pnpm.cmd desktop:exe` |
| 构建 Windows NSIS 安装包 | `pnpm.cmd desktop:installer` |

### 6.3 移动端

| 目的 | 命令 |
|---|---|
| 启动 Expo 开发服务器 | `pnpm.cmd mobile:dev` |
| 登录 EAS | `pnpm.cmd mobile:eas:login` |
| 构建内部测试 APK | `pnpm.cmd mobile:android:apk` |
| 构建商店 AAB | `pnpm.cmd mobile:android:aab` |
| 启动本地 Android 原生项目 | `pnpm.cmd --filter @job-tracker/mobile android` |

本地生成 release APK 时，从 `apps/mobile/android` 执行：

```powershell
.\gradlew.bat assembleRelease
```

产物位于 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`。本地 Android 构建要求 JDK 17、Android SDK 35 和 Build Tools 35.0.0。

### 6.4 数据库变更

当前 schema 依次来源于 `202605160001_initial_schema.sql`、`202607250001_add_manager_status.sql` 和 `202607250002_mobile_workbench.sql`，对应的 v0.2 回滚脚本位于 `supabase/rollbacks/202607250002_mobile_workbench.sql`。仓库没有配置可验证的 Supabase CLI 脚本，因此本规格不虚构数据库执行命令。任何迁移应用方式、目标项目和回滚方案必须先获批准。

## 7. Project Structure

```text
apps/
  desktop/                 Tauri + React + Vite 桌面应用
    src/                   桌面端 UI、交互和 Supabase 客户端
    src-tauri/             Rust 入口、Tauri 配置和桌面资源
  mobile/                  Expo + React Native 移动应用
    src/components/        移动端复用组件
    src/navigation/        底部导航和页面栈
    src/screens/           登录、仪表盘、详情、编辑、日历、个人中心
    android/               跟踪的 Android 原生工程
packages/
  core/src/                跨端类型、常量、CRUD、统计、日期和导出逻辑
supabase/migrations/       PostgreSQL schema、trigger、索引与 RLS
supabase/rollbacks/        已提供的迁移回滚脚本
docs/                      项目规范和后续架构决策文档
scripts/                   可重复运行的本机开发环境引导脚本
```

新增自动化测试时，测试位置必须随框架选型一并批准；在此之前不得创建误导性的空测试目录。

## 8. Code Style

### 8.1 编译与格式约定

- TypeScript 开启 `strict`、`isolatedModules` 和大小写一致性检查。
- 使用 2 空格缩进、双引号、分号和尾逗号风格，遵循现有文件。
- React 组件和类型使用 `PascalCase`；函数、变量和 hook 状态使用 `camelCase`；常量集合使用 `UPPER_SNAKE_CASE`。
- 公共业务逻辑放在 `@job-tracker/core`，客户端只保留平台特有 UI、存储和导航逻辑。
- 优先使用由常量推导的联合类型，不重复手写状态字符串联合。
- 可选数据库字段用 `null` 表示无值；UI 表单可以暂用空字符串，但提交前必须标准化。
- 异步服务在 Supabase 返回 `error` 时抛出异常；界面层负责显示用户可理解的错误并维护加载状态。

### 8.2 现有风格示例

以下代码取自桌面端的输入标准化逻辑，体现了不可变更新、去除空白、`null` 归一化和 `todo` 日期约束：

```typescript
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
```

新代码应保留这一行为，但共享的业务约束应优先下沉到 `packages/core`，避免桌面端和移动端产生不同规则。

## 9. Testing Strategy

### 9.1 当前事实

v0.2 已获批并建立以下自动化验证入口：

1. `pnpm.cmd typecheck`：全仓 TypeScript 静态验证。
2. `pnpm.cmd test`：运行 `packages/core` Vitest、桌面端 Vitest 与移动端 Jest/React Native Testing Library 测试。
3. `pnpm.cmd --filter @job-tracker/desktop build:check`：桌面 Web 类型检查与 Vite 生产构建。
4. `..\..\node_modules\.bin\expo.CMD export --platform android --output-dir ..\..\dist\mobile-android`：从 `apps/mobile` 执行 Android JavaScript bundle 冒烟。
5. 平台与双账号数据隔离仍使用第 10 节和第 15.9 节的人工场景验收。

项目仍没有 lint/formatter、覆盖率阈值、端到端测试或 CI workflow；新增这些能力继续属于“Ask first”。

### 9.2 测试分层

- `packages/core`：覆盖 `todo`/`submitted`/面试指标、`manager`、地址任意匹配、待办到期/逾期/完成和日历映射。
- 移动端：覆盖顶部卡片顺序、激活态与回调、多地址选择和创建、多待办创建/完成、主题解析、密码校验及反馈邮件编码。
- 桌面端：覆盖地址使用量和下一条未完成待办日期等工作台纯逻辑。
- `apps/desktop/src/rls.integration.test.ts` 提供真实 Supabase 双账号集成入口；配置 `.env.example` 中六个 `SUPABASE_TEST_*` 变量后随桌面测试运行，覆盖关系写入、任务修改、私有头像、级联删除和标签保留。当前环境未配置这些凭据，因此该用例明确跳过。
- 尚待真实 Supabase 环境执行：旧字段回填，以及上述双账号 RLS 集成用例。
- 尚待端到端覆盖：注册登录、跨端刷新、导入导出和完整设置流程。

## 10. Manual Acceptance Scenarios

### 10.1 认证与隔离

1. 注册用户 A，登录后创建一条申请并退出。
2. 重新登录用户 A，确认会话恢复后能看到该申请。
3. 注册或登录用户 B，确认看不到用户 A 的申请和事件。
4. 退出后确认受保护界面不可访问。

### 10.2 申请生命周期

1. 创建 `todo` 申请，确认 `applied_date` 为空。
2. 创建 `applied` 申请，确认公司和岗位必填，优先级默认为 `medium`。
3. 将 `todo` 改为已投递状态，确认缺失的投递日期被设置为当天。
4. 编辑可选字段，确认纯空白输入保存为 `null`。
5. 在桌面端删除申请，确认关联事件同时消失。

### 10.3 事件与状态

1. 新建申请后确认出现 `create` 事件。
2. 桌面端改变状态，确认出现包含前后状态的 `status` 事件。
3. 新增不同类型的事件，确认时间线按日期降序显示。
4. 删除事件，确认只删除目标事件，不影响申请。

### 10.4 统计、发现与日历

1. 用覆盖进行中、面试、Offer、拒绝和结束状态的数据核对所有统计指标。
2. 设置今天或过去的 `next_action_date`，确认未结束申请计入待跟进；结束申请不计入。
3. 验证桌面端搜索、导航筛选、状态筛选和四种排序。
4. 验证移动端文本搜索及状态、优先级、城市、渠道筛选。
5. 验证投递日、跟进日和事件日正确进入日历，且日历项按日期升序。

### 10.5 导入与导出

1. 分别导出 JSON 和 `.xls`，确认申请及事件内容完整、中文可读。
2. 导入合法 JSON 数组和 `{ "applications": [...] }` 对象，确认合法行被创建。
3. 导入包含缺失公司或岗位的行，确认该行被跳过。
4. 导入非法 JSON，确认显示错误且不会执行文件内容。
5. 对包含 XML 特殊字符的数据执行 Excel 导出，确认字符被正确转义。

### 10.6 错误与空状态

1. 在无申请时确认统计为 0，并显示可理解的空状态。
2. 使用错误凭据登录，确认显示错误且不泄漏敏感信息。
3. 模拟网络或 Supabase 请求失败，确认错误可见，已有本地界面数据不被错误响应覆盖。
4. 缺失环境变量时，确认问题被识别为配置错误，而不是静默连接到其他项目。

### 10.7 v0.2 双端交叉验收

1. 以同一账号分别登录移动端和桌面端；在一端创建、重命名、选择和删除地址标签，刷新另一端并确认结果一致。
2. 为一条申请选择多个地址，验证搜索和多地址筛选采用“命中任意标签”，并确认单条申请无法超过 10 个标签。
3. 创建多个待办，分别编辑、完成、恢复和删除；从申请详情、日历日期和待办列表进入编辑，并在另一端刷新确认同步。
4. 删除申请前确认二次提示；删除后事件、地址关联和待办消失，但个人地址标签保留。
5. 移动端依次验证跟随系统、浅色和深色主题，覆盖登录、投递、详情、编辑、日历、弹窗、导航和“我的”。
6. 验证真实邮箱、昵称、私有头像、密码二次确认、提醒开关和提前天数；反馈邮件应预填版本、构建和平台。
7. 用两个账号验证无法读取、更新或关联彼此的申请、标签、待办与头像。
8. 验证合法/非法 JSON 导入、JSON/Excel 导出及失败状态不会破坏已有数据。

## 11. Known Baseline Gaps

### 11.1 当前验证结果

2026-07-25 在 Windows PowerShell 中核验：

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd --filter @job-tracker/desktop build:check
```

以上三条命令均通过；Android Expo export 和 `apps/mobile/android/gradlew.bat assembleDebug --no-daemon --console=plain` 原生构建也通过。原生构建仅报告 `NODE_ENV` 未设置提示和上游 Java 弃用警告，未出现编译错误。原有 workspace 包解析、React DOM 类型、移动导航类型和 Supabase `currentUser` 问题已清零。

自动化测试合计 18 项：核心 6 项、移动端 10 项、桌面端 2 项。

### 11.2 质量基础设施缺失

- 没有 lint/formatter 命令。
- 没有覆盖率目标、端到端测试或真实设备组件测试。
- 没有 CI workflow。
- 当前环境没有 Supabase CLI、Docker 或测试项目授权，因此迁移尚未部署，回填和双账号 RLS 尚未运行验证。
- `pnpm.cmd audit --prod` 报告 41 条上游公告（2 critical、26 high、10 moderate、3 low），主要来自 Expo/React Native 工具链传递依赖；依赖升级需要单独审批，发布前必须处置或完成风险接受。

## 12. Boundaries

### Always do

- 在变更前阅读本规格，并保持实现、类型、schema 和文档一致。
- 保持 RLS 启用，并验证每个数据操作只能访问当前用户的数据。
- 对必填字段、状态、优先级、事件类型、日期和导入数据进行验证。
- 将跨端业务规则放入 `packages/core`，或明确记录无法共享的原因。
- 数据库或常量变更后同步更新所有对应 enum、类型和验收场景。
- 变更后运行适用的类型检查、构建和人工验收，并如实报告失败。
- 更新规格后保留其历史语义；重大架构决策另写 ADR，而不是只改代码。

### Ask first

- 新增、删除或重排数据库表、列、约束、RLS、trigger、index 或 enum。
- 新增依赖，升级主要框架，改变 pnpm、Expo、Tauri、Kotlin 或 Android SDK 配置。
- 改变认证方式、会话存储、Supabase 项目或密钥策略。
- 新增测试框架、lint/formatter、CI、发布、遥测或监控配置。
- 改变公开类型、共享服务接口、导入导出格式或状态业务含义。

### Never do

- 提交真实密钥、token、数据库密码、用户凭据或包含敏感信息的日志。
- 在桌面端或移动端使用 Supabase `service_role` key。
- 关闭或绕过 RLS 来解决客户端访问问题。
- 修改 `node_modules`、构建产物、缓存或其他可重新生成的依赖内容作为正式修复。
- 未经批准删除失败测试、弱化类型安全、跳过安全约束或破坏用户数据。
- 未经备份、迁移和回滚计划执行破坏性数据库操作。

## 13. Success Criteria

### 13.1 v0.1 产品基线

当以下条件全部成立时，产品实现符合本规格：

1. 第 2 节功能需求通过自动化测试或第 10 节人工场景验证。
2. TypeScript 常量、公共类型和 PostgreSQL enum 保持一致。
3. 两个不同账号之间无法读取或修改彼此的数据。
4. 桌面端和移动端使用同一 Supabase 项目时能读取一致的申请和事件数据。
5. `todo` 日期约束、结束状态、待跟进和统计公式与本规格一致。
6. 客户端包和版本控制中不包含真实秘密。
7. 所有适用的类型检查和构建命令通过；若不通过，必须作为已知阻塞项记录，不得宣称完成。

### 13.2 本规格文档

本规格任务完成需要：

- 覆盖 Objective、Commands、Project Structure、Code Style、Testing Strategy 和 Boundaries 六个核心领域。
- 记录功能契约、数据模型、安全约束、人工验收、成功标准和已知差距。
- 保存于版本控制内的 `docs/spec.md`。
- 不伴随任何产品代码、依赖、数据库或构建配置修改。
- v0.2 规格已由项目所有者于 2026-07-25 批准；实现变更必须保持本规格同步。

## 14. Open Questions

以下问题不阻塞 v0.1 规格审阅，但必须在对应实施前解决：

1. lint、formatter 与 CI 平台和必需检查的选型。
2. Supabase migration 的环境提升和生产回滚流程。
3. iOS 是否成为正式支持和验收的平台。
4. v0.2 稳定后何时删除旧 `city` 与 `next_action_date` 字段。

---

审阅结论应记录为以下之一：

- **批准**：当前状态；允许按第 15 节实施 v0.2。
- **修改后批准**：先更新本规格并重新审阅。
- **拒绝**：记录拒绝原因，不进入后续阶段。

## 15. Approved v0.2: Mobile Workbench

### 15.1 快捷指标与筛选

顶部指标卡按以下顺序显示，默认激活“总投递”：

| 卡片 | 统计与筛选谓词 |
|---|---|
| 待投递 | `status === "todo"` |
| 总投递 | `status !== "todo"` |
| 面试中 | `interview1`、`interview2`、`interview3`、`manager`、`hr` |
| Offer | `status === "offer"` |

- 指标数字始终基于全部申请计算。
- 四张卡是互斥快捷筛选，并与文本搜索和高级筛选取交集。
- 激活态不能只依赖颜色，必须同时使用边框、背景或文字权重。
- `DashboardMetrics` 保留全部记录 `total`，新增 `todo` 与 `submitted`。

### 15.2 主管面

- `ApplicationStatus` 和 PostgreSQL `application_status` 新增 `manager`，中文标签为“主管面”。
- 排序位置在 `interview3` 与 `hr` 之间。
- `manager` 属于进行中和面试中状态，计入面试指标。
- 类型、常量、筛选、徽标、导出、移动端和桌面端必须同步支持。

### 15.3 地址标签

- 新增用户级 `location_tags` 与申请关联表 `application_location_tags`。
- 标签名称去除首尾空白，在同一用户范围内忽略大小写去重，最长 32 字符。
- 一条申请最多关联 10 个地址；筛选多个地址时采用“任意命中”。
- 地址选择器展示个人标签和现有常用城市建议，并允许即时创建。
- 双端均支持创建、选择、重命名、删除、展示和筛选地址标签。
- 删除正在使用的标签前显示影响申请数；确认后删除关联，不删除申请。
- 迁移把现有非空 `city` 按用户回填为标签和关联；旧 `city` 列至少保留一个兼容版本。

### 15.4 跟进任务

- 新增 `follow_up_tasks`，字段为 `id`、`user_id`、`application_id`、`title`、`notes`、`due_date`、`completed_at`、`created_at`、`updated_at`。
- 标题和全天日期必填；备注可选；`completed_at` 是否为空是完成状态的唯一来源。
- 双端支持创建、编辑、完成、恢复和删除任务。
- 任务可从申请详情、日历日期和待办列表进入编辑。
- 日历显示投递、事件和任务；即将到期/逾期仅统计未完成任务。
- 迁移把现有 `next_action_date` 回填为“跟进：公司 · 岗位”任务；旧列至少保留一个兼容版本。
- 不支持时间点、循环、子任务或任务指派。

### 15.5 删除申请

- 移动端详情页用删除操作替换当前无行为的分享入口。
- 删除必须二次确认，成功后返回列表并刷新；失败时保留当前页面并显示错误。
- 删除申请永久级联删除事件、地址关联和任务，但保留用户的地址标签。

### 15.6 设置中心

- 从真实 Supabase session 读取邮箱和登录状态，不使用 `auth.currentUser`。
- 支持编辑 `profiles.display_name` 和私有头像；头像对象只能由所属用户访问。
- 邮箱只读；支持二次确认的新密码修改。
- 主题为 `system | light | dark`，默认 `system`，全移动端页面及导航同步适配。
- 应用内提醒可关闭，并支持提前 0、1、3、7 天；不请求系统通知权限。
- 关于页展示名称、版本和构建信息；帮助页解释状态、地址与待办。
- 反馈通过 URL 编码的 `mailto:418154155@qq.com` 打开系统邮件客户端，并预填版本、平台和主题。
- 退出登录保持可用。

### 15.7 数据安全

- 所有新表启用 RLS；用户只能访问自己的标签、关联、任务与资料。
- 关联写入必须同时验证申请和标签属于当前用户。
- 头像使用私有 Storage bucket，路径以用户 ID 分区，并限制为 JPEG、PNG 或 WebP，最大 5 MB。
- 表单和数据库同时限制标签、任务和资料输入；不得依赖客户端校验作为安全边界。

### 15.8 v0.2 测试策略

- 使用 Vitest 覆盖 `packages/core` 和桌面端纯逻辑/组件。
- 移动端使用 Expo/Jest 兼容测试入口与 React Native Testing Library 覆盖关键交互。
- 数据库迁移必须验证旧数据回填、级联删除和双账号 RLS 隔离。
- 在实施功能前恢复全仓 `pnpm.cmd typecheck`；workspace 解析、React DOM 类型、导航类型和错误 Supabase API 均不得保留。

### 15.9 v0.2 验收标准

1. 四张指标卡的数量与点击结果使用完全相同的谓词。
2. 双端可对同一申请维护相同的多地址和多任务数据。
3. 主管面在双端可选择、显示、筛选、统计和导出。
4. 移动端可以确认后删除申请，并按 schema 级联清理关联数据。
5. 日历可直接进入任务编辑；完成任务不计入提醒或逾期数量。
6. 登录用户在“我的”页看到真实邮箱，并能使用所有列出的设置功能。
7. 三种主题覆盖现有移动端全部页面，无不可读文字或仅靠颜色表达的状态。
8. 两个测试账号无法访问或修改彼此的新资源或头像。
9. 类型检查、核心测试、双端测试、桌面构建和 Android 冒烟均通过。
