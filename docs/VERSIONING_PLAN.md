# Versioning Implementation Plan

## Goal
Display version number on the Vortaro site with automatic version tracking and build history.

---

## Current State Analysis

**Existing Infrastructure:**
- ✅ `package.json` has version field (currently `1.0.0`)
- ✅ GitHub Actions workflow exists (`.github/workflows/test.yml`)
- ✅ Footer already exists in `index.html` with word count
- ✅ Deployment to GitHub Pages is automated

**What's Missing:**
- ❌ Version not displayed anywhere on the site
- ❌ No automatic version increment mechanism
- ❌ No build/release history tracking
- ❌ No version metadata in dictionary data

---

## Implementation Plan

### **Phase 1: Display Current Version (Minimal)**

**Goal:** Show version number in footer immediately

**Changes Required:**

1. **Update `index.html` footer:**
   - Add version display next to word count
   - Format: `v1.0.0 • 14,900 vorti • Datumi de...`
   - Use `<span id="versionNumber">v1.0.0</span>` for dynamic updates

2. **Update `app.js` initialization:**
   - Add version constant at top: `const VERSION = '1.0.0';`
   - Update version display on load: `document.getElementById('versionNumber').textContent = 'v' + VERSION;`
   - Alternative: Fetch version from `package.json` dynamically (requires build step)

**Pros:**
- ✅ Quick to implement (5 minutes)
- ✅ No build process changes needed
- ✅ Immediate visibility

**Cons:**
- ❌ Manual version updates required
- ❌ Version can get out of sync with package.json

---

### **Phase 2: Automatic Version from package.json (Recommended)**

**Goal:** Single source of truth for version number

**Approach A: Build-time Injection (Preferred)**

**Changes Required:**

1. **Add build script to `package.json`:**
   ```json
   "scripts": {
     "build": "node scripts/inject-version.js",
     "prebuild": "npm test",
     "deploy": "npm run build && gh-pages -d ."
   }
   ```

2. **Create `scripts/inject-version.js`:**
   ```javascript
   // Read package.json version
   // Replace placeholder in app.js or index.html
   // Write updated file
   ```

3. **Update `app.js` with placeholder:**
   ```javascript
   const VERSION = '__VERSION__'; // Replaced at build time
   ```

4. **Update GitHub Actions workflow:**
   - Run `npm run build` before deployment
   - Ensure version is injected before publishing

**Pros:**
- ✅ Single source of truth (package.json)
- ✅ Automatic version updates
- ✅ No manual sync needed
- ✅ Works with existing CI/CD

**Cons:**
- ❌ Requires build step
- ❌ Slightly more complex setup

---

**Approach B: Runtime Fetch (Alternative)**

**Changes Required:**

1. **Serve `package.json` alongside site:**
   - Add to deployment (not excluded in GitHub Actions)

2. **Update `app.js` to fetch version:**
   ```javascript
   async function loadVersion() {
     const response = await fetch('package.json');
     const pkg = await response.json();
     document.getElementById('versionNumber').textContent = 'v' + pkg.version;
   }
   ```

**Pros:**
- ✅ No build step needed
- ✅ Always in sync with package.json

**Cons:**
- ❌ Exposes package.json to public (minor security concern)
- ❌ Extra HTTP request on page load
- ❌ Fails if package.json not deployed

---

### **Phase 3: Version History & Changelog**

**Goal:** Track release history and show what's new

**Changes Required:**

