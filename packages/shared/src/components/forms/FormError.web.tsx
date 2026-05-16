export interface FormErrorProps {
  message: string;
  className?: string;
}

/**
 * FormError component for web
 * Displays error messages in a styled container
 */
export function FormError({ message, className = '' }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 ${className}`}
      role='alert'
      aria-live='polite'
    >
      <div className='flex'>
        <div className='flex-shrink-0'>
          <svg
            className='h-5 w-5 text-red-400'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <div className='ml-3'>
          <p className='text-sm font-medium text-red-800 dark:text-red-300'>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
