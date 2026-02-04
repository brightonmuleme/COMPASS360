# Programme Selection Fix - Registrar Admissions

## Issue
The Registrar Admissions form was showing "⚠️ No programmes configured" even though programmes were properly configured in the Programmes & Fees Structure section.

## Root Cause
The `filteredProgrammes` logic in `src/lib/store.ts` was filtering programmes based on the `origin` field:

```typescript
// BEFORE (Line 3329)
if (isRegistrarPortal) return programmes.filter(p => p.origin === 'registrar');
```

This meant that:
- Only programmes with `origin === 'registrar'` were shown in the Registrar portal
- Programmes created without an `origin` field were hidden
- Programmes created from other portals were hidden

## Solution
Modified the filtering logic to include programmes without an origin field:

```typescript
// AFTER (Line 3329)
if (isRegistrarPortal) return programmes.filter(p => p.origin === 'registrar' || !p.origin);
```

## Impact
✅ **Registrar Admissions Form** now displays ALL configured programmes including:
- Programmes with `origin: 'registrar'`
- Programmes without an `origin` field (legacy or newly created)

✅ **Entry Level Dropdown** automatically shows the levels configured for the selected programme:
- Already implemented correctly (lines 1022-1026 in admissions page)
- Uses `activeProgData?.levels` from the selected programme
- Falls back to default levels if none configured

## Files Modified
- **`src/lib/store.ts`** (Line 3329) - Updated `filteredProgrammes` logic

## Testing
1. Navigate to Registrar portal → Admissions
2. Click "+ New Admission"
3. Verify that the Programme dropdown shows all configured programmes:
   - Bachelor of Medicine & Surgery
   - Bachelor of Nursing Science
   - Diploma in Midwifery
   - Diploma in Clinical Medicine
   - CERTIFICATE IN NURSING
   - CPH
   - CLT
   - DMLT
4. Select a programme
5. Verify that the Entry Level dropdown shows the levels configured for that programme

## Expected Behavior
- **Programme Dropdown:** Shows all programmes from Programmes & Fees Structure section
- **Entry Level Dropdown:** Dynamically updates to show only the levels configured for the selected programme
- **Empty State:** Only appears when NO programmes exist in the system

## Additional Notes
The Entry Level dropdown was already correctly implemented to use programme-specific levels:

```tsx
{(() => {
    const activeProgData = programmes.find(p => p.name === formData.programme);
    const levels = activeProgData?.levels || ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
    return levels.map(l => <option key={l} value={l}>{l}</option>);
})()}
```

This ensures that when a user selects a programme, they only see the entry levels that have been configured for that specific programme in the Programmes & Fees Structure section.
