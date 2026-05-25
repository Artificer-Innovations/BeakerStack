import type { ProfileEditorProps } from '@beakerstack/shared/components/profile/ProfileEditor.native';
import type { ComponentType } from 'react';

export type ProfileEditorModule = {
  ProfileEditor: ComponentType<ProfileEditorProps>;
};

/**
 * Loads ProfileEditor lazily on first call. Uses async require so Metro can
 * defer the module until edit mode (same timing as dynamic import()).
 */
export function loadProfileEditorModule(): Promise<ProfileEditorModule> {
  return Promise.resolve().then(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro async require for lazy bundle
      require('@beakerstack/shared/components/profile/ProfileEditor.native') as ProfileEditorModule
  );
}
