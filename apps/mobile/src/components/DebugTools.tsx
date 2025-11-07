import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '../lib/supabase';
import { profileFormSchema, type ProfileFormInput } from '@shared/validation/profileSchema';
import { ZodError } from 'zod';
import { TextInput } from 'react-native';

export function DebugTools() {
  const [isVisible, setIsVisible] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const auth = useAuthContext();
  const profile = useProfile(supabase, auth.user);

  const handleHiddenTap = () => {
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 4) {
      setIsVisible(true);
      setClickCount(0);
    } else {
      // Reset counter after 2 seconds of inactivity
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [clickCount]);

  if (!isVisible) {
    return (
      <TouchableOpacity
        onPress={handleHiddenTap}
        style={styles.hiddenButton}
        activeOpacity={1}
      />
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Debug Tools</Text>
          <TouchableOpacity
            onPress={() => setIsVisible(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Database Test Section - First */}
          <View style={styles.testCard}>
            <Text style={styles.testCardTitle}>🧪 Database Connection Test</Text>
            <DatabaseTest />
          </View>

          {/* AuthContext Test Section - Second */}
          <View style={styles.authContextContainer}>
            <Text style={styles.authContextTitle}>🧪 AuthContext Test</Text>
            <View style={styles.authContextContent}>
              <Text style={styles.authContextItem}>
                Loading: <Text style={styles.authContextValue}>{auth.loading ? 'true' : 'false'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                User: <Text style={styles.authContextValue}>{auth.user ? auth.user.email : 'null'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                Session: <Text style={styles.authContextValue}>{auth.session ? 'active' : 'null'}</Text>
              </Text>
              <Text style={styles.authContextItem}>
                Error: <Text style={styles.authContextValue}>{auth.error ? auth.error.message : 'null'}</Text>
              </Text>
            </View>
            <Text style={styles.authContextFooter}>
              ✓ Context provides auth state to components
            </Text>
          </View>

          {/* Task 4.1: useProfile Hook Test */}
          {auth.user ? (
            <View style={styles.testCard}>
              <Text style={styles.testCardTitle}>🧪 useProfile Hook Test (Task 4.1)</Text>
              <UseProfileTest profile={profile} auth={auth} />
            </View>
          ) : (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledCardTitle}>🧪 useProfile Hook Test (Task 4.1)</Text>
              <Text style={styles.disabledCardText}>Please sign in to test this component.</Text>
            </View>
          )}

          {/* Task 4.2: Profile Validation Schema Test */}
          <View style={styles.validationTestCard}>
            <Text style={styles.validationTestCardTitle}>🧪 Profile Validation Schema Test (Task 4.2)</Text>
            <Text style={styles.validationTestCardDescription}>
              Test the validation schema by entering invalid data and seeing error messages appear.
            </Text>
            <ValidationTestFormMobile />
            <Text style={styles.validationTestNote}>
              ✓ Try: username too short, display name too long, invalid website URL, etc.
            </Text>
          </View>

          {/* Task 4.3: Form Components Test */}
          <View style={styles.formComponentsTestCard}>
            <Text style={styles.formComponentsTestCardTitle}>🧪 Form Components Test (Task 4.3)</Text>
            <Text style={styles.formComponentsTestCardDescription}>
              Test the shared form components to verify they work identically on web and mobile.
            </Text>
            <FormComponentsTestMobile />
            <Text style={styles.formComponentsTestNote}>
              ✓ Test all component states: normal, error, disabled, loading
            </Text>
          </View>

          {/* Task 4.4: Profile Editor Test */}
          {auth.user ? (
            <View style={styles.testCard}>
              <Text style={styles.testCardTitle}>🧪 Profile Editor Test (Task 4.4)</Text>
              <Text style={styles.validationTestCardDescription}>
                Test the ProfileEditor component - edit your profile and save changes.
              </Text>
              <ProfileEditorTestMobile supabase={supabase} user={auth.user} />
              <Text style={styles.testNote}>
                ✓ Edit profile fields and click "Update Profile" or "Create Profile"
              </Text>
            </View>
          ) : (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledCardTitle}>🧪 Profile Editor Test (Task 4.4)</Text>
              <Text style={styles.disabledCardText}>Please sign in to test this component.</Text>
            </View>
          )}

          {/* Task 4.5: Profile Display Components Test */}
          {auth.user ? (
            <View style={styles.testCard}>
              <Text style={styles.testCardTitle}>🧪 Profile Display Components Test (Task 4.5)</Text>
              <Text style={styles.validationTestCardDescription}>
                Test the profile display components (ProfileAvatar, ProfileHeader, ProfileStats) to verify they display user data correctly.
              </Text>
              <ProfileDisplayTestMobile profile={profile.profile} />
              <Text style={styles.testNote}>
                ✓ Verify: Avatar shows image or initials, Header displays all profile info, Stats show member since and completion %
              </Text>
            </View>
          ) : (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledCardTitle}>🧪 Profile Display Components Test (Task 4.5)</Text>
              <Text style={styles.disabledCardText}>Please sign in to test this component.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Database Test Component
function DatabaseTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTestDatabase = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .limit(5);

      if (error) {
        const message = `❌ Error: ${error.message}`;
        setTestResult(message);
        Alert.alert('Database Test Failed', error.message);
      } else {
        const message = `✅ Success! Found ${data.length} user profiles`;
        setTestResult(message);
        Alert.alert('Database Test Passed', `Found ${data.length} user profiles`);
      }
    } catch (err) {
      const message = `❌ Exception: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setTestResult(message);
      Alert.alert('Database Test Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.testButton, isLoading && styles.testButtonDisabled]}
        onPress={handleTestDatabase}
        disabled={isLoading}
      >
        <Text style={styles.testButtonText}>
          {isLoading ? 'Testing...' : '🧪 Test Database'}
        </Text>
      </TouchableOpacity>

      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
    </View>
  );
}

// UseProfile Test Component
function UseProfileTest({ profile, auth }: { profile: ReturnType<typeof useProfile>; auth: ReturnType<typeof useAuthContext> }) {
  const handleCreateProfile = async () => {
    if (!auth.user) return;
    try {
      await profile.createProfile(auth.user.id, {
        username: `testuser_${Date.now()}`,
        display_name: 'Test User',
        bio: 'Created via useProfile hook test',
      });
      Alert.alert('Success', '✅ Profile created! Check the display above.');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.user) return;
    try {
      await profile.updateProfile(auth.user.id, {
        display_name: `Test User ${Date.now()}`,
      });
      Alert.alert('Success', '✅ Profile updated! Check the display above.');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      await profile.refreshProfile();
      Alert.alert('Success', '✅ Profile refreshed!');
    } catch (err) {
      Alert.alert('Error', `❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <View>
      <View style={styles.testInfo}>
        <Text style={styles.testLabel}>Loading:</Text>
        <Text style={styles.testValue}>{profile.loading ? 'true' : 'false'}</Text>
      </View>
      <View style={styles.testInfo}>
        <Text style={styles.testLabel}>Profile:</Text>
        <Text style={styles.testValue}>{profile.profile ? 'exists' : 'null'}</Text>
      </View>
      <View style={styles.testInfo}>
        <Text style={styles.testLabel}>Error:</Text>
        <Text style={styles.testValue}>{profile.error ? profile.error.message : 'null'}</Text>
      </View>
      
      {profile.profile && (
        <View style={styles.profileDataContainer}>
          <Text style={styles.profileDataTitle}>Profile Data:</Text>
          <Text style={styles.profileDataText}>
            Username: {profile.profile.username || 'null'}
          </Text>
          <Text style={styles.profileDataText}>
            Display Name: {profile.profile.display_name || 'null'}
          </Text>
          <Text style={styles.profileDataText}>
            Bio: {profile.profile.bio || 'null'}
          </Text>
          <Text style={styles.profileDataText}>
            Location: {profile.profile.location || 'null'}
          </Text>
          <Text style={styles.profileDataText}>
            Website: {profile.profile.website || 'null'}
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.testButton, profile.loading && styles.testButtonDisabled]}
        onPress={profile.profile ? handleUpdateProfile : handleCreateProfile}
        disabled={profile.loading || !auth.user}
      >
        <Text style={styles.testButtonText}>
          {profile.profile ? 'Update Profile' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.testButton, profile.loading && styles.testButtonDisabled]}
        onPress={handleRefreshProfile}
        disabled={profile.loading || !auth.user}
      >
        <Text style={styles.testButtonText}>Refresh Profile</Text>
      </TouchableOpacity>
      
      <Text style={styles.testNote}>
        ✓ Test create, read, update operations above
      </Text>
    </View>
  );
}

// Validation test form component for mobile
function ValidationTestFormMobile() {
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
      Alert.alert('Success', '✅ All fields are valid!');
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
        const errorCount = err.errors.length;
        Alert.alert('Validation Failed', `❌ Validation failed: ${errorCount} error(s)`);
        setLastValidationResult(`❌ Validation failed: ${errorCount} error(s)`);
      }
    }
  };

  return (
    <View style={styles.validationFormContainer}>
      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Username</Text>
        <TextInput
          style={[styles.validationInput, errors.username && styles.validationInputError]}
          value={formData.username}
          onChangeText={(text) => handleFieldChange('username', text)}
          onBlur={() => validateField('username', formData.username || '')}
          placeholder="3-30 chars, alphanumeric + underscore"
        />
        {errors.username && (
          <Text style={styles.validationErrorText}>{errors.username}</Text>
        )}
      </View>

      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Display Name</Text>
        <TextInput
          style={[styles.validationInput, errors.display_name && styles.validationInputError]}
          value={formData.display_name}
          onChangeText={(text) => handleFieldChange('display_name', text)}
          onBlur={() => validateField('display_name', formData.display_name || '')}
          placeholder="Max 100 characters"
        />
        {errors.display_name && (
          <Text style={styles.validationErrorText}>{errors.display_name}</Text>
        )}
      </View>

      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Bio</Text>
        <TextInput
          style={[styles.validationInput, styles.validationTextArea, errors.bio && styles.validationInputError]}
          value={formData.bio}
          onChangeText={(text) => handleFieldChange('bio', text)}
          onBlur={() => validateField('bio', formData.bio || '')}
          placeholder="Max 500 characters"
          multiline
          numberOfLines={3}
        />
        <View style={styles.validationFieldFooter}>
          {errors.bio && (
            <Text style={styles.validationErrorText}>{errors.bio}</Text>
          )}
          <Text style={styles.validationCharCount}>
            {(formData.bio?.length || 0)}/500
          </Text>
        </View>
      </View>

      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Website</Text>
        <TextInput
          style={[styles.validationInput, errors.website && styles.validationInputError]}
          value={formData.website}
          onChangeText={(text) => handleFieldChange('website', text)}
          onBlur={() => validateField('website', formData.website || '')}
          placeholder="https://example.com"
          keyboardType="url"
          autoCapitalize="none"
        />
        {errors.website && (
          <Text style={styles.validationErrorText}>{errors.website}</Text>
        )}
      </View>

      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Location</Text>
        <TextInput
          style={styles.validationInput}
          value={formData.location}
          onChangeText={(text) => handleFieldChange('location', text)}
          placeholder="Any text"
        />
      </View>

      <View style={styles.validationField}>
        <Text style={styles.validationLabel}>Avatar URL</Text>
        <TextInput
          style={[styles.validationInput, errors.avatar_url && styles.validationInputError]}
          value={formData.avatar_url}
          onChangeText={(text) => handleFieldChange('avatar_url', text)}
          onBlur={() => validateField('avatar_url', formData.avatar_url || '')}
          placeholder="https://example.com/avatar.jpg"
          keyboardType="url"
          autoCapitalize="none"
        />
        {errors.avatar_url && (
          <Text style={styles.validationErrorText}>{errors.avatar_url}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.validationButton}
        onPress={handleValidateAll}
      >
        <Text style={styles.validationButtonText}>Validate All Fields</Text>
      </TouchableOpacity>

      {lastValidationResult && (
        <View style={[
          styles.validationResult,
          lastValidationResult.startsWith('✅') ? styles.validationResultSuccess : styles.validationResultError
        ]}>
          <Text style={styles.validationResultText}>{lastValidationResult}</Text>
        </View>
      )}
    </View>
  );
}

