"use client";
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { calculateStudentFinancials as calculateFinancials, normalizeKey } from '@/lib/financialCore';
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
        getSyncedDate,
        activeRole
    } = useSchoolData();
    const isDirector = activeRole === 'Director';

    // State
    const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>(isDirector ? 'matrix' : 'list');

    useEffect(() => {
        if (isDirector) {
            setViewMode('matrix');
        }
    }, [isDirector]);

    const [filterLevel, setFilterLevel] = useState('');
    const [filterProgramme, setFilterProgramme] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterParticulars, setFilterParticulars] = useState<string[]>([]);
    const [minBalance, setMinBalance] = useState<number>(-100000000);
    const [maxBalance, setMaxBalance] = useState<number>(100000000);
    const [showParticularsDropdown, setShowParticularsDropdown] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'balance_desc' | 'balance_asc'>('name');
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
                term: p.term, // Map term to transaction
                status: p.status
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

    // --- COUNT PENDING TRANSACTIONS FOR DIRECTOR ---
    const pendingTransactionCounts = useMemo(() => {
        if (!isDirector) return {};

        const counts: Record<number, number> = {};

        // Count pending payments (includes manual balance fixes which are stored as Payment objects)
        // CASE-INSENSITIVE CHECK: status can be 'Pending', 'pending', or 'PENDING'
        (payments || []).forEach(p => {
            const status = (p.status || '').toLowerCase();
            if (status === 'pending') {
                counts[p.studentId] = (counts[p.studentId] || 0) + 1;
            }
        });

        return counts;
    }, [payments, isDirector]);

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

            const currentTerm = filterLevel || selectedStudent.semester;
            const { outstandingBalance, totalBilled } = calculateFinancials(selectedStudent, billings, payments, bursaries, currentTerm);

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
        const currentTerm = filterLevel || student.semester;
        const { totalBilled, outstandingBalance } = calculateFinancials(student, billings, payments, bursaries, currentTerm);

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
            const { totalBilled, outstandingBalance } = calculateFinancials(selectedStudent, billings, payments, bursaries);

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

        const { totalBilled, outstandingBalance } = calculateFinancials(
            updatedStudentRef,
            billings,
            payments,
            bursaries
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
        const { totalBilled, outstandingBalance } = calculateFinancials(
            updatedStudentRef,
            billings,
            payments,
            bursaries
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
        const { clearanceTarget, clearancePaid } = calculateFinancials(student, billings, payments, bursaries);

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


    const filteredStudents = useMemo(() => {
        // First, calculate dynamic financials for everyone using the central engine
        const calculatedList = enrolledStudents.map(student => {
            const currentTerm = filterLevel || student.semester;
            const stats = calculateFinancials(student, billings, payments, bursaries, currentTerm);

            return {
                ...student,
                balance: stats.outstandingBalance,
                totalFees: stats.totalBilled,
                // Attach stats for easier downstream use
                stats
            };
        });

        const filtered = calculatedList.filter(s => {
            if (s.origin !== 'bursar') return false;
            if (s.status === 'graduated' || s.status === 'deactivated') return false;

            const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.payCode || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = filterLevel === '' || s.semester.includes(filterLevel);
            const matchesProg = filterProgramme === '' || s.programme === filterProgramme;
            const matchesBal = s.balance >= minBalance && s.balance <= maxBalance;

            const effectiveStatus = determineAutoStatus(s);
            const matchesStatus = filterStatus === '' || effectiveStatus === filterStatus;

            let matchesParticular = true;
            if (filterParticulars.length > 0) {
                const studentTx = transactions.filter(t => t.studentName === s.name);
                matchesParticular = filterParticulars.every(p =>
                    studentTx.some(t => t.particulars && t.particulars.includes(p))
                );
            }

            return matchesSearch && matchesLevel && matchesProg && matchesBal && matchesStatus && matchesParticular;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'balance_desc') return b.balance - a.balance;
            if (sortBy === 'balance_asc') return a.balance - b.balance;
            return 0;
        });
    }, [enrolledStudents, billings, payments, bursaries, searchTerm, filterLevel, filterProgramme, filterStatus, filterParticulars, minBalance, maxBalance, localClearancePct, localProbationPct, localCompulsoryFees, programmes, services, sortBy]);

    const globalStats = useMemo(() => {
        let totalPaid = 0;
        let totalTarget = 0;
        let totalOutstanding = 0;
        filteredStudents.forEach(s => {
            const stats = (s as any).stats;
            if (stats) {
                totalPaid += stats.clearancePaid;
                totalTarget += stats.clearanceTarget;
                totalOutstanding += s.balance;
            }
        });
        const percentage = totalTarget > 0 ? (totalPaid / totalTarget) * 100 : 0;
        const avgArrears = filteredStudents.length > 0 ? totalOutstanding / filteredStudents.length : 0;
        return { totalPaid, totalTarget, totalOutstanding, percentage, avgArrears };
    }, [filteredStudents]);


    // Helper to recalculate status with custom fees list (for immediate updates)
    const recalculateStatusWithFees = (
        students: EnrolledStudent[],
        feesList: CompulsoryFee[]
    ): EnrolledStudent[] => {
        return students.map(s => {
            const studentTx = transactions.filter(t => t.studentName === s.name);
            const stats = calculateFinancials(s, billings, payments, bursaries);
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
                const stats = calculateFinancials(s, billings, payments, bursaries);

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

    // --- FINANCIAL CALCULATIONS (Matrix & List) ---

    const getCellData = (studentId: number, colName: string, isInstallment = false) => {

        const student = enrolledStudents.find(s => s.id === studentId);
        if (!student) return { paid: 0, billed: 0, status: 'none' as any };

        const currentTerm = filterLevel || student.semester;
        const targetKey = normalizeKey(colName);


        // TERM CONTEXT (Critical for isolation)
        const isTargetTerm = (t?: string) => t === currentTerm || (!t && currentTerm === student.semester);

        if (targetKey === 'brought forward' || targetKey === 'arrears') {
            // BF Logic: Arrears from past semesters ONLY
            // 1. Check for explicit BF bills in CURRENT term
            const currentBFBills = billings.filter(b =>
                b.studentId === student.id &&
                isTargetTerm(b.term) &&
                /brought|forward|bf|arrears/i.test(b.description || b.type || "")
            );

            let billed = 0;
            let paid = 0;

            if (currentBFBills.length > 0) {
                billed = currentBFBills.reduce((sum, b) => sum + b.amount, 0);
            } else {
                // Fallback to student.previousBalance
                billed = student.previousBalance || 0;
            }

            // BF Payments: Check ALL term-matching payments for "Brought Forward" allocations
            const studentPayments = payments.filter(p => p.studentId === student.id && isTargetTerm(p.term));
            studentPayments.forEach(p => {
                if (p.allocations) {
                    const matchingKey = Object.keys(p.allocations).find(k => {
                        const ck = normalizeKey(k);
                        return ck === 'brought forward' || ck === 'bf' || ck === 'arrears' || ck === 'prev balance';
                    });

                    if (matchingKey) paid += (Number(p.allocations[matchingKey]) || 0);
                }
            });

            const bal = billed - paid;
            return { paid, billed, status: bal <= 0 ? (billed > 0 ? 'full' : 'none') : 'partial' as any };
        }

        // Specific Fee Columns (Tuition, Guild, etc.)
        const studentBillings = billings.filter(b => {
            if (b.studentId !== studentId) return false;
            if (!isTargetTerm(b.term)) return false; // STRICT ISOLATION

            const desc = b.description || b.type || '';
            const descLower = desc.toLowerCase();

            // Exclude BF/Arrears as they live in the BF column
            if (/brought|forward|bf|arrears/i.test(descLower)) return false;

            const billKey = normalizeKey(desc);
            return billKey === targetKey || billKey.includes(targetKey) || targetKey.includes(billKey);
        });


        let billed = studentBillings.reduce((sum, b) => sum + b.amount, 0);

        // Tuition Fallback & Bursary
        if (targetKey === 'tuition') {
            if (billed === 0) {
                const prog = programmes.find(p => p.id === student.programme || p.name === student.programme);
                const feeConfig = prog?.feeStructure?.find(f => f.level === (filterLevel || student.level));
                if (feeConfig) billed = feeConfig.tuitionFee;
            }
            const bursaryData = bursaries.find(b => b.id === student.bursary);
            billed = Math.max(0, billed - (bursaryData?.value || 0));
        }

        // Payments: STRICT ALLOCATION MATCHING
        const studentPayments = payments.filter(p => p.studentId === studentId && isTargetTerm(p.term));
        let paid = 0;
        studentPayments.forEach(p => {
            if (p.allocations) {
                const matchingKey = Object.keys(p.allocations).find(k => normalizeKey(k) === targetKey);
                if (matchingKey) paid += Number(p.allocations[matchingKey]) || 0;
            }
        });


        let status: 'none' | 'partial' | 'full' = 'none';
        if (billed > 0) {
            if (paid >= billed) status = 'full';
            else if (paid > 0) status = 'partial';
        } else if (paid > 0) status = 'full';

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

        const priorityBillings = ['Brought Forward', 'Tuition Fees'];
        const potentialFees = ['Functional Fees', 'Guild Fee', 'Registration'];

        potentialFees.forEach(feeName => {
            const isCompulsory = localCompulsoryFees.some(f => f.name.toLowerCase() === feeName.toLowerCase());
            const hasValue = enrolledStudents.some(s => {
                const currentTerm = filterLevel || s.semester;
                // Only consider values in the TARGET TERM to avoid Zombie Columns
                return billings.some(b =>
                    b.studentId === s.id &&
                    b.term === currentTerm &&
                    (b.description || '').toLowerCase().includes(feeName.toLowerCase()) &&
                    b.amount > 0
                );
            });

            if (isCompulsory || hasValue) priorityBillings.push(feeName);
        });

        filteredStudents.forEach(s => {
            const activeAuditingTerm = filterLevel || s.semester;

            billings.filter(b => b.studentId === s.id && b.term === activeAuditingTerm).forEach(b => {
                const desc = b.description || b.type || '';
                const descLower = desc.toLowerCase();

                if (/tuition|brought|forward|bf|arrears/i.test(descLower)) return;

                let name = desc.replace(/Billed:\s*/i, '').trim();
                // Strip semester tags for cleaner merging
                name = name.replace(/(Year\s*\d+\s*(Semester|Sem)\s*\d+|Y\d+S\d+)/i, '').replace(/-?\s*$/, '').trim();

                // Wise Merger: Check against both Priority and existing Dynamic columns
                const normName = normalizeKey(name);
                const isDuplicate =
                    priorityBillings.some(p => normalizeKey(p) === normName) ||
                    Array.from(billingCategories).some(ExistingName => normalizeKey(ExistingName) === normName);

                if (name && !isDuplicate) {
                    billingCategories.add(name);
                }
            });


            payments.filter(p => p.studentId === s.id && p.term === activeAuditingTerm).forEach(p => {
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
            installments: Array.from(installmentCategories).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)),
            audit: ['Credit Pool', 'Total Billed', 'Total Paid', 'Balance', '% Cleared']
        };
    }, [filteredStudents, billings, payments, localCompulsoryFees, enrolledStudents, filterLevel]);


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
            const stats = calculateFinancials(s, billings, payments, bursaries);
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
                /* Premium Styles */
                .glass-button {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 0.6rem 1.2rem;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .glass-button:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                }
                .glass-button:active {
                    transform: translateY(0);
                }
                .glass-button.active {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                }
                .premium-input {
                    background: rgba(255, 255, 255, 0.03) !important;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 14px !important;
                    padding: 0.7rem 1.2rem !important;
                    transition: all 0.3s ease;
                }
                .premium-input:focus {
                    background: rgba(255, 255, 255, 0.06) !important;
                    border-color: rgba(59, 130, 246, 0.5) !important;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
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

            <header className="flex flex-col md:flex-row justify-between items-center gap-6" style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)', fontSize: '1.8rem'
                    }}>
                        👤
                    </div>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            Learners <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.2rem 1rem', borderRadius: '12px', fontSize: '0.8em' }}>Accounts</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>Efficient Academic Billing & Requirement Tracking</p>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="glass-button"
                    >
                        <span>{showMobileFilters ? '✕' : '🔍'}</span>
                        <span>{showMobileFilters ? 'Hide Filters' : 'Filters'}</span>
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

                    <button
                        onClick={handleExportCSV}
                        className="glass-button"
                        style={{ borderLeft: '4px solid #22c55e' }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="glass-button"
                        style={{ background: 'white', color: 'black' }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>🖨️</span>
                        <span>Print Report</span>
                    </button>
                </div>
            </header>


            <div className={`${showMobileFilters ? 'flex' : 'hidden'} flex-col md:flex-row justify-between items-stretch md:items-center gap-6 mb-8`}>
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
                    {!isDirector && (
                        <div className="hidden md:flex" style={{
                            display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <button
                                onClick={() => setViewMode('list')}
                                className={viewMode === 'list' ? 'glass-button active' : 'glass-button'}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', minWidth: '100px', justifyContent: 'center' }}
                            >
                                📋 List View
                            </button>
                            <button
                                onClick={() => setViewMode('matrix')}
                                className={viewMode === 'matrix' ? 'glass-button active' : 'glass-button'}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', minWidth: '100px', justifyContent: 'center' }}
                            >
                                📊 Matrix View
                            </button>
                        </div>
                    )}

                    <div className="relative flex-1 max-w-[450px]">
                        <input
                            type="text"
                            placeholder="Search learners by name or code..."
                            className="premium-input w-full pl-11"
                            value={searchTerm}
                            list="search-suggestions"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                        <datalist id="search-suggestions">
                            {enrolledStudents.map(s => <option key={s.id} value={s.name} />)}
                        </datalist>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Column Toggle Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                            className="glass-button"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                            👁️ Columns <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>▼</span>
                        </button>
                        {showColumnDropdown && (
                            <div style={{
                                position: 'absolute', top: '120%', right: 0,
                                background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                                padding: '1rem', zIndex: 100, minWidth: '180px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(20px)'
                            }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.8rem', letterSpacing: '1px', fontWeight: 'bold' }}>TOGGLE COLUMNS</div>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '13px', gap: '0.8rem' }}>
                                    <input type="checkbox" checked={visibleColumns.details} onChange={() => setVisibleColumns(p => ({ ...p, details: !p.details }))} />
                                    <span>Student Details</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '13px', gap: '0.8rem' }}>
                                    <input type="checkbox" checked={visibleColumns.outstanding} onChange={() => setVisibleColumns(p => ({ ...p, outstanding: !p.outstanding }))} />
                                    <span>Current Arrears</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '13px', gap: '0.8rem' }}>
                                    <input type="checkbox" checked={visibleColumns.ring} onChange={() => setVisibleColumns(p => ({ ...p, ring: !p.ring }))} />
                                    <span>Clearance Ring</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', gap: '0.8rem' }}>
                                    <input type="checkbox" checked={visibleColumns.sync} onChange={() => setVisibleColumns(p => ({ ...p, sync: !p.sync }))} />
                                    <span>Portal Sync</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <select
                        value={filterProgramme}
                        onChange={(e) => setFilterProgramme(e.target.value)}
                        className="premium-input text-sm"
                        style={{ minWidth: '160px' }}
                    >
                        <option value="">All Programmes</option>
                        {programmes?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="premium-input text-sm"
                        style={{ minWidth: '140px' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="clearance">Cleared</option>
                        <option value="probation">Probation</option>
                        <option value="defaulter">Defaulter</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="premium-input text-sm font-bold"
                        style={{ background: 'rgba(59, 130, 246, 0.05) !important', borderColor: 'rgba(59, 130, 246, 0.3) !important', color: '#60a5fa' }}
                    >
                        <option value="name">Sort: Name (A-Z)</option>
                        <option value="balance_desc">Sort: Highest Balance</option>
                        <option value="balance_asc">Sort: Lowest Balance</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowParticularsDropdown(!showParticularsDropdown)}
                        className="glass-button"
                        style={{ fontSize: '0.8rem' }}
                    >
                        <span>{filterParticulars.length > 0 ? `${filterParticulars.length} Selected` : '🔍 Filter Payments...'}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>▼</span>
                    </button>

                    {showParticularsDropdown && (
                        <div style={{
                            position: 'absolute', top: '120%', left: 0,
                            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px', padding: '1rem', zIndex: 100,
                            width: '240px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                        }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.8rem', letterSpacing: '1px', fontWeight: 'bold' }}>SELECT PARTICULARS</div>
                            {['Tuition Fees', ...services.map(s => s.name)].map(p => (
                                <div key={p} className="custom-checkbox" onClick={() => toggleFilterParticular(p)}>
                                    <input
                                        type="checkbox"
                                        checked={filterParticulars.includes(p)}
                                        onChange={() => { }}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                    <span style={{ fontSize: '0.85rem' }}>{p}</span>
                                </div>
                            ))}
                            <button
                                onClick={() => { setFilterParticulars([]); setShowParticularsDropdown(false); }}
                                style={{
                                    width: '100%', marginTop: '0.8rem', padding: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                    border: 'none', borderRadius: '8px', fontSize: '0.75rem',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>

                <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="premium-input text-xs"
                    style={{ padding: '0.5rem 1rem !important' }}
                >
                    <option value="">All Levels</option>
                    {levels?.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>

                <div className="premium-input flex items-center gap-3 text-xs" style={{ padding: '0.4rem 1rem !important' }}>
                    <span style={{ opacity: 0.4 }}>Arrears Range:</span>
                    <input
                        type="number"
                        placeholder="Min"
                        value={minBalance}
                        onChange={(e) => setMinBalance(Number(e.target.value))}
                        style={{ width: '70px', background: 'none', border: 'none', fontWeight: 'bold' }}
                    />
                    <span style={{ opacity: 0.2 }}>|</span>
                    <input
                        type="number"
                        placeholder="Max"
                        value={maxBalance}
                        onChange={(e) => setMaxBalance(Number(e.target.value))}
                        style={{ width: '70px', background: 'none', border: 'none', fontWeight: 'bold' }}
                    />
                </div>

                <button
                    onClick={() => { setFilterLevel(''); setFilterProgramme(''); setFilterStatus(''); setMinBalance(-1000000); setMaxBalance(10000000); setSearchTerm(''); setFilterParticulars([]); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem', opacity: 0.7 }}
                >
                    Reset All
                </button>
            </div>

            {/* --- SMART STATUS SETTINGS --- */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                    onClick={() => setShowStatusSettings(!showStatusSettings)}
                    className="glass-button"
                    style={{
                        padding: '1rem 1.5rem',
                        background: 'rgba(59, 130, 246, 0.05)',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        width: '100%',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                        <span style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800' }}>Configure Smart Status Criteria</span>
                    </div>
                    <span style={{ opacity: 0.5 }}>{showStatusSettings ? 'Collapse ↑' : 'Expand ↓'}</span>
                </div>

                {
                    showStatusSettings && (
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
                                                        ✅ <strong>Clear:</strong> ≥{financialSettings.clearancePct.toFixed(1)}% + Requirements<br />
                                                        ⚠️ <strong>Probation:</strong> ≥{financialSettings.probationPct.toFixed(1)}%<br />
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
                                        step="0.1"
                                        value={localClearancePct}
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                            setLocalClearancePct(val);
                                        }}
                                        disabled={isDirector}
                                        style={{ background: 'rgba(0,0,0,0.2)', width: '100%', cursor: isDirector ? 'not-allowed' : 'auto' }}
                                    />
                                    <p style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '0.4rem' }}>Students with ≥ {localClearancePct.toFixed(1)}% paid will be marked "Cleared"</p>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '0.5rem' }}>PROBATION TARGET (%)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={localProbationPct}
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                            setLocalProbationPct(val);
                                        }}
                                        disabled={isDirector}
                                        style={{ background: 'rgba(0,0,0,0.2)', width: '100%', cursor: isDirector ? 'not-allowed' : 'auto' }}
                                    />
                                    <p style={{ fontSize: '0.65rem', color: '#8b5cf6', marginTop: '0.4rem' }}>Students with {localProbationPct.toFixed(1)}% to {(localClearancePct - 0.1).toFixed(1)}% paid will be marked "Probation"</p>
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
                                            {!isDirector && (
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
                                            )}
                                        </div>
                                    ))}
                                    {localCompulsoryFees.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>No mandatory fees configured.</span>}
                                </div>

                                {!isDirector && (
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
                                )}
                                <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.8rem' }}>
                                    * Students MUST pay these items fully (via 'Allocations' or 'Particulars') to be marked "Cleared" even if they meet the percentage.
                                </p>
                            </div>
                            {!isDirector && (
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
                            )}
                        </div>
                    )
                }
            </div >

            <div className="card print-area" style={{ padding: '2rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                {/* OVERALL CLEARANCE PROGRESS BAR */}
                <div className="no-print" style={{
                    marginBottom: '3rem',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                    padding: '2rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative Background Glow */}
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(60px)', borderRadius: '50%' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', marginBottom: '8px', color: '#60a5fa' }}>
                                Collection Momentum • {filteredStudents.length} Students
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', lineHeight: 1 }}>
                                {globalStats.percentage.toFixed(1)}% <span style={{ fontSize: '1rem', opacity: 0.5, fontWeight: '600', color: '#10b981', verticalAlign: 'middle', marginLeft: '0.5rem' }}>COLLECTED</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Avg. Arrears</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fbbf24' }}>{formatMoney(globalStats.avgArrears)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Projected Target</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#60a5fa' }}>{formatMoney(globalStats.totalTarget)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                        <div style={{
                            width: `${globalStats.percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                            borderRadius: '10px',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                        }} />
                    </div>
                </div>

                <div className="print-only" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #000', borderRadius: '5px' }}>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #eee' }}>Executive Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '9pt', opacity: 0.6 }}>Total Projected</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{formatMoney(globalStats.totalTarget)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '9pt', opacity: 0.6 }}>Total Collected</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#059669' }}>{formatMoney(globalStats.totalPaid)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '9pt', opacity: 0.6 }}>Outstanding</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#dc2626' }}>{formatMoney(globalStats.totalTarget - globalStats.totalPaid)}</div>
                        </div>
                    </div>
                </div>
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
                                                        {isDirector && pendingTransactionCounts[student.id] > 0 && (
                                                            <span
                                                                title={`${pendingTransactionCounts[student.id]} transaction(s) pending approval`}
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    background: '#f59e0b',
                                                                    color: 'white',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '12px',
                                                                    fontWeight: '900',
                                                                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
                                                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                                                }}
                                                            >
                                                                {pendingTransactionCounts[student.id]}
                                                            </span>
                                                        )}
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
                                                    <StatusRing
                                                        student={student}
                                                        size={50}
                                                        percentage={(student as any).stats?.clearanceTarget > 0
                                                            ? ((student as any).stats.clearancePaid / (student as any).stats.clearanceTarget) * 100
                                                            : 100
                                                        }
                                                    />
                                                </td>
                                            )}
                                            {visibleColumns.sync && (
                                                <td className="col-sync" style={{ padding: '1rem', textAlign: 'right', borderRadius: '0 16px 16px 0' }}>
                                                    {!isDirector && (
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
                                                    )}
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
                                const stats = (student as any).stats;


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
                                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {student.name}
                                                    {isDirector && pendingTransactionCounts[student.id] > 0 && (
                                                        <span
                                                            title={`${pendingTransactionCounts[student.id]} pending`}
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                background: '#f59e0b',
                                                                color: 'white',
                                                                padding: '2px 6px',
                                                                borderRadius: '10px',
                                                                fontWeight: '900',
                                                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                                                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                                            }}
                                                        >
                                                            {pendingTransactionCounts[student.id]}
                                                        </span>
                                                    )}
                                                </div>
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
                                                <StatusRing
                                                    student={student}
                                                    size={30}
                                                    percentage={stats.clearanceTarget > 0 ? (stats.clearancePaid / stats.clearanceTarget) * 100 : 100}
                                                />
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
                                                <div style={{
                                                    fontWeight: '800',
                                                    color: (stats.clearanceTarget > 0 ? (stats.clearancePaid / stats.clearanceTarget) * 100 : 100) >= localClearancePct
                                                        ? '#10b981'
                                                        : (stats.clearanceTarget > 0 ? (stats.clearancePaid / stats.clearanceTarget) * 100 : 100) >= localProbationPct
                                                            ? '#8b5cf6'
                                                            : '#ef4444'
                                                }}>
                                                    {stats.clearanceTarget > 0 ? ((stats.clearancePaid / stats.clearanceTarget) * 100).toFixed(1) : '100.0'}%
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {!isDirector && (
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
                                            )}
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
                                        const stats = (student as any).stats;
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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {student.name}
                                                        {pendingTransactionCounts[student.id] > 0 && (
                                                            <span
                                                                title={`${pendingTransactionCounts[student.id]} transaction(s) pending approval`}
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    background: '#f59e0b',
                                                                    color: 'white',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '10px',
                                                                    fontWeight: '900',
                                                                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                                                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                                                }}
                                                            >
                                                                {pendingTransactionCounts[student.id]}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                        const statusColor = pct >= localClearancePct ? '#10b981' : pct >= localProbationPct ? '#8b5cf6' : '#ef4444';
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
                                        <td style={{ textAlign: 'right', color: '#60a5fa' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateCreditPool(s.id, calculateFinancials(s, billings, payments, bursaries)), 0))}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateFinancials(s, billings, payments, bursaries).totalBilled, 0))}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateFinancials(s, billings, payments, bursaries).totalPayments, 0))}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatMoney(filteredStudents.reduce((acc, s) => acc + calculateFinancials(s, billings, payments, bursaries).outstandingBalance, 0))}</td>
                                        <td style={{ textAlign: 'center' }}>-</td>
                                        {/* Spacer Cell */}
                                        <td style={{ width: '100px', border: 'none', background: 'transparent' }}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </div>
                )}
            </div>

            {/* --- STUDENT DETAIL MODAL --- */}
            {
                selectedStudent && (
                    <LearnerAccountModal
                        studentId={selectedStudent.id}
                        onClose={() => setSelectedStudent(null)}
                        auditingContext={filterLevel || undefined}
                        mode={isDirector ? 'director' : 'bursar'}
                    />
                )
            }

            {/* --- BULK ACTION BAR --- */}
            {
                selectedIds.length > 0 && (
                    <div style={{
                        position: 'fixed',
                        bottom: '2.5rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(59, 130, 246, 0.95)',
                        backdropFilter: 'blur(20px)',
                        padding: '1.2rem 2.5rem',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2.5rem',
                        boxShadow: '0 20px 50px rgba(59, 130, 246, 0.3)',
                        zIndex: 2100,
                        border: '1px solid rgba(255,255,255,0.2)',
                        animation: 'slideUp 0.4s cubic-bezier(0, 1, 0, 1)'
                    }}>
                        <style>{`
                        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                    `}</style>
                        <div style={{ color: 'white', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Selection Active</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{selectedIds.length} Learners</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            {!isDirector && (
                                <>
                                    <button
                                        onClick={handleSmartBulkStatus}
                                        className="glass-button"
                                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
                                    >
                                        🧠 Smart Status
                                    </button>
                                    <button
                                        onClick={() => {
                                            enrolledStudents.filter(s => selectedIds.includes(s.id)).forEach(handlePostToPortal);
                                            setSelectedIds([]);
                                        }}
                                        className="glass-button"
                                        style={{ background: 'white', color: '#2563eb', fontSize: '0.8rem' }}
                                    >
                                        🚀 Post to Portal
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setSelectedIds([])}
                                style={{ background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', marginLeft: '0.5rem' }}
                            >
                                Dismiss
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
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{ background: '#1a1a1a', padding: '2.5rem', borderRadius: '32px', width: '450px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginBottom: '0.5rem' }}>Confirm Removal</div>
                            <p style={{ opacity: 0.5, fontSize: '0.9rem', marginBottom: '2rem' }}>Please specify a reason for deactivating this record. This action will be logged in the audit trail.</p>

                            <select
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                className="premium-input w-full mb-8"
                                style={{ padding: '1rem !important' }}
                            >
                                {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={confirmDelete}
                                    className="glass-button"
                                    style={{ flex: 1, background: '#ef4444', border: 'none', justifyContent: 'center', padding: '1rem' }}
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="glass-button"
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', justifyContent: 'center', padding: '1rem' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function LearnersPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Account Data...</div>}>
            <LearnersContent />
        </Suspense>
    );
}
