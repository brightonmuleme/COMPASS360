"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Billing, formatMoney } from '@/lib/store';
import { LearnerAccountModal } from '@/components/bursar/LearnerAccountModal';

export default function BillingsView() {
    const {
        billings,
        deletedBillings,
        students,
        addBilling,
        restoreBilling
    } = useSchoolData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewStudentId, setViewStudentId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Billing>>({
        date: new Date().toISOString().split('T')[0],
        type: 'Tuition',
        amount: 0
    });

    // --- AUTOCOMPLETE SUGGESTIONS ---
    const studentSuggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return students
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
    }, [students, searchTerm]);

    const handleSelectStudent = (name: string) => {
        setSearchTerm(name);
        setShowSuggestions(false);
    };

    // --- FILTER & SORT ---
    const filteredBillings = useMemo(() => {
        const sourceData = viewMode === 'active' ? billings : deletedBillings;
        const indexed = sourceData.map((b, i) => ({ doc: b, index: i }));

        return indexed.filter(({ doc: b }) => {
            const student = students.find(s => s.id === b.studentId);
            const studentName = student?.name || 'Unknown';
            const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || b.status === filterStatus;

            let matchesType = true;
            if (filterType !== 'All') {
                if (filterType === 'Service') matchesType = b.type === 'Service';
                else if (filterType === 'Tuition') matchesType = b.type === 'Tuition' || b.type === 'Tuition Fee';
                else matchesType = b.type === filterType || b.description?.includes(filterType);
            }

            let matchesDate = true;
            const bDate = new Date(b.date).getTime();
            if (dateRange.start) matchesDate = matchesDate && bDate >= new Date(dateRange.start).getTime();
            if (dateRange.end) matchesDate = matchesDate && bDate <= new Date(dateRange.end).getTime();

            return matchesSearch && matchesStatus && matchesType && matchesDate;
        }).sort((a, b) => {
            const timeA = new Date(a.doc.date).getTime();
            const timeB = new Date(b.doc.date).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.index - a.index;
        }).map(item => item.doc);
    }, [billings, deletedBillings, viewMode, students, searchTerm, filterStatus, filterType, dateRange]);

    const handleExportCSV = () => {
        if (filteredBillings.length === 0) return;
        const headers = ["Date", "Student", "Type", "Description", "Amount", "Paid", "Balance", "Status"];
        const rows = filteredBillings.map(b => [
            b.date,
            students.find(s => s.id === b.studentId)?.name || 'Unknown',
            b.type,
            b.description,
            b.amount,
            b.paidAmount,
            b.balance,
            b.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Billings_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="flex flex-col gap-6">
            {/* --- TOP ACTIONS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-sm">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'active' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        ACTIVE LEDGER
                    </button>
                    <button
                        onClick={() => setViewMode('trash')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'trash' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                        🗑️ TRASH ({deletedBillings.length})
                    </button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest"
                    >
                        CSV Export
                    </button>
                    <button
                        onClick={() => {
                            setFormData({ date: new Date().toISOString().split('T')[0], type: 'Tuition', amount: 0 });
                            setIsModalOpen(true);
                        }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
                    >
                        + Create Billing
                    </button>
                </div>
            </div>

            {/* --- FILTERS --- */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search student name..."
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
                                    onClick={() => handleSelectStudent(s.name)}
                                >
                                    <span className="font-bold text-slate-200">{s.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black">{s.programme}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <select
                        className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Partially Paid">Partial</option>
                        <option value="Paid">Cleared</option>
                    </select>

                    <select
                        className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 outline-none focus:border-blue-500 transition-colors uppercase"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        <option value="Tuition">Tuition</option>
                        <option value="Service">Services</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/30 px-3 py-1.5 rounded-xl border border-dashed border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-600 uppercase">Period Range</span>
                        <div className="flex items-center gap-2">
                            <input type="date" className="bg-transparent text-[11px] font-medium text-slate-400 outline-none" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                            <span className="text-slate-700">→</span>
                            <input type="date" className="bg-transparent text-[11px] font-medium text-slate-400 outline-none" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                        </div>
                    </div>
                    {(dateRange.start || dateRange.end) && (
                        <button onClick={() => setDateRange({ start: '', end: '' })} className="ml-2 text-red-500 hover:text-red-400 font-black text-lg">×</button>
                    )}
                </div>
            </div>

            {/* --- LIST / CARDS --- */}
            <div className="flex-1 min-h-0">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950/80 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Student Identity</th>
                                <th className="px-6 py-4">Financial Type</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredBillings.map(b => {
                                const student = students.find(s => s.id === b.studentId);
                                return (
                                    <tr key={b.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400">{new Date(b.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div
                                                className="font-bold text-white hover:text-blue-400 cursor-pointer transition-colors"
                                                onClick={() => setViewStudentId(b.studentId)}
                                            >
                                                {student?.name || 'Unknown'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 uppercase mt-0.5">{student?.programme}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-200">{b.type}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">{b.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-xs text-white">{formatMoney(b.amount)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-xs text-slate-400">{formatMoney(b.balance)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${b.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    b.status === 'Partially Paid' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                        'bg-slate-800 text-slate-500 border border-slate-700'
                                                }`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                {viewMode === 'active' ? (
                                                    <button
                                                        onClick={() => {
                                                            const reason = prompt("Reason for deletion:");
                                                            if (reason) useSchoolData.getState().deleteBilling(b.id, reason);
                                                        }}
                                                        className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => restoreBilling(b.id)}
                                                        className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded uppercase tracking-widest hover:bg-emerald-500"
                                                    >
                                                        Restore
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredBillings.map(b => {
                        const student = students.find(s => s.id === b.studentId);
                        return (
                            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg shadow-black/20">
                                <div className="flex justify-between items-start">
                                    <div onClick={() => setViewStudentId(b.studentId)}>
                                        <div className="text-xs text-slate-500 font-black uppercase tracking-widest">{new Date(b.date).toLocaleDateString()}</div>
                                        <div className="text-sm font-black text-white mt-1 uppercase">{student?.name || 'Unknown'}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${b.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                            b.status === 'Partially Paid' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                        {b.status}
                                    </span>
                                </div>
                                <div className="py-3 border-y border-slate-800/50">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">{b.type}</span>
                                        <span className="text-white font-black">{formatMoney(b.amount)}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-1 italic line-clamp-1">{b.description}</div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Due Bal</span>
                                        <span className="text-xs font-bold text-slate-400 leading-none">{formatMoney(b.balance)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setViewStudentId(b.studentId)} className="p-2 bg-slate-800 text-slate-400 rounded-lg">👁️</button>
                                        {viewMode === 'active' && (
                                            <button
                                                onClick={() => {
                                                    const reason = prompt("Reason for deletion:");
                                                    if (reason) useSchoolData.getState().deleteBilling(b.id, reason);
                                                }}
                                                className="p-2 bg-slate-800 text-red-500/70 rounded-lg"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- MODALS --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-2xl" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Generate <span className="text-blue-500">Invoice</span></h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors text-2xl font-black">×</button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Select Student</label>
                                    <input
                                        type="text"
                                        placeholder="Type name to search..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                                    />
                                    {showSuggestions && studentSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
                                            {studentSuggestions.map(s => (
                                                <button
                                                    key={s.id}
                                                    className="w-full px-4 py-3 text-left text-sm hover:bg-slate-700 text-slate-200 flex justify-between items-center border-b border-slate-700 last:border-0"
                                                    onClick={() => {
                                                        setFormData({ ...formData, studentId: s.id });
                                                        setSearchTerm(s.name);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <span className="font-bold">{s.name}</span>
                                                    <span className="text-[10px] uppercase font-black text-slate-500">{s.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Billing Type</label>
                                        <select
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Tuition">Tuition Fee</option>
                                            <option value="Registration">Registration</option>
                                            <option value="Library">Library Fund</option>
                                            <option value="Development">Development</option>
                                            <option value="Uniform">Uniforms</option>
                                            <option value="Service">General Service</option>
                                            <option value="Brought Forward">Balance BF</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Amount (UGX)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Memo / Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                        placeholder="Optional details..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (!formData.studentId || !formData.amount) return alert("Please select a student and amount.");
                                    const student = students.find(s => s.id === formData.studentId);
                                    if (formData.type === 'Tuition' && student?.lastBilledTerm === student?.semester) {
                                        if (!confirm("This student has already been billed for the current semester. Proceed anyway?")) return;
                                    }
                                    addBilling(formData as Billing);
                                    setIsModalOpen(false);
                                    setSearchTerm('');
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                            >
                                Authorize Billing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewStudentId && <LearnerAccountModal studentId={viewStudentId} onClose={() => setViewStudentId(null)} />}
        </div>
    );
}
