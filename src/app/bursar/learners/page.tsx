"use client";
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { calculateStudentFinancials as calculateFinancials } from '@/lib/financialCore';
import { useSearchParams } from 'next/navigation';
import { MOCK_ENROLLED_STUDENTS, MOCK_TRANSACTIONS, Transaction, FEE_STRUCTURE, BURSARY_SCHEMES, OPTIONAL_SERVICES } from '../sharedData';
import { useSchoolData, Payment, CompulsoryFee, EnrolledStudent } from '@/lib/store';
import { TransactionFormModal } from '@/components/bursar/TransactionFormModal';
import { LearnerAccountModal, StatusRing } from '@/components/bursar/LearnerAccountModal';
import { parseLevelString } from '@/lib/levelParser';

const formatMoney = (amount: number) => `UGX ${amount.toLocaleString()}`;


function LearnersContent() {
    const searchParams = useSearchParams();
    const {
        addPayment,
        updatePayment,
        deletePayment,
        billings,
        addBilling,
        deleteBilling,
        services,
        filteredProgrammes: programmes,
        financialSettings,
        updateFinancialSettings,
        filteredStudents: enrolledStudents,
        setStudents: setEnrolledStudents,
        payments,
        bursaries,
        schoolProfile,
        portalData,
        updatePortalData,
        getSyncedDate
    } = useSchoolData();

    // State
    const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterProgramme, setFilterProgramme] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterParticulars, setFilterParticulars] = useState<string[]>([]);
    const [minBalance, setMinBalance] = useState<number>(-100000000);
    const [maxBalance, setMaxBalance] = useState<number>(100000000);
    const [showParticularsDropdown, setShowParticularsDropdown] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [localClearancePct, setLocalClearancePct] = useState<number>(100);
    const [localProbationPct, setLocalProbationPct] = useState<number>(80);
    const [localCompulsoryFees, setLocalCompulsoryFees] = useState<CompulsoryFee[]>([]);
    const [statusHistory, setStatusHistory] = useState<{ date: string, rules: string }[]>([]);
    const [showStatusSettings, setShowStatusSettings] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Derive unique levels from configured programmes
    // Context-Aware Level Filtering
    const levels = useMemo(() => {
        if (!filterProgramme) {
            return Array.from(new Set(programmes.flatMap(p => p.levels || []))).map(l => ({ id: l, name: l }));
        }
        const prog = programmes.find(p => p.name === filterProgramme || p.id === filterProgramme);
        if (prog && prog.levels && prog.levels.length > 0) {
            return prog.levels.map(l => ({ id: l, name: l }));
        }
        // Fallback to what we see in students
        const studentSemesters = Array.from(new Set(enrolledStudents.filter(s => s.programme === filterProgramme).map(s => s.semester))).filter(Boolean);
        return studentSemesters.sort().map(l => ({ id: l, name: l }));
    }, [programmes, filterProgramme, enrolledStudents]);

    // Helper for Term Comparison
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
    const matrixRef = useRef<HTMLDivElement>(null);

    const scrollMatrix = (direction: 'left' | 'right') => {
        if (!matrixRef.current) return;
        const scrollAmount = 400;
        matrixRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // --- DERIVED GLOBAL STATE ---
    const transactions = useMemo(() => {
        // 1. Map Payments (Credits)
        const mappedPayments: Transaction[] = payments
            // Filter by student if selected (optimisation), but we need all if no student selected?
            // Actually the UI filters later by studentName, so let's map all or just relevant.
            // For performance, let's map all for now as list isn't huge.
            .map(p => ({
                id: p.id,
                studentId: p.studentId,
                studentName: enrolledStudents.find(s => s.id === p.studentId)?.name || 'Unknown',
                description: p.description || 'Payment',
                amount: p.amount,
                type: (p.method === 'manual' || p.method === 'cash') ? p.method as any : 'digital', // Simplify mapping
                mode: p.method === 'manual' ? 'Manual' : p.method,
                date: p.date.split('T')[0], // ISO to YYYY-MM-DD
                timeAgo: "Recently",
                receiptNumber: p.receiptNumber,
                particulars: p.allocations ? Object.keys(p.allocations).join(', ') : 'General Payment',
                allocations: p.allocations,
                term: p.term // Map term to transaction
            }));

        // 2. Map Billings (Debits)
        const mappedBillings: Transaction[] = billings.map(b => ({
            id: b.id,
            studentId: b.studentId,
            studentName: enrolledStudents.find(s => s.id === b.studentId)?.name || 'Unknown',
            description: b.description,
            amount: b.amount,
            type: 'billed',
            date: b.date.split('T')[0],
            timeAgo: "Recently",
            particulars: b.description, // Use description as particular for bills
            term: b.term
        }));

        // 3. Merge & Sort
        return [...mappedPayments, ...mappedBillings].sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    }, [payments, billings, enrolledStudents]);

    useEffect(() => {
        // Init local state from store on mount/update and load history
        if (financialSettings) {
            setLocalClearancePct(financialSettings.clearancePct ?? 100);
            setLocalProbationPct(financialSettings.probationPct ?? 80);
            setLocalCompulsoryFees(financialSettings.compulsoryFees || []);
        }
        const savedHistory = localStorage.getItem('smart_status_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed)) {
                    setStatusHistory(parsed);
                } else {
                    // Migrate legacy single object to array
                    setStatusHistory([parsed]);
                }
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, [financialSettings]);

    // --- SYNC LOGIC ---

    const handlePostToPortal = (student: EnrolledStudent) => {
        if (!confirm(`Are you sure you want to POST ${student.name}'s data to the Student Portal?`)) return;

        // Update lastPosted timestamp
        const now = getSyncedDate();
        const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Append to history (initialize if undefined)
        const newHistory = student.postHistory ? [timestamp, ...student.postHistory] : [timestamp];

        const updatedStudent = { ...student, lastPosted: timestamp, postHistory: newHistory };
        setEnrolledStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));

        // Sync with Student Portal using global store (Replace localStorage)
        updatePortalData(updatedStudent);

        alert(`Synced ${student.name} to Student Portal!\nTimestamp: ${timestamp}`);
    };



    const handleLocalSubmit = () => {
        if (!selectedStudent) return;
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...selectedStudent, origin: s.origin } : s));
        alert("Student data updated in Learners Accounts. Click 'Post' in the list to sync with Student Portal.");
        setSelectedStudent(null);
    };

    // --- INTERACTION LOGIC ---

    const handleRequirementIncrement = (studentId: number, reqIdx: number) => {
        setEnrolledStudents(prev => prev.map(s => {
            if (s.id === studentId && s.physicalRequirements) {
                const newReqs = [...s.physicalRequirements];
                newReqs[reqIdx] = { ...newReqs[reqIdx], brought: newReqs[reqIdx].brought + 1 };
                return { ...s, physicalRequirements: newReqs };
            }
            return s;
        }));

        if (selectedStudent && selectedStudent.id === studentId) {
            const newReqs = [...(selectedStudent.physicalRequirements || [])];
            newReqs[reqIdx] = { ...newReqs[reqIdx], brought: newReqs[reqIdx].brought + 1 };
            setSelectedStudent({ ...selectedStudent, physicalRequirements: newReqs });
        }
    };

    const handleRequirementReset = (studentId: number) => {
        setEnrolledStudents(prev => prev.map(s => {
            if (s.id === studentId && s.physicalRequirements) {
                const newReqs = s.physicalRequirements.map(r => ({ ...r, brought: 0 }));
                return { ...s, physicalRequirements: newReqs };
            }
            return s;
        }));

        if (selectedStudent && selectedStudent.id === studentId) {
            const newReqs = (selectedStudent.physicalRequirements || []).map(r => ({ ...r, brought: 0 }));
            setSelectedStudent({ ...selectedStudent, physicalRequirements: newReqs });
        }
    };

    // --- ADVANCED TRANSACTION & FINANCIAL STATE ---
    const [showTransModal, setShowTransModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    // --- FEE INPUT STATE ---
    const [newFeeName, setNewFeeName] = useState('');
    const [newFeeAmount, setNewFeeAmount] = useState('');
    const [newFeeType, setNewFeeType] = useState<'clearance' | 'probation'>('clearance');

    const openTransactionModal = () => {
        setEditingPayment(null);
        setShowTransModal(true);
    };

    const handleTransactionSuccess = (payment: Payment) => {
        // Payment is already added by the modal with the correct term
        // We just need to update the UI
        setShowTransModal(false);

        // Force immediate balance update for UI responsiveness
        if (selectedStudent) {
            // We need to simulate the new transaction list including this payment
            // Since the store update might be async or batched, we optimistically calc here
            const newTx: Transaction = {
                id: payment.id,
                studentId: payment.studentId,
                studentName: selectedStudent.name,
                description: payment.description || 'Payment',
                amount: payment.amount,
                type: (payment.method === 'manual' || payment.method === 'cash') ? payment.method as any : 'digital',
                date: payment.date.split('T')[0],
                timeAgo: "Just now",
                term: selectedStudent.semester, // Assume current semester for new payment
                particulars: payment.description
            };

            const currentTx = transactions.filter(t => t.studentName === selectedStudent.name);
            const { outstandingBalance, totalBilled } = calculateStudentFinancials(selectedStudent, [...currentTx, newTx]);

            setSelectedStudent(prev => prev ? ({ ...prev, balance: outstandingBalance, totalFees: totalBilled }) : null);
        }
    };

    const handleEditTransaction = (tx: Transaction) => {
        const mappedPayment: Payment = {
            id: String(tx.id),
            studentId: selectedStudent?.id || 0,
            amount: tx.amount,
            date: tx.date || new Date().toISOString(),
            method: (tx.type === 'manual' ? 'manual' : tx.type) as any,
            reference: tx.reference || '',
            receiptNumber: 'REC-' + tx.id,
            recordedBy: 'Bursar',
            allocations: tx.allocations,
            description: tx.description || '',
            history: []
        };
        setEditingPayment(mappedPayment);
        setShowTransModal(true);
    };

    const toggleFilterParticular = (p: string) => {
        setFilterParticulars(prev => {
            if (prev.includes(p)) return prev.filter(item => item !== p);
            return [...prev, p];
        });
    };

    // --- DYNAMIC VIEW HANDLER ---
    const handleViewStudent = (student: EnrolledStudent) => {
        const studentTx = transactions.filter(t => t.studentName === student.name);
        const { totalBilled, outstandingBalance } = calculateStudentFinancials(student, studentTx);

        setSelectedStudent({
            ...student,
            balance: outstandingBalance, // Override with calculated balance
            totalFees: totalBilled // Override with calculated bill
        });
    };

    // Auto-Open Student from URL
    useEffect(() => {
        const studentId = searchParams.get('studentId');
        if (studentId && enrolledStudents.length > 0) {
            const student = enrolledStudents.find(s => s.id.toString() === studentId);
            if (student) {
                handleViewStudent(student);
                // Clean URL after opening (optional, but good for UX so refresh doesn't reopen if closed)
                // window.history.replaceState(null, '', '/bursar/learners'); 
                // Keeping it might be better for sharing links.
            }
        }
    }, [searchParams, enrolledStudents]);

    // --- COLUMN VISIBILITY STATE ---
    const [visibleColumns, setVisibleColumns] = useState({
        details: true,
        outstanding: true,
        ring: true,
        sync: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // --- DELETION FLOW STATE ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteIntent, setDeleteIntent] = useState<{ type: 'transaction' | 'service' | 'bursary', id: any } | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const DELETE_REASONS = [
        "Entered in error",
        "Duplicate entry",
        "Transaction reversed/bounced",
        "Policy / Administration Change",
        "Other"
    ];

    // --- NEW FEATURES STATE ---
    const [showFixBalance, setShowFixBalance] = useState(false);
    const [entryLevelFilter, setEntryLevelFilter] = useState<string>('Current');
    const [showClearanceHistory, setShowClearanceHistory] = useState(false);
    const [showReqHistory, setShowReqHistory] = useState(false);
    const [openReqMenu, setOpenReqMenu] = useState<string | null>(null);

    const updateReq = (reqName: string, delta: number) => {
        if (!selectedStudent) return;
        const updatedReqs = selectedStudent.physicalRequirements?.map(r => {
            if (r.name === reqName) {
                const newBrought = Math.max(0, r.brought + delta);
                // Create History Entry
                const historyEntry = {
                    id: Date.now().toString(),
                    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    quantity: Math.abs(delta),
                    change: delta,
                    action: delta > 0 ? 'Quick Add' : 'Quick Reduce'
                };
                const newEntries = [historyEntry, ...(r.entries || [])];
                return { ...r, brought: newBrought, entries: newEntries };
            }
            return r;
        });
        const updatedStudent = { ...selectedStudent, physicalRequirements: updatedReqs };
        setSelectedStudent(updatedStudent);
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
        setOpenReqMenu(null);
    };

    const handleFixBalanceSubmit = (targetBalance: number) => {
        if (!selectedStudent) return;

        // Use the live calculated balance which is synced to selectedStudent.balance via the useEffect above
        const currentBalance = selectedStudent.balance;
        const diff = targetBalance - currentBalance;

        if (diff === 0) {
            setShowFixBalance(false);
            return;
        }

        // Create Adjustment Transaction
        const adjustmentTx: Transaction = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            term: selectedStudent.semester,
            amount: Math.abs(diff),
            type: diff > 0 ? 'billed' : 'manual',
            mode: 'Balance Fix',
            description: `Manual Balance Adjustment from ${formatMoney(currentBalance)} to ${formatMoney(targetBalance)}`,
            receiptNumber: 'ADJ-' + Date.now().toString().slice(-6),
            particulars: diff > 0 ? 'Debit Adjustment' : 'Credit Adjustment',
        };

        if (diff > 0) {
            // Target > Current = Need to increase debt (Debit/Bill)
            adjustmentTx.type = 'billed';
            adjustmentTx.description = 'Balance Correction (Debit)';
        } else {
            // Target < Current = Need to reduce debt (Credit/Payment)
            adjustmentTx.type = 'manual';
            adjustmentTx.subMode = 'Balance Fix';
            adjustmentTx.description = 'Balance Correction (Credit)';
        }

        if (adjustmentTx.type === 'billed') {
            addBilling({
                id: Date.now().toString(),
                studentId: selectedStudent.id,
                amount: adjustmentTx.amount,
                description: adjustmentTx.description,
                date: new Date().toISOString(),
                programmeId: selectedStudent.programme, // Fallback
                level: selectedStudent.level,
                term: selectedStudent.semester,
                type: 'Service'
            } as any);
        } else {
            addPayment({
                id: Date.now().toString(),
                studentId: selectedStudent.id,
                amount: adjustmentTx.amount,
                date: new Date().toISOString(),
                method: 'Manual', // Match Store Enum
                reference: 'FIX-BAL',
                receiptNumber: adjustmentTx.receiptNumber,
                recordedBy: 'Bursar',
                description: adjustmentTx.description,
                history: []
            } as any);
        }

        setShowFixBalance(false);
        alert("Balance adjusted successfully.");
        // Close the main student modal to refresh the list view
        setSelectedStudent(null);
    };

    // Effect to keep selectedStudent in sync with global store
    useEffect(() => {
        if (selectedStudent) {
            const fresh = enrolledStudents.find(s => s.id === selectedStudent.id);
            if (fresh && (fresh !== selectedStudent)) { // Deep check might be better but ref check is ok if store creates new objects
                // Only update if critical fields changed? 
                // Actually relying on `handleViewStudent` calculation might be safer for "balance".
                // But `handleViewStudent` uses `transactions` which is now derived.
                // So we need to re-run `handleViewStudent` logic when transactions change.
            }
        }
    }, [enrolledStudents, transactions]); // Loop risk?

    // Better: Derive selectedStudent display data directly in render or use a memoized version, 
    // instead of state for `selectedStudent`.
    // But refactoring that is huge.
    // Let's just update `selectedStudent` when we modify things.

    /* 
       Wait, `handleViewStudent` calculates balance based on transactions.
       If transactions update (due to store update), we need to re-calculate.
    */
    useEffect(() => {
        if (selectedStudent) {
            const studentTx = transactions.filter(t => t.studentName === selectedStudent.name);
            const { totalBilled, outstandingBalance } = calculateStudentFinancials(selectedStudent, studentTx);

            // Only update if changed to avoid loop
            if (selectedStudent.balance !== outstandingBalance || selectedStudent.totalFees !== totalBilled) {
                setSelectedStudent(prev => prev ? ({ ...prev, balance: outstandingBalance, totalFees: totalBilled }) : null);
            }
        }
    }, [transactions, selectedStudent]); // When transactions or student object changes, re-calc balance.
    const handleStatusChangeWithReason = (newStatus: 'cleared' | 'probation' | 'defaulter' | 'clearance') => {
        // Note: 'clearance' from button maps to 'cleared' or 'clearance'? Enum usually 'cleared' in store but 'clearance' in some logic.
        // store.ts says: status: 'cleared' | 'probation' | 'defaulter';
        // But logic used 'clearance'. I'll normalize to 'clearance' as per existing UI code (line 1676).

        const reason = prompt(`Reason for marking as ${newStatus.toUpperCase()}:`, "Manual Update");
        if (reason === null) return; // Cancelled

        if (selectedStudent) {
            const historyEntry = {
                date: new Date().toLocaleString(),
                status: newStatus as any,
                reason: reason,
                user: 'Bursar', // dynamic user later
                isManual: true
            };

            const newHistory = [historyEntry, ...(selectedStudent.clearanceHistory || [])];
            const updatedStudent = {
                ...selectedStudent,
                accountStatus: newStatus as any,
                clearanceHistory: newHistory
            };

            setSelectedStudent(updatedStudent);
            setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
        }
    };

    const initiateDelete = (type: 'transaction' | 'service' | 'bursary', id: any) => {
        // alert(`DEBUG: Initiate Delete called for ${type} ${id}`); // Removed debug alert
        setDeleteIntent({ type, id });
        setDeleteReason(DELETE_REASONS[0]);
        setShowDeleteModal(true);
    };



    // --- FLUID MATH HELPERS ---

    const calculateStudentFinancials = (student: EnrolledStudent, _unusedTx?: Transaction[]) => {
        return calculateFinancials(student, billings, payments, bursaries);
    };

    // --- FINANCIAL ACTIONS ---

    const performDeleteTransaction = (txId: number | string) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return;

        if (tx.type === 'billed') {
            // Auto-remove service subscription if this billing corresponds to a service
            if (selectedStudent && selectedStudent.services) {
                const serviceToRemove = services.find(s =>
                    tx.description?.toLowerCase().includes(`service: ${s.name.toLowerCase()}`) ||
                    tx.particulars?.toLowerCase() === s.name.toLowerCase()
                );

                if (serviceToRemove && selectedStudent.services.includes(serviceToRemove.id)) {
                    const newServices = selectedStudent.services.filter(id => id !== serviceToRemove.id);
                    const updatedStudent = { ...selectedStudent, services: newServices };

                    // Helper will re-calc financials next render or we can force it here if needed, 
                    // but React state update should trigger re-calc via useMemo/useEffect mechanisms if properly wired.
                    // However, the 'calculateStudentFinancials' inside useMemo (line 834) depends on 'enrolledStudents', so updating enrolledStudents is key.

                    setSelectedStudent(updatedStudent);
                    setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
                }
            }

            if (deleteBilling) deleteBilling(String(txId));
        } else {
            deletePayment(String(txId), 'Manual Deletion');
        }
    };

    const performDeleteService = (serviceId: string) => {
        if (!selectedStudent) return;

        const newServices = selectedStudent.services.filter(id => id !== serviceId);
        const updatedStudentRef = { ...selectedStudent, services: newServices };

        // Also remove the corresponding 'billed' transaction log if we want to be thorough, 
        // but for now, rely on dynamic math which rebuilds 'totalBilled' from the services array.

        const { totalBilled, outstandingBalance } = calculateStudentFinancials(
            updatedStudentRef,
            transactions.filter(t => t.studentName === selectedStudent.name)
        );

        const finalStudent = { ...updatedStudentRef, balance: outstandingBalance, totalFees: totalBilled };
        setSelectedStudent(finalStudent);
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...finalStudent, origin: s.origin } : s));
    };

    const performRemoveBursary = () => {
        if (!selectedStudent) return;
        handleApplyBursary('none');
    };

    const confirmDelete = () => {
        if (!deleteIntent) return;

        // In a real app, log the reason {deleteReason} to an audit table
        console.log(`Deleting ${deleteIntent.type} ${deleteIntent.id} Reason: ${deleteReason}`);

        if (deleteIntent.type === 'transaction') {
            performDeleteTransaction(deleteIntent.id);
        } else if (deleteIntent.type === 'service') {
            performDeleteService(deleteIntent.id);
        } else if (deleteIntent.type === 'bursary') {
            performRemoveBursary(); // ID not needed for singleton bursary
        }

        setShowDeleteModal(false);
        setDeleteIntent(null);
    };

    const handleReqIncrement = (reqName: string) => {
        if (!selectedStudent) return;
        const updatedReqs = selectedStudent.physicalRequirements?.map(r =>
            r.name === reqName ? { ...r, brought: Math.min(r.brought + 1, r.required) } : r
        );
        const updatedStudent = { ...selectedStudent, physicalRequirements: updatedReqs };
        setSelectedStudent(updatedStudent);
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
    };

    const handleReqReset = (reqName: string) => {
        if (!selectedStudent) return;
        const updatedReqs = selectedStudent.physicalRequirements?.map(r =>
            r.name === reqName ? { ...r, brought: 0 } : r
        );
        const updatedStudent = { ...selectedStudent, physicalRequirements: updatedReqs };
        setSelectedStudent(updatedStudent);
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));
    };

    const handlePrintRequirements = () => {
        if (!selectedStudent) return;
        const reqs = selectedStudent.physicalRequirements || [];
        const content = `
            <h2>Requirement Checklist - ${selectedStudent.name}</h2>
            <p><strong>Programme:</strong> ${selectedStudent.programme}</p>
            <p><strong>Semester:</strong> ${selectedStudent.semester}</p>
            <hr/>
            <ul style="font-size: 1.2rem; line-height: 1.6;">
                ${reqs.map(r => `<li style="list-style: ${r.brought >= r.required ? 'none' : 'square'}">
                    ${r.brought >= r.required ? '[✅]' : '[  ]'} 
                    <strong>${r.name}</strong>: ${r.brought} / ${r.required}
                </li>`).join('')}
            </ul>
            <div style="margin-top: 2rem; border-top: 1px dashed black; padding-top: 1rem;">
                <p>Signature: __________________________</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
        `;
        const win = window.open('', '', 'width=600,height=800');
        win?.document.write(`<html><body style="font-family: sans-serif; padding: 2rem;">${content}</body></html>`);
        win?.document.close();
        win?.print();
    };


    // --- RECEIPT PRINTER ---

    const printReceipt = (tx: Transaction) => {
        const receiptContent = `
            RECEIPT # ${tx.id}
            --------------------------------
            Date: ${tx.date || new Date().toLocaleDateString()}
            Student: ${tx.studentName}
            Amount: UGX ${tx.amount.toLocaleString()}
            Particulars: ${tx.allocations ? Object.keys(tx.allocations).join(', ') : (tx.particulars || 'N/A')}
            Method: ${tx.type.toUpperCase()}${tx.mode ? ` - ${tx.mode}` : ''}
            Reference: ${tx.reference || 'N/A'}
            --------------------------------
            Valid Proof of Payment
        `;
        const win = window.open('', '', 'width=400,height=600');
        win?.document.write(`<pre>${receiptContent}</pre>`);
        win?.document.close();
        win?.print();
    };

    const handleApplyBursary = (bursaryId: string) => {
        if (!selectedStudent) return;
        const updatedStudentRef = { ...selectedStudent, bursary: bursaryId };
        const { totalBilled, outstandingBalance } = calculateStudentFinancials(
            updatedStudentRef,
            transactions.filter(t => t.studentName === selectedStudent.name)
        );

        const finalStudent = { ...updatedStudentRef, balance: outstandingBalance, totalFees: totalBilled };
        setSelectedStudent(finalStudent);
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...finalStudent, origin: s.origin } : s));
    };

    const handleBillService = (serviceId: string) => {
        if (!selectedStudent) return;
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const newServices = selectedStudent.services.includes(service.id) ? selectedStudent.services : [...selectedStudent.services, service.id];

        // Add Billing Globally
        addBilling({
            id: Date.now().toString(),
            studentId: selectedStudent.id,
            amount: service.cost,
            description: `Billed: ${service.name}`,
            date: new Date().toISOString(),
            programmeId: selectedStudent.programme,
            level: selectedStudent.level,
            term: selectedStudent.semester,
            type: 'Service'
        } as any);

        // Update Student Services Globally
        const updatedStudent = { ...selectedStudent, services: newServices };
        // We use setEnrolledStudents (which calls setStudents in our mapped hook)
        // But wait, `setStudents` overwrites array? No, `setEnrolledStudents` in hook maps via `updateStudent` usually?
        // Checking hook... line 12: `setStudents: setEnrolledStudents` comes from `useSchoolData`.
        // In store.ts, `setStudents` replaces the whole array.
        // But `updateStudent` (line 2017) is available!
        // I should use `updateStudent` if possible, but the local logic uses `setEnrolledStudents(prev => map...)`.
        // That is fine as long as `setEnrolledStudents` updates the global store correctly.

        // Actually, let's use the local setter pattern which updates global store (via the hook mapping).
        setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...updatedStudent, origin: s.origin } : s));

        // derived balance update handles itself via useEffect transaction change logic
        // But we DO need to update `selectedStudent` to reflect the new `services` list immediately for UI
        setSelectedStudent(updatedStudent);
    };


    const handleSaveUpdate = () => {
        // Defensive: Ensure the latest state is synced to the main list before closing
        if (selectedStudent) {
            setEnrolledStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...selectedStudent, origin: s.origin } : s));
        }
        alert("Changes saved locally! (Syncing to portal...)");
        setSelectedStudent(null);
    };

    // --- HELPER FOR AUTO STATUS ---

    // Check if student has paid all mandatory fees
    // Check if student has paid mandatory fees of a specific type
    // Check if student has paid mandatory fees of a specific type (or 'all')
    const checkMandatoryCompliance = (student: EnrolledStudent, type: 'clearance' | 'probation' | 'all', transactionsOverride?: Transaction[]) => {
        const relevantFees = type === 'all'
            ? localCompulsoryFees
            : localCompulsoryFees.filter(f => (f.type || 'clearance') === type);

        // console.log(`Checking ${type} compliance for ${student.name}. Found ${relevantFees.length} reqs.`);
        if (relevantFees.length === 0) return true; // No requirements of this type

        // Use override list if provided, otherwise default to global state
        const sourceTransactions = transactionsOverride || transactions;
        // CRITICAL FIX: Only count ACTUAL PAYMENTS (exclude 'billed' items)
        const studentTx = sourceTransactions.filter(t => t.studentName === student.name && t.type !== 'billed');

        return relevantFees.every(fee => {
            // console.log(`Verify Fee: ${fee.name} (${fee.amount})`);

            // PHYSICAL CHECK
            if (fee.category === 'physical') {
                if (!student.physicalRequirements) return true; // No reqs listed = skip? Or strict? 
                // User said "when selected students with any physical requirement balance will be left out"
                // So we check if everything is brought.
                return student.physicalRequirements.every(req => req.brought >= req.required);
            }

            // MONETARY CHECK
            const paidForFee = studentTx.reduce((acc, t) => {
                let amount = 0;
                const hasAllocations = t.allocations && Object.keys(t.allocations).length > 0;

                if (hasAllocations) {
                    // STRICT ALLOCATION MODE
                    const allocs = t.allocations || {};
                    if (allocs[fee.name] !== undefined) {
                        amount = allocs[fee.name];
                    } else {
                        // Try case-insensitive keys
                        const matchKey = Object.keys(allocs).find(k => k.toLowerCase() === fee.name.toLowerCase());
                        if (matchKey) amount = allocs[matchKey];
                    }
                } else {
                    // LEGACY / UNALLOCATED MODE
                    if (t.particulars && t.particulars.toLowerCase().includes(fee.name.toLowerCase())) amount = t.amount;
                    else if ((t.description || '').toLowerCase().includes(fee.name.toLowerCase())) amount = t.amount;
                }
                return acc + amount;
            }, 0);
            return paidForFee >= fee.amount;
        });
    };

    const determineAutoStatus = (student: EnrolledStudent, transactionsOverride?: Transaction[]) => {
        if (student.accountStatus) return student.accountStatus; // Manual override first

        // Calculate financials (Tuition Specific)
        const sourceTransactions = transactionsOverride || transactions;
        const studentTx = sourceTransactions.filter(t => t.studentName === student.name);
        // Use CLEARANCE financial metrics for status logic
        const { clearanceTarget, clearancePaid } = calculateStudentFinancials(student, studentTx);

        // 1. Check ALL Mandatory Requirements (Critical Gate)
        const allMandatoryMet = checkMandatoryCompliance(student, 'all', sourceTransactions);
        if (!allMandatoryMet) return 'defaulter';

        // 2. Check Clearance Percentage (Tuition + Arrears Coverage)
        const pct = clearanceTarget > 0 ? (clearancePaid / clearanceTarget) * 100 : 100;

        if (pct < localProbationPct) return 'defaulter';

        // 3. Check Clearance Threshold
        if (pct >= localClearancePct) return 'clearance';

        return 'probation';
    };

    // --- UI COMPONENTS ---

    const StatusRing = ({ student, size = 60 }: { student: EnrolledStudent, size?: number }) => {
        let rawPercentage = 0;

        // Use Total Financials for Visuals (Clearing Debt = Clearance)
        const studentTx = transactions.filter(t => t.studentName === student.name);
        const { clearanceTarget, clearancePaid } = calculateStudentFinancials(student, studentTx);

        // Percentage based on Clearance Target (Tuition + Arrears) and Paid (Tuition + Arrears Allocations)
        if (clearanceTarget > 0) {
            rawPercentage = (clearancePaid / clearanceTarget) * 100;
        } else {
            // No Tuition/Arrears to pay = 100% Cleared (even if Services pending? User said Status Ring ignores Services)
            rawPercentage = 100;
        }

        const percentage = Math.max(0, rawPercentage); // Allow > 100%

        const radius = (size / 2) - 5;
        const circumference = 2 * Math.PI * radius;
        // Cap visual offset at 100% so ring doesn't break, but show text > 100
        const visualPercentage = Math.min(100, percentage);
        const offset = circumference - (visualPercentage / 100) * circumference;

        const status = student.accountStatus;
        let color = '#ef4444'; // Default Red

        // Task: Sync Ring Colors (Status Priority -> Fallback Percentage)
        // Cast to string to handle 'cleared' check from user request if not in union type
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
            } else if (percentage >= localProbationPct) {
                color = '#8b5cf6'; // PURPLE
            } else {
                color = '#ef4444'; // RED
            }
        }

        return (
            <div
                title={`Bal: ${student.balance}, Target: ${clearanceTarget}, Paid: ${clearancePaid}, Status: ${status}`}
                style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
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
                    {Math.round(percentage)}%
                </div>
            </div>
        );
    };

    const filteredStudents = useMemo(() => {
        // First, calculate dynamic financials for everyone using the central engine
        const calculatedList = enrolledStudents.map(student => {
            const studentTx = transactions.filter(t => t.studentName === student.name);
            const stats = calculateStudentFinancials(student, studentTx);

            return {
                ...student,
                balance: stats.outstandingBalance,
                totalFees: stats.totalBilled
            };
        });

        // Then apply filters to this calculated list
        return calculatedList.filter(s => {
            // Filter out non-active students (Graduated / Deactivated) AND enforce portal separation
            if (s.origin !== 'bursar') return false;
            if (s.status === 'graduated' || s.status === 'deactivated') return false;

            const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.payCode || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = filterLevel === '' || s.semester.includes(filterLevel);
            const matchesProg = filterProgramme === '' || s.programme === filterProgramme;
            const matchesBal = s.balance >= minBalance && s.balance <= maxBalance;

            // Status matching
            const effectiveStatus = determineAutoStatus(s);
            const matchesStatus = filterStatus === '' || effectiveStatus === filterStatus;

            // Check for specific particular payment if filter active
            let matchesParticular = true;
            if (filterParticulars.length > 0) {
                const studentTx = transactions.filter(t => t.studentName === s.name);
                // Check if student has transactions matching ALL of the selected particulars
                matchesParticular = filterParticulars.every(p =>
                    studentTx.some(t => t.particulars && t.particulars.includes(p))
                );
            }

            return matchesSearch && matchesLevel && matchesProg && matchesBal && matchesStatus && matchesParticular;
        });
    }, [enrolledStudents, billings, payments, bursaries, searchTerm, filterLevel, filterProgramme, filterStatus, filterParticulars, minBalance, maxBalance, localClearancePct, localProbationPct, localCompulsoryFees, programmes, services]);

    // Helper to recalculate status with custom fees list (for immediate updates)
    const recalculateStatusWithFees = (
        students: EnrolledStudent[],
        feesList: CompulsoryFee[]
    ): EnrolledStudent[] => {
        return students.map(s => {
            const studentTx = transactions.filter(t => t.studentName === s.name);
            const stats = calculateStudentFinancials(s, studentTx);
            const tTotal = stats.tuitionBilled;
            const tPaid = stats.tuitionPaid;
            let newStatus: 'clearance' | 'defaulter' | 'probation' = 'defaulter';

            // Custom Check Compliance within this scope
            const checkCompliance = (type: 'clearance' | 'probation') => {
                const relevantFees = feesList.filter(f => (f.type || 'clearance') === type);
                if (relevantFees.length === 0) return true;
                return relevantFees.every(fee => {
                    if (fee.category === 'physical') {
                        if (!s.physicalRequirements) return true;
                        return s.physicalRequirements.every(req => req.brought >= req.required);
                    }
                    const paidForFee = studentTx.reduce((acc, t) => {
                        let amount = 0;
                        const hasAllocations = t.allocations && Object.keys(t.allocations).length > 0;

                        if (hasAllocations) {
                            // STRICT ALLOCATION MODE
                            // Use safe navigation or fallback to empty object
                            const allocs = t.allocations || {};
                            if (allocs[fee.name] !== undefined) {
                                amount = allocs[fee.name];
                            } else {
                                // Try case-insensitive keys
                                const matchKey = Object.keys(allocs).find(k => k.toLowerCase() === fee.name.toLowerCase());
                                if (matchKey) amount = allocs[matchKey];
                            }
                        } else {
                            // LEGACY / UNALLOCATED MODE
                            if (t.particulars && t.particulars.toLowerCase().includes(fee.name.toLowerCase())) amount = t.amount;
                            else if ((t.description || '').toLowerCase().includes(fee.name.toLowerCase())) amount = t.amount;
                        }
                        return acc + amount;
                    }, 0);

                    return paidForFee >= fee.amount;
                });
            };

            const probMet = checkCompliance('probation');
            const clearMet = checkCompliance('clearance');
            const pct = tTotal > 0 ? (tPaid / tTotal) * 100 : 100;

            if (!probMet) newStatus = 'defaulter';
            else if (pct < localProbationPct) newStatus = 'defaulter';
            else if (pct >= localClearancePct && clearMet) newStatus = 'clearance';
            else newStatus = 'probation';

            return { ...s, accountStatus: newStatus };
        });
    };

    const handleSmartBulkStatus = () => {
        if (selectedIds.length === 0) {
            alert("No students selected. Please select students to categorize.");
            return;
        }

        // CONFIRMATION DIALOG
        const confirmed = window.confirm(
            `You are about to update the status for ${selectedIds.length} students based on your criteria.\n` +
            `Rules: Clear >= ${localClearancePct}%, Probation >= ${localProbationPct}%, Defaulter < ${localProbationPct}%\n\n` +
            `⚠️ WARNING: This will OVERWRITE any manual status changes you may have set previously.\n\n` +
            `Do you want to continue?`
        );
        if (!confirmed) return;

        setEnrolledStudents(prev => prev.map(s => {
            if (selectedIds.includes(s.id)) {
                const studentTx = transactions.filter(t => t.studentName === s.name);
                const stats = calculateStudentFinancials(s, studentTx);

                // Tuition Basis for Bulk Logic
                const tTotal = stats.tuitionBilled;
                const tPaid = stats.tuitionPaid;

                let newStatus: 'clearance' | 'defaulter' | 'probation' = 'defaulter';

                const probMet = checkMandatoryCompliance(s, 'probation');
                const clearMet = checkMandatoryCompliance(s, 'clearance');
                const pct = tTotal > 0 ? (tPaid / tTotal) * 100 : 100;

                if (!probMet) {
                    newStatus = 'defaulter';
                } else if (pct < localProbationPct) {
                    newStatus = 'defaulter';
                } else if (pct >= localClearancePct && clearMet) {
                    newStatus = 'clearance';
                } else {
                    newStatus = 'probation';
                }

                // Add to Clearance History
                const historyEntry = {
                    date: new Date().toLocaleString(),
                    status: newStatus,
                    reason: "Bulk Smart Categorize",
                    user: 'Bursar',
                    isManual: false
                };
                const newClearanceHistory = [historyEntry, ...(s.clearanceHistory || [])];

                return { ...s, accountStatus: newStatus, clearanceHistory: newClearanceHistory as any };
            }
            return s;
        }));

        // SAVE HISTORY
        const historyEntry = {
            date: new Date().toLocaleString(),
            rules: `Cleared: >=${localClearancePct}% Tuition +Mandatory | Probation: >=${localProbationPct}% Tuition`
        };

        const newHistory = [historyEntry, ...statusHistory].slice(0, 10); // Keep last 10
        setStatusHistory(newHistory);
        localStorage.setItem('smart_status_history', JSON.stringify(newHistory));

        alert(`Categorized ${selectedIds.length} students based on % Paid & Mandatory Fees.`);
    };

    const handleSaveConfig = () => {
        // Persist to Global Store
        updateFinancialSettings({
            clearancePct: localClearancePct,
            probationPct: localProbationPct,
            compulsoryFees: localCompulsoryFees
        });

        // Log to History
        const historyEntry = {
            date: new Date().toLocaleString(),
            rules: `[Config Update] Cleared: >=${localClearancePct}% | Probation: >=${localProbationPct}% | Mandatory: ${localCompulsoryFees.length}`
        };
        const newHistory = [historyEntry, ...statusHistory].slice(0, 10);
        setStatusHistory(newHistory);
        localStorage.setItem('smart_status_history', JSON.stringify(newHistory));

        setShowStatusSettings(false);
        alert("Configuration Saved & Logged to History!");
    };

    const getCellData = (studentId: number, colName: string, isInstallment = false) => {
        const student = enrolledStudents.find(s => s.id === studentId);
        if (!student) return { paid: 0, billed: 0, status: 'none' as any };

        const currentTerm = filterLevel || student.semester;
        // Helper to clean and match keys consistently
        const cleanKey = (k: string) => k.toLowerCase().replace(/service:\s*/g, '').replace(/billed:\s*/g, '').replace(/fees?\s*/g, '').trim();
        const targetKey = cleanKey(colName);

        if (targetKey === 'brought forward' || targetKey === 'arrears') {
            // Aggregate all PAST data + any current BF bills + any MISMATCHED semester columns (Zombies)
            const pastBillings = billings.filter(b => {
                if (b.studentId !== student.id) return false;
                const isPast = isPastTerm(b.term || '', currentTerm);
                const desc = b.description || b.type || '';

                // Pattern match for semester indicators (e.g., "Year 1 Semester 1", "Y1S1", "Year 1 Sem 1")
                const semMatch = desc.match(/(Year\s*\d+\s*(Semester|Sem)\s*\d+|Y\d+S\d+)/i);
                const isMismatch = semMatch ? compareTerms(semMatch[0], currentTerm) !== 0 : false;

                // It's a "Past" bill if it's historic (term tag) OR if the description mentions a different semester
                return isPast || isMismatch;
            });
            const pastPayments = payments.filter(p => p.studentId === student.id && isPastTerm(p.term || '', currentTerm));

            // Check for BF bills in CURRENT term (summaries)
            const bfBills = billings.filter(b =>
                b.studentId === student.id &&
                !isPastTerm(b.term || '', currentTerm) &&
                (/brought|forward|bf/i.test(b.description || "") || /brought|forward|bf/i.test(b.type || ""))
            );

            // Calculation logic:
            // If bfBills exist, they are the preferred source for "Past debt" balance
            // If not, we use the manual previousBalance field + calculated past arrears.
            const hasActualBFBill = bfBills.length > 0;

            let billed = 0;
            let paid = 0;

            if (hasActualBFBill) {
                billed = bfBills.reduce((sum, b) => sum + b.amount, 0);

                // Also check for CURRENT TERM payments that are allocated to this BF bill
                const currentPayments = payments.filter(p => p.studentId === student.id && !isPastTerm(p.term || '', currentTerm));
                currentPayments.forEach(p => {
                    if (p.allocations) {
                        const matchingKey = Object.keys(p.allocations).find(k => {
                            const ck = cleanKey(k);
                            return ck === 'brought forward' || ck === 'bf' || ck === 'arrears' || ck === 'prev balance';
                        });
                        if (matchingKey) paid += (Number(p.allocations[matchingKey]) || 0);
                    }
                });
            } else {
                // Manual field + Historic calculation
                const historicBilled = pastBillings.reduce((sum, b) => sum + b.amount, 0);
                const historicPaid = pastPayments.reduce((sum, p) => sum + p.amount, 0);
                billed = historicBilled + (student.previousBalance || 0);
                paid = historicPaid;
            }

            const bal = billed - paid;
            return { paid, billed, status: bal <= 0 ? (billed > 0 ? 'full' : 'none') : 'partial' as any };
        }

        if (targetKey === 'bursary') {
            return { paid: 0, billed: 0, status: 'none' as any };
        }

        if (isInstallment) {
            const installPayments = payments.filter(p => p.studentId === studentId);
            const paid = installPayments.reduce((sum, p) => {
                let amt = 0;
                if (p.allocations) {
                    const key = Object.keys(p.allocations).find(k => k.toLowerCase().includes(colName.toLowerCase()));
                    if (key) amt = Number(p.allocations[key]) || 0;
                }
                return sum + amt;
            }, 0);
            return { paid, billed: 0, status: paid > 0 ? 'full' : ('none' as any) };
        }

        const studentBillings = billings.filter(b => {
            if (b.studentId !== studentId) return false;
            const desc = b.description || '';
            const isPast = isPastTerm(b.term || '', currentTerm);

            // Zombie Rule: If bill mentions a different semester, it is NOT part of this column
            const semMatch = desc.match(/(Year\s*\d+\s*(Semester|Sem)\s*\d+|Y\d+S\d+)/i);
            if (semMatch && compareTerms(semMatch[0], currentTerm) !== 0) return false;

            return !isPast && cleanKey(desc).includes(targetKey);
        });

        let billed = studentBillings.reduce((sum, b) => sum + b.amount, 0);

        // Net Tuition Model logic:
        if (targetKey === 'tuition') {
            // Fallback to Fee Structure if no billings found
            if (billed === 0) {
                const prog = programmes.find(p => p.id === student.programme || p.name === student.programme);
                const feeConfig = prog?.feeStructure?.find(f => f.level === (filterLevel || student.level));
                if (feeConfig) billed = feeConfig.tuitionFee;
            }
            const bursaryData = bursaries.find(b => b.id === student.bursary);
            const bursaryValue = bursaryData ? bursaryData.value : 0;
            billed = Math.max(0, billed - bursaryValue);
        }

        const studentPayments = payments.filter(p => p.studentId === studentId);
        let paid = 0;
        studentPayments.forEach(p => {
            if (p.allocations) {
                // STRICT MATCHING for allocations - ignore descriptions entirely
                const matchingKey = Object.keys(p.allocations).find(k => cleanKey(k) === targetKey);
                if (matchingKey) paid += Number(p.allocations[matchingKey]) || 0;
            }
        });

        let status: 'none' | 'partial' | 'full' = 'none';
        if (billed > 0) {
            if (paid >= billed) status = 'full';
            else if (paid > 0) status = 'partial';
        } else if (paid > 0) {
            status = 'full';
        }

        return { paid, billed, status };
    };

    const calculateCreditPool = (studentId: number, stats: any) => {
        let identifiedPaid = 0;
        [...matrixColumns.priority, ...matrixColumns.billings].forEach(col => {
            identifiedPaid += getCellData(studentId, col).paid;
        });
        return Math.max(0, stats.totalPayments - identifiedPaid);
    };

    const matrixColumns = useMemo(() => {
        const billingCategories = new Set<string>();
        const installmentCategories = new Set<string>();

        // Dynamic Priority Billings
        const priorityBillings = ['Brought Forward', 'Tuition Fees'];

        // Add Registration & Functional Fees only if non-zero or Compulsory
        const potentialFees = ['Functional Fees', 'Guild Fee', 'Registration'];
        potentialFees.forEach(feeName => {
            const isCompulsory = localCompulsoryFees.some(f => f.name.toLowerCase() === feeName.toLowerCase());

            // Check if ANY student in the current filtered list has a non-zero feeStructure or billing for this
            const hasValue = enrolledStudents.some(s => {
                const prog = programmes.find(p => p.id === s.programme || p.name === s.programme);
                const feeConfig = prog?.feeStructure?.find(f => f.level === s.level);
                const structureVal = feeConfig ? (feeConfig as any)[feeName.toLowerCase().replace(' ', '')] || 0 : 0;
                if (structureVal > 0) return true;

                // Also check actual billings
                return billings.some(b => b.studentId === s.id && (b.description || '').toLowerCase().includes(feeName.toLowerCase()) && b.amount > 0);
            });

            if (isCompulsory || hasValue) {
                priorityBillings.push(feeName);
            }
        });

        filteredStudents.forEach(s => {
            // Identify the Relevant Semester for column generation
            const studentTerm = s.semester || s.level || 'Year 1 Semester 1';
            const activeAuditingTerm = filterLevel || studentTerm;

            billings.filter(b => b.studentId === s.id).forEach(b => {
                const desc = b.description || b.type || '';
                const descLower = desc.toLowerCase();

                // 1. BROAD TUITION & BF SUPPRESSION (Regex-based)
                if (/tuition|brought|forward|bf|arrears/i.test(descLower)) return;

                // 2. SEMESTER MISMATCH SUPPRESSION (The Service Zombie Killer)
                const semMatch = desc.match(/(Year\s*\d+\s*(Semester|Sem)\s*\d+|Y\d+S\d+)/i);
                if (semMatch) {
                    const descSemester = semMatch[0];
                    // If the bill's specified semester doesn't match the relevant viewing context, suppress column header
                    if (compareTerms(descSemester, activeAuditingTerm) !== 0) {
                        return; // This flows into BF via getCellData
                    }
                }

                // 3. SUPPRESS PAST-TERM COLUMNS based on metadata tag if filterLevel is active
                if (filterLevel && b.term && isPastTerm(b.term, filterLevel)) {
                    return;
                }

                // 4. NORMALIZATION: Strip semester tags from column name for cleaner headers and merging
                if (!priorityBillings.some(p => descLower.includes(p.toLowerCase()))) {
                    let name = desc.replace(/Billed:\s*/i, '').trim();
                    if (semMatch) {
                        // Strip the "- Year X Sem Y" part to merge columns like "Development Fees - Y1" into one "Development Fees"
                        name = name.replace(semMatch[0], '').replace(/-?\s*$/, '').trim();
                    }
                    if (name) billingCategories.add(name);
                }
            });
            payments.filter(p => p.studentId === s.id).forEach(p => {
                const desc = p.description || '';
                if (desc.toLowerCase().includes('installment')) {
                    const match = desc.match(/(\d+(st|nd|rd|th)|First|Second|Third|Fourth)\s+Installment/i);
                    const name = match ? match[0] : "Installment";
                    installmentCategories.add(name);
                }
            });
        });

        return {
            priority: priorityBillings,
            billings: Array.from(billingCategories).sort(),
            installments: Array.from(installmentCategories).sort((a, b) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numA - numB;
            }),
            audit: ['Credit Pool', 'Total Billed', 'Total Paid', 'Balance', '% Cleared']
        };
    }, [filteredStudents, billings, payments, localCompulsoryFees, programmes, filterLevel]);

    const handleExportCSV = () => {
        const allCols = [
            ...matrixColumns.priority,
            ...matrixColumns.installments,
            ...matrixColumns.billings,
            ...matrixColumns.audit
        ];

        const headers = ["Student Name", "Pay Code", ...allCols];

        const rows = filteredStudents.map(s => {
            const studentTx = transactions.filter(t => t.studentName === s.name);
            const stats = calculateStudentFinancials(s, studentTx);
            const pct = stats.clearanceTarget > 0 ? (stats.clearancePaid / stats.clearanceTarget) * 100 : 100;

            const studentRow = [
                s.name,
                s.payCode
            ];

            allCols.forEach(col => {
                let cellValue = '0';
                if (matrixColumns.audit.includes(col)) {
                    if (col === 'Credit Pool') cellValue = calculateCreditPool(s.id, stats).toString();
                    else if (col === 'Total Billed') cellValue = stats.totalBilled.toString();
                    else if (col === 'Total Paid') cellValue = stats.totalPayments.toString();
                    else if (col === 'Balance') cellValue = stats.outstandingBalance.toString();
                    else if (col === '% Cleared') cellValue = Math.round(pct).toString() + '%';
                } else {
                    const isInstallment = matrixColumns.installments.includes(col);
                    const data = getCellData(s.id, col, isInstallment);

                    if (col === 'Tuition Fees' || col === 'Tuition') {
                        cellValue = `${data.paid} / ${data.billed}`;
                    } else {
                        cellValue = data.paid.toString();
                    }
                }
                studentRow.push(cellValue);
            });

            return studentRow.map(v => typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v}"` : v);
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `matrix_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
        else setSelectedIds([]);
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <style jsx global>{`
                .account-row:hover { background: rgba(255,255,255,0.03); cursor: pointer; }
                .req-box {
                    padding: 0.8rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(0,0,0,0.2);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    min-height: 100px;
                    text-align: center;
                    position: relative;
                }
                .req-box:hover { background: rgba(255,255,255,0.05); }
                
                /* Hide Spinner Arrows on Number Inputs */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
                .exclamation {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    font-size: 11px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                /* High Contrast Inputs for Dark Mode */
                input, select {
                    color: white !important; /* Force visible text */
                }
                option {
                    background-color: #1a1a1a; /* Dark background for dropdowns */
                }

                @media (max-width: 768px) {
                    .matrix-container {
                        width: 100% !important;
                        max-width: 100vw !important;
                        padding-right: 0 !important;
                        margin: 0 -1rem;
                        border-radius: 0 !important;
                    }
                    header {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 1.5rem;
                    }
                    .no-print {
                        align-items: stretch !important;
                    }
                    .no-print > div {
                        flex-direction: column !important;
                        width: 100%;
                    }
                    .no-print input {
                        width: 100% !important;
                    }
                    .mobile-card-grid {
                        display: none !important;
                    }
                    .desktop-table {
                        display: table !important;
                        font-size: 0.85rem;
                    }
                    .desktop-table th,
                    .desktop-table td {
                        padding: 0.75rem !important;
                    }
                    /* Removing sticky column on mobile to prevent overlapping content */
                    .desktop-table th:nth-child(3),
                    .desktop-table td:nth-child(3) {
                        position: static !important;
                        background: transparent !important;
                        box-shadow: none !important;
                    }
                }
                @media (min-width: 769px) {
                    .mobile-card-grid {
                        display: none !important;
                    }
                }
                    color: white;
                }
                .matrix-table th, .matrix-table td {
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 0.5rem;
                    font-size: 0.75rem;
                    white-space: nowrap;
                }
                .matrix-container::-webkit-scrollbar {
                    height: 14px !important;
                    display: block !important;
                }
                .matrix-container::-webkit-scrollbar-track {
                    background: #000 !important;
                    border-radius: 10px;
                }
                .matrix-container::-webkit-scrollbar-thumb {
                    background: #3b82f6 !important; 
                    border-radius: 10px !important;
                    border: 3px solid #000 !important;
                    min-width: 50px !important;
                }
                .matrix-container::-webkit-scrollbar-thumb:hover {
                    background: #60a5fa !important;
                }
                .matrix-nav-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    transition: all 0.2s;
                    z-index: 100;
                }
                .matrix-nav-btn:hover {
                    transform: scale(1.1);
                    background: #2563eb;
                }
                .matrix-nav-btn:active {
                    transform: scale(0.95);
                }
                /* Custom Checkbox for particular filter */
                .custom-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .custom-checkbox:hover {
                    background: rgba(255,255,255,0.1);
                }
                /* Print Styles */
                .print-only { display: none; }
                @media print {
                    @page { size: auto; margin: 5mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 100vw; height: auto !important; overflow: visible !important; }
                    body * { visibility: hidden; }
                    
                    /* Visibility - Explicitly show Header and Table Area */
                    .print-area, .print-area *, .print-only, .print-only * { visibility: visible !important; }
                    
                    /* Layout Flow */
                    .print-area, .print-only { 
                        position: static !important; 
                        width: 100% !important; 
                        margin: 0 !important; padding: 0 !important; 
                        background: transparent !important; 
                        box-shadow: none !important; 
                        overflow: visible !important; 
                    }

                    /* Hide non-print elements */
                    .no-print, header, .btn, input, select, .status-settings-toggle, .col-checkbox, .col-ring, .col-sync { display: none !important; }
                    
                    /* Table Styling - Clean Grid */
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important; 
                        border: 1px solid #000 !important; 
                        font-family: 'Arial', sans-serif !important; 
                        font-size: 9pt !important; 
                        margin-top: 10px !important; 
                    }
                    th, td { 
                        border: 1px solid #000 !important; 
                        padding: 4px 6px !important; 
                        color: black !important; 
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #f0f0f0 !important; 
                        font-weight: bold; 
                        text-transform: uppercase; 
                        font-size: 8pt !important; 
                        border-bottom: 2px solid #000 !important;
                    }
                    
                    /* Specific Column Alignments */
                    .text-right { text-align: right !important; }
                    .text-center { text-align: center !important; }
                    
                    /* Utilities */
                    .print-only { display: block !important; }
                    tr { page-break-inside: avoid; }
                    tr:nth-child(even) { background-color: #fafafa !important; }
                    
                    /* Cleanup */
                    .card, .account-row { border: none !important; box-shadow: none !important; background: transparent !important; }
                    div, span { color: black !important; opacity: 1 !important; text-shadow: none !important; }
                }
            `}</style>

            {/* PRINT HEADER OVERLAY */}
            <div className="print-only" style={{ marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '20pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{schoolProfile?.name || 'VINE SCHOOLS'}</div>
                        <div style={{ fontSize: '12pt', marginTop: '5px' }}>Academics & Bursar Department</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>LEARNERS ACCOUNT REPORT</div>
                        <div style={{ fontSize: '10pt', marginTop: '5px' }}>Date: {new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '9pt', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                    <div><strong>Programme:</strong> {filterProgramme || 'All Programmes'}</div>
                    <div><strong>Level:</strong> {filterLevel || 'All Levels'}</div>
                    <div><strong>Status:</strong> {filterStatus ? filterStatus.toUpperCase() : 'ALL STATUSES'}</div>
                    <div><strong>Count:</strong> {filteredStudents.length} Students</div>
                </div>
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-4" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight uppercase">Learners <span className="text-blue-500">Accounts</span></h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>Manage academic billing and requirement status.</p>
                </div>
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="btn btn-outline"
                            style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {showMobileFilters ? '✕ Hide Filters' : '🔍 Filters'}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="btn"
                            style={{ background: '#22c55e', color: 'white', fontWeight: 'bold' }}
                        >
                            📊 Export CSV
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn"
                            style={{ background: 'white', color: 'black', fontWeight: 'bold' }}
                        >
                            🖨️ Print Report
                        </button>


                        <div className={`${showMobileFilters ? 'flex' : 'hidden'} flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6`}>
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                                <div className="hidden md:flex" style={{
                                    display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px'
                                }}>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            background: viewMode === 'list' ? '#3b82f6' : 'transparent',
                                            color: 'white',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📋 List View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('matrix')}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            background: viewMode === 'matrix' ? '#3b82f6' : 'transparent',
                                            color: 'white',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📊 Matrix View
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search name or code..."
                                    className="input w-full md:w-[350px]"
                                    value={searchTerm}
                                    list="search-suggestions"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'white' }}
                                />
                                <datalist id="search-suggestions">
                                    {enrolledStudents.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                {/* Column Toggle Dropdown */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                        className="p-3 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm flex items-center gap-2"
                                    >
                                        👁️ Columns
                                    </button>
                                    {showColumnDropdown && (
                                        <div style={{
                                            position: 'absolute', top: '110%', right: 0,
                                            background: '#222', border: '1px solid #444', borderRadius: '10px',
                                            padding: '1rem', zIndex: 100, minWidth: '150px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                        }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={visibleColumns.details} onChange={() => setVisibleColumns(p => ({ ...p, details: !p.details }))} style={{ marginRight: '0.5rem' }} /> Student Details
                                            </label>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={visibleColumns.outstanding} onChange={() => setVisibleColumns(p => ({ ...p, outstanding: !p.outstanding }))} style={{ marginRight: '0.5rem' }} /> Current Arrears
                                            </label>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={visibleColumns.ring} onChange={() => setVisibleColumns(p => ({ ...p, ring: !p.ring }))} style={{ marginRight: '0.5rem' }} /> Clearance Ring
                                            </label>
                                            <label style={{ display: 'block', marginBottom: '0px', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={visibleColumns.sync} onChange={() => setVisibleColumns(p => ({ ...p, sync: !p.sync }))} style={{ marginRight: '0.5rem' }} /> Portal Sync
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <select
                                    value={filterProgramme}
                                    onChange={(e) => setFilterProgramme(e.target.value)}
                                    className="flex-1 md:flex-initial p-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm"
                                >
                                    <option value="">All Programmes</option>
                                    {programmes?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="flex-1 md:flex-initial p-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="clearance">Cleared</option>
                                    <option value="probation">Probation</option>
                                    <option value="defaulter">Defaulter</option>
                                </select>
                            </div>
                        </div>     {/* MULTI-SELECT PARTICULARS DROPDOWN */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowParticularsDropdown(!showParticularsDropdown)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <span>{filterParticulars.length > 0 ? `${filterParticulars.length} Selected` : 'Filter Payments...'}</span>
                                <span style={{ fontSize: '0.7rem' }}>▼</span>
                            </button>

                            {showParticularsDropdown && (
                                <div style={{
                                    position: 'absolute', top: '110%', left: 0,
                                    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', padding: '0.5rem', zIndex: 100,
                                    width: '220px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.5rem', paddingLeft: '0.4rem' }}>SELECT MULTIPLE:</div>
                                    {['Tuition Fees', ...services.map(s => s.name)].map(p => (
                                        <div key={p} className="custom-checkbox" onClick={() => toggleFilterParticular(p)}>
                                            <input
                                                type="checkbox"
                                                checked={filterParticulars.includes(p)}
                                                onChange={() => { }} // Handled by div click
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <span style={{ fontSize: '0.85rem' }}>{p}</span>
                                        </div>
                                    ))}
                                    <div
                                        onClick={() => { setFilterParticulars([]); setShowParticularsDropdown(false); }}
                                        style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        Clear Filter
                                    </div>
                                </div>
                            )}
                        </div>
                        <select
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '8px' }}
                        >
                            <option value="">All Levels</option>
                            {levels && levels.length > 0 ? (
                                levels.map(l => (
                                    <option key={l.id} value={l.name}>{l.name}</option>
                                ))
                            ) : (
                                <>
                                    <option value="Year 1">Year 1</option>
                                    <option value="Year 2">Year 2</option>
                                    <option value="Year 3">Year 3</option>
                                </>
                            )}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>Balance Range:</span>
                            <input
                                type="number"
                                placeholder="Min"
                                value={minBalance}
                                onChange={(e) => setMinBalance(Number(e.target.value))}
                                style={{ width: '80px', background: 'none', border: 'none', color: 'white', fontSize: '0.8rem' }}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxBalance}
                                onChange={(e) => setMaxBalance(Number(e.target.value))}
                                style={{ width: '80px', background: 'none', border: 'none', color: 'white', fontSize: '0.8rem' }}
                            />
                        </div>
                        <button
                            onClick={() => { setFilterLevel(''); setFilterProgramme(''); setFilterStatus(''); setMinBalance(0); setMaxBalance(10000000); setSearchTerm(''); setFilterParticulars([]); }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </header>

            {/* --- SMART STATUS SETTINGS --- */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                    onClick={() => setShowStatusSettings(!showStatusSettings)}
                    style={{
                        padding: '0.8rem 1.2rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#3b82f6',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}
                >
                    <span>⚙️ CONFIGURE SMART STATUS CRITERIA</span>
                    <span>{showStatusSettings ? 'Collapse ↑' : 'Expand ↓'}</span>
                </div>

                {showStatusSettings && (
                    <div className="animate-fade-in" style={{
                        padding: '1.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: 0, color: '#60a5fa' }}>SMART STATUS CRITERIA</h4>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowHistoryModal(!showHistoryModal)}
                                    className="btn"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        color: '#aaa',
                                        fontSize: '0.8rem',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '20px',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <span>🕒 History</span>
                                </button>
                                {showHistoryModal && (
                                    <div style={{
                                        position: 'fixed', inset: 0,
                                        background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{
                                            background: '#222', border: '1px solid #444', borderRadius: '10px',
                                            padding: '1.5rem', width: '400px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            maxHeight: '80vh', overflowY: 'auto'
                                        }}>
                                            <h5 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid #444', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Recent Status Updates</h5>

                                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Current Active Criteria</div>
                                                <div style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: '1.5' }}>
                                                    ✅ <strong>Clear:</strong> ≥{financialSettings.clearancePct}% + Requirements<br />
                                                    ⚠️ <strong>Probation:</strong> ≥{financialSettings.probationPct}%<br />
                                                    💰 <strong>Mandatory Fees:</strong> {financialSettings.compulsoryFees?.length || 0} items
                                                </div>
                                            </div>

                                            {statusHistory.length === 0 ? (
                                                <p style={{ fontSize: '0.9rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No history yet.</p>
                                            ) : (
                                                statusHistory.map((h, i) => (
                                                    <div key={i} style={{ marginBottom: '1rem', fontSize: '0.85rem', opacity: 0.8, paddingBottom: '0.5rem', borderBottom: '1px solid #333' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.2rem' }}>{h.date}</div>
                                                        <div style={{ color: '#ccc' }}>{h.rules}</div>
                                                    </div>
                                                ))
                                            )}
                                            <button
                                                onClick={() => setShowHistoryModal(false)}
                                                className="btn"
                                                style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', background: '#333', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                                            >
                                                Close History
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '0.5rem' }}>CLEARANCE TARGET (%)</label>
                                <input
                                    type="number"
                                    className="input"
                                    min="0"
                                    max="100"
                                    value={localClearancePct}
                                    onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setLocalClearancePct(val);
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.2)', width: '100%' }}
                                />
                                <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '0.4rem' }}>Students with ≥ {localClearancePct}% paid will be marked "Cleared"</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '0.5rem' }}>PROBATION TARGET (%)</label>
                                <input
                                    type="number"
                                    className="input"
                                    min="0"
                                    max="100"
                                    value={localProbationPct}
                                    onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setLocalProbationPct(val);
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.2)', width: '100%' }}
                                />
                                <p style={{ fontSize: '0.65rem', color: '#8b5cf6', marginTop: '0.4rem' }}>Students with {localProbationPct}% to {localClearancePct - 1}% paid will be marked "Probation"</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '0.5rem' }}>DEFAULTER RANGE (%)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={`< ${localProbationPct}%`}
                                    readOnly // Auto-calculated
                                    style={{ background: 'rgba(0,0,0,0.5)', width: '100%', cursor: 'not-allowed', color: 'rgba(255,255,255,0.5)' }}
                                />
                                <p style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '0.4rem' }}>Auto-calculated: Below {localProbationPct}%</p>
                            </div>
                        </div>

                        {/* COMPULSORY FEES SECTION */}
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '1rem', color: '#fbbf24' }}>MANDATORY FEE ITEMS (Required for Clearance)</label>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                {localCompulsoryFees.map(fee => (
                                    <div key={fee.id} style={{
                                        display: 'flex', alignItems: 'center',
                                        background: fee.type === 'probation' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        border: `1px solid ${fee.type === 'probation' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                        borderRadius: '20px', padding: '0.3rem 0.8rem', gap: '0.5rem'
                                    }}>
                                        <span style={{ fontSize: '0.8rem', color: fee.type === 'probation' ? '#a78bfa' : '#34d399' }}>
                                            {fee.type === 'probation' ? '[Probation] ' : '[Clearance] '}
                                            {fee.category === 'physical' ? '📦 ' : ''}
                                            {fee.name}
                                            {fee.category !== 'physical' && `: ${fee.amount.toLocaleString()}`}
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Remove "${fee.name}"? Statuses will be updated.`)) {
                                                    const newFees = localCompulsoryFees.filter(f => f.id !== fee.id);
                                                    setLocalCompulsoryFees(newFees);

                                                    // Trigger Immediate Recalc for ALL students
                                                    const updatedStudents = recalculateStatusWithFees(enrolledStudents, newFees);
                                                    setEnrolledStudents(updatedStudents);
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem' }}>×</button>
                                    </div>
                                ))}
                                {localCompulsoryFees.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>No mandatory fees configured.</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', opacity: 0.5 }}>Fee Name (Select from Particulars)</label>
                                    <select
                                        value={newFeeName}
                                        className="input"
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNewFeeName(val);

                                            // Auto-populate amount logic
                                            const service = services.find(s => s.name === val);

                                            if (val === 'Physical Requirements') {
                                                setNewFeeAmount("0"); // Amount irrelevant for physical
                                            } else if (service) {
                                                setNewFeeAmount(service.cost.toString());
                                            } else if (val === 'custom') {
                                                const customName = prompt("Enter Custom Fee Name:");
                                                if (customName) setNewFeeName(customName);
                                                else setNewFeeName(""); // Reset if cancelled
                                                setNewFeeAmount("");
                                            } else {
                                                setNewFeeAmount("");
                                            }
                                        }}
                                    >
                                        <option value="">-- Select Fee Item --</option>
                                        {['Tuition Fees', ...services.map(s => s.name)].map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                        <option value="Physical Requirements">Inventory / Physical Requirements</option>
                                        <option value="custom">-- Custom / Other --</option>
                                    </select>
                                </div>
                                <div style={{ width: '150px' }}>
                                    <label style={{ fontSize: '0.7rem', opacity: 0.5 }}>Amount (UGX)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0"
                                        value={newFeeAmount}
                                        onChange={(e) => setNewFeeAmount(e.target.value)}
                                        disabled={newFeeName === 'Physical Requirements'}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        style={{ width: '100%', background: newFeeName === 'Physical Requirements' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', opacity: newFeeName === 'Physical Requirements' ? 0.5 : 1 }}
                                    />
                                </div>
                                <div style={{ width: '200px' }}>
                                    <label style={{ fontSize: '0.7rem', opacity: 0.5 }}>Requirement Type</label>
                                    <select
                                        className="input"
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                        value={newFeeType}
                                        onChange={(e) => setNewFeeType(e.target.value as 'clearance' | 'probation')}
                                    >
                                        <option value="clearance">Required for Clearance</option>
                                        <option value="probation">Required for Probation</option>
                                    </select>
                                </div>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                        if (newFeeName && (newFeeAmount || newFeeName === 'Physical Requirements')) {
                                            if (localCompulsoryFees.some(f => f.name === newFeeName && f.type === newFeeType)) {
                                                alert("This requirement is already in the list!");
                                                return;
                                            }
                                            // Explicitly create a new array ref to force update
                                            const isPhysical = newFeeName === 'Physical Requirements';
                                            const newFee: CompulsoryFee = {
                                                id: Date.now().toString(),
                                                name: newFeeName,
                                                amount: isPhysical ? 0 : Number(newFeeAmount),
                                                type: newFeeType,
                                                category: isPhysical ? 'physical' : 'monetary'
                                            };
                                            setLocalCompulsoryFees(prev => [...prev, newFee]);

                                            setNewFeeName("");
                                            setNewFeeAmount("");
                                        }
                                    }}
                                    style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
                                >
                                    + Add Req
                                </button>
                            </div>
                            <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.8rem' }}>
                                * Students MUST pay these items fully (via 'Allocations' or 'Particulars') to be marked "Cleared" even if they meet the percentage.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                onClick={() => {
                                    if (confirm("⚠️ FACTORY RESET: This will clear ALL data (Students, Transactions, Settings) and reload the page.\n\nAre you sure?")) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                                className="btn"
                                style={{ background: '#ef4444', color: 'white', fontWeight: 'bold', padding: '0.6rem 1.5rem', borderRadius: '10px' }}
                            >
                                🗑️ Reset Data
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                className="btn"
                                style={{ background: '#3b82f6', color: 'white', fontWeight: 'bold', padding: '0.6rem 2rem', borderRadius: '10px' }}
                            >
                                ✅ Save Configuration
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="card print-area" style={{ padding: '0.5rem md:1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {viewMode === 'list' ? (
                    <>
                        <div className="overflow-x-auto -mx-2 md:mx-0 custom-scrollbar">
                            <table className="desktop-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', fontSize: '0.8rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <th className="print-only" style={{ width: '50px', paddingTop: '1rem', paddingBottom: '1rem' }}>S/N</th>
                                        <th style={{ padding: '1rem' }} className="col-checkbox">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                                            />
                                        </th>
                                        {visibleColumns.details && <th style={{ padding: '1rem' }}>Student Details</th>}
                                        {visibleColumns.outstanding && <th style={{ padding: '1rem' }} className="text-right">Current Arrears</th>}
                                        {visibleColumns.ring && <th style={{ padding: '1rem', textAlign: 'center' }} className="col-ring">Clearance Ring</th>}
                                        {visibleColumns.sync && <th style={{ padding: '1rem', textAlign: 'right' }} className="col-sync">Portal Sync</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                                                <h3>No learners found</h3>
                                                <p>Try adjusting your filters or search terms.</p>
                                                <button
                                                    onClick={() => { setFilterLevel(''); setFilterProgramme(''); setFilterStatus(''); setMinBalance(0); setMaxBalance(10000000); setSearchTerm(''); setFilterParticulars([]); }}
                                                    style={{ marginTop: '1rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Clear all filters
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                    {filteredStudents.map((student, index) => (
                                        <tr key={student.id} className="account-row" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                            <td className="print-only text-center" style={{ padding: '1rem' }}>{index + 1}</td>
                                            <td className="col-checkbox" style={{ padding: '1rem', borderRadius: '16px 0 0 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(student.id)}
                                                    onChange={() => toggleSelect(student.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            {visibleColumns.details && (
                                                <td
                                                    onClick={() => handleViewStudent(student)}
                                                    style={{ padding: '1.2rem' }}
                                                >
                                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem' }} className="print:text-black">
                                                        {student.name}
                                                        {student.compassNumber && (
                                                            <span title="Compass Number" style={{
                                                                fontSize: '0.75rem',
                                                                background: '#ec4899', // Pinkish
                                                                color: 'white',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                boxShadow: '0 2px 5px rgba(236, 72, 153, 0.4)',
                                                                border: '1px solid rgba(255,255,255,0.2)'
                                                            }}>
                                                                #{student.compassNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.2rem' }}>
                                                        {student.payCode} • {student.programme} • {student.semester}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.outstanding && (
                                                <td className="text-right" style={{ padding: '1rem' }} onClick={() => handleViewStudent(student)}>
                                                    <div style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: '800',
                                                        color: student.balance > 0 ? '#ef4444' : '#10b981'
                                                    }}>
                                                        {formatMoney(student.balance)}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{student.balance > 0 ? 'Debt' : 'Cleared'}</div>
                                                </td>
                                            )}
                                            {visibleColumns.ring && (
                                                <td className="col-ring" style={{ padding: '1rem' }} onClick={() => handleViewStudent(student)}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <StatusRing student={student} size={50} />
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.sync && (
                                                <td className="col-sync" style={{ padding: '1rem', textAlign: 'right', borderRadius: '0 16px 16px 0' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={(e) => { e.stopPropagation(); handlePostToPortal(student); }}
                                                        style={{
                                                            background: '#3b82f6',
                                                            borderColor: '#3b82f6',
                                                            fontSize: '0.8rem',
                                                            padding: '0.4rem 1rem',
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                        }}
                                                    >
                                                        🚀 Post
                                                    </button>
                                                    {student.lastPosted && (
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '0.3rem' }}>Last Sync: {student.lastPosted}</div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-card-grid">
                            {filteredStudents.length === 0 && (
                                <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                                    <h3>No learners found</h3>
                                </div>
                            )}
                            {filteredStudents.map((student) => {
                                const studentTx = transactions.filter(t => t.studentName === student.name);
                                const stats = calculateStudentFinancials(student, studentTx);

                                return (
                                    <div key={student.id}
                                        onClick={() => handleViewStudent(student)}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '16px',
                                            padding: '1.25rem',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{student.name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.2rem' }}>
                                                    {student.payCode} • {student.semester}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                {student.compassNumber && (
                                                    <span style={{ fontSize: '0.6rem', background: '#ec4899', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>
                                                        #{student.compassNumber}
                                                    </span>
                                                )}
                                                <StatusRing student={student} size={30} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase' }}>Balance</div>
                                                <div style={{ fontWeight: '800', color: student.balance > 0 ? '#ef4444' : '#10b981' }}>
                                                    {formatMoney(student.balance)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase' }}>% Cleared</div>
                                                <div style={{ fontWeight: '800', color: '#60a5fa' }}>
                                                    {stats.clearanceTarget > 0 ? Math.round((stats.clearancePaid / stats.clearanceTarget) * 100) : 100}%
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePostToPortal(student); }}
                                                style={{
                                                    flex: 1,
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.6rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                🚀 Post to Portal
                                            </button>
                                            <button
                                                style={{
                                                    flex: 1,
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    padding: '0.6rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <div
                            ref={matrixRef}
                            className="matrix-container"
                            style={{
                                overflowX: 'auto',
                                overflowY: 'auto',
                                maxHeight: '80vh',
                                width: 'calc(100vw - 300px)',
                                borderRadius: '12px',
                                border: '1px solid #333',
                                position: 'relative',
                                paddingRight: '60px'
                            }}
                        >
                            <table className="matrix-table" style={{ width: 'max-content', borderCollapse: 'collapse', borderSpacing: 0, background: 'rgba(0,0,0,0.2)' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                    <tr style={{ background: '#111', color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                        <th style={{ background: '#111', width: '40px' }}>SN</th>
                                        <th style={{ background: '#111', textAlign: 'left', minWidth: '200px' }}>Student Name</th>
                                        <th style={{ background: '#111', textAlign: 'left' }}>Pay Code</th>

                                        {/* Main Billings */}
                                        {matrixColumns.priority.map(col => (
                                            <th key={col} style={{
                                                color: col === 'Brought Forward' ? '#ef4444' : '#aaa',
                                                borderLeft: '2px solid rgba(255,255,255,0.1)',
                                                background: col === 'Brought Forward' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                            }}>
                                                {col}
                                            </th>
                                        ))}

                                        {/* Installments */}
                                        {matrixColumns.installments.map(col => <th key={col} style={{ color: '#3b82f6' }}>{col}</th>)}

                                        {/* Other Services */}
                                        {matrixColumns.billings.map(col => <th key={col} style={{ color: '#fbbf24' }}>{col}</th>)}

                                        {/* Audit Group */}
                                        {matrixColumns.audit.map(col => (
                                            <th key={col} title={col === 'Credit Pool' ? "Unallocated advance payments that can cover other bills" : ""} style={{
                                                background: col === 'Credit Pool' ? 'rgba(59, 130, 246, 0.1)' : '#222',
                                                color: col === 'Credit Pool' ? '#60a5fa' : '#10b981',
                                                borderLeft: (col === 'Total Billed' || col === 'Credit Pool') ? `2px solid ${col === 'Credit Pool' ? '#3b82f6' : '#10b981'}` : 'none',
                                                position: 'static',
                                                zIndex: 1,
                                                minWidth: col === '% Cleared' ? '100px' : 'auto',
                                                textAlign: col === '% Cleared' ? 'center' : 'right'
                                            }}>
                                                {col}
                                                {col === 'Credit Pool' && <span style={{ marginLeft: '4px', opacity: 0.6, fontSize: '0.6rem' }}>ⓘ</span>}
                                            </th>
                                        ))}
                                        {/* Spacer Column */}
                                        <th style={{ width: '100px', border: 'none', background: 'transparent' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student, idx) => {
                                        const studentTx = transactions.filter(t => t.studentName === student.name);
                                        const stats = calculateStudentFinancials(student, studentTx);
                                        const pct = stats.clearanceTarget > 0 ? (stats.clearancePaid / stats.clearanceTarget) * 100 : 100;

                                        const studentCreditPoolTotal = calculateCreditPool(student.id, stats);
                                        let remainingCredit = studentCreditPoolTotal;

                                        const renderCell = (col: string, isInstallment = false) => {
                                            const data = getCellData(student.id, col, isInstallment);

                                            let status = data.status;
                                            let isCoveredByCredit = false;

                                            if (status !== 'full' && data.billed > 0) {
                                                const unpaid = data.billed - data.paid;
                                                if (remainingCredit >= unpaid && unpaid > 0) {
                                                    isCoveredByCredit = true;
                                                    remainingCredit -= unpaid;
                                                    status = 'full';
                                                }
                                            }

                                            const cellBg = status === 'full' ? 'rgba(16, 185, 129, 0.25)' : status === 'partial' ? 'rgba(251, 191, 36, 0.25)' : data.billed > 0 ? 'rgba(239, 68, 68, 0.15)' : 'transparent';
                                            const borderLeft = status === 'full' ? '3px solid #10b981' : status === 'partial' ? '3px solid #fbbf24' : data.billed > 0 ? '3px solid #ef4444' : '1px solid rgba(255,255,255,0.05)';

                                            let icon = '';
                                            if (data.billed > 0) {
                                                if (isCoveredByCredit) icon = '💳';
                                                else if (status === 'full') icon = '✅';
                                                else if (status === 'partial') icon = '⚠️';
                                                else icon = '❗';
                                            } else if (data.paid > 0) {
                                                icon = '✅';
                                            }

                                            return (
                                                <td key={col} style={{ background: cellBg, borderLeft, textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                        <div style={{ fontWeight: '600', color: (data.status === 'none' && data.billed > 0) ? '#ef4444' : '#fff', fontSize: '0.85rem' }}>
                                                            {data.paid > 0 || data.billed > 0 ? formatMoney(data.paid) : '-'}
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem' }} title={isCoveredByCredit ? "Covered by Credit Pool" : ""}>{icon}</span>
                                                    </div>
                                                    {data.billed > 0 && <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>of {formatMoney(data.billed)}</div>}
                                                </td>
                                            );
                                        };

                                        return (
                                            <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ background: '#1a1a1a', textAlign: 'center' }}>{idx + 1}</td>
                                                <td
                                                    onClick={() => handleViewStudent(student)}
                                                    style={{
                                                        background: '#1a1a1a',
                                                        cursor: 'pointer', fontWeight: 'bold', color: '#3b82f6'
                                                    }}
                                                >
                                                    {student.name}
                                                </td>
                                                <td style={{ background: '#1a1a1a' }}>{student.payCode}</td>

                                                {matrixColumns.priority.map(col => renderCell(col))}
                                                {matrixColumns.installments.map(col => renderCell(col, true))}
                                                {matrixColumns.billings.map(col => renderCell(col))}

                                                {matrixColumns.audit.map(col => {
                                                    const isStickyRight = col === '% Cleared';
                                                    if (col === 'Credit Pool') {
                                                        return (
                                                            <td key={col} title="Unallocated funds available to cover fees" style={{ background: 'rgba(59, 130, 246, 0.1)', color: studentCreditPoolTotal > 0 ? '#60a5fa' : '#666', textAlign: 'right', fontWeight: 'bold', borderLeft: '2px solid #3b82f6' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                    {studentCreditPoolTotal > 0 && <span style={{ fontSize: '0.8rem' }}>💰</span>}
                                                                    {formatMoney(studentCreditPoolTotal)}
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    if (col === 'Total Billed') return <td key={col} style={{ background: 'rgba(16,185,129,0.05)', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(stats.totalBilled)}</td>;
                                                    if (col === 'Total Paid') return <td key={col} style={{ background: 'rgba(16,185,129,0.05)', textAlign: 'right' }}>{formatMoney(stats.totalPayments)}</td>;
                                                    if (col === 'Balance') return <td key={col} style={{ background: 'rgba(16,185,129,0.05)', textAlign: 'right', color: stats.outstandingBalance > 0 ? '#ef4444' : '#10b981' }}>{formatMoney(stats.outstandingBalance)}</td>;
                                                    if (col === '% Cleared') {
                                                        const statusColor = pct >= localClearancePct ? '#10b981' : pct >= localProbationPct ? '#f59e0b' : '#ef4444';
                                                        return (
                                                            <td key={col} style={{
                                                                background: '#1a1a1a',
                                                                textAlign: 'center',
                                                                minWidth: '100px',
                                                                borderLeft: '1px solid rgba(255,255,255,0.1)'
                                                            }}>
                                                                <div style={{
                                                                    background: statusColor,
                                                                    color: '#fff',
                                                                    margin: '4px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '20px',
                                                                    fontWeight: '900',
                                                                    fontSize: '0.9rem',
                                                                    boxShadow: `0 0 10px ${statusColor}44`,
                                                                    display: 'inline-block',
                                                                    minWidth: '60px'
                                                                }}>
                                                                    {Math.round(pct)}%
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                                {/* Spacer Cell */}
                                                <td style={{ width: '100px', border: 'none', background: 'transparent' }}></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 20 }}>
                                    <tr style={{ background: '#222', fontWeight: 'bold' }}>
                                        <td colSpan={3} style={{ position: 'sticky', left: 0, background: '#222', zIndex: 10, textAlign: 'right' }}>MATRIX TOTALS:</td>

                                        {matrixColumns.priority.map(col => {
                                            const sum = filteredStudents.reduce((acc, s) => acc + getCellData(s.id, col).paid, 0);
                                            return <td key={col} style={{ textAlign: 'right', color: '#10b981' }}>{formatMoney(sum)}</td>;
                                        })}

                                        {matrixColumns.installments.map(col => {
                                            const sum = filteredStudents.reduce((acc, s) => acc + getCellData(s.id, col, true).paid, 0);
                                            return <td key={col} style={{ textAlign: 'right', color: '#3b82f6' }}>{formatMoney(sum)}</td>;
                                        })}

                                        {matrixColumns.billings.map(col => {
                                            const sum = filteredStudents.reduce((acc, s) => acc + getCellData(s.id, col).paid, 0);
                                            return <td key={col} style={{ textAlign: 'right', color: '#fbbf24' }}>{formatMoney(sum)}</td>;
                                        })}

                                        {/* Footer Audit Totals */}
                                        <td style={{ textAlign: 'right', color: '#60a5fa' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateCreditPool(s.id, calculateStudentFinancials(s, transactions.filter(t => t.studentName === s.name))), 0))}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateStudentFinancials(s, transactions.filter(t => t.studentName === s.name)).totalBilled, 0))}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateStudentFinancials(s, transactions.filter(t => t.studentName === s.name)).totalPayments, 0))}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateStudentFinancials(s, transactions.filter(t => t.studentName === s.name)).outstandingBalance, 0))}</td>
                                        <td style={{ textAlign: 'center' }}>-</td>
                                        {/* Spacer Cell */}
                                        <td style={{ width: '100px', border: 'none', background: 'transparent' }}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Floating Scroll Controls */}
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '25px',
                            display: 'flex',
                            gap: '12px',
                            zIndex: 100,
                            background: 'rgba(0,0,0,0.6)',
                            padding: '10px',
                            borderRadius: '30px',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <button onClick={() => scrollMatrix('left')} className="matrix-nav-btn" style={{ background: '#333' }} title="Scroll Left">◀</button>
                            <button onClick={() => scrollMatrix('right')} className="matrix-nav-btn" title="Scroll Right">▶</button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- STUDENT DETAIL MODAL --- */}
            {selectedStudent && (
                <LearnerAccountModal
                    studentId={selectedStudent.id}
                    onClose={() => setSelectedStudent(null)}
                    auditingContext={filterLevel || undefined}
                />
            )}

            {/* --- BULK ACTION BAR --- */}
            {
                selectedIds.length > 0 && (
                    <div style={{
                        position: 'fixed',
                        bottom: '2rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#3b82f6',
                        padding: '1rem 2rem',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        zIndex: 2100,
                        border: '1px solid rgba(255,255,255,0.2)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <style>{`
                        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                    `}</style>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>{selectedIds.length} learners selected</div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={handleSmartBulkStatus}
                                className="btn"
                                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                                🧠 Smart Categorize Status
                            </button>
                            <button
                                onClick={() => {
                                    enrolledStudents.filter(s => selectedIds.includes(s.id)).forEach(handlePostToPortal);
                                    setSelectedIds([]);
                                }}
                                className="btn"
                                style={{ background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px' }}
                            >
                                🚀 Bulk Post to Portal
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )
            }
            {/* --- DELETE REASON MODAL (Moved to Root) --- */}
            {
                showDeleteModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '16px', width: '400px', border: '1px solid #333' }}>
                            <h3 style={{ marginTop: 0 }}>Confirm Deletion</h3>
                            <p style={{ opacity: 0.7 }}>Please select a reason for removing this item:</p>

                            <select
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                style={{
                                    width: '100%', padding: '1rem', background: '#333',
                                    color: 'white', border: '1px solid #555', borderRadius: '8px',
                                    marginBottom: '1.5rem', outline: 'none'
                                }}
                            >
                                {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={confirmDelete}
                                    className="btn"
                                    style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold' }}
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn"
                                    style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid #555', padding: '0.8rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default function LearnersPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Account Data...</div>}>
            <LearnersContent />
        </Suspense>
    );
}
