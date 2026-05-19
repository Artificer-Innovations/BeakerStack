import { loadProfileEditorModule } from '../../src/screens/profileEditorLoader';

function MockProfileEditor() {
  return null;
}

jest.mock(
  '@beakerstack/shared/components/profile/ProfileEditor.native',
  () => ({
    ProfileEditor: MockProfileEditor,
  })
);

describe('profileEditorLoader', () => {
  it('resolves the ProfileEditor module', async () => {
    const module = await loadProfileEditorModule();

    expect(module.ProfileEditor).toBe(MockProfileEditor);
  });

  it('returns a new promise on each call', async () => {
    const first = loadProfileEditorModule();
    const second = loadProfileEditorModule();

    expect(first).not.toBe(second);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ProfileEditor: MockProfileEditor },
      { ProfileEditor: MockProfileEditor },
    ]);
  });
});
