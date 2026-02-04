"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData } from '@/lib/store';

export default function TransactionsApprovalPage() {
    const {
        accounts,
        manualPaymentMethods,
        payments,
        generalTransactions,
        updatePayment,
        students,
        programmes
    } = useSchoolData();

    // --- OPTIMIZATION ---
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

    // --- STATE ---
    const [selectedSource, setSelectedSource] = useState<{ id: string, name: string, type: 'bank' | 'manual' | 'cash' | 'credit', provider?: string, description?: string } | null>(null);
    const [viewTxs, setViewTxs] = useState<{ open: boolean, transactions: any[] }>({ open: false, transactions: [] });
    const [reviewTx, setReviewTx] = useState<any>(null); // Transaction being reviewed

    // Filters
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
    const [searchName, setSearchName] = useState('');
    const [filterProgramme, setFilterProgramme] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    const availableLevels = useMemo(() => {
        return (programmes || []).find(p => p.name === filterProgramme)?.levels || [];
    }, [filterProgramme, programmes]);

    const formatMoney = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);

    const getTransactionsForSource = (name: string, type: 'bank' | 'manual' | 'cash' | 'credit') => {
        if (type === 'credit') {
            return payments.filter(p => {
                const isFix = (p.reference && String(p.reference).startsWith('FIX_BAL')) ||
                    (p.id && String(p.id).startsWith('FIX_BAL')) ||
                    (p.description && p.description.toLowerCase().includes('balance correction (credit)'));
                return isFix;
            }).map(p => ({
                ...p,
                studentName: studentMap.get(p.studentId)?.name || 'Unknown Student',
                source: 'Balance Adjustment',
                mode: 'Credit'
            }));
        }

        const allTxs = [
            ...(generalTransactions || []).map(t => ({
                ...t,
                source: 'General',
                studentName: t.description,
                status: 'approved',
                mode: (t as any).mode || (t as any).method || 'General'
            })),
            ...(payments || []).map(p => ({
                ...p,
                source: 'Student',
                type: 'Income',
                studentName: studentMap.get(p.studentId)?.name || `Student (${p.studentId})`,
                mode: p.method
            }))
        ];

        return allTxs.filter((tx: any) => {
            const mode = String(tx.mode || '').toLowerCase();
            const method = String(tx.method || '').toLowerCase();
            const desc = String(tx.description || '').toLowerCase();
            const search = name.toLowerCase();

            if (type === 'bank') {
                return mode.includes(search) || method.includes(search);
            }
            return mode.includes(search) || desc.includes(search) || method.includes(search);
        });
    };

    // --- OPTIMIZATION: Centralized Stats ---
    const sourceStats = useMemo(() => {
        const stats: Record<string, { pendingCount: number, pendingAmount: number }> = {};
        const getStat = (name: string) => {
            const low = name.toLowerCase();
            if (!stats[low]) stats[low] = { pendingCount: 0, pendingAmount: 0 };
            return stats[low];
        };

        payments.forEach(p => {
            const isPending = (p.status || 'pending') !== 'approved';
            if (!isPending) return;

            // Check if it's a balance fix
            const isFix = (p.reference && String(p.reference).startsWith('FIX_BAL')) ||
                (p.id && String(p.id).startsWith('FIX_BAL')) ||
                (p.description && p.description.toLowerCase().includes('balance correction (credit)'));

            if (isFix) {
                const s = getStat('balance_fixes');
                s.pendingCount++;
                s.pendingAmount += p.amount;
            }

            // Also match by method/mode for cards
            const methodStat = getStat(p.method || '');
            methodStat.pendingCount++;
            methodStat.pendingAmount += p.amount;
        });

        return stats;
    }, [payments]);

    const handleViewSource = (source: any, type: 'bank' | 'manual' | 'cash' | 'credit') => {
        const txs = getTransactionsForSource(source.name || 'Balance Fixes', type);
        txs.sort((a, b) => {
            const isPendingA = (a.status || 'pending') !== 'approved';
            const isPendingB = (b.status || 'pending') !== 'approved';
            if (isPendingA && !isPendingB) return -1;
            if (!isPendingA && isPendingB) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setSelectedSource({ ...source, type });
        setViewTxs({ open: true, transactions: txs });

        setFilterStatus('ALL'); setSearchName(''); setFilterProgramme(''); setFilterLevel(''); setFilterDateStart(''); setFilterDateEnd('');
    };

    const handleFinalAction = (directorNote: string, files: string[], action: 'approve' | 'save') => {
        if (!reviewTx) return;

        if (action === 'approve') {
            if (!confirm(`Are you sure you want to approve this transaction for ${formatMoney(reviewTx.amount)}?`)) return;
        }

        const realPayment = payments.find(p => String(p.id) === String(reviewTx.id));
        if (realPayment) {
            const isPending = (realPayment.status || 'pending') !== 'approved';
            const updates: any = {
                ...realPayment,
                directorNote: directorNote,
                attachments: [...(realPayment.attachments || []), ...files]
            };

            if (action === 'approve' && isPending) {
                updates.status = 'approved';
                updates.approvedAt = new Date().toISOString();
            }

            updatePayment(updates);

            setViewTxs(prev => ({
                ...prev,
                transactions: prev.transactions.map(t => t.id === reviewTx.id ? { ...t, ...updates } : t)
            }));

            setReviewTx(null);
        } else {
            alert("Transaction not found in Store.");
        }
    };

    const bankAccounts = accounts.filter(a => a.group === 'Bank Accounts');
    const cashMethods = manualPaymentMethods.filter(m => m.category === 'cash');
    const digitalFallbackMethods = manualPaymentMethods.filter(m => m.category === 'digital_fallback');
    const balanceFixes = getTransactionsForSource('Balance Fixes', 'credit');
    const pendingFixes = balanceFixes.filter((t: any) => (t.status || 'pending') !== 'approved');

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-[#f1f5f9]">
            <header className="mb-10">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Transaction Approvals</h1>
                <p className="text-slate-500 mt-1 font-medium">Review and approve pending payments from various sources.</p>
            </header>

            <div className="space-y-10">
                <Section title="Bank Accounts" icon={<IconBank />} color="purple">
                    {bankAccounts.map(acc => {
                        const stats = sourceStats[acc.name.toLowerCase()] || { pendingCount: 0, pendingAmount: 0 };
                        return <AccountCard key={acc.id} title={acc.name} subtitle={acc.bankName} pendingCount={stats.pendingCount} pendingAmount={stats.pendingAmount} onClick={() => handleViewSource(acc, 'bank')} />
                    })}
                </Section>
                <Section title="Manual Digital Entries" icon={<IconDigital />} color="orange">
                    {digitalFallbackMethods.map(m => {
                        const stats = sourceStats[m.name.toLowerCase()] || { pendingCount: 0, pendingAmount: 0 };
                        return <AccountCard key={m.id} title={m.name} subtitle={m.description} pendingCount={stats.pendingCount} pendingAmount={stats.pendingAmount} onClick={() => handleViewSource(m, 'manual')} />
                    })}
                </Section>
                <Section title="Cash Collection Points" icon={<IconCash />} color="emerald">
                    {cashMethods.map(m => {
                        const stats = sourceStats[m.name.toLowerCase()] || { pendingCount: 0, pendingAmount: 0 };
                        return <AccountCard key={m.id} title={m.name} subtitle={m.description} pendingCount={stats.pendingCount} pendingAmount={stats.pendingAmount} onClick={() => handleViewSource(m, 'cash')} />
                    })}
                </Section>
                <Section title="Balance Fixes & Adjustments" icon={<IconFixes />} color="blue">
                    {(() => {
                        const stats = sourceStats['balance_fixes'] || { pendingCount: 0, pendingAmount: 0 };
                        return <AccountCard title="Pending Balance Fixes" subtitle="Manual Credit Adjustments" pendingCount={stats.pendingCount} pendingAmount={stats.pendingAmount} onClick={() => handleViewSource({ name: 'Balance Fixes' }, 'credit')} />
                    })()}
                </Section>
            </div>

            {viewTxs.open && selectedSource && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden animate-scale-up border border-white/20">
                        <div className="p-6 border-b border-gray-100 bg-white z-20 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    {selectedSource.name} <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-500 uppercase">{selectedSource.type}</span>
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">Reviewing transaction history and pending approvals.</p>
                            </div>
                            <button onClick={() => setViewTxs({ open: false, transactions: [] })} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
                            <div className="flex gap-4">
                                <input type="text" placeholder="Search by name..." className="border border-slate-300 rounded px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                                <select className="border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                                    <option value="ALL">All Statuses</option> <option value="PENDING">Pending Only</option> <option value="APPROVED">Approved Only</option>
                                </select>
                            </div>
                            <div className="flex gap-4 items-center">
                                <select className="border border-slate-300 rounded px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white" value={filterProgramme} onChange={(e) => { setFilterProgramme(e.target.value); setFilterLevel(''); }}>
                                    <option value="">All Programmes</option>
                                    {(programmes || []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                <select className="border border-slate-300 rounded px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 text-slate-700 bg-white" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} disabled={!filterProgramme}>
                                    <option value="">All Levels</option>
                                    {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-medium">Date:</span>
                                    <input type="date" className="border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                                    <span className="text-slate-400">-</span>
                                    <input type="date" className="border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                                </div>
                                {(filterProgramme || filterDateStart || filterDateEnd) && <button onClick={() => { setFilterProgramme(''); setFilterLevel(''); setFilterDateStart(''); setFilterDateEnd(''); }} className="text-xs text-red-500 hover:text-red-700 font-bold ml-auto">Reset Filters</button>}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto p-0 bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 sticky top-0 z-10 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-5">Date</th>
                                        <th className="p-5">Student</th>
                                        <th className="p-5">Reason (Bursar)</th>
                                        <th className="p-5">Director's Note</th>
                                        {selectedSource.type !== 'credit' && <th className="p-5">Reference</th>}
                                        <th className="p-5 text-right">Amount</th>
                                        <th className="p-5 text-center">Status</th>
                                        <th className="p-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                    {viewTxs.transactions.filter((tx: any) => {
                                        if (filterStatus === 'PENDING' && (tx.status === 'approved')) return false;
                                        if (filterStatus === 'APPROVED' && (tx.status !== 'approved')) return false;
                                        if (searchName && !tx.studentName?.toLowerCase().includes(searchName.toLowerCase())) return false;
                                        if (filterProgramme || filterLevel) {
                                            const student = studentMap.get(tx.studentId);
                                            if (!student) return false;
                                            if (filterProgramme && (student.programme !== filterProgramme && (student as any).course !== filterProgramme)) return false;
                                            if (filterLevel && student.level !== filterLevel) return false;
                                        }
                                        if (filterDateStart && new Date(tx.date) < new Date(filterDateStart)) return false;
                                        if (filterDateEnd) { const end = new Date(filterDateEnd); end.setHours(23, 59, 59, 999); if (new Date(tx.date) > end) return false; }
                                        return true;
                                    }).map((tx: any) => {
                                        const isApproved = tx.status === 'approved';
                                        const hasAttachments = tx.attachments && tx.attachments.length > 0;
                                        return (
                                            <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors">
                                                <td className="p-5 whitespace-nowrap text-slate-500">
                                                    {new Date(tx.date).toLocaleDateString()}
                                                    <div className="text-xs opacity-50">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="p-5 font-bold text-slate-800">{tx.studentName}</td>

                                                <td className="p-5 text-slate-600 text-sm max-w-[200px] truncate" title={tx.description}>
                                                    {tx.description || '-'}
                                                </td>

                                                <td className="p-5 text-slate-600 text-sm max-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate block">{tx.directorNote || '-'}</span>
                                                        {hasAttachments && <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                                                    </div>
                                                </td>

                                                {selectedSource.type !== 'credit' && <td className="p-5 font-mono text-slate-600 text-xs">{tx.reference || '-'}</td>}
                                                <td className="p-5 text-right font-bold text-slate-800">{formatMoney(tx.amount)}</td>
                                                <td className="p-5 text-center">
                                                    {isApproved ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Approved</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending</span>}
                                                </td>
                                                <td className="p-5 text-center">
                                                    {isApproved ? (
                                                        <button onClick={() => setReviewTx(tx)} className="text-blue-600 hover:text-blue-700 text-xs font-bold underline">View / Edit</button>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => setReviewTx(tx)}
                                                                className="px-4 py-1.5 text-blue-600 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm text-xs"
                                                            >
                                                                Review & Action
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {viewTxs.transactions.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">No transactions found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {reviewTx && (
                <ReviewModal
                    tx={reviewTx}
                    onClose={() => setReviewTx(null)}
                    onAction={handleFinalAction}
                />
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---
const IconBank = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
const IconDigital = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const IconCash = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconFixes = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


const Section = ({ title, icon, color, children }: any) => { const c: any = { purple: 'text-purple-600 border-purple-100 bg-white', orange: 'text-orange-600 border-orange-100 bg-white', emerald: 'text-emerald-600 border-emerald-100 bg-white', blue: 'text-blue-600 border-blue-100 bg-white' }; return (<section><div className="flex items-center gap-3 mb-5"><div className={`p-2.5 rounded-xl shadow-sm border ${c[color]}`}>{icon}</div><h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">{title}</h2></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{children}</div></section>); }
const AccountCard = ({ title, subtitle, pendingCount, pendingAmount, onClick }: any) => { const h = pendingCount > 0; return (<div onClick={onClick} className={`bg-white p-6 rounded-2xl border ${h ? 'border-blue-200 shadow-blue-100/50' : 'border-slate-100'} shadow-sm cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden`}>{h && <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm animate-pulse">{pendingCount} Pending</div>}<div className="flex items-start justify-between mb-8 pt-2"><div><h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{title}</h3><p className="text-sm text-slate-500 font-medium mt-1">{subtitle || 'No details'}</p></div></div><div className="pt-5 border-t border-slate-50 flex justify-between items-end"><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Amount</label><div className={`text-2xl font-mono font-bold mt-1 ${h ? 'text-slate-900' : 'text-slate-300'}`}>{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(pendingAmount)}</div></div>{h ? <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></div> : <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div>}</div></div>); };

const ReviewModal = ({ tx, onClose, onAction }: any) => {
    const isApproved = tx.status === 'approved';
    const [directorNote, setDirectorNote] = useState(tx.directorNote || '');
    const [files, setFiles] = useState<string[]>(tx.attachments || []);

    // Simulate File Upload & Preview
    const handleFile = (e: any) => {
        const selectedFiles = Array.from(e.target.files);
        selectedFiles.forEach((file: any) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Use DataURL for preview
                setFiles(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{isApproved ? 'Transaction Details' : 'Approve Transaction'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <div className="text-xs text-blue-600 font-bold uppercase tracking-wide">Amount</div>
                            <div className="text-xl font-bold text-slate-800">{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(tx.amount)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 font-bold">Student</div>
                            <div className="font-medium text-slate-700">{tx.studentName}</div>
                        </div>
                    </div>

                    {/* Timestamp if Approved */}
                    {isApproved && tx.approvedAt && (
                        <div className="p-3 bg-green-50 border border-green-100 rounded text-xs text-green-700 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            Approved on: {new Date(tx.approvedAt).toLocaleString()}
                        </div>
                    )}

                    {/* Bursar's Original Reason (Read-only) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reason (From Bursar)</label>
                        <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-600 italic">
                            {tx.description || 'No description provided.'}
                        </div>
                    </div>

                    {/* Director's Note (Editable) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Director's Note</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                            rows={3}
                            value={directorNote}
                            onChange={(e) => setDirectorNote(e.target.value)}
                            placeholder="Add your comments here..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Attachments</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                            <input type="file" id="file-upload" className="hidden" multiple onChange={handleFile} accept="image/*,application/pdf" />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="text-sm text-blue-600 font-bold hover:underline">Click to upload</span>
                                <span className="text-xs text-slate-400 mt-1">Images or Documents</span>
                            </label>
                        </div>
                        {/* File List / Preview */}
                        {files.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {files.map((f, i) => (
                                    <div key={i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                        {/* Preview Image if DataURL */}
                                        {f.startsWith('data:image') ? (
                                            <img src={f} alt="Preview" className="w-full h-32 object-cover" />
                                        ) : (
                                            <div className="w-full h-32 flex items-center justify-center text-slate-400">
                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded text-sm">Cancel</button>
                    {!isApproved && (
                        <button
                            onClick={() => onAction(directorNote, files, 'save')}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded shadow-sm hover:bg-slate-50 text-sm"
                        >
                            Save details (Keep Pending)
                        </button>
                    )}
                    <button
                        onClick={() => onAction(directorNote, files, isApproved ? 'save' : 'approve')}
                        disabled={!isApproved && directorNote.trim().length < 5}
                        className={`px-6 py-2 text-white font-bold rounded shadow-lg text-sm transition-all transform active:scale-95 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed ${isApproved ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isApproved ? 'Save Changes' : 'Confirm & Approve'}
                    </button>
                </div>
            </div>
        </div>
    );
};
