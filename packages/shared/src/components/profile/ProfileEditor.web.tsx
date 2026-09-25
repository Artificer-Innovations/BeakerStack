import { useState, useEffect } from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import {
  profileFormSchema,
  transformFormToUpdate,
  transformFormToInsert,
  type ProfileFormInput,
} from '../../validation/profileSchema';
import { ZodError } from 'zod';
import { FormInput, type FormInputProps } from '../forms/FormInput.web';
import { FormButton } from '../forms/FormButton.web';
import { FormError } from '../forms/FormError.web';
import { AvatarUpload } from './AvatarUpload.web';
import { Logger } from '@beakerstack/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfileEditorProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * ProfileEditor component for web
 * Provides a form for editing user profile information
 */
export function ProfileEditor({
  onSuccess,
  onError,
  className = '',
}: ProfileEditorProps) {
  const {
    supabaseClient,
    currentUser,
    profile: profileData,
    loading,
    error,
    createProfile,
    updateProfile,
  } = useProfileContext();
  const [formData, setFormData] = useState<ProfileFormInput>({
    username: '',
    display_name: '',
    bio: '',
    website: '',
    location: '',
    avatar_url: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profileData) {
      setFormData(profileToFormData(profileData));
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [profileData]);

  // Clear field error when user starts typing
  const handleFieldChange = (field: keyof ProfileFormInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async () => {
    /* v8 ignore start -- form is hidden unless currentUser is present */
    if (!currentUser) {
      const error = new Error('User must be logged in to update profile');
      setGeneralError(error.message);
      onError?.(error);
      return;
    }
    /* v8 ignore stop */

    setIsSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      // Validate form data
      const validatedData = profileFormSchema.parse(formData);

      // Transform to database format (empty strings -> null)
      const updateData = profileData
        ? transformFormToUpdate(validatedData)
        : transformFormToInsert(validatedData);

      // Submit to database
      if (profileData) {
        await updateProfile(currentUser.id, updateData);
      } else {
        await createProfile(currentUser.id, updateData);
      }

      // Success
      onSuccess?.();
    } catch (err) {
      if (err instanceof ZodError) {
        setFieldErrors(zodErrorsToFieldErrors(err));
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        setGeneralError(error.message);
        onError?.(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return <SignInNotice className={className} />;
  }

  if (loading && !profileData) {
    return <LoadingNotice className={className} />;
  }

  const isBusy = isSubmitting || loading;

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
        Edit Profile
      </h3>

      <ProfileEditorFields
        formData={formData}
        fieldErrors={fieldErrors}
        disabled={isBusy}
        onFieldChange={handleFieldChange}
        currentAvatarUrl={profileData?.avatar_url || null}
        currentUser={currentUser}
        userId={currentUser?.id || /* v8 ignore next */ ''}
        supabaseClient={supabaseClient}
        updateProfile={updateProfile}
      />

      {generalError && <FormError message={generalError} />}
      {error && <FormError message={error.message} />}

      <FormButton
        title={profileData ? 'Update Profile' : 'Create Profile'}
        onPress={handleSubmit}
        loading={isBusy}
        disabled={isBusy}
      />
    </div>
  );
}

type UpdateProfileFn = (
  userId: string,
  data: { avatar_url: string | null }
) => Promise<unknown>;

interface ProfileEditorFieldsProps {
  formData: ProfileFormInput;
  fieldErrors: Record<string, string>;
  disabled: boolean;
  onFieldChange: (field: keyof ProfileFormInput, value: string) => void;
  currentAvatarUrl: string | null;
  currentUser: { id: string } | null;
  userId: string;
  supabaseClient: SupabaseClient;
  updateProfile: UpdateProfileFn;
}

/**
 * Presentational block holding every editable field plus the avatar uploader.
 * Keeps the branchy value/error fallbacks and upload callbacks out of the
 * main editor so its complexity stays low.
 */
function ProfileEditorFields({
  formData,
  fieldErrors,
  disabled,
  onFieldChange,
  currentAvatarUrl,
  currentUser,
  userId,
  supabaseClient,
  updateProfile,
}: ProfileEditorFieldsProps) {
  return (
    <div className='space-y-4'>
      <ProfileFormField
        field='username'
        label='Username'
        value={formData.username ?? ''}
        error={fieldErrors['username']}
        onChange={onFieldChange}
        placeholder='Enter username (optional)'
        disabled={disabled}
      />

      <ProfileFormField
        field='display_name'
        label='Display Name'
        value={formData.display_name ?? ''}
        error={fieldErrors['display_name']}
        onChange={onFieldChange}
        placeholder='Enter display name (optional)'
        disabled={disabled}
      />

      <ProfileFormField
        field='bio'
        label='Bio'
        value={formData.bio ?? ''}
        error={fieldErrors['bio']}
        onChange={onFieldChange}
        placeholder='Tell us about yourself (optional)'
        multiline
        rows={4}
        disabled={disabled}
      />

      <ProfileFormField
        field='website'
        label='Website'
        value={formData.website ?? ''}
        error={fieldErrors['website']}
        onChange={onFieldChange}
        placeholder='https://example.com (optional)'
        type='url'
        disabled={disabled}
      />

      <ProfileFormField
        field='location'
        label='Location'
        value={formData.location ?? ''}
        error={fieldErrors['location']}
        onChange={onFieldChange}
        placeholder='Enter your location (optional)'
        disabled={disabled}
      />

      <AvatarUpload
        currentAvatarUrl={currentAvatarUrl}
        onUploadComplete={async url => {
          if (currentUser) {
            await persistAvatarUpload(
              url,
              currentUser.id,
              updateProfile,
              onFieldChange
            );
          }
        }}
        onRemove={async () => {
          if (currentUser) {
            // Update profile to remove avatar URL
            await updateProfile(currentUser.id, { avatar_url: null });
            // Update form data
            onFieldChange('avatar_url', '');
          }
        }}
        userId={userId}
        supabaseClient={supabaseClient}
      />
    </div>
  );
}

/**
 * Maps a loaded profile record into the editor form shape, coercing
 * nullish optional fields to empty strings.
 */
function profileToFormData(
  profileData: Record<string, unknown>
): ProfileFormInput {
  return {
    username: (profileData['username'] as string) || '',
    display_name: (profileData['display_name'] as string) || '',
    bio: (profileData['bio'] as string) || '',
    website: (profileData['website'] as string) || '',
    location: (profileData['location'] as string) || '',
    avatar_url: (profileData['avatar_url'] as string) || '',
  };
}

/**
 * Flattens Zod validation issues into a field -> message map, keeping only
 * the first path segment as the field key.
 */
function zodErrorsToFieldErrors(err: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  err.errors.forEach(error => {
    const field = error.path[0] as string;
    if (field) {
      errors[field] = error.message;
    }
  });
  return errors;
}

/**
 * Persists a completed avatar upload: strips cache-busting query params,
 * writes the clean URL to the profile, and syncs the form field.
 */
async function persistAvatarUpload(
  url: string,
  userId: string,
  updateProfile: (
    userId: string,
    data: { avatar_url: string | null }
  ) => Promise<unknown>,
  handleFieldChange: (field: keyof ProfileFormInput, value: string) => void
): Promise<void> {
  Logger.debug('[ProfileEditor.web] Avatar upload complete, URL:', url);
  // Ensure we're saving the clean URL (without cache-busting params)
  const cleanUrl = url.split('?')[0]; // Remove any query params
  Logger.debug('[ProfileEditor.web] Saving clean URL to database:', cleanUrl);

  // Update profile with new avatar URL
  if (cleanUrl) {
    await updateProfile(userId, { avatar_url: cleanUrl });
    // Update form data
    handleFieldChange('avatar_url', cleanUrl);
  }

  Logger.debug('[ProfileEditor.web] Profile updated with avatar URL');
}

/**
 * Notice shown when there is no signed-in user.
 */
function SignInNotice({ className }: { className: string }) {
  return (
    <div
      className={`rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4 ${className}`}
    >
      <p className='text-sm text-yellow-800 dark:text-yellow-300'>
        Please sign in to edit your profile.
      </p>
    </div>
  );
}

/**
 * Notice shown while the initial profile load is in flight.
 */
function LoadingNotice({ className }: { className: string }) {
  return (
    <div className={`rounded-md bg-gray-50 dark:bg-gray-800 p-4 ${className}`}>
      <p className='text-sm text-gray-600 dark:text-gray-400'>
        Loading profile...
      </p>
    </div>
  );
}

interface ProfileFormFieldProps {
  field: keyof ProfileFormInput;
  label: string;
  value: string;
  error: string | undefined;
  onChange: (field: keyof ProfileFormInput, value: string) => void;
  placeholder: string;
  disabled: boolean;
  type?: FormInputProps['type'];
  multiline?: boolean;
  rows?: number;
}

/**
 * Local presentational field wrapper. Renders a FormInput with the
 * conditional error spread so the main editor stays flat.
 */
function ProfileFormField({
  field,
  label,
  value,
  error,
  onChange,
  placeholder,
  disabled,
  type,
  multiline,
  rows,
}: ProfileFormFieldProps) {
  return (
    <FormInput
      label={label}
      value={value}
      onChange={val => onChange(field, val)}
      {...(error ? { error } : {})}
      placeholder={placeholder}
      {...(type ? { type } : {})}
      {...(multiline ? { multiline } : {})}
      {...(rows !== undefined ? { rows } : {})}
      disabled={disabled}
    />
  );
}
