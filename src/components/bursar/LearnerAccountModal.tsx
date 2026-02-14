"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData, EnrolledStudent, Payment, formatMoney, PhysicalRequirement, generateId } from '@/lib/store';
import { numberToWords } from '@/lib/numberToWords';
import { Transaction, FEE_STRUCTURE, BURSARY_SCHEMES } from '@/app/bursar/sharedData';
import { TransactionFormModal } from './TransactionFormModal';
import { StatusRing } from '@/components/StatusRing';
import { schoolPayService } from '@/services/schoolPayService';
import { calculateStudentFinancials } from '@/lib/financialCore';


// --- CONSTANTS ---
const DELETE_REASONS = ['Duplicate Entry', 'Wrong Amount', 'Entered in Error', 'Payment Refunded', 'Other'];
const isArrearsKey = (str: string) => /brought\s*forward|bf|arrears|prev|balance\s*b\/f/i.test(str);

// --- STYLING CONSTANTS ---
const PREMIUM_GOLD = 'linear-gradient(135deg, #fbbf24, #d97706)';
const PREMIUM_BLUE = 'linear-gradient(135deg, #3b82f6, #2563eb)';
const PREMIUM_GLASS = 'rgba(255, 255, 255, 0.03)';
const PREMIUM_BORDER = '1px solid rgba(255, 255, 255, 0.08)';

export { StatusRing };



