import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_TITLE, HOME_SUBTITLE } from '@shared/utils/strings';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Manual test: useAuthContext hook should provide auth state from context
  const auth = useAuthContext();

  const handleTestDatabase = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .limit(5);

      if (error) {
        setTestResult(`❌ Error: ${error.message}`);
      } else {
        setTestResult(`✅ Success! Found ${data.length} user profiles`);
      }
    } catch (err) {
      setTestResult(`❌ Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {HOME_TITLE}
          </h1>
          <p className="text-gray-600 mb-8">
            {HOME_SUBTITLE}
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Sign In
          </Link>
          
          <Link
            to="/signup"
            className="w-full flex justify-center py-2 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Sign Up
          </Link>

          <button
            onClick={handleTestDatabase}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Testing...' : '🧪 Test Database'}
          </button>

          {testResult && (
            <div className="mt-2 p-3 rounded-md bg-white border border-gray-200 text-sm text-gray-700">
              {testResult}
            </div>
          )}

          {/* Manual test display for AuthContext */}
          <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🧪 AuthContext Test</h3>
            <div className="space-y-1 text-xs text-blue-800">
              <div>Loading: <span className="font-mono">{auth.loading ? 'true' : 'false'}</span></div>
              <div>User: <span className="font-mono">{auth.user ? auth.user.email : 'null'}</span></div>
              <div>Session: <span className="font-mono">{auth.session ? 'active' : 'null'}</span></div>
              <div>Error: <span className="font-mono">{auth.error ? auth.error.message : 'null'}</span></div>
            </div>
            <div className="mt-2 text-xs text-blue-600 italic">
              ✓ Context provides auth state to components
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
