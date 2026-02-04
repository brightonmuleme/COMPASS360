"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData, Requisition, RequisitionItem, InQueueItem } from '@/lib/store';
import { ArrowLeft, Plus, Save, Clock, Trash2, CheckCircle, XCircle, FileText, Printer, RotateCcw, AlertCircle, Calculator, ChevronDown, Lock, Eye, Edit } from 'lucide-react';
import CategoryManager from '@/components/ui/CategoryManager';
import SelectionGrid from '@/components/ui/SelectionGrid';
import { RequisitionViewModal } from '@/components/requisitions/RequisitionViewModal';

export default function RequisitionsPage() {

    const {
        requisitions, addRequisition, updateRequisition, deleteRequisition, approveRequisition,
        requisitionQueue, addToQueue, removeFromQueue, clearQueue,
        expenseCategories,
        requisitionDraft, setRequisitionDraft, resetRequisitionDraft
    } = useSchoolData();

    const [activeTab, setActiveTab] = useState<'New' | 'Drafts' | 'In-Queue' | 'Approved'>('New');

    const [viewingReq, setViewingReq] = useState<Requisition | null>(null);
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

    // --- ACTIONS ---

    const loadIntoEditor = (req: Requisition) => {
        if (requisitionDraft.items.length > 0) {
            if (!confirm("Start editing this draft? Current unsaved changes in the editor will be lost.")) return;
        }
        setRequisitionDraft({
            id: req.id,
            title: req.title,
            account: req.account,
            date: req.date,
            notes: req.notes,
            items: req.items.map(i => ({ ...i })) // Deep copy items
        });
        setActiveTab('New');
    };

    const restoreToEditor = (qItem: InQueueItem) => {
        // Add to current editor state
        const newItem = { ...qItem.itemData, id: crypto.randomUUID() }; // New ID to avoid conflicts

        // Auto-Removal from Queue
        removeFromQueue(qItem.id);

        setRequisitionDraft(prev => {
            const updatedItems = [...prev.items, newItem].sort((a, b) => {
                // 1. Priority
                const pA = a.isPriority === true;
                const pB = b.isPriority === true;
                if (pA && !pB) return -1;
                if (!pA && pB) return 1;
                // 2. Category
                return (a.category || "").localeCompare(b.category || "");
            });
            return { ...prev, items: updatedItems };
        });

        // Switch back to editor so user sees the item
        setActiveTab('New');
    };

    const handleSaveEditor = (asDraft: boolean) => {
        if (requisitionDraft.items.length === 0) return alert("Please add at least one item.");
        if (!requisitionDraft.title) return alert("Title is required.");

        const isEditing = requisitionDraft.id !== 'draft' && requisitionDraft.id !== null;

        const req: Requisition = {
            ...requisitionDraft,
            id: isEditing ? requisitionDraft.id! : crypto.randomUUID(),
            readableId: requisitions.find(r => r.id === requisitionDraft.id)?.readableId, // Keep existing if editing
            status: asDraft ? 'Draft' : 'Submitted'
        };

        if (isEditing) {
            updateRequisition(req);
        } else {
            addRequisition(req);
        }

        if (asDraft) {
            alert("Draft Saved.");
            setActiveTab('Drafts');
        } else {
            alert("Requisition Submitted for Approval.");
            setActiveTab('Drafts');
            resetRequisitionDraft();
        }
    };

    // resetEditor replaced by resetRequisitionDraft from global store

    const handleReuse = (req: Requisition) => {
        // Clone Items with new IDs
        const newItems = req.items.map(i => ({
            ...i,
            id: crypto.randomUUID(),
        }));

        setRequisitionDraft({
            id: 'draft', // New Item
            title: req.title, // Reuse Title
            account: req.account,
            date: new Date().toISOString().split('T')[0], // Today's date
            notes: req.notes,
            items: newItems
        });

        setActiveTab('New');
        alert("Requisition cloned! You can now edit and submit.");
    };

    return (
        <div className="p-2 sm:p-6 text-slate-100 min-h-screen bg-slate-900/50 print:bg-white print:text-black print:p-0">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 print:hidden gap-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white hidden sm:flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-400" />
                    Requisition System
                </h1>

                <div className="flex bg-slate-800 rounded-lg p-1 overflow-x-auto no-scrollbar max-w-full">
                    {['New', 'Drafts', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-3 sm:px-4 py-2 rounded-md transition-all font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === tab
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className={`bg-slate-800/50 border border-slate-700 rounded-xl min-h-[500px] sm:min-h-[600px] p-2 sm:p-4 relative shadow-xl print:shadow-none print:border-none print:bg-white ${viewingReq ? 'print:block' : ''}`}>

                {/* USE HIDDEN TABS FOR PERSISTENCE */}
                <div style={{ display: activeTab === 'New' ? 'block' : 'none' }}>
                    <NewRequisitionForm
                        expenseCategories={expenseCategories}
                        // Pass State from Draft object
                        title={requisitionDraft.title} setTitle={(v) => setRequisitionDraft({ title: v })}
                        account={requisitionDraft.account} setAccount={(v) => setRequisitionDraft({ account: v })}
                        date={requisitionDraft.date} setDate={(v) => setRequisitionDraft({ date: v })}
                        notes={requisitionDraft.notes} setNotes={(v) => setRequisitionDraft({ notes: v })}
                        items={requisitionDraft.items} setItems={(v) => {
                            if (typeof v === 'function') {
                                setRequisitionDraft(prev => ({ ...prev, items: v(prev.items) }));
                            } else {
                                setRequisitionDraft({ items: v });
                            }
                        }}
                        // Actions
                        onSave={() => handleSaveEditor(true)}
                        onSubmit={() => handleSaveEditor(false)}
                        onClear={resetRequisitionDraft}
                    />
                </div>

                {activeTab === 'Drafts' && (
                    <RequisitionList
                        title="Draft & Pending Requisitions"
                        requisitions={requisitions.filter(r => r.status === 'Draft' || r.status === 'Rejected' || r.status === 'Submitted' || r.status === 'Pending Approval')}
                        onEdit={loadIntoEditor}
                        onView={setViewingReq}
                        onDelete={deleteRequisition}
                        onApprove={approveRequisition}
                    />
                )}

                {activeTab === 'In-Queue' && (
                    <InQueueList
                        queue={requisitionQueue}
                        onRestore={restoreToEditor}
                        onDelete={(id) => removeFromQueue(id)}
                        onClear={clearQueue}
                    />
                )}

                {activeTab === 'Approved' && (
                    <RequisitionList
                        title="Approved History"
                        requisitions={requisitions.filter(r => r.status === 'Approved')}
                        isReadOnly
                        onView={setViewingReq}
                        onReuse={handleReuse}
                    />
                )}

            </div>

            {/* VIEW MODAL (For Approvals / Snapshots / Print) */}
            <RequisitionViewModal
                requisition={viewingReq}
                onClose={() => setViewingReq(null)}
            />







        </div>

    );
}

// --- NEW REQUISITION FORM (Managed) ---

interface FormProps {
    expenseCategories: any[];
    title: string; setTitle: (v: string) => void;
    account: string; setAccount: (v: string) => void;
    date: string; setDate: (v: string) => void;
    notes: string; setNotes: (v: string) => void;
    items: RequisitionItem[]; setItems: React.Dispatch<React.SetStateAction<RequisitionItem[]>>;
    onSave: () => void;
    onSubmit: () => void;
    onClear: () => void;
}

function NewRequisitionForm({ expenseCategories, title, setTitle, account, setAccount, date, setDate, notes, setNotes, items, setItems, onSave, onSubmit, onClear }: FormProps) {
    const { addToQueue, requisitions, generalTransactions, accounts } = useSchoolData();
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [activeRowForSelection, setActiveRowForSelection] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);

    const handleAddItem = () => {
        const newItem: RequisitionItem = {
            id: crypto.randomUUID(),
            category: "",
            name: "",
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            isManual: false
        };
        setItems([...items, newItem]);
    };

    const handleDeleteItem = (index: number) => {
        const item = items[index];
        // Move to Queue logic
        const queueItem: InQueueItem = {
            id: crypto.randomUUID(),
            itemData: item,
            dateRemoved: new Date().toISOString()
        };
        addToQueue(queueItem);

        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleChange = (index: number, field: keyof RequisitionItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        // Auto-calc logic
        if (field === 'quantity' || field === 'unitPrice') {
            if (!item.isManual) {
                // FORCE NUMBER CASTING
                item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            }
        }
        if (field === 'isManual' && value === false) {
            item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        }

        // Suggestion Logic for Name
        if (field === 'name') {
            if (value.length > 0) {
                // Source from General Transactions (Synchronized)
                const allNames = generalTransactions.map(t => {
                    // Clean legacy tags if present
                    return t.description.replace(/\[REQ-[^\]]+\]/g, '').trim();
                }).filter(Boolean);

                const unique = Array.from(new Set(allNames));
                const matches = unique.filter(n => n.toLowerCase().includes(value.toLowerCase()) && n !== value).slice(0, 5);
                setSuggestions(matches);
                setActiveSuggestionRow(index);
            } else {
                setSuggestions([]);
                setActiveSuggestionRow(null);
            }
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const handleCategorySelect = (category: string) => {
        if (activeRowForSelection !== null) {
            handleChange(activeRowForSelection, 'category', category);
            setActiveRowForSelection(null);
            setIsSelectorOpen(false);

            // STICKY CATEGORIES: Auto-sort items by category to keep them grouped
            setTimeout(() => {
                setItems(prevItems => {
                    const sorted = [...prevItems].sort((a, b) => (a.category || "zzz").localeCompare(b.category || "zzz"));
                    return sorted;
                });
            }, 100);
        }
    };

    const handlePriorityToggle = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Critical for button inside row

        setItems(prevItems => {
            const newItems = [...prevItems];
            const item = { ...newItems[index] };
            item.isPriority = !item.isPriority; // Toggle

            newItems[index] = item;

            // Sort immediately
            return newItems.sort((a, b) => {
                // 1. Priority
                const pA = a.isPriority === true;
                const pB = b.isPriority === true;
                if (pA && !pB) return -1;
                if (!pA && pB) return 1;
                // 2. Category
                return (a.category || "").localeCompare(b.category || "");
            });
        });
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return (
        <div className="flex flex-col h-full text-sm animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex justify-end mb-2">
                <button onClick={onClear} className="text-xs text-slate-500 hover:text-red-400 underline">Clear Form</button>
            </div>

            {/* Form Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-900/40 p-4 rounded-lg border border-slate-700">
                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">School Name</label>
                    <input type="text" value="VINE INTERNATIONAL SCHOOL" readOnly className="w-full bg-slate-800 text-slate-300 border-none rounded mt-1 opacity-70 cursor-not-allowed" />
                </div>
                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded mt-1 focus:ring-purple-500" />
                </div>
                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Account</label>
                    <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded mt-1 focus:ring-purple-500">
                        {accounts.length > 0 ? (
                            accounts.map(acc => (
                                <option key={acc.id} value={acc.name}>{acc.name}</option>
                            ))
                        ) : (
                            <>
                                <option value="Cash">Cash</option>
                                <option value="Bank">Bank Transfer</option>
                                <option value="Mobile Money">Mobile Money</option>
                            </>
                        )}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Requisition Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly Supplies" className="w-full bg-slate-800 text-white border border-slate-700 rounded mt-1 focus:ring-purple-500" />
                </div>
            </div>

            {/* Items Table - Responsive Scrollable Table */}
            <div className="flex-1 overflow-x-auto border border-slate-700 rounded-lg bg-slate-900/20 mb-4 min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-800 sticky top-0 z-20 text-[10px] sm:text-xs uppercase text-slate-400">
                        <tr>
                            <th className="p-3 w-10">#</th>
                            <th className="p-3 w-1/4">Category</th>
                            <th className="p-3">Item Description</th>
                            <th className="p-3 w-20 sm:w-24 text-right">Qty</th>
                            <th className="p-3 w-28 sm:w-32 text-right">Unit Price</th>
                            <th className="p-3 w-36 sm:w-40 text-right">Amount</th>
                            <th className="p-3 w-20 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {items.map((item, index) => {
                            const getMain = (i: RequisitionItem) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");
                            const currentGroup = getMain(item);
                            const prevGroup = index > 0 ? getMain(items[index - 1]) : null;
                            const isNewGroup = index > 0 && prevGroup !== currentGroup;
                            const isLastItem = index === items.length - 1;

                            const getGroupSum = (endIndex: number, groupName: string) => {
                                let sum = 0;
                                for (let i = endIndex; i >= 0; i--) {
                                    if (getMain(items[i]) !== groupName) break;
                                    sum += (Number(items[i].amount) || 0);
                                }
                                return sum;
                            };

                            return (
                                <React.Fragment key={item.id}>
                                    {isNewGroup && (
                                        <tr className="bg-slate-800/50">
                                            <td colSpan={5} className="p-2 text-right text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                                {prevGroup} Subtotal
                                            </td>
                                            <td className="p-2 text-right text-purple-300 font-bold border-t border-slate-700 border-b border-dashed border-slate-800">
                                                {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index - 1, prevGroup || ""))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                    <tr className={`hover:bg-slate-800/30 group ${item.isPriority ? 'bg-red-500/5' : ''}`}>
                                        <td className="p-3 text-slate-500 text-xs">{index + 1}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => { setActiveRowForSelection(index); setIsSelectorOpen(true); }}
                                                className={`w-full text-left px-2 sm:px-3 py-2 rounded border transition-colors text-xs sm:text-sm ${item.category
                                                    ? (item.isPriority ? 'bg-red-900/20 border-red-500/30 text-red-300 font-bold' : 'bg-slate-800 border-slate-700 text-purple-300')
                                                    : 'bg-slate-800/50 border-dashed border-slate-600 text-slate-500 hover:border-purple-500 hover:text-purple-400'}`}
                                            >
                                                {item.category || "Select..."}
                                            </button>
                                        </td>
                                        <td className="p-3 relative">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={e => handleChange(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-purple-500 focus:outline-none text-white px-1 py-1 transition-colors text-xs sm:text-sm"
                                                placeholder="Item name"
                                            />
                                            {/* SUGGESTIONS DROPDOWN */}
                                            {activeSuggestionRow === index && suggestions.length > 0 && (
                                                <div className="absolute left-0 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                    {suggestions.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-gray-300 font-medium border-b border-slate-700/50 last:border-0"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent focus loss
                                                                handleChange(index, 'name', s);
                                                                setSuggestions([]);
                                                                setActiveSuggestionRow(null);
                                                            }}
                                                        >
                                                            {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => handleChange(index, 'quantity', e.target.value)}
                                                className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-600 focus:border-purple-500 focus:outline-none text-white px-1 py-1 text-xs sm:text-sm"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => handleChange(index, 'unitPrice', e.target.value)}
                                                className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-600 focus:border-purple-500 focus:outline-none text-white px-1 py-1 text-xs sm:text-sm font-mono"
                                            />
                                        </td>
                                        <td className="p-3 relative">
                                            <div className="flex items-center justify-end">
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                                    readOnly={!item.isManual}
                                                    className={`w-full text-right bg-transparent border-b ${item.isManual ? 'border-yellow-500/50 text-yellow-300 bg-yellow-400/5 font-bold' : 'border-transparent text-slate-300'} focus:outline-none px-1 py-1 text-xs sm:text-sm font-mono`}
                                                />
                                                <button
                                                    onClick={() => handleChange(index, 'isManual', !item.isManual)}
                                                    className={`ml-2 p-1 rounded-full ${item.isManual ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                                                    title={item.isManual ? "Manual Mode (Click to Auto)" : "Auto Mode (Click to Manual)"}
                                                >
                                                    <Calculator className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={(e) => handlePriorityToggle(index, e)}
                                                    className={`p-1 rounded-full ${item.isPriority ? 'text-red-400 bg-red-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                                                    title="Priority"
                                                >
                                                    <AlertCircle className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(index)}
                                                    className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isLastItem && (
                                        <tr className="bg-slate-800/50 border-t border-slate-700">
                                            <td colSpan={5} className="p-2 text-right text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                                {currentGroup} Subtotal
                                            </td>
                                            <td className="p-2 text-right text-purple-300 font-bold border-b border-dashed border-slate-800">
                                                {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index, currentGroup))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {/* Add Item Row */}
                        <tr>
                            <td colSpan={7} className="p-2">
                                <button
                                    onClick={handleAddItem}
                                    className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add New Item
                                </button>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-slate-900/80 font-bold border-t border-slate-700 text-white sticky bottom-0 z-10">
                        <tr>
                            <td colSpan={5} className="p-3 sm:p-4 text-right uppercase tracking-wider text-slate-400 text-[10px] sm:text-xs">Total Amount</td>
                            <td className="p-3 sm:p-4 text-right text-base sm:text-xl text-emerald-400">
                                {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(totalAmount)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Notes & Actions - Merged functionality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="mb-20 md:mb-0">
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Notes & Remarks</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-300 h-24 focus:ring-purple-500 focus:border-purple-500 resize-none text-xs sm:text-sm"
                        placeholder="Add justifications..."
                    />
                </div>
                <div className="hidden md:flex items-end justify-end gap-4 h-full">
                    <button onClick={onSave} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 font-medium transition-colors">
                        <Save className="w-5 h-5" />
                        Save Draft
                    </button>
                    <button onClick={onSubmit} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-purple-900/20">
                        <CheckCircle className="w-5 h-5" />
                        Submit & Clear
                    </button>
                </div>
            </div>

            {/* Mobile Sticky Action Bar - For convenience but using desktop logic */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onSave} className="flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-xl font-bold shadow-2xl border border-slate-700 active:scale-95 transition-transform">
                        <Save className="w-4 h-4" /> Save
                    </button>
                    <button onClick={onSubmit} className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-black shadow-2xl active:scale-95 transition-transform">
                        <CheckCircle className="w-4 h-4" /> Submit
                    </button>
                </div>
            </div>

            {/* Category Selector Modal Overlay */}
            {isSelectorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <SelectionGrid
                            title="Select Category"
                            items={expenseCategories}
                            onSelect={handleCategorySelect}
                            onClose={() => setIsSelectorOpen(false)}
                            onEdit={() => setIsManagingCategories(true)}
                        />
                        <div className="text-center mt-4">
                            <button onClick={() => setIsSelectorOpen(false)} className="text-slate-400 hover:text-white font-medium">Cancel Selection</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORY MANAGER OVERLAY */}
            {isManagingCategories && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-in fade-in">
                    <div className="w-full max-w-sm h-[80vh] md:h-[600px] bg-white rounded-2xl overflow-hidden shadow-2xl relative">
                        <CategoryManager
                            type="Expense"
                            onClose={() => setIsManagingCategories(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function RequisitionList({ title, requisitions, onEdit, onView, onDelete, onApprove, isReadOnly, onAction, onReuse }: any) {
    if (requisitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <div className="bg-slate-800 p-6 rounded-full mb-4">
                    {isReadOnly ? <CheckCircle className="w-12 h-12 text-emerald-500/50" /> : <FileText className="w-12 h-12 text-slate-600" />}
                </div>
                <p className="text-lg font-medium">{isReadOnly ? "No approved requisitions yet" : "No drafts or pending items"}</p>
                <p className="text-sm opacity-60">Created items will appear here</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-lg font-bold text-white mb-4 px-2 border-l-4 border-purple-500">{title}</h2>
            <div className="space-y-4">
                {requisitions.map((req: Requisition) => (
                    <div
                        key={req.id}
                        onClick={() => onView && onView(req)}
                        className={`bg-slate-900/40 border border-slate-700/50 rounded-lg p-4 transition-all group cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50 shadow-sm`}
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                                <div className={`mt-1 p-2 rounded-lg shrink-0 ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                    {req.status === 'Approved' ? <CheckCircle className="w-5 h-5 md:w-6 md:h-6" /> : <Clock className="w-5 h-5 md:w-6 md:h-6" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] md:text-xs font-mono text-slate-500 bg-slate-950 px-1 rounded shrink-0">{req.readableId || 'REQ-???'}</span>
                                        <h3 className="font-bold text-slate-200 text-base md:text-lg truncate">{req.title}</h3>
                                        {req.status === 'Rejected' && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-900">Rejected</span>}
                                        {req.status === 'Submitted' && <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-800/50">Pending Approval</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
                                        <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> {req.date}</span>
                                        <span className="hidden xs:inline text-slate-600">|</span>
                                        <span className="truncate">{req.account}</span>
                                        <span className="hidden xs:inline text-slate-600">|</span>
                                        <span className="shrink-0">{req.items.length} Items</span>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <div className="text-[10px] md:text-xs bg-slate-800/80 px-2 py-1 rounded text-slate-400 truncate max-w-full">
                                            {(req.items || []).slice(0, 2).map(i => i.name).join(", ")}
                                            {(req.items || []).length > 2 && ` +${(req.items || []).length - 2} more`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex flex-col items-start sm:items-end shrink-0">
                                <div className="text-xl md:text-2xl font-bold text-emerald-400 whitespace-nowrap">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
                                        (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                    )}
                                </div>
                                {!isReadOnly && (
                                    <div className="flex gap-2 justify-end mt-3 sm:mt-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => onEdit && onEdit(req)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center gap-1">
                                            <Edit className="w-3 h-3" /> Edit
                                        </button>
                                        <button onClick={() => {
                                            if (confirm("Delete?")) onDelete && onDelete(req.id);
                                        }} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-xs rounded">
                                            Delete
                                        </button>
                                    </div>
                                )}
                                {isReadOnly && (
                                    <div className="mt-3 sm:mt-4 flex gap-2 justify-end opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            onReuse && onReuse(req);
                                        }} className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/50 px-2 py-1.5 rounded hover:bg-purple-900/20">
                                            <RotateCcw className="w-3 h-3" /> Reuse
                                        </button>
                                        <button onClick={() => onView && onView(req)} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1.5 rounded hover:bg-slate-800">
                                            <Eye className="w-3 h-3" /> View Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InQueueList({ queue, onRestore, onDelete, onClear }: { queue: InQueueItem[], onRestore: (i: InQueueItem) => void, onDelete: (id: string) => void, onClear: () => void }) {
    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Trash2 className="w-16 h-16 mb-4 opacity-20" />
                <p>The queue is empty.</p>
                <p className="text-xs">Deleted line items appear here.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Recycle Bin (In-Queue)
                </h2>
                <button onClick={onClear} className="px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded text-xs font-bold transition-colors">
                    Empty Queue
                </button>
            </div>

            <div className="bg-slate-900/40 border border-red-900/20 rounded-lg overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-red-900/10 text-red-400/80 uppercase text-[10px] sm:text-xs">
                        <tr>
                            <th className="p-3">Item Details</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-right">Date Removed</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/10">
                        {queue.map(item => (
                            <tr key={item.id} className={`hover:bg-red-900/5 group ${item.itemData.isPriority ? 'bg-red-500/5' : ''}`}>
                                <td className="p-3">
                                    <div className={`font-bold text-xs sm:text-sm ${item.itemData.isPriority ? 'text-red-400' : 'text-slate-300'}`}>
                                        {item.itemData.name}
                                        {item.itemData.isPriority && <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30 uppercase tracking-tighter">Priority</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{item.itemData.quantity} x {Number(item.itemData.unitPrice).toLocaleString()}</div>
                                </td>
                                <td className={`p-3 text-xs sm:text-sm ${item.itemData.isPriority ? 'text-red-400/70' : 'text-slate-400'}`}>{item.itemData.category}</td>
                                <td className="p-3 text-right font-mono text-xs sm:text-sm text-slate-300">{Number(item.itemData.amount).toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">{new Date(item.dateRemoved).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1 sm:gap-2">
                                        <button onClick={() => onRestore(item)} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors" title="Restore">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-500 hover:text-red-500 transition-colors" title="Delete">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Queue Summary */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Standard Items</span>
                    <span className="text-slate-200 font-mono font-bold">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(queue.reduce((sum, i) => !i.itemData.isPriority ? sum + Number(i.itemData.amount) : sum, 0))}
                    </span>
                </div>
                <div className="bg-red-900/10 p-3 rounded-lg border border-red-500/20 flex justify-between items-center">
                    <span className="text-red-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Priority Items
                    </span>
                    <span className="text-red-300 font-mono font-bold">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(queue.reduce((sum, i) => i.itemData.isPriority ? sum + Number(i.itemData.amount) : sum, 0))}
                    </span>
                </div>
            </div>
        </div>
    );
}
