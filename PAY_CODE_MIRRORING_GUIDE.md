# Pay Code Mirroring: Quick Reference Guide

## 🎯 What is Pay Code Mirroring?

Pay Code Mirroring is a system that allows the Registrar's portal to display **real-time financial data** from the Bursar's portal without duplicating records. The Pay Code acts as a "one-way peeping window" into the Bursar's financial ledger.

---

## 🔑 Key Concepts

### The Pay Code Bridge
- **Pay Code**: A unique identifier shared between Registrar and Bursar records
- **Example**: Student "Muleme Bright" has Pay Code "3434" in both portals
- **Purpose**: Links academic record (Registrar) to financial record (Bursar)

### The Two Records
```
REGISTRAR RECORD                    BURSAR RECORD
─────────────────                   ──────────────
ID: 123                             ID: 456
Name: Muleme Bright                 Name: Muleme Bright
Pay Code: 3434          ←──────→    Pay Code: 3434
Origin: 'registrar'                 Origin: 'bursar'
Programme: BSc CS                   Balance: 836,700
Level: Year 2 Sem 1                 Total Fees: 1,000,000
Documents: [...]                    Billings: [...]
Results: [...]                      Payments: [...]
```

### The Mirroring Process
1. Registrar views student with Pay Code "3434"
2. System finds Pay Code "3434"
3. Looks up Bursar record with same Pay Code
4. Calculates clearance using Bursar's ID (456)
5. Displays: **16.3%** (from Bursar's ledger)

---

## 🎨 Visual Indicators

### Clearance Ring Colors

| Color | Hex | Meaning | Threshold |
|-------|-----|---------|-----------|
| 🔴 Red | #ef4444 | Below threshold | < 80% |
| 🟣 Purple | #8b5cf6 | Probation | 80% - 99.9% |
| 🟢 Green | #10b981 | Cleared | ≥ 100% |
| ⚪ Gray | #9ca3af | Not synced | No Bursar record |

### Tooltip Messages

**Synced (Normal):**
```
Financial Data: Synced via Bursar (Code: 3434)
Balance: 836,700, Status: probation
```

**Not Setup:**
```
Financial Data: Not setup in Bursar portal
Pay Code: 3434
```

**Bursar Student (Direct):**
```
Bal: 836,700, Total: 1,000,000, Status: probation
```

---

## 🔒 Result Locking Logic

### When Results are LOCKED (Read-Only):
- Clearance < Probation Threshold (default: 80%)
- Student hasn't paid enough fees
- Registrar can VIEW but not EDIT results

### When Results are UNLOCKED (Editable):
- Clearance ≥ Probation Threshold
- OR Status = 'cleared'
- Registrar can EDIT and SAVE results

### Example:
```
Student A: 16.3% clearance → 🔒 LOCKED
Student B: 85.0% clearance → 🔓 UNLOCKED
Student C: 100.0% clearance → 🔓 UNLOCKED
```

---

## 🏢 Portal Independence

### Registrar Portal Sees:
- ✅ Only students with `origin: 'registrar'`
- ✅ Academic records, documents, results
- ✅ **Mirrored** financial clearance (via Pay Code)
- ❌ Bursar's Guest/Independent learners

### Bursar Portal Sees:
- ✅ Only students with `origin: 'bursar'`
- ✅ Financial ledger, billings, payments
- ✅ Direct clearance calculation
- ❌ Registrar's academic records

### Shared via Pay Code:
- 🔗 Clearance percentage
- 🔗 Financial status
- 🔗 Balance information

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   REGISTRAR PORTAL                      │
│                                                         │
│  Student: Muleme Bright (ID: 123)                      │
│  Pay Code: 3434                                         │
│  Origin: 'registrar'                                    │
│                                                         │
│  ┌─────────────────────────────────────┐               │
│  │  Clearance Ring Component           │               │
│  │  ┌───────────────────────────────┐  │               │
│  │  │ calculateClearancePercentage  │  │               │
│  │  │                               │  │               │
│  │  │ 1. Detect origin='registrar'  │  │               │
│  │  │ 2. Extract Pay Code: 3434     │  │               │
│  │  └───────────────┬───────────────┘  │               │
│  └──────────────────┼──────────────────┘               │
│                     │                                   │
│                     ▼                                   │
│          ┌──────────────────────┐                      │
│          │  Pay Code Lookup     │                      │
│          │  Find: origin='bursar'│                     │
│          │  AND payCode='3434'  │                      │
│          └──────────┬───────────┘                      │
└─────────────────────┼──────────────────────────────────┘
                      │
                      │ Found: ID 456
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    BURSAR PORTAL                        │
│                                                         │
│  Student: Muleme Bright (ID: 456)                      │
│  Pay Code: 3434                                         │
│  Origin: 'bursar'                                       │
│                                                         │
│  Financial Data:                                        │
│  ├─ Total Billed: 1,000,000                            │
│  ├─ Total Paid: 163,000                                │
│  ├─ Balance: 836,700                                    │
│  └─ Clearance: 16.3%                                    │
│                                                         │
│  ┌─────────────────────────────────────┐               │
│  │  Calculation (using ID: 456)        │               │
│  │                                     │               │
│  │  Billings[studentId=456]            │               │
│  │  + Payments[studentId=456]          │               │
│  │  = 163,000 / 1,000,000              │               │
│  │  = 16.3%                            │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                      │
                      │ Return: 16.3%
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   REGISTRAR PORTAL                      │
│                                                         │
│  Display:                                               │
│  ┌─────────────┐                                        │
│  │     🔴      │  16.3%                                 │
│  │   16.3%     │  Red Ring                              │
│  └─────────────┘  Tooltip: "Synced via Bursar"         │
│                                                         │
│  Results: 🔒 LOCKED (below 80% threshold)               │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Common Operations

### Adding a New Student (Registrar)
1. Admit student in Registrar portal
2. Assign Pay Code (e.g., "3434")
3. Clearance shows **0%** (gray) - no Bursar record yet
4. Bursar creates financial account with same Pay Code
5. Clearance updates to actual percentage (red/purple/green)

### Making a Payment (Bursar)
1. Record payment in Bursar portal
2. Clearance recalculates automatically
3. Registrar's ring updates **instantly** (no refresh needed)
4. If crosses threshold, results unlock automatically

### Unenrolling a Student (Registrar)
1. Click "Unenroll" in Registrar portal
2. Student moves to Admissions (status: 'Applied')
3. Bursar's financial record **remains intact**
4. Pay Code link preserved for re-enrollment

---

## ⚠️ Important Notes

### DO:
- ✅ Always assign Pay Codes to Registrar students
- ✅ Use same Pay Code in both portals for same student
- ✅ Trust the mirrored clearance percentage
- ✅ Check Bursar portal for financial details

### DON'T:
- ❌ Create duplicate Pay Codes
- ❌ Change Pay Code without updating both portals
- ❌ Try to edit financial data in Registrar portal
- ❌ Expect Bursar students to appear in Registrar list

---

## 🐛 Troubleshooting

### Problem: Ring shows 0% (gray)
**Cause:** No Bursar record with matching Pay Code  
**Solution:** Create financial account in Bursar portal with same Pay Code

### Problem: Percentage doesn't match Bursar
**Cause:** Pay Code mismatch or calculation error  
**Solution:** Verify Pay Codes match exactly in both portals

### Problem: Results won't unlock
**Cause:** Clearance below threshold  
**Solution:** Record payment in Bursar to increase clearance

### Problem: Guest student appears in Registrar
**Cause:** Student has `origin: 'registrar'` incorrectly  
**Solution:** Update student origin to 'bursar' in database

---

## 📚 Code References

### Main Files:
- **Calculation Engine:** `src/lib/store.ts` → `calculateClearancePercentage()`
- **Display Component:** `src/components/StatusRing.tsx`
- **Registrar List:** `src/app/admin/enrollment/page.tsx`
- **Student Detail:** `src/app/admin/enrollment/[id]/page.tsx`

### Key Functions:
```typescript
// Calculate with mirroring
calculateClearancePercentage(
    student,      // The student to calculate for
    billings,     // All billings
    payments,     // All payments
    bursaries,    // All bursaries
    undefined,    // targetTerm (optional)
    undefined,    // overridePrevBal (optional)
    students      // ALL students (enables Pay Code lookup)
)
```

---

**Last Updated:** 2026-02-01  
**Version:** 1.0  
**Status:** Production Ready
