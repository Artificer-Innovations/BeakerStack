import type { ReactNode } from 'react';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { supabase } from '../../lib/supabase';

export function BillingPageShell({
  children,
  maxWidthClass = 'max-w-[1024px]',
}: {
  children: ReactNode;
  maxWidthClass?: string;
}): JSX.Element {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />
      <div className={`mx-auto ${maxWidthClass} py-6 sm:px-6 lg:px-8`}>
        <div className='px-4 py-6 sm:px-0'>{children}</div>
      </div>
    </div>
  );
}
