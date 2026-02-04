# Financial Mirroring Test Plan

## Test Scenario 1: Verify Pay Code Mirroring for Existing Student

### Setup:
1. Student "Muleme Bright" exists in both portals with Pay Code "3434"
2. Bursar record (ID: 456) has:
   - Total Billed: 1,000,000 UGX
   - Total Paid: 163,000 UGX
   - Expected Clearance: 16.3%

### Test Steps:
1. Navigate to Registrar Portal → Enrollment
2. Find "Muleme Bright" in the list
3. Observe the clearance ring

### Expected Results:
- ✅ Ring shows **16.3%** (NOT 34.3% or any other value)
- ✅ Ring color is **RED** (#ef4444) - below threshold
- ✅ Hover tooltip shows: "Financial Data: Synced via Bursar (Code: 3434)"
- ✅ Tooltip includes Bursar's balance information

---

## Test Scenario 2: Real-Time Update Verification

### Setup:
1. Have both Bursar and Registrar portals open
2. Student "Muleme Bright" visible in both

### Test Steps:
1. In Bursar Portal: Add new payment of 200,000 UGX for student 3434
2. Switch to Registrar Portal (no refresh)
3. Observe clearance ring

### Expected Results:
- ✅ Ring updates from 16.3% to ~36.3% automatically
- ✅ Color may change from RED to PURPLE if crosses threshold
- ✅ Tooltip shows updated balance

---

## Test Scenario 3: Guest/Independent Learner Isolation

### Setup:
1. Bursar creates "Guest Student" (origin: 'bursar')
2. Pay Code: "GUEST001"

### Test Steps:
1. Navigate to Registrar Portal → Enrollment
2. Search for "Guest Student" or Pay Code "GUEST001"
3. Check student count

### Expected Results:
- ✅ Guest student is **NOT visible** in Registrar list
- ✅ Student count does NOT include guest students
- ✅ Only Registrar-admitted students appear

---

## Test Scenario 4: New Registrar Student Without Financial Setup

### Setup:
1. Registrar admits new student "Test Student"
2. Pay Code: "TEST123"
3. NO corresponding Bursar record created yet

### Test Steps:
1. Navigate to Registrar Portal → Enrollment
2. Find "Test Student"
3. Observe clearance ring

### Expected Results:
- ✅ Ring shows **0.0%**
- ✅ Ring color is **GRAY** (#9ca3af)
- ✅ Tooltip shows: "Financial Data: Not setup in Bursar portal\nPay Code: TEST123"

---

## Test Scenario 5: Result Locking Based on Clearance

### Setup:
1. Student with clearance below threshold (e.g., 16.3%)
2. Probation threshold set to 80%

### Test Steps:
1. Navigate to Registrar Portal → Enrollment → Student Detail
2. Click on any Academic Results card
3. Attempt to edit results

### Expected Results:
- ✅ Results modal opens in **READ-ONLY** mode
- ✅ "Edit" button is disabled or hidden
- ✅ Message indicates financial clearance required

### Test Steps (After Payment):
1. In Bursar Portal: Add payment to bring clearance above 80%
2. Return to Registrar Portal → Student Detail
3. Click on Academic Results card

### Expected Results:
- ✅ Results modal now allows **EDITING**
- ✅ Can save changes to results

---

## Test Scenario 6: Color Threshold Consistency

### Setup:
1. Three students with different clearance levels:
   - Student A: 15% clearance
   - Student B: 85% clearance
   - Student C: 100% clearance

### Test Steps:
1. View all three students in Registrar Portal
2. Compare ring colors
3. Switch to Bursar Portal
4. View same students

### Expected Results:
- ✅ Student A: RED in both portals
- ✅ Student B: PURPLE in both portals
- ✅ Student C: GREEN in both portals
- ✅ **Exact same colors** in Registrar and Bursar

---

## Test Scenario 7: Unenrollment Independence

### Setup:
1. Student enrolled in Registrar with Pay Code "3434"
2. Student has financial record in Bursar

### Test Steps:
1. In Registrar Portal: Unenroll student
2. Check Registrar's Admissions list
3. Switch to Bursar Portal
4. Search for Pay Code "3434"

### Expected Results:
- ✅ Student moved to Registrar's Admissions (status: 'Applied')
- ✅ Student's financial record **STILL EXISTS** in Bursar
- ✅ Bursar can still view/manage financial account
- ✅ Independence maintained

---

## Test Scenario 8: Tooltip Information Accuracy

### Setup:
1. Registrar student with synced Bursar record

### Test Steps:
1. Hover over clearance ring in Registrar Portal
2. Read tooltip information
3. Switch to Bursar Portal
4. View same student's account details

### Expected Results:
- ✅ Balance shown in tooltip matches Bursar's balance exactly
- ✅ Status shown matches Bursar's status
- ✅ Pay Code displayed correctly
- ✅ All financial data identical

---

## Regression Tests

### RT-1: Bursar Portal Unchanged
- ✅ Bursar portal still functions normally
- ✅ Can create Guest/Independent learners
- ✅ Clearance calculations work for Bursar students

### RT-2: Registrar Portal Core Functions
- ✅ Can still admit students
- ✅ Can manage documents
- ✅ Can enter results (when cleared)
- ✅ Can promote students

### RT-3: No "Recover Hidden" Button
- ✅ Button completely removed
- ✅ No hidden student recovery functionality
- ✅ Clean, independent lists

---

## Performance Tests

### PT-1: Large Student List
- Load Registrar portal with 500+ students
- ✅ Clearance rings load quickly
- ✅ No lag when scrolling
- ✅ Pay Code lookups are efficient

### PT-2: Concurrent Updates
- Make payment in Bursar while viewing Registrar
- ✅ Updates reflect without manual refresh
- ✅ No race conditions
- ✅ Data consistency maintained

---

## Edge Cases

### EC-1: Duplicate Pay Codes
- What if two Bursar records have same Pay Code?
- ✅ System uses first match (should prevent duplicates)

### EC-2: Missing Pay Code
- Registrar student has no Pay Code assigned
- ✅ Shows 0% with gray ring
- ✅ Tooltip indicates no Pay Code

### EC-3: Pay Code Changed
- Bursar changes student's Pay Code
- ✅ Registrar's link breaks (shows gray)
- ✅ Requires Pay Code update in Registrar record

---

## Success Criteria

All tests must pass with ✅ for the implementation to be considered complete.

**Test Date:** _____________
**Tester:** _____________
**Results:** _____________
