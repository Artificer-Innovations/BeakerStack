import type { ReactNode } from 'react';
import { AppHeaderWithAdmin } from '../AppHeaderWithAdmin';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

export function BillingPageShell({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeaderWithAdmin />
      <ContentContainer className='py-6'>
        <div className='py-6 sm:px-0'>{children}</div>
      </ContentContainer>
    </div>
  );
}
