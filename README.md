# Job Hunting Tracker

A multi-platform job application tracker for campus recruiting and job hunting.

The project is organized as a monorepo:

- `apps/desktop`: Tauri + React + TypeScript desktop app.
- `apps/mobile`: Expo React Native + TypeScript mobile app.
- `packages/core`: shared types, constants, statistics, Supabase services, and export helpers.
- `packages/ui`: shared UI tokens.
- `supabase/migrations`: database schema and Row Level Security policies.
- `legacy-static`: the original static web version kept as reference.

## Features

- Email/password login with Supabase Auth.
- Private per-user application data.
- Application CRUD.
- Progress timeline add/delete.
- Status filters, search, dashboard metrics, follow-up reminders, and calendar view.
- JSON and Excel export.
- Desktop client with Tauri.
- Android build configuration with Expo EAS.

## Environment

Copy `.env.example` and fill in your Supabase project values.

Desktop uses:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Mobile uses:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real `.env` files.

## Install

```powershell
pnpm.cmd install
```

## Desktop Development

Run the web version:

```powershell
pnpm.cmd desktop:dev
```

Run the Tauri desktop client:

```powershell
pnpm.cmd desktop:tauri
```

Build the Windows installer:

```powershell
pnpm.cmd desktop:installer
```

## Mobile Development

Start Expo:

```powershell
pnpm.cmd mobile:dev
```

Build an Android APK with EAS:

```powershell
pnpm.cmd mobile:eas:login
pnpm.cmd mobile:android:apk
```

Build an Android App Bundle for stores:

```powershell
pnpm.cmd mobile:android:aab
```

## Supabase

Run the migration in:

```text
supabase/migrations/202605160001_initial_schema.sql
```

The tables use Row Level Security so each user can only access their own data.
