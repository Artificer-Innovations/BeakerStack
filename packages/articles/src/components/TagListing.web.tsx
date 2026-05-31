import { Link } from 'react-router-dom';
import { getArticlesByTag, getTagLabel } from '../articleQueries.js';
import { TagListingHead } from './ArticleHead.web.js';
import { formatArticleDate } from './ArticleProse.web.js';

export interface TagListingProps {
  tagSlug: string;
  productName: string;
}

export function TagListing({ tagSlug, productName }: TagListingProps) {
  const label = getTagLabel(tagSlug) ?? tagSlug;
  const articles = getArticlesByTag(tagSlug);

  return (
    <>
      <TagListingHead tagSlug={tagSlug} productName={productName} />
      <nav className='mb-6 text-sm'>
        <Link
          to='/articles'
          className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
        >
          ← All articles
        </Link>
      </nav>
      <header className='mb-10'>
        <p className='text-sm font-medium text-indigo-600 dark:text-indigo-400'>
          Tag
        </p>
        <h1 className='mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
          {label}
        </h1>
      </header>
      <ul className='space-y-8'>
        {articles.map(article => (
          <li
            key={article.slug}
            className='border-b border-gray-200 pb-10 last:border-b-0 dark:border-gray-700'
          >
            <h2 className='text-xl font-semibold'>
              <Link
                to={`/articles/${article.slug}`}
                className='text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
              >
                {article.title}
              </Link>
            </h2>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              <time dateTime={article.date}>
                {formatArticleDate(article.date)}
              </time>
            </p>
            <p className='mt-3 mb-8 text-gray-600 dark:text-gray-300'>
              {article.excerpt}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
