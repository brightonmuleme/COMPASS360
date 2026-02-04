"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData, EnrolledStudent, Payment, formatMoney, PhysicalRequirement } from '@/lib/store';
import { numberToWords } from '@/lib/numberToWords';
import { Transaction, FEE_STRUCTURE, BURSARY_SCHEMES } from '@/app/bursar/sharedData';
import { TransactionFormModal } from './TransactionFormModal';

// --- CONSTANTS ---
const DELETE_REASONS = ['Duplicate Entry', 'Wrong Amount', 'Entered in Error', 'Payment Refunded', 'Other'];
const isArrearsKey = (str: string) => /brought\s*forward|bf|arrears|prev|balance\s*b\/f/i.test(str);

// --- COMPONENT: StatusRing ---
export const StatusRing = ({ student, size = 60, percentage: propPercentage }: { student: EnrolledStudent, size?: number, percentage?: number }) => {
    const { financialSettings } = useSchoolData();

    // If propPercentage is provided, use it. Otherwise calculate locally (legacy fallback).
    let percentage = 0;

    if (propPercentage !== undefined) {
        percentage = Math.max(0, Math.min(100, propPercentage));
    } else {
        const { totalFees, balance } = student;
        const billed = totalFees;
        const paid = totalFees - balance;
        percentage = billed > 0 ? (paid / billed) * 100 : 100; // Default cleared if no fees
        percentage = Math.max(0, Math.min(100, percentage));
    }

    const radius = (size / 2) - 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const status = student.accountStatus;
    let color = '#ef4444'; // Default Red

    // Task: Sync Ring Colors (Status Priority -> Fallback Percentage)
    const statusStr = status as string;
    if (statusStr === 'clearance' || statusStr === 'cleared') {
        color = '#10b981'; // GREEN
    } else if (statusStr === 'probation') {
        color = '#8b5cf6'; // PURPLE
    } else if (statusStr === 'defaulter') {
        color = '#ef4444'; // RED
    } else {
        // FALLBACK Logic: If status is empty, use percentage
        if (percentage >= 100) {
            color = '#10b981'; // GREEN
        } else if (percentage >= (financialSettings?.probationPct ?? 80)) {
            color = '#8b5cf6'; // PURPLE
        } else {
            color = '#ef4444'; // RED
        }
    }

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div style={{ position: 'absolute', fontSize: '10px', fontWeight: 'bold', color: color }}>
                {percentage.toFixed(1)}%
            </div>
        </div>
    );
};

