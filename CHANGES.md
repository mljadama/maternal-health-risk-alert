# DHIS2 App Hub Review - Changes Implemented

## Final Submission Update (April 2026)

- Added forced org-unit scope assignment in setup scripts at the end of Step 1 using JSON Patch (`organisationUnits`, `teiSearchOrganisationUnits`, `dataViewOrganisationUnits`) after per-OU assignment calls.
- Applied the same scope-assignment hardening in both setup scripts:
    - `setup-dhis2.ps1`
    - `setup-dhis2.sh`
- Updated `setup-dhis2.sh` to resolve the setup user UID dynamically by username instead of relying on a hardcoded user UID.
- Fixed non-ASCII key corruption in generated config templates so script-generated `src/config/dhis2.js` remains valid JavaScript.
- Removed empty unused placeholder files from `src/` and `.d2/shell/`.

## Overview

This document summarizes all changes made to address the DHIS2 App Hub review feedback for the Maternal Health Risk Alert application.

### Update - Full UI Migration Completed (April 2026)

The migration from MUI to DHIS2-compatible UI patterns is now complete at source level.

Key completion points:

- Removed all @mui/material and @mui/icons-material imports from src.
- Rewrote remaining page-level MUI usage in:
    - src/pages/Dashboard.jsx
    - src/pages/PatientList.jsx
    - src/pages/PatientDetail.jsx
    - src/pages/RiskAlerts.jsx
    - src/pages/RegisterPatient.jsx
    - src/pages/RecordVisit.jsx
- Rewrote remaining component-level MUI usage in:
    - src/components/patients/RegisterPatient.jsx (compat wrapper)
    - src/components/visits/RecordVisit.jsx (compat wrapper)
    - src/charts/CompletionBarChart.jsx
    - src/charts/RiskDistributionChart.jsx
- Restored and corrected common component wiring:
    - src/components/common/LoadingSpinner.jsx now contains the spinner implementation
    - src/components/common/Navigation.jsx kept as compatibility placeholder
- Fixed syntax issue in src/App.jsx (extra closing brace removed).
- Removed MUI packages from package.json dependencies.

Verification results:

- Build: pass
- Test suite: pass
- Source scan for @mui imports in src: none found

Additional note:

- npm install required legacy peer dependency handling in this environment and a missing toolchain dependency fix (acorn) to restore d2-app-scripts build/test execution.

---

## CRITICAL REQUIREMENTS - FIXED ✅

### 1. Hardcoded baseUrl (REQUIRED)

**Issue**: App contained hardcoded `baseUrl: 'http://localhost:8080'` in DataProvider config, preventing deployment on any other instance.

**Changes**:
- **File**: `src/App.jsx`
- **Change**: Removed `baseUrl: 'http://localhost:8080'` from `dhis2Config` object
- **Rationale**: DHIS2 App Platform automatically injects the correct server URL when deployed. No manual configuration needed.
- **Impact**: App now works correctly when installed on any DHIS2 instance (v2.38+)

**Before**:
```javascript
const dhis2Config = {
    baseUrl:    'http://localhost:8080',
    apiVersion: 42,
}
```

**After**:
```javascript
const dhis2Config = {
    apiVersion: 42,
}
```

---

### 2. Setup Script Compatibility (REQUIRED)

**Issue**: Setup script was PowerShell only (`setup-dhis2.ps1`), incompatible with macOS and Linux systems. This caused setup verification to fail during review testing.

**Changes**:
- **File Created**: `setup-dhis2.sh` - Bash version for macOS/Linux
- **Original File**: `setup-dhis2.ps1` - Kept for Windows users  
- **Documentation**: Updated README with instructions for both platforms

**macOS/Linux Usage**:
```bash
chmod +x setup-dhis2.sh
./setup-dhis2.sh
```

**Windows Usage**:
```powershell
.\setup-dhis2.ps1
```

---

### 3. Remove Gambia-Specific Coupling (REQUIRED)

**Issue**: App was tightly coupled to Gambian metadata with hardcoded references throughout, making it unusable for other countries/regions.

**Changes Made**:

#### 3a. Configuration File (`src/config/dhis2.js`)
- Changed Program name: `"GMB Antenatal Care"` → `"Antenatal Care"`
- Changed Program Stage name: `"GMB ANC Visit"` → `"ANC Visit"`
- Renamed Org Units from Gambian hospitals to generic: `theGambia`, `serrекundaGH`, etc. → `root`, `facility1`, `facility2`, etc.
- Added comments explaining UIDs are configurable
- Added guidance for users to map their own metadata

#### 3b. Application Configuration (`d2.config.js`)
- Updated description: `"...for Gambian clinics"` → `"Automated antenatal care risk assessment and patient tracking"`

