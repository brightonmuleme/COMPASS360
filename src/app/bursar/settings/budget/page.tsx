"use client";
import React, { useState } from 'react';
import { useSchoolData, BudgetPeriod } from '@/lib/store';
import { Plus, Search, Calendar, Edit2, Trash2, ArrowRight, Eye } from 'lucide-react';
import Link from 'next/link';

export default function BudgetSettingsPage() {
    const { budgetPeriods, addBudgetPeriod, updateBudgetPeriod, deleteBudgetPeriod } = useSchoolData();
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<BudgetPeriod | null>(null);

    // Filter Logic
    const filteredPeriods = budgetPeriods.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort: Active first, then by Start Date descending
    filteredPeriods.sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('name') as string;
        const start = formData.get('startDate') as string;
        const end = formData.get('endDate') as string;

        // Validation
        const newStart = new Date(start);
        const newEnd = new Date(end);

        if (newEnd <= newStart) {
            alert("End date must be after start date.");
            return;
        }

        // Overlap Check
        const hasOverlap = budgetPeriods.some(p => {
            // Skip self if editing
            if (editingPeriod && p.id === editingPeriod.id) return false;

            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);

            // Check Intersection: (StartA <= EndB) and (EndA >= StartB)
            return newStart <= pEnd && newEnd >= pStart;
        });

        if (hasOverlap) {
            alert("This period overlaps with an existing budget. Start date must be after the end date of other active budgets.");
            return;
        }

        // Auto Status Logic
        const today = new Date().toISOString().split('T')[0];
        const status = (start <= today && end >= today) ? 'Active' : (start > today ? 'Draft' : 'Archived');

        if (editingPeriod) {
            updateBudgetPeriod({
                ...editingPeriod,
                name,
                startDate: start,
                endDate: end,
                status: status as any
            });
        } else {
            const newPeriod: BudgetPeriod = {
                id: crypto.randomUUID(),
                name,
                startDate: start,
                endDate: end,
                status: status as any,
                budgetCategories: []
            };
            addBudgetPeriod(newPeriod);
        }
        setIsModalOpen(false);
        setEditingPeriod(null);
    };

    return (
        <div className="p-6 text-slate-100 min-h-screen animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Budget Settings</h1>
                    <p className="text-slate-400 text-sm">Manage financial periods and budget limits</p>
                </div>
                <button
                    onClick={() => { setEditingPeriod(null); setIsModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow-lg shadow-purple-900/20"
                >
                    <Plus className="w-4 h-4" /> Create Period
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search periods..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 text-slate-200"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPeriods.map(period => (
                    <div key={period.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                        {period.status === 'Active' && (
                            <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                                Active
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{period.name}</h3>
                        </div>

                        <div className="space-y-2 text-sm text-slate-400 mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-600" />
                                <span>{new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${period.status === 'Active' ? 'bg-emerald-500' :
                                    period.status === 'Draft' ? 'bg-amber-500' : 'bg-slate-500'
                                    }`} />
                                <span>{period.status}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-slate-700/50 pt-4 mt-auto">
                            <Link
                                href={`/bursar/settings/budget/${period.id}`}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-center text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Eye className="w-4 h-4" /> View Details
                            </Link>
                            <button
                                onClick={() => { setEditingPeriod(period); setIsModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredPeriods.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No budget periods found.</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-purple-400 hover:text-purple-300 text-sm mt-2">Create one now</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <form onSubmit={handleSave} className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            {editingPeriod ? <Edit2 className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-purple-400" />}
                            {editingPeriod ? 'Edit Budget Period' : 'New Budget Period'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Period Name</label>
                                <input
                                    name="name"
                                    defaultValue={editingPeriod?.name}
                                    required
                                    placeholder="e.g. FY 2025"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Start Date</label>
                                    <input
                                        name="startDate"
                                        type="date"
                                        defaultValue={editingPeriod?.startDate}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">End Date</label>
                                    <input
                                        name="endDate"
                                        type="date"
                                        defaultValue={editingPeriod?.endDate}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium shadow-lg shadow-purple-900/20"
                            >
                                {editingPeriod ? 'Save Changes' : 'Create Period'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
