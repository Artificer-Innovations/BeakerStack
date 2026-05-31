import { Navigate, useParams } from 'react-router-dom';
import { PolicyPublicHeader } from '../components/PolicyPublicHeader';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import {
  TagListing,
  getArticlesByTag,
  getTagLabel,
} from '@beakerstack/articles/web';

export default function ArticlesTagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { branding } = getAdopterConfig();

  if (!tag || getArticlesByTag(tag).length === 0 || !getTagLabel(tag)) {
    return <Navigate to='/articles' replace />;
  }

  return (
    <>
      <PolicyPublicHeader />
      <ContentContainer variant='prose' className='py-12'>
        <TagListing tagSlug={tag} productName={branding.displayName} />
      </ContentContainer>
    </>
  );
}
