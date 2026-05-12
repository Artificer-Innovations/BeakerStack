export type SummaryEntry = {
  id: string;
  at: number;
  text: string;
};

type Props = {
  entries: SummaryEntry[];
};

export function AISummarizeResult({ entries }: Props) {
  return (
    <div className='mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4'>
      {entries.length === 0 ? (
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Click &apos;Simulate AI summarize&apos; to generate a result.
        </p>
      ) : (
        <ul className='space-y-3'>
          {entries.map(e => (
            <li
              key={e.id}
              className='border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0'
            >
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {new Date(e.at).toLocaleString()}
              </p>
              <p className='mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200'>
                {e.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