// --- HELPER: Financial Calculation ---
const calculateStudentFinancials = (student: EnrolledStudent, studentBillings: any[], studentPayments: any[], bursaryValue: number = 0) => {
    // Check for isBroughtForward flag in ledger or Fallback to String Matching
    const hasBFBill = studentBillings.some(b =>
        b.isBroughtForward === true ||
        /brought|forward|bf/i.test(b.description || "") ||
        /brought|forward|bf/i.test(b.type || "")
    );

    // If hasBFBill is true, manual previous balance MUST be ignored (Rule 1)
    const finalEffectivePrev = hasBFBill ? 0 : (student.previousBalance || 0);

    // Current Arrears = Total Ledger Billings + Manual Prev (if not in ledger) - Bursary - Total Ledger Payments
    const totalBillings = studentBillings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const totalPayments = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const outstandingBalance = (totalBillings + finalEffectivePrev) - bursaryValue - totalPayments;

    return {
        outstandingBalance
    };
};


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
export const LearnerAccountModal = ({ studentId, onClose, auditingContext }: { studentId: number, onClose: () => void, auditingContext?: string }) => {
    const { filteredStudents: students, setStudents, services, filteredProgrammes: programmes, filteredPayments: payments, filteredBillings: billings, filteredDeletedBillings: deletedBillings, bursaries, addPayment, updatePayment, deletePayment, deleteBilling, financialSettings, accounts, manualPaymentMethods, generateAutomaticBillings, addBilling, documentTemplates, schoolProfile, logGlobalAction, isProcessingPromotion } = useSchoolData();
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
                status: p.status, // Pass through status
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
    const outstandingBalance = useMemo(() => {
        if (!selectedStudent) return 0;
        const { targetTerm, startPrevBal, bursaryId, isCurrent } = viewContext;

        const studentBillings = billings.filter(b => b.studentId === selectedStudent.id && b.term === targetTerm);
        const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && (p.term === targetTerm || (!p.term && isCurrent)));

        const bursaryValue = bursaryId && bursaryId !== 'none'
            ? (bursaries.find(b => b.id === bursaryId)?.value || 0)
            : 0;

        // Calculate using helper but with manual override for prevBal since helper defaults to student.previousBalance
        const totalBillings = studentBillings.reduce((sum, b) => sum + b.amount, 0);
        const totalPayments = studentPayments.reduce((sum, p) => sum + p.amount, 0);

        // If B/F Bill exists in totalBillings, do NOT add startPrevBal (double count).
        const hasBFBill = studentBillings.some(b =>
            b.isBroughtForward === true ||
            isArrearsKey(b.description || "") ||
            isArrearsKey(b.type || "")
        );
        const finalEffectivePrev = hasBFBill ? 0 : (startPrevBal || 0);

        return totalBillings - bursaryValue + finalEffectivePrev - totalPayments;
    }, [selectedStudent, billings, payments, bursaries, viewContext]);

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

        // 1. Current Semester Basics
        const currentTerm = selectedStudent.semester;
        const currentBursaryId = selectedStudent.bursary;
        const currentPrevBal = selectedStudent.previousBalance || 0;

        // 2. Target Billings (Tuition + BF) - EXCLUDES SERVICES
        const targetBillings = billings.filter(b =>
            b.studentId === selectedStudent.id &&
            b.term === currentTerm &&
            (b.type === 'Tuition' || isArrearsKey(b.type || "") || isArrearsKey(b.description || ""))
        );
        const totalTargetBilled = targetBillings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

        // 3. Bursaries (Current)
        const bursaryValue = currentBursaryId && currentBursaryId !== 'none'
            ? (bursaries.find(b => b.id === currentBursaryId)?.value || 0)
            : 0;

        // 4. Tuition & Balance Payments (Numerator: Current Term)
        const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && (p.term === currentTerm || !p.term));

        const totalTuitionPaid = studentPayments.reduce((acc, p) => {
            let amount = 0;
            if (p.allocations && Object.keys(p.allocations).length > 0) {
                const allocations = p.allocations || {};
                Object.entries(allocations).forEach(([key, val]) => {
                    const k = key.toLowerCase();
                    if (k.includes('tuition') || isArrearsKey(k)) {
                        amount += (Number(val) || 0);
                    }
                });
            } else {
                amount = Number(p.amount) || 0;
            }
            return acc + amount;
        }, 0);

        // Check for BF Bill to prevent previous balance double counting
        const allStudentBillings = billings.filter(b => b.studentId === selectedStudent.id);
        const hasBFBill = allStudentBillings.some(b =>
            b.isBroughtForward === true ||
            isArrearsKey(b.description || "") ||
            isArrearsKey(b.type || "")
        );
        const effectivePrev = hasBFBill ? 0 : currentPrevBal;

        // Formula: Tuition Paid / (Target Billing + Missing BF - Bursary)
        const denominator = totalTargetBilled + effectivePrev - bursaryValue;

        if (denominator <= 0) return 100;

        const pct = (totalTuitionPaid / denominator) * 100;
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

    const printReceipt = (tx: any) => {
        if (!selectedStudent) return;

        const payment = payments.find(p => String(p.id) === String(tx.id));
        if (!payment) return alert("Original payment record not found.");

        const prog = programmes.find(p => p.name === selectedStudent.programme || p.id === selectedStudent.programme);

        // Template Selection
        let template = documentTemplates.find(t => t.type === 'RECEIPT' && (t as any).programmeId === prog?.id);
        if (!template) template = documentTemplates.find(t => t.type === 'RECEIPT' && t.isDefault);
        if (!template) template = documentTemplates.find(t => t.type === 'RECEIPT');

        if (!template) return alert("No Receipt template found in system.");

        let content = template.sections.sort((a, b) => a.order - b.order).map(s => s.content).join('');

        // Logo Logic
        const specificLogo = localStorage.getItem(`logo_${template.id}`);
        const globalLogo = localStorage.getItem('school_logo');
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
            '{{balance}}': formatMoney(selectedStudent.balance),
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
            '{{programme_logo}}': logoHtml
        };

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        Object.entries(replacements).forEach(([key, val]) => {
            content = content.replace(new RegExp(escapeRegExp(key), 'g'), val);
        });

        // 3. Iframe Printing (Better UX than window.open)
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
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
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body style="padding: 40px; font-family: sans-serif;">${content}</body>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.frameElement.parentNode.removeChild(window.frameElement); }, 1000);
                    }
                </script>
                </html>
            `);
            doc.close();
        } else {
            alert("Popup blocked. Please allow popups to print.");
        }
    };





    return (
        <div className="fixed inset-0 flex items-center justify-center p-0 md:p-4 z-[2000]" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)' }}>
            <div
                id="learner-modal-body"
                className="card w-full h-full md:w-[95%] md:max-w-[1400px] md:h-[90vh] md:rounded-xl flex flex-col overflow-hidden"
                style={{ padding: 0, border: '1px solid rgba(255,255,255,0.1)', background: '#0F0F0F' }}
            >
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
                <div className="p-3 md:p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 sticky top-0 bg-[#0F0F0F] z-20">
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="cursor-pointer transition-transform active:scale-95" onClick={() => setShowClearanceHistory(true)} title={`View Clearance History / Details (Tuition Clr: ${Math.round(clearancePercentage)}%)`}>
                            <StatusRing student={selectedStudent} size={60} percentage={clearancePercentage} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl md:text-2xl font-bold m-0 truncate">{selectedStudent.name}</h2>
                            <div className="flex flex-wrap gap-2 md:gap-4 items-center mt-0.5 md:mt-1">
                                <p className="opacity-40 m-0 text-xs md:text-sm">ID: {selectedStudent.payCode} | {selectedStudent.semester}</p>
                                <div className="flex gap-1 md:gap-2">
                                    {['clearance', 'defaulter', 'probation'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChangeWithReason(s as any)}
                                            className="touch-target px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-full uppercase transition-all active:scale-95"
                                            style={{
                                                background: selectedStudent.accountStatus === s ? (s === 'clearance' ? '#10b981' : s === 'defaulter' ? '#ef4444' : '#8b5cf6') : 'rgba(255,255,255,0.05)',
                                                color: selectedStudent.accountStatus === s ? 'white' : 'rgba(255,255,255,0.3)',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 md:relative md:top-0 md:right-0 touch-target w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors" style={{ padding: 0 }}>✕</button>
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
                                    {entryLevelFilter === 'Current' && (
                                        <>
                                            <button
                                                onClick={() => !isProcessingPromotion && setShowFixBalance(true)}
                                                className="touch-target px-3 py-2 text-xs md:text-sm rounded transition-all active:scale-95"
                                                disabled={isProcessingPromotion}
                                                style={{ background: isProcessingPromotion ? '#1a1a1a' : 'rgba(239, 68, 68, 0.1)', color: isProcessingPromotion ? '#444' : '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isProcessingPromotion ? '🔒 Locked' : '🔧 Fix Balance'}
                                            </button>
                                            <button
                                                onClick={() => { if (!isProcessingPromotion) { setEditingPayment(null); setShowTransModal(true); } }}
                                                className="touch-target px-3 py-2 text-xs md:text-sm rounded transition-all active:scale-95"
                                                disabled={isProcessingPromotion}
                                                style={{ background: isProcessingPromotion ? '#1a1a1a' : 'rgba(255,255,255,0.1)', color: isProcessingPromotion ? '#444' : '#fff', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isProcessingPromotion ? '🔒 Locked' : '＋ Add Payment'}
                                            </button>
                                        </>
                                    )}
                                    {entryLevelFilter !== 'Current' && (
                                        <span className="px-3 py-2 bg-slate-800/50 rounded text-xs opacity-60">
                                            🔒 Read Only View
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setShowTrashModal(true)}
                                        className="touch-target px-3 py-2 text-sm md:text-base rounded transition-all active:scale-95"
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                        title="View Trash / Deleted Billings"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto -mx-4 md:mx-0 custom-scrollbar">
                                <div className="bg-slate-900/20 rounded-2xl overflow-hidden min-w-[700px]">
                                    <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <tr style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'white' }}>
                                                <th style={{ padding: '1rem' }}>Date</th>
                                                <th style={{ padding: '1rem' }}>Particulars</th>
                                                <th style={{ padding: '1rem' }}>Method / Ref</th>
                                                <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
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
                                                            <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', opacity: 0.4 }}>
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
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                {(!tx.isPseudo && (tx.type !== 'Billed' || isAdjustment)) && (
                                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                        <button onClick={() => handleEditTransaction(tx)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#3b82f6' }} title="Edit">✎</button>
                                                                        <button onClick={() => !isProcessingPromotion && printReceipt(tx)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#9ca3af', color: '#9ca3af' }} title="Print Receipt">🖨️</button>
                                                                        {selectedStudent.status !== 'graduated' && (
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
                                                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button onClick={() => setTxLimit(prev => prev + 20)} className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem' }}>
                                                            Load More Transactions ({transactions.length - txLimit} remaining)
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}

                                            {entryLevelFilter === 'Current' && (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                        </section>

                        {/* FEES STRUCTURE SECTION */}
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Fees Structure</h3>
                                {entryLevelFilter === 'Current' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            disabled={isProcessingPromotion}
                                            className="btn btn-outline"
                                            onChange={(e) => { if (e.target.value && !isProcessingPromotion) handleApplyBursary(e.target.value); e.target.value = ""; }}
                                            style={{ fontSize: '0.7rem', padding: '0.4rem', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer' }}
                                        >
                                            <option value="">{isProcessingPromotion ? '🔒 Locked' : '＋ Apply Bursary'}</option>
                                            {bursaries.map(b => <option key={b.id} value={b.id}>{b.name} ({formatMoney(b.value)} Off)</option>)}
                                        </select>
                                        <select
                                            disabled={isProcessingPromotion}
                                            className="btn btn-outline"
                                            onChange={(e) => { if (e.target.value && !isProcessingPromotion) handleBillService(e.target.value); e.target.value = ""; }}
                                            style={{ fontSize: '0.7rem', padding: '0.4rem', borderColor: isProcessingPromotion ? '#444' : '#ef4444', color: isProcessingPromotion ? '#444' : '#ef4444', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer' }}
                                        >
                                            <option value="">{isProcessingPromotion ? '🔒 Locked' : '＋ Bill Service'}</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.cost.toLocaleString()})</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem' }}>
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
                                            {viewContext.isCurrent && selectedStudent.status !== 'graduated' && (
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
                                        <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                            <span>{s.name}</span>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <span>{formatMoney(s.cost)}</span>
                                                {viewContext.isCurrent && selectedStudent.status !== 'graduated' && (
                                                    <button
                                                        onClick={() => !isProcessingPromotion && initiateDelete('service', sid)}
                                                        disabled={isProcessingPromotion}
                                                        style={{ color: isProcessingPromotion ? '#444' : '#ef4444', background: 'none', border: 'none', cursor: isProcessingPromotion ? 'not-allowed' : 'pointer', fontSize: '0.7rem' }}
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
                    <div className="w-full md:w-auto">
                        <div className="bg-slate-900/20 p-4 md:p-8 rounded-2xl border border-slate-800 text-center mb-4 md:mb-8">
                            <div className="text-[10px] md:text-sm opacity-50 mb-1 md:mb-2">CURRENT ARREARS</div>
                            <div className="text-2xl md:text-4xl font-black mb-1 md:mb-2" style={{ color: outstandingBalance > 0 ? '#ef4444' : '#10b981' }}>
                                {formatMoney(outstandingBalance)}
                            </div>
                            <div className="text-[10px] md:text-sm opacity-50">Due Immediately</div>
                        </div>

                        {/* REQUIREMENTS */}
                        <section>
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                <h3 className="text-base md:text-lg font-bold m-0">Requirements</h3>
                                <button onClick={() => setShowReqHistory(true)} className="text-xs md:text-sm bg-transparent border-none text-white opacity-70 cursor-pointer hover:opacity-100 transition-opacity">
                                    📜 History
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {viewContext.requirements?.map((req, i) => (
                                    <div
                                        key={i}
                                        className="p-3 md:p-4 rounded-xl text-center relative cursor-pointer active:scale-95 transition-transform"
                                        style={{
                                            background: `rgba(${parseInt(req.color.slice(1, 3), 16)}, ${parseInt(req.color.slice(3, 5), 16)}, ${parseInt(req.color.slice(5, 7), 16)}, 0.1)`,
                                            border: `1px solid ${req.color}`,
                                            cursor: isProcessingPromotion ? 'not-allowed' : 'pointer'
                                        }}
                                        onClick={() => { if (viewContext.isCurrent && !isProcessingPromotion) updateReq(req.name, 1); }}
                                    >
                                        <div className="text-2xl md:text-3xl font-black" style={{ color: req.color }}>{req.brought}/{req.required}</div>
                                        <div className="text-[10px] md:text-xs opacity-70 mt-1">{req.name}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* SYNC HISTORY */}
                        <div className="p-4 md:p-6 mt-4 md:mt-8 border-t border-slate-800">
                            <h4 className="m-0 mb-3 md:mb-4 opacity-80 text-sm md:text-base">Portal Sync History</h4>
                            {selectedStudent.postHistory && (
                                <div className="text-xs md:text-sm opacity-60">Latest: {selectedStudent.postHistory[0]}</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- MODALS --- */}
                <TransactionFormModal isOpen={showTransModal} onClose={() => setShowTransModal(false)} student={selectedStudent} existingPayment={editingPayment} />

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
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="card" style={{ width: 500, padding: '2rem', background: '#111', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Clearance History</h3>
                                    <button onClick={() => setShowClearanceHistory(false)} style={{ background: 'none', border: 'none', color: 'white' }}>✕</button>
                                </div>
                                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {selectedStudent.clearanceHistory?.map((h, i) => (
                                        <div key={i} style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', textTransform: 'uppercase', color: h.status === 'cleared' ? '#10b981' : h.status === 'defaulter' ? '#ef4444' : '#8b5cf6' }}>
                                                <span>{h.date}</span><span>{h.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>{h.reason}</div>
                                        </div>
                                    ))}
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

            </div >
        </div >
    );
};
