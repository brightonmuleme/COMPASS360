"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, GeneralTransaction, TransactionType, GeneralTransaction as GT } from '@/lib/store';
import Calculator from '@/components/ui/Calculator';
import SelectionGrid from '@/components/ui/SelectionGrid';
import CategoryManager from '@/components/ui/CategoryManager';
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal';
import { RequisitionViewModal } from '@/components/requisitions/RequisitionViewModal';
import { Requisition } from '@/lib/store';

const formatMoney = (amount: number) => `UGX ${amount.toLocaleString()}`;

export default function TransactionsPage() {
    const { generalTransactions, addGeneralTransaction, updateGeneralTransaction, deleteGeneralTransaction, activeRole, expenseCategories, incomeCategories, accounts, accountGroups, transactionSettings } = useSchoolData();

    // VIEW STATE
    const [viewMode, setViewMode] = useState<'daily' | 'calendar' | 'monthly' | 'summary'>('daily');
    // Store selected month as "YYYY-MM"
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    // MODAL STATE
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [formData, setFormData] = useState<Partial<GT>>({
        type: 'Expense',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'Cash'
    });

    // SEARCH STATE
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSearchTerm, setSelectedSearchTerm] = useState<string | null>(null);

    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [activeSelection, setActiveSelection] = useState<'Category' | 'Account' | 'FromAccount' | 'ToAccount' | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // SCROLL STATE
    const [scrollToDate, setScrollToDate] = useState<string | null>(null);

    // EFFECT: Scroll to date when requested
    React.useEffect(() => {
        if (scrollToDate && viewMode === 'daily') {
            // Small timeout to allow render
            setTimeout(() => {
                const el = document.getElementById(`date-${scrollToDate}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            setScrollToDate(null);
        }
    }, [scrollToDate, viewMode]);

    // EDIT STATE
    // EDIT STATE
    const [editingTransaction, setEditingTransaction] = useState<GT | null>(null);
    const [viewingRequisition, setViewingRequisition] = useState<Requisition | null>(null);
    const { requisitions } = useSchoolData();

    const handleSaveEdit = (tx: GT) => {
        if (tx.transferGroupId && updateGeneralTransaction) {
            const partner = generalTransactions.find(p => p.transferGroupId === tx.transferGroupId && p.id !== tx.id);
            if (partner) {
                const updatedPartner = {
                    ...partner,
                    amount: tx.amount,
                    date: tx.date,
                    longDescription: tx.longDescription,
                };
                updateGeneralTransaction(updatedPartner);
            }
        }
        if (updateGeneralTransaction) updateGeneralTransaction(tx);
        setEditingTransaction(null);
    };

    const handleDeleteEdit = (id: string) => {
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

    // --- HELPER: GROUP BY DATE ---
    const transactionsByDay = useMemo(() => {
        // Filter for current month
        const monthTx = generalTransactions.filter(t => t.date.startsWith(selectedMonth));

        const groups: Record<string, GT[]> = {};

        // Group existing
        monthTx.forEach(tx => {
            if (!groups[tx.date]) groups[tx.date] = [];
            groups[tx.date].push(tx);
        });

        // Carry Over Logic
        if (transactionSettings?.carryOver) {
            const startDate = `${selectedMonth}-01`;
            // Calculate balance strictly before this month
            const previousTxs = generalTransactions.filter(t => t.date < startDate);
            const inc = previousTxs.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
            const exp = previousTxs.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
            const balance = inc - exp;

            // Always show if enabled? Or only if non-zero? 
            // User screenshot shows "USh 0.00 USh 180.00" -> Balance 180.
            // Let's show it.
            const carryOverTx: GT = {
                id: `carry_over_${selectedMonth}`,
                date: startDate,
                amount: Math.abs(balance),
                type: balance >= 0 ? 'Income' : 'Expense',
                category: '[Carry-over]',
                description: 'Balance b/f',
                mode: 'Cash', // Dummy
                method: 'Cash', // Dummy
                recordedBy: 'System',
                longDescription: 'Carry over balance from previous periods'
            } as GT;

            if (!groups[startDate]) groups[startDate] = [];
            // Add to END of the list for the 1st (visually bottom if standard order, or top if reversed?
            // Actually, if we want it at the BOTTOM of the day list, and the day list is rendered in order 0..N,
            // we should push it to the end.
            groups[startDate].push(carryOverTx);
        }

        // Sort dates descending
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [generalTransactions, selectedMonth, transactionSettings]);

    const monthlyStats = useMemo(() => {
        const monthTx = generalTransactions.filter(t => t.date.startsWith(selectedMonth));
        let income = 0;
        let expense = 0;

        monthTx.forEach(t => {
            // Exclude transfers and legacy Transfer type from P&L
            if (t.type === 'Transfer' || t.category === '[Transfer Out]' || t.category === '[Transfer In]') return;
            if (t.type === 'Income') income += Number(t.amount || 0);
            if (t.type === 'Expense') expense += Number(t.amount || 0);
        });

        if (transactionSettings?.carryOver) {
            const startDate = `${selectedMonth}-01`;
            const previousTxs = generalTransactions.filter(t => t.date < startDate);
            const prevInc = previousTxs.filter(t => t.type === 'Income' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const prevExp = previousTxs.filter(t => t.type === 'Expense' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const balance = prevInc - prevExp;

            if (balance >= 0) income += balance;
            else expense += Math.abs(balance);
        }

        return { income, expense, total: income - expense };
    }, [generalTransactions, selectedMonth, transactionSettings]);

    // --- ACTIONS ---
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newAttachment = event.target.result as string;
                    setFormData(prev => ({
                        ...prev,
                        attachments: [...(prev.attachments || []), newAttachment]
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter((_, i) => i !== index)
        }));
    };

    const handleSave = () => {
        if (!formData.amount) {
            alert("Amount is required");
            return;
        }
        if (formData.type !== 'Transfer' && !formData.category) {
            alert("Category is required");
            return;
        }
        if (formData.type === 'Transfer') {
            if (!formData.fromAccount || !formData.toAccount) {
                alert("Source and Destination accounts are required for transfers");
                return;
            }
            if (formData.fromAccount === formData.toAccount) {
                alert("Source and Destination accounts cannot be the same");
                return;
            }
        }

        if (formData.type === 'Transfer') {
            const transferGroupId = `tr_${Date.now()}`;
            const amount = Number(formData.amount);

            // Record 1: Outbound (Expense)
            const outTx: GT = {
                id: `tx_${Date.now()}_out`,
                date: formData.date!,
                amount: amount,
                type: 'Expense',
                category: '[Transfer Out]',
                description: formData.description || `Transfer to ${formData.toAccount}`,
                method: formData.fromAccount!,
                mode: formData.fromAccount!,
                transferGroupId,
                recordedBy: activeRole || 'Unknown'
            };

            // Record 2: Inbound (Income)
            const inTx: GT = {
                id: `tx_${Date.now()}_in`,
                date: formData.date!,
                amount: amount,
                type: 'Income',
                category: '[Transfer In]',
                description: formData.description || `Transfer from ${formData.fromAccount}`,
                method: formData.toAccount!,
                mode: formData.toAccount!,
                transferGroupId,
                recordedBy: activeRole || 'Unknown'
            };

            addGeneralTransaction(outTx);
            addGeneralTransaction(inTx);
        } else {
            const newTx: GT = {
                id: `tx_${Date.now()}`,
                date: formData.date!,
                amount: Number(formData.amount),
                type: formData.type as TransactionType,
                category: formData.category!,
                description: formData.description || '',
                longDescription: formData.longDescription,
                attachments: formData.attachments,
                mode: formData.method as any,
                method: formData.method as any,
                recordedBy: activeRole || 'Unknown'
            };
            addGeneralTransaction(newTx);
        }

        setIsAddModalOpen(false);
        setFormData({ type: 'Expense', amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' });
    };

    const handleContinue = () => {
        if (!formData.amount) {
            alert("Amount is required");
            return;
        }
        if (formData.type !== 'Transfer' && !formData.category) {
            alert("Category is required");
            return;
        }
        if (formData.type === 'Transfer') {
            if (!formData.fromAccount || !formData.toAccount) {
                alert("Source and Destination accounts are required for transfers");
                return;
            }
            if (formData.fromAccount === formData.toAccount) {
                alert("Source and Destination accounts cannot be the same");
                return;
            }
        }

        if (formData.type === 'Transfer') {
            const transferGroupId = `tr_${Date.now()}`;
            const amount = Number(formData.amount);

            const outTx: GT = {
                id: `tx_${Date.now()}_out`,
                date: formData.date!,
                amount: amount,
                type: 'Expense',
                category: '[Transfer Out]',
                description: formData.description || `Transfer to ${formData.toAccount}`,
                method: formData.fromAccount!,
                mode: formData.fromAccount!,
                transferGroupId,
                recordedBy: activeRole || 'Unknown'
            };

            const inTx: GT = {
                id: `tx_${Date.now()}_in`,
                date: formData.date!,
                amount: amount,
                type: 'Income',
                category: '[Transfer In]',
                description: formData.description || `Transfer from ${formData.fromAccount}`,
                method: formData.toAccount!,
                mode: formData.toAccount!,
                transferGroupId,
                recordedBy: activeRole || 'Unknown'
            };

            addGeneralTransaction(outTx);
            addGeneralTransaction(inTx);
        } else {
            const newTx: GT = {
                id: `tx_${Date.now()}`,
                date: formData.date!,
                amount: Number(formData.amount),
                type: formData.type as TransactionType,
                category: formData.category!,
                description: formData.description || '',
                longDescription: formData.longDescription,
                attachments: formData.attachments,
                mode: formData.method as any,
                method: formData.method as any,
                recordedBy: activeRole || 'Unknown'
            };
            addGeneralTransaction(newTx);
        }

        setFormData({ type: 'Expense', amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' });
    };

    // --- RENDER HELPERS ---
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // --- RENDER HELPERS ---
    const DateHeader = () => {
        if (viewMode === 'monthly') {
            return (
                <div className="flex justify-between items-center mb-4 text-white">
                    <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-white/10 rounded-full">←</button>
                    <div className="text-center">
                        <div className="text-xl font-bold">{selectedYear}</div>
                    </div>
                    <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-white/10 rounded-full">→</button>
                </div>
            );
        }

        const dateObj = new Date(selectedMonth + "-01");
        return (
            <div className="flex justify-between items-center mb-4 text-white">
                <button onClick={() => {
                    const d = new Date(selectedMonth + "-01");
                    d.setMonth(d.getMonth() - 1);
                    setSelectedMonth(d.toISOString().slice(0, 7));
                }} className="p-2 hover:bg-white/10 rounded-full">←</button>

                <div className="text-center">
                    <div className="text-xl font-bold">{dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
                </div>

                <button onClick={() => {
                    const d = new Date(selectedMonth + "-01");
                    d.setMonth(d.getMonth() + 1);
                    setSelectedMonth(d.toISOString().slice(0, 7));
                }} className="p-2 hover:bg-white/10 rounded-full">→</button>
            </div>
        );
    };

    const SummaryHeader = ({ stats }: { stats: { income: number, expense: number, total: number } }) => (
        <div className="flex justify-between text-sm py-4 border-b border-gray-800 bg-gray-900/50 rounded-lg px-4 mb-4">
            <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">Income</div>
                <div className="text-blue-400 font-bold">{formatMoney(stats.income)}</div>
            </div>
            <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">Exp.</div>
                <div className="text-red-400 font-bold">{formatMoney(stats.expense)}</div>
            </div>
            <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">Total</div>
                <div className={`font-bold ${stats.total >= 0 ? 'text-white' : 'text-red-500'}`}>{formatMoney(stats.total)}</div>
            </div>
        </div>
    );

    // SEARCH LOGIC
    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowerQ = searchQuery.toLowerCase();

        const uniqueNotes = new Map<string, string>(); // lower -> original

        generalTransactions.forEach(t => {
            if (t.description && t.description.toLowerCase().includes(lowerQ)) {
                const lower = t.description.toLowerCase();
                if (!uniqueNotes.has(lower)) {
                    uniqueNotes.set(lower, t.description);
                }
            }
        });

        return Array.from(uniqueNotes.values()).slice(0, 8);
    }, [searchQuery, generalTransactions]);

    const searchResults = useMemo(() => {
        if (!selectedSearchTerm) return [];
        return generalTransactions.filter(t => t.description === selectedSearchTerm);
    }, [selectedSearchTerm, generalTransactions]);

    const statsForSearch = useMemo(() => {
        const income = searchResults.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const expense = searchResults.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, total: income - expense };
    }, [searchResults]);

    // HIGHLIGHT HELPER
    const HighlightMatch = ({ text, match }: { text: string, match: string }) => {
        if (!match) return <>{text}</>;
        const parts = text.split(new RegExp(`(${match})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === match.toLowerCase()
                        ? <span key={i} className="text-red-500 font-bold">{part}</span>
                        : <span key={i} className="text-gray-400">{part}</span>
                )}
            </span>
        );
    };

    if (isSearchActive) {
        return (
            <div className="w-full min-h-screen bg-white text-black animate-fade-in">
                {/* Search Header */}
                <div className="flex justify-between items-center px-4 py-4 border-b border-gray-100">
                    <button onClick={() => {
                        setIsSearchActive(false);
                        setSearchQuery('');
                        setSelectedSearchTerm(null);
                    }} className="text-xl font-bold text-gray-800">
                        ✕
                    </button>
                    <h1 className="text-lg font-bold">SEARCHED TOTALS (Partial Match)</h1>
                    <button className="p-2">
                        {/* Filter Icon Placeholder */}
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-gray-400">🔍</span>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search notes..."
                        className="bg-transparent flex-1 outline-none text-black font-medium"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedSearchTerm(null); // Reset selection on typing
                        }}
                    />
                    {searchQuery && (
                        <button onClick={() => {
                            setSearchQuery('');
                            setSelectedSearchTerm(null);
                        }} className="text-gray-400 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                    )}
                </div>

                {/* CONTENT AREA */}
                {!selectedSearchTerm ? (
                    /* SUGGESTIONS LIST */
                    <div className="divide-y divide-gray-50">
                        {searchSuggestions.map((note, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    setSearchQuery(note);
                                    setSelectedSearchTerm(note);
                                }}
                                className="px-4 py-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                            >
                                <span className="text-lg">
                                    <HighlightMatch text={note} match={searchQuery} />
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* RESULTS VIEW */
                    <div className="animate-fade-in relative bg-white">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 px-4 py-4 bg-gray-50/50 border-b border-gray-100 text-center text-xs">
                            <div>
                                <div className="text-gray-500 mb-1">Income</div>
                                <div className="text-blue-500 font-bold">{formatMoney(statsForSearch.income)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Exp.</div>
                                <div className="text-red-500 font-bold text-nowrap">{formatMoney(statsForSearch.expense)}....</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Transfer</div>
                                <div className="text-black font-bold">USh 0.00</div>
                            </div>
                            <div className="text-[10px] text-center text-gray-400 pb-2 italic">
                                ⚠️ These totals only reflect items containing the matching description text and may not represent full categories.
                            </div>
                        </div>

                        {/* List */}
                        <div className="divide-y divide-gray-100">
                            {searchResults.map(tx => (
                                <div key={tx.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingTransaction(tx)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('en-GB')}</div>
                                        <div className={`text-xs font-bold ${tx.type === 'Income' ? 'text-blue-500' : 'text-red-500'}`}>
                                            {formatMoney(tx.amount)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-black">{tx.description}</div>
                                        {/* Placeholder for sub-details if any */}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {tx.category} <span className="mx-1">•</span> {tx.mode || 'Cash'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-black">
            {/* Header / Nav */}
            <div className="flex justify-between items-center mb-6 px-8 pt-8">
                <h1 className="text-xl font-bold text-white">Activity Ledger</h1>
                <div className="flex gap-4 text-gray-400">
                    <button onClick={() => setIsSearchActive(true)}>🔍</button>
                    <button>⭐</button>
                </div>
            </div>

            <div className="px-8 pb-12">
                {/* View Tabs - Only Daily for now as per image focus, but keeping structure */}
                <DateHeader />

                <div className="flex justify-between text-sm text-gray-400 border-b border-gray-800 mb-4 overflow-x-auto">
                    {['Daily', 'Calendar', 'Monthly', 'Summary'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode.toLowerCase() as any)}
                            className={`pb-2 px-2 whitespace-nowrap ${viewMode === mode.toLowerCase() ? 'text-red-500 border-b-2 border-red-500' : ''}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                {/* View Content */}
                {/* CALENDAR VIEW START */}
                {viewMode === 'calendar' && (
                    <div className="animate-fade-in bg-gray-900 rounded-lg overflow-hidden min-h-[600px] border border-gray-800">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-gray-800 bg-gray-900/50">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                <div key={d} className={`py-3 text-center text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 h-full auto-rows-fr bg-gray-900">
                            {(() => {
                                // Generate Calendar Days
                                const [y, m] = selectedMonth.split('-').map(Number);
                                const firstDay = new Date(y, m - 1, 1);
                                const startDay = firstDay.getDay(); // 0=Sun
                                const daysInMonth = new Date(y, m, 0).getDate();

                                const days = [];

                                // Previous Month Padding
                                const prevMonthLastDate = new Date(y, m - 1, 0).getDate();
                                for (let i = startDay - 1; i >= 0; i--) {
                                    const d = prevMonthLastDate - i;
                                    const prevM = m === 1 ? 12 : m - 1;
                                    const prevY = m === 1 ? y - 1 : y;
                                    days.push({
                                        day: d,
                                        dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                                        isCurrent: false
                                    });
                                }

                                // Current Month
                                for (let i = 1; i <= daysInMonth; i++) {
                                    days.push({
                                        day: i,
                                        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                                        isCurrent: true
                                    });
                                }

                                // Next Month Padding (fill 42)
                                const remaining = 42 - days.length;
                                for (let i = 1; i <= remaining; i++) {
                                    const nextM = m === 12 ? 1 : m + 1;
                                    const nextY = m === 12 ? y + 1 : y;
                                    days.push({
                                        day: i,
                                        dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                                        isCurrent: false
                                    });
                                }

                                return days.map((dayObj, idx) => {
                                    // Calculate totals for this day
                                    // Note: We search the WHOLE generalTransactions list, not just `transactionsByDay` which is filtered to current month
                                    const dayTxs = generalTransactions.filter(t => t.date === dayObj.dateStr);
                                    const inc = dayTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0);
                                    const exp = dayTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);

                                    const isSunday = idx % 7 === 0;
                                    const isSaturday = idx % 7 === 6;

                                    return (
                                        <div
                                            key={dayObj.dateStr}
                                            onClick={() => {
                                                // 1. Update month if needed (e.g. clicked prev/next month day)
                                                // dayObj.dateStr is YYYY-MM-DD. selectedMonth is YYYY-MM.
                                                const clickedMonth = dayObj.dateStr.slice(0, 7);
                                                if (clickedMonth !== selectedMonth) {
                                                    setSelectedMonth(clickedMonth);
                                                }
                                                // 2. Switch to Daily View
                                                setViewMode('daily');
                                                // 3. Trigger scroll
                                                setScrollToDate(dayObj.dateStr);
                                            }}
                                            className={`
                                                min-h-[100px] border-b border-r border-gray-800 p-1 relative flex flex-col justify-between transition-colors hover:bg-gray-800/50 cursor-pointer
                                                ${!dayObj.isCurrent ? 'bg-gray-900/30 text-gray-600' : 'bg-gray-900 text-gray-200'}
                                            `}
                                        >
                                            {/* Day Number */}
                                            <div className={`text-xs font-medium mb-1 ${isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : ''}`}>
                                                {dayObj.day}
                                            </div>

                                            {/* Data */}
                                            <div className="flex flex-col gap-0.5 text-[8px] font-bold leading-tight">
                                                {inc > 0 && <span className="text-blue-400">{inc.toLocaleString()}</span>}
                                                {exp > 0 && <span className="text-red-400">{exp.toLocaleString()}</span>}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}
                {/* CALENDAR VIEW END */}

                {/* MONTHLY VIEW START */}
                {viewMode === 'monthly' && (
                    <div className="animate-fade-in bg-gray-900 rounded-lg overflow-hidden pb-10 border border-gray-800">
                        {(() => {
                            // Generate all 12 months for the selected year (descending: Dec -> Jan)
                            const months = Array.from({ length: 12 }, (_, i) => 11 - i); // [11, 10, ... 0]

                            return months.map(monthIndex => {
                                const mNum = monthIndex + 1;
                                const monthKey = `${selectedYear}-${String(mNum).padStart(2, '0')}`;

                                // Filter transactions for this month
                                const txs = generalTransactions.filter(t => t.date.startsWith(monthKey));

                                const inc = txs.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
                                const exp = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
                                const total = inc - exp;

                                const dateObj = new Date(selectedYear, monthIndex, 1);
                                const monthName = dateObj.toLocaleDateString('en-GB', { month: 'short' });
                                const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();

                                const isExpanded = expandedMonth === monthKey;
                                const hasData = inc > 0 || exp > 0;

                                return (
                                    <div key={monthKey} className={`border-b border-gray-800 ${!hasData ? 'opacity-40' : ''}`}>
                                        {/* Month Header Row */}
                                        <div
                                            onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                                            className={`p-4 hover:bg-gray-800 cursor-pointer flex justify-between items-center transition-colors ${isExpanded ? 'bg-gray-800' : 'bg-gray-900'}`}
                                        >
                                            <div>
                                                <div className="font-bold text-lg text-white">{monthName}</div>
                                                <div className="text-gray-500 text-xs">01/{String(mNum).padStart(2, '0')} ~ {daysInMonth}/{String(mNum).padStart(2, '0')}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-8 text-right text-xs">
                                                <span className={`${inc > 0 ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>{formatMoney(inc)}</span>
                                                <span className={`${exp > 0 ? 'text-red-400 font-bold' : 'text-gray-600'}`}>{formatMoney(exp)}</span>

                                                {/* Totals Row */}
                                                <span className="col-span-2 text-gray-500 mt-1">
                                                    {total !== 0 ? (total >= 0 ? '' : '-') + formatMoney(Math.abs(total)) : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Weekly Breakdown (Expanded) */}
                                        {isExpanded && (
                                            <div className="bg-black/20 border-t border-gray-800 animate-slide-down shadow-inner">
                                                {(() => {
                                                    const weeks = [];
                                                    let start = 1;
                                                    while (start <= daysInMonth) {
                                                        const end = Math.min(start + 6, daysInMonth);
                                                        const weekTxs = txs.filter(t => {
                                                            const d = parseInt(t.date.split('-')[2]);
                                                            return d >= start && d <= end;
                                                        });

                                                        weeks.push({ start, end, txs: weekTxs });
                                                        start += 7;
                                                    }

                                                    return weeks.reverse().map((w, idx) => {
                                                        const wInc = w.txs.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
                                                        const wExp = w.txs.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
                                                        const wTotal = wInc - wExp;
                                                        const hasActivity = wInc > 0 || wExp > 0;

                                                        if (!hasData && !hasActivity) return null;

                                                        return (
                                                            <div key={idx} className={`flex justify-between items-center py-3 px-8 text-xs ${hasActivity ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                <div className="font-medium">
                                                                    {String(w.start).padStart(2, '0')}/{String(mNum).padStart(2, '0')} ~ {String(w.end).padStart(2, '0')}/{String(mNum).padStart(2, '0')}
                                                                </div>
                                                                <div className="text-right flex flex-col items-end gap-0.5">
                                                                    <div className="flex gap-4">
                                                                        <span className={`${hasActivity ? 'text-blue-400' : 'text-blue-900'}`}>{formatMoney(wInc)}</span>
                                                                        <span className={`${hasActivity ? 'text-red-400' : 'text-red-900'}`}>{formatMoney(wExp)}</span>
                                                                    </div>
                                                                    <div className={`${hasActivity ? 'text-gray-500' : 'text-gray-700'}`}>
                                                                        {wTotal !== 0 ? formatMoney(wTotal) : '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
                {/* MONTHLY VIEW END */}

                {viewMode === 'daily' && (
                    <>
                        <SummaryHeader stats={monthlyStats} />

                        {/* SCROLLABLE LIST OF DAYS */}
                        <div className="space-y-6">
                            {transactionsByDay.length === 0 ? (
                                <div className="text-center text-gray-600 py-10 italic">No transactions for this month.</div>
                            ) : transactionsByDay.map(([dateStr, txs]) => {
                                const dayIncome = txs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount || 0), 0);
                                const dayExpense = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0);
                                const dateObj = new Date(dateStr);

                                return (
                                    <div key={dateStr} id={`date-${dateStr}`} className="animate-fade-in">
                                        {/* Date Header Row */}
                                        <div className="flex items-start text-sm mb-2 pb-1 border-b border-gray-800">
                                            <div className="flex items-center">
                                                <div className="font-bold text-2xl text-white mr-2">{dateObj.getDate().toString().padStart(2, '0')}</div>
                                                <div className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                    {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
                                                </div>
                                            </div>

                                            {/* Daily Account Group Summary */}
                                            <div className="ml-auto text-xs space-y-1 text-right">
                                                {accountGroups.map(group => {
                                                    // Filter transactions for this day AND this group
                                                    const groupAccountNames = accounts.filter(a => a.group === group).map(a => a.name);
                                                    const groupDayTxs = txs.filter(t => groupAccountNames.includes(t.method) || (group === 'Cash' && t.method === 'Cash'));

                                                    const gInc = groupDayTxs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount || 0), 0);
                                                    const gExp = groupDayTxs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0);

                                                    if (gInc === 0 && gExp === 0) return null;

                                                    return (
                                                        <div key={group} className="flex gap-3 justify-end items-center">
                                                            {/* Only show Group Label if we have multiple active groups today, or always? User asked to separate them. */}
                                                            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter mr-1">{group}</span>
                                                            {gInc > 0 && <span className="text-blue-400 font-mono">{formatMoney(gInc)}</span>}
                                                            {gExp > 0 && <span className="text-red-400 font-mono">{formatMoney(gExp)}</span>}
                                                        </div>
                                                    );
                                                })}
                                                {/* Fallback for Orphans (Optional, but good for data integrity) */}
                                                {(() => {
                                                    const capturedTxs = new Set<string>();
                                                    accountGroups.forEach(g => {
                                                        const names = accounts.filter(a => a.group === g).map(a => a.name);
                                                        txs.forEach(t => {
                                                            if (names.includes(t.method) || (g === 'Cash' && t.method === 'Cash')) capturedTxs.add(t.id);
                                                        });
                                                    });
                                                    const orphanTxs = txs.filter(t => !capturedTxs.has(t.id));
                                                    if (orphanTxs.length === 0) return null;

                                                    const oInc = orphanTxs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
                                                    const oExp = orphanTxs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);

                                                    return (
                                                        <div className="flex gap-3 justify-end items-center text-red-500 font-black bg-red-500/10 px-2 rounded-sm border border-red-500/20">
                                                            <span className="text-[10px] uppercase font-bold tracking-tighter mr-1">⚠️ INTEGRITY ERROR (Orphaned Account)</span>
                                                            {oInc > 0 && <span className="font-mono">{formatMoney(oInc)}</span>}
                                                            {oExp > 0 && <span className="font-mono">{formatMoney(oExp)}</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Transactions for this Day */}
                                        <div className="space-y-3 pl-2">
                                            {txs.map(tx => (
                                                <div key={tx.id} className="flex items-start justify-between group py-2 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 transition-colors" onClick={() => setEditingTransaction(tx)}>
                                                    {/* Left: Category (tighter width) */}
                                                    <div className="w-1/4 pr-1">
                                                        <div className="text-gray-300 font-bold text-xs truncate uppercase leading-tight">{tx.category}</div>
                                                    </div>

                                                    {/* Middle: Notes & Account */}
                                                    <div className="flex flex-col flex-1 px-1 overflow-hidden">
                                                        <div className="text-gray-300 text-xs font-medium truncate flex items-center gap-2">
                                                            {/* Render Description with smart tag parsing (Field OR Regex) */}
                                                            {(() => {
                                                                const text = tx.description || '-';

                                                                // 1. New Way: Metadata
                                                                if (tx.requisitionId) {
                                                                    return (
                                                                        <>
                                                                            <span>{text}</span>
                                                                            <span
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const foundReq = requisitions.find(r => r.readableId === tx.requisitionId);
                                                                                    if (foundReq) setViewingRequisition(foundReq);
                                                                                }}
                                                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono cursor-pointer hover:bg-purple-500 hover:text-white transition-colors border border-purple-500/30"
                                                                            >
                                                                                {tx.requisitionId}
                                                                            </span>
                                                                        </>
                                                                    );
                                                                }

                                                                // 2. Old Way: Regex in Description
                                                                const parts = text.split(/(\[REQ-[^\]]+\])/g);
                                                                return parts.map((part, i) => {
                                                                    if (part.match(/\[REQ-[^\]]+\]/)) {
                                                                        const reqId = part.replace('[', '').replace(']', '');
                                                                        return (
                                                                            <span
                                                                                key={i}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation(); // Prevent opening editing modal
                                                                                    const foundReq = requisitions.find(r => r.readableId === reqId);
                                                                                    if (foundReq) setViewingRequisition(foundReq);
                                                                                }}
                                                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono cursor-pointer hover:bg-purple-500 hover:text-white transition-colors border border-purple-500/30"
                                                                            >
                                                                                {reqId}
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return <span key={i}>{part}</span>;
                                                                });
                                                            })()}
                                                        </div>
                                                        <div className="text-gray-500 text-[10px] mt-0.5">{tx.mode}</div>
                                                    </div>

                                                    {/* Right: Amount */}
                                                    <div className={`font-mono font-bold text-sm whitespace-nowrap pl-2 text-right ${tx.category === '[Transfer Out]'
                                                        ? 'text-orange-400'
                                                        : tx.category === '[Transfer In]'
                                                            ? 'text-cyan-400'
                                                            : tx.type === 'Income' ? 'text-blue-400' : 'text-red-400'
                                                        }`}>
                                                        {tx.category === '[Transfer Out]' && '↳ '}
                                                        {tx.category === '[Transfer In]' && '↲ '}
                                                        {formatMoney(tx.amount)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* SUMMARY VIEW START */}
                {viewMode === 'summary' && (
                    <div className="animate-fade-in space-y-8 text-white">

                        {/* 1. Account Group Summary */}
                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="text-blue-400">📊</span>
                                Account Groups Overview
                            </h2>
                            <div className="space-y-6">
                                {accountGroups.map(group => {
                                    // 1. Find all accounts in this group
                                    const groupAccountNames = accounts.filter(a => a.group === group).map(a => a.name);

                                    // 2. Filter transactions for this group (by finding transactions whose 'method' matches an account name)
                                    // Note: 'method' in GeneralTransaction stores the Account Name (e.g. 'Cash', 'Centenary Bank')
                                    const groupTxs = generalTransactions.filter(t => t.date.startsWith(selectedMonth) && (groupAccountNames.includes(t.method) || (group === 'Cash' && t.method === 'Cash')));

                                    const realInc = groupTxs.filter(t => t.type === 'Income' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]').reduce((s, t) => s + Number(t.amount), 0);
                                    const realExp = groupTxs.filter(t => t.type === 'Expense' && t.category !== '[Transfer In]' && t.category !== '[Transfer Out]').reduce((s, t) => s + Number(t.amount), 0);
                                    const internalMovement = groupTxs.filter(t => t.category === '[Transfer In]' || t.category === '[Transfer Out]').reduce((s, t) => s + Number(t.amount), 0);

                                    if (realInc === 0 && realExp === 0 && internalMovement === 0) return null;

                                    return (
                                        <div key={group} className="border-b border-gray-800 last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-gray-300 uppercase tracking-wider text-sm">{group}</div>
                                                <div className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-500 font-mono">
                                                    Net: <span className={realInc - realExp >= 0 ? 'text-blue-400' : 'text-red-400'}>{formatMoney(realInc - realExp)}</span>
                                                </div>
                                            </div>

                                            {/* Bar Visual */}
                                            <div className="flex items-center gap-4 text-xs font-mono">
                                                <div className="w-24 text-blue-400 text-right">{formatMoney(realInc)}</div>
                                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                                                    <div style={{ width: `${(realInc / (realInc + realExp + 0.1)) * 100}%` }} className="bg-blue-500 h-full opacity-80" />
                                                    <div style={{ width: `${(realExp / (realInc + realExp + 0.1)) * 100}%` }} className="bg-red-500 h-full opacity-80" />
                                                </div>
                                                <div className="w-24 text-red-400 text-left">{formatMoney(realExp)}</div>
                                            </div>

                                            {internalMovement > 0 && (
                                                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5 px-1 italic">
                                                    <span className="text-orange-400/80">⇄</span>
                                                    Internal Movement (Re-allocation): {formatMoney(internalMovement)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Existing Monthly Stats Summary could go here if needed, but user focused on Account Grouping */}
                    </div>
                )}
                {/* SUMMARY VIEW END */}


                {/* Floating Add Button */}
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="fixed bottom-8 right-8 bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl font-light z-40 transition-transform hover:scale-110"
                >
                    +
                </button>

                {/* ADD TRANSACTION MODAL */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-end md:items-center justify-center animate-fade-in text-white">
                        <div className="bg-white text-black w-full max-w-md md:rounded-xl h-[90vh] md:h-auto md:max-h-[90vh] flex flex-col md:overflow-hidden relative shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center p-4 border-b border-gray-200">
                                <button onClick={() => setIsAddModalOpen(false)} className="text-2xl mr-4">←</button>
                                <h2 className="text-xl font-bold">Trans.</h2>
                                <div className="ml-auto flex gap-2">
                                    <button>⭐</button>
                                </div>
                            </div>

                            {/* Mode Switcher */}
                            <div className="flex p-2 bg-gray-100 mx-4 mt-4 rounded-lg">
                                {['Income', 'Expense', 'Transfer'].map(t => {
                                    const isActive = formData.type === t;
                                    let activeClass = 'bg-white shadow text-black';
                                    if (isActive) {
                                        if (t === 'Income') activeClass = 'bg-white shadow text-blue-500 border border-blue-200';
                                        if (t === 'Expense') activeClass = 'bg-white shadow text-red-500 border border-red-200';
                                    }

                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setFormData(f => ({ ...f, type: t as any }))}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isActive ? activeClass : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Computed Display Form */}
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                                {/* Date */}
                                <div className="flex justify-between items-center border-b border-gray-200 py-2">
                                    <span className="text-gray-500 text-sm">Date</span>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                                        className="font-bold text-black outline-none bg-transparent text-right"
                                    />
                                </div>

                                {/* Amount */}
                                {/* Amount */}
                                <div
                                    className={`flex justify-between items-center border-b py-2 cursor-pointer ${formData.type === 'Income' ? 'border-blue-500' : 'border-red-500'}`}
                                    onClick={() => setShowCalculator(true)}
                                >
                                    <span className="text-gray-500 text-sm">Amount</span>
                                    <span className={`text-2xl font-bold ${formData.type === 'Income' ? 'text-blue-500' : 'text-red-500'}`}>
                                        {formData.amount ? formData.amount.toLocaleString() : '0'}
                                    </span>
                                </div>

                                {/* Category Selector - Hidden for Transfers */}
                                {formData.type !== 'Transfer' && (
                                    <div className="flex justify-between items-center border-b border-gray-200 py-2 cursor-pointer" onClick={() => setActiveSelection('Category')}>
                                        <span className="text-gray-500 text-sm">Category</span>
                                        <span className="text-right font-medium w-1/2">{formData.category || 'Select...'}</span>
                                    </div>
                                )}

                                {/* Account Selector(s) */}
                                {formData.type === 'Transfer' ? (
                                    <>
                                        <div className="flex justify-between items-center border-b border-gray-200 py-2 cursor-pointer" onClick={() => setActiveSelection('FromAccount')}>
                                            <span className="text-gray-500 text-sm">Source Account</span>
                                            <span className="text-right font-medium w-1/2">{formData.fromAccount || 'Select source...'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-200 py-2 cursor-pointer" onClick={() => setActiveSelection('ToAccount')}>
                                            <span className="text-gray-500 text-sm">Destination Account</span>
                                            <span className="text-right font-medium w-1/2">{formData.toAccount || 'Select dest...'}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between items-center border-b border-gray-200 py-2 cursor-pointer" onClick={() => setActiveSelection('Account')}>
                                        <span className="text-gray-500 text-sm">Account</span>
                                        <span className="text-right font-medium w-1/2">
                                            {(() => {
                                                const acc = accounts.find(a => a.name === formData.method);
                                                return acc ? `${acc.name} (${acc.group})` : (formData.method || 'Cash');
                                            })()}
                                        </span>
                                    </div>
                                )}

                                {/* Note */}
                                <div className="flex justify-between items-center border-b border-gray-200 py-2 relative">
                                    <span className="text-gray-500 text-sm">Note</span>
                                    <div className="flex-1 ml-4 relative">
                                        <input
                                            type="text"
                                            placeholder="Short description"
                                            className="text-right outline-none bg-transparent w-full"
                                            value={formData.description || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData(f => ({ ...f, description: val }));
                                                if (val.length > 0) {
                                                    const allNotes = generalTransactions.map(t => t.description).filter(Boolean);
                                                    const unique = Array.from(new Set(allNotes));
                                                    const matches = unique.filter(n => n.toLowerCase().includes(val.toLowerCase()) && n !== val).slice(0, 5);
                                                    setSuggestions(matches);
                                                } else {
                                                    setSuggestions([]);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (formData.description) {
                                                    const allNotes = generalTransactions.map(t => t.description).filter(Boolean);
                                                    const unique = Array.from(new Set(allNotes));
                                                    const matches = unique.filter(n => n.toLowerCase().includes((formData.description || '').toLowerCase()) && n !== formData.description).slice(0, 5);
                                                    setSuggestions(matches);
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                                        />
                                        {suggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden text-right">
                                                {suggestions.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-0"
                                                        onClick={() => {
                                                            setFormData(f => ({ ...f, description: s }));
                                                            setSuggestions([]);
                                                        }}
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Detailed Description & Camera */}
                                <div className="space-y-1 pt-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Description</span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={handleCameraClick} className="text-gray-400 hover:text-blue-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                    </div>
                                    <textarea
                                        value={formData.longDescription || ''}
                                        onChange={e => setFormData(f => ({ ...f, longDescription: e.target.value }))}
                                        className="w-full text-sm font-medium text-slate-600 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg p-3 outline-none min-h-[80px]"
                                        placeholder="Add more details..."
                                    />
                                </div>

                                {/* Attachments Preview */}
                                {formData.attachments && formData.attachments.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {formData.attachments.map((src, i) => (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200">
                                                <img src={src} alt="Attachment" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeAttachment(i)}
                                                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-gray-200 flex justify-between bg-white md:bg-gray-50">
                                <button
                                    onClick={handleContinue}
                                    className="text-gray-700 px-6 py-2 rounded-lg border border-gray-300 font-medium hover:bg-gray-100"
                                >
                                    Continue
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="bg-red-500 text-white px-8 py-2 rounded-lg font-bold shadow hover:bg-red-600"
                                >
                                    Save
                                </button>
                            </div>

                            {/* CALCULATOR OVERLAY */}
                            {showCalculator && (
                                <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
                                    <Calculator
                                        initialValue={formData.amount}
                                        onOk={(val) => { setShowCalculator(false); setFormData(f => ({ ...f, amount: val })); }}
                                        onClose={() => setShowCalculator(false)}
                                    />
                                </div>
                            )}

                            {/* SELECTION GRID OVERLAY */}
                            {activeSelection && (
                                <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
                                    <SelectionGrid
                                        title={activeSelection}
                                        items={activeSelection === 'Category'
                                            ? (formData.type === 'Expense'
                                                ? expenseCategories
                                                : incomeCategories)
                                            : accounts.map(a => ({ id: a.id, name: `${a.name} (${a.group})`, value: a.name })) // Map accounts to SelectionGrid format
                                        }
                                        onSelect={(val) => {
                                            if (activeSelection === 'Category') setFormData(f => ({ ...f, category: val }));
                                            else if (activeSelection === 'Account') {
                                                const match = typeof val === 'string' ? val.match(/^(.*) \((.*)\)$/) : null;
                                                const cleanName = match ? match[1] : val;
                                                setFormData(f => ({ ...f, method: cleanName as any }));
                                            }
                                            else if (activeSelection === 'FromAccount') {
                                                const match = typeof val === 'string' ? val.match(/^(.*) \((.*)\)$/) : null;
                                                setFormData(f => ({ ...f, fromAccount: (match ? match[1] : val) as any }));
                                            }
                                            else if (activeSelection === 'ToAccount') {
                                                const match = typeof val === 'string' ? val.match(/^(.*) \((.*)\)$/) : null;
                                                setFormData(f => ({ ...f, toAccount: (match ? match[1] : val) as any }));
                                            }
                                            setActiveSelection(null);
                                        }}
                                        onClose={() => setActiveSelection(null)}
                                        onEdit={activeSelection === 'Category' ? () => setIsManagingCategories(true) : undefined}
                                    />
                                </div>
                            )}

                            {/* CATEGORY MANAGER OVERLAY */}
                            {isManagingCategories && (
                                <div className="absolute inset-0 bg-black/50 z-[60] flex items-end">
                                    <div className="w-full h-full bg-white rounded-t-2xl overflow-hidden animate-slide-up">
                                        <CategoryManager
                                            type={formData.type as TransactionType}
                                            onClose={() => setIsManagingCategories(false)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* EDIT TRANSACTION MODAL */}
                {editingTransaction && (
                    <EditTransactionModal
                        transaction={editingTransaction}
                        onClose={() => setEditingTransaction(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDeleteEdit}
                    />
                )}

                {/* REQUISITION VIEW MODAL */}
                <RequisitionViewModal
                    requisition={viewingRequisition}
                    onClose={() => setViewingRequisition(null)}
                />
            </div>
        </div>
    );
}
