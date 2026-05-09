# Everyday Pulse

Everyday Pulse is a mobile-first web and Android application that helps users do one small real-life action each day.

The app is not a chatbot and does not use AI. Pulses are static mission records stored in Supabase, then selected with simple rule-based matching using time bucket, path, XP, unlock status, completion history, save history, and recent activity.

Core promise:

```text
Do small real-life pulses.
Earn Life XP.
Change the script.
```

## Current App Status

Everyday Pulse now runs as:

- A React/Vite web app
- A PWA-ready mobile web experience
- A Capacitor Android app with a generated APK

Android package id:

```text
com.everydaypulse.app
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Product Flow

The current MVP focuses on one clear daily loop:

```text
Register or log in
-> Complete onboarding
-> Home
-> Pick time bucket
-> Pick one pulse path
-> Reveal one pulse for today
-> Read pulse details
-> Confirm with Okay
-> Home shows today's pulse
-> Mark pulse completed
-> Choose feeling
-> Add optional 150-character journal note
-> Earn XP
-> Weekly momentum updates
```

The user should only have one pulse for the day. Once a pulse is chosen, discovery CTAs are blocked by the home state until the pulse is completed or saved for later.

## Key Features

- Supabase email/password authentication
- Simple onboarding with display name and profile icon
- Home screen with XP, weekly momentum, next unlock, and today's pulse state
- Find My Pulse flow with time bucket first, then one path
- Surprise Me flow with non-repeating random pulse selection where possible
- Pulse detail page with title, action, why it matters, and done condition
- Save for Later flow
- Completion flow with 5 feelings and optional 150-character journal note
- XP and streak tracking
- Weekly page with completed pulses, feelings, and notes
- Saved tab
- Progress/profile screens
- Locked Browse Categories placeholder for MVP focus
- Centered heartbeat loading state using the Everyday Pulse icon
- Capacitor Android build

## Tech Stack

- React 18
- Vite 5
- React Router DOM
- Tailwind CSS
- Supabase JS
- Lucide React
- Capacitor Android
- Vercel-compatible SPA routing

## Project Structure

```text
Everyday-Pulse/
|-- android/                         Android Capacitor project
|-- public/
|   |-- everyday-pulse-thumbnail.png App/loading/email icon
|   |-- manifest.webmanifest         PWA manifest
|   `-- sw.js                        Service worker
|-- src/
|   |-- lib/
|   |   |-- constants.js             Levels, filters, feelings, unlocks
|   |   |-- gameLogic.js             Supabase data and rule logic
|   |   `-- supabase.js              Supabase client
|   |-- main.jsx                     App screens and routes
|   `-- styles.css                   Tailwind app styles
|-- supabase/
|   |-- email-templates/
|   `-- migrations/
|-- capacitor.config.json
|-- package.json
|-- vercel.json
`-- vite.config.js
```

## Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Do not put a Supabase service role key or secret key in the frontend app.

## Supabase Setup

Run the SQL migrations in `supabase/migrations/`.

Important files:

- `001_everyday_pulse.sql` creates the main schema and RLS policies.
- `002_profile_rls_fix.sql` fixes profile insert/update access for authenticated users.
- `003_combined_pulse_setup.sql` adds the current pulse columns and seed data in one combined query.
- `004_public_pulse_read_policy.sql` ensures pulse content can be read by the app.

The app expects these core tables:

- `profiles`
- `missions`
- `mission_packs`
- `user_mission_status`
- `completed_missions`
- `badges`
- `user_badges`
- `weekly_recaps`
- `user_entitlements`

RLS should stay enabled. Users should only read/write their own profile, status, completions, badges, recaps, and entitlements. Mission content can be publicly readable.

## Run Web App Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The local URL is usually:

```text
http://localhost:5173
```

During this build session, the app has also been run on:

```text
http://localhost:5174
```

## Build Web App

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Android App Build

Everyday Pulse uses Capacitor for Android.

Requirements:

- Android Studio
- Android SDK
- JDK 17 or newer

Build web assets and sync Android:

```bash
npm run android:sync
```

Open Android Studio:

```bash
npm run android:open
```

Build debug APK:

```bash
npm run android:build
```

If building manually on Windows:

```powershell
npm run build
npx cap sync android
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For Play Store release, generate a signed `.aab` from Android Studio:

```text
Build > Generate Signed App Bundle / APK > Android App Bundle
```

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production web app |
| `npm run preview` | Preview production build |
| `npm run android:sync` | Build web and sync Capacitor Android |
| `npm run android:open` | Open Android project |
| `npm run android:build` | Build debug APK |

## Recommendation Logic

Everyday Pulse uses rule-based matching.

Inputs:

- Selected time bucket
- Selected pulse path
- Mission tags
- User XP
- Unlock level
- Recently completed pulses
- Recently shown pulses
- Recently saved/skipped pulses
- Sensitive mission flag

There is no OpenAI API, no AI API, and no chatbot feature in the app.

## Current MVP Decisions

- Browse Categories is visible but locked for now.
- The daily experience is intentionally limited to one pulse per day.
- The app uses 5 feelings in the completion loop.
- Journal notes are capped at 150 characters.
- The app icon appears in onboarding, loading states, PWA metadata, and Android launcher assets.
- Payment is not integrated yet.

## Deployment

The app is ready for Vercel-style deployment.

`vercel.json` includes SPA rewrites so direct route reloads such as `/home`, `/weekly`, and `/find-mission` return `index.html`.

Set these environment variables in the deployment dashboard:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

Then run a production build and deploy:

```bash
npm run build
```

## Security Notes

- Never commit `.env`.
- Never expose Supabase secret/service role keys in frontend code.
- Keep RLS enabled.
- Keep user progress scoped by `auth.uid()`.
- Use Supabase SQL Editor for migrations when needed.

## QA Checklist

Before sharing a build:

- New user can register or log in.
- Completed onboarding users go straight to Home.
- Reloading direct routes does not show host `NOT_FOUND`.
- Find My Pulse reveals paths only after time is selected.
- User can reveal exactly one pulse for today.
- Home shows today's pulse after choosing it.
- Pulse detail opens from Home.
- Completion flow saves feeling and optional note.
- Weekly momentum updates after completion.
- Saved pulses appear in Saved tab.
- `npm run build` passes.
- `npx cap sync android` runs after web changes.
- Android APK builds successfully.

## Author

Built by Sumit Pandey.

GitHub: [@connectsumitp](https://github.com/connectsumitp)
