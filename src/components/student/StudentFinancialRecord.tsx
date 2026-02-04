"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData, EnrolledStudent, Payment, formatMoney, PhysicalRequirement } from '@/lib/store';
import { numberToWords } from '@/lib/numberToWords';

// --- COPIED COMPONENT: StatusRing ---
const StatusRing = ({ student, size = 60, percentage: propPercentage }: { student: EnrolledStudent, size?: number, percentage?: number }) => {
    const { financialSettings } = useSchoolData();

    // If propPercentage is provided, use it. Otherwise calculate locally.
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

    // Strict Color Logic
    const probationThreshold = financialSettings?.probationPct ?? 80;
    let color = '#ef4444'; // Red (Defaulter)

    if (percentage >= 100) color = '#10b981'; // Green (Cleared)
    else if (percentage >= probationThreshold) color = '#8b5cf6'; // Purple (Probation)

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

export const StudentFinancialRecord = ({ studentId }: { studentId: number }) => {
    const { students, services, programmes, payments, billings, bursaries, documentTemplates, schoolProfile, accounts, manualPaymentMethods } = useSchoolData();
    const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    // --- STATES ---
    const [entryLevelFilter, setEntryLevelFilter] = useState<string>('Current');
    const [showReqHistory, setShowReqHistory] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        const s = students.find(st => st.id === studentId);
        if (s) {
            setSelectedStudent(s);
            setEntryLevelFilter('Current'); // Reset on open
        }
    }, [studentId, students]);

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

    // Map Transactions (Payments + Billings)
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
                status: p.status,
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

        // 2b. Inject Previous Balance as Billing
        const hasBFBill = studentBillings.some(b => b.particulars?.includes('Balance Brought Forward') || b.description?.includes('Balance Brought Forward'));

        if (!hasBFBill && startPrevBal && startPrevBal > 0) {
            studentBillings.push({
                id: 'prev-bal-' + selectedStudent.id + '-' + targetTerm,
                date: selectedStudent.enrollmentDate || '2020-01-01',
                amount: startPrevBal,
                type: 'Billed',
                studentName: selectedStudent.name,
                term: targetTerm,
                mode: 'Billed',
                particulars: 'Previous Term Balance',
                allocations: null,
                description: 'Balance brought forward',
                reference: 'B/F',
                isPseudo: true
            });
        }

        setTransactions([...studentPayments, ...studentBillings]);
    }, [selectedStudent, payments, billings, viewContext]);

    // --- FINANCIAL CALCULATIONS ---
    const outstandingBalance = useMemo(() => {
        if (!selectedStudent) return 0;
        const { targetTerm, startPrevBal, bursaryId, isCurrent } = viewContext;

        // 1. Gather Debits (Billings)
        const currentBillings = billings
            .filter(b => b.studentId === selectedStudent.id && b.term === targetTerm)
            .reduce((sum, b) => sum + b.amount, 0);

        // 2. Identify Previous Balance (Static Snapshot)
        // If there's a specific "Balance Brought Forward" bill, use that. Otherwise use startPrevBal.
        const hasBFBill = billings.some(b => b.studentId === selectedStudent.id && b.term === targetTerm && b.description.includes('Balance Brought Forward'));
        const previousBalance = hasBFBill ? 0 : (startPrevBal || 0);

        // 3. Gather Credits (Payments + Bursaries)
        const paymentsMade = payments
            .filter(p => p.studentId === selectedStudent.id && (p.term === targetTerm || (!p.term && isCurrent)))
            .reduce((sum, p) => sum + p.amount, 0);

        const bursaryValue = bursaryId && bursaryId !== 'none'
            ? (bursaries.find(b => b.id === bursaryId)?.value || 0)
            : 0;
        // Formula: (PrevBal + Billings) - (Payments + Bursary)
        return (previousBalance + currentBillings) - (paymentsMade + bursaryValue);
    }, [selectedStudent, billings, payments, bursaries, viewContext]);

    const totalBilling = useMemo(() => {
        if (!selectedStudent) return 0;
        const { targetTerm, bursaryId, startPrevBal } = viewContext;

        const currentBillings = billings
            .filter(b => b.studentId === selectedStudent.id && b.term === targetTerm)
            .reduce((sum, b) => sum + b.amount, 0);

        const hasBFBill = billings.some(b => b.studentId === selectedStudent.id && b.term === targetTerm && b.description.includes('Balance Brought Forward'));
        const previousBalance = hasBFBill ? 0 : (startPrevBal || 0);

        const bursaryValue = bursaryId && bursaryId !== 'none' ? (bursaries.find(b => b.id === bursaryId)?.value || 0) : 0;

        return (previousBalance + currentBillings) - bursaryValue;
    }, [selectedStudent, billings, bursaries, viewContext]);

    const clearancePercentage = useMemo(() => {
        if (!selectedStudent) return 0;
        const { targetTerm, bursaryId, startPrevBal, isCurrent } = viewContext;

        const tuitionBillings = billings.filter(b =>
            b.studentId === selectedStudent.id &&
            b.type === 'Tuition' &&
            b.term === targetTerm
        );
        const totalTuitionBilled = tuitionBillings.reduce((sum, b) => sum + b.amount, 0);

        const bursaryValue = bursaryId && bursaryId !== 'none'
            ? (bursaries.find(b => b.id === bursaryId)?.value || 0)
            : 0;

        const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && (p.term === targetTerm || (!p.term && isCurrent)));

        const totalTuitionPaid = studentPayments.reduce((acc, p) => {
            if (p.allocations) {
                const tuitionKey = Object.keys(p.allocations).find(k => k.toLowerCase().includes('tuition'));
                const tuitionPortion = tuitionKey ? (p.allocations[tuitionKey] || 0) : 0;
                return acc + tuitionPortion;
            } else {
                return acc + p.amount;
            }
        }, 0);

        const hasBFBill = billings.some(b => b.studentId === selectedStudent.id && b.term === targetTerm && b.description.includes('Balance Brought Forward'));
        const effectivePrev = hasBFBill ? 0 : (startPrevBal || 0);

        const denominator = totalTuitionBilled + effectivePrev - bursaryValue;

        if (denominator <= 0) return 100;

        const pct = (totalTuitionPaid / denominator) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [selectedStudent, billings, payments, bursaries, viewContext]);

    // printReceipt function removed per policy.

    if (!selectedStudent) return <div className="p-8 text-center text-gray-500">Student not found.</div>;

    return (
        <div className="financial-grid grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 w-full">

            {/* HEADER (Replicates Modal Header but simpler) */}
            <div style={{ gridColumn: '1 / -1', padding: '0 0 2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div title={`Tuition Clr: ${Math.round(clearancePercentage)}%`}>
                        <StatusRing student={selectedStudent} size={80} percentage={clearancePercentage} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>{selectedStudent.name}</h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.2rem' }}>
                            <p style={{ opacity: 0.4, margin: 0 }}>ID: {selectedStudent.payCode} | {selectedStudent.semester}</p>
                            <span style={{
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.6rem',
                                borderRadius: '20px',
                                background: selectedStudent.accountStatus === 'clearance' ? '#10b981' : selectedStudent.accountStatus === 'defaulter' ? '#ef4444' : '#8b5cf6',
                                color: 'white',
                                textTransform: 'uppercase'
                            }}>
                                {selectedStudent.accountStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEFT COLUMN */}
            <div>
                {/* TRANSACTIONS SECTION */}
                <section style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Transaction History</h3>
                            <select
                                value={entryLevelFilter}
                                onChange={e => setEntryLevelFilter(e.target.value)}
                                style={{ background: '#222', color: 'white', border: '1px solid #444', padding: '5px', borderRadius: 4, fontSize: '0.8rem' }}
                            >
                                <option value="Current">Current: {selectedStudent.semester}</option>
                                {selectedStudent.promotionHistory?.slice().reverse().map((h, i) => (
                                    <option key={i} value={h.fromSemester}>
                                        {h.fromSemester} (Hist)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', overflow: 'hidden' }}>

                        {/* DESKTOP TABLE VIEW */}
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }} className="hidden md:table">
                            <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <tr style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'white' }}>
                                    <th style={{ padding: '1rem' }}>Particulars</th>
                                    <th style={{ padding: '1rem' }}>Description</th>
                                    <th style={{ padding: '1rem' }}>Method</th>
                                    <th style={{ padding: '1rem' }}>Ref</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filteredTx = transactions
                                        .filter(t => {
                                            if (entryLevelFilter === 'Current') {
                                                return t.term === selectedStudent.semester || (!t.term && !selectedStudent.promotionHistory?.length);
                                            }
                                            return t.term === entryLevelFilter;
                                        })
                                        .sort((a, b) => {
                                            const timeA = new Date(a.date).getTime() || 0;
                                            const timeB = new Date(b.date).getTime() || 0;
                                            if (timeA !== timeB) return timeB - timeA;
                                            const aIsBill = a.type === 'Billed';
                                            const bIsBill = b.type === 'Billed';
                                            if (!aIsBill && bIsBill) return -1;
                                            if (aIsBill && !bIsBill) return 1;
                                            return String(b.id).localeCompare(String(a.id));
                                        });

                                    return filteredTx.map(tx => {
                                        const method = String(tx.type || tx.mode || '').trim();
                                        const methodLower = method.toLowerCase().replace(/\s/g, '');
                                        let badgeStyle = "bg-gray-500/10 text-gray-400 border-gray-500/20";
                                        const isBilled = ['billed', 'invoice', 'bill'].includes(methodLower);
                                        const isDigitalIntegration = ['schoolpay', 'pegpay'].includes(methodLower);
                                        const isBank = accounts.some(a => a.name.toLowerCase().replace(/\s/g, '') === methodLower && a.group === 'Bank Accounts');
                                        const isCash = manualPaymentMethods.some(m => m.name.toLowerCase().replace(/\s/g, '') === methodLower && m.category === 'cash') || methodLower === 'cash';

                                        if (isBilled) badgeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
                                        else if (isDigitalIntegration) badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                        else if (isBank) badgeStyle = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                        else if (isCash) badgeStyle = "bg-green-500/10 text-green-400 border-green-500/20";

                                        return (
                                            <tr key={tx.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '0.8rem', fontWeight: '500', maxWidth: '200px' }}>
                                                    {tx.particulars}
                                                    {tx.allocations && (
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '2px' }}>
                                                            {Object.entries(tx.allocations).map(([k, v]) => `${k}: ${Number(v).toLocaleString()}`).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.8rem', opacity: 0.8 }}>{tx.description}<div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(tx.date).toLocaleDateString()}</div></td>
                                                <td style={{ padding: '0.8rem' }}>
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                                        {method || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.8rem', fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.7 }}>{tx.reference || '-'}</td>
                                                <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '800', color: isBilled ? '#ef4444' : '#10b981' }}>
                                                    {isBilled ? '+' : '-'} UGX {Number(tx.amount).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                                                    {!isBilled && (
                                                        <span title="Official receipts are issued by the Bursar's office." style={{ cursor: 'help', fontSize: '1.2rem', opacity: 0.5 }}>🧾</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                                {transactions.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No transactions found.</td></tr>}
                            </tbody>
                        </table>

                        {/* MOBILE CARD VIEW */}
                        <div className="md:hidden space-y-4 p-4">
                            {(() => {
                                const filteredTx = transactions
                                    .filter(t => {
                                        if (entryLevelFilter === 'Current') {
                                            return t.term === selectedStudent?.semester || (!t.term && !selectedStudent?.promotionHistory?.length);
                                        }
                                        return t.term === entryLevelFilter;
                                    })
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                if (filteredTx.length === 0) return <div className="text-center p-8 text-gray-500 opacity-70">No transactions found.</div>;

                                return filteredTx.map(tx => {
                                    const method = String(tx.type || tx.mode || '').trim();
                                    const methodLower = method.toLowerCase().replace(/\s/g, '');
                                    let badgeStyle = "bg-gray-500/10 text-gray-400 border-gray-500/20";
                                    const isBilled = ['billed', 'invoice', 'bill'].includes(methodLower);
                                    if (isBilled) badgeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
                                    else if (['schoolpay', 'pegpay'].includes(methodLower)) badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                    else badgeStyle = "bg-green-500/10 text-green-400 border-green-500/20";

                                    return (
                                        <div key={tx.id} className="bg-[#181818] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                            {/* Left Stripe Indicator */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isBilled ? 'bg-red-500/50' : 'bg-green-500/50'}`} />

                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                <div className="text-xs text-gray-500 font-mono">{new Date(tx.date).toLocaleDateString()}</div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                                    {method || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="pl-2 mb-3">
                                                <div className="font-bold text-gray-200 text-sm">{tx.particulars}</div>
                                                <div className="text-xs text-gray-400 mt-1 line-clamp-1">{tx.description}</div>
                                                {tx.reference && <div className="text-[10px] text-gray-500 font-mono mt-1 opacity-70">Ref: {tx.reference}</div>}
                                            </div>

                                            <div className="pl-2 pt-2 border-t border-gray-800 flex justify-between items-end">
                                                <div className="text-xs text-gray-600">
                                                    {tx.allocations && Object.keys(tx.allocations).length > 0 && (
                                                        <span>{Object.keys(tx.allocations).length} items</span>
                                                    )}
                                                </div>
                                                <div className={`text-lg font-bold ${isBilled ? 'text-red-400' : 'text-green-400'}`}>
                                                    {isBilled ? '-' : '+'} {Number(tx.amount).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </section>

                {/* FEES STRUCTURE SECTION */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Fees Structure</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem' }}>
                        {(() => {
                            const prog = programmes.find(p => p.id === selectedStudent.programme) || programmes.find(p => p.name === selectedStudent.programme);
                            const norm = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                            const feeStruct = prog?.feeStructure?.find(fs => norm(fs.level) === norm(viewContext.targetTerm));

                            // Fallback if not found
                            if (!feeStruct) {
                                return (
                                    <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.7, fontStyle: 'italic' }}>
                                        Fee structure pending for {viewContext.targetTerm}.
                                    </div>
                                );
                            }

                            const tuitionFee = feeStruct?.tuitionFee || 0;
                            const bfBill = viewContext.isCurrent
                                ? billings.find(b => b.studentId === selectedStudent.id && b.term === viewContext.targetTerm && (b.type === 'Balance Brought Forward' || b.description.includes('Balance Brought Forward')))
                                : null;
                            const previousBal = bfBill ? bfBill.amount : (viewContext.startPrevBal || 0);

                            return (
                                <>
                                    {previousBal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#f59e0b' }}>
                                            <span>Previous Balance B/F</span>
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
                                <div>
                                    <span>- {formatMoney(bursaries.find(b => b.id === viewContext.bursaryId)?.value || 0)}</span>
                                </div>
                            </div>
                        )}
                        {viewContext.servicesIds?.map(sid => {
                            const s = services.find(srv => srv.id === sid);
                            if (!s) return null;
                            return (
                                <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                    <span>{s.name}</span>
                                    <span>{formatMoney(s.cost)}</span>
                                </div>
                            );
                        })}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>TOTAL BILLING</span>
                            <span>{formatMoney(totalBilling)}</span>
                        </div>
                    </div>
                </section>
            </div >

            {/* RIGHT COLUMN */}
            < div >
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>CURRENT ARREARS</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', color: outstandingBalance > 0 ? '#ef4444' : '#10b981' }}>
                        {formatMoney(outstandingBalance)}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Due Immediately</div>
                </div>

                {/* REQUIREMENTS */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Requirements</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowReqHistory(true)} style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: '#fff', opacity: 0.7, cursor: 'pointer' }}>📜 History</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {viewContext.requirements?.map((req, i) => (
                            <div key={i} style={{ background: `rgba(${parseInt(req.color.slice(1, 3), 16)}, ${parseInt(req.color.slice(3, 5), 16)}, ${parseInt(req.color.slice(5, 7), 16)}, 0.1)`, border: `1px solid ${req.color}`, padding: '0.8rem', borderRadius: '12px', textAlign: 'center', position: 'relative' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: req.color }}>{req.brought}/{req.required}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{req.name}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div >

            {showReqHistory && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card" style={{ width: 500, padding: '2rem', background: '#111', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Requirement History</h3>
                            <button onClick={() => setShowReqHistory(false)} style={{ background: 'none', border: 'none', color: 'white' }}>✕</button>
                        </div>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '0.5rem' }}>Requirement</th>
                                        <th style={{ padding: '0.5rem' }}>Qty</th>
                                        <th style={{ padding: '0.5rem' }}>Date</th>
                                        <th style={{ padding: '0.5rem' }}>Term</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudent.promotionHistory?.map((hist, i) => (
                                        hist.requirementsSnapshot?.map((req, j) => (
                                            <tr key={`${i}-${j}`} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '0.5rem' }}>{req.name}</td>
                                                <td style={{ padding: '0.5rem', color: '#10b981' }}>{req.brought} / {req.required}</td>
                                                <td style={{ padding: '0.5rem', opacity: 0.5 }}>-</td>
                                                <td style={{ padding: '0.5rem' }}>{hist.fromSemester}</td>
                                            </tr>
                                        ))
                                    ))}
                                    {!selectedStudent.promotionHistory?.length && (
                                        <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>No history records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
