import type { ReactNode } from 'react';
import {
  ArticleDetail,
  ArticlesIndex,
  TagListing,
} from '@beakerstack/articles/web';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { PolicyPublicHeader } from '../PolicyPublicHeader';

function ArticlesPublicShell({ children }: { children: ReactNode }) {
  return (
    <div className='bg-white dark:bg-gray-950 min-h-screen'>
      <PolicyPublicHeader />
      <main>{children}</main>
    </div>
  );
}

export function ArticlesIndexSSR({
  productName,
  indexSubtitle,
}: {
  productName: string;
  indexSubtitle?: string | undefined;
}) {
  return (
    <ArticlesPublicShell>
      <ContentContainer variant='prose' className='py-12'>
        <ArticlesIndex
          productName={productName}
          {...(indexSubtitle ? { indexSubtitle } : {})}
        />
      </ContentContainer>
    </ArticlesPublicShell>
  );
}

export function ArticleDetailSSR({
  slug,
  productName,
}: {
  slug: string;
  productName: string;
}) {
  return (
    <ArticlesPublicShell>
      <ContentContainer variant='prose' className='py-12'>
        <ArticleDetail slug={slug} productName={productName} />
      </ContentContainer>
    </ArticlesPublicShell>
  );
}

export function TagListingSSR({
  tagSlug,
  productName,
}: {
  tagSlug: string;
  productName: string;
}) {
  return (
    <ArticlesPublicShell>
      <ContentContainer variant='prose' className='py-12'>
        <TagListing tagSlug={tagSlug} productName={productName} />
      </ContentContainer>
    </ArticlesPublicShell>
  );
}
