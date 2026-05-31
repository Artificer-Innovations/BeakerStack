import { Navigate, useParams } from 'react-router-dom';
import { PolicyPublicHeader } from '../components/PolicyPublicHeader';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { ArticleDetail, getArticleBySlug } from '@beakerstack/articles/web';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { branding } = getAdopterConfig();

  if (!slug || !getArticleBySlug(slug)) {
    return <Navigate to='/articles' replace />;
  }

  return (
    <>
      <PolicyPublicHeader />
      <ContentContainer variant='prose' className='py-12'>
        <ArticleDetail slug={slug} productName={branding.displayName} />
      </ContentContainer>
    </>
  );
}
