import type { InputHTMLAttributes } from 'react';

export type AdminSearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string;
};

export function AdminSearchInput({
  label = 'Search',
  className = '',
  ...props
}: AdminSearchInputProps) {
  return (
    <label className='block'>
      <span className='sr-only'>{label}</span>
      <input
        type='search'
        placeholder={props.placeholder ?? 'Search by email…'}
        className={[
          'block w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm',
          'placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          className,
        ].join(' ')}
        {...props}
      />
    </label>
  );
}
