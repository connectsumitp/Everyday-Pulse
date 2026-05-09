# Everyday Pulse Android Build

Everyday Pulse now has a Capacitor Android project.

## What Was Added

- Capacitor app name: `Everyday Pulse`
- Android package id: `com.everydaypulse.app`
- Web output directory: `dist`
- Native Android project: `android/`
- Launcher icon uses `public/everyday-pulse-thumbnail.png`

## Requirements

Install:

- Android Studio
- Android SDK
- JDK 17 or newer

After installing Android Studio, make sure `JAVA_HOME` points to your JDK.

## Common Commands

Build web app and sync Android:

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

If building manually from the Android folder:

```bash
cd android
gradlew.bat assembleDebug
```

The debug APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Release Build

For Google Play, build a signed Android App Bundle (`.aab`) from Android Studio:

```text
Build > Generate Signed App Bundle / APK > Android App Bundle
```

For direct testing, use a debug APK first.

## Important

The app is now a real Android wrapper, not just a browser-installed PWA. It will appear as `Everyday Pulse` on Android after installing the APK/AAB.
