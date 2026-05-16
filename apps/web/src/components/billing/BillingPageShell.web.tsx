import type { ReactNode } from 'react';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { supabase } from '../../lib/supabase';

export function BillingPageShell({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeader supabaseClient={supabase} />
      <ContentContainer className='py-6'>
        <div className='py-6 sm:px-0'>{children}</div>
      </ContentContainer>
    </div>
  );
}
