"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolData, Payment, formatMoney } from '@/lib/store';

export default function ApprovalsLogPage() {
    const { payments, billings, students, updatePayment, updateBilling, activeRole } = useSchoolData();
    const isDirector = activeRole === 'Director';

    // Optimization: Student Map
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [reversingPayment, setReversingPayment] = useState<any>(null);
    const [reversalReason, setReversalReason] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showReversedOnly, setShowReversedOnly] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Derived: Log entries (Payments with approval history OR recently reversed)
    const logEntries = useMemo(() => {
        const paymentLogs = payments
            .filter(p => {
                // EXCLUSION: Auto-approved digital integrations do not belong in the forensic audit
                const isAutoDigital = ['DIGITAL', 'SchoolPay', 'PegPay'].includes(p.method);

                return !isAutoDigital && (
                    ((p.status === 'Approved' || p.status === 'approved') && (p.approvedAt || p.directorNote)) ||
                    (p.status === 'Pending' && p.history?.some(h => h.action === 'Approval Reversed'))
                );
            })
            .map(p => ({
                ...p,
                txType: 'payment',
                // Last Action Wins: Only consider it reversed if it's currently Pending AND has a reversal in history
                wasReversed: (p.status?.toLowerCase() === 'pending') && p.history?.some(h => h.action === 'Approval Reversed')
            }));

        const billingLogs = billings
            .filter(b =>
                ((b.status === 'Approved' || b.status === 'approved') && (b.approvedAt || b.directorNote)) ||
                (b.status === 'Pending' && b.history?.some(h => h.action === 'Approval Reversed'))
            )
            .map(b => ({
                ...b,
                method: b.type || 'Adjustment',
                txType: 'billing',
                // Last Action Wins: Only consider it reversed if it's currently Pending AND has a reversal in history
                wasReversed: (b.status?.toLowerCase() === 'pending') && b.history?.some(h => h.action === 'Approval Reversed')
            }));

        return [...paymentLogs, ...billingLogs]
            .sort((a, b) => {
                const aTime = new Date((a as any).approvedAt || (a as any).date).getTime();
                const bTime = new Date((b as any).approvedAt || (b as any).date).getTime();
                return bTime - aTime;
            });
    }, [payments, billings]);

    const categories = useMemo(() => {
        const cats = new Set(logEntries.map(p => p.method).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [logEntries]);

    const filteredLogs = useMemo(() => {
        let result = logEntries;

        // 1. Date Range Filter
        if (dateRange.start) {
            result = result.filter(p => p.approvedAt && p.approvedAt >= dateRange.start);
        }
        if (dateRange.end) {
            const endBound = dateRange.end + 'T23:59:59';
            result = result.filter(p => p.approvedAt && p.approvedAt <= endBound);
        }

        // 3. Category Filter
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.method === selectedCategory);
        }

        // 4. Reversed Filter
        if (showReversedOnly) {
            result = result.filter(p => (p as any).wasReversed);
        }

        return result;
    }, [logEntries, searchTerm, studentMap, dateRange, selectedCategory, showReversedOnly]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateRange, selectedCategory]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(start, start + itemsPerPage);
    }, [filteredLogs, currentPage]);

    const handleReverse = () => {
        if (!reversingPayment || !reversalReason.trim()) return;

        const isBilling = (reversingPayment as any).txType === 'billing';
        const updates: any = {
            ...reversingPayment,
            status: 'Pending',
            history: [...(reversingPayment.history || []), {
                id: 'log_' + Date.now(),
                action: 'Approval Reversed',
                details: `Director reversed approval. Reason: ${reversalReason}`,
                user: 'Director',
                timestamp: new Date().toISOString()
            }]
        };

        if (isBilling) {
            updateBilling(updates);
        } else {
            updatePayment(updates);
        }

        setReversingPayment(null);
        setReversalReason('');
    };

    const setQuickFilter = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        let start = new Date();
        if (type === 'today') start.setHours(0, 0, 0, 0);
        else if (type === 'week') start.setDate(now.getDate() - 7);
        else if (type === 'month') start.setMonth(now.getMonth() - 1);

        setDateRange({
            start: start.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0]
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-[#f8fafc]">
            <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Forensic Approval Log</h1>
                            <p className="text-slate-500 font-bold uppercase text-[0.7rem] tracking-[3px] mt-1 opacity-70">Secured Audit Trail • Live Insights</p>
                        </div>
                    </div>

                    {/* Date Filters & Presets */}
                    <div className="mt-8 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
                            {['today', 'week', 'month'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setQuickFilter(t as any)}
                                    className="px-4 py-2 rounded-lg text-[0.6rem] font-black uppercase tracking-widest bg-white shadow-sm md:bg-transparent md:shadow-none hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-blue-600 whitespace-nowrap"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 md:p-2 rounded-xl shadow-sm overflow-hidden shrink-0">
                            <input type="date" className="bg-transparent text-xs font-bold outline-none text-slate-600 min-w-0" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                            <span className="text-slate-300 font-black">→</span>
                            <input type="date" className="bg-transparent text-xs font-bold outline-none text-slate-600 min-w-0" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                            {(dateRange.start || dateRange.end) && (
                                <button onClick={() => setDateRange({ start: '', end: '' })} className="ml-2 text-slate-300 hover:text-red-500">✕</button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all border ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowReversedOnly(!showReversedOnly)}
                            className={`px-4 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all border ${showReversedOnly
                                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                                : 'bg-white text-red-500 border-red-100 hover:border-red-300'
                                }`}
                        >
                            {showReversedOnly ? 'Showing Reversed' : 'Filter Reversed'}
                        </button>
                    </div>
                </div>

                <div className="relative group w-full xl:w-auto">
                    <input
                        type="text"
                        placeholder="Search by learner..."
                        className="pl-14 pr-8 py-4 md:py-5 rounded-[2rem] bg-white border-2 border-slate-100 shadow-xl shadow-slate-200/50 focus:border-blue-500 outline-none w-full xl:w-[450px] transition-all font-bold text-sm md:text-base"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </header >

            <div className="grid grid-cols-1 gap-6">
                {filteredLogs.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-40 flex flex-col items-center justify-center text-center">
                        <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
                            <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Audit Trail Clear</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching verified transactions found in this range.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/30 overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[0.6rem] md:text-[0.7rem] font-black uppercase tracking-[2.5px] text-slate-400">
                                    <th className="p-4 md:p-8 whitespace-nowrap">Timestamp</th>
                                    <th className="p-4 md:p-8 whitespace-nowrap">Learner</th>
                                    <th className="p-4 md:p-8 text-right whitespace-nowrap">Value</th>
                                    <th className="p-4 md:p-8 hidden md:table-cell whitespace-nowrap">Director's Note</th>
                                    <th className="p-4 md:p-8 text-center whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedLogs.map(log => {
                                    const student = studentMap.get(log.studentId);
                                    const isReversed = (log as any).wasReversed;
                                    return (
                                        <tr
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            className={`transition-all group cursor-pointer ${isReversed ? 'bg-slate-50 opacity-60 grayscale hover:grayscale-0' : 'hover:bg-blue-50/40'}`}
                                        >
                                            <td className="p-4 md:p-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs md:text-sm font-black text-slate-700 whitespace-nowrap">{log.approvedAt ? new Date(log.approvedAt).toLocaleDateString() : 'N/A'}</span>
                                                    <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">{log.approvedAt ? new Date(log.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-8">
                                                <div className="flex items-center gap-3 md:gap-5">
                                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-inner transition-transform group-hover:scale-110 shrink-0 ${isReversed ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
                                                        {student?.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm md:text-base font-black tracking-tight ${isReversed ? 'text-slate-400 line-through decoration-red-500 decoration-2' : 'text-slate-900'}`}>{student?.name || 'Unknown Learner'}</div>
                                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                            <span className="text-[0.6rem] md:text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">{log.method}</span>
                                                            {log.attachments && log.attachments.length > 0 && (
                                                                <span className="text-blue-500 text-xs" title="Proof/Files Attached">📎</span>
                                                            )}
                                                            {isReversed && <span className="text-[0.6rem] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded-md border border-red-500/20">Audit Reversed</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-8 text-right">
                                                <div className={`text-sm md:text-lg font-black whitespace-nowrap ${isReversed ? 'text-slate-400' : 'text-emerald-600'}`}>
                                                    {isReversed ? '—' : formatMoney(log.amount)}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-8 hidden md:table-cell">
                                                <div className="max-w-[300px] text-sm text-slate-600 font-semibold leading-relaxed line-clamp-1 italic border-l-4 border-slate-100 pl-4 py-1">
                                                    {log.directorNote || 'Approved.'}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-8 text-center" onClick={e => e.stopPropagation()}>
                                                {isDirector && !isReversed ? (
                                                    <button
                                                        onClick={() => setReversingPayment(log)}
                                                        className="px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl bg-white border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white text-[0.6rem] md:text-[0.65rem] font-black uppercase tracking-[1px] md:tracking-[2px] shadow-sm active:scale-95 transition-all w-full md:max-w-[180px] whitespace-nowrap"
                                                    >
                                                        Reverse
                                                    </button>
                                                ) : isReversed ? (
                                                    <div className="text-[0.55rem] md:text-[0.6rem] font-black text-slate-300 uppercase tracking-[1px] md:tracking-[2px] italic whitespace-nowrap">Void</div>
                                                ) : (
                                                    <span className="text-slate-300">🔒</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-4 md:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-[0.6rem] md:text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Page <span className="text-blue-600">{currentPage}</span> of {totalPages} ({filteredLogs.length} entries)
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 md:px-4 py-2 rounded-xl bg-white border border-slate-200 text-[0.6rem] md:text-[0.65rem] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                    >
                                        Prev
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            // More restrictive pagination on small screens
                                            const showPage = (page === 1 || page === totalPages || Math.abs(page - currentPage) <= (window.innerWidth < 768 ? 0 : 1));
                                            if (showPage) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[0.6rem] md:text-[0.65rem] font-black transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-slate-200 text-slate-400 hover:text-blue-600'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                return <span key={page} className="text-slate-300 text-[0.6rem]">..</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 md:px-4 py-2 rounded-xl bg-white border border-slate-200 text-[0.6rem] md:text-[0.65rem] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Forensic Detail Modal */}
            {
                selectedLog && (
                    <div
                        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-end md:items-center justify-end animate-fade-in"
                        onClick={() => setSelectedLog(null)}
                    >
                        <div
                            className="w-full max-w-2xl bg-white h-[90vh] md:h-full shadow-2xl overflow-y-auto animate-slide-up md:animate-slide-left p-6 md:p-12 rounded-t-[2.5rem] md:rounded-none"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-8 md:mb-12">
                                <div>
                                    <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Forensic Analysis</h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-[2px] md:tracking-[3px] text-[0.6rem] md:text-[0.7rem] line-clamp-1 truncate">ID: {selectedLog.id}</p>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0">✕</button>
                            </div>

                            <div className="space-y-10">
                                {/* Forensic Evidence Card */}
                                <div className="bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                                        <div>
                                            <span className="text-[0.6rem] md:text-[0.65rem] font-black text-slate-400 uppercase tracking-widest block mb-4">Verification Proof ({selectedLog.attachments?.length || 0})</span>
                                            {selectedLog.attachments && selectedLog.attachments.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                                    {selectedLog.attachments.map((att: string, i: number) => (
                                                        <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 group relative">
                                                            <img src={att} className="w-full h-full object-cover" />
                                                            <a href={att} download={`proof-${i}`} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs">Download</a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-bold text-xs italic">
                                                    No Attachments
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center space-y-6">
                                            <div>
                                                <span className="text-[0.6rem] md:text-[0.65rem] font-black text-slate-400 uppercase tracking-widest block mb-2">Financial Impact</span>
                                                <span className="text-2xl md:text-4xl font-black text-emerald-600 tracking-tighter">{formatMoney(selectedLog.amount)}</span>
                                            </div>

                                            {/* Explicit Director's Note */}
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                <span className="text-[0.6rem] font-black text-blue-500 uppercase tracking-widest block mb-1">Director's Note</span>
                                                <p className="text-xs md:text-sm font-bold text-slate-600 italic leading-relaxed">
                                                    "{selectedLog.directorNote || 'Authorized without comments.'}"
                                                </p>
                                            </div>

                                            <div>
                                                <span className="text-[0.6rem] md:text-[0.65rem] font-black text-slate-400 uppercase tracking-widest block mb-2">Verification Seal</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[9px] md:text-[10px] font-black shrink-0">DIR</div>
                                                    <span className="font-black text-slate-800 text-xs md:text-sm italic">Digitally Signed</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed History Timeline */}
                                <div className="px-5">
                                    <h3 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[4px] mb-8">Auditing Timeline</h3>
                                    <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-0 before:w-1 before:bg-slate-100">
                                        {selectedLog.history?.slice().reverse().map((h: any, i: number) => (
                                            <div key={i} className="relative pl-10">
                                                <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-md ${i === 0 ? 'bg-blue-600 scale-125' : 'bg-slate-300'}`}></div>
                                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 md:gap-0">
                                                    <div>
                                                        <span className="text-xs md:text-sm font-black text-slate-800 block">{h.action}</span>
                                                        <span className="text-[0.7rem] md:text-xs text-slate-500 font-medium leading-relaxed block mt-1">{h.details}</span>
                                                    </div>
                                                    <div className="text-left md:text-right shrink-0">
                                                        <span className="text-[0.6rem] md:text-[0.65rem] font-black text-slate-400 block">{new Date(h.timestamp).toLocaleDateString()}</span>
                                                        <span className="text-[0.55rem] md:text-[0.6rem] font-bold text-slate-300 block">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Initial Post */}
                                        <div className="relative pl-10">
                                            <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-200 border-4 border-white shadow-md"></div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 block">Ledger Entry Created</span>
                                                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-1">Initial entry posted by Bursar Desk</span>
                                                </div>
                                                <div className="text-right opacity-30">
                                                    <span className="text-[0.65rem] font-black block">{new Date(selectedLog.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 md:pt-10 flex flex-col md:flex-row gap-4 pb-12">
                                    <button
                                        onClick={() => {
                                            alert(`Navigate to ${studentMap.get(selectedLog.studentId)?.name}'s profile and search for Ref: ${selectedLog.reference}`);
                                            setSelectedLog(null);
                                        }}
                                        className="flex-1 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-slate-900 text-white font-black uppercase tracking-widest text-[0.65rem] md:text-xs hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20"
                                    >
                                        Open Timeline
                                    </button>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="flex-1 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[0.65rem] md:text-xs hover:bg-slate-200 transition-all"
                                    >
                                        Return to Log
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reversal Confirmation Modal */}
            {
                reversingPayment && (
                    <div className="fixed inset-0 z-[20000] bg-slate-900/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
                        <div className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl p-8 md:p-12 animate-slide-up md:animate-scale-up">
                            <div className="flex flex-col items-center text-center mb-8 md:mb-10">
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 border-4 border-rose-100">
                                    <span className="text-3xl md:text-4xl">⚠️</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Financial Reversal</h3>
                                <p className="text-slate-500 font-bold uppercase text-[0.55rem] md:text-[0.6rem] tracking-[2px] md:tracking-[3px] mt-2 leading-relaxed px-4">Overturning entry for <span className="text-rose-600">{formatMoney(reversingPayment.amount)}</span></p>
                            </div>

                            <div className="mb-8 md:mb-10">
                                <label className="block text-[0.65rem] md:text-[0.7rem] font-black text-slate-400 uppercase tracking-[2px] mb-4 ml-2">Audit Reason</label>
                                <textarea
                                    autoFocus
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 md:p-6 text-slate-800 font-semibold focus:border-rose-500 outline-none transition-all placeholder:text-slate-300 min-h-[100px] md:min-h-[120px] text-sm md:text-base"
                                    placeholder="Why reverse this?"
                                    value={reversalReason}
                                    onChange={e => setReversalReason(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 md:gap-4 pb-8 md:pb-0">
                                <button onClick={() => setReversingPayment(null)} className="flex-1 py-4 md:py-5 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[0.65rem] md:text-xs hover:bg-slate-200 transition-all">Cancel</button>
                                <button
                                    onClick={handleReverse}
                                    disabled={!reversalReason.trim()}
                                    className="flex-[1.5] py-4 md:py-5 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-[0.65rem] md:text-xs shadow-xl shadow-rose-600/30 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
