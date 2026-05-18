import type { WaitlistConfig } from './schema.js';
import type { WaitlistMetadataField } from './types.js';

export const USE_CASE_FIELD_ID = 'use_case';

export const DEFAULT_USE_CASE_FIELD_LABEL =
  'What are you hoping to use this for? (optional)';

export interface UseCaseFieldEditorState {
  enabled: boolean;
  label: string;
}

export function defaultUseCaseField(
  label: string = DEFAULT_USE_CASE_FIELD_LABEL
): WaitlistMetadataField {
  return {
    id: USE_CASE_FIELD_ID,
    label,
    type: 'textarea',
    required: false,
  };
}

export function findUseCaseField(
  schema: WaitlistMetadataField[] | undefined
): WaitlistMetadataField | undefined {
  return schema?.find(f => f.id === USE_CASE_FIELD_ID);
}

export function resolveUseCaseFieldEditorState(
  metadataSchema: WaitlistMetadataField[] | undefined,
  config?: Pick<WaitlistConfig, 'metadataFields'>
): UseCaseFieldEditorState {
  const fromSchema = findUseCaseField(metadataSchema);
  if (fromSchema) {
    return { enabled: true, label: fromSchema.label };
  }

  const fromConfig = config?.metadataFields
    ? findUseCaseField(config.metadataFields)
    : undefined;

  return {
    enabled: false,
    label: fromConfig?.label ?? DEFAULT_USE_CASE_FIELD_LABEL,
  };
}

export function buildMetadataSchemaFromUseCaseEditor(
  state: UseCaseFieldEditorState
): WaitlistMetadataField[] {
  if (!state.enabled) return [];
  const label = state.label.trim() || DEFAULT_USE_CASE_FIELD_LABEL;
  return [defaultUseCaseField(label)];
}

/** Visible waitlist form fields: honor server schema when settings exist (including []). */
export function resolveWaitlistFormMetadataFields(
  settings: { metadata_schema?: WaitlistMetadataField[] } | null | undefined,
  config: Pick<WaitlistConfig, 'metadataFields'>
): WaitlistMetadataField[] {
  if (settings) {
    return (settings.metadata_schema ?? []).filter(f => f.type !== 'hidden');
  }
  return config.metadataFields.filter(f => f.type !== 'hidden');
}
