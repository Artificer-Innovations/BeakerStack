import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { useProfile } from '../../hooks/useProfile';
import { profileFormSchema, transformFormToUpdate, transformFormToInsert, type ProfileFormInput } from '../../validation/profileSchema';
// Note: Not importing ZodError directly to avoid React Native prototype issues
// Will check for ZodError shape manually
import { FormInput } from '../forms/FormInput.native';
import { FormButton } from '../forms/FormButton.native';
import { FormError } from '../forms/FormError.native';

export interface ProfileEditorProps {
  supabaseClient: SupabaseClient;
  user: User | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  style?: ViewStyle;
}

/**
 * ProfileEditor component for React Native
 * Provides a form for editing user profile information
 */
export function ProfileEditor({
  supabaseClient,
  user,
  onSuccess,
  onError,
  style,
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
  const handleFieldChange = useCallback((field: keyof ProfileFormInput, value: string) => {
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
  }, [fieldErrors, generalError]);

  // Memoize form inputs BEFORE early returns to comply with Rules of Hooks
  // All hooks must be called in the same order on every render
  const formInputs = useMemo(() => (
    <>
      <FormInput
        key="username"
        label="Username"
        value={formData.username}
        onChange={handleFieldChange.bind(null, 'username')}
        error={fieldErrors.username}
        placeholder="Enter username (optional)"
        disabled={isSubmitting || profile.loading}
      />

      <FormInput
        key="display_name"
        label="Display Name"
        value={formData.display_name}
        onChange={handleFieldChange.bind(null, 'display_name')}
        error={fieldErrors.display_name}
        placeholder="Enter display name (optional)"
        disabled={isSubmitting || profile.loading}
      />

      <FormInput
        key="bio"
        label="Bio"
        value={formData.bio}
        onChange={handleFieldChange.bind(null, 'bio')}
        error={fieldErrors.bio}
        placeholder="Tell us about yourself (optional)"
        multiline
        numberOfLines={4}
        disabled={isSubmitting || profile.loading}
      />

      <FormInput
        key="website"
        label="Website"
        value={formData.website}
        onChange={handleFieldChange.bind(null, 'website')}
        error={fieldErrors.website}
        placeholder="https://example.com (optional)"
        keyboardType="url"
        autoCapitalize="none"
        disabled={isSubmitting || profile.loading}
      />

      <FormInput
        key="location"
        label="Location"
        value={formData.location}
        onChange={handleFieldChange.bind(null, 'location')}
        error={fieldErrors.location}
        placeholder="Enter your location (optional)"
        disabled={isSubmitting || profile.loading}
      />

      <FormInput
        key="avatar_url"
        label="Avatar URL"
        value={formData.avatar_url}
        onChange={handleFieldChange.bind(null, 'avatar_url')}
        error={fieldErrors.avatar_url}
        placeholder="https://example.com/avatar.jpg (optional)"
        keyboardType="url"
        autoCapitalize="none"
        disabled={isSubmitting || profile.loading}
      />
    </>
  ), [formData, fieldErrors, isSubmitting, profile.loading, handleFieldChange]);

  const handleSubmit = useCallback(async () => {
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
      console.log('[ProfileEditor] Starting submit, formData:', formData);
      console.log('[ProfileEditor] Has existing profile:', !!profile.profile);
      
      // Validate form data
      const validatedData = profileFormSchema.parse(formData);
      console.log('[ProfileEditor] Validation passed:', validatedData);

      // Transform to database format (empty strings -> null)
      const updateData = profile.profile
        ? transformFormToUpdate(validatedData)
        : transformFormToInsert(validatedData);
      console.log('[ProfileEditor] Transformed update data:', updateData);

      // Submit to database
      let result;
      if (profile.profile) {
        console.log('[ProfileEditor] Calling updateProfile for user:', user.id);
        result = await profile.updateProfile(user.id, updateData);
        console.log('[ProfileEditor] UpdateProfile result:', result);
      } else {
        console.log('[ProfileEditor] Calling createProfile for user:', user.id);
        result = await profile.createProfile(user.id, updateData);
        console.log('[ProfileEditor] CreateProfile result:', result);
      }

      // Success - clear any errors
      console.log('[ProfileEditor] Profile save successful!');
      setGeneralError(null);
      setFieldErrors({});
      onSuccess?.();
    } catch (err) {
      console.warn('[ProfileEditor] Submit error:', err);
      // Safer ZodError check for React Native (avoids prototype issues)
      const isZodError = err && typeof err === 'object' && 'errors' in err && Array.isArray((err as any).errors) && 'path' in ((err as any).errors[0] || {});
      
      if (isZodError) {
        // Map Zod errors to field errors
        const errors: Record<string, string> = {};
        const zodError = err as { errors: Array<{ path: (string | number)[]; message: string }> };
        zodError.errors.forEach((error) => {
          const field = error.path[0] as string;
          if (field) {
            errors[field] = error.message;
          }
        });
        setFieldErrors(errors);
        setGeneralError('Please correct the errors below');
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[ProfileEditor] Non-validation error:', error.message, error.stack);
        setGeneralError(error.message || 'Failed to save profile. Please try again.');
        onError?.(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, profile.profile, profile.updateProfile, profile.createProfile, onSuccess, onError]);

  if (!user) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>Please sign in to edit your profile.</Text>
        </View>
      </View>
    );
  }

  if (profile.loading && !profile.profile) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} collapsable={false}>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.formContainer} collapsable={false}>
        {formInputs}
      </View>

      {generalError && <FormError message={generalError} />}
      {profile.error && <FormError message={`Profile error: ${profile.error.message}`} />}

      <FormButton
        title={profile.profile ? 'Update Profile' : 'Create Profile'}
        onPress={handleSubmit}
        loading={isSubmitting || profile.loading}
        disabled={isSubmitting || profile.loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No flex: 1 - this component is nested inside a ScrollView
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  formContainer: {
    gap: 16,
    marginBottom: 16,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
  },
  loadingContainer: {
    padding: 12,
    margin: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

