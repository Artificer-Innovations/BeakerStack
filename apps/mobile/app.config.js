// Load .env.local from apps/mobile directory
// Using require so config evaluates synchronously (plain JS for EAS / all Node loaders).
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// google-services.json is gitignored; EAS runs eas-build-pre-install to generate it.
const googleServicesJsonPath = path.join(__dirname, 'google-services.json');
const googleServicesFile = fs.existsSync(googleServicesJsonPath)
  ? './google-services.json'
  : undefined;

const envPath = path.resolve(__dirname, '.env.local');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  const envFallbackPath = path.resolve(__dirname, '.env');
  dotenv.config({ path: envFallbackPath, override: false });
}

function getATSExceptionDomain(supabaseUrl) {
  if (!supabaseUrl) return null;

  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;

    if (
      url.protocol === 'http:' &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.startsWith('192.168.') &&
      !hostname.startsWith('10.') &&
      !hostname.startsWith('172.')
    ) {
      return hostname;
    }
  } catch (_e) {
    // Invalid URL, ignore
  }

  return null;
}

function buildATSConfig() {
  const domain = getATSExceptionDomain(process.env.EXPO_PUBLIC_SUPABASE_URL);

  if (!domain) {
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
      GIDClientID: process.env.GOOGLE_SERVICES_IOS_CLIENT_ID,
      ...(buildATSConfig() ? { NSAppTransportSecurity: buildATSConfig() } : {}),
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
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  plugins: [
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.75693205997-6r5f5nvmjnjhhehsm5j9baqsh6lej1rf',
        iosClientId: process.env.GOOGLE_SERVICES_IOS_CLIENT_ID,
      },
    ],
    ['./plugins/withSplashScreenColor', {}],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.GOOGLE_SERVICES_WEB_CLIENT_ID,
    googleIosClientId: process.env.GOOGLE_SERVICES_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.GOOGLE_SERVICES_ANDROID_CLIENT_ID,
    eas: {
      projectId: '23c5e522-5341-4342-85f5-f2e46dd6087f',
    },
  },
};

module.exports = config;
