import { useState, useEffect } from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import {
  profileFormSchema,
  transformFormToUpdate,
  transformFormToInsert,
  type ProfileFormInput,
} from '../../validation/profileSchema';
import { ZodError } from 'zod';
import { FormInput } from '../forms/FormInput.web';
import { FormButton } from '../forms/FormButton.web';
import { FormError } from '../forms/FormError.web';
import { AvatarUpload } from './AvatarUpload.web';
import { Logger } from '../../utils/logger';

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
      setFormData({
        username: profileData['username'] || '',
        display_name: profileData['display_name'] || '',
        bio: profileData['bio'] || '',
        website: profileData['website'] || '',
        location: profileData['location'] || '',
        avatar_url: profileData['avatar_url'] || '',
      });
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
    if (!currentUser) {
      const error = new Error('User must be logged in to update profile');
      setGeneralError(error.message);
      onError?.(error);
      return;
    }

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
        // Map Zod errors to field errors
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          const field = error.path[0] as string;
          if (field) {
            errors[field] = error.message;
          }
        });
        setFieldErrors(errors);
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
    return (
      <div className={`rounded-md bg-yellow-50 p-4 ${className}`}>
        <p className='text-sm text-yellow-800'>
          Please sign in to edit your profile.
        </p>
      </div>
    );
  }

  if (loading && !profileData) {
    return (
      <div className={`rounded-md bg-gray-50 p-4 ${className}`}>
        <p className='text-sm text-gray-600'>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className='text-lg font-semibold text-gray-900'>Edit Profile</h3>

      <div className='space-y-4'>
        <FormInput
          label='Username'
          value={formData.username ?? ''}
          onChange={value => handleFieldChange('username', value)}
          {...(fieldErrors['username']
            ? { error: fieldErrors['username'] }
            : {})}
          placeholder='Enter username (optional)'
          disabled={isSubmitting || loading}
        />

        <FormInput
          label='Display Name'
          value={formData.display_name ?? ''}
          onChange={value => handleFieldChange('display_name', value)}
          {...(fieldErrors['display_name']
            ? { error: fieldErrors['display_name'] }
            : {})}
          placeholder='Enter display name (optional)'
          disabled={isSubmitting || loading}
        />

        <FormInput
          label='Bio'
          value={formData.bio ?? ''}
          onChange={value => handleFieldChange('bio', value)}
          {...(fieldErrors['bio'] ? { error: fieldErrors['bio'] } : {})}
          placeholder='Tell us about yourself (optional)'
          multiline
          rows={4}
          disabled={isSubmitting || loading}
        />

        <FormInput
          label='Website'
          value={formData.website ?? ''}
          onChange={value => handleFieldChange('website', value)}
          {...(fieldErrors['website'] ? { error: fieldErrors['website'] } : {})}
          placeholder='https://example.com (optional)'
          type='url'
          disabled={isSubmitting || loading}
        />

        <FormInput
          label='Location'
          value={formData.location ?? ''}
          onChange={value => handleFieldChange('location', value)}
          {...(fieldErrors['location']
            ? { error: fieldErrors['location'] }
            : {})}
          placeholder='Enter your location (optional)'
          disabled={isSubmitting || loading}
        />

        <AvatarUpload
          currentAvatarUrl={profileData?.avatar_url || null}
          onUploadComplete={async url => {
            if (currentUser) {
              Logger.debug(
                '[ProfileEditor.web] Avatar upload complete, URL:',
                url
              );
              // Ensure we're saving the clean URL (without cache-busting params)
              const cleanUrl = url.split('?')[0]; // Remove any query params
              Logger.debug(
                '[ProfileEditor.web] Saving clean URL to database:',
                cleanUrl
              );

              // Update profile with new avatar URL
              if (cleanUrl) {
                await updateProfile(currentUser.id, {
                  avatar_url: cleanUrl,
                });
                // Update form data
                handleFieldChange('avatar_url', cleanUrl);
              }

              Logger.debug(
                '[ProfileEditor.web] Profile updated with avatar URL'
              );
            }
          }}
          onRemove={async () => {
            if (currentUser) {
              // Update profile to remove avatar URL
              await updateProfile(currentUser.id, { avatar_url: null });
              // Update form data
              handleFieldChange('avatar_url', '');
            }
          }}
          userId={currentUser?.id || ''}
          supabaseClient={supabaseClient}
        />
      </div>

      {generalError && <FormError message={generalError} />}
      {error && <FormError message={error.message} />}

      <FormButton
        title={profileData ? 'Update Profile' : 'Create Profile'}
        onPress={handleSubmit}
        loading={isSubmitting || loading}
        disabled={isSubmitting || loading}
      />
    </div>
  );
}
