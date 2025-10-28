/**
 * Tests for URL hash functionality
 */

describe('URL Hash Functionality', () => {
    let parseHash;

    beforeEach(() => {
        // Define parseHash function (same as in app.js)
        parseHash = (hash) => {
            if (!hash) return { direction: null, query: '' };

            // Check if hash contains direction (format: "io-eo:word" or "eo-io:word")
            const colonIndex = hash.indexOf(':');
            if (colonIndex > 0) {
                const direction = hash.substring(0, colonIndex);
                const query = decodeURIComponent(hash.substring(colonIndex + 1));

                // Validate direction
                if (direction === 'io-eo' || direction === 'eo-io') {
                    return { direction, query };
                }
            }

            // Fallback: treat entire hash as query (backward compatibility)
            return { direction: null, query: decodeURIComponent(hash) };
        };
    });

    describe('parseHash', () => {
        test('should parse hash with direction and query', () => {
            const result = parseHash('io-eo:hundo');
            expect(result).toEqual({
                direction: 'io-eo',
                query: 'hundo'
            });
        });

        test('should parse hash with eo-io direction', () => {
            const result = parseHash('eo-io:hundo');
            expect(result).toEqual({
                direction: 'eo-io',
                query: 'hundo'
            });
        });

        test('should handle URL encoded queries', () => {
            const result = parseHash('io-eo:hello%20world');
            expect(result).toEqual({
                direction: 'io-eo',
                query: 'hello world'
            });
        });

        test('should handle special characters in query', () => {
            const result = parseHash('io-eo:ma%C4%9Di');
            expect(result).toEqual({
                direction: 'io-eo',
                query: 'maĝi'
            });
        });

        test('should fallback to query-only for backward compatibility', () => {
            const result = parseHash('hundo');
            expect(result).toEqual({
                direction: null,
                query: 'hundo'
            });
        });

        test('should handle empty hash', () => {
            const result = parseHash('');
            expect(result).toEqual({
                direction: null,
                query: ''
            });
        });

        test('should handle invalid direction format', () => {
            const result = parseHash('invalid:hundo');
            expect(result).toEqual({
                direction: null,
                query: 'invalid:hundo'
            });
        });

        test('should handle hash with colon but no direction', () => {
            const result = parseHash(':hundo');
            expect(result).toEqual({
                direction: null,
                query: ':hundo'
            });
        });

        test('should handle multiple colons in query', () => {
            const result = parseHash('io-eo:word:with:colons');
            expect(result).toEqual({
                direction: 'io-eo',
                query: 'word:with:colons'
            });
        });
    });

    describe('URL hash generation', () => {
        test('should generate correct hash format', () => {
            const direction = 'io-eo';
            const query = 'hundo';
            const hash = `#${direction}:${encodeURIComponent(query)}`;
            expect(hash).toBe('#io-eo:hundo');
        });

        test('should encode special characters', () => {
            const direction = 'io-eo';
            const query = 'hello world';
            const hash = `#${direction}:${encodeURIComponent(query)}`;
            expect(hash).toBe('#io-eo:hello%20world');
        });

        test('should handle unicode characters', () => {
            const direction = 'eo-io';
            const query = 'maĝi';
            const hash = `#${direction}:${encodeURIComponent(query)}`;
            expect(hash).toBe('#eo-io:ma%C4%9Di');
        });
    });

    describe('Hash parsing round-trip', () => {
        test('should correctly round-trip simple query', () => {
            const original = { direction: 'io-eo', query: 'hundo' };
            const hash = `${original.direction}:${encodeURIComponent(original.query)}`;
            const parsed = parseHash(hash);
            expect(parsed).toEqual(original);
        });

        test('should correctly round-trip query with spaces', () => {
            const original = { direction: 'eo-io', query: 'hello world' };
            const hash = `${original.direction}:${encodeURIComponent(original.query)}`;
            const parsed = parseHash(hash);
            expect(parsed).toEqual(original);
        });

        test('should correctly round-trip query with unicode', () => {
            const original = { direction: 'io-eo', query: 'maĝi' };
            const hash = `${original.direction}:${encodeURIComponent(original.query)}`;
            const parsed = parseHash(hash);
            expect(parsed).toEqual(original);
        });
    });
});
