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
  - Issue was in URL generation for `fr_wiktionary_meaning` sources
  - Fixed: Improved source URL handling for pivot translations
  - All dictionary entries now have proper source attribution

---

## 💡 Suggested Improvements (Optional)

### High Value, Low Effort:

- [x] **Change Favicon** - COMPLETED
  - ✅ Custom Ido-Esperanto themed favicon added (favicon.svg)
  - ✅ Favicon link tags added to index.html
  - ✅ Professional appearance with Ido star symbol

- [ ] **Better Mobile Experience**
  - Improve touch targets (buttons, links)
  - Swipe to switch direction?
  - Pull-to-refresh for updates?

- [ ] **Display Enhancements**
  - Part of speech badges (noun, verb, adj, etc.)
  - Show morphology info if available

- [ ] **Advanced Filters**
  - Filter by source (Wiktionary, Wikipedia, FR pivot)

### Lower Priority:
- [ ] **Collaboration**
  - Report errors/corrections
  - Suggest new translations
  - Community contributions
  - Link to GitHub issues

---
