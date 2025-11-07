import { Link, useNavigate } from 'react-router-dom';
import { HOME_TITLE, HOME_SUBTITLE } from '@shared/utils/strings';
import { useAuthContext } from '@shared/contexts/AuthContext';
import { DebugTools } from '@/components/DebugTools';

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useAuthContext();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                {HOME_TITLE}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {auth.user ? (
                <>
                  <span className="text-sm text-gray-600">{auth.user.email}</span>
                  <Link
                    to="/dashboard"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {HOME_TITLE}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {HOME_SUBTITLE}
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {auth.user ? (
            // Signed in state
            <>
              <div className="p-4 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Signed in as {auth.user.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Link
                  to="/dashboard"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </>
          ) : (
            // Signed out state
            <>
              <div className="grid grid-cols-1 gap-4">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Sign In
                </Link>
                
                <Link
                  to="/signup"
                  className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <DebugTools />
    </div>
  );
}
