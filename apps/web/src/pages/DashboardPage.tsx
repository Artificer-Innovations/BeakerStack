import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { supabase } from '@/lib/supabase';

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

    try {
      await auth.signOut();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      setIsSigningOut(false);
    }
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
