# 秋招投递助手（Job Hunting Tracker）

面向个人求职者的跨端投递管理工具。桌面端与移动端通过 Supabase 同步申请、招聘进展、地址标签和待跟进事项，当前基线版本为 v0.2.0。

## 功能概览

- 邮箱密码注册、登录、退出和会话恢复，业务数据由 Supabase RLS 隔离。
- 13 种申请状态：待投递、已投递、简历筛选、笔试、一面、二面、三面、主管面、HR 面、Offer、已拒绝、无回应和已结束。
- 待投递、总投递、面试中和 Offer 快捷统计，并支持搜索、筛选、排序和日历映射。
- 每条申请可关联多个个人地址标签，并在桌面端和移动端同步维护与筛选。
- 每条申请可创建多个待跟进事项，支持编辑、完成、恢复、删除、到期和逾期提醒。
- 桌面端支持申请管理、JSON 导入以及 JSON/Excel 导出。
- 移动端支持申请管理、日历、昵称、头像、密码、主题和提醒偏好设置。

## 项目结构

```text
apps/
  desktop/                 Tauri + React + Vite 桌面应用
    src/                   桌面端界面、交互与 Supabase 客户端
    src-tauri/             Rust 入口、Tauri 配置和桌面资源
  mobile/                  Expo + React Native 移动应用
    src/components/        移动端复用组件
    src/navigation/        导航栈与类型
    src/screens/           登录、投递、详情、日历和个人中心
    android/               已跟踪的 Android 原生工程
packages/
  core/src/                跨端类型、常量、服务、统计、日期与导出逻辑
supabase/
  migrations/              PostgreSQL schema、迁移与 RLS
  rollbacks/               已提供的迁移回滚脚本
docs/
  spec.md                  当前产品与工程规格
  ideas/                   已批准需求的设计记录
scripts/
  setup-windows.ps1        Windows 开发环境检查与自动安装
```

设计令牌由各客户端按平台维护：移动端使用 `apps/mobile/src/theme.ts`，桌面端使用 `apps/desktop/src/styles.css`。移动端现有 11 个复用组件均有实际页面消费者；业务规则应优先放入 `@job-tracker/core`。

## 环境要求

- Node.js 当前 LTS 版本。
- pnpm 9；仓库声明的包管理器版本为 `pnpm@9.12.0`。
- 桌面原生构建：Rust stable 和 Tauri 2 所需的 Windows 工具链。
- Android 本地构建：JDK 17、Android SDK 35 和 Build Tools 35.0.0。
- EAS 云构建：Expo/EAS 账号。

## Windows 一键安装开发环境

仓库提供 `scripts/setup-windows.ps1`，用于检查并安装当前项目的 Windows 开发环境。安装模式需要 Windows 10/11、网络连接、`winget` 和管理员 PowerShell。

先克隆仓库，在仓库根目录以管理员身份打开 PowerShell，然后执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

脚本可重复运行，已经满足要求的组件不会重复安装。默认会：

- 通过 WinGet 安装缺失的 Git、Node.js LTS、Visual Studio 2022 C++ Build Tools、Rustup、JDK 17 和 Android Studio。
- 安装项目固定的 `pnpm@9.12.0`。
- 从 Google 官方地址下载 Android Command-line Tools，并在 SHA-256 校验通过后安装 SDK Platform 35、Build Tools 35.0.0、platform-tools 和 NDK 26.1.10909125。
- 设置当前用户的 `JAVA_HOME`、`ANDROID_HOME`、`ANDROID_SDK_ROOT` 和 `NDK_HOME`。
- 执行 `pnpm.cmd install --frozen-lockfile`，在缺失时从 `.env.example` 创建两个应用的 `.env`，最后运行类型检查和测试。

