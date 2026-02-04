
import { Billing, Payment, Bursary, EnrolledStudent } from './store';
import { parseLevelString } from './levelParser';

export interface FinancialSummary {
    totalBilled: number;
    totalPayments: number;
    outstandingBalance: number;
    tuitionBilled: number;
    tuitionPaid: number;
    clearanceTarget: number;
    clearancePaid: number;
}

const compareTerms = (termA: string, termB: string) => {
    if (!termA || !termB) return 0;
    if (termA === termB) return 0;
    const a = parseLevelString(termA);
    const b = parseLevelString(termB);
    if (!a.isValid || !b.isValid) return 0;
    if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
    return a.period - b.period;
};

const isPastTerm = (term: string, current: string) => compareTerms(term, current) < 0;

const cleanKey = (k: string) => k.toLowerCase().replace(/service:\s*/g, '').replace(/billed:\s*/g, '').replace(/fees?\s*/g, '').trim();

export const calculateStudentFinancials = (
    student: EnrolledStudent,
    billings: Billing[],
    payments: Payment[],
    bursaries: Bursary[]
): FinancialSummary => {

    // Bursary
    const bursaryData = bursaries.find(b => b.id === student.bursary);
    const bursaryDiscount = bursaryData ? bursaryData.value : 0;

    // Effective Previous Balance for Current Term (Logical BF)
    let effectivePrevBal = 0;
    const currentSemHistory = student.promotionHistory?.find(h => h.toSemester === student.semester);
    if (currentSemHistory) {
        effectivePrevBal = currentSemHistory.previousBalance;
    } else {
        effectivePrevBal = student.previousBalance || 0;
    }

    // 1. Target Billings (Tuition + Balance Brought Forward)
    // We only look at current term billings for 'tuition' to determine clearance targets
    const currentTermBillings = billings.filter(b => b.studentId === student.id && (b.term === student.semester || !b.term));
    const tuitionBilled = currentTermBillings.filter(b => {
        const desc = (b.description || '').toLowerCase();
        const type = (b.type || '').toLowerCase();
        return type.includes('tuition') || desc.includes('tuition');
    }).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    // 2. Identify all-time data
    const allStudentBillings = billings.filter(b => b.studentId === student.id);
    const allStudentPayments = payments.filter(p => p.studentId === student.id);

    // 3. Check for specific 'Brought Forward' (BF) ledger items in the CURRENT term
    const hasLedgerBF = currentTermBillings.some(b =>
        b.isBroughtForward === true ||
        /brought|forward|bf|arrears/i.test(b.description || "") ||
        /brought|forward|bf|arrears/i.test(b.type || "")
    );

    // 4. Decision: Full Ledger vs Hybrid (Manual BF + Current)
    // If hasLedgerBF is true, we assume the ledger is managed via BF bills.
    // If not, but effectivePrevBal > 0, we use Hybrid.
    // Otherwise, Full Ledger.

    let ledgerBilled = 0;
    let ledgerPaid = 0;
    let manualArrears = 0;

    if (hasLedgerBF) {
        // trust the ledger that currently includes a BF bill for past debt
        // We take everything from current term onwards
        ledgerBilled = allStudentBillings.filter(b => !isPastTerm(b.term || '', student.semester)).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        ledgerPaid = allStudentPayments.filter(p => !isPastTerm(p.term || '', student.semester)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        manualArrears = 0;
    } else if (effectivePrevBal !== 0) {
        // Hybrid: Manual Starting Balance + Current Term Ledger
        ledgerBilled = allStudentBillings.filter(b => !isPastTerm(b.term || '', student.semester)).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        ledgerPaid = allStudentPayments.filter(p => !isPastTerm(p.term || '', student.semester)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        manualArrears = effectivePrevBal;
    } else {
        // Full Ledger: All billings ever minus all payments ever
        ledgerBilled = allStudentBillings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        ledgerPaid = allStudentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        manualArrears = 0;
    }

    const totalBilled = ledgerBilled + manualArrears - bursaryDiscount;
    const totalPayments = ledgerPaid;
    const outstandingBalance = totalBilled - totalPayments;

    // 5. Clearance Paid (Strict Tuition/BF allocations)
    const currentTermPayments = allStudentPayments.filter(p => p.term === student.semester || !p.term);
    const clearancePaid = currentTermPayments.reduce((acc, p) => {
        let amount = 0;
        if (p.allocations && Object.keys(p.allocations).length > 0) {
            Object.entries(p.allocations).forEach(([key, val]) => {
                const ck = cleanKey(key);
                // If it's tuition or a balance-forward key, it counts towards clearance
                if (ck === 'tuition' || ck === 'brought forward' || ck === 'bf' || ck === 'prev balance' || ck === 'arrears') {
                    amount += (Number(val) || 0);
                }
            });
        } else {
            // Fallback: If no allocations, and it's a current term payment, assume it's for tuition/arrears unless strictly categorized elsewhere
            amount = p.amount;
        }
        return acc + amount;
    }, 0);

    const clearanceTarget = (tuitionBilled + manualArrears) - bursaryDiscount;

    return {
        totalBilled,
        totalPayments,
        outstandingBalance,
        tuitionBilled,
        tuitionPaid: clearancePaid,
        clearanceTarget,
        clearancePaid
    };
};
