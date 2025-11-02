export const featureFlags = {
  oauthGoogle: false,
  oauthApple: false,
} as const;

export type FeatureFlags = typeof featureFlags;

export function useFeatureFlags(): FeatureFlags {
  return featureFlags;
}

