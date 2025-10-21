# Repository Responsibilities: Extractor vs Vortaro

## 1. Ido Wiktionary vs Esperanto Wiktionary

### Ido Wiktionary (io.wiktionary.org)
**Primary Source - 9,338 translations**

```
Structure:
┌──────────────────────────────────────┐
│ Ido Wiktionary Page: "vorto"        │
├──────────────────────────────────────┤
│ Ido: vorto                           │
│ Esperanto: vorto                     │
│ French: mot                          │
│ English: word                        │
└──────────────────────────────────────┘
```

**Direction:** Ido → Esperanto (and other languages)
- Ido words as headwords
- Esperanto in translation section
- Most comprehensive for Ido→Eo

### Esperanto Wiktionary (eo.wiktionary.org)  
**Reverse Validation Source - 189 translations**

```
Structure:
┌──────────────────────────────────────┐
│ Esperanto Wiktionary Page: "vorto"  │
├──────────────────────────────────────┤
│ Esperanto: vorto                     │
│ Ido: vorto                           │
│ French: mot                          │
│ English: word                        │
└──────────────────────────────────────┘
```

**Direction:** Esperanto → Ido (reverse lookup)
- Esperanto words as headwords
- Ido in translation section
- Smaller but validates Ido Wiktionary data

### How They Work Together

```
Example: "vorto"

Ido Wiktionary:
  vorto (Ido) → vorto (Eo) ✓

Esperanto Wiktionary:
  vorto (Eo) → vorto (Io) ✓

Result: CONFIRMED by both sources (high confidence)
```

**Why Both Matter:**
- **Ido Wiktionary:** Main source, Ido→Eo direction
- **Esperanto Wiktionary:** Validation, Eo→Io direction
- **When they agree:** High confidence (like "vorto")
- **When they differ:** Need review
- **Bidirectional entries:** 23 words confirmed both ways

---

## 2. Repository Responsibilities

### ✅ EXTRACTOR Repository (ido-esperanto-extractor)
**Location:** `/home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor`

#### Responsibilities:
```
┌─────────────────────────────────────────────────────┐
│                    EXTRACTOR REPO                    │
│                 (Data Generation)                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Download Wiktionary dumps                        │
│     - iowiktionary-latest-pages-articles.xml.bz2    │
│     - eowiktionary-latest-pages-articles.xml.bz2    │
│     - frwiktionary (for pivot)                      │
│                                                      │
│  2. Parse XML dumps                                  │
│     - Extract Ido→Esperanto translations            │
│     - Extract Esperanto→Ido translations            │
│     - Parse French for pivot logic                  │
│                                                      │
│  3. Process Wikipedia/Wikidata                       │
│     - Download Wikipedia dumps                       │
│     - Extract language links                         │
│     - Integrate proper nouns                         │
│                                                      │
│  4. Run pivot translation logic                      │
│     - Ido→French→Esperanto                          │
│     - Ido→English→Esperanto                         │
│                                                      │
│  5. Merge all sources                                │
│     - Combine Wiktionary data                        │
│     - Add Wikipedia entries                          │
│     - Track provenance (sources)                     │
│     - Calculate confidence scores                    │
│                                                      │
│  6. Export to multiple formats                       │
│     - dictionary_merged_enhanced.json (complete)     │
│     - bidix_big.json (filtered)                     │
│     - apertium .dix files (XML)                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Key Files Generated:
```
dist/
├── dictionary_merged_enhanced.json  (12,840 words, WITH Wikipedia)
├── bidix_big.json                   (10,457 entries, NO Wikipedia)
├── ido_dictionary.json              (10,406 entries)
└── apertium-ido-epo.ido-epo.dix    (XML format)
```

#### To Add New Sources (Wikipedia, English pivot):
**Changes ONLY in EXTRACTOR:**
```bash
# In extractor repo
make regenerate SKIP_DOWNLOAD=1

# This will:
# 1. Re-parse all dumps
# 2. Include Wikipedia if enabled
# 3. Include English pivot if enabled
# 4. Regenerate all JSON files
# 5. Export new dictionary_merged_enhanced.json
```

**No changes needed in vortaro for data generation!**

---

### ✅ VORTARO Repository
**Location:** `/home/mark/apertium-dev/vortaro`

#### Responsibilities:
```
┌─────────────────────────────────────────────────────┐
│                    VORTARO REPO                      │
│                  (Data Consumer)                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Load JSON file from extractor                    │
│     - Currently: dictionary_big.json                 │
│     - Should use: dictionary_merged_enhanced.json    │
│                                                      │
│  2. Convert to vortaro format                        │
│     - Group by lemma                                 │
│     - Aggregate translations                         │
│     - Track sources                                  │
│                                                      │
│  3. Display in UI                                    │
│     - Search functionality                           │
│     - Direction switching (Io↔Eo)                   │
│     - Show source badges                             │
│     - About modal with stats                         │
│                                                      │
│  4. User experience                                  │
│     - Keyboard navigation                            │
│     - Accessibility (ARIA)                           │
│     - Responsive design                              │
│     - Source attribution                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Key Files:
```
vortaro/
├── dictionary_big.json         (converted from extractor)
├── app.js                       (UI logic, badges)
├── index.html                   (UI structure)
├── style.css                    (styling, badges)
└── README.md                    (documentation)
```

