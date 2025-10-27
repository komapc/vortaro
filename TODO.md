# TODO - Vortaro (Dictionary Viewer)

**Last Updated:** October 27, 2025

## 🎯 Current Status

Vortaro is a client-side dictionary for Ido-Esperanto lookups. 


---

## 🐛 Critical Errors & Issues

### **URGENT - Broken Functionality:**
- [x] **Investigate "flech/flecho" search issue** - FIXED
  - Word "flecho" doesn't exist in dictionary (not a search bug)
  - Dictionary contains actual sources: io_wiktionary, eo_wiktionary, fr_wiktionary, fr_wiktionary_meaning, io_wikipedia, whitelist
  - Issue was missing data, not search functionality

- [x] **Filters don't work with random word feature** - FIXED
  - Implemented random word functionality
  - Random button now shows a random dictionary entry
  - Respects active source filters
  - Shows "(hazarda)" indicator in search info

- [x] **Missing filter sources** - FIXED
  - Added missing sources: `fr_wiktionary` (🇫🇷 French Wiktionary) and `whitelist` (✅ Whitelist)
  - All 6 dictionary sources now available in filters
  - Pivot translations (fr_wiktionary_meaning) already included

### **Visual Bugs:**
- [x] **Search highlight spacing issue** - FIXED
  - Reduced horizontal padding from 4px to 1px
  - Reduced border-radius from 3px to 2px
  - Highlights now appear tighter and more natural

### **Fixed Issues:**
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





### Lower Priority:
- [ ] **Versioning**
  - Display version number on the site
  - Auto-increment version on every build
  - Show version in footer or about section
  - Track build/release history

- [ ] **Collaboration**
  - Report errors/corrections
  - Suggest new translations
  - Community contributions
  - Link to GitHub issues

---