#### 3c. Layout Component (`src/components/common/Layout.jsx`)
- Removed: `"The Gambia · v1.0.0"` from sidebar footer
- Changed to: `"Maternal Health · v1.0.0"` (generic)
- Updated header version to show `"DHIS2 v2.38+"` (generic)

#### 3d. Form Placeholders (`src/pages/RegisterPatient.jsx`)
- Changed full name example: `"Fatou Jallow"` → `"Jane Smith"`
- Changed village example: `"Bakau"` → `"Springfield"`  
- Changed phone example: `"+220 7012345"` → `"+1 555-0123"`

#### 3e. Package Metadata (`package.json`)
- Updated description to be generic instead of Gambia-specific

#### 3f. Documentation (`README.md`)
- Updated intro to describe the system generically
- Updated "What it does" section to be universally applicable
- Added context about maternal mortality being a global problem
- Included optional manual configuration instructions

---

### 4. Use DHIS2 UI Library (REQUIRED)

**Issue**: App used Material UI (MUI) instead of @dhis2/ui, violating App Hub requirement to use DHIS2 design system.

**Changes Made**:

#### 4a. App Root (`src/App.jsx`)
- Removed MUI imports: `ThemeProvider`, `createTheme`, `CssBaseline`
- Removed 200+ lines of MUI theme configuration (palette, typography, components overrides)
- Simplified component to use DHIS2 defaults
- Added comment referencing `UI_MIGRATION.md` for future component updates

#### 4b. Migration Guide Created
- **File**: `UI_MIGRATION.md` (new)
- **Content**: Comprehensive component mapping from MUI to @dhis2/ui
- **Includes**: 
  - Component mapping table (Layout, Forms, Data Display, Navigation, etc.)
  - Styling approach comparison  
  - 5-phase migration plan
  - Key differences and testing strategy
  - Installation notes

**Status**: Foundation prepared; component migration is a large task requiring systematic updates across 30+ components.

---

### 5. Router Type Update (SUGGESTED - COMPLETED)

**Issue**: App used BrowserRouter which may have issues with DHIS2 app platform.

**Changes**:
- **File**: `src/App.jsx`  
- **Change**: Replaced `BrowserRouter` with `HashRouter`
- **Rationale**: HashRouter is more compatible with DHIS2 App Platform's routing architecture
- **Impact**: Better integration with DHIS2 dashboard and app switching

---

### 6. Remove Hardcoded Credentials (SUGGESTED - COMPLETED)

**Issue**: Comments in `src/App.jsx` contained example DHIS2 credentials (admin/district).

**Changes**:
- **File**: `src/App.jsx`
- **Removed**: Comments with `Username: admin`, `Password: district`
- **Rationale**: Security best practice; even demo credentials shouldn't be visible

---

## SUGGESTED IMPROVEMENTS - PARTIALLY COMPLETED

### 1. Performance Issues

#### ✅ Fixed: Paging Queries

**Issue**: All tracker data queries used `paging: false`, fetching all records in one request. Problematic for large deployments.

**Changes**:
- **File**: `src/hooks/useAlerts.js`
- **Change**: Added proper pagination with `page: 1, pageSize: 500`
- **Added**: Ordering by date descending for relevant results
- **Documentation**: Added comment explaining pagination approach

**Before**:
```javascript
const PATIENTS_QUERY = {
    patients: {
        resource: 'tracker/trackedEntities',
        params: {
            paging: false,
        },
    },
}
```

**After**:
```javascript
const PATIENTS_QUERY = {
    patients: {
        resource: 'tracker/trackedEntities',
        params: {
            page: 1,
            pageSize: 500,
            order: 'enrolledAt:desc',
        },
    },
}
```

#### ⏳ TODO: assessRisk() Memoization

**Issue**: `assessRisk()` is called at component render time without memoization, recalculating even when inputs haven't changed.

**Recommended Fix**: Wrap calls with `useMemo`:
```javascript
const assessment = useMemo(
    () => assessRisk(patientData, visitData),
    [patientData, visitData]
)
```

### 2. Code Quality Issues

#### ✅ Fixed: Silent Failure in Poll Job

**Issue**: `useRegisterPatient.js` silently returned success after 10 failed polling attempts instead of reporting error.

**Changes**:
- **File**: `src/hooks/useRegisterPatient.js`
- **Change**: After max polling attempts, now throws error: `"Patient registration job timed out..."`
- **Impact**: Users now see error messages if registration fails instead of silent success

**Before**:
```javascript
// Job timed out but likely succeeded — return success
return { teiUid: 'created', enrollmentUid: 'created' }
```

**After**:
```javascript
// Job timed out after all attempts
throw new Error('Patient registration job timed out. Please check if the registration was successful in DHIS2.')
```

#### 📋 TODO: Remove Duplicate Components

