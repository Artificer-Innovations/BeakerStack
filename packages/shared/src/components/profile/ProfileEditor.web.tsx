import { useState, useEffect } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { useProfile } from '../../hooks/useProfile';
import { profileFormSchema, transformFormToUpdate, transformFormToInsert, type ProfileFormInput } from '../../validation/profileSchema';
import { ZodError } from 'zod';
import { FormInput } from '../forms/FormInput.web';
import { FormButton } from '../forms/FormButton.web';
import { FormError } from '../forms/FormError.web';
import { AvatarUpload } from './AvatarUpload.web';

export interface ProfileEditorProps {
  supabaseClient: SupabaseClient;
  user: User | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * ProfileEditor component for web
 * Provides a form for editing user profile information
 */
export function ProfileEditor({
  supabaseClient,
  user,
  onSuccess,
  onError,
  className = '',
}: ProfileEditorProps) {
  const profile = useProfile(supabaseClient, user);
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
    if (profile.profile) {
      setFormData({
        username: profile.profile.username || '',
        display_name: profile.profile.display_name || '',
        bio: profile.profile.bio || '',
        website: profile.profile.website || '',
        location: profile.profile.location || '',
        avatar_url: profile.profile.avatar_url || '',
      });
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [profile.profile]);

  // Clear field error when user starts typing
  const handleFieldChange = (field: keyof ProfileFormInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
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
    if (!user) {
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
      const updateData = profile.profile
        ? transformFormToUpdate(validatedData)
        : transformFormToInsert(validatedData);

      // Submit to database
      if (profile.profile) {
        await profile.updateProfile(user.id, updateData);
      } else {
        await profile.createProfile(user.id, updateData);
      }

      // Success
      onSuccess?.();
    } catch (err) {
      if (err instanceof ZodError) {
        // Map Zod errors to field errors
        const errors: Record<string, string> = {};
        err.errors.forEach((error) => {
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

  if (!user) {
    return (
      <div className={`rounded-md bg-yellow-50 p-4 ${className}`}>
        <p className="text-sm text-yellow-800">Please sign in to edit your profile.</p>
      </div>
    );
  }

  if (profile.loading && !profile.profile) {
    return (
      <div className={`rounded-md bg-gray-50 p-4 ${className}`}>
        <p className="text-sm text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>

      <div className="space-y-4">
        <FormInput
          label="Username"
          value={formData.username}
          onChange={(value) => handleFieldChange('username', value)}
          error={fieldErrors.username}
          placeholder="Enter username (optional)"
          disabled={isSubmitting || profile.loading}
        />

        <FormInput
          label="Display Name"
          value={formData.display_name}
          onChange={(value) => handleFieldChange('display_name', value)}
          error={fieldErrors.display_name}
          placeholder="Enter display name (optional)"
          disabled={isSubmitting || profile.loading}
        />

        <FormInput
          label="Bio"
          value={formData.bio}
          onChange={(value) => handleFieldChange('bio', value)}
          error={fieldErrors.bio}
          placeholder="Tell us about yourself (optional)"
          multiline
          rows={4}
          disabled={isSubmitting || profile.loading}
        />

        <FormInput
          label="Website"
          value={formData.website}
          onChange={(value) => handleFieldChange('website', value)}
          error={fieldErrors.website}
          placeholder="https://example.com (optional)"
          type="url"
          disabled={isSubmitting || profile.loading}
        />

        <FormInput
          label="Location"
          value={formData.location}
          onChange={(value) => handleFieldChange('location', value)}
          error={fieldErrors.location}
          placeholder="Enter your location (optional)"
          disabled={isSubmitting || profile.loading}
        />

        <AvatarUpload
          currentAvatarUrl={profile.profile?.avatar_url || null}
          onUploadComplete={async (url) => {
            if (user) {
              console.log('[ProfileEditor.web] Avatar upload complete, URL:', url);
              // Ensure we're saving the clean URL (without cache-busting params)
              const cleanUrl = url.split('?')[0]; // Remove any query params
              console.log('[ProfileEditor.web] Saving clean URL to database:', cleanUrl);
              
              // Update profile with new avatar URL
              await profile.updateProfile(user.id, { avatar_url: cleanUrl });
              // Update form data
              handleFieldChange('avatar_url', cleanUrl);
              
              console.log('[ProfileEditor.web] Profile updated with avatar URL');
            }
          }}
          onRemove={async () => {
            if (user) {
              // Update profile to remove avatar URL
              await profile.updateProfile(user.id, { avatar_url: null });
              // Update form data
              handleFieldChange('avatar_url', '');
            }
          }}
          userId={user?.id || ''}
          supabaseClient={supabaseClient}
        />
      </div>

      {generalError && <FormError message={generalError} />}
      {profile.error && <FormError message={profile.error.message} />}

      <FormButton
        title={profile.profile ? 'Update Profile' : 'Create Profile'}
        onPress={handleSubmit}
        loading={isSubmitting || profile.loading}
        disabled={isSubmitting || profile.loading}
      />
    </div>
  );
}

