
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

    const handleSubmit = () => {
        if (!form.amount) return alert("Enter amount");
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

        const payload: Payment = {
            id: existingPayment ? existingPayment.id : 'pay_' + Date.now(),
            studentId: student.id,
            amount: Number(form.amount),
            date: form.date,
            method: form.type as any, // Cast to match store type
            reference: form.transactionId || (existingPayment?.reference || 'Self'),
            receiptNumber: existingPayment ? existingPayment.receiptNumber : 'RCP-' + Math.floor(Math.random() * 100000),
            recordedBy: 'Bursar',
            allocations: form.distributions,
            description: (form.particulars.includes('Brought Forward') && (!form.description || form.description === 'Fee Payment'))
                ? "Arrears Clearance / Debt Settlement"
                : (form.description || "Fee Payment"),
            history: existingPayment ? [...(existingPayment.history || []), {
                id: 'log_' + Date.now(),
                action: 'Update',
                details: 'Payment details updated via modal',
                user: 'Bursar', // Should be dynamic in real app
                timestamp: new Date().toISOString()
            }] : [],
            term: existingPayment?.term || term, // Use prop term for new payments
            attachments: form.photo ? [form.photo] : [] // Attach Photo
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
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-[#111] text-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-[#333] animate-scale-up relative" style={{ maxHeight: '90vh' }}>

                    {/* LEFT COL - SUMMARY */}
                    <div className="md:w-1/3 bg-[#0a0a0a] p-6 border-r border-[#222] flex flex-col justify-between hidden md:flex">
                        <div>
                            <div className="bg-[#222] w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-4 border border-[#333]">
                                {student.name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-200 mb-1">{student.name}</h2>
                            <p className="text-sm text-gray-500 font-mono">ID: {student.id} | {student.level}</p>

                            <div className="mt-8 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transaction History</h4>
                                    <div className="space-y-2">
                                        {(payments || []).filter(p => p.studentId === student.id).slice(0, 3).map(p => (
                                            <div key={p.id} className="text-xs p-2 rounded bg-[#1a1a1a] border border-[#333] flex justify-between">
                                                <span className="text-gray-400">{new Date(p.date).toLocaleDateString()}</span>
                                                <span className="font-mono text-green-500">+{p.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {(!payments || payments.filter(p => p.studentId === student.id).length === 0) && <p className="text-xs text-gray-600 italic">No history yet.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL - FORM */}
                    <div className="md:w-2/3 p-6 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                    {existingPayment ? 'Edit Transaction' : 'Add Transaction'}
                                </h2>
                                {isExternalIntegration && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-900/50 text-blue-200 border border-blue-800">
                                        System Integration
                                    </span>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[#333] transition-colors">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Amount (UGX) <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Amount (UGX)"
                                    value={form.amount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(prev => {
                                            const newDists = { ...prev.distributions };
                                            if (prev.particulars.length === 1) {
                                                newDists[prev.particulars[0]] = Number(val);
                                            }
                                            return { ...prev, amount: val, distributions: newDists };
                                        });
                                    }}
                                    disabled={isBalanceFix || !!isExternalIntegration}
                                    style={{ width: '100%', color: 'white', background: (isBalanceFix || isExternalIntegration) ? '#333' : '#222', border: '1px solid #444', opacity: (isBalanceFix || isExternalIntegration) ? 0.5 : 1 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    {(paymentCategory === 'bank' || paymentCategory === 'digital_fallback') ? 'Transaction ID' : 'Reference'}
                                    {(paymentCategory === 'bank' || paymentCategory === 'digital_fallback') && <span style={{ color: 'red' }}> *</span>}
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder={(paymentCategory === 'bank' || paymentCategory === 'digital_fallback') ? "e.g. TXN-12345678" : "Optional"}
                                    value={form.transactionId}
                                    onChange={e => setForm({ ...form, transactionId: e.target.value })}
                                    disabled={isBalanceFix || !!isExternalIntegration}
                                    style={{ width: '100%', color: 'white', background: (isBalanceFix || isExternalIntegration) ? '#333' : '#222', border: '1px solid #444', opacity: (isBalanceFix || isExternalIntegration) ? 0.5 : 1 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Date <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="date"
                                    className="input"
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    disabled={isBalanceFix || !!isExternalIntegration}
                                    style={{ width: '100%', color: 'white', background: (isBalanceFix || isExternalIntegration) ? '#333' : '#222', border: '1px solid #444', opacity: (isBalanceFix || isExternalIntegration) ? 0.5 : 1 }}
                                />
                            </div>

                            {/* PARTICULARS SELECTOR */}
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Particulars <span style={{ color: 'red' }}>*</span></label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#222', padding: '0.5rem', borderRadius: '8px', border: '1px solid #444', marginBottom: '0.5rem', opacity: isBalanceFix ? 0.8 : 1 }}>
                                    {['Brought Forward', 'Tuition Fees', ...services.map(s => s.name), ...(financialSettings?.compulsoryFees?.map(f => f.name) || [])].map(p => (
                                        <div key={p} onClick={() => toggleParticular(p)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', background: form.particulars.includes(p) ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: 'white' }}>
                                            {p}
                                        </div>
                                    ))}
                                </div>

                                {/* ALLOCATE FUNDS */}
                                {form.particulars.length > 0 && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                            <span>Allocate Funds</span>
                                            <span>
                                                Sum: <span style={{ color: (form.particulars.reduce((sum, p) => sum + (form.distributions[p] || 0), 0) === Number(form.amount)) ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                                    UGX {Object.values(form.distributions).reduce((a, b) => a + Number(b), 0).toLocaleString()}
                                                </span>
                                            </span>
                                        </div>
                                        {form.particulars.map(p => (
                                            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.8, width: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p}</span>
                                                <input type="number" placeholder="0" value={form.distributions[p] || ''} onChange={e => handleDistributionChange(p, Number(e.target.value))} onWheel={(e) => (e.target as HTMLInputElement).blur()} style={{ flex: 1, background: '#111', border: '1px solid #444', color: 'white', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Payment Category <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    className="input"
                                    value={paymentCategory}
                                    onChange={e => {
                                        const newCat = e.target.value as any;
                                        setPaymentCategory(newCat);
                                        // Reset type to first option of new category
                                        const uOptions = newCat === 'cash' ? manualPaymentMethods.filter(m => m.category === 'cash' && m.status === 'active').map(m => m.name)
                                            : newCat === 'bank' ? accounts.filter(a => a.group === 'Bank Accounts').map(a => a.name)
                                                : manualPaymentMethods.filter(m => m.category === 'digital_fallback' && m.status === 'active').map(m => m.name);

                                        setForm(f => ({ ...f, type: uOptions[0] || '' }));
                                    }}
                                    disabled={!!existingPayment || isBalanceFix || !!isExternalIntegration}
                                    style={{ width: '100%', color: 'white', background: (!!existingPayment || isBalanceFix || isExternalIntegration) ? '#333' : '#222', border: '1px solid #444', opacity: (!!existingPayment || isBalanceFix || isExternalIntegration) ? 0.5 : 1, marginBottom: '0.75rem' }}
                                >
                                    <option value="cash">Cash Collection</option>
                                    <option value="bank">Bank Accounts</option>
                                    <option value="digital_fallback">Manual Digital (Fallback)</option>
                                    {/* Only show Digital Integration if it was already set (System-only) */}
                                    {paymentCategory === 'digital_integration' && <option value="digital_integration">Digital Integration</option>}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Specific Method <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    className="input"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    disabled={!!existingPayment || isBalanceFix || !!isExternalIntegration}
                                    style={{ width: '100%', color: 'white', background: (!!existingPayment || isBalanceFix || isExternalIntegration) ? '#333' : '#222', border: '1px solid #444', opacity: (!!existingPayment || isBalanceFix || isExternalIntegration) ? 0.5 : 1 }}
                                >
                                    {paymentCategory === 'digital_integration' ? (
                                        <>
                                            <option value="SchoolPay">SchoolPay</option>
                                            <option value="PegPay">PegPay</option>
                                        </>
                                    ) : (
                                        <>
                                            {getOptions().map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                            {getOptions().length === 0 && <option value="" disabled>No methods defined</option>}
                                        </>
                                    )}
                                </select>
                            </div>



                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Additional Details</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Optional notes"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    disabled={isBalanceFix}
                                    style={{ width: '100%', color: 'white', background: isBalanceFix ? '#333' : '#222', border: '1px solid #444', opacity: isBalanceFix ? 0.5 : 1 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    Photo / Proof
                                    {(form.type === 'manual' && form.subMode !== 'Manual Digital') && <span style={{ color: 'red' }}> *</span>}
                                </label>
                                <input type="file" className="input" accept="image/*" onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            if (ev.target?.result) setForm({ ...form, photo: ev.target.result as string });
                                        };
                                        reader.readAsDataURL(e.target.files[0]);
                                    }
                                }} style={{ width: '100%', color: 'white', background: '#222', border: '1px solid #444' }} />

                                {/* PREVIEW SECTION */}
                                {form.photo ? (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                            {existingPayment && form.photo === existingPayment.attachments?.[0] ? 'Current Attachment' : 'New Selection Preview'}
                                        </div>
                                        <div style={{ border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', background: '#000' }}>
                                            <img src={form.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '200px' }} />
                                        </div>
                                    </div>
                                ) : (
                                    existingPayment && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed #444', borderRadius: '8px', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
                                            No attachment found for this transaction.
                                        </div>
                                    )
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-primary" onClick={handleSubmit} style={{ flex: 1 }}>{existingPayment ? 'Save Changes' : 'Confirm Payment'}</button>
                                <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </div>
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