// Form components test component for mobile
function FormComponentsTestMobile() {
  const [inputValue, setInputValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [FormComponents, setFormComponents] = useState<{
    FormInput: any;
    FormButton: any;
    FormError: any;
  } | null>(null);

  useEffect(() => {
    if (!componentsLoaded) {
      Promise.all([
        import('@shared/components/forms/FormInput.native'),
        import('@shared/components/forms/FormButton.native'),
        import('@shared/components/forms/FormError.native'),
      ])
        .then(([FormInputModule, FormButtonModule, FormErrorModule]) => {
          setFormComponents({
            FormInput: FormInputModule.FormInput,
            FormButton: FormButtonModule.FormButton,
            FormError: FormErrorModule.FormError,
          });
          setComponentsLoaded(true);
        })
        .catch((err) => {
          console.warn('[FormComponentsTest] Failed to load form components:', err);
        });
    }
  }, [componentsLoaded]);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
      setShowError(!showError);
      Alert.alert('Button Clicked', 'Loading state completed!');
    }, 1500);
  };

  if (!componentsLoaded || !FormComponents) {
    return (
      <View style={styles.formTestSection}>
        <ActivityIndicator size="small" color="#166534" />
        <Text style={styles.formTestSectionTitle}>Loading form components...</Text>
      </View>
    );
  }

  const { FormInput, FormButton, FormError } = FormComponents;

  return (
    <View>
      <View style={styles.formTestSection}>
        <Text style={styles.formTestSectionTitle}>FormInput Examples:</Text>
        
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
          numberOfLines={4}
          placeholder="Enter multiple lines..."
        />
      </View>

      <View style={styles.formTestSection}>
        <Text style={styles.formTestSectionTitle}>FormButton Examples:</Text>
        
        <FormButton
          title="Normal Button"
          onPress={() => Alert.alert('Button Clicked', 'Normal button works!')}
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

        <View style={styles.buttonRow}>
          <View style={styles.buttonRowItem}>
            <FormButton
              title="Primary"
              onPress={() => {}}
              variant="primary"
              fullWidth={false}
            />
          </View>
          <View style={styles.buttonRowItem}>
            <FormButton
              title="Secondary"
              onPress={() => {}}
              variant="secondary"
              fullWidth={false}
            />
          </View>
          <View style={styles.buttonRowItem}>
            <FormButton
              title="Danger"
              onPress={() => {}}
              variant="danger"
              fullWidth={false}
            />
          </View>
        </View>
      </View>

      <View style={styles.formTestSection}>
        <Text style={styles.formTestSectionTitle}>FormError Examples:</Text>
        
        <FormError message="This is an error message displayed using FormError component" />
        
        <TouchableOpacity
          onPress={() => setShowError(!showError)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>
            {showError ? 'Hide' : 'Show'} Dynamic Error
          </Text>
        </TouchableOpacity>
        
        {showError && (
          <FormError message="This error was triggered dynamically!" />
        )}
      </View>
    </View>
  );
}

