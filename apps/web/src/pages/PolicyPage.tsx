import { useEffect } from 'react';
import {
  POLICIES,
  type PolicyKey,
} from '@beakerstack/shared/generated/policies';
import { BRANDING } from '@beakerstack/shared/config/branding';
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

  useEffect(() => {
    document.title = `${TITLES[policy]} | ${BRANDING.displayName}`;
    return () => {
      document.title = BRANDING.displayName;
    };
  }, [policy]);

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
