import { Link } from 'react-router';
import { listArticles } from '../articleQueries.js';
import { slugifyTag } from '../articleUtils.js';
import { ArticlesIndexHead } from './ArticleHead.web.js';
import { formatArticleDate } from './ArticleProse.web.js';

export interface ArticlesIndexProps {
  productName: string;
  description?: string | undefined;
  indexSubtitle?: string | undefined;
}

export function ArticlesIndex({
  productName,
  description,
  indexSubtitle = 'Articles on AI memory, MCP, and product comparisons.',
}: ArticlesIndexProps) {
  const articles = listArticles();

  return (
    <>
      <ArticlesIndexHead
        productName={productName}
        {...(description ? { description } : {})}
      />
      <div className='space-y-12'>
        <header>
          <h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
            Articles
          </h1>
          <p className='mt-3 text-lg text-gray-600 dark:text-gray-300'>
            {indexSubtitle}
          </p>
        </header>
        <ul className='space-y-8'>
          {articles.map(article => (
            <li
              key={article.slug}
              className='border-b border-gray-200 pb-6 last:border-b-0 dark:border-gray-700'
            >
              <article>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                  <Link
                    to={`/articles/${article.slug}`}
                    className='hover:text-indigo-600 dark:hover:text-indigo-400'
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                  <time dateTime={article.date}>
                    {formatArticleDate(article.date)}
                  </time>
                  {' · '}
                  {article.readingTimeMinutes} min read
                </p>
                <p className='mt-3 text-gray-600 dark:text-gray-300'>
                  {article.excerpt}
                </p>
                <div className='mt-3 mb-4 flex flex-wrap gap-2'>
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
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
