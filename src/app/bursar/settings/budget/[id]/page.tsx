"use client";
import React, { useState } from 'react';
import { useSchoolData, BudgetPeriod, BudgetCategoryLimit, BudgetSubcategory } from '@/lib/store';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronRight, Calculator, Edit2, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import CategoryManager from '@/components/ui/CategoryManager';
import SelectionGrid from '@/components/ui/SelectionGrid';

type BudgetType = 'Expense' | 'Income';

export default function BudgetDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { budgetPeriods, updateBudgetPeriod, expenseCategories, incomeCategories } = useSchoolData();
    const [activeTab, setActiveTab] = useState<BudgetType>('Expense');
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isSelectionGridOpen, setIsSelectionGridOpen] = useState(false);

    // Load Data
    const period = budgetPeriods.find(p => p.id === id);

    // Local State
    const [expenseLimits, setExpenseLimits] = useState<BudgetCategoryLimit[]>(period?.budgetCategories || []);
    // Ensure we handle potential undefined for budgetIncomeCategories if it's new
    const [incomeLimits, setIncomeLimits] = useState<BudgetCategoryLimit[]>(period?.budgetIncomeCategories || []);

    // Derived State based on Active Tab
    const currentLimits = activeTab === 'Expense' ? expenseLimits : incomeLimits;
    const currentGlobalCategories = activeTab === 'Expense' ? expenseCategories : incomeCategories;

    // UI state for collapsibles
    const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
    const toggleCollapse = (id: string) => setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));

    // Helper to set current limits
    const setCurrentLimits = (newLimits: BudgetCategoryLimit[] | ((prev: BudgetCategoryLimit[]) => BudgetCategoryLimit[])) => {
        if (activeTab === 'Expense') {
            // TS dance for state setter
            if (typeof newLimits === 'function') {
                setExpenseLimits(newLimits as any);
            } else {
                setExpenseLimits(newLimits);
            }
        } else {
            if (typeof newLimits === 'function') {
                setIncomeLimits(newLimits as any);
            } else {
                setIncomeLimits(newLimits);
            }
        }
    };


    // Effect: Sync if period loads later
    React.useEffect(() => {
        if (period) {
            if (expenseLimits.length === 0 && period.budgetCategories?.length > 0) setExpenseLimits(period.budgetCategories);
            if (incomeLimits.length === 0 && period.budgetIncomeCategories?.length > 0) setIncomeLimits(period.budgetIncomeCategories);
        }
    }, [period]);

    if (!period) return <div className="p-8 text-center text-slate-500">Period not found</div>;

    const handleSave = () => {
        updateBudgetPeriod({
            ...period,
            budgetCategories: expenseLimits,
            budgetIncomeCategories: incomeLimits
        });
        alert("Budget Saved Successfully!");
    };

    const handleAddCategory = (categoryName: string) => {
        const cat = currentGlobalCategories.find(c => c.name === categoryName);
        if (!cat) return;

        // Check if already exists in current limits
        if (currentLimits.find(l => l.categoryId === cat.id)) {
            setIsSelectionGridOpen(false);
            return;
        }

        const newLimit: BudgetCategoryLimit = {
            id: crypto.randomUUID(),
            categoryId: cat.id,
            baseAmount: 0,
            allowSubcategories: cat.subcategories.length > 0,
            subcategories: []
        };
        setCurrentLimits([...currentLimits, newLimit]);
        setIsSelectionGridOpen(false);
    };

    const updateLimit = (categoryId: string, updates: Partial<BudgetCategoryLimit>) => {
        setCurrentLimits((prev: BudgetCategoryLimit[]) => prev.map(l => l.categoryId === categoryId ? { ...l, ...updates } : l));
    };

    const updateSubAmount = (categoryId: string, subName: string, amount: number) => {
        setCurrentLimits((prev: BudgetCategoryLimit[]) => prev.map(l => {
            if (l.categoryId !== categoryId) return l;

            const existingSub = l.subcategories.find(s => s.name === subName);
            let newSubs = [];

            if (existingSub) {
                newSubs = l.subcategories.map(s => s.name === subName ? { ...s, amount } : s);
            } else {
                newSubs = [...l.subcategories, { id: crypto.randomUUID(), name: subName, amount }];
            }

            return { ...l, subcategories: newSubs };
        }));
    };

    // Filter categories available for selection
    const availableCategories = currentGlobalCategories
        .filter(cat => !currentLimits.find(l => l.categoryId === cat.id))
        .map(cat => cat.name);


    return (
        <div className="p-6 text-slate-100 min-h-screen animate-in fade-in duration-300 relative pb-24">
            {/* MODAL: Selection Grid */}
            {isSelectionGridOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg relative">
                        <button
                            onClick={() => setIsSelectionGridOpen(false)}
                            className="absolute -top-10 right-0 p-2 text-white hover:text-red-400"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <SelectionGrid
                            title={`Add ${activeTab} Category`}
                            items={availableCategories}
                            onSelect={handleAddCategory}
                            onClose={() => setIsSelectionGridOpen(false)}
                            onEdit={() => { setIsSelectionGridOpen(false); setIsCategoryManagerOpen(true); }}
                        />
                    </div>
                </div>
            )}

            {/* MODAL: Category Manager */}
            {isCategoryManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md h-[600px] bg-white rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setIsCategoryManagerOpen(false)}
                            className="absolute top-4 right-4 z-10 p-1 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <CategoryManager
                            type={activeTab}
                            onClose={() => setIsCategoryManagerOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Header - Optimized for Mobile & Sticky */}
            <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md -mx-6 px-6 py-4 mb-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/bursar/settings/budget" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold truncate max-w-[120px] md:max-w-none">{period.name}</h1>
                            <span className={`px-2 py-0.5 rounded text-[8px] md:text-[10px] uppercase font-black tracking-widest ${period.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {period.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsSelectionGridOpen(true)}
                        className="hidden md:flex bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg items-center gap-2 font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Category
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 md:px-6 py-2 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest text-xs shadow-lg shadow-purple-900/40 transition-all active:scale-95"
                    >
                        <Save className="w-4 h-4" /> Save <span className="hidden md:inline">Changes</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-800 mb-6">
                {[
                    { id: 'Expense', label: 'Expense Budget' },
                    { id: 'Income', label: 'Income Budget' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as BudgetType)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="space-y-4 max-w-4xl">
                {currentLimits.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <p className="mb-4">No {activeTab.toLowerCase()} categories added yet.</p>
                        <button
                            onClick={() => setIsSelectionGridOpen(true)}
                            className="text-purple-400 font-bold hover:underline"
                        >
                            + Add {activeTab} Category
                        </button>
                    </div>
                )}

                {currentLimits.map(limit => {
                    const cat = currentGlobalCategories.find(c => c.id === limit.categoryId);
                    if (!cat) return null;

                    const hasGlobalSubs = cat.subcategories && cat.subcategories.length > 0;
                    const isCollapsed = collapsedIds[limit.id];

                    // Calculate Total
                    const subTotal = hasGlobalSubs
                        ? cat.subcategories.reduce((sum, subName) => {
                            const subLimit = limit.subcategories.find(s => s.name === subName);
                            return sum + (subLimit?.amount || 0);
                        }, 0)
                        : 0;

                    const total = hasGlobalSubs ? subTotal : Number(limit.baseAmount);

                    return (
                        <div key={limit.id} className="bg-slate-800/40 border border-slate-700 rounded-3xl overflow-hidden transition-all hover:border-slate-600 shadow-xl">
                            <div
                                className="p-5 flex items-center justify-between bg-slate-800/60 cursor-pointer select-none group"
                                onClick={() => toggleCollapse(limit.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isCollapsed ? 'bg-slate-800 text-slate-500' : 'bg-purple-500/10 text-purple-400'}`}>
                                        <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{cat.name}</h3>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsCategoryManagerOpen(true); }}
                                                className="p-1 text-slate-600 hover:text-emerald-400 transition-colors"
                                                title="Quick Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex gap-2">
                                            {!hasGlobalSubs && <span>One-off Item</span>}
                                            {hasGlobalSubs && <span>{cat.subcategories.length} Sub-items</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1 opacity-60">Total {activeTab}</div>
                                        <div className="text-xl font-mono font-black text-emerald-400">
                                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(total)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentLimits(prev => prev.filter(l => l.id !== limit.id)); }}
                                        className="text-slate-600 hover:text-red-400 p-2 transition-all hover:scale-110"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            {!isCollapsed && (
                                <div className="p-6 border-t border-slate-700/50 bg-slate-900/10 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {!hasGlobalSubs && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3 block opacity-60">Base Budget Amount</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs group-focus-within:text-purple-400 transition-colors">UGX</span>
                                                        <input
                                                            type="number"
                                                            value={limit.baseAmount || ''}
                                                            onChange={e => updateLimit(cat.id, { baseAmount: Number(e.target.value) })}
                                                            onFocus={e => e.target.select()}
                                                            className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl py-4 pl-14 pr-4 text-white font-mono text-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all hover:bg-slate-800"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {hasGlobalSubs && (
                                            <div className="col-span-2 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                        Subcategory Itemization
                                                    </h4>
                                                    <button
                                                        onClick={() => setIsCategoryManagerOpen(true)}
                                                        className="text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:underline"
                                                    >
                                                        + Add Sub-item
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {cat.subcategories.map(subName => {
                                                        const subLimit = limit.subcategories.find(s => s.name === subName);
                                                        const amount = subLimit?.amount || 0;

                                                        return (
                                                            <div key={subName} className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-2xl border border-slate-700/20 group hover:border-slate-600 transition-all">
                                                                <span className="flex-1 text-sm font-bold text-slate-300 truncate" title={subName}>{subName}</span>
                                                                <div className="relative w-36">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-black">UGX</span>
                                                                    <input
                                                                        type="number"
                                                                        value={amount || ''}
                                                                        onChange={e => updateSubAmount(cat.id, subName, Number(e.target.value))}
                                                                        onFocus={e => e.target.select()}
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-right font-mono text-emerald-400 text-sm focus:ring-2 focus:ring-purple-500 outline-none hover:bg-slate-800 transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                            )}
                                </div>
                            );
                })}
                        </div>

            {/* Mobile Floating Plus Button */ }
                    <button
                        onClick={() => setIsSelectionGridOpen(true)}
                        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-emerald-500 text-slate-950 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex items-center justify-center transition-transform active:scale-90 z-50 border-4 border-slate-950"
                    >
                        <Plus className="w-8 h-8" strokeWidth={3} />
                    </button>
        </div>
            );
}
