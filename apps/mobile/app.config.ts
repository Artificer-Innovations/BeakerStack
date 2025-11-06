// Load .env.local from apps/mobile directory
// Using require to ensure it loads synchronously before config is evaluated
const dotenv = require("dotenv");
const path = require("path");

const envPath = path.resolve(__dirname, ".env.local");
const envResult = dotenv.config({ path: envPath });

// Also check for .env in apps/mobile as fallback
if (envResult.error) {
  const envFallbackPath = path.resolve(__dirname, ".env");
  dotenv.config({ path: envFallbackPath, override: false });
}

// Debug: Log what we're reading (only in development, and not during Gradle builds)
// Gradle captures stdout during builds, so we avoid console.log here
// Use console.warn instead if needed, or check in the app runtime

const config = {
  name: "demo-app",
  slug: "demo-app",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.anonymous.demoapp",
    infoPlist: {
      LSApplicationQueriesSchemes: [
        "com.googleusercontent.apps.75693205997-6r5f5nvmjnjhhehsm5j9baqsh6lej1rf",
      ],
      NSCameraUsageDescription: "This app needs access to your camera to upload profile pictures.",
      NSPhotoLibraryUsageDescription: "This app needs access to your photo library to upload profile pictures.",
    },
  },
  android: {
    package: "com.anonymous.demoapp",
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    permissions: [
      "android.permission.DETECT_SCREEN_CAPTURE",
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_EXTERNAL_STORAGE",
    ],
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.75693205997-6r5f5nvmjnjhhehsm5j9baqsh6lej1rf",
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
};

export default config;
