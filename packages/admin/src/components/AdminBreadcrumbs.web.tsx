import { Link } from 'react-router-dom';

export type AdminBreadcrumbItem = {
  label: string;
  to?: string;
};

export function AdminBreadcrumbs({ items }: { items?: AdminBreadcrumbItem[] }) {
  if (!items?.length) {
    return <p className='text-sm text-gray-500'>Admin</p>;
  }

  return (
    <nav aria-label='Breadcrumb' className='text-sm'>
      <ol className='flex flex-wrap items-center gap-1 text-gray-500'>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className='flex items-center gap-1'>
            {i > 0 && <span aria-hidden>/</span>}
            {item.to ? (
              <Link
                to={item.to}
                className='text-indigo-600 hover:text-indigo-800 font-medium'
              >
                {item.label}
              </Link>
            ) : (
              <span className='text-gray-900 font-medium'>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
