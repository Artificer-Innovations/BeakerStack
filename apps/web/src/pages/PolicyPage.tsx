import { useEffect } from 'react';
import {
  POLICIES,
  type PolicyKey,
} from '@beakerstack/shared/generated/policies';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { PolicyPublicHeader } from '../components/PolicyPublicHeader';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

const TITLES: Record<PolicyKey, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  refunds: 'Refund Policy',
};

interface PolicyPageProps {
  policy: PolicyKey;
}

export default function PolicyPage({ policy }: PolicyPageProps) {
  const html = POLICIES[policy];
  const { branding } = getAdopterConfig();

  useEffect(() => {
    document.title = `${TITLES[policy]} | ${branding.displayName}`;
    return () => {
      document.title = branding.displayName;
    };
  }, [policy, branding.displayName]);

  return (
    <>
      <PolicyPublicHeader />
      <ContentContainer variant='prose' className='py-12'>
        {/* prose styles rendered via Tailwind Typography — html is build-time generated from our own markdown, not user input */}
        <div
          className='prose prose-gray dark:prose-invert max-w-none'
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ContentContainer>
    </>
  );
}
