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
    clearancePercentage: number;
}

export const calculateStudentFinancials = (
    student: EnrolledStudent,
    billings: Billing[],
    payments: Payment[],
    bursaries: Bursary[],
    targetTerm?: string,
    programmes: any[] = [] // Optional programmes for tuition fallback
): FinancialSummary => {
    // 1. FILTER RELEVANT DATA
    const studentBillings = billings.filter(b => b.studentId.toString() === student.id.toString());
    const studentPayments = payments.filter(p => p.studentId.toString() === student.id.toString());

    // Term Isolation Logic
    const currentTerm = targetTerm || student.semester;
    const isCurrent = currentTerm === student.semester;

    const currentBillings = studentBillings.filter(b => b.term === currentTerm || (!b.term && isCurrent));
    const currentPayments = studentPayments.filter(p => p.term === currentTerm || (!p.term && isCurrent));

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
    let currentTuitionBill = currentBillings.reduce((sum, b) => {
        const isTuition = /tuition/i.test(b.description || "") || /tuition/i.test(b.type || "");
        if (isTuition && !isArrearsKey(b.description || b.type || "")) return sum + b.amount;
        return sum;
    }, 0);

    // SAFETY FALLBACK: If NO tuition bill is found, but unbilled tuition is expected via Fee Structure
    if (currentTuitionBill === 0 && programmes.length > 0) {
        const prog = programmes.find(p => p.id === student.programme || p.name === student.programme);
        const feeConfig = prog?.feeStructure?.find((fs: any) => fs.level === (student.level));
        if (feeConfig) currentTuitionBill = feeConfig.tuitionFee;
    }

    // 4. ARREARS TARGET
    const arrearsBillValue = currentBillings.filter(b => isArrearsKey(b.description || b.type || "")).reduce((s, b) => s + b.amount, 0);
    const totalArrears = hasBFBillInTerm ? arrearsBillValue : (student.previousBalance || 0);

    // Total Target for the Ring = (Current Tuition + Old Arrears) - Bursary
    const clearanceTarget = (currentTuitionBill + totalArrears) - bursaryValue;

    // 5. PAYMENTS ALLOCATED TO TUITION/BF (Strict Particulars Rule)
    const clearancePaid = currentPayments.reduce((sum, p) => {
        let paidToTarget = 0;

        // Detection Logic for Digital Integrations (e.g., SchoolPay, PegPay)
        const methodLower = String(p.method || "").toLowerCase().replace(/\s/g, "");
        const descLower = String(p.description || "").toLowerCase();
        const isDigitalIntegration =
            ['schoolpay', 'pegpay'].includes(methodLower) ||
            descLower.includes('automatic schoolpay') ||
            descLower.includes('automatic pegpay') ||
            descLower.includes('bank-synced') ||
            p.metadata?.syncSource === 'digital_integration';

        if (p.allocations && Object.keys(p.allocations).length > 0) {
            // Check if user has explicitly allocated to Tuition or Arrears
            const tuitionAmt = Number(p.allocations["Tuition Fees"]) || 0;
            const bfAmt = Number(p.allocations["Brought Forward"]) || 0;

            if (tuitionAmt > 0 || bfAmt > 0) {
                paidToTarget += tuitionAmt;
                paidToTarget += bfAmt;
            }
            // SPECIAL CASE (User Request): If it's a digital integration and ONLY has generic allocations
            // (meaning the user hasn't SPECIFICALLY re-allocated it to something else like "Uniforms")
            else if (isDigitalIntegration) {
                const keys = Object.keys(p.allocations);
                const isOnlyGeneric = keys.every(k =>
                    k === 'General' ||
                    k === 'General Payment' ||
                    k === 'Fee Payment' ||
                    k === 'Collection'
                );

                if (isOnlyGeneric) {
                    paidToTarget += p.amount;
                }
            }
        } else if (isDigitalIntegration) {
            // Fallback: If it's a Digital Integration and NO allocations exist, 
            // treat the whole amount as Tuition (for Clearance) by default.
            paidToTarget += p.amount;
        }

        return sum + paidToTarget;
    }, 0);

    // 6. DEBT-FIRST CLEARANCE LOGIC (User Request)
    // Payments MUST clear Arrears first before they count towards the Current Semester Percentage.
    const tuitionNetTarget = Math.max(0, currentTuitionBill - bursaryValue);
    const tuitionNetPaid = Math.max(0, clearancePaid - totalArrears);

    // 7. OVERALL FINANCIALS FOR THE CONTEXT (TOTAL BILLED vs TOTAL PAID)
    const totalBilledInContext = currentBillings.reduce((sum, b) => sum + b.amount, 0) + effectivePrev;
    const totalPaymentsInContext = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = totalBilledInContext - bursaryValue - totalPaymentsInContext;

    return {
        totalBilled: totalBilledInContext,
        totalPayments: totalPaymentsInContext,
        outstandingBalance,
        tuitionBilled: currentTuitionBill, // Raw bill for table display
        tuitionPaid: Math.min(tuitionNetPaid, tuitionNetTarget), // Net progress for the current semester
        clearanceTarget: tuitionNetTarget, // The goal for the ring is the net tuition
        clearancePaid: tuitionNetPaid,      // The progress for the ring is the net paid
        clearancePercentage: tuitionNetTarget > 0 ? (tuitionNetPaid / tuitionNetTarget) * 100 : 100
    };
};
