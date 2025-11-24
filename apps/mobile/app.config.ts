// Load .env.local from apps/mobile directory
// Using require to ensure it loads synchronously before config is evaluated
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envResult = dotenv.config({ path: envPath });

// Also check for .env in apps/mobile as fallback
if (envResult.error) {
  const envFallbackPath = path.resolve(__dirname, '.env');
  dotenv.config({ path: envFallbackPath, override: false });
}

// Debug: Log what we're reading (only in development, and not during Gradle builds)
// Gradle captures stdout during builds, so we avoid console.log here
// Use console.warn instead if needed, or check in the app runtime

// Helper function to extract domain from Supabase URL for ATS exception
function getATSExceptionDomain(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;

  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;

    // Only add ATS exception for non-localhost HTTP domains (like nip.io)
    if (
      url.protocol === 'http:' &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.startsWith('192.168.') && // Skip raw IPs
      !hostname.startsWith('10.') &&
      !hostname.startsWith('172.')
    ) {
      return hostname;
    }
  } catch (e) {
    // Invalid URL, ignore
  }

  return null;
}

// Build iOS App Transport Security config dynamically
function buildATSConfig() {
  const domain = getATSExceptionDomain(process.env.EXPO_PUBLIC_SUPABASE_URL);

  if (!domain) {
    // No ATS exception needed
    return undefined;
  }

  return {
    NSAllowsArbitraryLoads: false,
    NSExceptionDomains: {
      [domain]: {
        NSIncludesSubdomains: true,
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSExceptionRequiresForwardSecrecy: false,
      },
    },
  };
}

const config = {
  name: 'Beaker Stack',
  slug: 'beaker-stack',
  owner: 'artificer-innovations-llc',
  scheme: 'beaker-stack',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/23c5e522-5341-4342-85f5-f2e46dd6087f',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.beakerstack',
    infoPlist: {
      LSApplicationQueriesSchemes: [
        'com.googleusercontent.apps.75693205997-6r5f5nvmjnjhhehsm5j9baqsh6lej1rf',
      ],
      NSCameraUsageDescription:
        'This app needs access to your camera to upload profile pictures.',
      NSPhotoLibraryUsageDescription:
        'This app needs access to your photo library to upload profile pictures.',
      // Google Sign-In configuration
      GIDClientID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      // Dynamically add ATS exception for HTTP nip.io domains (development only)
      ...(buildATSConfig() ? { NSAppTransportSecurity: buildATSConfig() } : {}),
      // Indicates app uses standard/exempt encryption (HTTPS/TLS)
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.anonymous.beakerstack',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#ffffff',
    },
    splash: {
      backgroundColor: '#ffffff',
      resizeMode: 'contain',
    },
    permissions: [
      'android.permission.DETECT_SCREEN_CAPTURE',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
    ],
    googleServicesFile: './google-services.json',
  },
  plugins: [
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.75693205997-6r5f5nvmjnjhhehsm5j9baqsh6lej1rf',
        // Add GIDClientID to Info.plist for Google Sign-In
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      },
    ],
    // Run our plugin last to ensure it runs after Expo's splash screen plugin
    ['./plugins/withSplashScreenColor', {}],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // EAS local builds use the same EAS-managed keystore as cloud builds
    // So we use the same Android client ID for both
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    eas: {
      projectId: '23c5e522-5341-4342-85f5-f2e46dd6087f',
    },
  },
};

export default config;
