# Vendgros - Mobile App Deployment Guide

This guide covers deploying the Vendgros mobile app to iOS (TestFlight) and Android (Internal Testing) using Expo and EAS Build.

## Prerequisites

- Expo account (https://expo.dev)
- Apple Developer Account ($99/year)
- Google Play Console Account ($25 one-time)
- EAS CLI installed: `npm install -g eas-cli`

## Table of Contents

1. [Project Configuration](#project-configuration)
2. [iOS Deployment](#ios-deployment)
3. [Android Deployment](#android-deployment)
4. [Over-the-Air Updates](#over-the-air-updates)
5. [App Store Submission](#app-store-submission)
6. [Troubleshooting](#troubleshooting)

---

## Project Configuration

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure app.json

Update `apps/expo/app.json`:

```json
{
  "expo": {
    "name": "Vendgros",
    "slug": "vendgros",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.vendgros.marketplace",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access to scan QR codes for pickup verification",
        "NSLocationWhenInUseUsageDescription": "We need location access to show nearby listings"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.vendgros.marketplace",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-camera",
      "expo-location"
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

### 3. Create eas.json

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://vendgros.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEF1234"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## iOS Deployment

### 1. Apple Developer Setup

#### Create App ID

1. Go to https://developer.apple.com
2. Navigate to "Certificates, IDs & Profiles"
3. Create new App ID:
   - Description: Vendgros Marketplace
   - Bundle ID: `com.vendgros.marketplace`
   - Capabilities: Push Notifications, Associated Domains

#### Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+"
3. Fill in app information:
   - Name: Vendgros
   - Primary Language: English
   - Bundle ID: `com.vendgros.marketplace`
   - SKU: `vendgros-app`

### 2. Build for iOS

#### Development Build

```bash
cd apps/expo
eas build --profile development --platform ios
```

#### Production Build

```bash
eas build --profile production --platform ios
```

### 3. TestFlight Deployment

#### Submit to TestFlight

```bash
eas submit --profile production --platform ios
```

Or manually:
1. Download .ipa file from EAS Build
2. Open Transporter app
3. Drag and drop .ipa file
4. Wait for processing (~15 minutes)

#### Add Testers

1. Go to App Store Connect
2. Navigate to TestFlight
3. Click "Internal Testing" or "External Testing"
4. Add tester emails
5. They'll receive email invitation

### 4. App Store Assets

Required screenshots (use iPhone 15 Pro Max):
- 6.7" Display: 1290 x 2796 pixels
- 5.5" Display: 1242 x 2208 pixels

Required metadata:
- App name
- Subtitle
- Description
- Keywords
- Support URL
- Privacy Policy URL

---

## Android Deployment

### 1. Google Play Console Setup

#### Create App

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in details:
   - App name: Vendgros
   - Default language: English
   - App or game: App
   - Free or paid: Free

#### Set up App Signing

1. Navigate to "Setup" → "App signing"
2. Let Google manage signing key
3. Download upload certificate

### 2. Build for Android

#### Development Build

```bash
cd apps/expo
eas build --profile development --platform android
```

#### Production Build (AAB)

```bash
eas build --profile production --platform android
```

### 3. Internal Testing Deployment

#### Submit to Internal Testing

```bash
eas submit --profile production --platform android
```

Or manually:
1. Download .aab file from EAS Build
2. Go to Play Console
3. Navigate to "Testing" → "Internal testing"
4. Create new release
5. Upload .aab file

#### Add Testers

1. Create email list
2. Add to "Internal testing" track
3. Share opt-in link with testers

### 4. Play Store Assets

Required screenshots (Pixel 7 Pro):
- Phone: 1080 x 2340 pixels (minimum 2 screenshots)

Required metadata:
- Short description (80 characters)
- Full description (4000 characters)
- App icon (512 x 512 pixels)
- Feature graphic (1024 x 500 pixels)

---

## Over-the-Air Updates

### 1. Configure EAS Update

Initialize updates:
```bash
eas update:configure
```

### 2. Publish Update

```bash
# Publish to production
eas update --branch production --message "Bug fixes and improvements"

# Publish to preview
eas update --branch preview --message "Testing new features"
```

### 3. Update Channels

Configure channels in `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### 4. Rollback

```bash
# List updates
eas update:list

# Rollback to previous update
eas update:republish --update-id <previous-update-id>
```

---

## App Store Submission

### iOS App Store

#### 1. Complete App Information

- App Privacy Details
- App Review Information
- Version Information
- Age Rating

#### 2. Submit for Review

1. Navigate to "App Store" tab
2. Click "+" to add version
3. Fill in "What's New in This Version"
4. Add screenshots
5. Click "Submit for Review"

#### 3. Review Process

- Review time: 24-48 hours
- Check status in App Store Connect
- Respond promptly to reviewer questions

### Android Play Store

#### 1. Complete Store Listing

1. Navigate to "Store presence" → "Main store listing"
2. Fill in all required fields
3. Upload screenshots
4. Set content rating

#### 2. Submit for Review

1. Go to "Testing" → "Internal testing"
2. Promote to "Closed testing" or "Open testing"
3. Eventually promote to "Production"

#### 3. Review Process

- Review time: 1-3 days
- Check status in Play Console
- Address any policy violations

---

## Environment Variables

### Production Configuration

Create `.env.production` in `apps/expo`:

```bash
# API
EXPO_PUBLIC_API_URL=https://vendgros.com
EXPO_PUBLIC_WS_URL=wss://vendgros.com

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Mapbox
EXPO_PUBLIC_MAPBOX_TOKEN=pk.ey...

# App Config
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### Build Secrets

Set secrets for EAS Build:
```bash
eas secret:create --scope project --name STRIPE_SECRET_KEY --value sk_live_...
eas secret:create --scope project --name API_KEY --value your-api-key
```

---

## Versioning Strategy

### Semantic Versioning

Use semver for app versions:
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features
- **Patch** (1.0.1): Bug fixes

### Build Numbers

- iOS: Increment `buildNumber` in `app.json`
- Android: Increment `versionCode` in `app.json`

Example:
```json
{
  "ios": {
    "bundleIdentifier": "com.vendgros.marketplace",
    "buildNumber": "2"
  },
  "android": {
    "package": "com.vendgros.marketplace",
    "versionCode": 2
  },
  "version": "1.0.1"
}
```

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] Authentication flow (email/phone OTP)
- [ ] Listing search with location
- [ ] QR code scanning
- [ ] Payment flow (Stripe)
- [ ] Rating submission
- [ ] Push notifications
- [ ] Offline functionality
- [ ] Deep linking
- [ ] Camera permissions
- [ ] Location permissions
- [ ] Multi-language (EN/FR/ES)

### Device Testing

Test on multiple devices:
- iPhone 12, 13, 14, 15 (various sizes)
- iPad Pro
- Android phones (Samsung, Pixel)
- Android tablets

---

## Monitoring and Analytics

### Expo Analytics

Built-in analytics:
```typescript
import * as Analytics from 'expo-analytics';

// Track event
Analytics.track('listing_viewed', {
  listingId: '123',
  category: 'produce'
});
```

### Crash Reporting

Configure Sentry:
```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'your-sentry-dsn',
  enableInExpoDevelopment: true,
  debug: __DEV__,
});
```

### Performance Monitoring

Track performance metrics:
- App startup time
- Screen load time
- API response time
- Image load time

---

## Troubleshooting

### Common iOS Issues

**Build Failed - Provisioning Profile**
```bash
# Clear credentials
eas credentials

# Re-generate
eas build:configure
```

**TestFlight Upload Failed**
```bash
# Check for valid certificate
eas credentials --platform ios

# Regenerate if needed
```

### Common Android Issues

**Build Failed - Keystore**
```bash
# Reset keystore
eas credentials --platform android

# Generate new keystore
```

**Google Play Upload Failed**
```bash
# Check package name matches Play Console
# Verify signing configuration
eas build:configure --platform android
```

### Debug Build Locally

iOS:
```bash
# Build for simulator
eas build --profile development --platform ios --local

# Install on simulator
xcrun simctl install booted path/to/app.app
```

Android:
```bash
# Build APK
eas build --profile development --platform android --local

# Install on device/emulator
adb install path/to/app.apk
```

---

## Release Checklist

### Pre-Release

- [ ] All features tested
- [ ] No critical bugs
- [ ] Version number updated
- [ ] Build number incremented
- [ ] Changelog updated
- [ ] Screenshots updated
- [ ] App Store metadata reviewed
- [ ] Privacy policy updated
- [ ] Terms of service updated

### Release

- [ ] Build production version
- [ ] Submit to TestFlight/Internal Testing
- [ ] Test with internal team
- [ ] Submit to App Store/Play Store
- [ ] Monitor for crashes
- [ ] Respond to reviews
- [ ] Announce release

### Post-Release

- [ ] Monitor analytics
- [ ] Track crash reports
- [ ] Gather user feedback
- [ ] Plan next version
- [ ] Update documentation

---

## Useful Commands

```bash
# List builds
eas build:list

# View build details
eas build:view <build-id>

# Cancel build
eas build:cancel <build-id>

# List updates
eas update:list

# View update details
eas update:view <update-id>

# Configure project
eas build:configure

# View credentials
eas credentials

# View project info
eas project:info
```

---

## Cost Estimation

### Expo EAS

- Free tier: 30 builds/month
- Starter: $29/month (unlimited builds)
- Production: $99/month (priority builds)

### App Stores

- Apple Developer: $99/year
- Google Play: $25 one-time

### Third-Party Services

- Sentry: Free for 5,000 events/month
- Analytics: Expo built-in (free)

**Total Monthly Cost:** ~$30-100 depending on build frequency

---

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

---

**Mobile deployment ready!** 📱

For questions or issues, contact the development team.
