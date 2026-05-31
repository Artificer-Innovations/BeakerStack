import DOMPurify from 'dompurify';
import type { HelpSection } from '../types.js';

interface HelpAccordionProps {
  sections: HelpSection[];
  forceOpen?: boolean;
}

export function HelpAccordion({
  sections,
  forceOpen = false,
}: HelpAccordionProps) {
  if (sections.length === 0) {
    return (
      <p className='rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-5 py-8 text-center text-sm text-gray-600 dark:text-gray-400'>
        No topics match your search.
      </p>
    );
  }

  return (
    <div className='space-y-2'>
      {sections.map(section => (
        <details
          key={section.id}
          open={forceOpen || undefined}
          className='group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
        >
          <summary className='flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 select-none list-none'>
            {section.title}
            <span
              className='ml-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180'
              aria-hidden='true'
            >
              ▾
            </span>
          </summary>
          {/* Build-time HTML from adopter/content/help.md — sanitized before render */}
          <div
            className='px-5 pb-4 prose prose-sm prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-400'
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(section.html),
            }}
          />
        </details>
      ))}
    </div>
  );
}
