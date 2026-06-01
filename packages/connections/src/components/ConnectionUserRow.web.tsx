import { useState, type ReactNode } from 'react';

export type ConnectionUserRowProps = {
  username: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  subtitle?: string;
  actions?: ReactNode;
};

export function ConnectionUserRow({
  username,
  displayName,
  avatarUrl,
  subtitle,
  actions,
}: ConnectionUserRowProps) {
  const label = displayName ?? username ?? 'Unknown user';
  const handle = username ? `@${username}` : null;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc =
    avatarUrl && avatarUrl.length > 0 && !avatarFailed ? avatarUrl : null;

  return (
    <div className='flex items-center justify-between gap-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0'>
      <div className='flex items-center gap-3 min-w-0'>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=''
            loading='lazy'
            decoding='async'
            className='h-10 w-10 rounded-full object-cover shrink-0'
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className='h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0' />
        )}
        <div className='min-w-0'>
          <p className='font-medium text-gray-900 dark:text-gray-100 truncate'>
            {label}
          </p>
          {handle && (
            <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>
              {handle}
            </p>
          )}
          {subtitle && (
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions ? <div className='shrink-0 flex gap-2'>{actions}</div> : null}
    </div>
  );
}
