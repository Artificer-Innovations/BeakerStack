#!/usr/bin/env node
/**
 * Generate google-services.json from environment variables
 * This script is run during EAS builds to create the google-services.json file
 * from environment variables instead of committing secrets to git.
 */

const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const outputPath = path.join(mobileRoot, 'google-services.json');

// Required environment variables
// EAS local builds use the same EAS-managed keystore as cloud builds
// So we use the same client ID and certificate hash for both
const requiredVars = {
  GOOGLE_SERVICES_PROJECT_NUMBER: process.env.GOOGLE_SERVICES_PROJECT_NUMBER,
  GOOGLE_SERVICES_PROJECT_ID: process.env.GOOGLE_SERVICES_PROJECT_ID,
  GOOGLE_SERVICES_STORAGE_BUCKET: process.env.GOOGLE_SERVICES_STORAGE_BUCKET,
  GOOGLE_SERVICES_MOBILESDK_APP_ID: process.env.GOOGLE_SERVICES_MOBILESDK_APP_ID,
  GOOGLE_SERVICES_ANDROID_CLIENT_ID: process.env.GOOGLE_SERVICES_ANDROID_CLIENT_ID,
  GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH: process.env.GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH,
  GOOGLE_SERVICES_WEB_CLIENT_ID: process.env.GOOGLE_SERVICES_WEB_CLIENT_ID,
  GOOGLE_SERVICES_IOS_CLIENT_ID: process.env.GOOGLE_SERVICES_IOS_CLIENT_ID,
  GOOGLE_SERVICES_API_KEY: process.env.GOOGLE_SERVICES_API_KEY,
};

// Check if we're in a build environment (EAS build or CI)
const isBuildEnv = process.env.EAS_BUILD === 'true' || process.env.CI === 'true';
// Check if we're in an EAS build temporary directory (local or cloud)
const isEasBuildDir = process.cwd().includes('eas-build-local-nodejs') || 
                      process.cwd().includes('/tmp/') ||
                      process.env.EAS_BUILD === 'true';

// If not in build env and file exists, skip generation (for local dev)
// But if we're in an EAS build directory and file doesn't exist, we need to generate it
if (!isBuildEnv && !isEasBuildDir && fs.existsSync(outputPath)) {
  console.log('✅ google-services.json already exists, skipping generation');
  process.exit(0);
}

// Check for missing required variables
const missingVars = Object.entries(requiredVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  if (isBuildEnv || isEasBuildDir) {
    // In EAS build (local or cloud), we need the file
    console.error('❌ Missing required environment variables for google-services.json:');
    missingVars.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 For EAS builds, set these as EAS secrets:');
    console.error('   eas secret:create --scope project --name GOOGLE_SERVICES_PROJECT_NUMBER --value "..."');
    console.error('   (and similarly for other GOOGLE_SERVICES_* variables)');
    console.error('\n💡 For local EAS builds, you can also:');
    console.error('   1. Add these to your .env.local file, or');
    console.error('   2. Ensure google-services.json is in apps/mobile/ (it will be copied to the build)');
    process.exit(1);
  } else {
    // For local dev (not in EAS build), warn but don't fail
    console.warn('⚠️  Missing environment variables for google-services.json:');
    missingVars.forEach(key => console.warn(`   - ${key}`));
    console.warn('💡 Using local google-services.json if it exists, or create it manually.');
    if (!fs.existsSync(outputPath)) {
      console.error('❌ google-services.json not found and cannot be generated.');
      process.exit(1);
    }
    process.exit(0);
  }
}

// Package name from app.config.ts or environment
const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.anonymous.beakerstack';
const bundleId = process.env.IOS_BUNDLE_ID || 'com.anonymous.beakerstack';

// Generate the google-services.json structure
const googleServices = {
  project_info: {
    project_number: requiredVars.GOOGLE_SERVICES_PROJECT_NUMBER,
    project_id: requiredVars.GOOGLE_SERVICES_PROJECT_ID,
    storage_bucket: requiredVars.GOOGLE_SERVICES_STORAGE_BUCKET,
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: requiredVars.GOOGLE_SERVICES_MOBILESDK_APP_ID,
        android_client_info: {
          package_name: packageName,
        },
      },
      oauth_client: [
        {
          client_id: requiredVars.GOOGLE_SERVICES_ANDROID_CLIENT_ID,
          client_type: 1,
          android_info: {
            package_name: packageName,
            certificate_hash: requiredVars.GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH,
          },
        },
        {
          client_id: requiredVars.GOOGLE_SERVICES_WEB_CLIENT_ID,
          client_type: 3,
        },
      ],
      api_key: [
        {
          current_key: requiredVars.GOOGLE_SERVICES_API_KEY,
        },
      ],
      services: {
        appinvite_service: {
          other_platform_oauth_client: [
            {
              client_id: requiredVars.GOOGLE_SERVICES_WEB_CLIENT_ID,
              client_type: 3,
            },
            {
              client_id: requiredVars.GOOGLE_SERVICES_IOS_CLIENT_ID,
              client_type: 2,
              ios_info: {
                bundle_id: bundleId,
              },
            },
          ],
        },
      },
    },
  ],
  configuration_version: '1',
};

// Write the file
fs.writeFileSync(outputPath, JSON.stringify(googleServices, null, 2));
console.log('✅ Generated google-services.json from environment variables');

