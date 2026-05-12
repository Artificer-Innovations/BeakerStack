import { useState, useRef, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../../types/profile';
import { useAuthContext } from '../../contexts/AuthContext';
import { ProfileAvatar } from '../profile/ProfileAvatar.web';

export interface UserMenuProps {
  user: User;
  profile: UserProfile | null;
}

/**
 * UserMenu component for web
 * Displays user avatar with dropdown menu containing Profile, Dashboard, and Sign Out options
 */
export function UserMenu({ user, profile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const auth = useAuthContext();
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await auth.signOut();
    setIsOpen(false);
    navigate('/');
  };

  const displayName =
    profile?.display_name ||
    profile?.username ||
    user.email?.split('@')[0] ||
    'User';

  return (
    <div className='relative' ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full'
        aria-label='User menu'
        aria-expanded={isOpen}
      >
        <ProfileAvatar profile={profile} size='small' />
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50'>
          <div className='py-1'>
            {/* User name display */}
            <div className='px-4 py-3 border-b border-gray-200 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                {displayName}
              </p>
              {user.email && (
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {user.email}
                </p>
              )}
            </div>

            {/* Menu items */}
            <Link
              to='/profile'
              onClick={() => setIsOpen(false)}
              className='block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              Profile
            </Link>
            <Link
              to='/billing'
              onClick={() => setIsOpen(false)}
              className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              <CreditCard className='h-4 w-4 shrink-0' aria-hidden />
              Billing
            </Link>
            <Link
              to='/dashboard'
              onClick={() => setIsOpen(false)}
              className='block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              Dashboard
            </Link>
            <div className='my-1 border-t border-gray-200 dark:border-gray-700' />
            <button
              onClick={handleSignOut}
              className='block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
