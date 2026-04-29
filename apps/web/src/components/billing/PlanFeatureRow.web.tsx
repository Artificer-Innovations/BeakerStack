import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlanFeatureRow({
  name,
  available,
  showUpgradeLink = false,
}: {
  name: string;
  available: boolean;
  showUpgradeLink?: boolean;
}): JSX.Element {
  return (
    <div className='flex items-center justify-between border-b border-gray-100 py-2 text-sm'>
      <div className='flex items-center gap-2 text-gray-900'>
        {available ? (
          <Check className='h-4 w-4 text-green-600' aria-hidden />
        ) : (
          <X className='h-4 w-4 text-gray-400' aria-hidden />
        )}
        <span>{name}</span>
      </div>
      <div className='text-right text-gray-600'>
        {available ? (
          'Available'
        ) : (
          <span>
            Not available
            {showUpgradeLink && (
              <>
                {' '}
                ·{' '}
                <Link
                  to='/billing/plans'
                  className='font-medium text-indigo-600 hover:text-indigo-500'
                >
                  Upgrade to unlock
                </Link>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
