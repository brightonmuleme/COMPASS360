import { EnrolledStudent, Billing, Payment, Bursary } from './store';

export const normalizeKey = (k: string) => {
    if (!k) return "";
    return k.toLowerCase()
        .replace(/service:\s*/g, '')
        .replace(/billed:\s*/g, '')
        .replace(/fees?\s*/g, '') // Strip "fee" or "fees"
        .replace(/s$/, '')        // Last-resort plural strip
        .trim();
};

export const isArrearsKey = (str: string) => /brought\s*forward|bf|arrears|prev|balance\s*b\/f/i.test(str);

export interface FinancialSummary {
    totalBilled: number;
    totalPayments: number;
    outstandingBalance: number;
    tuitionBilled: number;
    tuitionPaid: number;
    clearanceTarget: number;
    clearancePaid: number;
}

export const calculateStudentFinancials = (
    student: EnrolledStudent,
    billings: Billing[],
    payments: Payment[],
    bursaries: Bursary[],
    targetTerm?: string
): FinancialSummary => {
    // 1. FILTER RELEVANT DATA
    const studentBillings = billings.filter(b => b.studentId === student.id);
    const studentPayments = payments.filter(p => p.studentId === student.id);

    // Term Isolation Logic
    // If targetTerm is provided (e.g., from Bursar views), we strictly follow the isolated context.
    const currentBillings = targetTerm
        ? studentBillings.filter(b => b.term === targetTerm || !b.term)
        : studentBillings;

    const currentPayments = targetTerm
        ? studentPayments.filter(p => p.term === targetTerm || !p.term)
        : studentPayments;

    const bursaryData = bursaries.find(b => b.id === student.bursary);
    const bursaryValue = bursaryData ? bursaryData.value : 0;

    // 2. IDENTIFY BF (BROUGHT FORWARD) BILLS IN CURRENT CONTEXT

    const hasBFBillInTerm = currentBillings.some(b =>
        b.isBroughtForward === true ||
        isArrearsKey(b.description || "") ||
        isArrearsKey(b.type || "")
    );

    // If a BF bill exists in the term, we don't add student.previousBalance from profile 
    // because the bill ALREADY represents that debt.
    const effectivePrev = hasBFBillInTerm ? 0 : (student.previousBalance || 0);

    // 3. TARGET TUITION BILL (Current Semester Tuition ONLY)
    const currentTuitionBill = currentBillings.reduce((sum, b) => {
        const isTuition = /tuition/i.test(b.description || "") || /tuition/i.test(b.type || "");
        if (isTuition && !isArrearsKey(b.description || b.type || "")) return sum + b.amount;
        return sum;
    }, 0);

    // 4. ARREARS TARGET
    const arrearsBillValue = currentBillings.filter(b => isArrearsKey(b.description || b.type || "")).reduce((s, b) => s + b.amount, 0);
    const totalArrears = hasBFBillInTerm ? arrearsBillValue : (student.previousBalance || 0);

    // Total Target for the Ring = (Current Tuition + Old Arrears) - Bursary
    const clearanceTarget = (currentTuitionBill + totalArrears) - bursaryValue;

    // 5. PAYMENTS ALLOCATED TO TUITION/BF (Strict Particulars Rule)
    const clearancePaid = currentPayments.reduce((sum, p) => {
        let paidToTarget = 0;
        if (p.allocations && Object.keys(p.allocations).length > 0) {
            // Exact keys matching the transaction form
            paidToTarget += (Number(p.allocations["Tuition Fees"]) || 0);
            paidToTarget += (Number(p.allocations["Brought Forward"]) || 0);
        } else if (p.method === 'SchoolPay' || (p as any).mode === 'SchoolPay') {
            // Fallback: If it's a SchoolPay payment and NO allocations exist yet, 
            // treat the whole amount as Tuition (for Clearance) by default.
            paidToTarget += p.amount;
        }
        return sum + paidToTarget;
    }, 0);

    // 6. OVERALL FINANCIALS FOR THE CONTEXT (TOTAL BILLED vs TOTAL PAID)
    const totalBilledInContext = currentBillings.reduce((sum, b) => sum + b.amount, 0) + effectivePrev;
    const totalPaymentsInContext = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = totalBilledInContext - bursaryValue - totalPaymentsInContext;

    return {
        totalBilled: totalBilledInContext,
        totalPayments: totalPaymentsInContext,
        outstandingBalance,
        tuitionBilled: currentTuitionBill,
        tuitionPaid: clearancePaid,
        clearanceTarget: Math.max(0, clearanceTarget),
        clearancePaid: clearancePaid
    };
};