// ProfileEditor test component for mobile
function ProfileEditorTestMobile({ supabase, user }: { supabase: any; user: any }) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [ProfileEditor, setProfileEditor] = useState<any>(null);

  useEffect(() => {
    if (!componentsLoaded) {
      import('@shared/components/profile/ProfileEditor.native')
        .then((module) => {
          setProfileEditor(() => module.ProfileEditor);
          setComponentsLoaded(true);
        })
        .catch((err) => {
          console.warn('[ProfileEditorTest] Failed to load ProfileEditor:', err);
        });
    }
  }, [componentsLoaded]);

  if (!componentsLoaded || !ProfileEditor) {
    return (
      <View style={styles.formTestSection}>
        <ActivityIndicator size="small" color="#166534" />
        <Text style={styles.formTestSectionTitle}>Loading ProfileEditor...</Text>
      </View>
    );
  }

  return (
    <View key="profile-editor-container" style={{ width: '100%' }}>
      <ProfileEditor
        key={`profile-editor-${user?.id || 'no-user'}`}
        supabaseClient={supabase}
        user={user}
        onSuccess={() => {
          console.log('[ProfileEditorTest] onSuccess callback fired');
          Alert.alert('Success', 'Profile saved successfully!');
        }}
        onError={(error: Error) => {
          console.error('[ProfileEditorTest] onError callback fired:', error.message, error.stack);
          Alert.alert('Error', `Failed to save profile: ${error.message}`);
        }}
      />
    </View>
  );
}

