/**
 * Tests for dictionary format parsing (old and new formats)
 */

// Logic extracted from loadDictionary() in app.js
function parseDictionary(data) {
    let metadata, allEntries;

    if (Array.isArray(data.entries)) {
        // New format: {version, generation_date, statistics, entries: [{lemma, translations, ...}]}
        const stats = data.statistics || {};
        metadata = {
            total_unique_ido_words: stats.total_entries || data.entries.length,
            last_updated: data.generation_date,
            source_stats: stats.original_sources || {}
        };
        allEntries = data.entries.map(entry => ({
            ido: entry.lemma,
            esperanto: (entry.translations || []).filter(t => t.lang === 'eo').map(t => t.term),
            morfologio: entry.morphology?.paradigm ? [entry.morphology.paradigm] : [],
            sources: (entry.source_details || {}).all_sources || []
        }));
    } else {
        // Old format: {metadata, ido_word: {esperanto_words, morfologio, sources}}
        metadata = data.metadata || null;
        const dict = { ...data };
        delete dict.metadata;
        allEntries = Object.entries(dict).map(([idoWord, entryData]) => ({
            ido: idoWord,
            esperanto: entryData.esperanto_words || [],
            morfologio: entryData.morfologio || [],
            sources: entryData.sources || []
        }));
    }

    return { metadata, allEntries };
}

describe('Old dictionary format', () => {
    const oldFormat = {
        metadata: {
            total_unique_ido_words: 2,
            last_updated: '2025-12-04',
            source_stats: { io_wiktionary: 2 }
        },
        kavalo: { esperanto_words: ['ĉevalo'], morfologio: ['o__n'], sources: ['io_wiktionary'] },
        bona:   { esperanto_words: ['bona'],   morfologio: ['a__adj'], sources: ['io_wiktionary'] }
    };

    test('parses metadata correctly', () => {
        const { metadata } = parseDictionary(oldFormat);
        expect(metadata.total_unique_ido_words).toBe(2);
        expect(metadata.last_updated).toBe('2025-12-04');
    });

    test('parses entries correctly', () => {
        const { allEntries } = parseDictionary(oldFormat);
        expect(allEntries).toHaveLength(2);
        const kavalo = allEntries.find(e => e.ido === 'kavalo');
        expect(kavalo.esperanto).toEqual(['ĉevalo']);
        expect(kavalo.morfologio).toEqual(['o__n']);
        expect(kavalo.sources).toEqual(['io_wiktionary']);
    });
});

describe('New dictionary format', () => {
    const newFormat = {
        version: '1.0',
        generation_date: '2026-02-27T12:00:00',
        statistics: {
            total_entries: 2,
            original_sources: { io_wiktionary: 1, io_wikipedia: 1 }
        },
        entries: [
            {
                lemma: 'kavalo',
                translations: [{ term: 'ĉevalo', lang: 'eo', confidence: 1.0, sources: ['io_wiktionary'] }],
                pos: 'noun',
                source_details: { primary_source: 'io_wiktionary', all_sources: ['io_wiktionary'] },
                morphology: { paradigm: 'o__n' }
            },
            {
                lemma: 'nerva',
                translations: [{ term: 'Nerva', lang: 'eo', confidence: 0.9, sources: ['io_wikipedia'] }],
                pos: 'adj',
                source_details: { primary_source: 'io_wikipedia', all_sources: ['io_wikipedia'] },
                morphology: { paradigm: 'a__adj' }
            }
        ]
    };

    test('parses metadata from statistics', () => {
        const { metadata } = parseDictionary(newFormat);
        expect(metadata.total_unique_ido_words).toBe(2);
        expect(metadata.last_updated).toBe('2026-02-27T12:00:00');
        expect(metadata.source_stats).toEqual({ io_wiktionary: 1, io_wikipedia: 1 });
    });

    test('parses entries correctly', () => {
        const { allEntries } = parseDictionary(newFormat);
        expect(allEntries).toHaveLength(2);
        const kavalo = allEntries.find(e => e.ido === 'kavalo');
        expect(kavalo.esperanto).toEqual(['ĉevalo']);
        expect(kavalo.sources).toEqual(['io_wiktionary']);
    });

    test('converts morphology dict to array', () => {
        const { allEntries } = parseDictionary(newFormat);
        const kavalo = allEntries.find(e => e.ido === 'kavalo');
        expect(Array.isArray(kavalo.morfologio)).toBe(true);
        expect(kavalo.morfologio).toEqual(['o__n']);
    });

    test('handles null morphology as empty array', () => {
        const data = {
            ...newFormat,
            entries: [{ lemma: 'la', translations: [{ term: 'la', lang: 'eo', confidence: 1.0, sources: [] }], source_details: { all_sources: [] }, morphology: null }]
        };
        const { allEntries } = parseDictionary(data);
        expect(allEntries[0].morfologio).toEqual([]);
    });

    test('filters out non-eo translations', () => {
        const data = {
            ...newFormat,
            entries: [{
                lemma: 'la',
                translations: [
                    { term: 'la',  lang: 'eo', confidence: 1.0, sources: [] },
                    { term: 'the', lang: 'en', confidence: 0.9, sources: [] }
                ],
                source_details: { all_sources: [] },
                morphology: null
            }]
        };
        const { allEntries } = parseDictionary(data);
        expect(allEntries[0].esperanto).toEqual(['la']);
    });

    test('eo-io search finds nerva entry', () => {
        const { allEntries } = parseDictionary(newFormat);
        const searchTerm = 'nerva';
        const results = allEntries.filter(entry =>
            entry.esperanto.some(w => w.toLowerCase().includes(searchTerm))
        );
        expect(results).toHaveLength(1);
        expect(results[0].ido).toBe('nerva');
    });
});
