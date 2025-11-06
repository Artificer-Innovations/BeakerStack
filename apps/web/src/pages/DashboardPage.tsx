import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { profileFormSchema, type ProfileFormInput } from '@shared/validation/profileSchema';
import { ZodError } from 'zod';
// Import form components - Vite will automatically resolve .web.tsx files
import { FormInput } from '@shared/components/forms/FormInput.web';
import { FormButton } from '@shared/components/forms/FormButton.web';
import { FormError } from '@shared/components/forms/FormError.web';
// Import ProfileEditor - Vite will automatically resolve .web.tsx file
import { ProfileEditor } from '@shared/components/profile/ProfileEditor.web';
// Import Profile Display Components - Vite will automatically resolve .web.tsx files
import { ProfileAvatar } from '@shared/components/profile/ProfileAvatar.web';
import { ProfileHeader } from '@shared/components/profile/ProfileHeader.web';
import { ProfileStats } from '@shared/components/profile/ProfileStats.web';

export default function DashboardPage() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = useAuthContext();
  
  // Manual test: useProfile hook for Task 4.1
  const profile = useProfile(supabase, auth.user);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);

    // signOut no longer throws - it gracefully handles API errors and clears local state
    await auth.signOut();
    // Navigate immediately - the auth state will update via onAuthStateChange listener
    navigate('/');
    setIsSigningOut(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {auth.user && (
                <span className="text-sm text-gray-600">
                  {auth.user.email}
                </span>
              )}
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard!
              </h2>
              <p className="text-gray-600">
                This is where your main application content will go.
              </p>
            </div>
          </div>

          {/* Manual test display for form components - Task 4.3 */}
          <div className="p-6 rounded-md bg-green-50 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">🧪 Form Components Test (Task 4.3)</h3>
            <p className="text-sm text-green-700 mb-4">
              Test the shared form components (FormInput, FormButton, FormError) to verify they work identically on web and mobile.
            </p>
            <FormComponentsTest />
            <div className="mt-3 text-xs text-green-600 italic">
              ✓ Test all component states: normal, error, disabled, loading
            </div>
          </div>

          {/* Manual test display for validation schema - Task 4.2 */}
          <div className="p-6 rounded-md bg-blue-50 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">🧪 Profile Validation Schema Test (Task 4.2)</h3>
            <p className="text-sm text-blue-700 mb-4">
              Test the validation schema by entering invalid data and seeing error messages appear.
            </p>
            <ValidationTestForm />
            <div className="mt-3 text-xs text-blue-600 italic">
              ✓ Try: username too short, display name too long, invalid website URL, etc.
            </div>
          </div>

          {/* Manual test display for ProfileEditor - Task 4.4 */}
          <div className="p-6 rounded-md bg-orange-50 border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">🧪 Profile Editor Test (Task 4.4)</h3>
            <p className="text-sm text-orange-700 mb-4">
              Test the ProfileEditor component - edit your profile and save changes.
            </p>
            <ProfileEditor
              supabaseClient={supabase}
              user={auth.user}
              onSuccess={() => {
                alert('Profile saved successfully!');
              }}
              onError={(error) => {
                console.error('Profile save error:', error);
              }}
            />
            <div className="mt-3 text-xs text-orange-600 italic">
              ✓ Edit profile fields and click "Update Profile" or "Create Profile"
            </div>
          </div>

          {/* Manual test display for Profile Display Components - Task 4.5 */}
          <div className="p-6 rounded-md bg-indigo-50 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-4">🧪 Profile Display Components Test (Task 4.5)</h3>
            <p className="text-sm text-indigo-700 mb-4">
              Test the profile display components (ProfileAvatar, ProfileHeader, ProfileStats) to verify they display user data correctly.
            </p>
            <div className="space-y-6">
              <div className="p-4 bg-white rounded border border-indigo-300">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">ProfileHeader:</h4>
                <ProfileHeader profile={profile.profile} />
              </div>
              <div className="p-4 bg-white rounded border border-indigo-300">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">ProfileAvatar (different sizes):</h4>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <ProfileAvatar profile={profile.profile} size="small" />
                    <p className="text-xs text-indigo-600 mt-1">Small</p>
                  </div>
                  <div className="text-center">
                    <ProfileAvatar profile={profile.profile} size="medium" />
                    <p className="text-xs text-indigo-600 mt-1">Medium</p>
                  </div>
                  <div className="text-center">
                    <ProfileAvatar profile={profile.profile} size="large" />
                    <p className="text-xs text-indigo-600 mt-1">Large</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white rounded border border-indigo-300">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">ProfileStats:</h4>
                <ProfileStats profile={profile.profile} />
              </div>
            </div>
            <div className="mt-3 text-xs text-indigo-600 italic">
              ✓ Verify: Avatar shows image or initials, Header displays all profile info, Stats show member since and completion %
            </div>
          </div>

          {/* Manual test display for useProfile hook - Task 4.1 */}
          <div className="p-6 rounded-md bg-purple-50 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">🧪 useProfile Hook Test (Task 4.1)</h3>
            <div className="space-y-3 text-sm text-purple-800">
              <div className="grid grid-cols-2 gap-2">
                <div>Loading: <span className="font-mono">{profile.loading ? 'true' : 'false'}</span></div>
                <div>Profile: <span className="font-mono">{profile.profile ? 'exists' : 'null'}</span></div>
                <div>Error: <span className="font-mono">{profile.error ? profile.error.message : 'null'}</span></div>
              </div>
              {profile.profile && (
                <div className="mt-3 p-3 bg-white rounded border border-purple-300">
                  <div className="font-semibold mb-2">Profile Data:</div>
                  <div className="space-y-1 text-xs">
                    <div>Username: <span className="font-mono">{profile.profile.username || 'null'}</span></div>
                    <div>Display Name: <span className="font-mono">{profile.profile.display_name || 'null'}</span></div>
                    <div>Bio: <span className="font-mono">{profile.profile.bio || 'null'}</span></div>
                    <div>Location: <span className="font-mono">{profile.profile.location || 'null'}</span></div>
                    <div>Website: <span className="font-mono">{profile.profile.website || 'null'}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={async () => {
                  if (!auth.user) return;
                  try {
                    if (profile.profile) {
                      await profile.updateProfile(auth.user.id, {
                        display_name: `Test User ${Date.now()}`,
                      });
                      alert('✅ Profile updated! Check the display above.');
                    } else {
                      await profile.createProfile(auth.user.id, {
                        username: `testuser_${Date.now()}`,
                        display_name: 'Test User',
                        bio: 'Created via useProfile hook test',
                      });
                      alert('✅ Profile created! Check the display above.');
                    }
                  } catch (err) {
                    alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                }}
                disabled={profile.loading || !auth.user}
                className="w-full py-2 px-4 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {profile.profile ? 'Update Profile' : 'Create Profile'}
              </button>
              <button
                onClick={async () => {
                  await profile.refreshProfile();
                  alert('✅ Profile refreshed!');
                }}
                disabled={profile.loading || !auth.user}
                className="w-full py-2 px-4 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Refresh Profile
              </button>
            </div>
            <div className="mt-3 text-xs text-purple-600 italic">
              ✓ Test create, read, update operations above
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Form components test component
function FormComponentsTest() {
  const [inputValue, setInputValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
      setShowError(!showError);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-green-800">FormInput Examples:</h4>
        
        <FormInput
          label="Normal Input"
          value={inputValue}
          onChange={setInputValue}
          placeholder="Type something here..."
        />

        <FormInput
          label="Input with Error"
          value="invalid value"
          onChange={() => {}}
          error="This field has an error message"
        />

        <FormInput
          label="Disabled Input"
          value="Cannot edit this"
          onChange={() => {}}
          disabled
        />

        <FormInput
          label="Multiline Input (Textarea)"
          value="This is a multiline text input that supports multiple lines of text."
          onChange={() => {}}
          multiline
          rows={4}
          placeholder="Enter multiple lines..."
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-green-800">FormButton Examples:</h4>
        
        <FormButton
          title="Normal Button"
          onPress={() => alert('Button clicked!')}
        />

        <FormButton
          title="Loading Button"
          onPress={handleButtonClick}
          loading={buttonLoading}
        />

        <FormButton
          title="Disabled Button"
          onPress={() => {}}
          disabled
        />

        <div className="flex gap-2">
          <FormButton
            title="Primary"
            onPress={() => {}}
            variant="primary"
            fullWidth={false}
          />
          <FormButton
            title="Secondary"
            onPress={() => {}}
            variant="secondary"
            fullWidth={false}
          />
          <FormButton
            title="Danger"
            onPress={() => {}}
            variant="danger"
            fullWidth={false}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-green-800">FormError Examples:</h4>
        
        <FormError message="This is an error message displayed using FormError component" />
        
        <button
          onClick={() => setShowError(!showError)}
          className="text-sm text-green-700 underline"
        >
          {showError ? 'Hide' : 'Show'} Dynamic Error
        </button>
        
        {showError && (
          <FormError message="This error was triggered dynamically!" />
        )}
      </div>
    </div>
  );
}

// Validation test form component
function ValidationTestForm() {
  const [formData, setFormData] = useState<ProfileFormInput>({
    username: '',
    display_name: '',
    bio: '',
    website: '',
    location: '',
    avatar_url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastValidationResult, setLastValidationResult] = useState<string | null>(null);

  const handleFieldChange = (field: keyof ProfileFormInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setLastValidationResult(null);
  };

  const validateField = (field: keyof ProfileFormInput, value: string) => {
    try {
      profileFormSchema.parse({ ...formData, [field]: value });
      // Clear error if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldError = err.errors.find((e) => e.path.includes(field));
        if (fieldError) {
          setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
        }
      }
    }
  };

  const handleValidateAll = () => {
    try {
      profileFormSchema.parse(formData);
      setErrors({});
      setLastValidationResult('✅ All fields are valid!');
    } catch (err) {
      if (err instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as string;
          if (field) {
            newErrors[field] = error.message;
          }
        });
        setErrors(newErrors);
        setLastValidationResult(`❌ Validation failed: ${err.errors.length} error(s)`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleFieldChange('username', e.target.value)}
            onBlur={(e) => validateField('username', e.target.value)}
            placeholder="3-30 chars, alphanumeric + underscore"
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors.username ? 'border-red-500 bg-red-50' : 'border-blue-300'
            }`}
          />
          {errors.username && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.username}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Display Name</label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => handleFieldChange('display_name', e.target.value)}
            onBlur={(e) => validateField('display_name', e.target.value)}
            placeholder="Max 100 characters"
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors.display_name ? 'border-red-500 bg-red-50' : 'border-blue-300'
            }`}
          />
          {errors.display_name && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.display_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleFieldChange('bio', e.target.value)}
            onBlur={(e) => validateField('bio', e.target.value)}
            placeholder="Max 500 characters"
            rows={3}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors.bio ? 'border-red-500 bg-red-50' : 'border-blue-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.bio && (
              <p className="text-xs text-red-600 font-medium">{errors.bio}</p>
            )}
            <p className="text-xs text-blue-600 ml-auto">{formData.bio?.length || 0}/500</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Website</label>
          <input
            type="text"
            value={formData.website}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            onBlur={(e) => validateField('website', e.target.value)}
            placeholder="https://example.com"
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors.website ? 'border-red-500 bg-red-50' : 'border-blue-300'
            }`}
          />
          {errors.website && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.website}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            placeholder="Any text"
            className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">Avatar URL</label>
          <input
            type="text"
            value={formData.avatar_url}
            onChange={(e) => handleFieldChange('avatar_url', e.target.value)}
            onBlur={(e) => validateField('avatar_url', e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors.avatar_url ? 'border-red-500 bg-red-50' : 'border-blue-300'
            }`}
          />
          {errors.avatar_url && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.avatar_url}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleValidateAll}
        className="w-full py-2 px-4 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded border border-blue-300 transition-colors"
      >
        Validate All Fields
      </button>

      {lastValidationResult && (
        <div className={`p-3 rounded border text-sm font-medium ${
          lastValidationResult.startsWith('✅')
            ? 'bg-green-50 border-green-300 text-green-800'
            : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {lastValidationResult}
        </div>
      )}
    </div>
  );
}
