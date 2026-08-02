import { Link } from 'react-router';
import type { ArticleRecord } from '../types.js';
import { slugifyTag } from '../articleUtils.js';
import { sanitizeArticleHtmlForRender } from '../sanitizeArticleHtmlForRender.js';

export interface ArticleProseProps {
  html: string;
}

export function ArticleProse({ html }: ArticleProseProps) {
  return (
    <div
      className='prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-indigo-600 dark:prose-a:text-indigo-400'
      dangerouslySetInnerHTML={{
        __html: sanitizeArticleHtmlForRender(html),
      }}
    />
  );
}

export function formatArticleDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    return isoDate;
  }
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }
  );
}

export interface ArticleMetaProps {
  article: ArticleRecord;
}

export function ArticleMeta({ article }: ArticleMetaProps) {
  return (
    <div className='mb-6'>
      <p className='text-sm text-gray-500 dark:text-gray-400'>
        <time dateTime={article.date}>{formatArticleDate(article.date)}</time>
        {article.updated ? (
          <>
            {' '}
            · updated{' '}
            <time dateTime={article.updated}>
              {formatArticleDate(article.updated)}
            </time>
          </>
        ) : null}
        {' · '}
        {article.readingTimeMinutes} min read
      </p>
      <div className='mt-4 mb-4 flex flex-wrap gap-2'>
        {article.tags.map(tag => (
          <Link
            key={tag}
            to={`/articles/tags/${slugifyTag(tag)}`}
            className='rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          >
            {tag}
          </Link>
        ))}
      </div>
      <hr className='border-gray-200 dark:border-gray-700' />
    </div>
  );
}
