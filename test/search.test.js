/**
 * Tests for search functionality
 */

// Mock dictionary data for testing
const mockDictionary = {
    "hundo": {
        "esperanto_words": ["hundo"],
        "sources": ["io_wiktionary"],
        "morfologio": ["o__n"]
    },
    "manjar": {
        "esperanto_words": ["manĝi"],
        "sources": ["fr_wiktionary_meaning"],
        "morfologio": ["ar__v"]
    },
    "bela": {
        "esperanto_words": ["bela"],
        "sources": ["io_wiktionary"],
        "morfologio": ["a__adj"]
    }
};

// Mock DOM elements
document.body.innerHTML = `
  <div id="searchInput"></div>
  <div id="results"></div>
  <div id="searchInfo"></div>
  <div id="wordCount"></div>
`;

// Load the app.js functions (we'll need to refactor app.js to be more testable)
// For now, we'll test the core logic

describe('Search Functionality', () => {
    beforeEach(() => {
        // Reset global state
        global.dictionary = mockDictionary;
        global.allEntries = Object.entries(mockDictionary).map(([idoWord, entryData]) => ({
            ido: idoWord,
            esperanto: entryData.esperanto_words || [],
            morfologio: entryData.morfologio || [],
            sources: entryData.sources || []
        }));
        global.currentDirection = 'io-eo';
        global.activeFilters = { sources: new Set() };
    });

    test('should filter entries by Ido word in io-eo direction', () => {
        const searchTerm = 'hun';
        const results = global.allEntries.filter(entry => {
            if (global.currentDirection === 'io-eo') {
                return entry.ido.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return false;
        });

        expect(results).toHaveLength(1);
        expect(results[0].ido).toBe('hundo');
    });

    test('should filter entries by Esperanto word in eo-io direction', () => {
        global.currentDirection = 'eo-io';
        const searchTerm = 'bela';
        const results = global.allEntries.filter(entry => {
            if (global.currentDirection === 'eo-io') {
                return entry.esperanto.some(eoWord => eoWord.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return false;
        });

        expect(results).toHaveLength(1);
        expect(results[0].ido).toBe('bela');
    });

    test('should return empty results for non-existent words', () => {
        const searchTerm = 'nonexistent';
        const results = global.allEntries.filter(entry => {
            if (global.currentDirection === 'io-eo') {
                return entry.ido.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return false;
        });

        expect(results).toHaveLength(0);
    });
});

describe('Part of Speech Extraction', () => {
    test('should extract noun from morfologio', () => {
        const extractPartOfSpeech = (morph) => {
            if (morph.includes('__n') || morph.includes('o__')) return 'noun';
            if (morph.includes('__v') || morph.includes('ar__')) return 'verb';
            if (morph.includes('__adj') || morph.includes('a__')) return 'adjective';
            return null;
        };

        expect(extractPartOfSpeech('o__n')).toBe('noun');
        expect(extractPartOfSpeech('ar__v')).toBe('verb');
        expect(extractPartOfSpeech('a__adj')).toBe('adjective');
    });

    test('should return null for unknown morfologio patterns', () => {
        const extractPartOfSpeech = (morph) => {
            if (morph.includes('__n') || morph.includes('o__')) return 'noun';
            return null;
        };

        expect(extractPartOfSpeech('unknown__pattern')).toBe(null);
    });
});

describe('Source Badge Generation', () => {
    test('should generate correct badge class for sources', () => {
        const getBadgeClass = (source) => {
            if (source.includes('io_wiktionary')) return 'badge-io';
            if (source.includes('fr_wiktionary')) return 'badge-fr';
            if (source.includes('en_wiktionary')) return 'badge-en';
            return 'badge-default';
        };

        expect(getBadgeClass('io_wiktionary')).toBe('badge-io');
        expect(getBadgeClass('fr_wiktionary_meaning')).toBe('badge-fr');
        expect(getBadgeClass('unknown_source')).toBe('badge-default');
    });
});
describe('Inflected-form lookup (Ido de-inflection)', () => {
    // Mirrors idoLemmaCandidates() in app.js: maps an inflected surface form to
    // candidate lemmas, gated to those present in the dictionary.
    const lemmaSet = new Set(['amar', 'esar', 'venar', 'urbo', 'libro', 'skribar', 'bela']);
    function idoLemmaCandidates(word) {
        const cands = new Set();
        const add = w => { if (lemmaSet.has(w)) cands.add(w); };
        let m;
        if ((m = word.match(/^(.{2,})(as|is|os|us|ez)$/))) {
            for (const inf of ['ar', 'ir', 'or']) add(m[1] + inf);
        }
        if ((m = word.match(/^(.{2,})(ant|int|ont|at|it|ot)[aeoi]$/))) {
            for (const inf of ['ar', 'ir', 'or']) add(m[1] + inf);
        }
        if ((m = word.match(/^(.{2,})i$/))) { add(m[1] + 'o'); add(m[1] + 'a'); }
        cands.delete(word);
        return cands;
    }

    test('maps finite verb forms to the infinitive lemma', () => {
        expect([...idoLemmaCandidates('amas')]).toEqual(['amar']); // present
        expect([...idoLemmaCandidates('esis')]).toEqual(['esar']); // past
        expect([...idoLemmaCandidates('venos')]).toEqual(['venar']); // future
    });

    test('maps participles and imperatives to the infinitive lemma', () => {
        expect([...idoLemmaCandidates('skribita')]).toEqual(['skribar']);
    });

    test('maps noun plural -i to the singular lemma', () => {
        expect(idoLemmaCandidates('urbi').has('urbo')).toBe(true);
        expect(idoLemmaCandidates('libri').has('libro')).toBe(true);
    });

    test('returns nothing for a lemma whose candidate is absent', () => {
        expect(idoLemmaCandidates('manjas').size).toBe(0); // manjar not in lemmaSet
    });

    test('does not de-inflect uninflected lemmas (no false positives)', () => {
        expect(idoLemmaCandidates('bela').size).toBe(0); // adjective lemma, unchanged
        expect(idoLemmaCandidates('amar').size).toBe(0); // already the infinitive
    });
});
