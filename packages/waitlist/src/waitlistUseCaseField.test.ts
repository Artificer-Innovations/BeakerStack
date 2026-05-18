import { describe, expect, it } from 'vitest';
import { defineWaitlistConfig } from './schema.js';
import {
  DEFAULT_USE_CASE_FIELD_LABEL,
  USE_CASE_FIELD_ID,
  buildMetadataSchemaFromUseCaseEditor,
  defaultUseCaseField,
  findUseCaseField,
  resolveUseCaseFieldEditorState,
  resolveWaitlistFormMetadataFields,
} from './waitlistUseCaseField.js';

const configWithUseCase = defineWaitlistConfig({
  productId: 'beakerstack',
  appOrigin: 'http://localhost:5173',
  emailTemplates: {
    inviteSubject: 'Invite',
    inviteHtml: '<p>Hi</p>',
  },
  metadataFields: [
    {
      id: 'use_case',
      label: 'Config default question (optional)',
      type: 'textarea',
      required: false,
    },
  ],
});

const configWithHiddenAndVisible = defineWaitlistConfig({
  productId: 'beakerstack',
  appOrigin: 'http://localhost:5173',
  emailTemplates: {
    inviteSubject: 'Invite',
    inviteHtml: '<p>Hi</p>',
  },
  metadataFields: [
    { id: 'ref', label: 'Hidden ref', type: 'hidden' },
    { id: 'company', label: 'Company', type: 'text' },
  ],
});

describe('waitlistUseCaseField constants', () => {
  it('exports stable ids and default label', () => {
    expect(USE_CASE_FIELD_ID).toBe('use_case');
    expect(DEFAULT_USE_CASE_FIELD_LABEL).toContain('optional');
  });
});

describe('defaultUseCaseField', () => {
  it('uses the default label when none is provided', () => {
    expect(defaultUseCaseField()).toEqual({
      id: USE_CASE_FIELD_ID,
      label: DEFAULT_USE_CASE_FIELD_LABEL,
      type: 'textarea',
      required: false,
    });
  });

  it('uses a custom label when provided', () => {
    expect(defaultUseCaseField('Why join?')).toEqual({
      id: USE_CASE_FIELD_ID,
      label: 'Why join?',
      type: 'textarea',
      required: false,
    });
  });
});

describe('findUseCaseField', () => {
  it('returns undefined when schema is missing', () => {
    expect(findUseCaseField(undefined)).toBeUndefined();
  });

  it('returns undefined when use_case is absent', () => {
    expect(
      findUseCaseField([{ id: 'company', label: 'Company', type: 'text' }])
    ).toBeUndefined();
  });

  it('returns the use_case field when present', () => {
    const field = {
      id: 'use_case',
      label: 'Custom',
      type: 'textarea' as const,
    };
    expect(findUseCaseField([field])).toBe(field);
  });
});

describe('resolveUseCaseFieldEditorState', () => {
  it('reads enabled state from server metadata schema', () => {
    expect(
      resolveUseCaseFieldEditorState(
        [
          {
            id: 'use_case',
            label: 'Custom label',
            type: 'textarea',
          },
        ],
        configWithUseCase
      )
    ).toEqual({ enabled: true, label: 'Custom label' });
  });

  it('prefers schema over config when use_case exists in schema', () => {
    expect(
      resolveUseCaseFieldEditorState(
        [{ id: 'use_case', label: 'From server', type: 'textarea' }],
        configWithUseCase
      )
    ).toEqual({ enabled: true, label: 'From server' });
  });

  it('defaults to disabled with config label when schema has no use_case', () => {
    expect(resolveUseCaseFieldEditorState([], configWithUseCase)).toEqual({
      enabled: false,
      label: 'Config default question (optional)',
    });
  });

  it('defaults to disabled with built-in label when config is omitted', () => {
    expect(resolveUseCaseFieldEditorState(undefined)).toEqual({
      enabled: false,
      label: DEFAULT_USE_CASE_FIELD_LABEL,
    });
  });

  it('defaults to disabled with built-in label when config has no use_case field', () => {
    expect(
      resolveUseCaseFieldEditorState(undefined, configWithHiddenAndVisible)
    ).toEqual({
      enabled: false,
      label: DEFAULT_USE_CASE_FIELD_LABEL,
    });
  });
});

describe('buildMetadataSchemaFromUseCaseEditor', () => {
  it('returns empty array when disabled', () => {
    expect(
      buildMetadataSchemaFromUseCaseEditor({
        enabled: false,
        label: 'ignored',
      })
    ).toEqual([]);
  });

  it('returns a single use_case field when enabled', () => {
    expect(
      buildMetadataSchemaFromUseCaseEditor({
        enabled: true,
        label: 'Why do you want access?',
      })
    ).toEqual([
      {
        id: USE_CASE_FIELD_ID,
        label: 'Why do you want access?',
        type: 'textarea',
        required: false,
      },
    ]);
  });

  it('falls back to the default label when enabled with blank label', () => {
    expect(
      buildMetadataSchemaFromUseCaseEditor({
        enabled: true,
        label: '   ',
      })
    ).toEqual([defaultUseCaseField()]);
  });
});

describe('resolveWaitlistFormMetadataFields', () => {
  it('honors an empty server schema without falling back to config', () => {
    expect(
      resolveWaitlistFormMetadataFields(
        { metadata_schema: [] },
        configWithUseCase
      )
    ).toEqual([]);
  });

  it('treats missing metadata_schema on settings as empty', () => {
    expect(
      resolveWaitlistFormMetadataFields(
        { metadata_schema: undefined },
        configWithUseCase
      )
    ).toEqual([]);
  });

  it('filters hidden fields from server schema', () => {
    expect(
      resolveWaitlistFormMetadataFields(
        {
          metadata_schema: [
            { id: 'ref', label: 'Ref', type: 'hidden' },
            { id: 'company', label: 'Company', type: 'text' },
          ],
        },
        configWithUseCase
      )
    ).toEqual([{ id: 'company', label: 'Company', type: 'text' }]);
  });

  it('uses config fields when settings are null', () => {
    expect(resolveWaitlistFormMetadataFields(null, configWithUseCase)).toEqual(
      configWithUseCase.metadataFields
    );
  });

  it('uses config fields when settings are undefined', () => {
    expect(
      resolveWaitlistFormMetadataFields(undefined, configWithUseCase)
    ).toEqual(configWithUseCase.metadataFields);
  });

  it('filters hidden fields from config when settings are absent', () => {
    expect(
      resolveWaitlistFormMetadataFields(null, configWithHiddenAndVisible)
    ).toEqual([{ id: 'company', label: 'Company', type: 'text' }]);
  });
});
