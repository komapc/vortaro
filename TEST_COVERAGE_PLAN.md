# Test Coverage Analysis & Improvement Plan

## Current Test Status

**✅ All Tests Passing:** 32 tests across 4 test suites

**Test Suites:**
1. ✅ `test/url-hash.test.js` - URL hash parsing and navigation
2. ✅ `test/ui.test.js` - UI interactions and mobile features
3. ✅ `test/search.test.js` - Search functionality
4. ✅ `test/filters.test.js` - Filter functionality

**Coverage Status:**
- **Current:** 0% code coverage (tests are isolated unit tests, not testing actual app.js functions)
- **Issue:** Tests use mock implementations instead of testing real app.js code
- **Root Cause:** `app.js` is not modular - functions are not exported for testing

---

## Problem Analysis

### **Why Coverage is 0%**

The current test files test **logic patterns** but not the **actual app.js code**:

```javascript
// Current approach in tests:
const applyFilters = (results, activeFilters) => {
    // Mock implementation defined in test file
};

// What we need:
import { applyFilters } from '../app.js';
// Test the real function
```

**Root Issue:** `app.js` is a monolithic script with no exports. All functions are:
- Defined in global scope
- Not exported as modules
- Not importable in tests
- Only testable via DOM manipulation

---

## Solution Approaches

### **Approach A: Refactor to ES Modules (Recommended)**

**Goal:** Make app.js modular and testable

**Changes Required:**

1. **Convert `app.js` to ES module:**
   ```javascript
   // Export functions for testing
   export function search(query) { ... }
   export function applyFilters(results) { ... }
   export function toggleDirection() { ... }
   // etc.
   ```

2. **Update `index.html`:**
   ```html
   <script type="module" src="app.js"></script>
   ```

3. **Update tests to import real functions:**
   ```javascript
   import { search, applyFilters } from '../app.js';
   ```

4. **Configure Jest for ES modules:**
   ```json
   // package.json
   "jest": {
     "transform": {
       "^.+\\.js$": "babel-jest"
     }
   }
   ```

**Pros:**
- ✅ Tests real code, not mocks
- ✅ Accurate coverage metrics
- ✅ Modern JavaScript practices
- ✅ Better code organization
- ✅ Easier to maintain

**Cons:**
- ❌ Requires significant refactoring
- ❌ Need to add Babel for Jest
- ❌ May break existing functionality if not careful
- ❌ 2-4 hours of work

---

### **Approach B: Integration Tests via JSDOM (Current + Enhanced)**

**Goal:** Test app.js as-is through DOM manipulation

**Changes Required:**

1. **Load actual `app.js` in tests:**
   ```javascript
   // In test setup
   const fs = require('fs');
   const appCode = fs.readFileSync('./app.js