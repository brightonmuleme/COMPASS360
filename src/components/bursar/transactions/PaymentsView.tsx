"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Payment, formatMoney } from '@/lib/store';
import { LearnerAccountModal } from '@/components/bursar/LearnerAccountModal';
import { TransactionFormModal } from '@/components/bursar/TransactionFormModal';

const ALL_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'transactionId', label: 'Transaction ID' },
    { id: 'student', label: 'Student' },
    { id: 'programme', label: 'Programme' },
    { id: 'mode', label: 'Mode' },
    { id: 'particulars', label: 'Particulars' },
    { id: 'amount', label: 'Amount Paid' },
    { id: 'actions', label: 'Actions' }
];

export default function PaymentsView() {
    const {
        payments,
        deletedPayments,
        students,
        programmes,
        deletePayment,
        restorePayment,
    } = useSchoolData();

    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filterProgramme, setFilterProgramme] = useState('All');
    const [filterMode, setFilterMode] = useState('All');
    const [filterParticulars, setFilterParticulars] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(['date', 'transactionId', 'student', 'amount', 'actions']);
    const [showColumnSelector, setShowColumnSelector] = useState(false);

    const [viewStudentId, setViewStudentId] = useState<number | null>(null);
    const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
    const [viewTransactionId, setViewTransactionId] = useState<string | null>(null);

    const activeProgrammes = useMemo(() => programmes.map(p => p.name), [programmes]);

    const studentSuggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return students
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
    }, [students, searchTerm]);

    const filteredPayments = useMemo(() => {
        const sourceData = viewMode === 'active' ? payments : deletedPayments;
        return sourceData.filter(p => {
            const student = students.find(s => s.id === p.studentId);
            const studentName = student?.name || 'Unknown';
            const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesProg = filterProgramme === 'All' || student?.programme === filterProgramme;
            const matchesMode = filterMode === 'All' || p.method === filterMode;

            let matchesDate = true;
            const pDate = new Date(p.date).getTime();
            if (dateRange.start) matchesDate = matchesDate && pDate >= new Date(dateRange.start).getTime();
            if (dateRange.end) matchesDate = matchesDate && pDate <= new Date(dateRange.end).getTime();

            return matchesSearch && matchesProg && matchesMode && matchesDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments, deletedPayments, viewMode, students, searchTerm, filterProgramme, filterMode, dateRange]);

    return (
        <div className="flex flex-col gap-6">
            {/* --- HEADER ACTIONS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-sm">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'active' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        COLLECTIONS
                    </button>
                    <button
                        onClick={() => setViewMode('trash')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'trash' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                        🗑️ VOIDED ({deletedPayments.length})
                    </button>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-widest"
                        >
                            Columns
                        </button>
                        {showColumnSelector && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[60] p-2 space-y-1">
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setVisibleColumns([...visibleColumns, col.id]);
                                                else setVisibleColumns(visibleColumns.filter(c => c !== col.id));
                                            }}
                                            className="accent-blue-500"
                                        />
                                        <span className="text-[10px] font-black uppercase text-slate-400">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- SEARCH & FILTERS --- */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[280px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Student name, receipt, or reference..."
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                        />
                        {showSuggestions && studentSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1">
                                {studentSuggestions.map(s => (
                                    <button
                                        key={s.id}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-800 transition-colors flex items-center justify-between"
                                        onClick={() => { setSearchTerm(s.name); setShowSuggestions(false); }}
                                    >
                                        <span className="font-bold text-slate-200">{s.name}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">{s.programme}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase"
                            value={filterProgramme}
                            onChange={(e) => setFilterProgramme(e.target.value)}
                        >
                            <option value="All">All Programmes</option>
                            {activeProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase"
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value)}
                        >
                            <option value="All">All Modes</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank</option>
                            <option value="SchoolPay">SchoolPay</option>
                            <option value="Mobile Money">Mobile Money</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 bg-slate-950/30 px-3 py-1.5 rounded-xl border border-dashed border-slate-700">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-600 uppercase">Archive Range</span>
                            <div className="flex items-center gap-2">
                                <input type="date" className="bg-transparent text-[11px] font-medium text-slate-400 outline-none" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                                <span className="text-slate-700">→</span>
                                <input type="date" className="bg-transparent text-[11px] font-medium text-slate-400 outline-none" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="flex-1 min-h-0">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950/80 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                            <tr>
                                {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                                    <th key={col.id} className={`px-6 py-4 ${col.id === 'amount' ? 'text-right' : ''}`}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredPayments.map(p => {
                                const student = students.find(s => s.id === p.studentId);
                                return (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group">
                                        {visibleColumns.includes('date') && <td className="px-6 py-4 text-xs font-medium text-slate-400">{new Date(p.date).toLocaleDateString()}</td>}
                                        {visibleColumns.includes('transactionId') && <td className="px-6 py-4"><span className="text-[10px] font-black text-slate-500 font-mono tracking-tighter uppercase">{p.receiptNumber || p.id.slice(0, 8)}</span></td>}
                                        {visibleColumns.includes('student') && (
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white hover:text-blue-400 cursor-pointer transition-colors" onClick={() => setViewStudentId(p.studentId)}>
                                                    {student?.name || 'Unknown'}
                                                </div>
                                                {visibleColumns.includes('programme') && <div className="text-[10px] text-slate-500 uppercase mt-0.5">{student?.programme}</div>}
                                            </td>
                                        )}
                                        {visibleColumns.includes('mode') && (
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${p.method?.toLowerCase().includes('cash') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    }`}>
                                                    {p.method}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.includes('particulars') && <td className="px-6 py-4 text-[10px] text-slate-400 max-w-[150px] truncate">{p.description}</td>}
                                        {visibleColumns.includes('amount') && <td className="px-6 py-4 text-right font-black text-xs text-white">{formatMoney(p.amount)}</td>}
                                        {visibleColumns.includes('actions') && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setViewTransactionId(p.id)} className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors">📄</button>
                                                    {viewMode === 'active' ? (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm("Void this transaction?")) {
                                                                    await deletePayment(p.id, "Voided from transaction list");
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors">🗑️</button>
                                                    ) : (
                                                        <button onClick={() => restorePayment(p.id)} className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded uppercase hover:bg-emerald-500">Restore</button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredPayments.map(p => {
                        const student = students.find(s => s.id === p.studentId);
                        return (
                            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg shadow-black/20">
                                <div className="flex justify-between items-start">
                                    <div onClick={() => setViewStudentId(p.studentId)}>
                                        <div className="text-xs text-slate-500 font-black uppercase tracking-widest">{new Date(p.date).toLocaleDateString()}</div>
                                        <div className="text-sm font-black text-white mt-1 uppercase">{student?.name || 'Unknown'}</div>
                                    </div>
                                    <button onClick={() => setViewTransactionId(p.id)} className="p-2 bg-slate-800 text-slate-400 rounded-lg">📄</button>
                                </div>
                                <div className="py-3 border-y border-slate-800/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-tighter">REF: {p.receiptNumber || p.id.slice(0, 8)}</span>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${p.method?.toLowerCase().includes('cash') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }`}>
                                            {p.method}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Amount Paid</span>
                                        <span className="text-sm font-black text-white">{formatMoney(p.amount)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    {viewMode === 'active' && (
                                        <button onClick={() => setEditPaymentId(p.id)} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Edit</button>
                                    )}
                                    {viewMode === 'trash' && (
                                        <button onClick={() => restorePayment(p.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Restore</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- MODALS --- */}
            {viewStudentId && <LearnerAccountModal studentId={viewStudentId} onClose={() => setViewStudentId(null)} />}
            {editPaymentId && (() => {
                const payment = payments.find(p => p.id === editPaymentId) || deletedPayments.find(p => p.id === editPaymentId);
                if (!payment) return null;
                const student = students.find(s => s.id === payment.studentId);
                if (!student) return null;
                return (
                    <TransactionFormModal
                        isOpen={!!editPaymentId}
                        onClose={() => setEditPaymentId(null)}
                        student={student}
                        existingPayment={payment}
                    />
                );
            })()}
        </div>
    );
}
