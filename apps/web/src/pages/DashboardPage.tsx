import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.web';
import {
  DASHBOARD_TITLE,
  DASHBOARD_SUBTITLE,
} from '@beakerstack/shared/utils/strings';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <AppHeader supabaseClient={supabase} />

      <div className='max-w-[800px] mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='border-4 border-dashed border-gray-200 rounded-lg p-8'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                {DASHBOARD_TITLE}
              </h2>
              <p className='text-gray-600'>{DASHBOARD_SUBTITLE}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
