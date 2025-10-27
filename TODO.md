# TODO - Vortaro (Dictionary Viewer)

**Last Updated:** October 23, 2025

## 🎯 Current Status

Vortaro is a client-side dictionary for Ido-Esperanto lookups. 


---

## 🐛 Data Quality & Issues

### Immediate:
- [x] **Source Attribution Missing** - FIXED
  - ~~Test words like "apartenas" - no source is indicated~~
  - ~~Investigate why some entries lack source metadata~~
  - Issue was in URL generation for pivot translation sources
  - Fixed: Added search links for pivot translations (fr_wiktionary_meaning, en_wiktionary_meaning)
  - All dictionary entries now have proper source attribution with clickable links
  - Pivot translations now show 🔍 icon and link to search pages

---

## 💡 Suggested Improvements (Optional)

### High Value, Low Effort:

- [x] **Change Favicon** - COMPLETED
  - ✅ Custom Ido-Esperanto themed favicon added (favicon.svg + favicon.png)
  - ✅ Favicon link tags added to index.html with proper browser compatibility
  - ✅ Professional appearance with Ido star symbol
  - ✅ PNG format added for better browser compatibility (32x32px)
  - ✅ SVG format maintained as fallback for modern browsers



- [ ] **Advanced Filters**
  - Filter by source (Wiktionary, Wikipedia, FR pivot)

### Lower Priority:
- [ ] **Collaboration**
  - Report errors/corrections
  - Suggest new translations
  - Community contributions
  - Link to GitHub issues

---
