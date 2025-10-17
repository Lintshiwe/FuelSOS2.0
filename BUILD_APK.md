# 📱 FuelSOS APK Build Guide

## Prerequisites

### 1. Install Flutter SDK

```bash
# Download Flutter SDK from https://flutter.dev/docs/get-started/install
# Extract to C:\flutter (or preferred location)
# Add C:\flutter\bin to your PATH environment variable
```

### 2. Install Android Studio

```bash
# Download from https://developer.android.com/studio
# Install Android SDK and accept licenses
# Set ANDROID_HOME environment variable
```

### 3. Verify Installation

```bash
flutter doctor
# Should show all checkmarks for Android development
```

## Build Steps

### 1. Navigate to project

```bash
cd "c:\Users\ntoam\Desktop\Projects\FuelSOS2.0\frontend"
```

### 2. Install dependencies

```bash
flutter pub get
```

### 3. Create local.properties (if needed)

```bash
# Create android/local.properties with:
sdk.dir=C:\\Users\\%USERNAME%\\AppData\\Local\\Android\\Sdk
flutter.sdk=C:\\flutter
```

### 4. Build APK

```bash
# Debug APK (for testing)
flutter build apk --debug

# Release APK (for distribution)
flutter build apk --release

# Split APK by architecture (smaller size)
flutter build apk --split-per-abi
```

### 5. Find your APK

```
Location: build/app/outputs/flutter-apk/
Files:
- app-debug.apk (debug build)
- app-release.apk (release build)
- app-arm64-v8a-release.apk (64-bit devices)
- app-armeabi-v7a-release.apk (32-bit devices)
```

## Configuration Required

### 1. Google Maps API Key

```xml
<!-- In android/app/src/main/AndroidManifest.xml -->
<meta-data android:name="com.google.android.geo.API_KEY"
           android:value="YOUR_ACTUAL_GOOGLE_MAPS_API_KEY"/>
```

### 2. Firebase Configuration

```bash
# Add google-services.json to android/app/
# Download from Firebase Console > Project Settings > Your apps
```

### 3. App Signing (for release)

```bash
# Generate keystore
keytool -genkey -v -keystore fuelsos-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fuelsos

# Configure in android/app/build.gradle
android {
    signingConfigs {
        release {
            keyAlias 'fuelsos'
            keyPassword 'your-key-password'
            storeFile file('../fuelsos-key.jks')
            storePassword 'your-store-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Flutter not found**

   - Add Flutter to PATH
   - Restart terminal/IDE

2. **Android licenses not accepted**

   ```bash
   flutter doctor --android-licenses
   ```

3. **Gradle build fails**

   ```bash
   cd android
   ./gradlew clean
   cd ..
   flutter clean
   flutter pub get
   ```

4. **Permission issues**
   - Run as administrator
   - Check antivirus settings

### Quick Test Without Building APK

If you want to test the app quickly without building an APK:

1. **Use Chrome (Flutter Web)**

   ```bash
   flutter run -d chrome
   ```

2. **Use Android Emulator**
   ```bash
   flutter emulators --launch <emulator_name>
   flutter run
   ```

## Alternative: Web Version

I've also created a web version that works immediately without any setup:

- Open `web/index.html` in any browser
- All core features work (SOS, chat, calls)
- No installation required

## APK Installation

Once built, install the APK on Android device:

```bash
# Via ADB
adb install build/app/outputs/flutter-apk/app-release.apk

# Or transfer APK to device and install manually
# (Enable "Unknown Sources" in device settings)
```

## Ready-to-Use Commands

```bash
# Complete build process
cd "c:\Users\ntoam\Desktop\Projects\FuelSOS2.0\frontend"
flutter pub get
flutter build apk --release
```

The APK will be at: `build/app/outputs/flutter-apk/app-release.apk`