**Issue**: Some components exist in both `pages/` and `components/` directories:
- `RegisterPatient.jsx` (pages: 381 lines, components: 690 lines)
- `RecordVisit.jsx` (pages: 322 lines, components: 665 lines)

**Recommendation**: Consolidate - keep larger versions in `components/`, have `pages/` import from there.

#### 📋 TODO: Remove Empty Files

**Files to delete**:
- `src/components/visits/VisitTable.jsx` - Empty
- `src/components/visits/VitalsDisplay.jsx` - Empty
- `src/pages/Alerts.jsx` - Empty

---

## DOCUMENTATION IMPROVEMENTS

### README.md Updated

**Changes**:
1. Removed "in The Gambia" from app description
2. Updated "What it does" section to be universally applicable
3. Expanded setup instructions with:
   - Option 1: Use provided setup scripts (creates demo data)
   - Option 2: Manual configuration (use existing metadata)
   - Cross-platform compatibility (Windows PowerShell, macOS/Linux Bash)
4. Added detailed configuration explanation
5. Updated "Why this was built" section with global context

### UI_MIGRATION.md Created

**Purpose**: Comprehensive guide for ongoing MUI → @dhis2/ui migration

**Includes**:
- Component mapping table
- Styling approach comparison
- 5-phase migration plan
- Testing strategy

### CHANGES.md (This File)

Comprehensive record of all changes for review and future reference.

---

## NEXT STEPS FOR COMPLETE APPROVAL

### 1. Component-Level UI Migration (High Priority)
Replace Material UI with @dhis2/ui components across all pages and components. Follow `UI_MIGRATION.md` for guidance. Suggested phases:
- Phase 1: Layout components (25% of work)
- Phase 2: Form components (30% of work)
- Phase 3: Data display (25% of work)
- Phase 4: Pages (20% of work)

### 2. Performance Optimization (Medium Priority)
- [ ] Add `useMemo` wrapper around `assessRisk()` calls
- [ ] Implement incremental loading for large result sets
- [ ] Test with virtual scrolling if needed

### 3. Code Cleanup (Medium Priority)
- [ ] Remove empty files
- [ ] Consolidate duplicate components
- [ ] Extract shared utility functions

### 4. Configuration/Setup UI (Medium Priority)
Create an in-app configuration page allowing users to:
- Select/map their Tracker program
- Select/map program stage
- Map tracked entity attributes
- Map data elements
- Save configuration to dataStore

This would replace the need for setup scripts entirely.

### 5. Testing & Validation (High Priority)
- [ ] Test on fresh DHIS2 instances (v2.38, v2.39, v2.40+)
- [ ] Test with large datasets (pagination, performance)
- [ ] Cross-browser testing
- [ ] Accessibility testing (WCAG 2.1 AA compliance)

---

## Files Changed Summary

| File | Type | Change | Impact |
|------|------|--------|--------|
| src/App.jsx | Modified | Removed MUI theme, hardcoded baseUrl | Critical |
| src/config/dhis2.js | Modified | Made generic, added configuration comments | Critical |
| d2.config.js | Modified | Updated description | Critical |
| src/components/common/Layout.jsx | Modified | Removed Gambia footer | Critical |
| src/pages/RegisterPatient.jsx | Modified | Generic form placeholders | Critical |
| package.json | Modified | Generic description | Critical |
| README.md | Modified | Generic description, expanded setup docs | Critical |
| setup-dhis2.sh | Created | Bash script for macOS/Linux | Critical |
| src/hooks/useAlerts.js | Modified | Added pagination, fixed paging: false | High |
| src/hooks/useRegisterPatient.js | Modified | Fixed silent failure in poll job | High |
| UI_MIGRATION.md | Created | Migration guide for @dhis2/ui | Documentation |
| CHANGES.md | Created | This file - change summary | Documentation |

---

## Testing Recommendations

### Pre-Submission Testing
1. Run on clean DHIS2 instance with setup script
2. Test all main workflows:
   - Register patient
   - Record visit  
   - View dashboard
   - View risk alerts
3. Test with 1000+ patients to verify pagination
4. Test on different browsers (Chrome, Firefox, Safari)
5. Check for console errors

### Post-Approval Monitoring
- Collect user feedback on UI/UX
- Monitor performance metrics on production instances
- Plan UI migration phase by phase

---

## Version Information

- DHIS2 Minimum Version: v2.38
- React: 18.3.1
- React Router: 6.28.0
- DHIS2 UI: 9.0.0
- Material UI: 5.16.7 (planned for removal)

---

## Questions or Issues?

For questions about these changes or recommendations, refer to:
- `UI_MIGRATION.md` - For component migration details
- `README.md` - For setup and configuration instructions
- `src/config/dhis2.js` - For metadata configuration