1. **Create `CHANGELOG.md`:**
   - Follow [Keep a Changelog](https://keepachangelog.com/) format
   - Document all changes by version
   - Include dates and categories (Added, Changed, Fixed)

2. **Display changelog in About modal:**
   - Add "Recent Updates" section
   - Show last 3-5 versions with highlights
   - Link to full CHANGELOG.md on GitHub

3. **Update `app.js` About modal:**
   ```javascript
   <h3>📝 Recent Updates</h3>
   <div class="changelog">
     <h4>v1.0.0 - October 2025</h4>
     <ul>
       <li>✅ Initial release with 14,900+ words</li>
       <li>✅ Bidirectional search (Ido ⇄ Esperanto)</li>
       <li>✅ Mobile swipe controls</li>
     </ul>
   </div>
   ```

**Pros:**
- ✅ Users see what's new
- ✅ Transparent development
- ✅ Professional appearance

**Cons:**
- ❌ Requires manual changelog maintenance
- ❌ More content to manage

---

### **Phase 4: Automatic Version Bumping (Advanced)**

**Goal:** Auto-increment version on releases

**Approach: npm version + Git tags**

**Changes Required:**

1. **Add version bump scripts to `package.json`:**
   ```json
   "scripts": {
     "version:patch": "npm version patch -m 'chore: bump version to %s'",
     "version:minor": "npm version minor -m 'feat: bump version to %s'",
     "version:major": "npm version major -m 'BREAKING: bump version to %s'",
     "postversion": "git push && git push --tags"
   }
   ```

2. **Workflow:**
   - Developer runs `npm run version:patch` (or minor/major)
   - npm automatically:
     - Increments version in package.json
     - Creates git commit
     - Creates git tag
     - Pushes to GitHub
   - GitHub Actions triggers on tag push
   - Deploys new version

3. **Update GitHub Actions:**
   ```yaml
   on:
     push:
       tags:
         - 'v*'
   ```

**Pros:**
- ✅ Fully automated versioning
- ✅ Git tags for releases
- ✅ Semantic versioning enforced
- ✅ Professional workflow

**Cons:**
- ❌ More complex setup
- ❌ Requires discipline in version bumping

---

## Recommended Implementation Order

### **Immediate (Today):**
1. ✅ **Phase 1:** Add version display to footer (hardcoded)
   - Quick win, immediate visibility
   - 5-10 minutes of work

### **Short-term (This Week):**
2. ✅ **Phase 2 (Approach A):** Build-time version injection
   - Proper automation
   - Single source of truth
   - 30-60 minutes of work

3. ✅ **Phase 3:** Create CHANGELOG.md
   - Document current state
   - Prepare for future updates
   - 15-30 minutes of work

### **Long-term (Future):**
4. ⏳ **Phase 4:** Automatic version bumping
   - Implement when release cadence is established
   - Optional but professional

---

## File Changes Summary

### **Phase 1 (Minimal):**
- ✏️ `index.html` - Add version span to footer
- ✏️ `app.js` - Add VERSION constant and display logic

### **Phase 2 (Build-time):**
- ✏️ `package.json` - Add build scripts
- ➕ `scripts/inject-version.js` - New build script
- ✏️ `app.js` - Use version placeholder
- ✏️ `.github/workflows/test.yml` - Add build step

### **Phase 3 (Changelog):**
- ➕ `CHANGELOG.md` - New changelog file
- ✏️ `app.js` - Update About modal with changelog

### **Phase 4 (Auto-bump):**
- ✏️ `package.json` - Add version bump scripts
- ✏️ `.github/workflows/test.yml` - Add tag-based deployment

---

## Testing Plan

**After Phase 1:**
- ✅ Verify version displays in footer
- ✅ Check version matches package.json

**After Phase 2:**
- ✅ Run build script locally
- ✅ Verify version is injected correctly
- ✅ Test GitHub Actions deployment
- ✅ Verify version on live site

**After Phase 3:**
- ✅ Verify changelog displays in About modal
- ✅ Check formatting and readability
- ✅ Ensure links work

**After Phase 4:**
- ✅ Test version bump commands
- ✅ Verify git tags are created
- ✅ Check automatic deployment on tag push

---

## Risks & Mitigation

**Risk:** Build step breaks deployment
- **Mitigation:** Test locally first, add error handling, keep fallback

**Risk:** Version gets out of sync
- **Mitigation:** Use single source of truth (package.json), automate injection

**Risk:** Changelog becomes outdated
- **Mitigation:** Add to PR checklist, automate with conventional commits

---

## Success Criteria

✅ Version number visible on site footer
✅ Version automatically updates from package.json
✅ No manual version sync required
✅ Changelog available and up-to-date
✅ Professional appearance and user transparency

---

## Next Steps

**Ready to implement?** Start with Phase 1 for immediate results, then move to Phase 2 for proper automation.
