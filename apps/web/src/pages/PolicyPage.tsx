import { useEffect } from 'react';
import {
  POLICIES,
  type PolicyKey,
} from '@beakerstack/shared/generated/policies';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { supabase } from '@/lib/supabase';

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
      <AppHeader supabaseClient={supabase} />
      <div className='max-w-[800px] mx-auto px-4 py-12 sm:px-6 lg:px-8'>
        {/* prose styles rendered via Tailwind Typography — html is build-time generated from our own markdown, not user input */}
        <div
          className='prose prose-gray max-w-none'
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
