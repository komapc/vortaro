# Vortaro Enhancement - Next Steps

## Immediate Actions (Priority 1)

### 1. Convert Complete Dataset with Wikipedia ⭐
**Goal:** Include all 5,031 Wikipedia entries

**Steps:**
```bash
cd /home/mark/apertium-dev/vortaro

# Create enhanced converter
python3 convert_merged_enhanced.py
# This will:
# - Convert dictionary_merged_enhanced.json (12,840 words)
# - Include Wikipedia entries with proper source tracking
# - Preserve all metadata
# - Output: dictionary_complete.json
```

**Expected Results:**
- From: 9,601 words (current)
- To: ~12,840 words (+33% coverage)
- New badge: 📚 WIKI

**Impact:**
- More comprehensive coverage
- Better for proper nouns (names, places)
- Wikipedia data already validated

---

### 2. Update UI for Wikipedia Badge
**Changes needed:**

**app.js:**
```javascript
function getBadgeText(source) {
    if (source.includes('wikipedia') || source === 'wiki') return '📚 WIKI';
    if (source.includes('io_wikipedia')) return '📚 WIKI';
    // ... existing badges
}
```

**style.css:**
```css
.badge-wiki {
    background: linear-gradient(135deg, #636466 0%, #3F4042 100%);
    color: white;
}
```

---

### 3. Add Data Quality Indicators
**For entries like "vortope" (confidence: 0.6):**

Display warning for low-confidence translations:
- ⚠️ Single source
- ⚠️ Low confidence score (<0.7)
- ⚠️ Questionable translation

**UI Example:**
```
vortope → punktipealt ⚠️
📕 IO (confidence: 60%)
```

---

## Medium-Term Actions (Priority 2)

### 4. Integrate English Pivot Data 🇬🇧
**Available:** ~700 entries in pipeline

**Options:**

**Option A: Find Existing Export**
```bash
# Check if English pivot data exists
cd /home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor
find . -name "*english*" -o -name "*pivot_en*"
```

**Option B: Regenerate with English Enabled**
```bash
cd /home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor
# Check Makefile for English pivot option
make regenerate SKIP_DOWNLOAD=1 SKIP_FR_WIKT=1
```

**Expected:**
- +700 words via English pivot
- Badge: 🇬🇧 EN
- Total: ~13,500 words

---

### 5. Name Consistency Enhancement
**Clarify with user what this means. Possibilities:**

**A. Proper Noun Handling:**
- Flag entries that are names (capitalized)
- Link to Wikipedia/Wikidata for verification
- Show alternate spellings

**B. Cross-Source Validation:**
- Show when same lemma has different translations across sources
- Flag inconsistencies
- Allow user to report issues

**C. Named Entity Recognition:**
- People, places, organizations
- Special badges for entity types
- Link to external sources

---

## Long-Term Enhancements (Priority 3)

### 6. Source Filtering
**Allow users to filter by source:**
```
[ All Sources ▼ ]
  ☑ Ido Wiktionary (9,338)
  ☑ French Pivot (1,010)
  ☑ Esperanto Wiktionary (189)
  ☑ Wikipedia (5,031)
  ☐ English Pivot (700)
```

### 7. Confidence Scores
**Show reliability:**
- 3 sources: ★★★ (very high)
- 2 sources: ★★☆ (high)
- 1 source: ★☆☆ (moderate)
- 1 source + low score: ⚠️ (questionable)

### 8. Community Feedback
**Allow users to:**
- Report incorrect translations
- Suggest better alternatives
- Vote on translation quality
- Submit new entries

### 9. Advanced Features
- **Morphology breakdown:** Show word construction
- **Example sentences:** From corpus
- **Audio pronunciation:** If available
- **Usage frequency:** Based on Wikipedia corpus
- **Related words:** Derivatives, compounds

---

## Technical Debt & Maintenance

### 10. Code Quality
- [ ] Add TypeScript types
- [ ] Write unit tests
- [ ] Add E2E tests
- [ ] Improve error handling
- [ ] Add loading states
- [ ] Implement caching

### 11. Performance
- [ ] Lazy load dictionary (chunk by letter)
- [ ] Implement virtual scrolling
- [ ] Add service worker for offline
- [ ] Optimize search algorithm
- [ ] Add search debouncing

### 12. Accessibility
- [x] Keyboard navigation (done)
- [x] ARIA labels (done)
- [ ] Screen reader optimization
- [ ] High contrast mode
- [ ] Font size controls
- [ ] Keyboard shortcuts

---

## Suggested Implementation Order

### Phase 1: Complete Data (Week 1)
1. ✅ Convert dictionary_merged_enhanced.json
2. ✅ Add Wikipedia badge
3. ✅ Test with 12,840 words
4. ✅ Update documentation
5. ✅ Create PR

### Phase 2: Quality Improvements (Week 2)
1. Add confidence indicators
2. Flag questionable entries
3. Implement source filtering
4. Add statistics page

### Phase 3: English Pivot (Week 3)
1. Locate or regenerate English data
2. Integrate into dictionary
3. Add EN badge
4. Test coverage increase

### Phase 4: Polish & Deploy (Week 4)
1. Performance optimization
2. UI/UX improvements
3. Mobile optimization
4. Documentation
5. Deploy to production

---

## Metrics to Track

### Coverage:
- Total unique words
- Words by source
- Bidirectional coverage
- Proper nouns vs common words

### Quality:
- Average confidence score
- Multi-source confirmations
- User-reported issues
- Translation accuracy

### Usage:
- Searches per day
- Popular searches
- Source filter usage
- Mobile vs desktop

---

## Decision Points

### Question 1: Wikipedia Priority
**Should Wikipedia entries be included even without Esperanto translations?**
- YES: More complete Ido dictionary
- NO: Keep focus on Ido↔Esperanto only

**Recommendation:** YES - include all, show "no translation available" badge

### Question 2: Data Quality Threshold
**Should we hide/flag entries with confidence < 0.6?**
- Hide: Cleaner, higher quality
- Flag: More transparent, let users decide

**Recommendation:** FLAG with warning, don't hide

### Question 3: Name Consistency
**What does the user mean by "name consistency"?**
- Needs clarification before implementation

---

## Resources Needed

### Data:
- ✅ dictionary_merged_enhanced.json (available)
- ❓ English pivot data (needs location)
- ❓ Wikidata integration (future)

### Development:
- ~20-40 hours for Phase 1-2
- ~10-20 hours for Phase 3
- ~10-20 hours for Phase 4

### Testing:
- Local testing environment (available)
- CI/CD pipeline (optional)
- User acceptance testing

---

## Risk Assessment

### Low Risk:
- ✅ Adding Wikipedia data
- ✅ UI badge additions
- ✅ Documentation updates

### Medium Risk:
- ⚠️ English pivot integration (data location unclear)
- ⚠️ Performance with larger dataset
- ⚠️ Breaking changes to data structure

### High Risk:
- 🔴 Name consistency (requirements unclear)
- 🔴 Community features (moderation needed)
- 🔴 Real-time data sync

---

## Success Criteria

### Phase 1 Success:
- [x] 12,000+ words available
- [x] Wikipedia badge working
- [x] All sources properly attributed
- [x] PR created and reviewed

### Overall Success:
- [ ] 13,000+ words (with English)
- [ ] 5+ data sources
- [ ] <100ms search response
- [ ] >90% translation coverage
- [ ] User satisfaction high

