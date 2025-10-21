# Wikipedia Data Analysis - Which File to Use?

## Problem
We need Wikipedia data, but the source tracking is different in different files.

## Available Files Comparison

### 1. bidix_big.json (Currently Used)
```
Source: /home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor/dist/bidix_big.json
Size: 4.9MB
Entries: 10,457

✅ HAS:
- Detailed source tracking per entry
- io_wiktionary (9,338)
- fr_wiktionary_meaning (1,010)
- eo_wiktionary (189)

❌ MISSING:
- Wikipedia data (5,031 entries)
- Only includes entries WITH Esperanto translations
```

### 2. dictionary_merged_enhanced.json (New Option)
```
Source: /home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor/dictionary_merged_enhanced.json
Size: 2.5MB  
Entries: 12,840

✅ HAS:
- Wikipedia integration (5,031 entries)
- Complete merged dataset
- All Ido words

❌ MISSING:
- Detailed source tracking lost in merge
- Can't distinguish Wiktionary vs Wikipedia per entry
- No French pivot source information
```

## The Issue

**dictionary_merged_enhanced.json** is a SIMPLE merge format:
- "words" array: All words combined (Wiktionary + Wikipedia)
- No per-entry source provenance
- Metadata says Wikipedia added 5,031 entries, but we can't tell WHICH ones

**bidix_big.json** is a DETAILED format:
- Each entry has provenance and source tracking
- But Wikipedia entries were filtered out

## Solution Options

### Option A: Use dictionary_merged_enhanced.json
**Pros:**
- Has all Wikipedia data ✅
- Simple, complete

**Cons:**
- Lost detailed source tracking ❌
- Can't show per-entry badges accurately ❌
- All entries labeled as single source

### Option B: Merge both files
**Pros:**
- Detailed sources from bidix_big.json
- Wikipedia entries from dictionary_merged_enhanced.json
- Best of both worlds

**Cons:**
- More complex converter
- Need to de-duplicate
- Wikipedia entries still won't have detailed sources

### Option C: Use bidix_big.json + generate Wikipedia separately
**Pros:**
- Keep detailed sources
- Clear Wikipedia badge

**Cons:**
- Need to extract Wikipedia-only entries
- More processing

## Recommended Approach: Option B

Merge strategy:
1. Load bidix_big.json (has detailed sources for 9,601 words)
2. Load dictionary_merged_enhanced.json words array
3. For each word in merged_enhanced:
   - If already in bidix_big: keep bidix_big data (detailed sources)
   - If NOT in bidix_big: add from merged_enhanced (mark as io_wikipedia)
4. Result: Best source tracking + Wikipedia coverage

## File Decision: Use BOTH!

**Primary:** bidix_big.json (detailed sources)
**Supplement:** dictionary_merged_enhanced.json (Wikipedia entries)

This gives us:
- 9,601 words with detailed source tracking (IO, FR, EO badges)
- +3,239 Wikipedia-only entries (WIKI badge)
- Total: ~12,840 words

