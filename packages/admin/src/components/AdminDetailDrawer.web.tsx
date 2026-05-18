import type { ReactNode } from 'react';

export type AdminDetailDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function AdminDetailDrawer({
  open,
  title,
  onClose,
  children,
}: AdminDetailDrawerProps) {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex justify-end'
      role='dialog'
      aria-modal
    >
      <button
        type='button'
        className='absolute inset-0 bg-gray-900/40'
        aria-label='Close panel'
        onClick={onClose}
      />
      <aside className='relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-4'>
          <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            aria-label='Close'
          >
            ✕
          </button>
        </div>
        <div className='flex-1 overflow-y-auto px-4 py-4'>{children}</div>
      </aside>
    </div>
  );
}
