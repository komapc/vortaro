# Vortaro Data Sources - Analysis and Action Plan

## Issue #1: Missing Sources in Current Dictionary

### Expected Sources (from user request):
1. ✅ **Ido Wiktionary** - Present (9,338)
2. ✅ **French Wiktionary pivot** - Present (1,010)
3. ✅ **Esperanto Wiktionary** - Present (189)
4. ❌ **Wikipedia/Wikidata** - MISSING
5. ❌ **English Wiktionary pivot** - MISSING
6. ❌ **Name consistency data** - MISSING

### Current Status
**File Used:** `bidix_big.json` (10,457 entries, 3 sources only)
- Only includes entries WITH Esperanto translations
- Does NOT include Wikipedia data
- Does NOT include English pivot
- Missing 77,808 Wikipedia entries mentioned in reports

### Available Better Source
**File Available:** `dictionary_merged_enhanced.json` (2.5MB)
- Has Wikipedia integration (5,031 entries added)
- Has complete merged data
- Structure: `{metadata, words: [...], ...top-level entries}`

## Issue #2: Explanation of "vortope"

### Current Entry
```
vortope → punktipealt
📕 IO
Morphology: e__adv
```

### Breakdown

**vortope** (Ido word)
- **vorto** = word
- **-pe** = adverbial suffix meaning "in terms of, with respect to"
- Combined: "word-wise" or "in terms of words"

**punktipealt** (Esperanto translation)  
- **punkti** = to punctuate, to dot
- **-pe** = similar adverbial concept
- **-alt** = in a high manner / from above
- But this seems like an unusual/incorrect translation!

### Analysis
This appears to be a **questionable translation**:
- "vortope" should mean "verbally, in words, word-wise"
- "punktipealt" means something like "punctuation-wise from above"
- These don't match semantically!

**Possible Issues:**
1. Extraction error from Ido Wiktionary
2. Incorrect Wiktionary entry
3. Data corruption during processing

**Better Esperanto translation might be:**
- "vorte" (in words, verbally)
- "laŭvorte" (word-for-word, literally)
- "per vortoj" (by means of words)

### Morphology: `e__adv`
- `e` = Ido adverbial ending
- `__adv` = Part of speech tag: adverb
- Paradigm: words ending in -e are adverbs in Ido

**Source:** Only from `io_wiktionary` (single source, not confirmed)
- No French pivot confirmation
- No Esperanto Wiktionary reverse validation
- Should be flagged for review

## Action Plan

### 1. Use Complete Data Source

**TODO:** Convert `dictionary_merged_enhanced.json` instead of `bidix_big.json`

**Benefits:**
- ✅ Include Wikipedia data (5,031 additional entries)
- ✅ Complete merged dataset
- ✅ Better metadata

**Structure to handle:**
```json
{
  "metadata": {...},
  "words": [
    {"ido_word": "...", "esperanto_words": [...], ...}
  ],
  "top_level_entries": {...}
}
```

### 2. Prepare for English Pivot

**Available in Pipeline:**
- Reports mention English pivot data (726 entries available)
- Currently not in the exported dictionaries
- Need to regenerate with English included

**Options:**
a) Run extractor with English pivot enabled
b) Find existing English pivot JSON file
c) Integrate from separate source

### 3. Add Wikipedia/Wikidata Attribution

**Current:** Wikipedia data exists but no source badges for it
**TODO:** Update badge system to show:
- 📚 WIKI badge for Wikipedia sources
- 🌐 WIKIDATA badge if/when available

### 4. Name Consistency

**Unclear from context - possible interpretations:**
a) Proper nouns (names of people, places)
b) Consistent naming across sources
c) Name entity recognition data

**TODO:** Clarify with user what "name consistency" means

### 5. Data Quality: Review Questionable Entries

**TODO:** Flag entries like "vortope" that:
- Have only 1 source
- Semantic mismatch between languages
- Unusual morphology patterns

## Recommended Next Steps

### Step 1: Create Better Converter
```python
# New converter for dictionary_merged_enhanced.json
# Handle both "words" array and top-level entries
# Extract Wikipedia source information
# Preserve all metadata
```

### Step 2: Regenerate Dictionary
```bash
cd /home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor
# Run with English pivot enabled
make regenerate SKIP_DOWNLOAD=1
```

### Step 3: Update UI
- Add 📚 WIKI badge
- Add 🇬🇧 EN badge for English pivot
- Add data quality indicators
- Show confidence scores if available

### Step 4: Documentation
- Document source priorities
- Explain Wikipedia integration
- Add data quality notes
- Create contributor guide

## Expected Final Result

### Sources (Target):
| Source | Count | Badge | Status |
|--------|-------|-------|--------|
| Ido Wiktionary | ~44,000 | 📕 IO | ✅ Current |
| French pivot | ~1,000 | 🇫🇷 FR | ✅ Current |
| Esperanto Wiktionary | ~200 | 📗 EO | ✅ Current |
| Wikipedia | ~5,000 | 📚 WIKI | ❌ TODO |
| English pivot | ~700 | 🇬🇧 EN | ❌ TODO |
| Wikidata | ? | 🌐 DATA | ❌ Future |

### Total Coverage:
- Current: ~9,600 words
- With Wikipedia: ~12,000+ words  
- With English pivot: ~12,500+ words
- Full potential: ~48,000+ words (all Ido dictionary)

