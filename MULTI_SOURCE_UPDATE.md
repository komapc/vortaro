# Multi-Source Provenance Display - Implementation Plan

## Overview

Update vortaro to display multi-source provenance and confidence scores for dictionary entries using the new unified JSON format.

## New Data Format

The updated `vortaro_dictionary.json` includes:

```json
{
  "lemma": "kavalo",
  "translations": [
    {
      "term": "ĉevalo",
      "lang": "eo",
      "confidence": 1.0,
      "sources": ["io_wiktionary", "en_pivot"]
    }
  ],
  "source_details": {
    "primary_source": "io_wiktionary",
    "all_sources": ["io_wiktionary", "en_pivot"]
  }
}
```

## Implementation Steps

### 1. Update Data File

Copy new vortaro export:
```bash
cp ../data/generated/vortaro_dictionary.json dictionary.json
```

**Size:** 12,650 entries (vs current ~8,500)

### 2. Code Changes Needed

#### A. Data Loading (if needed)

If data loader expects old format, update to handle:
- `entry.source_details.all_sources` array
- `translation.sources` array (instead of single `source`)
- `translation.confidence` scores

#### B. UI Display

Add source badges and confidence indicators:

```html
<div class="entry">
  <div class="lemma">kavalo</div>
  <div class="translations">
    <span class="translation">ĉevalo</span>
    <span class="confidence" title="Confidence: 100%">★★★★★</span>
    <div class="sources">
      <span class="source-badge">io_wiktionary</span>
      <span class="source-badge">en_pivot</span>
    </div>
  </div>
</div>
```

#### C. CSS Styling

```css
.source-badge {
  display: inline-block;
  padding: 2px 6px;
  margin: 2px;
  background: #e3f2fd;
  border-radius: 3px;
  font-size: 0.75em;
  color: #1976d2;
}

.confidence {
  color: #ffa000;
  cursor: help;
}
```

### 3. Testing

- Load new dictionary file
- Verify multi-source entries display correctly
- Check confidence indicators work
- Test with entries from different sources

## Benefits

- **Transparency:** Users see data sources
- **Trust:** Confidence scores indicate reliability
- **Educational:** Shows linguistic data provenance
- **Quality:** Identifies high-confidence vs experimental translations

## Next Steps

1. Copy new data file
2. Implement UI changes (if not already supported)
3. Test thoroughly
4. Commit and create PR

