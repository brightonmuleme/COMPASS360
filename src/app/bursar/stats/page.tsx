"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolData, formatMoney, BudgetCategoryLimit } from '@/lib/store';
import PieChart, { ChartData } from '@/components/ui/PieChart';
import ProgressBar from '@/components/ui/ProgressBar';
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal';
import { GeneralTransaction } from '@/lib/store';

export default function StatisticsPage() {
    const {
        generalTransactions,
        activeRole,
        updateGeneralTransaction,
        deleteGeneralTransaction,
        budgets,
        updateBudget,
        budgetPeriods,
        expenseCategories,
        incomeCategories
    } = useSchoolData();

    // --- STATE ---
    const [viewMode, setViewMode] = useState<'Stats' | 'Budget' | 'Note'>('Stats');
    const [filterType, setFilterType] = useState<'Income' | 'Expense'>('Expense');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setDate(1)));
    const [customEndDate, setCustomEndDate] = useState(new Date());

    // --- FINANCIAL PERIOD STATE (Budget View) ---
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

    // Initialize to active period
    useEffect(() => {
        if (!selectedPeriodId && budgetPeriods.length > 0) {
            const active = budgetPeriods.find(p => p.status === 'Active');
            setSelectedPeriodId(active ? active.id : budgetPeriods[0].id);
        }
    }, [budgetPeriods, selectedPeriodId]);

    const activeBudgetPeriod = useMemo(() =>
        budgetPeriods.find(p => p.id === selectedPeriodId),
        [budgetPeriods, selectedPeriodId]);


    // --- STANDARD FILTER STATE (Stats/Note View) ---
    type PeriodType = 'Weekly' | 'Monthly' | 'Annually' | 'Period';
    const [periodType, setPeriodType] = useState<PeriodType>('Monthly');
    const [showPeriodMenu, setShowPeriodMenu] = useState(false);

    // Selection State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [budgetViewMode, setBudgetViewMode] = useState<'Default' | 'SubCategories' | 'Transactions'>('Default');
    const [editingTransaction, setEditingTransaction] = useState<GeneralTransaction | null>(null);

    // --- HANDLERS ---
    const handleSaveTransaction = (updated: GeneralTransaction) => {
        if (updated.transferGroupId && updateGeneralTransaction) {
            const partner = generalTransactions.find(p => p.transferGroupId === updated.transferGroupId && p.id !== updated.id);
            if (partner) {
                const updatedPartner = {
                    ...partner,
                    amount: updated.amount,
                    date: updated.date,
                    longDescription: updated.longDescription,
                };
                updateGeneralTransaction(updatedPartner);
            }
        }
        if (updateGeneralTransaction) updateGeneralTransaction(updated);
        setEditingTransaction(null);
    };

    const handleDeleteTransaction = (id: string) => {
        const txToDelete = generalTransactions.find(t => t.id === id);

        if (txToDelete?.transferGroupId) {
            const confirmed = confirm("This is a Transfer entry. Deleting it will also remove the balanced entry in the linked account. Continue?");
            if (!confirmed) return;

            const partner = generalTransactions.find(t => t.transferGroupId === txToDelete.transferGroupId && t.id !== id);
            if (partner && deleteGeneralTransaction) {
                deleteGeneralTransaction(partner.id);
            }
        }

        if (deleteGeneralTransaction) deleteGeneralTransaction(id);
        setEditingTransaction(null);
    };

    // --- DATE RANGE LOGIC ---
    const getWeekRange = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const getMonthRange = (date: Date) => {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const getYearRange = (date: Date) => {
        const start = new Date(date.getFullYear(), 0, 1);
        const end = new Date(date.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    // Calculate Active Range based on viewMode
    const activeRange = useMemo(() => {
        // If Budget View, use the Financial Period Dates
        if (viewMode === 'Budget' && activeBudgetPeriod) {
            const start = new Date(activeBudgetPeriod.startDate);
            const end = new Date(activeBudgetPeriod.endDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        // Else use standard filters
        if (periodType === 'Weekly') return getWeekRange(currentDate);
        if (periodType === 'Annually') return getYearRange(currentDate);
        if (periodType === 'Period') {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            return { start, end };
        }
        return getMonthRange(currentDate);
    }, [currentDate, periodType, customStartDate, customEndDate, viewMode, activeBudgetPeriod]);

    const dateDisplay = useMemo(() => {
        if (viewMode === 'Budget') {
            return activeBudgetPeriod?.name || "Select Period";
        }
        if (periodType === 'Period') {
            const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${formatDate(customStartDate)} ~ ${formatDate(customEndDate)}`;
        }
        if (periodType === 'Weekly') {
            const f = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            return `${f(activeRange.start)} ~ ${f(activeRange.end)}/${activeRange.end.getFullYear()}`;
        }
        if (periodType === 'Annually') return currentDate.getFullYear().toString();
        return currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    }, [activeRange, periodType, currentDate, viewMode, activeBudgetPeriod, customStartDate, customEndDate]);

    // --- DATA FILTERING ---
    const allMonthTransactions = useMemo(() => {
        const startStr = activeRange.start.toISOString().split('T')[0];
        const endStr = activeRange.end.toISOString().split('T')[0];
        return generalTransactions.filter(t => {
            return t.date >= startStr && t.date <= endStr;
        });
    }, [generalTransactions, activeRange]);

    const incomeTotal = useMemo(() =>
        allMonthTransactions
            .filter(t => t.type === 'Income' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]')
            .reduce((s, t) => s + Number(t.amount), 0),
        [allMonthTransactions]);

    const expenseTotal = useMemo(() =>
        allMonthTransactions
            .filter(t => t.type === 'Expense' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]')
            .reduce((s, t) => s + Number(t.amount), 0),
        [allMonthTransactions]);

    const totalAmount = filterType === 'Income' ? incomeTotal : expenseTotal;

    // Filter by type (Income/Expense)
    const activeTransactions = useMemo(() => {
        return allMonthTransactions.filter(t => t.type === filterType);
    }, [allMonthTransactions, filterType]);

    // --- COMPUTED BUDGET DATA ---
    const budgetData = useMemo(() => {
        if (!activeBudgetPeriod) return [];

        const categoryDefs = filterType === 'Income' ? incomeCategories : expenseCategories;
        const limits = filterType === 'Income' ? (activeBudgetPeriod.budgetIncomeCategories || []) : (activeBudgetPeriod.budgetCategories || []);

        const budgetMap = new Map<string, { total: number }>();

        limits.forEach(limit => {
            const def = categoryDefs.find(c => c.id === limit.categoryId);
            if (def) {
                let total = Number(limit.baseAmount);
                if (limit.allowSubcategories && limit.subcategories.length > 0) {
                    const limitTotal = limit.subcategories.reduce((acc, sub) => acc + sub.amount, 0);
                    if (limitTotal > 0) total = limitTotal;
                }
                budgetMap.set(def.name, { total });
            }
        });

        const distinctMainCategories = Array.from(new Set([
            ...Array.from(budgetMap.keys()),
            ...activeTransactions.map(t => t.category.split('/')[0])
        ]));

        return distinctMainCategories.map(mainCat => {
            const budgetInfo = budgetMap.get(mainCat);
            const budgetAmt = budgetInfo ? budgetInfo.total : 0;

            const totalSpent = activeTransactions
                .filter(t => t.category.split('/')[0] === mainCat)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            return {
                category: mainCat,
                budget: budgetAmt,
                spent: totalSpent,
                remaining: budgetAmt - totalSpent,
                percent: budgetAmt > 0 ? (totalSpent / budgetAmt) * 100 : totalSpent > 0 ? 100 : 0
            };
        }).sort((a, b) => b.spent - a.spent);

    }, [activeBudgetPeriod, activeTransactions, expenseCategories, incomeCategories, filterType]);

    // --- DISPLAY DATA (Pie/Notes) ---
    const pieData = useMemo(() => {
        const groups: Record<string, number> = {};
        activeTransactions.forEach(t => {
            if (t.category === '[Transfer In]' || t.category === '[Transfer Out]') return;
            const mainCat = t.category.split('/')[0];
            groups[mainCat] = (groups[mainCat] || 0) + Number(t.amount);
        });

        const colors = [
            '#FF5252', '#FFB142', '#FFDA79', '#33D9B2',
            '#218C74', '#34ACE0', '#706FD3', '#aaa69d'
        ];

        return Object.entries(groups).map(([name, value], i) => ({
            name,
            value,
            color: colors[i % colors.length]
        })).sort((a, b) => b.value - a.value);
    }, [activeTransactions]);

    const noteData = useMemo(() => {
        const groups: Record<string, number> = {};
        activeTransactions.forEach(t => {
            if (t.category === '[Transfer In]' || t.category === '[Transfer Out]') return;
            const label = t.description || 'Unspecified';
            groups[label] = (groups[label] || 0) + Number(t.amount);
        });
        const list = Object.entries(groups).map(([note, amount]) => ({ note, amount }));
        return list.sort((a, b) => sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount);
    }, [activeTransactions, sortOrder]);


    // --- NAV HELPERS ---
    const navigateDate = (direction: 'next' | 'prev') => {
        const newDate = new Date(currentDate);
        const modifier = direction === 'next' ? 1 : -1;
        if (periodType === 'Weekly') newDate.setDate(newDate.getDate() + (7 * modifier));
        else if (periodType === 'Annually') newDate.setFullYear(newDate.getFullYear() + modifier);
        else newDate.setMonth(newDate.getMonth() + modifier);
        setCurrentDate(newDate);
    };


    return (
        <div className="h-full w-full bg-slate-900 flex flex-col font-sans text-slate-100">
            <div className="flex-1 w-full bg-slate-900 shadow-sm overflow-hidden flex flex-col h-full rounded-tl-3xl border-l border-t border-slate-800">

                {/* HEADER */}
                <div className="bg-slate-900 z-50 px-6 pt-6 pb-2 border-b border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-semibold text-gray-500">Overview</div>
                        <div className="flex gap-2">
                            <div className="w-5 h-5 bg-slate-800 rounded-full text-[10px] text-white flex items-center justify-center shadow-sm">?</div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 flex bg-slate-800 p-1 rounded-xl text-xs font-semibold relative">
                            {['Stats', 'Budget', 'Note'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode as any)}
                                    className={`flex-1 py-2 rounded-lg transition-all duration-300 ${viewMode === mode
                                        ? 'bg-slate-700 text-white shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        {viewMode !== 'Budget' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                                    className="h-full bg-slate-800 border border-slate-700 shadow-sm rounded-xl px-3 flex items-center justify-center text-white font-bold hover:bg-slate-700 transition-colors w-12"
                                >
                                    {periodType === 'Weekly' ? 'W' : periodType === 'Annually' ? 'Y' : periodType === 'Period' ? 'P' : 'M'}
                                    <span className="ml-1 text-[8px] opacity-60">▼</span>
                                </button>
                                {showPeriodMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-32 bg-slate-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50 animate-fade-in">
                                        {['Weekly', 'Monthly', 'Annually', 'Period'].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => { setPeriodType(p as PeriodType); setShowPeriodMenu(false); }}
                                                className="w-full text-left px-4 py-3 text-xs font-semibold text-gray-300 hover:bg-slate-700 hover:text-white flex justify-between items-center"
                                            >
                                                {p}
                                                {periodType === p && <span className="text-blue-500 text-[10px]">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Custom Date Range Inputs */}
                    {viewMode !== 'Budget' && periodType === 'Period' && (
                        <div className="mb-4 px-2 animate-fade-in">
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Custom Date Range</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1 font-semibold">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStartDate.toISOString().split('T')[0]}
                                            onChange={(e) => setCustomStartDate(new Date(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1 font-semibold">End Date</label>
                                        <input
                                            type="date"
                                            value={customEndDate.toISOString().split('T')[0]}
                                            onChange={(e) => setCustomEndDate(new Date(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DYNAMIC NAVIGATOR */}
                    {viewMode === 'Budget' ? (
                        <div className="relative mb-3 group">
                            <button
                                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                                className="flex justify-between items-center w-full px-2 py-1 hover:bg-slate-800 rounded-lg transition-colors text-left"
                            >
                                <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                    {selectedCategory && (budgetViewMode === 'Transactions' || budgetViewMode === 'SubCategories') ? (
                                        <span className="text-white">{selectedCategory}</span>
                                    ) : (
                                        <span>{dateDisplay}</span>
                                    )}

                                    {!(selectedCategory && (budgetViewMode === 'Transactions' || budgetViewMode === 'SubCategories')) && (
                                        <span className="text-xs opacity-50 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Financial Period</span>
                                    )}
                                </div>
                                {!(selectedCategory && (budgetViewMode === 'Transactions' || budgetViewMode === 'SubCategories')) && (
                                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${showPeriodMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                )}
                            </button>

                            {showPeriodMenu && (
                                <div className="absolute top-full left-0 mt-2 w-full md:w-64 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-[100] animate-fade-in max-h-80 overflow-y-auto">
                                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-slate-950/50">Select Financial Period</div>
                                    {budgetPeriods.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedPeriodId(p.id);
                                                setShowPeriodMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold flex justify-between items-center border-b border-slate-800/50 last:border-0 hover:bg-slate-800 transition-colors
                                                    ${p.id === selectedPeriodId ? 'text-white bg-slate-800' : 'text-gray-400'}`}
                                        >
                                            <div>
                                                <div>{p.name}</div>
                                                <div className="text-[10px] opacity-50 font-mono mt-0.5">{new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</div>
                                            </div>
                                            {p.status === 'Active' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Active</span>}
                                        </button>
                                    ))}
                                    {budgetPeriods.length === 0 && <div className="p-4 text-center text-gray-500 text-xs">No periods found. Configure in Settings.</div>}
                                    <div className="p-2 border-t border-slate-800">
                                        <button className="w-full py-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-slate-950/30 rounded hover:bg-slate-950/50 transition-colors">
                                            Manage Periods
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mb-3 px-2">
                            <button onClick={() => navigateDate('prev')} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="text-xl font-bold tracking-tight text-white">{dateDisplay}</div>
                            <button onClick={() => navigateDate('next')} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}

                    {/* TOTALS */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                        <button
                            onClick={() => setFilterType('Income')}
                            className={`flex flex-col items-start px-2 py-1 rounded-lg transition-all ${filterType === 'Income' ? 'bg-blue-900/40' : 'hover:bg-slate-800'}`}
                        >
                            <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${filterType === 'Income' ? 'text-blue-400' : 'text-gray-500'}`}>
                                Income
                            </span>
                            <span className={`font-bold text-sm tracking-tight ${filterType === 'Income' ? 'text-white' : 'text-gray-500'}`}>
                                <span className="text-[10px] text-gray-500 mr-0.5">USh</span>
                                {formatMoney(incomeTotal).replace('UGX ', '')}
                            </span>
                        </button>

                        <button
                            onClick={() => setFilterType('Expense')}
                            className={`flex flex-col items-end px-2 py-1 rounded-lg transition-all ${filterType === 'Expense' ? 'bg-red-900/40' : 'hover:bg-slate-800'}`}
                        >
                            <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${filterType === 'Expense' ? 'text-red-400' : 'text-gray-500'}`}>
                                Expense
                            </span>
                            <span className={`font-bold text-sm tracking-tight ${filterType === 'Expense' ? 'text-white' : 'text-gray-500'}`}>
                                <span className="text-[10px] text-gray-500 mr-0.5">USh</span>
                                {formatMoney(expenseTotal).replace('UGX ', '')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto bg-slate-900">
                    <div className="max-w-5xl mx-auto p-4 md:p-8">
                        {/* VIEW: STATS */}
                        {viewMode === 'Stats' && (
                            <div className="animate-fade-in flex flex-col items-center w-full">
                                {!selectedCategory ? (
                                    <>
                                        <div className="mb-8 drop-shadow-sm w-full flex justify-center">
                                            <PieChart data={pieData} size={400} donut={true} />
                                        </div>
                                        <div className="w-full space-y-3 pb-20 max-w-5xl">
                                            {pieData.map((item, i) => {
                                                const percent = totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : '0.0';
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => { setSelectedCategory(item.name); setSelectedSubCategory(null); }}
                                                        className="flex justify-between items-center p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-sm hover:border-slate-600 hover:bg-slate-700 transition-all group active:scale-[0.98] cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm" style={{ backgroundColor: item.color }}>
                                                                {Math.round(Number(percent))}%
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-300 uppercase tracking-wide text-[10px] group-hover:text-white transition-colors">{item.name}</span>
                                                                <div className="w-20 bg-slate-700 h-1 mt-1 rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-gray-200 text-xs text-right">
                                                                <span className="text-gray-500 text-[10px] font-normal mr-1">USh</span>
                                                                {Number(item.value).toLocaleString()}
                                                            </div>
                                                            <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full">
                                        {/* Drill-down for Stats View (simplified for now, can expand if needed) */}
                                        <button onClick={() => setSelectedCategory(null)} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" /></svg>
                                            Back to Overview
                                        </button>
                                        <div className="text-2xl font-bold text-white mb-4">{selectedCategory}</div>
                                        {/* List transactions for this category in Stats Mode */}
                                        <div className="space-y-3 pb-20">
                                            {activeTransactions.filter(t => t.category.split('/')[0] === selectedCategory).map((t, idx) => (
                                                <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                                                    <div>
                                                        <div className="text-white text-sm font-semibold">{t.description || "Unspecified"}</div>
                                                        <div className="text-[10px] text-gray-500">{new Date(t.date).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="text-right font-bold text-white text-sm">
                                                        {Number(t.amount).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: BUDGET (Interactive Restoration) */}
                        {viewMode === 'Budget' && (
                            <div className="animate-fade-in">

                                {/* DEFAULT LIST VIEW */}
                                {budgetViewMode === 'Default' && (
                                    <>
                                        {/* Summary Card */}
                                        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 mb-8 text-white shadow-xl shadow-slate-200 ring-1 ring-black/5 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
                                            <div className="flex justify-between items-start mb-6 relative z-10 w-full">
                                                <div>
                                                    <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Remaining (Period)</div>
                                                    <div className={`text-4xl md:text-5xl font-bold tracking-tight ${budgetData.reduce((s, b) => s + b.remaining, 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                                                        <span className="text-2xl opacity-60 font-normal mr-2">USh</span>
                                                        {budgetData.reduce((s, b) => s + b.remaining, 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Calculated Percentage Correction */}
                                            {(() => {
                                                const totalBudget = budgetData.reduce((s, b) => s + b.budget, 0);
                                                const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
                                                const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

                                                return (
                                                    <div className="relative z-10 max-w-2xl">
                                                        <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                                                            <span>Period Progress</span>
                                                            <span className="text-white">
                                                                {Math.round(percentUsed)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-800 rounded-full h-3 mb-4 border border-slate-700/50">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                                                style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex gap-8 text-xs opacity-80">
                                                            <div><span className="text-slate-500 mr-2 font-bold">BUDGET</span> <span className="text-white">{totalBudget.toLocaleString()}</span></div>
                                                            <div><span className="text-slate-500 mr-2 font-bold">SPENT</span> <span className="text-blue-200">{totalSpent.toLocaleString()}</span></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Categories List (Redesigned Table-Row Style) */}
                                        <div className="pb-20">
                                            {budgetData.map((item, idx) => (
                                                <div key={idx} className="py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors px-2 relative group">
                                                    {/* Row 1: Name | Bar | Percent */}
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div
                                                            onClick={() => { setSelectedCategory(item.category); setBudgetViewMode('SubCategories'); }}
                                                            className="w-1/3 text-sm font-bold text-white uppercase tracking-wide truncate cursor-pointer hover:text-blue-400 transition-colors"
                                                        >
                                                            {item.category}
                                                        </div>

                                                        {/* Interactive Bar */}
                                                        <div
                                                            onClick={() => { setSelectedCategory(item.category); setBudgetViewMode('Transactions'); }}
                                                            className="w-1/3 px-4 cursor-pointer"
                                                        >
                                                            <div className="h-3 w-full bg-slate-800 rounded flex overflow-hidden">
                                                                <div
                                                                    className={`h-full ${item.remaining < 0 ? 'bg-red-500' : 'bg-blue-500'} rounded`}
                                                                    style={{ width: `${Math.min(100, item.percent)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        <div className="w-1/3 text-right font-bold text-white text-sm">
                                                            {item.percent > 0 ? item.percent.toFixed(0) : '0'}%
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Values */}
                                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                                        <div className="w-1/3 text-slate-500">
                                                            <span className="opacity-50 mr-1">BUDGET</span>
                                                            <span className="text-slate-300 font-bold">{item.budget.toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-1/3 text-center text-blue-400/80">
                                                            <span className="font-bold">{item.spent.toLocaleString()}</span>
                                                        </div>
                                                        <div className={`w-1/3 text-right ${item.remaining < 0 ? 'text-red-400' : 'text-emerald-500/80'}`}>
                                                            <span className="font-bold">{item.remaining.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {budgetData.length === 0 && <div className="text-center py-10 text-gray-500">No budget data set for this period.</div>}
                                        </div>
                                    </>
                                )}

                                {/* DRILL DOWN: SUBCATEGORIES (Refined Design) */}
                                {budgetViewMode === 'SubCategories' && selectedCategory && (
                                    <div className="animate-fade-in relative">

                                        {/* Back Button & Header */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <button
                                                onClick={() => { setSelectedCategory(null); setBudgetViewMode('Default'); }}
                                                className="flex items-center gap-1 text-white font-bold text-sm hover:text-gray-300 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                                Back
                                            </button>
                                            <div className="text-xl font-bold text-white uppercase tracking-wider">{selectedCategory}</div>
                                        </div>


                                        {/* Summary Card for Selected Category */}
                                        {(() => {
                                            const stat = budgetData.find(b => b.category === selectedCategory);
                                            if (!stat) return null;
                                            return (
                                                <div className="mb-8 py-4 px-2 border-b border-slate-700/50">
                                                    {/* Row 1: Name | Bar | Percent */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="text-lg font-bold text-white uppercase tracking-wide truncate w-1/3">
                                                            {stat.category}
                                                        </div>
                                                        <div className="w-1/3 px-4">
                                                            <div className="h-4 w-full bg-slate-800 rounded flex overflow-hidden border border-slate-700">
                                                                <div
                                                                    className={`h-full ${stat.remaining < 0 ? 'bg-red-500' : 'bg-blue-500'} rounded`}
                                                                    style={{ width: `${Math.min(100, stat.percent)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="w-1/3 text-right font-bold text-white text-xl">
                                                            {stat.percent > 0 ? stat.percent.toFixed(0) : '0'}%
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Values */}
                                                    <div className="flex items-center justify-between text-xs font-mono">
                                                        <div className="w-1/3 text-slate-400">
                                                            <span className="opacity-50 mr-1 block text-[10px]">BUDGET</span>
                                                            <span className="text-white font-bold text-sm">USh {stat.budget.toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-1/3 text-center text-blue-400">
                                                            <span className="opacity-50 mr-1 block text-[10px]">SPENT</span>
                                                            <span className="font-bold text-sm">{stat.spent.toLocaleString()}</span>
                                                        </div>
                                                        <div className={`w-1/3 text-right ${stat.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            <span className="opacity-50 mr-1 block text-[10px]">REMAINING</span>
                                                            <span className="font-bold text-sm">{stat.remaining.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Sub-Category List */}
                                        <div className="space-y-0.5 pb-20">
                                            {(() => {
                                                const subStats: Record<string, number> = {};
                                                activeTransactions
                                                    .filter(t => t.category.startsWith(selectedCategory))
                                                    .forEach(t => {
                                                        const parts = t.category.split('/');
                                                        const sub = parts[1] || 'Uncategorized';
                                                        subStats[sub] = (subStats[sub] || 0) + Number(t.amount);
                                                    });

                                                const list = Object.entries(subStats).sort((a, b) => b[1] - a[1]);

                                                return list.map(([subName, amount], i) => (
                                                    <div key={i} className="flex justify-between items-center py-4 px-2 border-b border-slate-800 text-sm group hover:bg-slate-800/20 transition-colors">
                                                        <div className="font-semibold text-slate-300 group-hover:text-white transition-colors">
                                                            {subName}
                                                        </div>
                                                        <div className="font-bold text-slate-200 font-mono">
                                                            {amount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                            {activeTransactions.filter(t => t.category.startsWith(selectedCategory)).length === 0 && (
                                                <div className="text-center py-10 text-gray-500">No transactions recorded for this category yet.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* DRILL DOWN: TRANSACTIONS (New Design) */}
                                {budgetViewMode === 'Transactions' && selectedCategory && (
                                    <div className="animate-fade-in relative text-slate-200">
                                        {/* TOP NAV */}
                                        <div className="flex justify-between items-center mb-6">
                                            <button
                                                onClick={() => { setSelectedCategory(null); setBudgetViewMode('Default'); }}
                                                className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                            <div className="font-bold text-lg">{selectedCategory}</div>
                                            <button className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors opacity-0 cursor-default">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>

                                        {/* SUMMARY HEADER (Budget, Used, Remaining) */}
                                        {(() => {
                                            const stat = budgetData.find(b => b.category === selectedCategory);
                                            if (!stat) return null;
                                            return (
                                                <div className="mb-8">
                                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 px-2">
                                                        <div>Budget</div>
                                                        <div className="text-center">Used Amount</div>
                                                        <div className="text-right">Remaining</div>
                                                    </div>
                                                    <div className="flex justify-between items-end bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                                        <div className="text-xs font-bold text-gray-300">
                                                            {(stat.budget).toLocaleString()}
                                                        </div>
                                                        <div className="text-xl font-bold text-red-400">
                                                            <span className="text-xs text-red-500/50 mr-1">USh</span>
                                                            {(stat.spent).toLocaleString()}
                                                        </div>
                                                        <div className={`text-xs font-bold ${stat.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {(stat.remaining).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    {/* Simple Timeline Visualization */}
                                                    <div className="relative mt-6 px-2">
                                                        <div className="h-0.5 w-full bg-slate-700 rounded-full relative flex items-center justify-between">
                                                            {/* Decorations */}
                                                            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                                                            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                                                            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>

                                                            {/* Active Indicator (Mock position based on % used) */}
                                                            <div
                                                                className="absolute h-3 w-3 bg-red-400 rounded-full border-2 border-slate-900 shadow-lg"
                                                                style={{ left: `${Math.min(100, Math.max(0, stat.percent))}%`, transform: 'translateX(-50%)' }}
                                                            ></div>
                                                            <div
                                                                className="absolute top-3 h-8 w-0.5 bg-red-400/50"
                                                                style={{ left: `${Math.min(100, Math.max(0, stat.percent))}%`, transform: 'translateX(-50%)' }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-600">
                                                            <span>Start</span>
                                                            <span>Mid</span>
                                                            <span>End</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* TRANSACTION LIST (Grouped by Date) */}
                                        <div className="space-y-6 pb-20">
                                            {(() => {
                                                const filteredTrans = activeTransactions
                                                    .filter(t => t.category.startsWith(selectedCategory as string))
                                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                                if (filteredTrans.length === 0) return <div className="text-center py-10 text-gray-500">No transactions.</div>;

                                                // Group
                                                const groups: Record<string, GeneralTransaction[]> = {};
                                                filteredTrans.forEach(t => {
                                                    const d = new Date(t.date).toDateString();
                                                    if (!groups[d]) groups[d] = [];
                                                    groups[d].push(t);
                                                });

                                                return Object.entries(groups).map(([dateStr, items], grpIdx) => {
                                                    const dateObj = new Date(dateStr);
                                                    const dayNum = dateObj.getDate();
                                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                    const monthYear = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // 11/2025 in original, used short month here for readability

                                                    return (
                                                        <div key={grpIdx} className="animate-fade-in-up" style={{ animationDelay: `${grpIdx * 50}ms` }}>
                                                            {/* Date Header */}
                                                            <div className="flex items-baseline gap-2 mb-3 border-l-4 border-slate-700 pl-3">
                                                                <span className="text-2xl font-bold text-white">{dayNum}</span>
                                                                <span className="text-sm font-bold text-gray-400 bg-slate-800 px-1 rounded">{dayName}</span>
                                                                <span className="text-xs text-gray-600 font-medium ml-1">{monthYear}</span>
                                                            </div>

                                                            {/* Items */}
                                                            <div className="space-y-3 pl-2">
                                                                {items.map((t, idx) => (
                                                                    <div key={idx} onClick={() => setEditingTransaction(t)} className="flex items-start justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/30 rounded px-2 transition-colors cursor-pointer group">
                                                                        <div className="max-w-[70%]">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                                                                    {t.category.includes('/') ? t.category.split('/')[1] : 'General'}
                                                                                </span>
                                                                                <span className="text-sm font-bold text-gray-200 group-hover:text-blue-300 transition-colors">
                                                                                    {t.description || "Unspecified Description"}
                                                                                </span>
                                                                                {t.paidBy && <span className="text-[10px] text-gray-600 mt-0.5 opacity-60">Via {t.paidBy}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-sm font-bold text-red-400">
                                                                                <span className="text-[10px] text-red-500/50 mr-1">USh</span>
                                                                                {Number(t.amount).toLocaleString()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: NOTE */}
                        {viewMode === 'Note' && (
                            <div className="space-y-3 pb-20 max-w-5xl mx-auto">
                                <div className="flex justify-end mb-2">
                                    <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="text-[10px] uppercase font-bold tracking-wide text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                                        Sort {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                                {noteData.map((item, id) => (
                                    <div key={id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-sm flex justify-between items-center group hover:bg-slate-700/50 transition-all">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide group-hover:text-blue-400 transition-colors">{item.note}</span>
                                        <span className="font-bold text-white tracking-tight text-sm"><span className="text-[10px] text-gray-500 mr-1 font-normal">USh</span>{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals placed here if needed */}
            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                    onSave={handleSaveTransaction}
                    onDelete={handleDeleteTransaction}
                />
            )}
        </div>
    );
}
