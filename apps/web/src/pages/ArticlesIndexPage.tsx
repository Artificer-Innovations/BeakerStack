import { PolicyPublicHeader } from '../components/PolicyPublicHeader';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { ArticlesIndex } from '@beakerstack/articles/web';
import { ARTICLES_INDEX_SUBTITLE } from '../lib/articlesCopy';

export default function ArticlesIndexPage() {
  const { branding } = getAdopterConfig();

  return (
    <>
      <PolicyPublicHeader />
      <ContentContainer variant='prose' className='py-12'>
        <ArticlesIndex
          productName={branding.displayName}
          indexSubtitle={ARTICLES_INDEX_SUBTITLE}
        />
      </ContentContainer>
    </>
  );
}
