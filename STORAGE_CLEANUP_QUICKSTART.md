# 🧹 Storage Cleanup - Quick Start Guide

## ✅ What Was Fixed

Your transactions were disappearing when switching roles because **localStorage was full**. We've implemented aggressive auto-pruning to fix this.

---

## 🚀 How to Test

### 1. **Add a Transaction (Bursar Role)**
1. Go to Bursar portal
2. Open a student account
3. Add a new payment transaction
4. **Check console** - you should see cleanup logs like:
   ```
   🧹 Auto-pruned X old payments (older than 6 months)
   ```

### 2. **Switch to Director Role**
1. Switch to Director role
2. Open the same student account
3. **Verify**: Your transaction should now appear! ✅

### 3. **Check Storage Health (Director Only)**
1. In Director sidebar, click **"🧹 Storage Cleanup"**
2. View your storage usage
3. If usage >80%, click **"Run Deep Clean"**

---

## 📊 What Changed

### Automatic Cleanup (Happens on Every Save)
- **Payments**: Keeps last 6 months + approved transactions
- **Billings**: Keeps last 6 months
- **General Transactions**: Keeps last 3 months
- **Student Records**: Optimized (profile pics, history)

### Manual Cleanup (Director Tool)
- New page: `/director/storage-cleanup`
- Shows storage breakdown
- One-click deep clean

---

## ⚠️ Important

### Data You'll Keep
✅ All recent transactions (last 6 months)
✅ All approved payments (forever)
✅ All current student data
✅ Flagged/important items

### Data That Gets Removed
❌ Old unapproved payments (>6 months)
❌ Old billings (>6 months)
❌ Old transactions (>3 months)
❌ Large profile pictures
❌ Excess deleted items

---

## 🔧 If You Still See Issues

1. **Check console** for cleanup logs
2. **Run manual cleanup** (Director → Storage Cleanup)
3. **Clear browser cache** if needed
4. **Contact support** if problem persists

---

## 📝 Console Messages You'll See

### Normal Operation
```
🧹 Auto-pruned 45 old payments (older than 6 months)
🧹 Auto-pruned 120 old billings (older than 6 months)
```

### If Storage Gets Full
```
❌ STORAGE QUOTA EXCEEDED for school_payments_v1!
🚨 Attempting emergency purge of: [...]
✅ Cleared school_deleted_billings_v1
✅ Successfully saved school_payments_v1 with emergency optimizations.
```

You'll also see browser alerts explaining what happened.

---

## 🎯 Next Steps

1. **Test the transaction flow** (add → switch role → verify)
2. **Check storage cleanup page** (Director role)
3. **Monitor console** for cleanup logs
4. **Report any issues** you encounter

---

**Need Help?** Check `STORAGE_CLEANUP_IMPLEMENTATION.md` for full technical details.
