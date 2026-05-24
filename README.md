# 秋招投递助手 (Job Hunting Tracker)

多平台校园招聘投递追踪工具，支持桌面端和移动端同步投递进度。

## 项目结构

```
job_hunting/
├── apps/
│   ├── desktop/          # Tauri + React + Vite + TypeScript 桌面应用
│   └── mobile/           # Expo SDK 52 + React Native + TypeScript 移动应用
├── packages/
│   ├── core/             # 共享业务逻辑（类型、CRUD、统计、导出、日期工具）
│   └── ui/               # 共享 UI 设计令牌（颜色、圆角）
├── supabase/
│   └── migrations/       # 数据库建表脚本 + RLS 安全策略
└── legacy-static/        # 旧版纯静态 Web 应用（参考保留）
```

## 功能

- 邮箱密码注册/登录（Supabase Auth）
- 12 种申请状态流转（待投递 → 已投递 → 笔试 → 面试1/2/3 → HR面 → Offer）
- 3 级优先级标记 + 跟进日期提醒
- 仪表盘统计（总数 / 面试中 / Offer / 待跟进）
- 搜索、状态筛选、多维度排序
- 日历视图查看关键时间节点
- 申请进度时间线（添加/删除事件）
- JSON / Excel 数据导出和导入
- 桌面端 + 移动端 Supabase 云端数据同步

## 环境变量

复制 `.env.example` 并填入 Supabase 项目凭据：

```text
# 桌面端 (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 移动端 (Expo)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

移动端构建还需要在 EAS 中配置环境变量：

```bash
cd apps/mobile
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --type string
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..." --type string
```

## 安装

```bash
pnpm install
```

项目使用 pnpm monorepo，`node-linker=hoisted` 模式（Android 构建兼容性要求）。

## 桌面端

```bash
# Web 开发模式
pnpm desktop:dev

# Tauri 桌面客户端
pnpm desktop:tauri

# 构建 Windows 安装包
pnpm desktop:installer
```

## 移动端

```bash
# 启动 Expo 开发服务器
pnpm mobile:dev

# 登录 EAS
pnpm mobile:eas:login

# 构建 Android APK（内部测试）
pnpm mobile:android:apk

# 构建 Android App Bundle（商店上架）
pnpm mobile:android:aab
```

> **注意**：移动端使用了 `@react-native-async-storage/async-storage`，不兼容 Expo Go。开发需使用 EAS Development Build 或本地构建。

## 本地 Android 构建

如果需要本地构建 APK（跳过 EAS），需要：

1. 安装 JDK 17 + Android SDK（API 35 + Build Tools 35.0.0）
2. 设置 `JAVA_HOME` 和 `ANDROID_HOME` 环境变量
3. 生成 Android 项目并构建：

```bash
cd apps/mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

APK 输出路径：`android/app/build/outputs/apk/release/app-release.apk`

## Kotlin 版本兼容性说明

项目使用 React Native 0.76.9（Kotlin 1.9.25）配合 `expo-build-properties` 插件固定 Kotlin 版本，确保与 `expo-modules-core` 的 Compose Compiler 1.5.15 兼容。

关键配置在 [apps/mobile/app.json](apps/mobile/app.json)：

```json
"plugins": [
  ["expo-build-properties", {
    "android": {
      "kotlinVersion": "1.9.25",
      "compileSdkVersion": 35,
      "targetSdkVersion": 35
    }
  }]
]
```

Kotlin 与 Compose Compiler 版本映射（来自 `expo-modules-core`）：
| Kotlin | Compose Compiler |
|--------|-----------------|
| 1.9.24 | 1.5.14 |
| 1.9.25 | 1.5.15 |

## 数据库

运行迁移文件创建表结构：

```
supabase/migrations/202605160001_initial_schema.sql
```

三张表：`profiles`、`applications`、`application_events`，全部启用 Row Level Security，基于 `auth.uid()` 实现用户数据隔离。