// --- SUB-COMPONENT: BillingsTrashList ---
const BillingsTrashList = ({ studentId, deletedBillings }: { studentId: number, deletedBillings: any[] }) => {
    const [reasonFilter, setReasonFilter] = useState('All');

    // 1. Filter by Student
    const myDeleted = useMemo(() => {
        return deletedBillings.filter(b => b.studentId === studentId);
    }, [deletedBillings, studentId]);

    // 2. Extract Unique Reasons for Filter
    const uniqueReasons = useMemo(() => {
        const reasons = new Set(myDeleted.map(b => {
            const delLog = b.history.slice().reverse().find((h: any) => h.action === 'Deleted');
            return delLog?.details || 'Unknown';
        }));
        return Array.from(reasons);
    }, [myDeleted]);

    // 3. Apply Reason Filter
    const filteredList = useMemo(() => {
        if (reasonFilter === 'All') return myDeleted;
        return myDeleted.filter(b => {
            const delLog = b.history.slice().reverse().find((h: any) => h.action === 'Deleted');
            return (delLog?.details || 'Unknown') === reasonFilter;
        });
    }, [myDeleted, reasonFilter]);

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <select
                    value={reasonFilter}
                    onChange={e => setReasonFilter(e.target.value)}
                    style={{ background: '#222', color: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444' }}
                >
                    <option value="All">All Reasons</option>
                    {uniqueReasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredList.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No deleted billings found.</div>
                ) : (
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                <th style={{ padding: '0.5rem' }}>Date Deleted</th>
                                <th style={{ padding: '0.5rem' }}>Particulars</th>
                                <th style={{ padding: '0.5rem' }}>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(b => {
                                const delLog = b.history.slice().reverse().find((h: any) => h.action === 'Deleted');
                                return (
                                    <tr key={b.id} style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '0.8rem 0.5rem', color: '#aaa' }}>
                                            {delLog ? new Date(delLog.timestamp).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td style={{ padding: '0.8rem 0.5rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{b.description}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{formatMoney(b.amount)}</div>
                                        </td>
                                        <td style={{ padding: '0.8rem 0.5rem', color: '#ef4444' }}>
                                            {delLog?.details || 'Unknown'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const LearnerAccountCore = ({ studentId, onClose, auditingContext, mode = 'bursar', isPage = false }: { studentId: number, onClose?: () => void, auditingContext?: string, mode?: 'bursar' | 'student' | 'director', isPage?: boolean }) => {
    const isStudentView = mode === 'student';
    const isDirectorView = mode === 'director';
    const { filteredStudents: students, setStudents, services, filteredProgrammes: programmes, filteredPayments: payments, filteredBillings: billings, filteredDeletedBillings: deletedBillings, unclaimedPayments, bursaries, addPayment, updatePayment, deletePayment, deleteBilling, updateBilling, financialSettings, accounts, manualPaymentMethods, generateAutomaticBillings, addBilling, documentTemplates, schoolProfile, logGlobalAction, isProcessingPromotion, paymentIntegrations, activeRole } = useSchoolData();
    const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    // --- MODAL STATES Matching LearnersPage ---
    const [entryLevelFilter, setEntryLevelFilter] = useState<string>('Current');
    const [showTransModal, setShowTransModal] = useState(false);
    const [showClearanceHistory, setShowClearanceHistory] = useState(false);
    const [showFixBalance, setShowFixBalance] = useState(false);
    const [fixReason, setFixReason] = useState('System Correction');
    const [otherFixReason, setOtherFixReason] = useState(''); // New state for custom reason
    const [showReqHistory, setShowReqHistory] = useState(false);
    const [openReqMenu, setOpenReqMenu] = useState<string | null>(null);
    const [txLimit, setTxLimit] = useState(20);

    // Delete/Edit States
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'transaction' | 'bursary' | 'service' | 'billing' | 'payment', id: string } | null>(null);
    const [deleteReason, setDeleteReason] = useState(DELETE_REASONS[0]);
    const [otherReason, setOtherReason] = useState('');
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [reviewTx, setReviewTx] = useState<any>(null); // Transaction being reviewed for approval

    // --- INITIALIZATION ---
    useEffect(() => {
        const s = students.find(st => st.id === studentId);
        if (s) {
            setSelectedStudent(s);
            if (auditingContext) {
                setEntryLevelFilter(auditingContext);
            } else {
                setEntryLevelFilter('Current');
            }
            setTxLimit(20);

            // Auto-scroll to top of modal content
            const modalBody = document.getElementById('learner-modal-body');
            if (modalBody) modalBody.scrollTop = 0;
        }
    }, [studentId, students, auditingContext]);

    // --- VIEW CONTEXT (Snapshot vs Current) ---
    const viewContext = useMemo(() => {
        if (!selectedStudent) return { isCurrent: true, targetTerm: '', startPrevBal: 0, requirements: [], bursaryId: 'none', servicesIds: [] };

        const isCurrent = entryLevelFilter === 'Current' || entryLevelFilter === selectedStudent.semester;
        const targetTerm = isCurrent ? selectedStudent.semester : entryLevelFilter;

        // Find relevant history records
        const startHistory = selectedStudent.promotionHistory?.find(h => h.toSemester === targetTerm);
        const endHistory = selectedStudent.promotionHistory?.find(h => h.fromSemester === targetTerm);

        // Start Balance Calculation
        let startPrevBal = 0;
        if (startHistory) {
            startPrevBal = startHistory.previousBalance;
        } else if (isCurrent) {
            startPrevBal = selectedStudent.previousBalance || 0;
        } else if (endHistory?.initialPreviousBalance !== undefined) {
            startPrevBal = endHistory.initialPreviousBalance;
        }

        // Requirements & Bursary (End-of-Term Snapshot)
        const requirements = endHistory ? (endHistory.requirementsSnapshot || []) : (selectedStudent.physicalRequirements || []);

        // Bursary Snapshot
        const bursaryId = endHistory ? endHistory.bursarySnapshot : selectedStudent.bursary;

        // Services Snapshot
        const servicesIds = endHistory ? (endHistory.servicesSnapshot || []) : selectedStudent.services;

        return { isCurrent, targetTerm, startPrevBal, requirements, bursaryId, servicesIds };
    }, [selectedStudent, entryLevelFilter]);

    // Self-healing: Ensure billings exist for the current student execution context
    useEffect(() => {
        if (!selectedStudent) return;

        // NEW: Persistence Check (Respect "Zero" State if already billed this term)
        if (selectedStudent.lastBilledTerm === selectedStudent.semester) return;

        // Check if billings exist for the current semester
        const hasBillings = billings.some(b => b.studentId === selectedStudent.id && b.term === selectedStudent.semester);

        if (!hasBillings) {
            console.log("Self-healing: Generating missing billings for", selectedStudent.name);
            generateAutomaticBillings(selectedStudent);
        }
    }, [selectedStudent?.id, selectedStudent?.semester, selectedStudent?.lastBilledTerm]);

    // Map Transactions (Payments + Billings)
    // Map Transactions (Payments + Billings) with Filtering
    useEffect(() => {
        if (!selectedStudent) return;

        const { targetTerm, startPrevBal, isCurrent } = viewContext;

        // 1. Map Payments (Credits) - Filter by Term
        const studentPayments = payments
            .filter(p => p.studentId === selectedStudent.id && (p.term === targetTerm || (!p.term && isCurrent)))
            .map(p => ({
                id: p.id,
                date: p.date,
                amount: p.amount,
                type: (p.method as any) || 'cash',
                studentName: selectedStudent.name,
                term: p.term || selectedStudent.semester,
                mode: p.method,
                particulars: p.allocations ? Object.keys(p.allocations).join(', ') : 'Payment',
                allocations: p.allocations,
                description: p.description || '',
                reference: p.reference,
                studentId: p.studentId, // PRESERVE ID TO PREVENT DISAPPEARANCE
                history: p.history || [], // PRESERVE HISTORY
                receiptNumber: p.receiptNumber,
                status: p.status,
                txType: 'payment',
                isPseudo: false
            }));

        // 2. Map Billings (Debits) - Filter by Term
        const studentBillings = billings
            .filter(b => b.studentId === selectedStudent.id && b.term === targetTerm)
            .map(b => ({
                id: b.id,
                date: b.date,
                amount: b.amount,
                type: 'Billed',
                studentName: selectedStudent.name,
                term: b.term,
                mode: 'Billed',
                particulars: b.type === 'Tuition' ? 'Tuition Fee' : b.description,
                allocations: null as any,
                description: b.description,
                reference: null as string | null,
                studentId: b.studentId, // PRESERVE ID
                history: b.history || [], // PRESERVE HISTORY
                status: b.status,
                txType: 'billing',
                isPseudo: false
            }));

        // 2b. Inject Previous Balance as Billing (Only if applicable to this term context)
        // If we have a concrete B/F Bill (in studentBillings), we don't need this pseudo record.
        const hasBFBill = studentBillings.some(b => isArrearsKey(b.particulars || '') || isArrearsKey(b.description || ''));

        if (!hasBFBill && startPrevBal && startPrevBal > 0) {
            studentBillings.push({
                id: 'prev-bal-' + selectedStudent.id + '-' + targetTerm,
                date: selectedStudent.enrollmentDate || '2020-01-01',
                amount: startPrevBal,
                type: 'Billed',
                studentName: selectedStudent.name,
                term: targetTerm,
                mode: 'Billed',
                particulars: 'Brought Forward',
                allocations: null,
                description: 'Balance brought forward',
                reference: 'B/F',
                isPseudo: true
            });
        }

        console.log('Transaction Update:', {
            studentId: selectedStudent.id,
            term: targetTerm,
            totalTransactions: studentPayments.length + studentBillings.length
        });

        // 3. Merge & Sort
        setTransactions([...studentPayments, ...studentBillings]);
    }, [selectedStudent, payments, billings, viewContext]);

    // --- FINANCIALS FOR RIGHT SIDE (DYNAMIC - CONTEXT AWARE) ---
    const financialSummary = useMemo(() => {
        if (!selectedStudent) return { outstandingBalance: 0, clearancePaid: 0, clearanceTarget: 0 };
        const { targetTerm } = viewContext;

        const summary = calculateStudentFinancials(
            selectedStudent,
            billings,
            payments,
            bursaries,
            targetTerm
        );

        return summary;
    }, [selectedStudent, billings, payments, bursaries, viewContext]);

    const outstandingBalance = financialSummary.outstandingBalance;
    const arrears = outstandingBalance;

    // Calculate Total Billing
    const totalBilling = useMemo(() => {
        if (!selectedStudent) return 0;
        const { targetTerm, bursaryId } = viewContext;

        const studentBillings = billings.filter(b => b.studentId === selectedStudent.id && b.term === targetTerm);
        const totalBills = studentBillings.reduce((sum, b) => sum + b.amount, 0);
        const bursaryValue = bursaryId && bursaryId !== 'none' ? (bursaries.find(b => b.id === bursaryId)?.value || 0) : 0;

        return totalBills - bursaryValue;
    }, [selectedStudent, billings, bursaries, viewContext]);

    // Calculate Clearance Ring Percentage (Strict Formula: Tuition Paid / (Tuition Bill + Prev Balance - Bursary))
    // ALWAYS STATIC FOR CURRENT SEMESTER (Ignores history view filter)
    const clearancePercentage = useMemo(() => {
        if (!selectedStudent) return 0;

        // Note: For the "Ring", we always use the student's current semester financials
        const currentSummary = calculateStudentFinancials(
            selectedStudent,
            billings,
            payments,
            bursaries,
            selectedStudent.semester
        );

        if (currentSummary.clearanceTarget <= 0) return 100;
        const pct = (currentSummary.clearancePaid / currentSummary.clearanceTarget) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [selectedStudent, billings, payments, bursaries]);

    if (!selectedStudent) return null;

    // --- HANDLERS ---

    const handleStatusChangeWithReason = (status: 'clearance' | 'defaulter' | 'probation') => {
        if (selectedStudent.accountStatus === status) return;
        const reason = prompt("Enter reason for status change:", "Manual Update");
        if (reason) {
            const historyEntry = {
                date: new Date().toLocaleString(),
                status: (status === 'clearance' ? 'cleared' : status) as 'cleared' | 'probation' | 'defaulter',
                reason: reason,
                user: 'Bursar',
                isManual: true
            };
            const newHistory = [...(selectedStudent.clearanceHistory || []), historyEntry];
            const updated: EnrolledStudent = { ...selectedStudent, accountStatus: status, clearanceHistory: newHistory };
            setSelectedStudent(updated);
            setStudents(prev => prev.map(s => s.id === updated.id ? { ...updated, origin: s.origin } : s));
        }
    };

    const updateReq = (reqName: string, change: number) => {
        if (!selectedStudent.physicalRequirements) return;

        // Log History
        const entry = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(), // Simple Timestamp
            quantity: Math.abs(change),
            change: change,
            action: change > 0 ? 'Received Item' : 'Removed Item'
        };

        const updatedReqs = selectedStudent.physicalRequirements.map(r => {
            if (r.name === reqName) {
                const newBrought = Math.max(0, r.brought + change);
                return {
                    ...r,
                    brought: newBrought,
                    entries: [entry, ...(r.entries || [])]
                };
            }
            return r;
        });

        const updatedStudent = { ...selectedStudent, physicalRequirements: updatedReqs };
        setSelectedStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
    };

    const deleteReqEntry = (itemName: string, entryId: string) => {
        if (!selectedStudent.physicalRequirements) return;
        if (!confirm("Are you sure you want to delete this entry? The requirement count will be adjusted accordingly.")) return;

        const updatedReqs = selectedStudent.physicalRequirements.map(r => {
            if (r.name === itemName) {
                const entryToDelete = r.entries?.find(e => e.id === entryId);
                if (!entryToDelete) return r;

                // Reverse the change
                const changeAmount = entryToDelete.change || 0;
                const newBrought = Math.max(0, r.brought - changeAmount);
                return {
                    ...r,
                    brought: newBrought,
                    entries: r.entries?.filter(e => e.id !== entryId) || []
                };
            }
            return r;
        });

        const updatedStudent = { ...selectedStudent, physicalRequirements: updatedReqs };
        setSelectedStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
    };

    const handleTransactionSuccess = (newPayment: Payment) => {
        // Handled by store, we just close/reset
        setEditingPayment(null);
        setShowTransModal(false);
    };

    // --- FIX BALANCE LOGIC ---
    const handleFixBalanceSubmit = (targetBalance: number, reason: string) => {
        if (!selectedStudent) return;

        // Let's use the 'outstandingBalance' we calculated earlier in the component
        // Note: access via closure is fine.
        const currentLiveBalance = outstandingBalance;

        const diff = targetBalance - currentLiveBalance;

        if (diff === 0) {
            alert("Target balance matches current balance. No fix needed.");
            return;
        }

        const isCredit = diff < 0; // We need to reduce balance -> Credit
        const absDiff = Math.abs(diff);

        // Customize description based on reason
        const description = `${reason} (${isCredit ? 'Credit' : 'Debit'})`;

        if (confirm(`Confirm Correction:\n\nCurrent Balance: ${formatMoney(currentLiveBalance)}\nTarget Balance: ${targetBalance}\n\nCorrection: ${isCredit ? 'Credit' : 'Debit'} of ${formatMoney(absDiff)}\nReason: ${reason}\n\nProceed?`)) {
            if (isCredit) {
                // To REDUCE debt, we add a "Payment" (Credit Adjustment)
                const correctionPayment: Payment = {
                    id: `FIX_BAL_${Date.now()}`,
                    studentId: selectedStudent.id,
                    amount: absDiff,
                    date: new Date().toISOString(),
                    method: 'Adjustment',
                    type: 'adjustment', // AUDIT TAG
                    reference: `FIX_BAL_${Date.now()}`,
                    description: reason,
                    term: selectedStudent.semester,
                    allocations: {}, // No specifics
                    receiptNumber: 'ADJ-' + Date.now().toString().slice(-6),
                    recordedBy: 'BURSAR', // Should come from context
                    history: []
                };
                addPayment(correctionPayment);
            } else {
                // To INCREASE debt, we add a "Billing" (Debit Adjustment)
                addBilling({
                    id: `FIX_BAL_${Date.now()}`,
                    studentId: selectedStudent.id,
                    programmeId: selectedStudent.programme,
                    level: selectedStudent.level,
                    term: selectedStudent.semester,
                    type: 'Adjustment',
                    description: reason,
                    amount: absDiff,
                    paidAmount: 0,
                    balance: absDiff,
                    date: new Date().toISOString().split('T')[0],
                    status: 'Pending',
                    history: [],
                    isBroughtForward: false // It's a correction, not a BF
                });
            }
            logGlobalAction('Balance Correction', `Applied ${isCredit ? 'Credit' : 'Debit'} adjustment of ${absDiff} to ${selectedStudent.name}. Reason: ${reason}`);
            alert("Balance correction applied successfully.");
            setShowFixBalance(false);
            onClose(); // Close the main modal upon fix completion
        }
    };


    const handlePostToPortal = async () => {
        if (!selectedStudent) return;
        setIsPosting(true);

        // Simulate a small delay for premium feel
        await new Promise(r => setTimeout(r, 800));

        const now = new Date().toLocaleString();
        const updatedStudent = {
            ...selectedStudent,
            postHistory: [now, ...(selectedStudent.postHistory || []).slice(0, 4)]
        };

        setSelectedStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
        setIsPosting(false);
        alert(`Account view for ${selectedStudent.name} has been posted to the student portal successfully.`);
    };

    const handleApproveTransaction = (tx: any) => {
        // Instead of immediate approval, we open the Forensic Approval Form
        setReviewTx({
            ...tx,
            studentName: selectedStudent?.name || 'Unknown Student',
            txType: tx.receiptNumber ? 'payment' : 'billing'
        });
    };

    const handleFinalApproval = (directorNote: string, files: string[]) => {
        if (!reviewTx) return;

        // Find the ORIGINAL object from the store to prevent property loss/corruption
        const originalTx = payments.find(p => p.id === reviewTx.id);

        if (!originalTx) {
            console.error("Original transaction not found for approval:", reviewTx.id);
            alert("Error: Original transaction record could not be found. Please refresh and try again.");
            setReviewTx(null);
            return;
        }

        const updates: any = {
            ...originalTx, // Use the full original object
            status: 'Approved',
            directorNote: directorNote,
            attachments: [...(originalTx.attachments || []), ...files],
            approvedAt: new Date().toISOString(),
            history: [...(originalTx.history || []), {
                id: 'log_' + Date.now(),
                action: 'Approved',
                details: `Director approved payment. Note: ${directorNote}`,
                user: 'Director',
                timestamp: new Date().toISOString()
            }]
        };

        console.log("Processing Approval for Payment:", { id: originalTx.id, updates });
        updatePayment(updates);

        logGlobalAction('Transaction Approved', `Director approved ${originalTx.particulars || originalTx.description} for ${selectedStudent?.name}. Note: ${directorNote}`);
        setReviewTx(null);
    };

    const handleSyncSystems = async () => {
        const schoolPayInteg = paymentIntegrations.find(p => p.name.toLowerCase().includes('schoolpay'));
        if (!schoolPayInteg || schoolPayInteg.status !== 'active') {
            alert("SchoolPay integration is not active or not found. Please configure it in Payment Modes settings.");
            return;
        }

        if (!confirm("This will perform a global sync of all SchoolPay transactions from the last 14 days for ALL students. Current records will be automatically linked and transaction histories updated. Continue?")) return;

        setIsSyncing(true);
        try {
            // Fetch last 14 days to be safer against older processed payments
            const fromDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const toDate = new Date().toISOString().split('T')[0];

            const results = await schoolPayService.syncRange(
                schoolPayInteg.merchantId!,
                schoolPayInteg.apiKey!,
                fromDate,
                toDate
            );

            if (results.returnCode !== 0) {
                alert(`SchoolPay Error: ${results.returnMessage}`);
                return;
            }

            const allTxs = [...(results.transactions || []), ...(results.supplementaryFeePayments || [])];
            let newLinkedCount = 0;
            let alreadyExistsCount = 0;

            allTxs.forEach(tx => {
                const receiptNo = tx.schoolpayReceiptNumber?.trim();
                if (!receiptNo) return;

                // 1. DEEP DEDUPLICATION: Check both existing payments and unclaimed payments
                const existingInPayments = payments.find(p => p.reference === receiptNo);
                const existingInUnclaimed = unclaimedPayments.find(p => p.id?.includes(receiptNo) || p.reference === receiptNo);

                // 2. RESILIENT MATCHING: Normalized Pay Code check
                const student = students.find(s => {
                    const sCode = String(s.payCode || '').trim();
                    const txCode = String(tx.studentPaymentCode || '').trim();
                    return sCode !== '' && txCode !== '' && sCode === txCode;
                });

                // CASE A: Transaction already exists in the student's linked payments
                if (existingInPayments) {
                    // Update Student ID if missing for some reason (Self-Healing)
                    if (existingInPayments.studentId === 0 && student) {
                        updatePayment({
                            ...existingInPayments,
                            studentId: student.id,
                            term: existingInPayments.term === 'Unknown' ? student.semester : existingInPayments.term,
                            status: 'approved'
                        });
                        newLinkedCount++;
                    } else {
                        alreadyExistsCount++;
                    }
                    return;
                }

                // CASE B: Already in "Unclaimed" - Attempt to promote it to a student
                if (existingInUnclaimed && student) {
                    const promotedPayment: Payment = {
                        ...existingInUnclaimed,
                        studentId: student.id,
                        status: 'approved',
                        term: student.semester, // Ensure it hits the current semester history
                        history: [...(existingInUnclaimed.history || []), {
                            id: generateId(),
                            action: 'Linked',
                            details: 'Automatically linked via Pay Code match during global sync',
                            user: 'System',
                            timestamp: new Date().toISOString()
                        }]
                    };
                    addPayment(promotedPayment); // This should move it internally
                    newLinkedCount++;
                    return;
                }

                // CASE C: Pure New Transaction
                const newPayment: Payment = {
                    id: `sp_sync_${receiptNo}`,
                    studentId: student ? student.id : 0, // 0 means unlinked but recorded
                    amount: parseFloat(tx.amount),
                    date: tx.paymentDateAndTime,
                    method: 'SchoolPay',
                    reference: receiptNo,
                    particulars: `Sync: ${tx.sourcePaymentChannel || 'Channel'}`,
                    description: tx.supplementaryFeeDescription || 'School Fees',
                    term: student ? student.semester : 'Unknown',
                    status: 'approved',
                    recordedBy: 'SchoolPay System',
                    metadata: {
                        syncSource: 'Global Sync (Automatic)',
                        payCode: tx.studentPaymentCode,
                        bankName: tx.settlementBank
                    },
                    history: [{
                        id: generateId(),
                        action: 'Created',
                        details: student ? `Auto-linked to ${student.name} via sync.` : 'Added to unclaimed during sync.',
                        user: 'System',
                        timestamp: new Date().toISOString()
                    }]
                };

                addPayment(newPayment);
                if (student) newLinkedCount++;
            });

            alert(`Sync Successful!\n\nFound: ${allTxs.length} records.\nAutomatically Linked/Updated: ${newLinkedCount} payments.\nDuplicate Skips: ${alreadyExistsCount}`);
            logGlobalAction('Global Sync Completed', `SchoolPay sync processed ${allTxs.length} records. ${newLinkedCount} payments were successfully linked to students.`);
        } catch (error) {
            console.error('Core Sync Error:', error);
            alert("Sync Failed: The connection to SchoolPay was interrupted. Check your API settings and retry.");
        } finally {
            setIsSyncing(false);
        }
    };

    const initiateDelete = (type: 'transaction' | 'bursary' | 'service' | 'billing' | 'payment', id: string) => {
        setDeleteTarget({ type, id });
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        if (selectedStudent.status === 'graduated') {
            alert("Financial records for graduated students cannot be modified.");
            return;
        }

        const finalReason = deleteReason === 'Other' ? (otherReason || 'Other (No reason given)') : deleteReason;

        if (deleteTarget.type === 'transaction' || deleteTarget.type === 'payment') {
            deletePayment(deleteTarget.id, finalReason);
        } else if (deleteTarget.type === 'billing') {
            deleteBilling(deleteTarget.id, finalReason);
        } else if (deleteTarget.type === 'bursary') {
            const updated = { ...selectedStudent, bursary: 'none' };
            setStudents(prev => prev.map(s => s.id === updated.id ? { ...updated, origin: s.origin } : s));
            setSelectedStudent(updated);
        } else if (deleteTarget.type === 'service') {
            // Find and delete associated billings for this service in the current semester
            const service = services.find(s => s.id === deleteTarget.id);
            if (service) {
                const billingsToDelete = billings.filter(b =>
                    b.studentId === selectedStudent.id &&
                    b.term === selectedStudent.semester &&
                    b.type === 'Service' &&
                    // Use includes for broader matching as descriptions might vary slightly
                    b.description.includes(service.name)
                );

                billingsToDelete.forEach(b => deleteBilling(b.id, `Removed Service: ${service.name} - ${finalReason}`));
            }

            const updated = { ...selectedStudent, services: selectedStudent.services.filter(s => s !== deleteTarget.id) };
            setStudents(prev => prev.map(s => s.id === updated.id ? { ...updated, origin: s.origin } : s));
            setSelectedStudent(updated);
        }
        setShowDeleteModal(false);
        setOtherReason(''); // Reset
    };

    const handleApplyBursary = (bid: string) => {
        if (selectedStudent.status === 'graduated') {
            alert("Cannot apply bursaries to a graduated student.");
            return;
        }

        if (bid === 'none') {
            // Handle removal? Usually purely selection
        } else {
            if (!confirm("Are you sure you want to apply this bursary?")) return;
        }

        const updated = { ...selectedStudent, bursary: bid };
        setStudents(prev => prev.map(s => s.id === updated.id ? { ...updated, origin: s.origin } : s));
        setSelectedStudent(updated);
        // Bursary changes affect current arrears calculation automatically
    };

    const handleBillService = (sid: string) => {
        // Find the service
        const service = services.find(s => s.id === sid);
        if (!service) return;

        // CHECK 1: Is it already in the list? (Legacy check)
        if (selectedStudent.services.includes(sid)) {
            alert("This service is already in the student's list.");
            return;
        }

        // CHECK 2: Is it already BILLED in the current semester? (Strict duplicate prevention)
        const existingBilling = billings.find(b =>
            b.studentId === selectedStudent.id &&
            b.term === selectedStudent.semester &&
            b.type === 'Service' &&
            b.description.includes(service.name) // Matching by name is safest given current data structure
        );

        if (existingBilling) {
            alert(`This service (${service.name}) has already been billed to this student for the current semester.`);
            return;
        }

        // CONFIRMATION
        if (!confirm(`Are you sure you want to bill ${service.name} (${formatMoney(service.cost)}) to this student?`)) return;

        // Create a billing for this service
        const newBilling = {
            id: crypto.randomUUID(),
            studentId: selectedStudent.id,
            programmeId: selectedStudent.programme,
            level: selectedStudent.level,
            term: selectedStudent.semester,
            type: 'Service' as const,
            description: `Service: ${service.name}`,
            amount: service.cost,
            paidAmount: 0,
            balance: service.cost,
            date: new Date().toISOString(),
            status: 'Pending' as const,
            history: [{
                id: crypto.randomUUID(),
                action: 'Created',
                details: 'Service billing added manually',
                user: 'Bursar',
                timestamp: new Date().toISOString()
            }]
        };

        addBilling(newBilling);

        // Update student services
        const updated = { ...selectedStudent, services: [...selectedStudent.services, sid] };
        setStudents(prev => prev.map(s => s.id === updated.id ? { ...updated, origin: s.origin } : s));
        setSelectedStudent(updated);
    };

    const handleEditTransaction = (tx: any) => {
        // Find existing payment
        const originalPayment = payments.find(p => String(p.id) === String(tx.id));
        if (originalPayment) {
            setEditingPayment(originalPayment);
            setShowTransModal(true);
        }
    };

    const printReportingForm = () => {
        if (!selectedStudent || isStudentView) return;

        const prog = programmes.find(p =>
            p.id === selectedStudent.programme ||
            p.name.toLowerCase().trim() === (selectedStudent.programme || "").toLowerCase().trim()
        );

        // Template Selection (Strict matching to avoid picking the wrong programme's template)
        // 1. Try to find a template specifically assigned to this programme ID
        let template = documentTemplates.find(t => t.type === 'CLEARANCE' && (t as any).programmeId === prog?.id);

        // 2. If not found, try to find a GLOBAL template marked as default (no programmeId)
        if (!template) template = documentTemplates.find(t => t.type === 'CLEARANCE' && t.isDefault && (!t.programmeId || t.programmeId === ''));

        // 3. If still not found, try any GLOBAL template (no programmeId)
        if (!template) template = documentTemplates.find(t => t.type === 'CLEARANCE' && (!t.programmeId || t.programmeId === ''));

        // 4. Final desperate fallback: first available CLEARANCE template (might be wrong, but better than nothing)
        if (!template) template = documentTemplates.find(t => t.type === 'CLEARANCE');

        if (!template) {
            console.error("No suitable template found for CLEARANCE");
            return alert("No Reporting/Clearance Form template found in system.");
        }

        let content = template.sections.sort((a, b) => a.order - b.order).map(s => s.content).join('');

        // Logo Logic
        const specificLogo = typeof window !== 'undefined' ? localStorage.getItem(`logo_${template.id}`) : null;
        const globalLogo = schoolProfile?.logo || (typeof window !== 'undefined' ? localStorage.getItem('school_logo') : null);
        const activeLogo = specificLogo || globalLogo;
        const logoHtml = activeLogo ? `<img src="${activeLogo}" style="max-height: 80px; width: auto; display: block; margin: 0 auto 10px auto;" />` : '';

        // Calculations for Placeholder Values
        const currentBillings = billings.filter(b => b.studentId === selectedStudent.id && b.term === selectedStudent.semester);
        const currentPayments = payments.filter(p => p.studentId === selectedStudent.id && (p.term === selectedStudent.semester || !p.term));

        // 1. Compulsory Services List (Derived from Programme Fee Structure)
        const feeStruct = prog?.feeStructure?.find(fs => fs.level === selectedStudent.level) || prog?.feeStructure?.[0];
        const compulsoryIds = feeStruct?.compulsoryServices || [];
        const compulsoryServices = services.filter(s => compulsoryIds.includes(s.id));
        const compulsoryListHtml = `<ul style="margin: 0; padding: 0; list-style: none;">` +
            compulsoryServices.map(s => {
                const totalAllocated = currentPayments.reduce((acc, p) => acc + (p.allocations?.[s.name] || 0), 0);
                const status = totalAllocated >= s.cost ? '<span style="color: green; font-weight: bold;">[ FULLY PAID ]</span>' :
                    totalAllocated > 0 ? `<span style="color: orange; font-weight: bold;">[ PARTIAL: ${formatMoney(totalAllocated)} ]</span>` :
                        '<span style="color: red; font-weight: bold;">[ UNPAID ]</span>';
                return `<li style="margin-bottom: 5px;">${s.name}: ${status}</li>`;
            }).join('') + `</ul>`;

        // 2. Optional Services List
        const optionalServices = services.filter(s => !compulsoryIds.includes(s.id) && selectedStudent.services.includes(s.id));
        const optionalListHtml = optionalServices.length > 0 ?
            `<ul style="margin: 0; padding: 0; list-style: none;">` +
            optionalServices.map(s => {
                const totalAllocated = currentPayments.reduce((acc, p) => acc + (p.allocations?.[s.name] || 0), 0);
                const status = totalAllocated >= s.cost ? '<span style="color: green; font-weight: bold;">[ FULLY PAID ]</span>' :
                    totalAllocated > 0 ? `<span style="color: orange; font-weight: bold;">[ PARTIAL: ${formatMoney(totalAllocated)} ]</span>` :
                        '<span style="color: red; font-weight: bold;">[ UNPAID ]</span>';
                return `<li style="margin-bottom: 5px;">${s.name}: ${status}</li>`;
            }).join('') + `</ul>` : 'No optional services subscribed.';

        // 3. Arrears Settlement (B/F)
        const bfBillings = currentBillings.filter(b => isArrearsKey(b.description || b.type || ""));
        const totalBfBilled = bfBillings.reduce((s, b) => s + b.amount, 0) || (selectedStudent.previousBalance || 0);
        const totalBfAllocated = currentPayments.reduce((acc, p) => {
            const alloc = p.allocations || {};
            const bfKey = Object.keys(alloc).find(k => isArrearsKey(k));
            return acc + (bfKey ? (alloc[bfKey] || 0) : 0);
        }, 0);

        const bfRate = totalBfBilled > 0 ? (totalBfAllocated / totalBfBilled) * 100 : 100;
        const bfStatusHtml = totalBfBilled > 0 ?
            `<div style="font-weight: bold;">${bfRate >= 100 ? '<span style="color: green;">FULLY SETTLED (100%)</span>' :
                `<span style="color: orange;">PARTIALLY SETTLED (${bfRate.toFixed(1)}%)</span>`}</div>
            <div style="font-size: 10px; color: #666;">Allocated: ${formatMoney(totalBfAllocated)} / Total: ${formatMoney(totalBfBilled)}</div>` :
            '<span style="color: green; font-weight: bold;">NO ARREARS</span>';

        // 4. Requirements Summary
        const reqSummaryHtml = selectedStudent.physicalRequirements && selectedStudent.physicalRequirements.length > 0 ?
            `<table style="width: 100%; border-collapse: collapse; margin-top: 5px;">` +
            selectedStudent.physicalRequirements.map(r => `
                <tr>
                    <td style="padding: 4px; border-bottom: 1px solid #eee;">${r.name}</td>
                    <td style="padding: 4px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: ${r.brought >= r.required ? 'green' : 'red'};">
                        ${r.brought} / ${r.required} ${r.brought >= r.required ? '✅' : '❌'}
                    </td>
                </tr>
            `).join('') + `</table>` : 'No physical requirements recorded.';

        // Replacements for Clearance template
        const replacements: Record<string, string> = {
            '{{institution_name}}': schoolProfile?.name || 'Vine International Institute',
            '{{institution_address}}': schoolProfile?.poBox || 'P.O. Box 000, Kampala',
            '{{institution_contact}}': schoolProfile?.phone || schoolProfile?.email || '',
            '{{institution_email}}': schoolProfile?.email || '',
            '{{programme_logo}}': logoHtml,
            '{{student_name}}': selectedStudent.name,
            '{{pay_code}}': selectedStudent.payCode || 'N/A',
            '{{programme_name}}': prog?.name || selectedStudent.programme || '',
            '{{current_level}}': selectedStudent.semester,
            '{{clearance_status}}': selectedStudent.accountStatus?.toUpperCase() || 'UNKNOWN',
            '{{financial_percentage}}': clearancePercentage.toFixed(1) + '%',
            '{{compulsory_services_list}}': compulsoryListHtml,
            '{{optional_services_list}}': optionalListHtml,
            '{{bf_clearance_rate}}': bfStatusHtml,
            '{{requirements_summary}}': reqSummaryHtml,
            '{{current_date}}': new Date().toLocaleDateString(),
            '{{balance}}': formatMoney(arrears),
            '{{bursar_name}}': activeRole === 'Director' ? 'The Director' : 'The Institute Bursar'
        };

        // Robust Replacement Logic (handles optional spaces inside braces)
        Object.entries(replacements).forEach(([key, val]) => {
            const cleanKey = key.replace(/[{} ]/g, '');
            const pattern = new RegExp(`\\{\\{\\s*${cleanKey}\\s*\\}\\}`, 'g');
            content = content.replace(pattern, val === undefined ? '' : String(val));
        });

        // 3. Printing Logic (Direct Window for Mobile Stability)
        const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                    <head>
                        <title>Report - ${selectedStudent.name}</title>
                        <style>
                            @media print { 
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                                .no-print { display: none; }
                            }
                            body { 
                                padding: 15mm; 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                color: #000; 
                                background: #fff; 
                                line-height: 1.4; 
                                -webkit-font-smoothing: antialiased;
                            }
                            img { max-width: 100%; height: auto; }
                            table { width: 100%; border-collapse: collapse; }
                        </style>
                    </head>
                    <body>
                        <div id="print-content" style="visibility: visible; opacity: 1;">${content}</div>
                        <script>
                            window.onload = function() {
                                // Increased timeout for images and font rendering on mobile
                                setTimeout(function() {
                                    window.print();
                                    // Keep window open for a short while after print dialog closes
                                    setTimeout(function() { window.close(); }, 1500);
                                }, 1200);
                            }
                        </script>
                    </body>
                    </html>
                `);
                win.document.close();
            } else {
                alert("Please allow popups to print. Tap the 'Options' icon if printing is blocked.");
            }
        } else {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.top = '0';
            iframe.style.width = '1px'; iframe.style.height = '1px';
            iframe.style.opacity = '0.01'; iframe.style.pointerEvents = 'none'; iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(`
                    <html>
                    <head>
                        <style>
                            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                            body { padding: 15mm; font-family: sans-serif; color: #000; background: #fff; line-height: 1.4; }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    setTimeout(function() { 
                                        if (window.frameElement) window.frameElement.parentNode.removeChild(window.frameElement); 
                                    }, 1000);
                                }, 500);
                            }
                        </script>
                    </body>
                    </html>
                `);
                doc.close();
            }
        }
    };


    const printReceipt = (tx: any) => {
        if (!selectedStudent || isStudentView) return;

        const payment = payments.find(p => String(p.id) === String(tx.id));
        if (!payment) return alert("Original payment record not found.");

        const prog = programmes.find(p =>
            p.id === selectedStudent.programme ||
            p.name.toLowerCase().trim() === (selectedStudent.programme || "").toLowerCase().trim()
        );

        // Template Selection (STRICT)
        let template = documentTemplates.find(t => t.type === 'RECEIPT' && (t as any).programmeId === prog?.id);
        if (!template) template = documentTemplates.find(t => t.type === 'RECEIPT' && t.isDefault);
        if (!template) template = documentTemplates.find(t => t.type === 'RECEIPT' && (!t.programmeId || t.programmeId === ''));

        if (!template) return alert("No Receipt template found in system.");

        let content = template.sections.sort((a, b) => a.order - b.order).map(s => s.content).join('');

        // Logo Logic
        const specificLogo = typeof window !== 'undefined' ? localStorage.getItem(`logo_${template.id}`) : null;
        const globalLogo = schoolProfile?.logo || (typeof window !== 'undefined' ? localStorage.getItem('school_logo') : null);
        const activeLogo = specificLogo || globalLogo;
        const logoHtml = activeLogo ? `<img src="${activeLogo}" style="max-height: 100px; width: auto; display: block; margin: 0 auto;" />` : '';

        // Replacements
        const replacements: Record<string, string> = {
            '{{receipt_number}}': payment.receiptNumber || payment.id,
            '{{transaction_id}}': payment.reference || payment.receiptNumber || payment.id, // Correct External Transaction ID
            '{{date}}': new Date(payment.date).toLocaleDateString(),
            '{{transaction_date}}': new Date(payment.date).toLocaleDateString(), // Legacy support
            '{{student_name}}': selectedStudent.name,
            '{{student_code}}': selectedStudent.id.toString(),
            '{{pay_code}}': selectedStudent.payCode || 'N/A', // Corrected Pay Code
            '{{programme_name}}': prog?.name || selectedStudent.programme || '',
            '{{amount}}': formatMoney(payment.amount),
            '{{transaction_amount}}': formatMoney(payment.amount), // Legacy support
            '{{amount_words}}': numberToWords(payment.amount),
            '{{amount_in_words}}': numberToWords(payment.amount), // Legacy support
            '{{balance}}': formatMoney(outstandingBalance),
            // Default to Particulars if available, else Description, else Generic
            '{{payment_description}}': payment.allocations ? Object.keys(payment.allocations).join(', ') : (payment.description || 'Tuition Payment'),
            '{{payment_particulars}}': payment.allocations ?
                `<table style="width: 100%; border-collapse: collapse; margin: 5px 0; font-size: inherit;">
                    ${Object.entries(payment.allocations).map(([key, val]) => `
                        <tr>
                            <td style="padding: 4px; border-bottom: 1px dotted #ccc;">${key}</td>
                            <td style="padding: 4px; border-bottom: 1px dotted #ccc; text-align: right; font-weight: bold;">${formatMoney(val as number)}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td style="padding: 6px 4px; text-align: right; font-weight: bold;">Total</td>
                        <td style="padding: 6px 4px; text-align: right; font-weight: bold;">${formatMoney(payment.amount)}</td>
                    </tr>
                </table>`
                : (payment.description || 'Payment'),
            '{{payment_method}}': payment.method,
            '{{transaction_particulars}}': payment.description || 'Tuition Payment', // Legacy support
            '{{clearance_percentage}}': clearancePercentage.toFixed(1) + '%', // New Clearance %
            '{{institution_name}}': schoolProfile?.name || 'Vine International Institute',
            '{{institution_address}}': schoolProfile?.poBox || 'P.O. Box 000, Kampala',
            '{{institution_contact}}': schoolProfile?.phone || schoolProfile?.email || '',
            '{{institution_email}}': schoolProfile?.email || '',
        };

        // Robust Replacement Logic (handles optional spaces inside braces)
        Object.entries(replacements).forEach(([key, val]) => {
            const cleanKey = key.replace(/[{} ]/g, '');
            const pattern = new RegExp(`\\{\\{\\s*${cleanKey}\\s*\\}\\}`, 'g');
            content = content.replace(pattern, val === undefined ? '' : String(val));
        });

        // 3. Printing Logic (Mobile-First Switch)
        const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                    <head>
                        <title>Receipt - ${payment.receiptNumber}</title>
                        <style>
                            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                            body { padding: 40px; font-family: sans-serif; color: #000; background: #fff; }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    setTimeout(function() { window.close(); }, 1500);
                                }, 1200);
                            }
                        </script>
                    </body>
                    </html>
                `);
                win.document.close();
            } else {
                alert("Please allow popups to print.");
            }
        } else {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.top = '0';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.opacity = '0.01';
            iframe.style.pointerEvents = 'none';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(`
                    <html>
                    <head>
                        <title>Receipt - ${payment.receiptNumber}</title>
                        <style>
                            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                            body { padding: 40px; font-family: sans-serif; color: #000; background: #fff; }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    setTimeout(function() { 
                                        if(window.frameElement) window.frameElement.parentNode.removeChild(window.frameElement); 
                                    }, 1000);
                                }, 500);
                            }
                        </script>
                    </body>
                    </html>
                `);
                doc.close();
            }
        }
    };





    const content = (
        <div
            id="learner-modal-body"
            className={`${isPage ? 'w-full min-h-screen' : 'w-full h-full md:w-[95%] md:max-w-[1400px] md:h-[90vh] md:rounded-3xl shadow-2xl'} flex flex-col overflow-hidden relative transition-all duration-500`}
            style={{
                padding: 0,
                border: isPage ? 'none' : PREMIUM_BORDER,
                background: isPage ? 'transparent' : '#05070a',
                boxShadow: isPage ? 'none' : '0 0 100px rgba(0,0,0,0.5), inset 0 0 40px rgba(59, 130, 246, 0.05)'
            }}
        >
            {/* Background Glows */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/${isPage ? '10' : '5'} blur-[120px] rounded-full pointer-events-none`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/${isPage ? '10' : '5'} blur-[120px] rounded-full pointer-events-none`}></div>

            <div className="relative z-10 flex flex-col h-full">
                <style>{`
                        .scrollbar-premium::-webkit-scrollbar { width: 4px; height: 4px; }
                        .scrollbar-premium::-webkit-scrollbar-track { background: transparent; }
                        .scrollbar-premium::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
                        .scrollbar-premium::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
                        
                        @keyframes ripple {
                            0% { transform: scale(0.8); opacity: 0.5; }
                            50% { transform: scale(1.2); opacity: 0.3; }
                            100% { transform: scale(0.8); opacity: 0.5; }
                        }

                        @keyframes fade-in {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }

                        @keyframes scale-up {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }

                        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                        .animate-scale-up { animation: scale-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    `}</style>

                {/* Audit Context Header */}
                {auditingContext && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem 2rem', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: '#3b82f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }}></span>
                            Auditing Context: {auditingContext}
                        </div>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <span>Snapshot Integrity: Verified</span>
                            <span>Historical Audit: Active</span>
                        </div>
                    </div>
                )}

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-white/5">
                    <div className="flex items-center gap-6">
                        <StatusRing
                            student={selectedStudent}
                            size={72}
                            percentage={clearancePercentage}
                            onClick={() => setShowClearanceHistory(true)}
                        />
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase m-0 leading-none">
                                {selectedStudent.name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                    ID: {selectedStudent.payCode || selectedStudent.id}
                                </span>
                                <div className="flex gap-1">
                                    {['clearance', 'defaulter', 'probation'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => !isStudentView && !isDirectorView && !isProcessingPromotion && handleStatusChangeWithReason(s as any)}
                                            className="px-2 py-0.5 rounded text-[0.6rem] font-black uppercase tracking-tighter transition-all"
                                            style={{
                                                background: selectedStudent.accountStatus === s
                                                    ? (s === 'clearance' ? 'rgba(16, 185, 129, 0.2)' : s === 'defaulter' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)')
                                                    : 'rgba(255,255,255,0.03)',
                                                color: selectedStudent.accountStatus === s
                                                    ? (s === 'clearance' ? '#10b981' : s === 'defaulter' ? '#ef4444' : '#a78bfa')
                                                    : 'rgba(255,255,255,0.2)',
                                                border: `1px solid ${selectedStudent.accountStatus === s
                                                    ? (s === 'clearance' ? 'rgba(16, 185, 129, 0.3)' : s === 'defaulter' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)')
                                                    : 'rgba(255,255,255,0.02)'}`,
                                                cursor: (isStudentView || isDirectorView || isProcessingPromotion) ? 'default' : 'pointer',
                                                boxShadow: selectedStudent.accountStatus === s ? `0 0 10px ${s === 'clearance' ? 'rgba(16, 185, 129, 0.1)' : s === 'defaulter' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)'}` : 'none'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isStudentView && !isDirectorView && (
                            <>
                                <button
                                    onClick={printReportingForm}
                                    disabled={isProcessingPromotion}
                                    className="px-6 py-2.5 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 group relative overflow-hidden"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <span className="relative z-10">🖨️ Reporting Form</span>
                                </button>
                                <button
                                    onClick={handlePostToPortal}
                                    disabled={isPosting || isProcessingPromotion}
                                    className="px-6 py-2.5 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 group relative overflow-hidden"
                                    style={{
                                        background: isPosting ? 'rgba(59, 130, 246, 0.1)' : PREMIUM_BLUE,
                                        color: 'white',
                                        border: 'none',
                                        boxShadow: isPosting ? 'none' : '0 8px 30px rgba(37, 99, 235, 0.4)'
                                    }}
                                >
                                    <span className="relative z-10">{isPosting ? '📡 Syncing...' : '🚀 Post to Portal'}</span>
                                    {!isPosting && (
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                                    )}
                                </button>
                            </>
                        )}
                        {!isStudentView && (
                            <button
                                onClick={onClose}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-white/40 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-1 overflow-y-auto p-3 md:p-8 flex flex-col md:grid md:grid-cols-[1.5fr_1fr] gap-4 md:gap-12">

                    {/* LEFT COLUMN */}
                    <div>
                        {/* TRANSACTIONS SECTION */}
                        <section className="mb-6 md:mb-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
                                <div className="flex flex-col sm:flex-row gap-2 md:gap-4 items-start sm:items-center">
                                    <h3 className="m-0 text-lg md:text-xl font-bold">Transaction History</h3>
                                    <select
                                        value={entryLevelFilter}
                                        onChange={e => setEntryLevelFilter(e.target.value)}
                                        className="touch-target px-3 py-2 text-xs md:text-sm rounded bg-slate-800 border border-slate-700 text-white"
                                    >
                                        <option value="Current">Current: {selectedStudent.semester}</option>
                                        {selectedStudent.promotionHistory?.slice().reverse().map((h, i) => (
                                            <option key={i} value={h.fromSemester}>
                                                {h.fromSemester} (Hist)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {!isStudentView && !isDirectorView && entryLevelFilter === 'Current' && (
                                        <>
                                            <button
                                                onClick={() => !isProcessingPromotion && setShowFixBalance(true)}
                                                className="px-3 py-1.5 text-[0.65rem] md:text-[0.7rem] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                                disabled={isProcessingPromotion}
                                                style={{
                                                    background: isProcessingPromotion ? '#1a1a1a' : 'rgba(239, 68, 68, 0.05)',
                                                    color: isProcessingPromotion ? '#444' : '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.1)',
                                                    cursor: isProcessingPromotion ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isProcessingPromotion ? '🔒 Locked' : '🔧 Fix Balance'}
                                            </button>
                                            <button
                                                onClick={() => { if (!isProcessingPromotion) { setEditingPayment(null); setShowTransModal(true); } }}
                                                className="px-3 py-1.5 text-[0.65rem] md:text-[0.7rem] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                                disabled={isProcessingPromotion}
                                                style={{
                                                    background: isProcessingPromotion ? '#1a1a1a' : 'rgba(255,255,255,0.05)',
                                                    color: isProcessingPromotion ? '#444' : '#fff',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    cursor: isProcessingPromotion ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isProcessingPromotion ? '🔒 Locked' : '＋ Add Payment'}
                                            </button>
                                            <button
                                                onClick={handleSyncSystems}
                                                className="px-3 py-1.5 text-[0.65rem] md:text-[0.7rem] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center gap-1"
                                                disabled={isProcessingPromotion || isSyncing}
                                                style={{
                                                    background: (isProcessingPromotion || isSyncing) ? '#1a1a1a' : 'rgba(59, 130, 246, 0.05)',
                                                    color: (isProcessingPromotion || isSyncing) ? '#444' : '#3b82f6',
                                                    border: '1px solid rgba(59, 130, 246, 0.1)',
                                                    cursor: (isProcessingPromotion || isSyncing) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isSyncing ? '⌛ Syncing...' : '⚡ Sync Systems'}
                                            </button>
                                        </>
                                    )}
                                    {entryLevelFilter !== 'Current' && (
                                        <span className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[0.6rem] font-black uppercase tracking-widest opacity-40">
                                            🔒 Read Only View
                                        </span>
                                    )}
                                    {!isStudentView && !isDirectorView && (
                                        <button
                                            onClick={() => setShowTrashModal(true)}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto -mx-4 md:mx-0 custom-scrollbar">
                                <div style={{ background: 'rgba(255,255,255,0.01)', border: PREMIUM_BORDER, borderRadius: '24px', overflow: 'hidden' }}>
                                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-premium">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/[0.02]">
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500">Date</th>
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500">Particulars</th>
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500">Method / Ref</th>
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Amount</th>
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Status</th>
                                                    <th className="p-4 text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody style={{ fontSize: '0.85rem' }}>
                                                {(() => {
                                                    // Handle filtering and sorting (transactions state is already filtered by term context)
                                                    const sorted = [...transactions].sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
                                                    const visible = sorted.slice(0, txLimit);

                                                    if (visible.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', opacity: 0.4 }}>
                                                                    No transactions found for {viewContext.targetTerm}.
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return visible.map((tx, idx) => {
                                                        const isBilled = tx.type === 'Billed' || tx.type === 'billed';
                                                        const isAdjustment = tx.type === 'adjustment' || tx.subMode === 'Balance Fix' || tx.mode === 'Balance Fix' || tx.method === 'Adjustment' || tx.type === 'Adjustment';

                                                        return (
                                                            <tr key={tx.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: isAdjustment ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                                                                <td style={{ padding: '1rem', opacity: 0.6 }}>{new Date(tx.date).toLocaleDateString()}</td>
                                                                <td style={{ padding: '1rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: tx.allocations ? '4px' : '0' }}>
                                                                        {isAdjustment && <span title="Audit Protected Adjustment" style={{ fontSize: '1rem' }}>🔧</span>}
                                                                        <div style={{ fontWeight: 'bold' }}>{isAdjustment && !tx.allocations ? 'Adjustment' : tx.particulars}</div>
                                                                    </div>
                                                                    {tx.allocations && Object.keys(tx.allocations).length > 0 ? (
                                                                        <div style={{ fontSize: '0.75rem', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            {Object.entries(tx.allocations).map(([key, val]) => (
                                                                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, maxWidth: '240px' }}>
                                                                                    <span>{key}</span>
                                                                                    <span style={{ fontFamily: 'monospace' }}>{formatMoney(Number(val))}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tx.description}</div>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '1rem' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', textTransform: 'uppercase', width: 'fit-content' }}>
                                                                            {tx.mode || tx.type}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px', fontFamily: 'monospace' }}>{tx.reference || '-'}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: isBilled ? '#ef4444' : '#10b981' }}>
                                                                    {isBilled ? '+' : '-'}{formatMoney(tx.amount)}
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    {tx.status && (!isBilled || isAdjustment) && (
                                                                        // Rule: In history, only show Approved. Hide Pending.
                                                                        // In current semester, show both.
                                                                        (viewContext.isCurrent || tx.status.toLowerCase() === 'approved') && (
                                                                            <span style={{
                                                                                padding: '0.25rem 0.6rem',
                                                                                borderRadius: '20px',
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: '900',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: '0.5px',
                                                                                background: tx.status.toLowerCase() === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                                color: tx.status.toLowerCase() === 'approved' ? '#10b981' : '#f59e0b',
                                                                                border: `1px solid ${tx.status.toLowerCase() === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                                                            }}>
                                                                                {tx.status.toLowerCase() === 'approved' ? '✅ Approved' : '🕒 Pending'}
                                                                            </span>
                                                                        )
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                    {(!tx.isPseudo && (tx.type !== 'Billed' || isAdjustment)) && (
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                            {isDirectorView && tx.txType === 'payment' && tx.status?.toLowerCase() === 'pending' && (
                                                                                <button
                                                                                    onClick={() => handleApproveTransaction(tx)}
                                                                                    className="btn btn-outline"
                                                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#10b981', color: '#10b981' }}
                                                                                    title="Approve Transaction"
                                                                                >
                                                                                    ✅ Approve
                                                                                </button>
                                                                            )}
                                                                            {!isStudentView && !isDirectorView && viewContext.isCurrent && <button onClick={() => handleEditTransaction(tx)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#3b82f6' }} title="Edit">✎</button>}
                                                                            {!isStudentView && <button onClick={() => !isProcessingPromotion && printReceipt(tx)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#9ca3af', color: '#9ca3af' }} title="Print Receipt">🖨️</button>}
                                                                            {!isStudentView && !isDirectorView && viewContext.isCurrent && selectedStudent.status !== 'graduated' && tx.status?.toLowerCase() !== 'approved' && (
                                                                                <button
                                                                                    onClick={() => !isProcessingPromotion && initiateDelete('transaction', String(tx.id))}
                                                                                    disabled={isProcessingPromotion}
                                                                                    className="btn btn-outline"
                                                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: isProcessingPromotion ? '#444' : '#ef4444', color: isProcessingPromotion ? '#444' : '#ef4444', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer' }}
                                                                                    title={isProcessingPromotion ? "System Locked for Promotion" : "Delete"}
                                                                                >
                                                                                    {isProcessingPromotion ? '🔒' : '🗑️'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}

                                                {transactions.length > txLimit && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <button onClick={() => setTxLimit(prev => prev + 20)} className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem' }}>
                                                                Load More Transactions ({transactions.length - txLimit} remaining)
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )}

                                                {entryLevelFilter === 'Current' && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <button
                                                                onClick={() => {
                                                                    const historyTerms = selectedStudent.promotionHistory?.map(h => h.fromSemester) || [];
                                                                    if (historyTerms.length > 0) {
                                                                        setEntryLevelFilter(historyTerms[historyTerms.length - 1]); // Load the first history term
                                                                    } else {
                                                                        alert("No previous academic history found. Student is currently in their starting semester.");
                                                                    }
                                                                }}
                                                                className="btn btn-outline"
                                                                style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%', fontSize: '0.8rem' }}
                                                            >
                                                                📅 Load Previous Semesters' Records
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* FEES STRUCTURE SECTION */}
                        <section className="mb-12">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black uppercase tracking-widest m-0 leading-none">Fees Structure</h3>
                                {!isStudentView && !isDirectorView && entryLevelFilter === 'Current' && (
                                    <div className="flex gap-2">
                                        <select
                                            disabled={isProcessingPromotion}
                                            className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[0.65rem] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all cursor-pointer"
                                            onChange={(e) => { if (e.target.value && !isProcessingPromotion) handleApplyBursary(e.target.value); e.target.value = ""; }}
                                        >
                                            <option value="" className="bg-slate-900">{isProcessingPromotion ? '🔒 Locked' : '＋ Apply Bursary'}</option>
                                            {bursaries.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name} ({formatMoney(b.value)} Off)</option>)}
                                        </select>
                                        <select
                                            disabled={isProcessingPromotion}
                                            className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[0.65rem] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all cursor-pointer"
                                            onChange={(e) => { if (e.target.value && !isProcessingPromotion) handleBillService(e.target.value); e.target.value = ""; }}
                                        >
                                            <option value="" className="bg-slate-900">{isProcessingPromotion ? '🔒 Locked' : '＋ Bill Service'}</option>
                                            {services.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.cost.toLocaleString()})</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ background: PREMIUM_GLASS, border: PREMIUM_BORDER, borderRadius: '24px', padding: '1.5rem' }}>
                                {/* Fee Structure Display with Actual Values */}
                                {(() => {
                                    // Find the student's programme and fee structure
                                    const prog = programmes.find(p => p.name === selectedStudent.programme || p.id === selectedStudent.programme);

                                    // Normalize helper
                                    const norm = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

                                    // Find Fee Structure for the VIEWED Term (TargetTerm)
                                    // This ensures we show "Year 1 Semester 1" structure when viewing that history.
                                    const feeStruct = prog?.feeStructure?.find(fs => norm(fs.level) === norm(viewContext.targetTerm))
                                        || prog?.feeStructure?.find(fs => fs.level === selectedStudent.level); // Fallback?

                                    const tuitionFee = feeStruct?.tuitionFee || 0;

                                    // B/F Logic:
                                    // If Current, look for the "Balance Brought Forward" Bill.
                                    // If History, use the startPrevBal.
                                    const bfBill = viewContext.isCurrent
                                        ? billings.find(b => b.studentId === selectedStudent.id && b.term === viewContext.targetTerm && (b.type === 'Balance Brought Forward' || b.description.includes('Balance Brought Forward')))
                                        : null;

                                    const previousBal = bfBill ? bfBill.amount : (viewContext.startPrevBal || 0);

                                    return (
                                        <>
                                            {previousBal > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#f59e0b' }}>
                                                    <span>Brought Forward</span>
                                                    <span style={{ fontWeight: 'bold' }}>{formatMoney(previousBal)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                <span>Tuition Fee - {viewContext.targetTerm}</span>
                                                <span style={{ fontWeight: 'bold' }}>{formatMoney(tuitionFee)}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                                {viewContext.bursaryId && viewContext.bursaryId !== 'none' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#10b981' }}>
                                        <span>Bursary ({bursaries.find(b => b.id === viewContext.bursaryId)?.name})</span>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span>- {formatMoney(bursaries.find(b => b.id === viewContext.bursaryId)?.value || 0)}</span>
                                            {viewContext.isCurrent && !isStudentView && selectedStudent.status !== 'graduated' && (
                                                <button
                                                    onClick={() => !isProcessingPromotion && initiateDelete('bursary', selectedStudent.bursary)}
                                                    disabled={isProcessingPromotion}
                                                    style={{ color: isProcessingPromotion ? '#444' : '#ef4444', background: 'none', border: 'none', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer', fontSize: '0.7rem' }}
                                                >
                                                    {isProcessingPromotion ? '🔒' : 'x'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {viewContext.servicesIds?.map(sid => {
                                    const s = services.find(srv => srv.id === sid);
                                    if (!s) return null;
                                    return (
                                        <div key={sid} className="flex justify-between items-center py-2 border-b border-white/[0.02] last:border-0">
                                            <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">{s.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-black">{formatMoney(s.cost)}</span>
                                                {viewContext.isCurrent && !isStudentView && selectedStudent.status !== 'graduated' && (
                                                    <button
                                                        onClick={() => !isProcessingPromotion && initiateDelete('service', sid)}
                                                        disabled={isProcessingPromotion}
                                                        className="text-red-500/30 hover:text-red-500 transition-colors"
                                                    >
                                                        {isProcessingPromotion ? '🔒' : 'x'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                    <span>TOTAL BILLING</span>
                                    <span>{formatMoney(totalBilling + (selectedStudent.previousBalance || 0))}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="flex flex-col gap-8">
                        {/* ARREARS CARD */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                            borderRadius: '32px',
                            padding: '2rem',
                            border: PREMIUM_BORDER,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                            </div>
                            <h4 className="text-[0.65rem] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Current Arrears (Statement)</h4>
                            <div className="flex flex-col items-start">
                                <span className={`text-4xl md:text-5xl font-black tracking-tighter ${arrears > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                    {formatMoney(Math.abs(arrears))}
                                </span>
                                <span className="text-[0.6rem] font-bold text-slate-500 mt-2 uppercase tracking-widest">
                                    {arrears > 0 ? '⚠️ Due Immediately' : '✅ Credit Balance'}
                                </span>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                                <div className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-widest">
                                    Clearance: {clearancePercentage.toFixed(1)}%
                                </div>
                                <div className="h-1.5 flex-1 mx-4 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${clearancePercentage}%`, background: clearancePercentage >= 100 ? '#10b981' : '#3b82f6' }}
                                        className="h-full transition-all duration-1000"
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* REQUIREMENTS */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold m-0 leading-none">Requirements</h3>
                                <button onClick={() => setShowReqHistory(true)} className="text-[0.6rem] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    History
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(selectedStudent.physicalRequirements || []).map((req, i) => {
                                    const pct = Math.min(100, (req.brought / req.required) * 100);
                                    return (
                                        <div key={i} className="group cursor-pointer" onClick={() => !isStudentView && !isDirectorView && setOpenReqMenu(req.name)}>
                                            <div style={{
                                                background: PREMIUM_GLASS,
                                                border: PREMIUM_BORDER,
                                                borderRadius: '24px',
                                                padding: '1.25rem',
                                                transition: 'all 0.3s ease'
                                            }} className="group-hover:bg-white/5 group-hover:border-white/10 relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="relative z-10">
                                                        <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">{req.name}</span>
                                                        <div className="text-lg font-black mt-1 text-white">{req.brought}<span className="text-xs opacity-30 mx-1">/</span>{req.required}</div>
                                                    </div>

                                                    {/* Speed-Add Tap Button */}
                                                    {!isStudentView && !isDirectorView && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateReq(req.name, 1);
                                                            }}
                                                            style={{ background: `${req.color}20`, color: req.color }}
                                                            className="p-2 rounded-xl hover:scale-110 active:scale-90 transition-all z-20"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        style={{ width: `${pct}%`, background: req.color }}
                                                        className="h-full transition-all duration-700 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                                    ></div>
                                                </div>

                                                {/* Sparkle effect when complete */}
                                                {pct >= 100 && (
                                                    <div className="absolute -right-2 -top-2 opacity-10">
                                                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* PORTAL SYNC HISTORY */}
                        {selectedStudent.paymentRequests && selectedStudent.paymentRequests.length > 0 && (
                            <section>
                                <h3 className="text-xl font-bold mb-6">Portal Sync History</h3>
                                <div className="space-y-3">
                                    {selectedStudent.paymentRequests.slice().reverse().map((req, i) => (
                                        <div key={i} style={{ background: PREMIUM_GLASS, border: PREMIUM_BORDER, borderRadius: '16px', padding: '1rem' }} className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${req.status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
                                                <div className="font-bold">{req.narration}</div>
                                            </div>
                                            <div className="text-slate-500 font-mono">{new Date(req.date).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* --- MODALS --- */}
                <TransactionFormModal isOpen={showTransModal} onClose={() => setShowTransModal(false)} student={selectedStudent} existingPayment={editingPayment} />

                {/* Requirement Action Menu */}
                {openReqMenu && (
                    <div
                        className="fixed inset-0 z-[4000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-fade-in"
                        onClick={() => setOpenReqMenu(null)}
                    >
                        <div
                            className="w-full max-w-xs bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-scale-up"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 text-center border-b border-white/5">
                                <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 block">Quick Action</span>
                                <h3 className="text-xl font-bold text-white m-0">{openReqMenu}</h3>
                            </div>

                            <div className="p-4 grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => { updateReq(openReqMenu, 1); setOpenReqMenu(null); }}
                                    className="flex items-center justify-between p-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-2xl transition-all group"
                                >
                                    <span className="font-bold">Add One Item</span>
                                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">+1</span>
                                </button>

                                <button
                                    onClick={() => { updateReq(openReqMenu, -1); setOpenReqMenu(null); }}
                                    className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded-2xl transition-all"
                                >
                                    <span className="font-bold">Remove One Item</span>
                                    <span className="bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">-1</span>
                                </button>

                                <button
                                    onClick={() => {
                                        if (confirm(`Reset ${openReqMenu} to 0?`)) {
                                            const req = selectedStudent.physicalRequirements?.find(r => r.name === openReqMenu);
                                            if (req) updateReq(openReqMenu, -req.brought);
                                            setOpenReqMenu(null);
                                        }
                                    }}
                                    className="flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 text-red-500/60 rounded-2xl transition-all"
                                >
                                    <span className="font-bold">Reset to Zero</span>
                                    <span className="text-lg">↺</span>
                                </button>
                            </div>

                            <div className="p-4 bg-white/[0.02] flex gap-2">
                                <button
                                    onClick={() => { setShowReqHistory(true); setOpenReqMenu(null); }}
                                    className="flex-1 py-3 text-[0.6rem] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                >
                                    View Logs
                                </button>
                                <button
                                    onClick={() => setOpenReqMenu(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {reviewTx && (
                    <ReviewModal
                        tx={reviewTx}
                        onClose={() => setReviewTx(null)}
                        onAction={handleFinalApproval}
                    />
                )}

                {/* Deleted Billings Trash Modal */}
                {
                    showTrashModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="card" style={{ width: 800, padding: '2rem', background: '#111', border: '1px solid #333', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, color: '#ef4444' }}>🗑️ Deleted Billings Trash</h3>
                                    <button onClick={() => setShowTrashModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                                </div>

                                <BillingsTrashList studentId={selectedStudent.id} deletedBillings={deletedBillings} />

                            </div>
                        </div>
                    )
                }

                {
                    showClearanceHistory && (
                        <div
                            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-fade-in"
                            onClick={() => setShowClearanceHistory(false)}
                        >
                            <div
                                className="w-full max-w-lg bg-[#0a0c10] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-scale-up"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight m-0">Clearance History</h3>
                                        <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Status Audit Trail</p>
                                    </div>
                                    <button
                                        onClick={() => setShowClearanceHistory(false)}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                    >✕</button>
                                </div>

                                <div className="p-8 max-h-[500px] overflow-y-auto scrollbar-premium space-y-4">
                                    {!selectedStudent.clearanceHistory || selectedStudent.clearanceHistory.length === 0 ? (
                                        <div className="py-12 text-center opacity-30">
                                            <p className="text-sm font-medium">No history recorded for this student yet.</p>
                                        </div>
                                    ) : (
                                        selectedStudent.clearanceHistory.map((h, i) => (
                                            <div key={i} className="group relative pl-6 border-l border-white/10 py-2">
                                                {/* Timeline Dot */}
                                                <div className={`absolute left-[-5px] top-3 w-2 h-2 rounded-full border-2 border-[#0a0c10] ${h.status === 'cleared' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                                    h.status === 'defaulter' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                                        'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                                                    }`}></div>

                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 rounded ${h.status === 'cleared' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        h.status === 'defaulter' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-purple-500/10 text-purple-500'
                                                        }`}>
                                                        {h.status}
                                                    </span>
                                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">{h.date}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 m-0 font-medium leading-relaxed">{h.reason}</p>
                                                <div className="mt-2 text-[0.6rem] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                    Updated By: {h.user || 'System'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-center">
                                    <button
                                        onClick={() => setShowClearanceHistory(false)}
                                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Close History
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showDeleteModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: '#1e1e1e', padding: '2rem', width: 400, borderRadius: '16px', border: '1px solid #333' }}>
                                <h3>Confirm Deletion</h3>
                                <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', marginBottom: '1rem' }}>
                                    {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                {deleteReason === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Please specify reason..."
                                        value={otherReason}
                                        onChange={e => setOtherReason(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', marginBottom: '1rem', border: '1px solid #555' }}
                                        autoFocus
                                    />
                                )}
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={confirmDelete} className="btn" style={{ flex: 1, background: '#ef4444' }}>Delete</button>
                                    <button onClick={() => setShowDeleteModal(false)} className="btn" style={{ flex: 1, border: '1px solid #555' }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showFixBalance && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: '#1e1e1e', padding: '2rem', width: 400, borderRadius: '16px', border: '1px solid #333' }}>
                                <h3 style={{ margin: '0 0 1rem 0' }}>🔧 Fix Balance</h3>
                                <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem' }}>
                                    Enter the correct balance required. The system will auto-generate an Adjustment transaction to match it.
                                </p>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#888' }}>Target Balance</label>
                                    <input
                                        type="number"
                                        autoFocus
                                        placeholder="e.g. 500000"
                                        id="fix_bal_input"
                                        style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', marginTop: '0.5rem', border: '1px solid #555', fontSize: '1.2rem', fontWeight: 'bold' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#888' }}>Reason for Adjustment</label>
                                    <select
                                        value={fixReason}
                                        onChange={(e) => setFixReason(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', marginTop: '0.5rem', border: '1px solid #555' }}
                                    >
                                        <option value="System Correction">System Correction</option>
                                        <option value="Waiver">Waiver / Discount</option>
                                        <option value="Brought Forward Adjustment">Brought Forward Adjustment</option>
                                        <option value="Refund">Refund</option>
                                        <option value="Penalty">Penalty Charge</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {fixReason === 'Other' && (
                                        <input
                                            type="text"
                                            placeholder="Please specify specific reason..."
                                            value={otherFixReason}
                                            onChange={(e) => setOtherFixReason(e.target.value)}
                                            style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', marginTop: '0.5rem', border: '1px solid #555' }}
                                            autoFocus
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => {
                                            const val = (document.getElementById('fix_bal_input') as HTMLInputElement).value;
                                            if (val) {
                                                const finalReason = fixReason === 'Other' ? otherFixReason : fixReason;
                                                if (fixReason === 'Other' && !otherFixReason.trim()) {
                                                    alert("Please specify the reason.");
                                                    return;
                                                }
                                                handleFixBalanceSubmit(Number(val), finalReason);
                                            }
                                        }}
                                        className="btn"
                                        style={{ flex: 1, background: '#ef4444' }}
                                    >
                                        Apply Fix
                                    </button>
                                    <button onClick={() => setShowFixBalance(false)} className="btn" style={{ flex: 1, border: '1px solid #555' }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Requirements History Modal */}
                {showReqHistory && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                        <div style={{ background: '#111', width: '100%', maxWidth: '600px', maxHeight: '80vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📜 Requirements History</h3>
                                <button onClick={() => setShowReqHistory(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                                {(() => {
                                    // Collect all entries from all requirements
                                    const allEntries = (selectedStudent.physicalRequirements || []).flatMap(req =>
                                        (req.entries || []).map(entry => ({ ...entry, itemName: req.name, color: req.color }))
                                    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    if (allEntries.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', opacity: 0.4, padding: '3rem' }}>
                                                No historical entries found for requirements.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {allEntries.map((entry, idx) => (
                                                <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: entry.color, textTransform: 'uppercase' }}>{entry.itemName}</span>
                                                            <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>•</span>
                                                            <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{entry.date}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{entry.action}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: 'black', color: (entry.change || 0) > 0 ? '#10b981' : '#ef4444' }}>
                                                            {(entry.change || 0) > 0 ? '+' : ''}{entry.change || 0}
                                                        </div>
                                                        {viewContext.isCurrent && !isStudentView && !isDirectorView && !isProcessingPromotion && (
                                                            <button
                                                                onClick={() => deleteReqEntry(entry.itemName, entry.id)}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    padding: '0.4rem',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.8rem'
                                                                }}
                                                                title="Delete Entry & Reverse Count"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (isPage) return content;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-0 md:p-4 z-[2000]" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)' }}>
            {content}
        </div>
    );
};

export const LearnerAccountModal = ({ studentId, onClose, auditingContext, mode = 'bursar' }: { studentId: number, onClose: () => void, auditingContext?: string, mode?: 'bursar' | 'student' | 'director' }) => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <LearnerAccountCore studentId={studentId} onClose={onClose} auditingContext={auditingContext} mode={mode} />
        </div>
    );
};

// --- SUB-COMPONENT: Forensic Review Modal ---
const ReviewModal = ({ tx, onClose, onAction }: { tx: any, onClose: () => void, onAction: (note: string, files: string[]) => void }) => {
    const [directorNote, setDirectorNote] = useState('');
    const [files, setFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        setIsUploading(true);

        selectedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFiles(prev => [...prev, reader.result as string]);
                if (selectedFiles.indexOf(file) === selectedFiles.length - 1) {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border border-slate-200">
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Approve Transaction</h3>
                        <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Forensic Verification Required</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Amount Hero Card */}
                    <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 blur-2xl rounded-full"></div>
                        <div className="relative">
                            <div className="text-[0.6rem] font-black uppercase tracking-widest opacity-60 mb-1">Impact Value</div>
                            <div className="text-2xl font-black">{formatMoney(tx.amount)}</div>
                        </div>
                        <div className="text-right relative">
                            <div className="text-[0.6rem] font-black uppercase tracking-widest opacity-60 mb-1">Student</div>
                            <div className="text-sm font-bold truncate max-w-[150px]">{tx.studentName}</div>
                        </div>
                    </div>

                    {/* Bursar's Original Reason */}
                    <div>
                        <label className="block text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Context (From Bursar)</label>
                        <div className="p-4 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-600 italic border border-slate-100">
                            "{tx.particulars || tx.description || 'No description provided.'}"
                        </div>
                    </div>

                    {/* Director's Note */}
                    <div>
                        <label className="block text-[0.65rem] font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Director's Review Note</label>
                        <textarea
                            className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:opacity-30"
                            rows={3}
                            value={directorNote}
                            onChange={(e) => setDirectorNote(e.target.value)}
                            placeholder="Add your auditing comments here..."
                        ></textarea>
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-[0.65rem] font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Verification Proof (Attachments)</label>
                        <input type="file" id="modal-file-upload" className="hidden" multiple onChange={handleFileChange} />
                        <label htmlFor="modal-file-upload" className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <span className="text-[0.65rem] font-black text-blue-600 uppercase tracking-widest">Click to Upload Proof</span>
                            <p className="text-[0.5rem] font-bold text-slate-400 uppercase mt-1">Images or Documents Accepted</p>
                        </label>

                        {/* Preview */}
                        {files.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {files.map((f, i) => (
                                    <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                                        <img src={f.startsWith('data:image') ? f : '/file-icon.png'} className="w-full h-full object-cover" />
                                        <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAction(directorNote, files)}
                        disabled={!directorNote.trim() || isUploading}
                        className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[0.65rem] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                    >
                        Confirm & Approve
                    </button>
                </div>
            </div>
        </div>
    );
};
