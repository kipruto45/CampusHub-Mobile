# CampusHub Mobile - Deployment Guide

## Build Outputs

### PWA (Web App)
- **Location:** `mobile/web-build/`
- **Files:** 
  - `index.html` - Main entry
  - `manifest.json` - PWA manifest
  - `_expo/` - JavaScript bundles
  - `assets/` - Static assets

### APK (Android)
- **Location:** `mobile/android/app/build/outputs/apk/release/app-release.apk`
- **Size:** ~83 MB

---

## Quick Deploy Options

### Option 1: Netlify (Recommended for PWA)

```bash
cd mobile/web-build
npx netlify deploy --prod
```

### Option 2: Vercel

```bash
cd mobile/web-build
npx vercel --prod
```

### Option 3: GitHub Pages

1. Create a new repository
2. Push the `web-build` folder contents
3. Enable GitHub Pages in settings

### Option 4: Firebase Hosting

```bash
cd mobile/web-build
npx firebase init hosting
npx firebase deploy
```

---

## APK Distribution

### Option 1: Direct Download (via web server)
Host the APK file on any web server and share the download link.

### Option 2: Google Play (Production)
Use EAS Build to submit to Google Play:
```bash
cd mobile
npx eas build -p android --profile production
```

### Option 3: Firebase App Distribution
```bash
npx eas submit -p android
```

---

## Local Testing

### Serve PWA locally:
```bash
cd mobile/web-build
python3 -m http.server 8080
# Open http://localhost:8080
```

### Test APK:
```bash
adb install mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## Shareable Links (After Deployment)

Once deployed, your links will be:
- **PWA:** `https://your-domain.com/`
- **APK Download:** `https://your-domain.com/app-release.apk`
