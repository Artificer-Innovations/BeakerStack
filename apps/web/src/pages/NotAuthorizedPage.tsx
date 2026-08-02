import { Link } from 'react-router';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { AppHeaderWithAdmin } from '../components/AppHeaderWithAdmin';

export default function NotAuthorizedPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <AppHeaderWithAdmin />
      <ContentContainer className='py-16'>
        <div className='mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm border border-gray-200 text-center'>
          <h1 className='text-xl font-semibold text-gray-900'>
            Not authorized
          </h1>
          <p className='mt-2 text-sm text-gray-600'>
            You do not have permission to view this page.
          </p>
          <Link
            to='/dashboard'
            className='mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700'
          >
            Go to dashboard
          </Link>
        </div>
      </ContentContainer>
    </div>
  );
}
