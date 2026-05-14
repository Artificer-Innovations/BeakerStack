import React from 'react';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
          <div className='max-w-md text-center'>
            <p className='text-gray-900 dark:text-white font-semibold'>
              Something went wrong.
            </p>
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='mt-4 text-sm text-indigo-600 hover:text-indigo-500'
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
