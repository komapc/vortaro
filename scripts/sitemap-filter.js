// Which word pages are listed in the sitemaps. The rest stay live, linked and
// indexable: leaving a page out of a sitemap is not a noindex.
//
// Google left ~64k of these URLs "Discovered - currently not indexed" (GSC, 10-23),
// so the sitemap now names only the pages with the most to offer: common words
// (lowercase headword) with at least two translations, plus the homepage's
// hand-picked core vocabulary whatever its translation count.
const isSitemapWorthy = (headword, targets, coreWords) => coreWords.has(headword)
  || (/^\p{Ll}/u.test(headword) && targets.length >= 2);

module.exports = { isSitemapWorthy };
