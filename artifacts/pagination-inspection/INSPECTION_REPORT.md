# Pagination Inspection Report

**URL:** https://judgefinder.io/judges
**Timestamp:** 2025-10-15T04:41:20.299Z
**Success Rate:** 1/5 (20.0%)

---

## Executive Summary

⚠️ **ISSUES DETECTED**

0 error(s) found. 4 pagination test(s) failed.

---

## DOM Inspection Results

| Element              | Status | Details         |
| -------------------- | ------ | --------------- |
| Pagination Container | ✅     | Found: true     |
| Next Button          | ✅     | Disabled: false |
| Previous Button      | ✅     | Disabled: true  |
| Page Number Buttons  | ✅     | Count: 5        |
| Current Page         | ✅     | Page 1          |
| Event Listeners      | ✅     | Attached: true  |

---

## Pagination Test Results

### Test 1: Next Button (1→2)

- **Status:** ❌ FAILED
- **Expected Page:** 2
- **Actual Page:** 1
- **API Call Made:** Yes
- **Duration:** 2088ms

**API Call:** `https://judgefinder.io/api/judges/list?page=2&limit=24&include_decisions=true&jurisdiction=CA`

**Errors:**

- Expected page 2, got page 1 (URL: 2)

### Test 2: Jump to Page 4 (2→4)

- **Status:** ❌ FAILED
- **Expected Page:** 4
- **Actual Page:** 1
- **API Call Made:** Yes
- **Duration:** 2057ms

**API Call:** `https://judgefinder.io/api/judges/list?page=4&limit=24&include_decisions=true&jurisdiction=CA`

**Errors:**

- Expected page 4, got page 1 (URL: 4)

### Test 3: Previous Button (4→3)

- **Status:** ❌ FAILED
- **Expected Page:** 3
- **Actual Page:** 1
- **API Call Made:** No
- **Duration:** 2018ms

**Errors:**

- Expected page 3, got page 1 (URL: 4)

### Test 4: Return to Page 1 (3→1)

- **Status:** ✅ PASSED
- **Expected Page:** 1
- **Actual Page:** 1
- **API Call Made:** Yes
- **Duration:** 2045ms

**API Call:** `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`

### Test 5: Direct URL Navigation (?page=5)

- **Status:** ❌ FAILED
- **Expected Page:** 5
- **Actual Page:** 1
- **API Call Made:** Yes
- **Duration:** 3747ms

**API Call:** `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`

**Errors:**

- Expected page 5, got page 1 (URL: 5)

---

## Network Activity

### API Calls

1. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
2. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
3. **GET 200** - `https://judgefinder.io/api/judges/list?page=2&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
4. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
5. **GET 200** - `https://judgefinder.io/api/judges/list?page=4&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
6. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
7. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
8. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
9. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903

---

## Screenshots

- **initial:** `screenshot-initial-1760503286682.png`
- **page-2:** `screenshot-page-2-1760503288988.png`
- **page-4:** `screenshot-page-4-1760503291226.png`
- **page-3:** `screenshot-page-3-1760503293419.png`
- **page-1-return:** `screenshot-page-1-return-1760503295647.png`
- **page-5-direct:** `screenshot-page-5-direct-1760503299566.png`

---

## Recommendations

### Pagination Test Failures

4 pagination test(s) failed.

**Possible Causes:**

- Race condition in state updates
- Event handlers not properly attached
- API calls not triggered
- URL synchronization issue

**Fix:**

1. Check `JudgesView.tsx` for duplicate `setPage()` calls
2. Verify `handlePageChange` in `JudgesDirectoryResultsGrid.tsx`
3. Review `judgesDirectoryStore.ts` for state management issues

---

**Generated:** 2025-10-15T04:41:39.890Z
**Tool:** Puppeteer Pagination Inspector
