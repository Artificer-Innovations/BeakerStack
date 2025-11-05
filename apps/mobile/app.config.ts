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

// Debug: Log what we're reading (only in development)
if (process.env.NODE_ENV !== "production") {
  console.log("[app.config.ts] Environment variables loaded:", {
    hasWebClientId: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    hasIosClientId: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    hasAndroidClientId: !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientIdLength: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.length || 0,
  });
}

const config = {
  name: "demo-app",
  slug: "demo-app",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
};

export default config;
