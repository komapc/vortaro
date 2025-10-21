# Vortaro Dictionary: Sources and Merging Logic

## Example: The word "vorto"

### In Vortaro Dictionary (After Merging)
```json
{
  "vorto": {
    "esperanto_words": ["vorto"],
    "sources": [
      "io_wiktionary",
      "fr_wiktionary_meaning",
      "eo_wiktionary"
    ],
    "morfologio": ["o__n"]
  }
}
```

**Translation:** vorto → vorto  
**Found in:** 3 different sources ✨  
**UI Display:** Shows badges: 📕 IO | 🇫🇷 FR | 📗 EO

### In BIG BIDIX (Before Merging)

The same word appears **3 times** in the source data:

#### Entry 1: From Ido Wiktionary
```json
{
  "lemma": "vorto",
  "pos": null,
  "language": "io",
  "provenance": [{"source": "io_wiktionary"}],
  "senses": [{
    "translations": [{
      "lang": "eo",
      "term": "vorto",
      "sources": ["io_wiktionary"]
    }]
  }],
  "morphology": {"paradigm": "o__n"}
}
```

#### Entry 2: From French Wiktionary (Pivot)
```json
{
  "lemma": "vorto",
  "pos": "adjective",
  "language": "io",
  "provenance": [{"source": "fr_wiktionary_meaning"}],
  "senses": [{
    "translations": [{
      "lang": "eo",
      "term": "vorto",
      "sources": ["fr_wiktionary_meaning"]
    }]
  }]
}
```

#### Entry 3: From Esperanto Wiktionary
```json
{
  "lemma": "vorto",
  "pos": "noun",
  "language": "io",
  "provenance": [{"source": "eo_wiktionary"}],
  "senses": [{
    "translations": [{
      "lang": "eo",
      "term": "vorto",
      "sources": ["eo_wiktionary"]
    }]
  }],
  "morphology": {"paradigm": "o__n"}
}
```

---

## All Data Sources

### Source Statistics (10,537 total translations)

| Source | Count | Percentage | Description |
|--------|-------|------------|-------------|
| **io_wiktionary** | 9,338 | 88.6% | Direct Ido→Esperanto from Ido Wiktionary |
| **fr_wiktionary_meaning** | 1,010 | 9.6% | Pivot via French Wiktionary |
| **eo_wiktionary** | 189 | 1.8% | Esperanto→Ido from Esperanto Wiktionary |
| **TOTAL** | **10,537** | **100%** | All translation pairs |

### Dictionary Coverage

- **Unique Ido words:** 9,601
- **Total BIG BIDIX entries:** 10,457 (some words have multiple entries)
- **After merging:** 9,601 (one entry per word with aggregated sources)

---

## Merging Process

### Step 1: BIG BIDIX Contains Multiple Entries
```
BIG BIDIX (10,457 entries)
├── vorto (from io_wiktionary) → vorto
├── vorto (from fr_wiktionary_meaning) → vorto
├── vorto (from eo_wiktionary) → vorto
├── hundo (from io_wiktionary) → hundo
├── kato (from io_wiktionary) → kato
└── ...
```

### Step 2: Group by Lemma
```
Grouped by word:
├── vorto: [entry1, entry2, entry3]
├── hundo: [entry1]
├── kato: [entry1]
└── ...
```

### Step 3: Merge Each Group
For each word, combine:
1. **Esperanto translations** (deduplicate)
2. **Sources** (collect all unique sources)
3. **Morphology** (collect unique paradigms)

```python
# Pseudocode
for lemma, entries in grouped_entries:
    merged_entry = {
        'esperanto_words': unique(all translations from all entries),
        'sources': unique(all sources from all entries),
        'morfologio': unique(all paradigms from all entries)
    }
```

### Step 4: Result - Vortaro Dictionary
```
Vortaro (9,601 entries)
├── vorto: {eo: ["vorto"], sources: [io, fr, eo], morph: [o__n]}
├── hundo: {eo: ["hundo"], sources: [io], morph: [o__n]}
└── ...
```

---

## How Sources Work Together

### Example Flow for "vorto"

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Ido Wiktionary Page for "vorto"                          │
│    Direct translation: vorto → vorto                        │
│    Source: io_wiktionary                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. French Wiktionary (Pivot)                                │
│    Ido "vorto" → French "mot" → Esperanto "vorto"           │
│    Source: fr_wiktionary_meaning                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Esperanto Wiktionary Page                                │
│    Reverse lookup: Esperanto "vorto" → Ido "vorto"          │
│    Source: eo_wiktionary                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ MERGED RESULT in Vortaro                                    │
│ vorto → vorto                                               │
│ Confirmed by 3 independent sources ✓✓✓                      │
│ Badges shown: 📕 IO | 🇫🇷 FR | 📗 EO                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Multiple Sources Matter

### Confidence Through Redundancy
When a translation appears in multiple sources, we have higher confidence:
- **3 sources** (like "vorto"): Very high confidence
- **2 sources**: High confidence  
- **1 source**: Still valid, but less confirmed

### Coverage Through Diversity
Different sources provide different coverage:
- **Ido Wiktionary**: Best for common words and direct translations
- **French pivot**: Fills gaps, especially for technical/modern terms
- **Esperanto Wiktionary**: Provides reverse validation

### Source Priority (Implicit)
While all sources are equal in display, the extraction pipeline may have implicit priorities:
1. Direct Wiktionary translations (io_wiktionary, eo_wiktionary)
2. Pivot translations (fr_wiktionary_meaning)
3. Wikipedia links (for proper nouns)

---

## UI Display

When you search for "vorto" in the vortaro app, you see:

```
┌──────────────────────────────────────────┐
│ vorto                                    │
│ → vorto                                  │
│ 📕 IO  🇫🇷 FR  📗 EO                      │
│ Morphology: o__n                         │
└──────────────────────────────────────────┘
```

The badges tell you this translation is confirmed by all three major sources!

---

## Summary

- **BIG BIDIX** has 10,457 entries (some words repeated across sources)
- **Vortaro** merges these into 9,601 unique words
- **Each word** can have multiple sources tracked
- **UI shows badges** so users see data provenance
- **"vorto" example**: Found in all 3 sources, giving high confidence

