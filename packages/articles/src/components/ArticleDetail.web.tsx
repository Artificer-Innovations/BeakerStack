import { Link } from 'react-router-dom';
import { getArticleBySlug } from '../articleQueries.js';
import { slugifyTag } from '../articleUtils.js';
import { ArticleHead } from './ArticleHead.web.js';
import { ArticleMeta, ArticleProse } from './ArticleProse.web.js';

export interface ArticleDetailProps {
  slug: string;
  productName: string;
}

export function ArticleDetail({ slug, productName }: ArticleDetailProps) {
  const article = getArticleBySlug(slug);
  if (!article) return null;

  const related = article.relatedSlugs
    .map(relatedSlug => getArticleBySlug(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return (
    <>
      <ArticleHead article={article} productName={productName} />
      <nav className='mb-6 text-sm'>
        <Link
          to='/articles'
          className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
        >
          ← All articles
        </Link>
      </nav>
      <header className='mb-2'>
        <h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
          {article.title}
        </h1>
      </header>
      <ArticleMeta article={article} />
      <ArticleProse html={article.html} />
      {related.length > 0 ? (
        <aside className='mt-12 border-t border-gray-200 pt-8 dark:border-gray-700'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Related articles
          </h2>
          <ul className='mt-4 space-y-2'>
            {related.map(entry => (
              <li key={entry.slug}>
                <Link
                  to={`/articles/${entry.slug}`}
                  className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <div className='mt-8 flex flex-wrap gap-2'>
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
    </>
  );
}
