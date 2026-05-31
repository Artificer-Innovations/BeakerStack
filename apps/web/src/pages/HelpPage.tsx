import { useEffect } from 'react';
import { PolicyPublicHeader } from '../components/PolicyPublicHeader';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { HelpContent } from '@beakerstack/help/web';

export default function HelpPage() {
  const { branding, legal } = getAdopterConfig();

  useEffect(() => {
    document.title = `Help & Support | ${branding.displayName}`;
    return () => {
      document.title = branding.displayName;
    };
  }, [branding.displayName]);

  return (
    <>
      <PolicyPublicHeader />
      <ContentContainer className='py-12 max-w-3xl'>
        <HelpContent
          contactEmail={legal.contactEmail}
          productName={branding.displayName}
        />
      </ContentContainer>
    </>
  );
}