只检查、不修改电脑，也不需要管理员权限：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -CheckOnly
```

可选参数：

| 参数 | 用途 |
| --- | --- |
| `-CheckOnly` | 只报告缺失项，不安装、不写环境变量、不创建文件 |
| `-SkipDesktop` | 跳过 Visual Studio Build Tools 和 Rust 环境 |
| `-SkipAndroid` | 跳过 JDK、Android Studio 和 Android SDK 环境 |
| `-SkipProjectInstall` | 只准备系统工具，不安装项目依赖或创建 `.env` |
| `-SkipVerification` | 安装完成后不运行 `typecheck` 和测试 |

Android SDK licenses 必须由使用者在脚本提示时阅读并输入 `y` 接受，脚本不会静默代替接受协议。脚本也不会填写或读取真实 Supabase 密钥；运行完成后仍需手动填写 `apps/desktop/.env` 和 `apps/mobile/.env`。如果环境变量刚被写入，请重新打开终端和 IDE；Android 模拟器需要在 Android Studio Device Manager 中另行创建。

实现依据：[WinGet install](https://learn.microsoft.com/windows/package-manager/winget/install)、[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)、[pnpm installation](https://pnpm.io/installation) 和 [Android sdkmanager](https://developer.android.com/tools/sdkmanager)。

## 快速开始

以下命令均面向 Windows PowerShell。

```powershell
pnpm.cmd install
Copy-Item .env.example apps/desktop/.env
Copy-Item .env.example apps/mobile/.env
pnpm.cmd desktop:dev
```

编辑两个应用目录中的 `.env`，填入同一个 Supabase 项目的公开客户端配置：

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

不要提交 `.env`、真实账号或 `service_role` key。客户端只能使用 Supabase anon/publishable key，数据授权依赖 RLS 和 `auth.uid()`。

EAS 云构建还需要在对应 EAS 项目环境中配置相同的两个 `EXPO_PUBLIC_*` 变量。

## 常用命令

| 类型 | 命令 | 用途和产物 |
| --- | --- | --- |
| 安装 | `pnpm.cmd install` | 安装全部 workspace 依赖；首次运行或 lockfile 变化后执行 |
| 验证 | `pnpm.cmd typecheck` | 检查 core、桌面端和移动端 TypeScript，不生成软件 |
| 验证 | `pnpm.cmd test` | 运行全部现有自动化测试，不生成软件 |
| 桌面开发 | `pnpm.cmd desktop:dev` | 只启动 Vite Web 开发页面，适合调试界面 |
| 桌面开发 | `pnpm.cmd desktop:tauri` | 启动带热更新的 Tauri Windows 应用，适合调试桌面行为 |
| 桌面验证 | `pnpm.cmd --filter @job-tracker/desktop build:check` | 类型检查并构建 Web 资源到 `apps/desktop/dist/`，不是 Windows 安装包 |
| 桌面发布 | `pnpm.cmd desktop:exe` | 生成未打包安装器的 `job-tracker-desktop.exe` |
| 桌面发布 | `pnpm.cmd desktop:installer` | 生成可分发的 Windows NSIS 安装器；`desktop:build` 与此命令等价 |
| 移动开发 | `pnpm.cmd mobile:dev` | 启动面向 Development Build 的 Expo/Metro 服务，供已安装的开发版热更新 |
| 移动开发 | `pnpm.cmd mobile:android` | 首次构建开发版并安装到正在运行的 Android 模拟器 |
| 移动开发 | `pnpm.cmd mobile:android:device` | 选择已通过 USB 调试连接的 Android 真机并安装开发版 |
| EAS | `pnpm.cmd mobile:eas:login` | 登录 Expo/EAS；通常每台电脑首次构建时执行一次 |
| 移动测试包 | `pnpm.cmd mobile:android:apk` | 通过 EAS 云构建可直接安装的内部测试 APK |
| 移动发布包 | `pnpm.cmd mobile:android:aab` | 通过 EAS 云构建用于 Google Play 上架的 AAB，不能直接点击安装 |

项目当前没有 lint、formatter 或 CI 命令；新增相关工具或依赖前应先更新规格并获得批准。

## 移动端高效调试

日常开发不需要每次生成并下载 APK。推荐使用 Android 模拟器或 USB 连接的真机，只在第一次以及原生配置变化后重新构建开发版；普通 TypeScript、界面和样式修改由 Metro Fast Refresh 在几秒内同步。

### Android 模拟器

1. 在 Android Studio 的 SDK Manager 中安装 Android Emulator 和 API 35 系统镜像。
2. 在 Device Manager 中创建并启动一个 Android Virtual Device（建议 Pixel、API 35）。
3. 首次安装开发版：

```powershell
pnpm.cmd mobile:android
```

以后日常开发只需启动 Metro：

```powershell
pnpm.cmd mobile:dev
```

终端出现 Expo 菜单后按 `a` 即可打开已经安装的开发版。保存 `.ts`、`.tsx` 或样式文件后，Fast Refresh 会自动更新模拟器中的画面。

### Android 真机

在手机中启用“开发者选项”和“USB 调试”，通过数据线连接电脑并确认授权，然后首次执行：

```powershell
pnpm.cmd mobile:android:device
```

完成一次安装后，同样使用 `pnpm.cmd mobile:dev` 进行日常热更新。电脑和手机应处于可互访的同一网络；USB 连接方式出现 Metro 连接问题时，可执行 `adb reverse tcp:8081 tcp:8081`。

只有以下变更通常需要重新执行 `pnpm.cmd mobile:android` 或 `mobile:android:device`：新增或升级原生依赖、修改 `app.json`/config plugin、修改 `apps/mobile/android/` 原生代码或升级 Expo SDK。普通业务代码和 UI 修改不需要重新安装。

本项目使用 Development Build 工作流而不是 Expo Go。实现依据：[Expo 本地开发构建](https://docs.expo.dev/guides/local-app-development/)和 [Development Build 使用说明](https://docs.expo.dev/develop/development-builds/use-development-builds/)。

## 生成新的桌面端和移动端软件

发布前先确认两个应用的 `.env` 已配置，并建议执行：

```powershell
pnpm.cmd install
pnpm.cmd typecheck
pnpm.cmd test
```

### 生成 Windows 桌面安装器

推荐执行：

```powershell
pnpm.cmd desktop:installer
```

构建成功后，安装器位于：

```text
apps/desktop/src-tauri/target/release/bundle/nsis/*.exe
```

如果只需要未经安装器封装的桌面可执行文件，可以执行：

```powershell
pnpm.cmd desktop:exe
```

产物位于 `apps/desktop/src-tauri/target/release/job-tracker-desktop.exe`。普通用户分发建议使用 NSIS 安装器。

### 生成 Android 安装包

首次使用 EAS 时先登录，并确认 EAS 项目中已经配置 `EXPO_PUBLIC_SUPABASE_URL` 和 `EXPO_PUBLIC_SUPABASE_ANON_KEY`：

```powershell
pnpm.cmd mobile:eas:login
```

生成可直接安装到 Android 手机上的测试 APK：

```powershell
pnpm.cmd mobile:android:apk
```

生成提交到 Google Play 的生产 AAB：

```powershell
pnpm.cmd mobile:android:aab
```

这两个命令都在 EAS 云端构建，完成后终端会显示构建页面和下载地址。APK 用于直接安装和测试；AAB 用于应用商店发布。

开始新的发布版本前，还应同步检查 `apps/desktop/src-tauri/tauri.conf.json` 中的桌面版本，以及 `apps/mobile/app.json` 中的移动端 `version` 和 Android `versionCode`。EAS production profile 会自动递增 Android `versionCode`。

## 数据库迁移

在同一个 Supabase 项目中按顺序应用：

1. `supabase/migrations/202605160001_initial_schema.sql`：基础 profile、申请、事件和 RLS。
2. `supabase/migrations/202607250001_add_manager_status.sql`：增加固定状态 `manager`。
3. `supabase/migrations/202607250002_mobile_workbench.sql`：增加地址标签、申请地址关系、待跟进事项、个人偏好和私有头像策略，并回填旧字段。

`supabase/rollbacks/202607250002_mobile_workbench.sql` 提供 v0.2 工作台迁移的回滚步骤。迁移和回滚都应先在隔离项目验证；不要在未备份的生产数据库直接执行。

所有业务表必须保持 RLS 启用。迁移后应使用两个不同账号确认申请、标签、任务和头像互不可见。

## 测试

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd --filter @job-tracker/desktop build:check
```

桌面端包含一项可选 RLS 集成测试。未设置以下六个变量时该测试会跳过，其余测试仍必须通过：

```text
SUPABASE_TEST_URL
SUPABASE_TEST_ANON_KEY
SUPABASE_TEST_USER_A_EMAIL
SUPABASE_TEST_USER_A_PASSWORD
SUPABASE_TEST_USER_B_EMAIL
SUPABASE_TEST_USER_B_PASSWORD
```

测试账号只能指向本地或隔离的 Supabase 项目，不得使用生产账号。

## 生成产物与原生工程

以下目录是可再生成的本地产物，不应提交，空间不足或构建异常时可以删除：

- `apps/desktop/dist/`
- `apps/desktop/src-tauri/target/`
- `apps/mobile/dist/`
- `apps/mobile/android/.gradle/`
- `apps/mobile/android/build/`
- `apps/mobile/android/app/build/`
- 根目录 `dist/`

`apps/mobile/android/` 本身不是临时目录。项目提交该原生工程以固定 Kotlin、Compose、SDK 和 EAS Android 构建配置；只能删除其中被忽略的缓存与 `build` 目录。

## 规格与贡献约定

- 开发前先阅读 [`docs/spec.md`](docs/spec.md)；已批准的移动工作台设计位于 [`docs/ideas/mobile-workbench-v0.2.md`](docs/ideas/mobile-workbench-v0.2.md)。
- 保持 TypeScript 常量、共享类型和 PostgreSQL enum 一致。
- 不提交密钥、依赖目录、构建产物或本机代理/代码索引配置。
- 修改后至少运行与变更范围对应的类型检查、测试和构建检查。
