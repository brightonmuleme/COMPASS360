"use client";
import React, { useState, useEffect } from 'react';
import { useSchoolData, PaymentIntegration, ManualPaymentMethod, BankAccount, Payment } from '@/lib/store';
import { numberToWords } from '@/lib/numberToWords';
import { schoolPayService } from '@/services/schoolPayService';
import { databaseService } from '@/services/databaseService';

const generateId = () => Math.random().toString(36).substring(2, 10);
const logGlobalAction = (action: string, details: string) => console.log(action, details);

export default function PaymentModesPage() {
    const {
        filteredAccounts: accounts, addAccount, updateAccount, deleteAccount,
        manualPaymentMethods, addManualPaymentMethod, updateManualPaymentMethod, deleteManualPaymentMethod,
        paymentIntegrations, updatePaymentIntegration, // Restored
        students, payments, generalTransactions, addPayment, deletePayment, // Restored
        deletedPayments, unclaimedPayments, // Get deleted and unclaimed payments
        documentTemplates, programmes, // Added for receipt printing
        activeRole, updatePayment, developerSettings, schoolProfile,
        linkPayment, releaseGhostPayments, // Added releaseGhostPayments
        triggerAtomicCloudSync // Force immediate persistence
    } = useSchoolData();

    // --- STATE MANAGEMENT ---
    const [isSyncing, setIsSyncing] = useState(false); // Fix 4: Loading state for manual sync

    // 1. Integration Config
    const [configModal, setConfigModal] = useState<{ open: boolean, integration: PaymentIntegration | null }>({ open: false, integration: null });
    const [configForm, setConfigForm] = useState({ merchantId: '', apiKey: '', clientSecret: '' });
    const [showApiKey, setShowApiKey] = useState(false);

    // NEW: Sync Range Modal
    const [syncRangeModal, setSyncRangeModal] = useState<{ open: boolean, integration: PaymentIntegration | null }>({ open: false, integration: null });
    const [syncDates, setSyncDates] = useState({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days ago
        to: new Date().toISOString().split('T')[0]
    });

    const [origin, setOrigin] = useState('https://compass360.ac.ug');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

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

    const [viewTxs, setViewTxs] = useState<{ open: boolean, sourceName: string, sourceType: 'digital' | 'bank' | 'manual' | 'cash', transactions: any[], filter: 'all' | 'unsynced' | 'trash' }>({ open: false, sourceName: '', sourceType: 'digital', transactions: [], filter: 'all' });

    // NEW: Non-blocking Link Confirmation State
    const [linkConfirm, setLinkConfirm] = useState<{ open: boolean, tx: any, student: any | null }>({ open: false, tx: null, student: null });

    // --- MOBILE FILTER STATES ---
    const [showPendingFilters, setShowPendingFilters] = useState(false);
    const [showUnsyncedFilters, setShowUnsyncedFilters] = useState(false);

    // --- COMPUTED DATA ---
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

    // --- HELPERS: INTEGRATIONS ---
    const handleConfigureClick = (integration: PaymentIntegration) => {
        setConfigForm({
            merchantId: integration.merchantId || '',
            apiKey: integration.apiKey || '',
            clientSecret: integration.clientSecret || ''
        });
        setConfigModal({ open: true, integration });
    };

    const [syncingInteg, setSyncingInteg] = useState<string | null>(null);

    const handleSyncPayments = (integ: PaymentIntegration) => {
        if (integ.status !== 'active') {
            alert("Please activate the integration first by providing API credentials.");
            return;
        }
        setSyncRangeModal({ open: true, integration: integ });
    };

    const processSyncRange = async () => {
        const integ = syncRangeModal.integration;
        if (!integ || !integ.merchantId || !integ.apiKey) return;

        setSyncingInteg(integ.id);

        try {
            const results = await schoolPayService.syncRange(
                integ.merchantId,
                integ.apiKey,
                syncDates.from,
                syncDates.to
            );

            if (results.returnCode !== 0) {
                alert(`SchoolPay Error: ${results.returnMessage}`);
                return;
            }

            const allTxs = [...(results.transactions || []), ...(results.supplementaryFeePayments || [])];

            let newCount = 0;
            allTxs.forEach(tx => {
                const existingIndex = payments.findIndex(p => p.reference === tx.schoolpayReceiptNumber);
                const student = students.find(s => s.payCode === tx.studentPaymentCode);

                if (existingIndex !== -1) {
                    const existing = payments[existingIndex];
                    if ((existing.studentId === 0 || !existing.studentId) && student) {
                        updatePayment({
                            ...existing,
                            studentId: student.id,
                            term: student.semester,
                            description: tx.supplementaryFeeDescription || 'School Fees',
                            status: 'approved',
                            method: 'SchoolPay', // Ensure correct field is set
                            metadata: {
                                ...existing.metadata,
                                payCode: tx.studentPaymentCode,
                                lastAutoRelink: new Date().toISOString()
                            }
                        });
                        newCount++;
                    }
                    return;
                }

                const newPayment: Payment = {
                    id: `sp_sync_${tx.schoolpayReceiptNumber}`,
                    studentId: student ? student.id : 0,
                    amount: parseFloat(tx.amount),
                    date: tx.paymentDateAndTime,
                    method: 'SchoolPay', // FIXED: store.ts Payment interface uses 'method'
                    reference: tx.schoolpayReceiptNumber,
                    receiptNumber: tx.schoolpayReceiptNumber,
                    description: (tx.supplementaryFeeDescription || 'School Fees') + (tx.sourcePaymentChannel ? ` [${tx.sourcePaymentChannel}]` : ''),
                    term: student ? student.semester : 'Unknown',
                    status: 'approved', // FIXED: store.ts uses 'approved' | 'pending' | 'rejected'
                    recordedBy: 'SchoolPay System',
                    allocations: { 'Tuition Fees': parseFloat(tx.amount) },
                    metadata: {
                        syncSource: 'Manual Range Sync',
                        payCode: tx.studentPaymentCode,
                        bankName: (tx as any).settlementBank || (tx as any).settlementBankCode // Use casting to handle API variations
                    },
                    history: [{
                        id: `sp_hist_${tx.schoolpayReceiptNumber}`,
                        action: 'Created',
                        details: 'Automatically synced from SchoolPay API Range Search',
                        user: 'Bursar',
                        timestamp: new Date().toISOString()
                    }]
                };

                addPayment(newPayment);
                newCount++;
            });

            // 🚀 CRITICAL FIX: Trigger atomic cloud sync to ensure persistence across all devices
            // This forces the "mobile sync" to save to the "laptop" globally before the alert.
            console.log("☁️ Compass Sync: Triggering atomic cloud push...");
            await triggerAtomicCloudSync();

            alert(`Sync Complete!\n\nFound: ${allTxs.length} transactions.\nSaved: ${newCount} new records.`);
            setSyncRangeModal({ open: false, integration: null });
        } catch (error) {
            alert("Sync Failed: Could not connect to SchoolPay API.");
        } finally {
            setSyncingInteg(null);
        }
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
                id: p.id,
                date: p.date,
                amount: p.amount,
                description: p.description || `Student Payment (${p.studentId || p.metadata?.payCode || 'Manual'})`,
                mode: p.method || (p as any).mode, // Handle potential 'mode' vs 'method' split
                method: p.method || (p as any).mode,
                type: 'Income',
                source: 'Student',
                studentId: p.studentId,
                reference: p.reference,
                status: p.status,
                metadata: p.metadata
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
            const deletedTxs = deletedPayments.map(p => {
                const deleteLog = p.history?.slice().reverse().find(h => h.action === 'Deleted');
                return {
                    id: p.id,
                    date: p.date,
                    amount: p.amount,
                    description: p.description || `Student Payment (${p.studentId})`,
                    mode: p.method,
                    method: p.method,
                    type: 'Income',
                    source: 'Student',
                    studentId: p.studentId,
                    reference: p.reference,
                    status: (p.status || 'void') as any,
                    deletedAt: deleteLog?.timestamp || new Date().toISOString(),
                    deletedBy: deleteLog?.user || 'Unknown',
                    deleteReason: (p as any).deleteReason || deleteLog?.details || 'Unknown',
                    metadata: p.metadata || {}
                };
            });

            const realUnclaimed = unclaimedPayments.map(p => ({
                id: p.id,
                date: p.date,
                amount: p.amount,
                description: p.description || 'Unclaimed Payment',
                mode: p.method,
                method: p.method,
                type: 'Income',
                source: 'Unclaimed Store',
                studentId: 0,
                reference: p.reference,
                status: 'approved' as any,
                possiblePayCode: (p as any).metadata?.payCode || (p as any).payCode || null,
                metadata: p.metadata || {}
            }));

            txs = [...deletedTxs, ...realUnclaimed];

            txs = txs.filter(tx => {
                const search = name.toLowerCase();
                const mode = String(tx.mode || '').toLowerCase();
                const desc = String(tx.description || '').toLowerCase();
                const method = String(tx.method || '').toLowerCase();
                if (type === 'bank') return mode.includes(search) || method.includes(search);
                return mode.includes(search) || desc.includes(search) || method.includes(search);
            });
        } else if (filter === 'unsynced') {
            const demoRef1 = 'UNCLAIMED-001';
            if (!payments.some((p: any) => p.reference === demoRef1)) {
                txs.push({
                    id: 'unsync_demo_1',
                    date: new Date(Date.now() - 86400000 * 4).toISOString(),
                    amount: 150000,
                    description: 'Payment from 0770000000',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Unknown',
                    studentId: 0,
                    reference: demoRef1,
                    status: 'approved' as any,
                    possiblePayCode: '1000000111',
                    metadata: { payCode: '1000000111' }
                } as any);
            }

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
                    studentId: 0,
                    reference: 'UNCLAIMED-002',
                    status: 'approved' as any,
                    possiblePayCode: '2000000222',
                    metadata: { payCode: '2000000222' }
                } as any);
            }

            const conflictRef = 'REF-MANUAL-EXISTING';
            const checkRes = payments.find((p: any) => p.reference === conflictRef);
            const isResolved = checkRes && (checkRes.recordedBy?.includes('System') || checkRes.recordedBy?.includes('Replace'));

            if (!isResolved) {
                const hasConflict = payments.find((p: any) => p.reference === conflictRef);
                txs.push({
                    id: 'unsync_demo_3',
                    date: new Date().toISOString(),
                    amount: 50000,
                    description: 'SchoolPay - Conflict A',
                    mode: name,
                    method: name,
                    type: 'Income',
                    source: 'Conflict',
                    studentId: 0,
                    reference: conflictRef,
                    status: 'approved' as any,
                    possiblePayCode: '5000000555',
                    metadata: { payCode: '5000000555' },
                    isDuplicate: !!hasConflict,
                    conflictingPaymentId: hasConflict?.id
                } as any);
            }

            const newMocks = [
                { id: '1212', code: '2000000222', amount: 55000 },
                { id: '1313', code: '300000', amount: 75000 },
                { id: '1414', code: '10000000111', amount: 150000 },
                { id: '1515', code: '10000000', amount: 200000 },
                { id: '1616', code: '1000000111', amount: 80000 },
                { id: '1717', code: '077999888', amount: 20000 }
            ];

            newMocks.forEach(m => {
                if (!payments.some((p: any) => p.reference === m.id)) {
                    txs.push({
                        id: `unsync_mock_${m.id}`,
                        date: new Date().toISOString(),
                        amount: m.amount,
                        description: `Payment Ref: ${m.id}`,
                        mode: name,
                        method: name,
                        type: 'Income',
                        source: 'Unknown',
                        studentId: 0,
                        reference: m.id,
                        status: 'approved' as any,
                        possiblePayCode: m.code,
                        metadata: { payCode: m.code }
                    } as any);
                }
            });
        }

        // Sort by date desc
        txs.sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return String(b.id).localeCompare(String(a.id));
        });

        setViewTxs({ open: true, sourceName: name, sourceType: type, transactions: txs, filter });
    };

    const handleLinkStudentTrigger = (tx: any) => {
        // Find student by payCode if it exists in metadata or mock
        const payCode = tx.possiblePayCode || tx.metadata?.payCode;
        const student = students.find(s => s.payCode === payCode);
        setLinkConfirm({ open: true, tx, student });
    };

    const handleManualSync = async (tx: any) => {
        const student = linkConfirm.student;
        if (!student) return;

        if (isSyncing) return;
        setIsSyncing(true);

        try {
            // Check if payment already exists in primary history
            const existingPayment = payments.find(p => p.reference === tx.reference);

            if (existingPayment) {
                // Case 1: Payment exists but is unlinked (student: 0 or null)
                if (!existingPayment.studentId || existingPayment.studentId === 0) {
                    linkPayment(existingPayment.id, student.id);

                    // Update UI transactions list
                    setViewTxs(prev => ({
                        ...prev,
                        transactions: prev.transactions.filter(t => t.id !== tx.id)
                    }));

                    setLinkConfirm({ open: false, tx: null, student: null });
                    alert(`✅ Payment successfully linked to ${student.name}! Arrears have been updated.`);
                    return;
                }

                // Case 2: Payment exists and is linked to a different student
                const linkedStudent = students.find(s => s.id === existingPayment.studentId);
                const isManualPayment = existingPayment.recordedBy?.includes('Manual') ||
                    existingPayment.id?.includes('manual');

                if (isManualPayment) {
                    const confirmReplace = confirm(
                        `⚠️ REPLACE MANUAL PAYMENT?\n\n` +
                        `A manual payment with reference "${tx.reference}" already exists for:\n` +
                        `${linkedStudent?.name || 'Unknown Student'}\n\n` +
                        `Amount: USh ${existingPayment.amount.toLocaleString()}\n\n` +
                        `Do you want to REPLACE it with this verified digital transaction for ${student.name}?`
                    );

                    if (confirmReplace) {
                        deletePayment(existingPayment.id, 'Replaced by verified digital transaction');
                        // Continue to create new payment below
                    } else {
                        setLinkConfirm({ open: false, tx: null, student: null });
                        return;
                    }
                } else {
                    alert(`ℹ️ This transaction has already been linked to ${linkedStudent?.name || 'Unknown'}.`);
                    setLinkConfirm({ open: false, tx: null, student: null });
                    return;
                }
            }

            // Case 3: Payment doesn't exist or was just deleted for replacement
            // We use addPayment for brand new records
            const newPayment: Payment = {
                id: tx.id.startsWith('unsync') ? `sp_${Date.now()}` : tx.id,
                studentId: student.id,
                amount: tx.amount,
                date: tx.date || new Date().toISOString(),
                method: tx.method || 'SchoolPay',
                reference: tx.reference,
                receiptNumber: tx.receiptNumber || tx.reference,
                recordedBy: 'System (Linked)',
                description: tx.description || 'School Fees',
                term: student.semester || 'Unknown',
                status: 'approved',
                allocations: { 'Tuition Fees': tx.amount },
                history: [{
                    id: generateId(),
                    action: 'Created',
                    details: 'Manually linked from unsynced digital records',
                    user: activeRole || 'Bursar',
                    timestamp: new Date().toISOString()
                }]
            };

            addPayment(newPayment);

            // Update UI
            setViewTxs(prev => ({
                ...prev,
                transactions: prev.transactions.filter(t => t.id !== tx.id)
            }));

            setLinkConfirm({ open: false, tx: null, student: null });
            alert(`✅ Transaction successfully processed and linked to ${student.name}.`);
        } catch (err) {
            console.error("Linking Error:", err);
            alert("❌ An error occurred while linking the payment.");
        } finally {
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
        if (existing) {
            deletePayment(existing.id, "Replaced by Digital Transaction Sync");
        }

        // 2. Add the Digital Payment
        const newPayment: any = {
            id: crypto.randomUUID(),
            studentId: existing ? existing.studentId : (students[0]?.id || 0),
            amount: tx.amount,
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
            const realPayment = payments.find((p: any) => p.id === tx.id);
            if (realPayment) {
                updatePayment({ ...realPayment, status: 'approved' });
                setViewTxs(prev => ({
                    ...prev,
                    transactions: prev.transactions.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t)
                }));
            } else {
                alert("Error: Payment record not found in strict store.");
            }
        }
    };


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
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSyncPayments(integ); }}
                                                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm ${syncingInteg === integ.id ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                disabled={syncingInteg === integ.id}
                                            >
                                                {syncingInteg === integ.id ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                )}
                                                {syncingInteg === integ.id ? 'Syncing...' : 'Sync Now'}
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
                )}

            {/* --- MODALS (Global) --- */}

            {/* VIEW TRANSACTIONS MODAL */}
            {
                viewTxs.open && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-scale-up h-[85vh] flex flex-col relative border border-slate-200">
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
                                        {/* GHOST RELEASE BUTTON */}
                                        {viewTxs.filter === 'unsynced' && (
                                            <button
                                                onClick={() => {
                                                    const count = releaseGhostPayments();
                                                    alert(`👻 Ghost Busting Complete!\n\nReleased ${count} payments from deleted student records.\n\nYou can now link these payments to the new student profiles.`);
                                                    // Force refresh view by closing and reopening or just let state update naturally (payments array updates)
                                                    setViewTxs({ ...viewTxs, open: false });
                                                }}
                                                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors border border-amber-200 flex items-center gap-2"
                                                title="Fix payments stuck to deleted students"
                                            >
                                                <span>🔓 Release Ghost Payments</span>
                                            </button>
                                        )}
                                        <button onClick={() => setViewTxs({ ...viewTxs, open: false })} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">✕</button>
                                    </div>
                                </div>

                                {/* FILTERS UI */}
                                {viewTxs.filter === 'unsynced' && (
                                    <div className="flex gap-2 p-2 bg-slate-200/50 rounded-lg border border-slate-200">
                                        <input
                                            type="text"
                                            placeholder="Search reference, amount, pay code..."
                                            className="flex-1 bg-white border-none rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={unsyncedSearch}
                                            onChange={(e) => setUnsyncedSearch(e.target.value)}
                                        />
                                        <select
                                            className="bg-white border-none rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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

                            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4">Date & Time</th>
                                            <th className="px-6 py-4 text-slate-800">Student / Owner</th>
                                            <th className="px-6 py-4">Reference</th>
                                            <th className="px-6 py-4 text-blue-600 font-bold">Pay Code</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewTxs.transactions
                                            .filter(t => {
                                                if (viewTxs.filter === 'unsynced') {
                                                    const s = unsyncedSearch.toLowerCase();
                                                    if (s && !JSON.stringify(t).toLowerCase().includes(s)) return false;
                                                    if (unsyncedFilterType === 'duplicate' && !t.isDuplicate && t.source !== 'Conflict') return false;
                                                    if (unsyncedFilterType === 'unclaimed' && t.possiblePayCode) return false;
                                                }
                                                if (viewTxs.filter === 'trash') {
                                                    if (trashSearch && !JSON.stringify(t).toLowerCase().includes(trashSearch.toLowerCase())) return false;
                                                }
                                                return true;
                                            })
                                            .map(tx => (
                                                <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${tx.isDuplicate || tx.source === 'Conflict' ? 'bg-amber-50/30 hover:bg-amber-100/30' : ''}`}>
                                                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                        <div className="font-medium text-slate-900">{new Date(tx.date).toLocaleDateString()}</div>
                                                        <div className="text-[10px] opacity-60 uppercase">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                                        {(() => {
                                                            const linked = payments.find(p => p.reference === tx.reference && p.studentId !== 0);
                                                            const student = students.find(s => s.id === (tx.studentId || linked?.studentId));
                                                            if (student) return <span className="text-blue-600">✓ {student.name}</span>;
                                                            return <span className="text-slate-400 font-normal italic">Unlinked Record</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono text-slate-600 select-all">{tx.reference || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 w-fit">
                                                            {students.find(s => s.id === tx.studentId)?.payCode || tx.possiblePayCode || tx.metadata?.payCode || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        <div className="font-medium">{tx.description}</div>
                                                        {tx.metadata?.bankName && (
                                                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-bold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                                Settled to: {tx.metadata.bankName}
                                                            </div>
                                                        )}
                                                        {viewTxs.filter === 'trash' && (
                                                            <div className="mt-1 text-xs text-red-500 bg-red-50 p-1.5 rounded border border-red-100">
                                                                <div className="font-bold">Reason: {tx.deleteReason}</div>
                                                                <div className="opacity-70 text-[10px]">By: {tx.deletedBy}</div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{formatMoney(tx.amount)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {tx.isDuplicate || tx.source === 'Conflict' ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-tighter">
                                                                ⚠️ Conflict
                                                            </span>
                                                        ) : (() => {
                                                            const isLinked = payments.some(p => p.reference === tx.reference && p.studentId !== 0);
                                                            return (
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-tighter
                                                                    ${isLinked ? 'bg-blue-100 text-blue-700 border-blue-200' : tx.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                                    {isLinked ? 'Linked' : tx.status === 'approved' ? 'Synced' : 'Pending'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {viewTxs.filter === 'trash' ? (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Archived</span>
                                                        ) : viewTxs.filter === 'unsynced' && (
                                                            <div className="flex justify-end gap-2">
                                                                {tx.isDuplicate || tx.source === 'Conflict' ? (
                                                                    <button
                                                                        onClick={() => handleReplaceManualPayment(tx)}
                                                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded shadow-lg shadow-rose-200 uppercase tracking-wider transition-all"
                                                                    >
                                                                        Replace Manual
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleLinkStudentTrigger(tx)}
                                                                        disabled={isSyncing || payments.some(p => p.reference === tx.reference && p.studentId !== 0)}
                                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded shadow-lg shadow-slate-200 flex items-center gap-1 uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        <span>{payments.some(p => p.reference === tx.reference && p.studentId !== 0) ? 'Linked' : 'Link Student'}</span>
                                                                        {tx.possiblePayCode && <span className="bg-white/20 px-1 rounded text-[8px]">AUTO</span>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {viewTxs.filter === 'all' && (
                                                            <button onClick={() => handlePrintReceipt(tx)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors shadow-sm" title="Print Receipt">🖨️</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        {viewTxs.transactions.length === 0 && (
                                            <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic font-medium">No transactions found for this view.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* FOOTER */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> System Secure</span>
                                    {viewTxs.filter === 'unsynced' && <span className="text-rose-500">Requires Action</span>}
                                </div>
                                <div className="text-slate-900 text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    Total: {formatMoney(viewTxs.transactions.reduce((s, t) => s + t.amount, 0))}
                                </div>
                            </div>
                        </div>

                        {/* LINK CONFIRMATION MINI-MODAL */}
                        {linkConfirm.open && (
                            <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up border border-slate-200">
                                    <div className="p-8 text-center">
                                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-900 mb-2">Link Student</h4>
                                        <p className="text-slate-500 text-sm mb-6">Confirm and assign this payment.</p>

                                        {linkConfirm.student ? (
                                            <div className="space-y-6">
                                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                                    <p className="text-[10px] text-slate-400 uppercase font-black mb-2 tracking-widest">Target Account</p>
                                                    <p className="text-xl font-black text-slate-900 leading-tight">{linkConfirm.student.name}</p>
                                                    <p className="text-xs text-blue-600 font-bold font-mono mt-1 bg-blue-50 px-2 py-0.5 rounded inline-block">{linkConfirm.student.payCode}</p>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => handleManualSync(linkConfirm.tx)}
                                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        Confirm & Link {formatMoney(linkConfirm.tx.amount)}
                                                    </button>
                                                    <button
                                                        onClick={() => setLinkConfirm({ open: false, tx: null, student: null })}
                                                        className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
                                                    <p className="text-xs text-rose-600 font-black uppercase mb-1">Student Not Found</p>
                                                    <p className="text-sm text-slate-600">The pay code <span className="font-mono font-bold text-rose-700">"{linkConfirm.tx.possiblePayCode || linkConfirm.tx.metadata?.payCode}"</span> is not recognized.</p>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const code = prompt("Enter Student Pay Code manually:");
                                                            if (code) {
                                                                const s = students.find(st => st.payCode === code);
                                                                if (s) setLinkConfirm(prev => ({ ...prev, student: s }));
                                                                else alert("Student not found.");
                                                            }
                                                        }}
                                                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-200"
                                                    >
                                                        Enter Code Manually
                                                    </button>
                                                    <button
                                                        onClick={() => setLinkConfirm({ open: false, tx: null, student: null })}
                                                        className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                                                    >
                                                        Discard
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Code (Merchant ID)</label>
                                    <input type="text" className="premium-input w-full" value={configForm.merchantId} onChange={e => setConfigForm({ ...configForm, merchantId: e.target.value })} placeholder="e.g. 123456" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Security Password (API KEY)</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            className="premium-input w-full pr-10"
                                            value={configForm.apiKey}
                                            onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                                            placeholder="Paste from Authentication tab"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                        >
                                            {showApiKey ? '👁️' : '🔒'}
                                        </button>
                                    </div>
                                </div>

                                {/* WEBHOOK INFO */}
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span className="text-sm font-bold text-blue-800">Real-time Webhook</span>
                                    </div>
                                    <p className="text-[10px] text-blue-600 mb-2 leading-relaxed">
                                        To enable real-time notifications, copy this URL to your SchoolPay dashboard under <b>Webhooks</b>:
                                    </p>
                                    <div className="bg-white border border-blue-200 rounded p-2 font-mono text-[9px] text-slate-700 flex justify-between items-center select-all">
                                        <span>{origin}/api/webhooks/schoolpay</span>
                                        <button className="text-blue-500 hover:text-blue-700 uppercase font-bold text-[8px]" onClick={() => { navigator.clipboard.writeText(`${origin}/api/webhooks/schoolpay`); alert('Webhook URL Copied!'); }}>Copy</button>
                                    </div>
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

            {/* NEW: SYNC RANGE MODAL */}
            {
                syncRangeModal.open && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Sync Transactions
                                </h3>
                                <button onClick={() => setSyncRangeModal({ open: false, integration: null })} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div className="text-xs text-amber-900 leading-relaxed">
                                        Select the date range to check for payments. SchoolPay allows a maximum range of <b>31 days</b> per sync.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">From Date</label>
                                        <input
                                            type="date"
                                            className="premium-input w-full"
                                            value={syncDates.from}
                                            onChange={e => setSyncDates({ ...syncDates, from: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">To Date (Today)</label>
                                        <input
                                            type="date"
                                            className="premium-input w-full"
                                            value={syncDates.to}
                                            onChange={e => setSyncDates({ ...syncDates, to: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase">What this will do:</h4>
                                    <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                                        <li>Connect to SchoolPay API using your secure hash.</li>
                                        <li>Fetch all regular tuition and supplementary fee payments.</li>
                                        <li>Automatically match payments to students using Pay Codes.</li>
                                        <li>Prevent duplicates by checking receipt numbers.</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setSyncRangeModal({ open: false, integration: null })} className="btn btn-ghost text-slate-500">Cancel</button>
                                <button
                                    onClick={processSyncRange}
                                    disabled={syncingInteg !== null}
                                    className={`btn bg-blue-600 hover:bg-blue-700 text-white border-none min-w-[120px] ${syncingInteg ? 'loading' : ''}`}
                                >
                                    {syncingInteg ? 'Syncing...' : 'Start Full Sync'}
                                </button>
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
        </div>
    );
}
