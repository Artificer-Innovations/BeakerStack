/** Web entry — import from `@beakerstack/articles/web` in Vite apps. */
export type {
  ArticleHeadProps,
  ArticlesIndexHeadProps,
  TagListingHeadProps,
} from './components/ArticleHead.web.js';
export {
  ArticleHead,
  ArticlesIndexHead,
  TagListingHead,
} from './components/ArticleHead.web.js';
export type {
  ArticleProseProps,
  ArticleMetaProps,
} from './components/ArticleProse.web.js';
export {
  ArticleProse,
  ArticleMeta,
  formatArticleDate,
} from './components/ArticleProse.web.js';
export type { ArticlesIndexProps } from './components/ArticlesIndex.web.js';
export { ArticlesIndex } from './components/ArticlesIndex.web.js';
export type { ArticleDetailProps } from './components/ArticleDetail.web.js';
export { ArticleDetail } from './components/ArticleDetail.web.js';
export type { TagListingProps } from './components/TagListing.web.js';
export { TagListing } from './components/TagListing.web.js';
export {
  getArticleBySlug,
  getArticlesByTag,
  listArticles,
  getTagLabel,
} from './articleQueries.js';
export { slugifyTag } from './articleUtils.js';
