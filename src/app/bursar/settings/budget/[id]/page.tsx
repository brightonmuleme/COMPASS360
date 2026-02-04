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
    // Setters need to be wrapped to be compatible with helper function signatures if strict
    // but here we can just use the state setters directly in helpers
    const currentGlobalCategories = activeTab === 'Expense' ? expenseCategories : incomeCategories;

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
        <div className="p-6 text-slate-100 min-h-screen animate-in fade-in duration-300 relative">
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

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/bursar/settings/budget" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{period.name}</h1>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${period.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {period.status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsSelectionGridOpen(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add {activeTab} Category
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02]"
                    >
                        <Save className="w-4 h-4" /> Save Changes
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

                    // Calculate Total
                    const subTotal = hasGlobalSubs
                        ? cat.subcategories.reduce((sum, subName) => {
                            const subLimit = limit.subcategories.find(s => s.name === subName);
                            return sum + (subLimit?.amount || 0);
                        }, 0)
                        : 0;

                    const total = hasGlobalSubs ? subTotal : Number(limit.baseAmount);

                    return (
                        <div key={limit.id} className="bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden transition-all hover:border-slate-600">
                            <div className="p-4 flex items-center justify-between bg-slate-800/60">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-700 w-8 h-8 rounded flex items-center justify-center text-slate-400">
                                        {hasGlobalSubs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-200">{cat.name}</h3>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsCategoryManagerOpen(true); }}
                                                className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                                                title="Edit Category"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            {!hasGlobalSubs && <span>Base: {Number(limit.baseAmount).toLocaleString()}</span>}
                                            {hasGlobalSubs && <span>{cat.subcategories.length} Sub-items</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total {activeTab}</div>
                                        <div className="text-xl font-mono font-bold text-emerald-400">
                                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(total)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCurrentLimits(prev => prev.filter(l => l.id !== limit.id))}
                                        className="text-slate-600 hover:text-red-400 p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            <div className="p-4 border-t border-slate-700/50 bg-slate-900/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {!hasGlobalSubs && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">Base Amount</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">UGX</span>
                                                    <input
                                                        type="number"
                                                        value={limit.baseAmount || ''}
                                                        onChange={e => updateLimit(cat.id, { baseAmount: Number(e.target.value) })}
                                                        onFocus={e => e.target.select()}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 pl-10 text-white font-mono focus:ring-purple-500 transition-all hover:bg-slate-800"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasGlobalSubs && (
                                        <div className="col-span-2 space-y-3">
                                            <h4 className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                                Subcategory Breakdown
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {cat.subcategories.map(subName => {
                                                    const subLimit = limit.subcategories.find(s => s.name === subName);
                                                    const amount = subLimit?.amount || 0;

                                                    return (
                                                        <div key={subName} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="flex-1 text-sm font-bold text-slate-300 truncate" title={subName}>{subName}</span>
                                                            <div className="relative w-32">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]">UGX</span>
                                                                <input
                                                                    type="number"
                                                                    value={amount || ''}
                                                                    onChange={e => updateSubAmount(cat.id, subName, Number(e.target.value))}
                                                                    onFocus={e => e.target.select()}
                                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 pl-8 text-right font-mono text-emerald-400 text-sm focus:ring-1 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
