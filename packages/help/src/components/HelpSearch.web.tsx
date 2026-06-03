import { useMemo, useState } from 'react';
import type { HelpSection } from '../types.js';

interface HelpSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function HelpSearch({ value, onChange }: HelpSearchProps) {
  return (
    <label className='block'>
      <span className='sr-only'>Search help topics</span>
      <input
        type='search'
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder='Search help topics…'
        className='w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
      />
    </label>
  );
}

export function filterHelpSections(
  sections: HelpSection[],
  query: string
): HelpSection[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sections;
  return sections.filter(
    section =>
      section.title.toLowerCase().includes(trimmed) ||
      section.searchText.toLowerCase().includes(trimmed)
  );
}

export function useHelpSectionFilter(sections: HelpSection[]) {
  const [query, setQuery] = useState('');
  const filteredSections = useMemo(
    () => filterHelpSections(sections, query),
    [sections, query]
  );
  const isFiltering = query.trim().length > 0;

  return { query, setQuery, filteredSections, isFiltering };
}