#### To Add New Source Badges:
**Changes ONLY in VORTARO:**
```javascript
// app.js - Add badge mapping
function getBadgeText(source) {
    if (source.includes('wikipedia')) return '📚 WIKI';
    if (source.includes('pivot_en')) return '🇬🇧 EN';
    // ...
}
```

```css
/* style.css - Add badge styling */
.badge-wiki { background: ...; }
.badge-en { background: ...; }
```

**The data itself comes from extractor!**

---

## Complete Flow: Adding Wikipedia

### ❌ WRONG Approach:
```
"Add Wikipedia data in vortaro repo"
↓
Try to parse Wikipedia in JavaScript
↓
FAIL - wrong place, wrong tool
```

### ✅ CORRECT Approach:

```
Step 1: EXTRACTOR REPO
├─ Wikipedia data already extracted ✅
├─ Already in dictionary_merged_enhanced.json ✅
└─ Just need to use this file!

Step 2: VORTARO REPO (converter)
├─ Copy dictionary_merged_enhanced.json
├─ Update converter to handle "words" array
└─ Extract Wikipedia source info

Step 3: VORTARO REPO (UI)
├─ Add Wikipedia badge (📚 WIKI)
├─ Update badge styling
└─ Update About modal stats
```

---

## What Changes Where?

### For Wikipedia Integration:

**EXTRACTOR (Already Done!):**
- ✅ Wikipedia parsing implemented
- ✅ Data in dictionary_merged_enhanced.json
- ✅ Metadata includes wikipedia_integration
- ❌ NO CHANGES NEEDED

**VORTARO (Need to do):**
- ❌ Use different source file
- ❌ Update converter script
- ❌ Add Wikipedia badge
- ❌ Update UI

### For English Pivot Integration:

**EXTRACTOR (Need to do):**
- ❌ Regenerate with English enabled
- ❌ Run pivot logic for English
- ❌ Export to dictionary_merged_enhanced.json
- **Estimated:** 1-2 hours regeneration

**VORTARO (Need to do):**
- ❌ Add English badge mapping
- ❌ Update styles
- **Estimated:** 15 minutes

---

## Division of Labor

```
EXTRACTOR: "Data Chef" 👨‍🍳
├─ Gathers ingredients (dumps)
├─ Processes (parses, merges)
├─ Cooks (pivot logic)
└─ Serves (exports JSON)

VORTARO: "Restaurant" 🍽️
├─ Receives dishes (JSON files)
├─ Presents beautifully (UI)
├─ Takes orders (search)
└─ Serves customers (users)
```

**Key Principle:**
- EXTRACTOR = Data generation & heavy processing
- VORTARO = Data presentation & user interaction

**Adding new data sources:**
- Heavy work: EXTRACTOR
- Light work: VORTARO (just UI updates)

---

## Practical Example

### User Request: "Add Wikidata support"

**EXTRACTOR Changes (Complex - Days of work):**
```python
# New file: scripts/parse_wikidata.py
# - Query Wikidata API
# - Extract Ido/Esperanto labels
# - Map to existing entries
# - Calculate confidence
# - Merge with other sources
# - Export to JSON
```

**VORTARO Changes (Simple - Minutes of work):**
```javascript
// app.js
function getBadgeText(source) {
    if (source === 'wikidata') return '🌐 DATA';
    // ...
}

// style.css
.badge-wikidata {
    background: linear-gradient(...);
}
```

**Ratio:** 95% extractor work, 5% vortaro work

---

## Current Situation Summary

### What We Have:
```
EXTRACTOR:
├─ ✅ Ido Wiktionary data (9,338)
├─ ✅ French pivot data (1,010)
├─ ✅ Esperanto Wiktionary data (189)
├─ ✅ Wikipedia data (5,031) - IN FILE BUT NOT USED
└─ ❓ English pivot data (in pipeline, needs regeneration)

VORTARO:
├─ ✅ Using bidix_big.json (missing Wikipedia)
├─ ❌ Should use dictionary_merged_enhanced.json
├─ ✅ Has badges for IO, FR, EO
└─ ❌ Missing badge for WIKI
```

### What We Need to Do:

**EXTRACTOR: 0 changes for Wikipedia** (already done!)
**EXTRACTOR: 1 regeneration for English** (make regenerate)

**VORTARO: 3 small changes**
1. Use dictionary_merged_enhanced.json
2. Add Wikipedia badge
3. Update converter

---

## Summary

### Your Question: "Changes will be mostly in extractor repo?"

**Answer: It depends!**

**For Wikipedia:** 
- ✅ NO extractor changes (already done)
- ❌ Only vortaro changes (use different file + badge)

**For English Pivot:**
- ✅ YES, mostly extractor (regenerate data)
- ❌ Minor vortaro changes (badge only)

**For Future Sources (Wikidata, etc):**
- ✅ YES, MOSTLY extractor (95% of work)
- ❌ Minor vortaro changes (5% - just badges)

**General Rule:**
- **New data source** = extractor work
- **Display existing source** = vortaro work
- **Better data from existing source** = extractor work
- **Better UI for existing data** = vortaro work

