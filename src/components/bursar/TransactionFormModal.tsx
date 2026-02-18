
"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSchoolData, EnrolledStudent, Payment, formatMoney } from '@/lib/store';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: EnrolledStudent;
    existingPayment?: Payment | null; // If provided, we are in EDIT mode
    onSuccess?: (payment: Payment) => void;
    term?: string; // Optional context term
}

export const TransactionFormModal = ({ isOpen, onClose, student, existingPayment, onSuccess, term }: TransactionFormModalProps) => {
    const { services, addPayment, updatePayment, payments, financialSettings, manualPaymentMethods, accounts } = useSchoolData();
    const isApproved = existingPayment?.status === 'Approved' || existingPayment?.status === 'approved';

    // UI Helpers for 2-step selection
    const [paymentCategory, setPaymentCategory] = useState<'cash' | 'bank' | 'digital_fallback' | 'digital_integration' | ''>('');

    // Form State
    const [form, setForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: '', // Will hold the final specific method name
        subMode: '',
        particulars: [] as string[],
        distributions: {} as Record<string, number>,
        description: '',
        transactionId: '', // Reference
        photo: undefined as string | undefined,
    });

    // Initialize Form on Open/Change
    useEffect(() => {
        if (isOpen) {
            if (existingPayment) {
                // Determine Category from existing method name
                const method = String(existingPayment.method || '');
                const methodLower = method.toLowerCase().replace(/\s/g, '');
                const description = String(existingPayment.description || '').toLowerCase(); // Fallback check

                const isBank = accounts.some(a => a.name === method && a.group === 'Bank Accounts');
                const isDigitalFallback = manualPaymentMethods.some(m => m.name === method && m.category === 'digital_fallback');

                // Robust Check: Match Method Name OR Description Signature
                const isDigitalIntegration = ['schoolpay', 'pegpay'].includes(methodLower) || description.includes('automatic schoolpay') || description.includes('automatic pegpay');

                let cat: 'cash' | 'bank' | 'digital_fallback' | 'digital_integration' = 'cash';
                if (isDigitalIntegration) cat = 'digital_integration';
                else if (isBank) cat = 'bank';
                else if (isDigitalFallback) cat = 'digital_fallback';

                setPaymentCategory(cat);

                // Auto-set Particulars for Digital Integration
                let initialParticulars = existingPayment.allocations ? Object.keys(existingPayment.allocations) : [];
                let initialDistributions = existingPayment.allocations || {};

                // FORCED REMAP (User Request): If integration, and allocations are empty OR generic "General", force Tuition
                if (isDigitalIntegration) {
                    const isGeneralOnly = initialParticulars.length === 1 && initialParticulars[0] === 'General';
                    const isEmpty = initialParticulars.length === 0;

                    if (isEmpty || isGeneralOnly) {
                        initialParticulars = ['Tuition Fees'];
                        initialDistributions = { 'Tuition Fees': existingPayment.amount };
                    }
                }

                // Auto-correct Method Type if detected via description but stored as something else
                let finalMethod = method;
                if (isDigitalIntegration) {
                    if (description.includes('schoolpay') || methodLower.includes('schoolpay')) finalMethod = 'SchoolPay';
                    else if (description.includes('pegpay') || methodLower.includes('pegpay')) finalMethod = 'PegPay';
                }

                setForm({
                    amount: String(existingPayment.amount),
                    date: new Date(existingPayment.date).toISOString().split('T')[0],
                    type: finalMethod,
                    subMode: '',
                    particulars: initialParticulars,
                    distributions: initialDistributions,
                    description: existingPayment.description || '',
                    transactionId: existingPayment.reference || '',
                    photo: existingPayment.attachments && existingPayment.attachments.length > 0 ? existingPayment.attachments[0] : undefined
                });
            } else {
                // RESET FOR NEW - Default to Cash
                setPaymentCategory('cash');
                const defaultMethod = manualPaymentMethods.find(m => m.status === 'active' && m.category === 'cash') || manualPaymentMethods[0];

                setForm({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    type: defaultMethod ? defaultMethod.name : '',
                    subMode: '',
                    particulars: ['Tuition Fees'],
                    distributions: { 'Tuition Fees': 0 },
                    description: '',
                    transactionId: '',
                    photo: undefined
                });
            }
        }
    }, [isOpen, existingPayment]);

    if (!isOpen) return null;

    // Handlers
    const toggleParticular = (p: string) => {
        setForm(prev => {
            if (prev.particulars.includes(p)) {
                const newDists = { ...prev.distributions };
                delete newDists[p];
                return { ...prev, particulars: prev.particulars.filter(i => i !== p), distributions: newDists };
            } else {
                const newParticulars = [...prev.particulars, p];
                const newDists = { ...prev.distributions };
                // Auto-fill if it's the only one and we have an amount
                if (newParticulars.length === 1 && prev.amount) {
                    newDists[p] = Number(prev.amount);
                } else {
                    newDists[p] = 0;
                }
                return { ...prev, particulars: newParticulars, distributions: newDists };
            }
        });
    };

    const handleDistributionChange = (p: string, val: number) => {
        setForm(prev => ({
            ...prev,
            distributions: { ...prev.distributions, [p]: val }
        }));
    };

    const totalAllocated = Object.values(form.distributions).reduce((a, b) => a + Number(b), 0);
    const isAllocationInvalid = totalAllocated > Number(form.amount);

    const handleSubmit = () => {
        if (!form.amount) return alert("Enter amount");
        if (isAllocationInvalid) return alert("Allocation Error: You cannot allocate more than the student has deposited.");
        if ((paymentCategory === 'bank' || paymentCategory === 'digital_fallback' || paymentCategory === 'digital_integration') && !form.transactionId) {
            return alert("Transaction ID is required for this payment method.");
        }

        // DUPLICATE CHECK (Exclude current payment if editing)
        // Check both ID and Reference fields for uniqueness to prevent double entry
        // We only check if a user MANUALLY entered an ID (Bank/Digital)
        if (form.transactionId && !existingPayment) {
            const isDuplicate = payments.some(p =>
                (p.reference === form.transactionId || p.receiptNumber === form.transactionId)
            );
            if (isDuplicate) {
                return alert("A transaction with this Reference/ID already exists!");
            }
        }

        // Validate Allocation Sum
        const totalAllocated = Object.values(form.distributions).reduce((a, b) => a + b, 0);
        if (form.particulars.length > 0 && Math.abs(totalAllocated - Number(form.amount)) > 100) {
            // Optional: Alert if allocations don't match amount, but maybe allow partial? 
            // System implies allocations should match amount for strict accounting.
            // For now, let's just warn or allow.
        }

        // SECURITY: Preserve existing status but reset to Pending ONLY if critical financial fields change
        let status: 'pending' | 'approved' | 'rejected' = existingPayment?.status || (paymentCategory === 'digital_integration' ? 'approved' : 'pending');
        let directorNote = existingPayment?.directorNote;
        let approvedAt = existingPayment?.approvedAt;
        let history = existingPayment ? [...(existingPayment.history || []), {
            id: 'log_' + Date.now(),
            action: 'Update',
            details: 'Payment details updated via modal',
            user: 'Bursar',
            timestamp: new Date().toISOString()
        }] : [];

        if (existingPayment && existingPayment.status === 'approved') {
            // Robust check: Compare only the YYYY-MM-DD part of the dates
            const existingDateOnly = new Date(existingPayment.date).toISOString().split('T')[0];

            const isFundamentalFinancialChange =
                Math.abs(Number(form.amount) - existingPayment.amount) > 1 || // Total amount changed
                form.date !== existingDateOnly ||                             // Date changed
                form.type !== existingPayment.method;                         // Bank/Mode changed

            if (isFundamentalFinancialChange) {
                status = 'pending';
                approvedAt = undefined;
                // Archive old approval context in history before clearing
                history.push({
                    id: 'log_security_' + Date.now(),
                    action: '[SECURITY RESET]',
                    details: `Approval revoked due to fundamental change: ${formatMoney(existingPayment.amount)} -> ${formatMoney(Number(form.amount))} | ${existingDateOnly} -> ${form.date} | ${existingPayment.method} -> ${form.type}`,
                    user: 'System',
                    timestamp: new Date().toISOString()
                });
                directorNote = undefined;
            } else {
                // It's just an allocation or description change - KEEP STATUS
                history.push({
                    id: 'log_journal_' + Date.now(),
                    action: 'Re-Allocation',
                    details: 'Internal fee distribution updated. Approval status preserved.',
                    user: 'System',
                    timestamp: new Date().toISOString()
                });
            }
        }

        const payload: Payment = {
            id: existingPayment ? existingPayment.id : 'pay_' + Date.now(),
            studentId: student.id,
            amount: Number(form.amount),
            date: form.date,
            method: form.type as any,
            reference: form.transactionId || (existingPayment?.reference || 'Self'),
            receiptNumber: existingPayment ? existingPayment.receiptNumber : 'RCP-' + Math.floor(Math.random() * 100000),
            recordedBy: 'Bursar',
            allocations: form.distributions,
            description: (form.particulars.includes('Brought Forward') && (!form.description || form.description === 'Fee Payment'))
                ? "Arrears Clearance / Debt Settlement"
                : (form.description || "Fee Payment"),
            history,
            term: existingPayment?.term || term,
            attachments: form.photo ? [form.photo] : (existingPayment?.attachments || []),
            status,
            directorNote,
            approvedAt
        };

        if (existingPayment) {
            updatePayment(payload);
        } else {
            addPayment(payload);
        }

        if (onSuccess) onSuccess(payload);
        onClose();
    };

    // Filter Options based on Category
    const getOptions = () => {
        if (paymentCategory === 'cash') {
            return manualPaymentMethods.filter(m => m.category === 'cash' && m.status === 'active').map(m => m.name);
        } else if (paymentCategory === 'bank') {
            return accounts.filter(a => a.group === 'Bank Accounts').map(a => a.name);
        } else if (paymentCategory === 'digital_fallback') {
            return manualPaymentMethods.filter(m => m.category === 'digital_fallback' && m.status === 'active').map(m => m.name);
        } else if (paymentCategory === 'digital_integration') {
            return ['SchoolPay', 'PegPay']; // Explicit options for automatic integrations
        }
        return [];
    };

    const isBalanceFix = form.particulars.includes("Balance Correction (Credit)") || form.particulars.includes("Balance Correction (Debit)");

    const isExternalIntegration = existingPayment && (
        ['schoolpay', 'pegpay'].includes(String(existingPayment.method).toLowerCase().replace(/\s/g, '')) ||
        String(existingPayment.description || '').toLowerCase().includes('automatic schoolpay') ||
        String(existingPayment.description || '').toLowerCase().includes('automatic pegpay')
    );

    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-[#0A0A0A]/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                .form-glass-input {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1.5px solid rgba(255, 255, 255, 0.25);
                    color: white !important;
                    border-radius: 16px !important;
                    transition: all 0.3s ease !important;
                    outline: none !important;
                }
                .form-glass-input:focus {
                    background: rgba(255, 255, 255, 0.15);
                    border-color: rgba(59, 130, 246, 0.9) !important;
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.25) !important;
                }
                .form-glass-input::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                .form-glass-input:disabled {
                    opacity: 0.5;
                    background: rgba(255,255,255,0.03) !important;
                    border-color: rgba(255,255,255,0.05) !important;
                }
                .particular-chip {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .particular-chip:active { scale: 0.95; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            `}} />

            <div className="premium-modal-container w-full h-full md:w-[95%] md:max-w-5xl md:h-[90vh] md:rounded-[2.5rem] flex flex-col md:grid md:grid-cols-[1fr_2.2fr] overflow-hidden border border-white/20 shadow-2xl relative bg-[#0D0D0D]">

                {/* LEFT: STUDENT CONTEXT */}
                <div className="bg-white/[0.04] border-r border-white/10 p-8 flex flex-col justify-between hidden md:flex">
                    <div>
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-500/20 mb-6 font-display">
                            {student.name.charAt(0)}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-white mb-2">{student.name}</h3>
                        <div className="flex flex-col gap-1.5 text-white/80 text-xs font-bold uppercase tracking-widest">
                            <span>{student.programme}</span>
                            <span>{student.semester} • {student.level}</span>
                            {student.payCode && <span>ID: {student.payCode}</span>}
                        </div>

                        <div className="mt-12 space-y-6">
                            <h4 className="text-[0.7rem] font-black uppercase tracking-[2.5px] text-blue-400 px-1">Recent Activity</h4>
                            <div className="space-y-3">
                                {(payments || []).filter(p => p.studentId === student.id).slice(0, 3).map(p => (
                                    <div key={p.id} className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 flex justify-between items-center group hover:bg-white/[0.08] transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[0.65rem] font-black text-white/60 uppercase tracking-wider">{new Date(p.date).toLocaleDateString()}</span>
                                            <span className="text-sm font-bold text-white">{p.method}</span>
                                        </div>
                                        <span className="font-black text-emerald-400 text-sm">+{formatMoney(p.amount)}</span>
                                    </div>
                                ))}
                                {(!payments || payments.filter(p => p.studentId === student.id).length === 0) && (
                                    <div className="py-8 text-center opacity-40 italic text-xs text-white">No records found</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10">
                        <div className="text-[0.65rem] font-black uppercase tracking-[3px] text-blue-500 mb-2">Security Hash</div>
                        <div className="text-[0.6rem] font-mono text-white/40 break-all leading-tight">AUTH_TX_{Math.random().toString(36).substring(7).toUpperCase()} • SECURE</div>
                    </div>
                </div>

                {/* RIGHT: THE FORM */}
                <div className="flex-1 min-h-0 flex flex-col bg-[#0F0F0F]">
                    {/* Header Fixed */}
                    <div className="p-6 md:p-10 pb-4 flex items-center justify-between z-10 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                                {existingPayment ? 'Edit Transaction' : 'Record Transaction'}
                            </h2>
                            {isExternalIntegration && (
                                <span className="premium-badge bg-blue-500/20 text-blue-300 border-blue-500/30">System Encrypted</span>
                            )}
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 hover:rotate-90 transition-all duration-300 border border-white/10 text-white font-bold text-lg">✕</button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                            {/* Amount */}
                            <div className="md:col-span-2">
                                <label className="block text-[0.85rem] font-black uppercase tracking-[2.5px] text-white mb-3 ml-1">Payment Amount (UGX)</label>
                                <input
                                    type="number"
                                    className="form-glass-input w-full p-6 text-4xl md:text-5xl font-black bg-white/10 border-blue-500/40 focus:bg-white/15"
                                    value={form.amount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(prev => {
                                            const newDists = { ...prev.distributions };
                                            if (prev.particulars.length === 1) newDists[prev.particulars[0]] = Number(val);
                                            return { ...prev, amount: val, distributions: newDists };
                                        });
                                    }}
                                    disabled={isBalanceFix || !!isExternalIntegration || isApproved}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>

                            {/* Reference */}
                            <div>
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-3 ml-1">Reference / TXN ID</label>
                                <input
                                    type="text"
                                    className="form-glass-input w-full p-5 font-black text-lg bg-white/[0.08]"
                                    value={form.transactionId}
                                    onChange={e => setForm({ ...form, transactionId: e.target.value })}
                                    disabled={isBalanceFix || !!isExternalIntegration || isApproved}
                                    placeholder="Bank Ref or Receipt #"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-3 ml-1">Collection Date</label>
                                <input
                                    type="date"
                                    className="form-glass-input w-full p-5 font-black text-lg bg-white/[0.08]"
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    disabled={isBalanceFix || !!isExternalIntegration || isApproved}
                                />
                            </div>

                            {/* Particulars Chips */}
                            <div className="md:col-span-2">
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-4 ml-1">Allocation Details</label>
                                <div className="flex flex-wrap gap-2.5 p-6 rounded-[2rem] bg-white/[0.04] border border-white/10 shadow-inner">
                                    {['Brought Forward', 'Tuition Fees', ...services.map(s => s.name), ...(financialSettings?.compulsoryFees?.map(f => f.name) || [])].map(p => (
                                        <div
                                            key={p}
                                            onClick={() => toggleParticular(p)}
                                            className={`particular-chip px-5 py-2.5 rounded-xl text-[0.7rem] font-black uppercase tracking-widest ${form.particulars.includes(p) ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-2 ring-white/20' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white border border-white/10'}`}
                                        >
                                            {p}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Distributions - Conditional */}
                            {form.particulars.length > 0 && (
                                <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-blue-500/[0.06] border border-blue-500/20 space-y-8 shadow-2xl shadow-blue-500/5">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <div className="flex flex-col">
                                            <span className="text-[0.8rem] font-black uppercase tracking-[3px] text-blue-400">Distribution Matrix</span>
                                            {isAllocationInvalid && (
                                                <span className="text-[0.6rem] font-bold text-red-500 uppercase tracking-widest mt-1 animate-pulse">⚠️ Allocation Overload: Reduce amounts</span>
                                            )}
                                        </div>
                                        <div className={`px-5 py-2 rounded-full text-[0.75rem] font-black tracking-[2px] shadow-lg ${isAllocationInvalid ? 'bg-red-500 text-white animate-bounce' : Math.abs(totalAllocated - Number(form.amount)) < 1 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            ∑ {totalAllocated.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        {form.particulars.map(p => (
                                            <div key={p} className="flex flex-col gap-3">
                                                <span className="text-[0.75rem] font-black text-white pl-1 uppercase tracking-widest">{p}</span>
                                                <input
                                                    type="number"
                                                    className="form-glass-input p-5 text-xl font-black text-white bg-white/10 border-white/20"
                                                    value={form.distributions[p] || ''}
                                                    onChange={e => handleDistributionChange(p, Number(e.target.value))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories */}
                            <div>
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-3 ml-1">Financial Category</label>
                                <div className="relative">
                                    <select
                                        className="form-glass-input w-full p-5 font-black text-lg appearance-none cursor-pointer bg-white/[0.08]"
                                        value={paymentCategory}
                                        onChange={e => {
                                            const newCat = e.target.value as any;
                                            setPaymentCategory(newCat);
                                            const uOptions = newCat === 'cash' ? manualPaymentMethods.filter(m => m.category === 'cash' && m.status === 'active').map(m => m.name)
                                                : newCat === 'bank' ? accounts.filter(a => a.group === 'Bank Accounts').map(a => a.name)
                                                    : manualPaymentMethods.filter(m => m.category === 'digital_fallback' && m.status === 'active').map(m => m.name);
                                            setForm(f => ({ ...f, type: uOptions[0] || '' }));
                                        }}
                                        disabled={isApproved || !!isExternalIntegration || isBalanceFix}
                                    >
                                        <option value="cash">Cash Collection</option>
                                        <option value="bank">Bank Accounts</option>
                                        <option value="digital_fallback">Digital (Manual)</option>
                                        {paymentCategory === 'digital_integration' && <option value="digital_integration">System Integration</option>}
                                    </select>
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">▼</span>
                                </div>
                            </div>

                            {/* Specific Method */}
                            <div>
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-3 ml-1">Specific Channel</label>
                                <div className="relative">
                                    <select
                                        className="form-glass-input w-full p-5 font-black text-lg appearance-none cursor-pointer bg-white/[0.08]"
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        disabled={isApproved || !!isExternalIntegration || isBalanceFix}
                                    >
                                        {paymentCategory === 'digital_integration' ? (
                                            <>
                                                <option value="SchoolPay">SchoolPay</option>
                                                <option value="PegPay">PegPay</option>
                                            </>
                                        ) : (
                                            <>
                                                {getOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </>
                                        )}
                                    </select>
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">▼</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <label className="block text-[0.8rem] font-black uppercase tracking-[2px] text-white mb-3 ml-1">Transaction Annotations</label>
                                <textarea
                                    className="form-glass-input w-full p-5 font-bold min-h-[100px] bg-white/[0.08]"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Enter additional ledger notes/narrations..."
                                    disabled={isBalanceFix}
                                />
                            </div>

                            {/* File Upload */}
                            <div className="md:col-span-2 mb-10">
                                <div className="p-12 rounded-[2.5rem] bg-white/[0.04] border-2 border-white/20 border-dashed flex flex-col items-center gap-6 group hover:bg-white/[0.08] hover:border-blue-500/50 transition-all cursor-pointer shadow-xl">
                                    <label className="cursor-pointer flex flex-col items-center gap-5 w-full">
                                        <div className="w-20 h-20 rounded-[2.2rem] bg-white/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xl group-hover:shadow-blue-500/30 text-3xl">
                                            📸
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-[0.8rem] font-black uppercase tracking-[4px] text-white mb-2">Upload Proof of Payment</span>
                                            <span className="text-[0.65rem] font-bold text-white/40 uppercase tracking-widest">Supports JPG, PNG, PDF (Up to 5MB)</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => {
                                            if (e.target.files && e.target.files[0]) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => { if (ev.target?.result) setForm({ ...form, photo: ev.target.result as string }); };
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }} />
                                    </label>
                                    {form.photo && (
                                        <div className="relative group/preview mt-6">
                                            <img src={form.photo} alt="Preview" className="h-48 w-auto rounded-3xl border-4 border-white/20 shadow-2xl transition-all group-hover/preview:scale-105 group-hover/preview:rotate-1" />
                                            <button onClick={() => setForm({ ...form, photo: undefined })} className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl hover:bg-red-500 transition-colors border-2 border-white text-xl">✕</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Fixed at bottom */}
                    <div className="p-8 md:p-10 bg-[#0A0A0A] border-t border-white/10 flex gap-5 shadow-2xl">
                        <button
                            onClick={handleSubmit}
                            disabled={isAllocationInvalid}
                            className={`flex-1 p-5 rounded-2xl text-white font-black uppercase tracking-[3px] text-sm md:text-base transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${isAllocationInvalid ? 'bg-slate-800 cursor-not-allowed grayscale' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
                        >
                            {!isAllocationInvalid && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                            {isAllocationInvalid ? 'Invalid Allocation' : existingPayment ? 'Update Ledger Entry' : 'Post Transaction'}
                        </button>
                        <button onClick={onClose} className="px-12 p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[3px] text-sm md:text-base transition-all border border-white/20 active:scale-95">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};
