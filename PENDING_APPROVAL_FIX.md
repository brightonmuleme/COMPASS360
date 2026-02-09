# Fix: Pending Approval Notifications Not Showing

## 🐛 **Problem**

Muleme Bright (and potentially other students) had pending transactions, but the approval notification badge (beeping indicator) was not appearing next to their name in the learners list.

## 🔍 **Root Causes**

### 1. **Case-Sensitivity Issue**
The pending transaction counter was checking for:
```typescript
if (p.status === 'Pending' || p.status === 'pending')
```

But the actual payment status in the system was **"PENDING"** (all caps), which didn't match either condition.

### 2. **Auto-Pruning Removing Old Pending Payments**
Our new storage cleanup system (Option A) was automatically removing payments older than 6 months, **including pending ones**. This meant:
- Old pending payments awaiting Director approval were being deleted
- The approval queue was being cleared unintentionally
- Directors couldn't see or approve older pending transactions

---

## ✅ **Solution Implemented**

### Fix 1: Case-Insensitive Status Check
**File**: `src/app/bursar/learners/page.tsx` (Line 225-239)

**Before**:
```typescript
payments.forEach(p => {
    if (p.status === 'Pending' || p.status === 'pending') {
        counts[p.studentId] = (counts[p.studentId] || 0) + 1;
    }
});
```

**After**:
```typescript
payments.forEach(p => {
    const status = (p.status || '').toLowerCase();
    if (status === 'pending') {
        counts[p.studentId] = (counts[p.studentId] || 0) + 1;
    }
});
```

**Impact**: Now works with 'Pending', 'pending', 'PENDING', or any case variation.

---

### Fix 2: Preserve Pending Payments in Auto-Pruning
**File**: `src/lib/store.ts` (Line 2544-2561)

**Before**:
```typescript
// Keep if: recent (6mo) OR approved status OR has attachments
return paymentDate >= sixMonthsAgo || 
       p.status === 'approved' || 
       (p.attachments && p.attachments.length > 0);
```

**After**:
```typescript
const status = (p.status || '').toLowerCase();
// Keep if: recent (6mo) OR approved OR pending OR has attachments
return paymentDate >= sixMonthsAgo || 
       status === 'approved' || 
       status === 'pending' ||
       (p.attachments && p.attachments.length > 0);
```

**Impact**: Pending transactions are now preserved regardless of age, ensuring Director approval queues remain intact.

---

## 🎯 **What This Fixes**

✅ **Pending notifications now appear** for students with pending transactions (any case)
✅ **Old pending payments are preserved** and won't be auto-deleted
✅ **Director approval queue stays intact** even for older pending transactions
✅ **Beeping/pulsing badge** now shows correctly next to student names

---

## 📊 **How It Works Now**

### Pending Transaction Badge Logic:
1. **Count pending payments** (case-insensitive)
2. **Display badge** if count > 0:
   - Orange pulsing badge with count
   - Shows in both desktop table and mobile card views
   - Tooltip: "X transaction(s) pending approval"

### Auto-Pruning Logic for Payments:
Payments are **kept** if they meet ANY of these criteria:
- ✅ Less than 6 months old
- ✅ Status is "approved" (any case)
- ✅ Status is "pending" (any case) ← **NEW**
- ✅ Has attachments/evidence

Payments are **removed** if:
- ❌ Older than 6 months
- ❌ Status is NOT approved or pending
- ❌ No attachments

---

## 🧪 **Testing**

### Test Case 1: Muleme Bright
**Expected**: Should now see orange pulsing badge with pending count
**Reason**: Pending payments are now detected (case-insensitive) and preserved

### Test Case 2: Old Pending Payments
**Expected**: Pending payments from >6 months ago should still appear
**Reason**: Auto-pruning now excludes pending transactions

### Test Case 3: Case Variations
**Expected**: Works with 'Pending', 'pending', 'PENDING', 'PeNdInG'
**Reason**: Case-insensitive toLowerCase() check

---

## 🔄 **What Happens Next**

1. **Refresh the page** - The changes will take effect
2. **Check Muleme Bright** - Should now show pending badge
3. **Check other students** - Any with pending transactions should show badge
4. **Console logs** - You'll see:
   ```
   🧹 Auto-pruned X old payments (older than 6 months, excluding approved/pending)
   ```

---

## 📝 **Important Notes**

### Data Retention Policy (Updated):
- **Pending payments**: ✅ **Kept forever** (until approved/rejected)
- **Approved payments**: ✅ **Kept forever**
- **Payments with attachments**: ✅ **Kept forever**
- **Recent payments** (<6 months): ✅ **Kept**
- **Old regular payments** (>6 months, no special status): ❌ **Removed**

### Why This Matters:
- Directors can now see ALL pending approvals, regardless of age
- No risk of losing pending transactions due to auto-cleanup
- Approval workflow remains intact

---

## 🚨 **If Badge Still Doesn't Show**

If the badge still doesn't appear after this fix:

1. **Check payment status** in the database/localStorage:
   - Open browser DevTools → Application → Local Storage
   - Find `school_payments_v1`
   - Check if Muleme Bright's payments have `status: "pending"` (or any case)

2. **Check studentId matching**:
   - Verify payment's `studentId` matches student's `id`
   - Case-sensitive ID matching

3. **Check isDirector flag**:
   - Badge only shows when `activeRole === 'Director'`
   - Verify you're logged in as Director

4. **Force refresh**:
   - Clear browser cache
   - Hard reload (Ctrl+Shift+R)

---

**Implementation Date**: 2026-02-07
**Issue**: Pending approval notifications not showing
**Status**: ✅ **Fixed**
