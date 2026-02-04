"use client";
import React, { useState } from 'react';
import { useSchoolData, PaymentIntegration, ManualPaymentMethod, BankAccount } from '@/lib/store';
import { numberToWords } from '@/lib/numberToWords';

export default function PaymentModesPage() {
    const {
        accounts, addAccount, updateAccount, deleteAccount,
        manualPaymentMethods, addManualPaymentMethod, updateManualPaymentMethod, deleteManualPaymentMethod,
        paymentIntegrations, updatePaymentIntegration, // Restored
        students, payments, generalTransactions, addPayment, deletePayment, // Restored
        deletedPayments, unclaimedPayments, // Get deleted and unclaimed payments
        documentTemplates, programmes, // Added for receipt printing
        activeRole, updatePayment // Restored for Approval Workflow
    } = useSchoolData();

    // --- STATE MANAGEMENT ---
    const [isSyncing, setIsSyncing] = useState(false); // Fix 4: Loading state for manual sync

    // 1. Integration Config
    const [configModal, setConfigModal] = useState<{ open: boolean, integration: PaymentIntegration | null }>({ open: false, integration: null });
    const [configForm, setConfigForm] = useState({ merchantId: '', apiKey: '', clientSecret: '' });

    // 2. Bank Account Modal
    const [bankModal, setBankModal] = useState<{ open: boolean, account: BankAccount | null }>({ open: false, account: null });
    const [bankForm, setBankForm] = useState<{ name: string, accountNumber: string, bankName: string, currency: string, balance: number }>({ name: '', accountNumber: '', bankName: '', currency: 'UGX', balance: 0 });

    // State for Unsynced View Filters
    const [unsyncedSearch, setUnsyncedSearch] = useState('');
    const [unsyncedFilterType, setUnsyncedFilterType] = useState<'all' | 'duplicate' | 'unclaimed' | 'unsynced'>('all');
    const [unsyncedDateRange, setUnsyncedDateRange] = useState({ start: '', end: '' });

    // 3. Manual Method Modal (Shared for Digital Fallback & Cash)
    const [methodModal, setMethodModal] = useState<{ open: boolean, method: any | null, type: 'digital_fallback' | 'cash' }>({ open: false, method: null, type: 'cash' });
    const [methodForm, setMethodForm] = useState<{ name: string, mappedId: string, description: string }>({ name: '', mappedId: '', description: '' });

    // --- TRANSACTION MODAL STATE ---
    const [viewTxs, setViewTxs] = useState<{ open: boolean, sourceName: string, sourceType: 'digital' | 'bank' | 'manual' | 'cash', transactions: any[], filter: 'all' | 'unsynced' | 'trash' }>({ open: false, sourceName: '', sourceType: 'digital', transactions: [], filter: 'all' });

    // --- MOBILE FILTER STATES ---
    const [showPendingFilters, setShowPendingFilters] = useState(false);
    const [showUnsyncedFilters, setShowUnsyncedFilters] = useState(false);

    // --- HELPERS: INTEGRATIONS ---
    const handleConfigureClick = (integration: PaymentIntegration) => {
        setConfigForm({
            merchantId: integration.merchantId || '',
            apiKey: integration.apiKey || '',
            clientSecret: integration.clientSecret || ''
        });
        setConfigModal({ open: true, integration });
    };

    const handleSaveConfig = () => {
        if (!configModal.integration) return;
        updatePaymentIntegration({
            ...configModal.integration,
            ...configForm,
            status: (configForm.apiKey && configForm.merchantId) ? 'active' : 'inactive',
            lastSync: new Date().toISOString()
        });
        setConfigModal({ open: false, integration: null });
    };

    const toggleIntegration = (integration: PaymentIntegration) => {
        updatePaymentIntegration({
            ...integration,
            status: integration.status === 'active' ? 'inactive' : 'active'
        });
    };

    const handleSimulatePayment = (integration: PaymentIntegration) => {
        // Fix 3: Add confirmation dialog
        if (!confirm(`⚠️ SIMULATE TEST PAYMENT\n\nThis will create a random test payment via ${integration.name}.\n\nThis is for TESTING purposes only. Continue?`)) {
            return;
        }

        if (!students || students.length === 0) {
            alert("No students found to simulate payment for.");
            return;
        }

        // Prioritize "TEST STUDENT" if available (User Request)
        const testStudent = students.find(s => s.name.toUpperCase().includes('TEST STUDENT'));
        const randomStudent = testStudent || students[Math.floor(Math.random() * students.length)];
        const amount = Math.floor(Math.random() * 500000) + 50000; // Random between 50k and 550k
        const isTuition = Math.random() > 0.3;

        const newPayment: any = { // Using any cast to bypassstrict ID requirement from partial store definition in this context if needed, but store expects Payment
            id: `pay_sim_${Date.now()}`,
            studentId: randomStudent.id,
            amount: amount,
            date: new Date().toISOString(),
            method: integration.name,
            reference: `${integration.name.toUpperCase()}-${Date.now().toString().slice(-6)}`,
            receiptNumber: `RCP-${Date.now().toString().slice(-4)}`,
            recordedBy: 'System Integration',
            description: `Automatic ${integration.name} Collection`,
            term: randomStudent.semester,
            status: 'approved' as const,
            allocations: isTuition ? { 'Tuition Fees': amount } : { 'General': amount },
            history: []
        };

        addPayment(newPayment);
        alert(`Simulating Incoming Payment...\n\nStudent: ${randomStudent.name}\nAmount: USh ${amount.toLocaleString()}\nVia: ${integration.name}\n\nCheck Transactions log!`);
    };

    // --- HELPERS: BANK ACCOUNTS ---
    const handleAddBankClick = () => {
        setBankForm({ name: '', accountNumber: '', bankName: '', currency: 'UGX', balance: 0 });
        setBankModal({ open: true, account: null });
    };

    const handleEditBankClick = (acc: BankAccount) => {
        setBankForm({
            name: acc.name,
            accountNumber: acc.accountNumber || '',
            bankName: acc.bankName || '',
            currency: acc.currency,
            balance: acc.balance
        });
        setBankModal({ open: true, account: acc });
    };

    const handleSaveBank = () => {
        // Fix 1: Prevent duplicate bank account numbers
        const isDuplicate = bankAccounts.some(acc =>
            acc.accountNumber === bankForm.accountNumber &&
            acc.id !== bankModal.account?.id
        );

        if (isDuplicate) {
            alert('❌ Account number already exists! Please use a unique account number.');
            return;
        }

        const payload = {
            name: bankForm.name,
            accountNumber: bankForm.accountNumber,
            bankName: bankForm.bankName,
            currency: bankForm.currency,
            balance: bankForm.balance,
            group: 'Bank Accounts' as const,
            type: 'Asset' as const
        };

        if (bankModal.account) {
            updateAccount({ ...payload, id: bankModal.account.id });
        } else {
            addAccount({ ...payload });
        }
        setBankModal({ open: false, account: null });
    };

    const handleDeleteBank = (id: string) => {
        // Fix 2: Prevent deletion of bank accounts with transactions
        const account = accounts.find(a => a.id === id);
        if (!account) return;

        const txCount = getTransactionsForSource(account.name, 'bank').length;

        if (txCount > 0) {
            alert(`❌ Cannot delete "${account.name}". This account has ${txCount} transaction(s).\n\nPlease archive it instead or contact support to transfer transactions.`);
            return;
        }

        if (confirm(`⚠️ Are you sure you want to delete "${account.name}"?`)) {
            deleteAccount(id);
        }
    };

    // --- HELPERS: MANUAL METHODS ---
    const handleAddMethodClick = (type: 'cash' | 'digital_fallback') => {
        setMethodForm({ name: '', mappedId: '', description: '' });
        setMethodModal({ open: true, method: null, type });
    };

    // --- PRINT RECEIPT ---
    const handlePrintReceipt = (tx: any) => {
        // Find receipt template
        const student = students.find(s => s.id === tx.studentId);
        let template = null;

        if (student) {
            const prog = programmes.find(p => p.name === student.programme || p.id === student.programme);
            if (prog) {
                template = documentTemplates.find(t => t.type === 'RECEIPT' && t.programmeId === prog.id);
            }
        }

        if (!template) {
            template = documentTemplates.find(t => t.type === 'RECEIPT' && t.isDefault);
        }
        if (!template) {
            template = documentTemplates.find(t => t.type === 'RECEIPT');
        }

        if (!template) {
            alert("No Receipt Template found in system.");
            return;
        }

        let content = template.sections.sort((a, b) => a.order - b.order).map(s => s.content).join('');

        // Prepare Replacements
        const amountWords = numberToWords(tx.amount) + ' Shillings Only';

        // Calculate Balance if student exists
        // Note: usage of 'student.balance' assumes it exists. If not, we might need to calculate it or just show 0
        // The store definition of RegistrarStudent usually doesn't have a computed balance field directly unless updated
        // For now we will use 0 or try to find it if stored.
        // Assuming the student object from store has it (some implementations do). 
        // If not, we can calculate simpler or just leave it.
        const balanceVal = (student as any)?.balance || 0;

        const replacements: Record<string, string> = {
            '{{receipt_number}}': tx.receiptNumber || tx.reference || 'N/A',
            '{{date}}': new Date(tx.date).toLocaleDateString(),
            '{{student_name}}': student ? student.name : (tx.description || 'Unknown Payer'), // Fallback
            '{{amount_words}}': amountWords,
            '{{payment_description}}': tx.description || 'School Fees Payment',
            '{{currency}}': 'UGX',
            '{{amount}}': new Intl.NumberFormat('en-UG').format(tx.amount),
            '{{balance}}': new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(balanceVal)
        };

        Object.entries(replacements).forEach(([key, val]) => {
            content = content.replace(new RegExp(key, 'g'), val);
        });

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Receipt - ${tx.receiptNumber || tx.reference}</title></head><body style="padding: 40px; font-family: sans-serif;">${content}</body></html>`);
            win.document.close();
            win.print();
        } else {
            alert("Popup blocked. Please allow popups to print.");
        }
    };

    // --- HELPERS: MANUAL & CASH ---
    const handleEditMethodClick = (method: ManualPaymentMethod) => {
        setMethodForm({
            name: method.name,
            mappedId: method.category === 'cash' ? (method.mappedAccountId || '') : (method.providerId || ''),
            description: method.description || ''
        });
        setMethodModal({ open: true, method, type: method.category });
    };

    const handleSaveMethod = () => {
        const isCash = methodModal.type === 'cash';
        const payload = {
            name: methodForm.name,
            description: methodForm.description,
            category: methodModal.type,
            status: 'active' as const,
            mappedAccountId: isCash ? methodForm.mappedId : undefined,
            providerId: !isCash ? methodForm.mappedId : undefined
        };

        if (methodModal.method) {
            updateManualPaymentMethod({ ...payload, id: methodModal.method.id });
        } else {
            addManualPaymentMethod({ ...payload, id: `mp_${Date.now()}` });
        }
        setMethodModal({ open: false, method: null, type: 'cash' });
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);

    // Fix 6: Helper function for end of day calculation
    const getEndOfDay = (dateString: string): Date => {
        const date = new Date(dateString);
        date.setHours(23, 59, 59, 999);
        return date;
    };

    // --- VIEW TRANSACTIONS HELPER ---
    // State for Trash Filters
    const [trashSearch, setTrashSearch] = useState('');
    const [trashDateRange, setTrashDateRange] = useState({ start: '', end: '' });
    const [trashReasonFilter, setTrashReasonFilter] = useState('all');

    // MOCK DATA GENERATORS (Simple)
    const getTransactionsForSource = (name: string, type: 'digital' | 'bank' | 'manual' | 'cash') => {
        const allTxs = [
            ...(generalTransactions || []).map(t => ({ ...t, source: 'General' })),
            ...(payments || []).map(p => ({
                id: p.id, date: p.date, amount: p.amount, description: `Student Payment (${p.studentId})`,
                mode: p.method, method: p.method, type: 'Income', source: 'Student',
                studentId: p.studentId, reference: p.reference, status: p.status
            }))
        ];

        return allTxs.filter(tx => {
            const search = name.toLowerCase();
            const mode = String(tx.mode || '').toLowerCase();
            const desc = String(tx.description || '').toLowerCase();
            const method = String(tx.method || '').toLowerCase();

            // Strict checking for Banks to avoid partial matches if names differ
            if (type === 'bank') {
                return mode.includes(search) || method.includes(search);
            }

            return mode.includes(search) || desc.includes(search) || method.includes(search);
        });
    };

    const handleViewTransactions = (name: string, type: 'digital' | 'bank' | 'manual' | 'cash', filter: 'all' | 'unsynced' | 'trash' = 'all') => {
        let txs = getTransactionsForSource(name, type);

        // Filter for Trash
        if (filter === 'trash') {
            // Use Real Deleted Payments from Store
            const deletedTxs = deletedPayments.map(p => {
                // Find delete log for details
                const deleteLog = p.history?.slice().reverse().find(h => h.action === 'Deleted');
                return {
                    id: p.id,
                    date: p.date,
                    amount: p.amount,
                    description: p.description || `Student Payment (${p.studentId})`,
                    mode: p.method, // Important for matching source
                    method: p.method,
                    type: 'Income',
                    source: 'Student',
                    studentId: p.studentId,
                    reference: p.reference,
                    status: (p.status || 'void') as any,
                    deletedAt: deleteLog?.timestamp || new Date().toISOString(),
                    deletedBy: deleteLog?.user || 'Unknown',
                    deleteReason: (p as any).deleteReason || deleteLog?.details || 'Unknown'
                };
            });

            // ADD REAL UNCLAIMED STORE PAYMENTS (From Deletions)
            const realUnclaimed = unclaimedPayments.map(p => ({
                id: p.id,
                date: p.date,
                amount: p.amount,
                description: p.description || 'Unclaimed Payment',
                mode: p.method,
                method: p.method,
                type: 'Income',
                source: 'Unclaimed Store',
                studentId: 0, // Use 0 for unclaimed payments
                reference: p.reference,
                status: 'pending_sync' as any, // Treat as unsynced
                possiblePayCode: null
            }));

            txs = [...deletedTxs, ...realUnclaimed]; // Combine deleted and unclaimed

            // Apply Source Filter (Same logic as active txs)
            txs = txs.filter(tx => { // Filter the combined list
                const search = name.toLowerCase();
                const mode = String(tx.mode || '').toLowerCase();
                const desc = String(tx.description || '').toLowerCase();
                const method = String(tx.method || '').toLowerCase();

                // Strict checking for Banks
                if (type === 'bank') {
                    return mode.includes(search) || method.includes(search);
                }
                return mode.includes(search) || desc.includes(search) || method.includes(search);
            });
        } else if (filter === 'unsynced') {
            // ... (Existing Unsynced Logic)
            // Mock 1: Simulated "Unsynced" payment (e.g. valid paycode but not auto-linked)
            // Only show this if we haven't already linked it (check payments)
            const demoRef1 = 'UNCLAIMED-001';
            const exists1 = payments.some((p: any) => p.reference === demoRef1);

            if (!exists1) {
                txs.push({
                    id: 'unsync_demo_1',
                    date: new Date(Date.now() - 86400000 * 4).toISOString(),
                    amount: 150000,
                    description: 'Payment from 0770000000',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Unknown',
                    studentId: 0, // FIXED: use 0 instead of null
                    reference: 'UNCLAIMED-001',
                    status: 'pending_sync' as any,
                    possiblePayCode: '1000000111' // Example valid paycode for testing (matches Hamis)
                });
            }

            // Mock 2: New simulated failed sync
            if (!payments.some((p: any) => p.reference === 'UNCLAIMED-002')) {
                txs.push({
                    id: 'unsync_demo_2',
                    date: new Date().toISOString(),
                    amount: 250000,
                    description: 'Mobile Money - Unknown',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Unknown',
                    studentId: 0, // FIXED
                    reference: 'UNCLAIMED-002',
                    status: 'pending_sync' as any,
                    possiblePayCode: '2000000222' // New Test Code
                });
            }
            // Mock 3: Duplicate / Conflict Scenario
            // Simulate a manual payment that already exists with this reference
            const conflictRef = 'REF-MANUAL-EXISTING';
            // Only show this unsynced item if the "Manual" payment exists AND the "Digital" one hasn't been created/synced yet.
            // If we replaced it, the manual payment is gone, but the Digital one (same ref) exists.
            // So if ANY payment with this ref exists and it's NOT the manual one, we hide it? 
            // Or better: If we successfully synced, we used the SAME reference for the new digital payment.
            // So if payments has this reference and recordedBy is 'System Replace' (or just verified digital), it's done.
            // But wait, the Mock 3 IS the "Duplicate". It exists BECAUSE there is a conflict.
            // We show it if there is a conflict. We HIDE it if we resolved it (by replacing).
            // If we replaced it, the reference still exists (on the new digital payment).
            // We can check if the payment with this ref has `recordedBy === 'System Replace'`.
            const checkRes = payments.find((p: any) => p.reference === conflictRef);
            const isResolved = checkRes && checkRes.recordedBy === 'System Replace';

            if (!isResolved) {
                txs.push({
                    id: 'unsync_demo_3',
                    date: new Date().toISOString(),
                    amount: 50000,
                    description: 'SchoolPay - Conflict A',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Conflict',
                    studentId: 0, // FIXED
                    reference: 'REF-MANUAL-EXISTING',
                    status: 'pending_sync' as any,
                    possiblePayCode: '5000000555'
                });
            }

            // Mock 4: Duplicate B
            if (!payments.some((p: any) => p.reference === 'REF-DUP-004')) {
                txs.push({
                    id: 'unsync_demo_4',
                    date: new Date().toISOString(),
                    amount: 60000,
                    description: 'SchoolPay - Conflict B',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Conflict',
                    studentId: 0, // FIXED
                    reference: 'REF-DUP-004',
                    status: 'pending_sync' as any,
                    possiblePayCode: '4000000444'
                });
            }

            // Mock 5: Manual Entry Existing
            if (!payments.some((p: any) => p.reference === 'REF-MANUAL-EXISTING-2')) {
                txs.push({
                    id: 'unsync_demo_5',
                    date: new Date().toISOString(),
                    amount: 50000,
                    description: 'SchoolPay - Manual Exists',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Conflict',
                    studentId: 0, // FIXED
                    reference: 'REF-MANUAL-EXISTING-2',
                    status: 'pending_sync' as any,
                    possiblePayCode: '3000000333'
                });
            }

            // Mock 6: User Requested Conflict (Ref 999)
            const conflictRef6 = '999';
            // Check if resolved
            const res6 = payments.find((p: any) => p.reference === conflictRef6 && p.recordedBy === 'System Replace');
            // Check if conflict exists (Manual payment with ref 999)
            const hasConflict6 = payments.find((p: any) => p.reference === conflictRef6 && p.recordedBy !== 'System Replace');

            if (!res6) {
                txs.push({
                    id: 'unsync_demo_6',
                    date: new Date().toISOString(),
                    amount: 500000, // Matching the manual amount from screenshot
                    description: 'SchoolPay - Conflict DR DR',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Unknown',
                    studentId: 0,
                    reference: conflictRef6,
                    status: 'pending_sync',
                    possiblePayCode: '10000000',
                    isDuplicate: !!hasConflict6, // Only duplicate if the manual one exists
                    conflictingPaymentId: hasConflict6 ? hasConflict6.id : undefined
                });
            }

            // --- NEW REQUESTED MOCKS ---
            const newMocks = [
                { id: '1212', code: '2000000222', amount: 55000 },
                { id: '1313', code: '300000', amount: 75000 },
                { id: '1414', code: '10000000111', amount: 150000 },
                { id: '1515', code: '10000000', amount: 200000 },
                { id: '1616', code: '1000000111', amount: 80000 }, // Claimable (Hamis)
                { id: '1717', code: '077999888', amount: 20000 } // Unsynced/Unknown
            ];

            newMocks.forEach(m => {
                if (!payments.some((p: any) => p.reference === m.id)) {
                    txs.push({
                        id: `unsync_mock_${m.id}`,
                        date: new Date().toISOString(),
                        amount: m.amount,
                        description: `Payment ${m.id}`,
                        mode: name,
                        method: name,
                        type: 'Income',
                        source: 'Unknown',
                        studentId: null,
                        reference: m.id,
                        status: 'pending_sync',
                        possiblePayCode: m.code,
                        isDuplicate: false // Assume fresh for these unless conflict found
                    });
                }
            });
        }

        // Sort by date desc
        txs.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return String(b.id).localeCompare(String(a.id));
        });
        setViewTxs({ open: true, sourceName: name, sourceType: type, transactions: txs, filter });
    };

    const handleManualSync = (tx: any) => {
        // Fix 4: Prevent multiple clicks with loading state
        if (isSyncing) {
            alert('⏳ Sync in progress. Please wait...');
            return;
        }

        setIsSyncing(true);

        try {
            // 1. Identification Strategy: Use 'possiblePayCode' mock or prompt user if missing
            let targetPayCode = tx.possiblePayCode;

            if (!targetPayCode) {
                targetPayCode = prompt("Enter Student Pay Code to link this transaction:", "");
            } else {
                // Confirm with user they want to try auto-match
                if (!confirm(`Attempt to sync Account: ${targetPayCode}?`)) {
                    setIsSyncing(false);
                    return;
                }
            }

            if (!targetPayCode) {
                setIsSyncing(false);
                return;
            }

            // 2. Lookup Student
            const student = students.find(s => s.payCode === targetPayCode);

            if (student) {
                // 3. Success: Create real payment
                const newPayment: any = {
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    amount: tx.amount,
                    date: tx.date || new Date().toISOString(),
                    method: tx.method,
                    reference: tx.reference,
                    receiptNumber: `RCP-${Date.now().toString().slice(-4)}`,
                    recordedBy: 'Manual Sync',
                    description: `Synced: ${tx.description}`,
                    term: student.semester,
                    status: 'approved',
                    allocations: { 'Tuition Fees': tx.amount }, // Auto-allocate to tuition for simplicity
                    history: []
                };

                addPayment(newPayment);

                // 4. Update UI: Remove from unsynced list (local state update + visual feedback)
                setViewTxs(prev => ({
                    ...prev,
                    transactions: prev.transactions.filter(t => t.id !== tx.id)
                }));

                alert(`✅ Successfully synced payment to ${student.name} (${student.payCode})!`);
            } else {
                // 4. Failure
                alert(`❌ Sync Failed. Student with Pay Code '${targetPayCode}' not found.\n\nPlease enroll the student first or verify the code.`);
            }
        } finally {
            // Always reset loading state
            setIsSyncing(false);
        }
    };

    const handleReplaceManualPayment = (tx: any) => {
        // 1. Find Existing Payment & Student details for confirmation
        const existing = payments.find(p => p.reference === tx.reference);
        const existingStudent = existing ? students.find(s => s.id === existing.studentId) : null;

        const confirmMessage = existingStudent
            ? `⚠️ REPLACE PAYMENT for ${existingStudent.name} (${existingStudent.payCode})?\n\nExisting Manual Transaction Ref: ${tx.reference}\nAmount: ${formatMoney(existing?.amount || 0)}\n\nThis will DELETE the manual record and replace it with this verified digital transaction.`
            : `⚠️ REPLACE ACTION\n\nThis will DELETE the existing manual payment with reference '${tx.reference}' and replace it with this verified digital transaction.\n\nAre you sure?`;

        if (!confirm(confirmMessage)) return;

        // 1. Delete the conflicting manual payment
        // In a real scenario, we'd find it by reference. For demo, we assume the ID is known or we search.
        if (existing) {
            deletePayment(existing.id, "Replaced by Digital Transaction Sync");
        } else {
            console.log("Simulating deletion of manual payment...");
        }

        // 2. Add the Digital Payment
        const newPayment: any = {
            id: crypto.randomUUID(),
            studentId: existing ? existing.studentId : (students[0]?.id || 0), // Fallback for demo
            amount: tx.amount, // Use Digital Amount
            date: tx.date || new Date().toISOString(),
            method: tx.method,
            reference: tx.reference,
            receiptNumber: `RCP-DIGITAL-${Date.now().toString().slice(-4)}`,
            recordedBy: 'System Replace',
            description: `Synced (Replaced Manual): ${tx.description}`,
            term: existing ? existing.term : 'Term 1',
            status: 'approved',
            allocations: existing ? existing.allocations : { 'Tuition Fees': tx.amount },
            history: []
        };
        addPayment(newPayment);

        // 3. Remove from Unsynced View
        setViewTxs(prev => ({
            ...prev,
            transactions: prev.transactions.filter(t => t.id !== tx.id)
        }));

        alert("✅ Manual payment replaced with verified digital transaction.");
    };

    const handleApprovePayment = (tx: any) => {
        if (confirm(`Approve payment ${tx.reference} for ${formatMoney(tx.amount)}?`)) {
            // Re-construct payment object to update status
            // Note: tx comes from 'viewTxs' which might be a mapped object.
            // We need to ensure we have the full payment object or at least necessary fields.
            // Since we simply update the status, and store implementation uses ID map replacement:
            // We should find the real payment from 'payments' first to be safe.
            const realPayment = payments.find((p: any) => p.id === tx.id);
            if (realPayment) {
                updatePayment({ ...realPayment, status: 'approved' });
                // Update local view state to reflect change immediately
                setViewTxs(prev => ({
                    ...prev,
                    transactions: prev.transactions.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t)
                }));
            } else {
                alert("Error: Payment record not found in strict store.");
            }
        }
    };


    // --- FILTERED LISTS ---
    const bankAccounts = accounts.filter(a => a.group === 'Bank Accounts');
    const cashAccounts = accounts.filter(a => a.group === 'Cash');
    const cashMethods = manualPaymentMethods.filter(m => m.category === 'cash');
    const digitalFallbackMethods = manualPaymentMethods.filter(m => m.category === 'digital_fallback');

    // --- VIEW STATE ---
    const [activeView, setActiveView] = useState<'config' | 'credits'>('config');

    // --- PENDING FIXES FILTERS ---
    const [pendingSearch, setPendingSearch] = useState('');
    const [pendingDateStart, setPendingDateStart] = useState('');
    const [pendingDateEnd, setPendingDateEnd] = useState('');
    const [pendingReasonFilter, setPendingReasonFilter] = useState('all');

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans text-slate-800 overflow-y-auto pb-20">
            {/* Header */}
            <div className="bg-white px-8 py-6 border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Payment Modes Configuration</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage Integrations, Bank Accounts, and Collection Points.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveView('config')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'config' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Configuration
                        </button>
                        <button
                            onClick={() => setActiveView('credits')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'credits' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Pending Balance Fixes
                        </button>
                    </div>
                </div>
            </div>

            {activeView === 'credits' && (
                <div className="p-8 max-w-6xl mx-auto w-full">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Pending Credit Balance Fixes</h2>
                                    <p className="text-sm text-slate-500">Review pending adjustments awaiting director approval</p>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Filter Toggle */}
                        <div className="md:hidden px-6 py-3 border-b border-slate-200 bg-slate-50">
                            <button
                                onClick={() => setShowPendingFilters(!showPendingFilters)}
                                className="w-full py-2 bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                {showPendingFilters ? '✕ Close Filters' : '🔍 Filter & Search Students'}
                            </button>
                        </div>

                        {/* FILTERS TOOLBAR */}
                        <div className={`${showPendingFilters ? 'flex' : 'hidden'} md:flex bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap gap-4 items-center`}>
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    placeholder="Search Student..."
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    value={pendingSearch}
                                    onChange={(e) => setPendingSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <input
                                    type="date"
                                    className="flex-1 md:w-auto px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    value={pendingDateStart}
                                    onChange={(e) => setPendingDateStart(e.target.value)}
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    className="flex-1 md:w-auto px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    value={pendingDateEnd}
                                    onChange={(e) => setPendingDateEnd(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:min-w-[150px]">
                                <select
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    value={pendingReasonFilter}
                                    onChange={(e) => setPendingReasonFilter(e.target.value)}
                                >
                                    <option value="all">All Reasons</option>
                                    <option value="System Correction">System Correction</option>
                                    <option value="Waiver">Waiver / Discount</option>
                                    <option value="Opening Balance Adjustment">Opening Balance Adjustment</option>
                                    <option value="Refund">Refund</option>
                                    <option value="Penalty">Penalty Charge</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar -mx-4 md:mx-0">
                            <table className="w-full text-left min-w-[850px]">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.filter(p => {
                                        // 1. Basic Identity Check
                                        const isFix = (p.reference && String(p.reference).startsWith('FIX_BAL')) || (p.id && String(p.id).startsWith('FIX_BAL')) || (p.description && p.description.toLowerCase().includes('balance correction (credit)'));
                                        if (!isFix) return false;

                                        const student = students.find(s => s.id === p.studentId);

                                        // 2. Search Filter (Student Name)
                                        if (pendingSearch) {
                                            const searchLower = pendingSearch.toLowerCase();
                                            const matchName = student ? student.name.toLowerCase().includes(searchLower) : false;
                                            if (!matchName) return false;
                                        }

                                        // 3. Date Filter
                                        if (pendingDateStart) {
                                            if (new Date(p.date) < new Date(pendingDateStart)) return false;
                                        }
                                        if (pendingDateEnd) {
                                            // Fix 6: Include full end day
                                            if (new Date(p.date) > getEndOfDay(pendingDateEnd)) return false;
                                        }

                                        // 4. Reason Filter
                                        if (pendingReasonFilter !== 'all') {
                                            if (!p.description?.includes(pendingReasonFilter)) return false;
                                        }

                                        return true;
                                    }).map(credit => {
                                        const student = students.find(s => s.id === credit.studentId);
                                        return (
                                            <tr key={credit.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-mono text-slate-500">
                                                    {new Date(credit.date).toLocaleDateString()} {new Date(credit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    {student ? student.name : 'Unknown Student'}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">
                                                    {formatMoney(credit.amount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {credit.description || 'Balance Fix'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {payments.filter(p => {
                                        // Re-apply same filters for "empty" check... simplified for brevity, logic copied from map
                                        const isFix = (p.reference && String(p.reference).startsWith('FIX_BAL')) || (p.id && String(p.id).startsWith('FIX_BAL')) || (p.description && p.description.toLowerCase().includes('balance correction (credit)'));
                                        if (!isFix) return false;
                                        const student = students.find(s => s.id === p.studentId);
                                        if (pendingSearch && !(student?.name.toLowerCase().includes(pendingSearch.toLowerCase()))) return false;
                                        if (pendingDateStart && new Date(p.date) < new Date(pendingDateStart)) return false;
                                        if (pendingDateEnd && new Date(p.date) > getEndOfDay(pendingDateEnd)) return false;
                                        if (pendingReasonFilter !== 'all' && !p.description?.includes(pendingReasonFilter)) return false;
                                        return true;
                                    }).length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No pending balance fixes found.</td></tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {
                activeView === 'config' && (
                    <div className="p-8 max-w-6xl mx-auto w-full space-y-12">

                        {/* SECTION 1: DIGITAL INTEGRATIONS */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">1. Digital Integrations</h2>
                                    <p className="text-sm text-slate-500">Automated real-time payments (SchoolPay, PegPay)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {paymentIntegrations.map(integ => (
                                    <div
                                        key={integ.id}
                                        className={`bg-white rounded-xl border-2 transition-all shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md ${integ.status === 'active' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'}`}
                                        onClick={() => handleViewTransactions(integ.name, 'digital')}
                                    >
                                        <div className="p-6 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xl">
                                                        {integ.provider[0]}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-slate-800">{integ.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`w-2 h-2 rounded-full ${integ.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                            <span className={`text-xs font-semibold uppercase ${integ.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {integ.status === 'active' ? 'Active & Live' : 'Not Connected'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="form-control" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={integ.status === 'active'} onChange={() => toggleIntegration(integ)} disabled={!integ.apiKey} />
                                                </div>
                                            </div>
                                            <p className="text-slate-500 text-sm leading-relaxed mb-4">{integ.description}</p>
                                        </div>
                                        <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleConfigureClick(integ); }} className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Configure
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleSimulatePayment(integ); }} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Simulate Tx
                                            </button>
                                        </div>
                                        <div className="bg-slate-50 px-4 pb-4">
                                            <button onClick={(e) => { e.stopPropagation(); handleViewTransactions(integ.name, 'digital', 'unsynced'); }} className="w-full py-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                View Unsynced / Unclaimed Transactions
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <hr className="border-slate-200" />

                        {/* SECTION 2: BANK ACCOUNTS */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">2. Bank Accounts</h2>
                                        <p className="text-sm text-slate-500">Manage internal bank accounts details</p>
                                    </div>
                                </div>
                                <button onClick={handleAddBankClick} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                                    + Add Account
                                </button>
                            </div>
                            {/* Bank Accounts Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Fix 5: Empty state for bank accounts */}
                                {bankAccounts.length === 0 ? (
                                    <div className="text-center py-16 px-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Bank Accounts Configured</h3>
                                        <p className="text-slate-500 mb-4">Get started by adding your first bank account to track transactions.</p>
                                        <button
                                            onClick={handleAddBankClick}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            + Add Bank Account
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto custom-scrollbar -mx-4 md:mx-0">
                                        <table className="w-full text-left min-w-[850px]">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-6 py-4">Account Name</th>
                                                    <th className="px-6 py-4">Bank Name</th>
                                                    <th className="px-6 py-4">Account Number</th>
                                                    <th className="px-6 py-4 text-center">Total Transactions</th>
                                                    <th className="px-6 py-4 text-right">Trash</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bankAccounts.map(acc => {
                                                    const txCount = getTransactionsForSource(acc.name, 'bank').length;
                                                    return (
                                                        <tr key={acc.id} onClick={() => handleViewTransactions(acc.name, 'bank')} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                                            <td className="px-6 py-4 font-bold text-slate-700">{acc.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{acc.bankName || '-'}</td>
                                                            <td className="px-6 py-4 text-sm font-mono text-slate-500">{acc.accountNumber || '-'}</td>
                                                            <td className="px-6 py-4 text-center font-bold text-slate-800">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    {txCount} Trans.
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleViewTransactions(acc.name, 'bank', 'trash'); }}
                                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                    title="View Deleted Transactions"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button onClick={(e) => { e.stopPropagation(); handleEditBankClick(acc); }} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase mr-3">Edit</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteBank(acc.id); }} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Delete</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>

                        <hr className="border-slate-200" />

                        {/* SECTION 3: MANUAL DIGITAL ENTRIES */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">3. Manual Digital Entries (Fallback)</h2>
                                        <p className="text-sm text-slate-500">For recording failed syncs manually (Mapped to Provider)</p>
                                    </div>
                                </div>
                                <button onClick={() => handleAddMethodClick('digital_fallback')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                                    + Add Entry Type
                                </button>
                            </div>
                            {/* Manual Digital Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar -mx-4 md:mx-0">
                                    <table className="w-full text-left min-w-[950px]">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-6 py-4">Entry Name</th>
                                                <th className="px-6 py-4">Description</th>
                                                <th className="px-6 py-4">Mapped Provider</th>
                                                <th className="px-6 py-4 text-center">Total Transactions</th>
                                                <th className="px-6 py-4 text-right">Trash</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {digitalFallbackMethods.map(method => {
                                                const provider = paymentIntegrations.find(p => p.id === method.providerId);
                                                const txCount = getTransactionsForSource(method.name, 'manual').length;
                                                return (
                                                    <tr key={method.id} onClick={() => handleViewTransactions(method.name, 'manual')} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                                        <td className="px-6 py-4 font-bold text-slate-700">{method.name}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{method.description || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            {provider ? (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-600">
                                                                    {provider.name}
                                                                </span>
                                                            ) : <span className="text-red-500 text-xs font-bold">Unmapped</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                {txCount} Trans.
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleViewTransactions(method.name, 'manual', 'trash'); }}
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                title="View Deleted Transactions"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={(e) => { e.stopPropagation(); handleEditMethodClick(method); }} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase mr-3">Edit</button>
                                                            <button onClick={(e) => { e.stopPropagation(); deleteManualPaymentMethod(method.id); }} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Delete</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Fix 7: Empty state for digital fallback methods */}
                                            {digitalFallbackMethods.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8">
                                                        <div className="text-center text-slate-500">
                                                            <p>No manual digital entry types configured.</p>
                                                            <button onClick={() => handleAddMethodClick('digital_fallback')} className="mt-2 text-blue-600 hover:underline">
                                                                + Add Entry Type
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <hr className="border-slate-200" />

                        {/* SECTION 4: CASH COLLECTION POINTS */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">4. Cash Collection Points</h2>
                                        <p className="text-sm text-slate-500">Physical desks mapped to internal cash accounts</p>
                                    </div>
                                </div>
                                <button onClick={() => handleAddMethodClick('cash')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                                    + Add Cash Point
                                </button>
                            </div>
                            {/* Cash Points Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Point Name</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4">Mapped Account</th>
                                            <th className="px-6 py-4 text-center">Total Transactions</th>
                                            <th className="px-6 py-4 text-right">Trash</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cashMethods.map(method => {
                                            const account = cashAccounts.find(a => a.id === method.mappedAccountId);
                                            const txCount = getTransactionsForSource(method.name, 'cash').length;
                                            return (
                                                <tr key={method.id} onClick={() => handleViewTransactions(method.name, 'cash')} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 font-bold text-slate-700">{method.name}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{method.description || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        {account ? (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600">
                                                                {account.name}
                                                            </span>
                                                        ) : <span className="text-red-500 text-xs font-bold">Unmapped</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                            {txCount} Trans.
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleViewTransactions(method.name, 'cash', 'trash'); }}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                            title="View Deleted Transactions"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditMethodClick(method); }} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase mr-3">Edit</button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteManualPaymentMethod(method.id); }} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Delete</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Fix 7: Empty state for cash methods */}
                                        {cashMethods.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8">
                                                    <div className="text-center text-slate-500">
                                                        <p>No cash collection points configured.</p>
                                                        <button onClick={() => handleAddMethodClick('cash')} className="mt-2 text-blue-600 hover:underline">
                                                            + Add Cash Method
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )
            }

            {/* --- MODALS --- */}

            {/* VIEW TRANSACTIONS MODAL */}
            {
                viewTxs.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-up h-[80vh] flex flex-col relative">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${viewTxs.sourceType === 'digital' ? 'bg-blue-500' : viewTxs.sourceType === 'bank' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                                            {viewTxs.filter === 'unsynced' ? 'Unsynced / Unclaimed ' : viewTxs.filter === 'trash' ? 'Trash Bin / Deleted ' : ''}Transactions from {viewTxs.sourceName}
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-1">Found {viewTxs.transactions.length} records</p>
                                    </div>
                                    <button onClick={() => setViewTxs({ ...viewTxs, open: false })} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* FILTERS FOR UNSYNCED VIEW */}
                                {viewTxs.filter === 'unsynced' && (
                                    <div className="flex gap-3 items-center text-sm">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search Pay Code or Ref..."
                                                className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-48"
                                                value={unsyncedSearch}
                                                onChange={e => setUnsyncedSearch(e.target.value)}
                                            />
                                            {/* Auto-Complete Suggestions */}
                                            {unsyncedSearch && unsyncedSearch.length > 2 && (
                                                <div className="absolute top-full left-0 w-64 bg-white border border-slate-200 shadow-lg rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
                                                    {students
                                                        .filter(s => s.payCode.includes(unsyncedSearch) || s.name.toLowerCase().includes(unsyncedSearch.toLowerCase()))
                                                        .map(s => (
                                                            <div
                                                                key={s.id}
                                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-50 last:border-0"
                                                                onClick={() => setUnsyncedSearch(s.payCode)}
                                                            >
                                                                <div className="font-bold text-slate-700">{s.name}</div>
                                                                <div className="text-slate-500">{s.payCode}</div>
                                                            </div>
                                                        ))
                                                    }
                                                    {students.filter(s => s.payCode.includes(unsyncedSearch) || s.name.toLowerCase().includes(unsyncedSearch.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-2 text-slate-400 text-xs italic">No matching students</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <select
                                            className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={unsyncedFilterType}
                                            onChange={e => setUnsyncedFilterType(e.target.value as any)}
                                        >
                                            <option value="all">All Issues</option>
                                            <option value="duplicate">Duplicate IDs</option>
                                            <option value="unclaimed">Unclaimed (Exists)</option>
                                            <option value="unsynced">Unsynced (Unknown)</option>
                                        </select>

                                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 bg-white">
                                            <span className="text-slate-400 text-xs uppercase font-bold">Date:</span>
                                            <input
                                                type="date"
                                                className="py-1.5 outline-none text-slate-700 text-xs"
                                                value={unsyncedDateRange.start}
                                                onChange={e => setUnsyncedDateRange({ ...unsyncedDateRange, start: e.target.value })}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input
                                                type="date"
                                                className="py-1.5 outline-none text-slate-700 text-xs"
                                                value={unsyncedDateRange.end}
                                                onChange={e => setUnsyncedDateRange({ ...unsyncedDateRange, end: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* FILTERS FOR TRASH BIN VIEW */}
                                {viewTxs.filter === 'trash' && (
                                    <div className="flex gap-3 items-center text-sm">
                                        <input
                                            type="text"
                                            placeholder="Search Name or Ref..."
                                            className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-48"
                                            value={trashSearch}
                                            onChange={e => setTrashSearch(e.target.value)}
                                        />

                                        <select
                                            className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={trashReasonFilter}
                                            onChange={e => setTrashReasonFilter(e.target.value)}
                                        >
                                            <option value="all">All Reasons</option>
                                            <option value="Duplicate Entry">Duplicate Entry</option>
                                            <option value="Data Error">Data Error</option>
                                            <option value="Replaced by Sync">Replaced by Sync</option>
                                        </select>

                                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 bg-white">
                                            <span className="text-slate-400 text-xs uppercase font-bold">Date:</span>
                                            <input
                                                type="date"
                                                className="py-1.5 outline-none text-slate-700 text-xs"
                                                value={trashDateRange.start}
                                                onChange={e => setTrashDateRange({ ...trashDateRange, start: e.target.value })}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input
                                                type="date"
                                                className="py-1.5 outline-none text-slate-700 text-xs"
                                                value={trashDateRange.end}
                                                onChange={e => setTrashDateRange({ ...trashDateRange, end: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold text-left sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-3">Date & Time</th>
                                            <th className="px-6 py-3">{viewTxs.filter === 'unsynced' ? 'Pay Code / Ref' : 'Student Name'}</th>
                                            <th className="px-6 py-3">Transaction ID</th>
                                            <th className="px-6 py-3">Type</th>
                                            {viewTxs.filter === 'trash' && <th className="px-6 py-3">Deletion Reason</th>}
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewTxs.transactions.filter(tx => {
                                            // APPLY FILTERS
                                            if (viewTxs.filter === 'unsynced') {
                                                // 1. Search
                                                const search = unsyncedSearch.toLowerCase();
                                                if (search && !((tx.possiblePayCode || '').includes(search) || (tx.reference || '').toLowerCase().includes(search))) return false;

                                                // 2. Date
                                                if (unsyncedDateRange.start && new Date(tx.date) < new Date(unsyncedDateRange.start)) return false;
                                                if (unsyncedDateRange.end && new Date(tx.date) > new Date(unsyncedDateRange.end + 'T23:59:59')) return false;

                                                // 3. Status Type
                                                if (unsyncedFilterType === 'duplicate' && !tx.isDuplicate) return false;
                                                const enrolledMatch = students.find(s => s.payCode === tx.possiblePayCode);
                                                if (unsyncedFilterType === 'unclaimed' && (!enrolledMatch || tx.isDuplicate)) return false;
                                                if (unsyncedFilterType === 'unsynced' && (enrolledMatch || tx.isDuplicate)) return false;
                                                return true;
                                            }

                                            if (viewTxs.filter === 'trash') {
                                                const search = trashSearch.toLowerCase();
                                                const student = students.find(s => s.id === tx.studentId);
                                                const name = student ? student.name.toLowerCase() : '';
                                                const ref = (tx.reference || '').toLowerCase();

                                                // 1. Search (Name/Ref)
                                                if (search && !(name.includes(search) || ref.includes(search))) return false;

                                                // 2. Date
                                                if (trashDateRange.start && new Date(tx.date) < new Date(trashDateRange.start)) return false;
                                                if (trashDateRange.end && new Date(tx.date) > new Date(trashDateRange.end + 'T23:59:59')) return false;

                                                // 3. Reason
                                                if (trashReasonFilter !== 'all' && (tx.deleteReason || 'Unknown') !== trashReasonFilter) return false;

                                                return true;
                                            }

                                            return true;
                                        }).map((tx, i) => {
                                            const student = students.find(s => s.id === tx.studentId);
                                            const enrolledPossible = students.find(s => s.payCode === tx.possiblePayCode);
                                            // Status Logic: Digital = Approved, Others = Check 'status' field or default to Pending
                                            let status: 'pending' | 'approved' | 'rejected' = tx.status || 'pending';
                                            if (viewTxs.sourceType === 'digital') status = 'approved';

                                            return (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-sm text-slate-500">
                                                        {new Date(tx.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {viewTxs.filter === 'unsynced' ? (
                                                            <div>
                                                                <div className="font-bold text-slate-700 font-mono">{tx.possiblePayCode || 'Unknown'}</div>
                                                                {tx.isDuplicate ? (
                                                                    <div className="text-xs text-orange-600 font-bold bg-orange-50 px-1 rounded w-fit mt-1">⚠️ Duplicate ID</div>
                                                                ) : enrolledPossible ? (
                                                                    <div className="text-xs text-blue-600 font-bold bg-blue-50 px-1 rounded w-fit mt-1">Unclaimed (Enrolled)</div>
                                                                ) : (
                                                                    <div className="text-xs text-slate-500 bg-slate-100 px-1 rounded w-fit mt-1">Unsynced (Unknown)</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-bold text-slate-700">{student ? student.name : tx.description}</div>
                                                                <div className="text-xs text-slate-400">{student ? student.payCode : (tx.source || 'Unknown Source')}</div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                                        {tx.reference || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tx.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    {viewTxs.filter === 'trash' && (
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                {tx.deleteReason || 'Unknown'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                                        ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                                status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                                    'bg-amber-100 text-amber-700'}`}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold font-mono text-slate-800">
                                                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(tx.amount)}

                                                        {/* Sync Button for Unsynced */}
                                                        {viewTxs.filter === 'unsynced' ? (
                                                            tx.isDuplicate ? (
                                                                <button
                                                                    onClick={() => handleReplaceManualPayment(tx)}
                                                                    className="block mt-2 ml-auto text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded shadow-sm transition-colors"
                                                                    title="Replace the existing manual payment with this one"
                                                                >
                                                                    ⇄ Replace Manual
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleManualSync(tx)}
                                                                    disabled={isSyncing}
                                                                    className={`block mt-2 ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    {isSyncing ? '⏳ Syncing...' : (enrolledPossible ? '⚡ Auto-Link' : '↻ Retry Sync')}
                                                                </button>
                                                            )
                                                        ) : (
                                                            // Print Receipt Button for normal transactions
                                                            <button
                                                                onClick={() => handlePrintReceipt(tx)}
                                                                className="block mt-2 ml-auto text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-3 py-1 rounded shadow-sm transition-colors flex items-center gap-1"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                                Receipt
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {viewTxs.transactions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        <span>No transactions found for this source.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-right">
                                <div className="text-sm font-bold text-slate-500">
                                    {viewTxs.filter === 'unsynced' && (unsyncedSearch || unsyncedFilterType !== 'all') ? 'Filtered Total:' : 'Total:'}
                                    <span className="text-slate-900 ml-2">
                                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                            viewTxs.transactions.filter(tx => {
                                                // RE-USE FILTER LOGIC FOR TOTAL
                                                if (viewTxs.filter === 'unsynced') {
                                                    const search = unsyncedSearch.toLowerCase();
                                                    if (search && !((tx.possiblePayCode || '').includes(search) || (tx.reference || '').toLowerCase().includes(search))) return false;
                                                    if (unsyncedDateRange.start && new Date(tx.date) < new Date(unsyncedDateRange.start)) return false;
                                                    if (unsyncedDateRange.end && new Date(tx.date) > new Date(unsyncedDateRange.end + 'T23:59:59')) return false;
                                                    if (unsyncedFilterType === 'duplicate' && !tx.isDuplicate) return false;
                                                    const enrolledMatch = students.find(s => s.payCode === tx.possiblePayCode);
                                                    if (unsyncedFilterType === 'unclaimed' && (!enrolledMatch || tx.isDuplicate)) return false;
                                                    if (unsyncedFilterType === 'unsynced' && (enrolledMatch || tx.isDuplicate)) return false;
                                                    return true;
                                                }
                                                if (viewTxs.filter === 'trash') {
                                                    const search = trashSearch.toLowerCase();
                                                    const student = students.find(s => s.id === tx.studentId);
                                                    const name = student ? student.name.toLowerCase() : '';
                                                    const ref = (tx.reference || '').toLowerCase();
                                                    if (search && !(name.includes(search) || ref.includes(search))) return false;
                                                    if (trashDateRange.start && new Date(tx.date) < new Date(trashDateRange.start)) return false;
                                                    if (trashDateRange.end && new Date(tx.date) > new Date(trashDateRange.end + 'T23:59:59')) return false;
                                                    if (trashReasonFilter !== 'all' && (tx.deleteReason || 'Unknown') !== trashReasonFilter) return false;
                                                    return true;
                                                }

                                                return true;
                                            }).reduce((s, t) => s + t.amount, 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- MODALS (Global) --- */}

            {/* VIEW TRANSACTIONS MODAL */}
            {
                viewTxs.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-up h-[80vh] flex flex-col relative">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${viewTxs.sourceType === 'digital' ? 'bg-blue-500' : viewTxs.sourceType === 'bank' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                                            {viewTxs.filter === 'unsynced' ? 'Unsynced / Unclaimed ' : viewTxs.filter === 'trash' ? 'Trash Bin / Deleted ' : ''}Transactions from {viewTxs.sourceName}
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-1">Found {viewTxs.transactions.length} records</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setViewTxs({ ...viewTxs, open: false })} className="text-slate-400 hover:text-slate-600">✕</button>
                                    </div>
                                </div>

                                {/* FILTERS UI */}
                                {viewTxs.filter === 'unsynced' && (
                                    <div className="flex gap-2 p-2 bg-slate-200 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Search reference, amount..."
                                            className="flex-1 bg-white border-none rounded-md px-3 py-1.5 text-sm focus:ring-0"
                                            value={unsyncedSearch}
                                            onChange={(e) => setUnsyncedSearch(e.target.value)}
                                        />
                                        <select
                                            className="bg-white border-none rounded-md px-3 py-1.5 text-sm focus:ring-0"
                                            value={unsyncedFilterType}
                                            onChange={(e) => setUnsyncedFilterType(e.target.value as any)}
                                        >
                                            <option value="all">All Issues</option>
                                            <option value="duplicate">Conflict / Duplicates</option>
                                            <option value="unclaimed">Unclaimed</option>
                                        </select>
                                    </div>
                                )}

                                {viewTxs.filter === 'trash' && (
                                    <div className="flex gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                        <input
                                            type="text"
                                            placeholder="Search deleted records..."
                                            className="flex-1 bg-white border-red-100 rounded-md px-3 py-1.5 text-sm focus:ring-0 text-red-800 placeholder-red-300"
                                            value={trashSearch}
                                            onChange={(e) => setTrashSearch(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="overflow-y-auto flex-1 p-0">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            {viewTxs.sourceType !== 'digital' && <th className="px-6 py-4">Student Name</th>}
                                            <th className="px-6 py-4">Reference</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-center">Approval</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewTxs.transactions
                                            .filter(t => {
                                                if (viewTxs.filter === 'unsynced') {
                                                    if (unsyncedSearch && !JSON.stringify(t).toLowerCase().includes(unsyncedSearch.toLowerCase())) return false;
                                                    if (unsyncedFilterType === 'duplicate' && !t.isDuplicate && t.source !== 'Conflict') return false;
                                                    if (unsyncedFilterType === 'unclaimed' && t.possiblePayCode) return false;
                                                }
                                                if (viewTxs.filter === 'trash') {
                                                    if (trashSearch && !JSON.stringify(t).toLowerCase().includes(trashSearch.toLowerCase())) return false;
                                                }
                                                return true;
                                            })
                                            .map(tx => (
                                                <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${tx.isDuplicate ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                                                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                        {new Date(tx.date).toLocaleDateString()}
                                                        <div className="text-xs opacity-50">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    {viewTxs.sourceType !== 'digital' && (
                                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                                            {students.find(s => s.id === tx.studentId)?.name || '-'}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-sm font-mono text-slate-600 select-all">{tx.reference || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        {tx.description}
                                                        {tx.studentId && <div className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded inline-block ml-2">Linked</div>}
                                                        {viewTxs.filter === 'trash' && (
                                                            <div className="mt-1 text-xs text-red-500 bg-red-50 p-1 rounded border border-red-100">
                                                                <strong>Deleted by:</strong> {tx.deletedBy}<br />
                                                                <strong>Reason:</strong> {tx.deleteReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{formatMoney(tx.amount)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {viewTxs.sourceType === 'digital' || tx.status === 'approved' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                Approved
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    Pending
                                                                </span>
                                                                {activeRole === 'Director' && (
                                                                    <button
                                                                        onClick={() => handleApprovePayment(tx)}
                                                                        className="text-[10px] bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 shadow-sm transition-colors uppercase font-bold tracking-wide"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {tx.isDuplicate ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                                                                ⚠️ Conflict
                                                            </span>
                                                        ) : tx.status === 'pending_sync' ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">
                                                                Unclaimed
                                                            </span>
                                                        ) : tx.deletedAt ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                                Deleted
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                                                synced
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {viewTxs.filter === 'trash' ? (
                                                            <span className="text-xs text-slate-400 italic">No actions</span>
                                                        ) : viewTxs.filter === 'unsynced' && (
                                                            <div className="flex justify-end gap-2">
                                                                {tx.isDuplicate ? (
                                                                    <button
                                                                        onClick={() => handleReplaceManualPayment(tx)}
                                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-sm"
                                                                    >
                                                                        Replace Manual
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleManualSync(tx)}
                                                                        disabled={isSyncing}
                                                                        className={`px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    >
                                                                        <span>{isSyncing ? '⏳ Syncing...' : 'Link Student'}</span>
                                                                        {!isSyncing && tx.possiblePayCode && <span className="bg-white/20 px-1 rounded text-[10px]">Auto?</span>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {viewTxs.filter === 'all' && (
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handlePrintReceipt(tx)} className="text-slate-400 hover:text-slate-600" title="Print Receipt">🖨️</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        {viewTxs.transactions.length === 0 && (
                                            <tr><td colSpan={6} className="p-12 text-center text-slate-400">No transactions found for this view.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 1. CONFIG MODAL */}
            {
                configModal.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">Configure {configModal.integration?.name}</h3>
                                <button onClick={() => setConfigModal({ open: false, integration: null })} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-4">
                                    Enter your API credentials found in your {configModal.integration?.name} dashboard.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Merchant ID</label>
                                    <input type="text" className="premium-input w-full" value={configForm.merchantId} onChange={e => setConfigForm({ ...configForm, merchantId: e.target.value })} placeholder="e.g. 10023456" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                                    <input type="password" className="premium-input w-full" value={configForm.apiKey} onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })} placeholder="••••••••••••••••" />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setConfigModal({ open: false, integration: null })} className="btn btn-ghost text-slate-500">Cancel</button>
                                <button onClick={handleSaveConfig} className="btn bg-blue-600 hover:bg-blue-700 text-white border-none">Save & Connect</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 2. BANK ACCOUNT MODAL */}
            {
                bankModal.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">{bankModal.account ? 'Edit Bank Account' : 'Add Bank Account'}</h3>
                                <button onClick={() => setBankModal({ open: false, account: null })} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Display Name</label>
                                    <input type="text" className="premium-input w-full" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} placeholder="e.g. Centenary Main" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                                    <input type="text" className="premium-input w-full" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="e.g. Centenary Bank" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
                                    <input type="text" className="premium-input w-full font-mono" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="0000000000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                                    <select className="premium-input w-full" value={bankForm.currency} onChange={e => setBankForm({ ...bankForm, currency: e.target.value })}>
                                        <option value="UGX">UGX</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setBankModal({ open: false, account: null })} className="btn btn-ghost text-slate-500">Cancel</button>
                                <button onClick={handleSaveBank} disabled={!bankForm.name} className="btn bg-slate-900 hover:bg-slate-800 text-white border-none">Save Account</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 3. METHOD MODAL (Shared) */}
            {
                methodModal.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">
                                    {methodModal.type === 'cash' ? 'Cash Collection Point' : 'Manual Digital Entry'}
                                </h3>
                                <button onClick={() => setMethodModal({ open: false, method: null, type: 'cash' })} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                                    <input type="text" className="premium-input w-full" value={methodForm.name} onChange={e => setMethodForm({ ...methodForm, name: e.target.value })} placeholder={methodModal.type === 'cash' ? "e.g. Bursar Desk" : "e.g. Manual SchoolPay"} autoFocus />
                                </div>

                                {/* Dynamic Mapping Field */}
                                {methodModal.type === 'cash' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Map to Cash Account</label>
                                        <select className="premium-input w-full" value={methodForm.mappedId} onChange={e => setMethodForm({ ...methodForm, mappedId: e.target.value })}>
                                            <option value="" disabled>Select Cash Account...</option>
                                            {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Map to Digital Provider</label>
                                        <select className="premium-input w-full" value={methodForm.mappedId} onChange={e => setMethodForm({ ...methodForm, mappedId: e.target.value })}>
                                            <option value="" disabled>Select Provider...</option>
                                            {paymentIntegrations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea className="premium-input w-full h-20 resize-none" value={methodForm.description} onChange={e => setMethodForm({ ...methodForm, description: e.target.value })} placeholder="Optional details..." />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setMethodModal({ open: false, method: null, type: 'cash' })} className="btn btn-ghost text-slate-500">Cancel</button>
                                <button onClick={handleSaveMethod} disabled={!methodForm.name || !methodForm.mappedId} className="btn bg-slate-900 hover:bg-slate-800 text-white border-none">Save Record</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
