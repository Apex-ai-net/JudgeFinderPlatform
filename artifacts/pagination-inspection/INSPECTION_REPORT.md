# Pagination Inspection Report

**URL:** https://judgefinder.io/judges
**Timestamp:** 2025-10-15T23:45:45.585Z
**Success Rate:** 0/5 (0.0%)

---

## Executive Summary

⚠️ **ISSUES DETECTED**

0 error(s) found. 5 pagination test(s) failed.

---

## DOM Inspection Results

| Element              | Status | Details         |
| -------------------- | ------ | --------------- |
| Pagination Container | ❌     | Found: false    |
| Next Button          | ❌     | Disabled: false |
| Previous Button      | ❌     | Disabled: false |
| Page Number Buttons  | ❌     | Count: 0        |
| Current Page         | ❌     | Page null       |
| Event Listeners      | ❌     | Attached: false |

---

## Pagination Test Results

### Test 1: Next Button (1→2)

- **Status:** ❌ FAILED
- **Expected Page:** 2
- **Actual Page:** null
- **API Call Made:** No
- **Duration:** 7ms

**Errors:**

- Next button not found

### Test 2: Jump to Page 4 (2→4)

- **Status:** ❌ FAILED
- **Expected Page:** 4
- **Actual Page:** null
- **API Call Made:** No
- **Duration:** 6ms

**Errors:**

- Page 4 button not found

### Test 3: Previous Button (4→3)

- **Status:** ❌ FAILED
- **Expected Page:** 3
- **Actual Page:** null
- **API Call Made:** No
- **Duration:** 6ms

**Errors:**

- Previous button not found

### Test 4: Return to Page 1 (3→1)

- **Status:** ❌ FAILED
- **Expected Page:** 1
- **Actual Page:** null
- **API Call Made:** No
- **Duration:** 2ms

**Errors:**

- Page 1 button not found

### Test 5: Direct URL Navigation (?page=5)

- **Status:** ❌ FAILED
- **Expected Page:** 5
- **Actual Page:** 1
- **API Call Made:** Yes
- **Duration:** 11997ms

**API Call:** `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`

**Errors:**

- Expected page 5, got page 1 (URL: 5)

---

## Network Activity

### API Calls

1. **GET 200** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
   - Judges: 24
   - Page: 1
   - Total: 1903
2. **GET 0** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`
3. **GET 0** - `https://judgefinder.io/api/judges/list?page=1&limit=24&include_decisions=true&jurisdiction=CA`

---

## Screenshots

- **initial:** `screenshot-initial-1760571951533.png`
- **page-2:** `screenshot-page-2-1760571951640.png`
- **page-4:** `screenshot-page-4-1760571951719.png`
- **page-3:** `screenshot-page-3-1760571951794.png`
- **page-1-return:** `screenshot-page-1-return-1760571951867.png`
- **page-5-direct:** `screenshot-page-5-direct-1760571963936.png`

---

## Recommendations

### Pagination Test Failures

5 pagination test(s) failed.

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

**Generated:** 2025-10-15T23:46:04.368Z
**Tool:** Puppeteer Pagination Inspector
