/**
 * Tests for filtering functionality
 */

describe('Filter Functionality', () => {
    let mockEntries;

    beforeEach(() => {
        mockEntries = [
            {
                ido: 'hundo',
                esperanto: ['hundo'],
                sources: ['io_wiktionary'],
                morfologio: ['o__n']
            },
            {
                ido: 'manjar',
                esperanto: ['manĝi'],
                sources: ['fr_wiktionary_meaning'],
                morfologio: ['ar__v']
            },
            {
                ido: 'bela',
                esperanto: ['bela'],
                sources: ['io_wiktionary', 'eo_wiktionary'],
                morfologio: ['a__adj']
            },
            {
                ido: 'artiklo',
                esperanto: ['artikolo'],
                sources: ['io_wikipedia'],
                morfologio: ['o__n']
            }
        ];
    });

    test('should apply source filters correctly', () => {
        const applyFilters = (results, activeFilters) => {
            if (activeFilters.sources.size === 0) {
                return results;
            }
            return results.filter(entry => {
                return entry.sources.some(source => activeFilters.sources.has(source));
            });
        };

        const activeFilters = { sources: new Set(['io_wiktionary']) };
        const filtered = applyFilters(mockEntries, activeFilters);

        expect(filtered).toHaveLength(2); // hundo and bela have io_wiktionary
        expect(filtered.map(e => e.ido)).toEqual(['hundo', 'bela']);
    });

    test('should return all results when no filters are active', () => {
        const applyFilters = (results, activeFilters) => {
            if (activeFilters.sources.size === 0) {
                return results;
            }
            return results.filter(entry => {
                return entry.sources.some(source => activeFilters.sources.has(source));
            });
        };

        const activeFilters = { sources: new Set() };
        const filtered = applyFilters(mockEntries, activeFilters);

        expect(filtered).toHaveLength(4);
    });

    test('should handle multiple source filters', () => {
        const applyFilters = (results, activeFilters) => {
            if (activeFilters.sources.size === 0) {
                return results;
            }
            return results.filter(entry => {
                return entry.sources.some(source => activeFilters.sources.has(source));
            });
        };

        const activeFilters = { sources: new Set(['io_wiktionary', 'io_wikipedia']) };
        const filtered = applyFilters(mockEntries, activeFilters);

        expect(filtered).toHaveLength(3); // hundo, bela, artiklo
        expect(filtered.map(e => e.ido)).toEqual(['hundo', 'bela', 'artiklo']);
    });

    test('should return empty results for non-matching filters', () => {
        const applyFilters = (results, activeFilters) => {
            if (activeFilters.sources.size === 0) {
                return results;
            }
            return results.filter(entry => {
                return entry.sources.some(source => activeFilters.sources.has(source));
            });
        };

        const activeFilters = { sources: new Set(['nonexistent_source']) };
        const filtered = applyFilters(mockEntries, activeFilters);

        expect(filtered).toHaveLength(0);
    });
});

describe('Filter UI State Management', () => {
    test('should update filter count correctly', () => {
        const updateFilterCount = (activeFilters) => {
            return activeFilters.sources.size;
        };

        const activeFilters = { sources: new Set(['io_wiktionary', 'fr_wiktionary_meaning']) };
        expect(updateFilterCount(activeFilters)).toBe(2);

        activeFilters.sources.clear();
        expect(updateFilterCount(activeFilters)).toBe(0);
    });

    test('should clear all filters', () => {
        const clearAllFilters = (activeFilters) => {
            activeFilters.sources.clear();
            return activeFilters;
        };

        const activeFilters = { sources: new Set(['io_wiktionary', 'fr_wiktionary_meaning']) };
        const cleared = clearAllFilters(activeFilters);

        expect(cleared.sources.size).toBe(0);
    });
});