// Profile Display Components test component for mobile
function ProfileDisplayTestMobile({ profile }: { profile: any }) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [ProfileAvatar, setProfileAvatar] = useState<any>(null);
  const [ProfileHeader, setProfileHeader] = useState<any>(null);
  const [ProfileStats, setProfileStats] = useState<any>(null);

  useEffect(() => {
    if (!componentsLoaded) {
      Promise.all([
        import('@shared/components/profile/ProfileAvatar.native'),
        import('@shared/components/profile/ProfileHeader.native'),
        import('@shared/components/profile/ProfileStats.native'),
      ])
        .then(([avatarModule, headerModule, statsModule]) => {
          setProfileAvatar(() => avatarModule.ProfileAvatar);
          setProfileHeader(() => headerModule.ProfileHeader);
          setProfileStats(() => statsModule.ProfileStats);
          setComponentsLoaded(true);
        })
        .catch((err) => {
          console.warn('[ProfileDisplayTest] Failed to load components:', err);
        });
    }
  }, [componentsLoaded]);

  if (!componentsLoaded || !ProfileAvatar || !ProfileHeader || !ProfileStats) {
    return (
      <View style={styles.formTestSection}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text style={styles.formTestSectionTitle}>Loading Profile Display Components...</Text>
      </View>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <View style={[styles.testCard, { marginBottom: 16, padding: 12 }]}>
        <Text style={[styles.testCardTitle, { fontSize: 14, marginBottom: 8 }]}>ProfileHeader:</Text>
        <ProfileHeader profile={profile} />
      </View>
      <View style={[styles.testCard, { marginBottom: 16, padding: 12 }]}>
        <Text style={[styles.testCardTitle, { fontSize: 14, marginBottom: 8 }]}>ProfileAvatar (different sizes):</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <View style={{ alignItems: 'center' }}>
            <ProfileAvatar profile={profile} size="small" />
            <Text style={[styles.testNote, { fontSize: 10, marginTop: 4 }]}>Small</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ProfileAvatar profile={profile} size="medium" />
            <Text style={[styles.testNote, { fontSize: 10, marginTop: 4 }]}>Medium</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ProfileAvatar profile={profile} size="large" />
            <Text style={[styles.testNote, { fontSize: 10, marginTop: 4 }]}>Large</Text>
          </View>
        </View>
      </View>
      <View style={[styles.testCard, { padding: 12 }]}>
        <Text style={[styles.testCardTitle, { fontSize: 14, marginBottom: 8 }]}>ProfileStats:</Text>
        <ProfileStats profile={profile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  testCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  disabledCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  disabledCardText: {
    fontSize: 14,
    color: '#6b7280',
  },
  testInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testLabel: {
    fontSize: 12,
    color: '#6b21a8',
    fontWeight: '500',
  },
  testValue: {
    fontSize: 12,
    color: '#6b21a8',
    fontFamily: 'monospace',
  },
  profileDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  profileDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 8,
  },
  profileDataText: {
    fontSize: 11,
    color: '#6b21a8',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#d8b4fe',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#6b21a8',
    fontSize: 14,
    fontWeight: '600',
  },
  testNote: {
    fontSize: 11,
    color: '#9333ea',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  authContextContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  authContextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  authContextContent: {
    gap: 4,
  },
  authContextItem: {
    fontSize: 12,
    color: '#1e40af',
  },
  authContextValue: {
    fontFamily: 'monospace',
  },
  authContextFooter: {
    marginTop: 8,
    fontSize: 12,
    color: '#2563eb',
    fontStyle: 'italic',
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  validationTestCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  validationTestCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  validationTestCardDescription: {
    fontSize: 12,
    color: '#1e40af',
    marginBottom: 12,
  },
  validationTestNote: {
    fontSize: 11,
    color: '#2563eb',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  validationFormContainer: {
    gap: 12,
  },
  validationField: {
    marginBottom: 12,
  },
  validationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
    marginBottom: 4,
  },
  validationInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1e40af',
  },
  validationInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  validationTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  validationErrorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '500',
    marginTop: 4,
  },
  validationFieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  validationCharCount: {
    fontSize: 11,
    color: '#2563eb',
  },
  validationButton: {
    backgroundColor: '#bfdbfe',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  validationButtonText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
  validationResult: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  validationResultSuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#86efac',
  },
  validationResultError: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  validationResultText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  formComponentsTestCard: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  formComponentsTestCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  formComponentsTestCardDescription: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 12,
  },
  formComponentsTestNote: {
    fontSize: 11,
    color: '#16a34a',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  formTestSection: {
    marginBottom: 24,
  },
  formTestSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  buttonRowItem: {
    flex: 1,
  },
  toggleButton: {
    padding: 12,
    backgroundColor: '#86efac',
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
});

