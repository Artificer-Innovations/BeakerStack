import { HELP } from '../generated/help.js';
import { HelpAccordion } from './HelpAccordion.web.js';
import { HelpFeedbackForm } from './HelpFeedbackForm.web.js';
import { HelpSearch, useHelpSectionFilter } from './HelpSearch.web.js';

export type HelpContentProps = {
  contactEmail: string;
  productName: string;
};

export function HelpContent({ contactEmail, productName }: HelpContentProps) {
  const { title, subtitle, sections } = HELP;
  const { query, setQuery, filteredSections, isFiltering } =
    useHelpSectionFilter(sections);

  return (
    <div className='space-y-8'>
      <header>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          {title}
        </h1>
        {subtitle ? (
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            {subtitle}
          </p>
        ) : null}
      </header>

      <HelpSearch value={query} onChange={setQuery} />

      <HelpAccordion sections={filteredSections} forceOpen={isFiltering} />

      <HelpFeedbackForm contactEmail={contactEmail} productName={productName} />

      <p className='rounded-lg bg-gray-100 dark:bg-gray-800/80 px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
        Can&apos;t find what you&apos;re looking for? Use the feedback form
        above to let us know.
      </p>
    </div>
  );
}
