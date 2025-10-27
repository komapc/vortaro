# TODO - Vortaro (Dictionary Viewer)

**Last Updated:** October 27, 2025

## 🎯 Current Status

Vortaro is a client-side dictionary for Ido-Esperanto lookups. 


---

## 🐛 Critical Errors & Issues

### **URGENT - Broken Functionality:**
- [ ] **Investigate "flech" search issue**
  - Word "flech" may not be returning expected results
  - Check dictionary data and search logic
  - Verify if it's a data issue or search algorithm problem

- [ ] **Filters don't work with random word feature**
  - Random word button doesn't respect active filters
  - Should only show random words from filtered results
  - Currently shows any random word regardless of filter state

- [ ] **Missing filter sources**
  - Too few filter options available
  - Missing "via sources" (pivot translation sources)
  - Should include all available source types from dictionary data

### **Visual Bugs:**
- [ ] **Search highlight spacing issue**
  - Highlighted search substrings have excessive left-right margins
  - Appears to have extra space characters around highlights
  - Fix CSS padding/margin in highlight styling

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
- [ ] **Collaboration**
  - Report errors/corrections
  - Suggest new translations
  - Community contributions
  - Link to GitHub issues

---
