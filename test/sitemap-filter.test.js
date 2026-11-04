const { isSitemapWorthy } = require('../scripts/sitemap-filter');

describe('isSitemapWorthy', () => {
  const core = new Set(['la']);

  test('keeps a lowercase word with two translations', () => {
    expect(isSitemapWorthy('glacio', ['glacio', 'glaciaĵo'], core)).toBe(true);
  });

  test('keeps a word starting with an Esperanto letter', () => {
    expect(isSitemapWorthy('ĉielo', ['cielo', 'firmamento'], core)).toBe(true);
  });

  test('drops a word with one translation', () => {
    expect(isSitemapWorthy('glacio', ['glacio'], core)).toBe(false);
  });

  test('drops a capitalized name even with two translations', () => {
    expect(isSitemapWorthy('Qamishli', ['Al-Kamiŝli', 'Kamiŝli'], core)).toBe(false);
  });

  test('always keeps a core word', () => {
    expect(isSitemapWorthy('la', ['la'], core)).toBe(true);
  });
});
