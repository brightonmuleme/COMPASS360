"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolData, Requisition, RequisitionItem, InQueueItem, generateId } from '@/lib/store';
import { ArrowLeft, Plus, Save, Clock, Trash2, CheckCircle, XCircle, FileText, Printer, RotateCcw, AlertCircle, Calculator, ChevronDown, Lock, Eye, Edit } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import CategoryManager from '@/components/ui/CategoryManager';
import SelectionGrid from '@/components/ui/SelectionGrid';

export default function RequisitionsPage() {

    const {
        requisitions, addRequisition, updateRequisition, deleteRequisition, approveRequisition,
        requisitionQueue, addToQueue, removeFromQueue, clearQueue,
        expenseCategories,
        requisitionDraft, setRequisitionDraft, resetRequisitionDraft,
        portalBranding
    } = useSchoolData();

    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'New' | 'Drafts' | 'In-Queue' | 'Approved'>('New');

    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        const newItem = { ...qItem.itemData, id: generateId() }; 
        removeFromQueue(qItem.id);
        setRequisitionDraft(prev => {
            const updatedItems = [...prev.items, newItem].sort((a, b) => {
                const pA = a.isPriority === true;
                const pB = b.isPriority === true;
                if (pA && !pB) return -1;
                if (!pA && pB) return 1;
                return (a.category || "").localeCompare(b.category || "");
            });
            return { ...prev, items: updatedItems };
        });
        setActiveTab('New');
    };

    const handleSaveEditor = async (asDraft: boolean) => {
        if (requisitionDraft.items.length === 0) return alert("Please add at least one item.");
        if (!requisitionDraft.title) return alert("Title is required.");

        setIsSaving(true);
        try {
            const isEditing = requisitionDraft.id !== 'draft' && requisitionDraft.id !== null;
            const req: Requisition = {
                ...requisitionDraft,
                id: isEditing ? requisitionDraft.id! : generateId(),
                readableId: requisitions.find(r => r.id === requisitionDraft.id)?.readableId,
                status: asDraft ? 'Draft' : 'Submitted'
            };

            if (isEditing) {
                await updateRequisition(req);
            } else {
                await addRequisition(req);
            }

            if (asDraft) {
                alert("Draft Saved and Synced to Cloud.");
                setActiveTab('Drafts');
            } else {
                alert("Requisition Submitted and Vaulted to Ledger.");
                setActiveTab('Drafts');
                resetRequisitionDraft();
            }
        } catch (error) {
            console.error("Submission failed:", error);
            alert("Cloud synchronization failed. Please check your connection and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReuse = (req: Requisition) => {
        const newItems = req.items.map(i => ({
            ...i,
            id: generateId(),
        }));

        setRequisitionDraft({
            id: 'draft',
            title: req.title,
            account: req.account,
            date: new Date().toISOString().split('T')[0],
            notes: req.notes,
            items: newItems
        });

        setActiveTab('New');
        alert("Requisition cloned! You can now edit and submit.");
    };

    return (
        <div className="p-0 sm:p-6 text-slate-900 min-h-screen bg-slate-50 print:bg-white print:text-black print:p-0">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-8 print:hidden gap-6 bg-white md:bg-transparent p-4 sm:p-0 border-b md:border-none border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                            Expense Manager
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Ledger Control</p>
                    </div>
                </div>

                <div className="flex bg-slate-200/50 backdrop-blur-md rounded-2xl p-1 overflow-x-auto no-scrollbar max-w-full">
                    {['New', 'Drafts', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 sm:px-6 py-2.5 rounded-xl transition-all font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap ${activeTab === tab
                                ? 'bg-white text-purple-600 shadow-sm border border-slate-100'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="rounded-none sm:rounded-[2.5rem] min-h-[500px] sm:min-h-[600px] p-0 sm:p-4 relative print:shadow-none print:border-none print:bg-white">

                {/* USE HIDDEN TABS FOR PERSISTENCE */}
                <div style={{ display: activeTab === 'New' ? 'block' : 'none' }}>
                    <NewRequisitionForm
                        expenseCategories={expenseCategories}
                        portalBranding={portalBranding}
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
                        onSave={() => handleSaveEditor(true)}
                        onSubmit={() => handleSaveEditor(false)}
                        onClear={resetRequisitionDraft}
                        isSaving={isSaving}
                    />
                </div>

                {activeTab === 'Drafts' && (
                    <RequisitionList
                        title="Draft & Pending Requisitions"
                        requisitions={requisitions.filter(r => r.status === 'Draft' || r.status === 'Rejected' || r.status === 'Submitted' || r.status === 'Pending Approval')}
                        onEdit={loadIntoEditor}
                        onView={(req: Requisition) => router.push(`/bursar/requisitions/${req.id}`)}
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
                        onView={(req: Requisition) => router.push(`/bursar/requisitions/${req.id}`)}
                        onReuse={handleReuse}
                    />
                )}

            </div>

        </div>
    );
}

// --- NEW REQUISITION FORM (Managed) ---

interface FormProps {
    expenseCategories: any[];
    portalBranding: any;
    title: string; setTitle: (v: string) => void;
    account: string; setAccount: (v: string) => void;
    date: string; setDate: (v: string) => void;
    notes: string; setNotes: (v: string) => void;
    items: RequisitionItem[]; setItems: React.Dispatch<React.SetStateAction<RequisitionItem[]>>;
    onSave: () => void;
    onSubmit: () => void;
    onClear: () => void;
    isSaving: boolean;
}

function NewRequisitionForm({ expenseCategories, portalBranding, title, setTitle, account, setAccount, date, setDate, notes, setNotes, items, setItems, onSave, onSubmit, onClear, isSaving }: FormProps) {
    const { addToQueue, requisitions, generalTransactions, accounts } = useSchoolData();
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [activeRowForSelection, setActiveRowForSelection] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);

    const handleAddItem = () => {
        const newItem: RequisitionItem = {
            id: generateId(),
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
        const queueItem: InQueueItem = {
            id: generateId(),
            itemData: item,
            dateRemoved: new Date().toISOString()
        };
        addToQueue(queueItem);

        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const sortRequisitionItems = (itemsList: RequisitionItem[]) => {
        return [...itemsList].sort((a, b) => {
            const pA = a.isPriority === true;
            const pB = b.isPriority === true;
            if (pA && !pB) return -1;
            if (!pA && pB) return 1;
            const catA = a.category || "zzz";
            const catB = b.category || "zzz";
            const catCompare = catA.localeCompare(catB);
            if (catCompare !== 0) return catCompare;
            return (a.name || "").localeCompare(b.name || "") || a.id.localeCompare(b.id);
        });
    };

    const handleChange = (index: number, field: keyof RequisitionItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
            if (!item.isManual) {
                item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            }
        }
        if (field === 'isManual' && value === false) {
            item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        }

        if (field === 'name') {
            if (value.length > 0) {
                const allNames = generalTransactions.map(t => {
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
        if (field === 'category') {
            setItems(sortRequisitionItems(newItems));
        } else {
            setItems(newItems);
        }
    };

    const handleCategorySelect = (category: string) => {
        if (activeRowForSelection !== null) {
            handleChange(activeRowForSelection, 'category', category);
            setActiveRowForSelection(null);
            setIsSelectorOpen(false);
        }
    };

    const handlePriorityToggle = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newItems = [...items];
        newItems[index] = { ...newItems[index], isPriority: !newItems[index].isPriority };
        setItems(sortRequisitionItems(newItems));
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return (
        <div className="flex flex-col h-full text-sm animate-in fade-in duration-300">
            <div className="flex justify-end mb-2">
                <button onClick={onClear} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 tracking-widest transition-colors mb-2">Clear Entry Buffer</button>
            </div>

            <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Institutional Node</label>
                        <div className="font-black text-slate-900 uppercase tracking-tighter text-lg">{portalBranding?.schoolName || "ADMINISTRATION"}</div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Submission Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 text-slate-900 border-none rounded-xl py-3 px-4 font-black text-xs focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Fund Origin</label>
                        <div className="relative">
                            <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 text-slate-900 border-none rounded-xl py-3 px-4 font-black text-xs appearance-none focus:ring-2 focus:ring-purple-500">
                                {accounts.length > 0 ? (
                                    accounts.map(acc => (
                                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                                    ))
                                ) : (
                                    <>
                                        <option value="Cash">Cash Ledger</option>
                                        <option value="Bank">Bank Protocol</option>
                                        <option value="Mobile Money">Mobile Network</option>
                                    </>
                                )}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Requisition Identity</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="ENTER TITLE..." className="w-full bg-slate-50 text-slate-900 border-none rounded-xl py-3 px-4 font-black text-xs placeholder:text-slate-300 focus:ring-2 focus:ring-purple-500 uppercase tracking-tight" />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white sm:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
                <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                        <col className="w-12 md:w-16" />
                        <col className="w-1/4 md:w-1/4" />
                        <col className="w-auto" />
                        <col className="w-16 md:w-24" />
                        <col className="w-20 md:w-32" />
                        <col className="w-24 md:w-44" />
                        <col className="w-0 md:w-20" />
                    </colgroup>
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                        <tr>
                            <th className="p-4 md:p-6 md:px-10">#</th>
                            <th className="p-4 md:p-6 px-1 md:px-4">Identifier</th>
                            <th className="p-4 md:p-6 px-1 md:px-4">Identity</th>
                            <th className="p-4 md:p-6 px-1 md:px-4 text-right">Qty</th>
                            <th className="p-4 md:p-6 px-1 md:px-4 text-right">Rate</th>
                            <th className="p-4 md:p-6 px-1 md:px-10 text-right">Total Impact</th>
                            <th className="hidden md:table-cell p-4 md:p-6 px-4 text-center">Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
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
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={6} className="py-3 px-4 md:px-10 text-right text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest border-y border-slate-50 italic">
                                                {prevGroup} SUB-TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index - 1, prevGroup || ""))}</span>
                                            </td>
                                        </tr>
                                    )}
                                    <tr className={`transition-colors hover:bg-slate-50/50 ${item.isPriority ? 'bg-red-50/30' : 'bg-white'}`}>
                                        <td className="py-6 pl-4 md:pl-10 text-[8px] md:text-xs text-slate-300 font-black tabular-nums">{index + 1}</td>
                                        <td className="py-4 px-1 md:px-4">
                                            <button
                                                onClick={() => { setActiveRowForSelection(index); setIsSelectorOpen(true); }}
                                                className={`w-full text-left px-2 py-1 md:py-2 rounded-xl border transition-all text-[8px] md:text-xs font-black uppercase tracking-widest ${item.category
                                                    ? (item.isPriority ? 'bg-red-600 border-red-500 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-purple-600')
                                                    : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-purple-500 hover:text-purple-600'}`}
                                            >
                                                {item.category || "Select..."}
                                            </button>
                                        </td>
                                        <td className="py-4 px-1 md:px-4 relative">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={e => handleChange(index, 'name', e.target.value)}
                                                className={`w-full bg-transparent border-none focus:ring-0 px-1 py-1 text-[10px] md:text-base font-black tracking-tight leading-tight ${item.isPriority ? 'text-red-700' : 'text-slate-900'}`}
                                                placeholder="ITEM IDENTITY..."
                                            />
                                            {activeSuggestionRow === index && suggestions.length > 0 && (
                                                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] z-50 overflow-hidden backdrop-blur-xl">
                                                    {suggestions.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-[10px] text-slate-600 font-black uppercase tracking-tighter border-b border-slate-50 last:border-0"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); 
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
                                        <td className="py-4 px-1 text-center md:text-right">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => handleChange(index, 'quantity', e.target.value)}
                                                className="w-full text-center md:text-right bg-transparent border-none focus:ring-0 text-[10px] md:text-base font-black tabular-nums text-slate-900"
                                            />
                                        </td>
                                        <td className="py-4 px-1 text-right">
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => handleChange(index, 'unitPrice', e.target.value)}
                                                className="w-full text-right bg-transparent border-none focus:ring-0 text-[8px] md:text-sm font-bold tabular-nums italic text-slate-400"
                                            />
                                        </td>
                                        <td className="py-4 pr-4 md:pr-10 text-right relative">
                                            <div className="flex items-center justify-end">
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                                    readOnly={!item.isManual}
                                                    className={`w-full text-right bg-transparent border-none focus:ring-0 text-[11px] md:text-xl font-black tabular-nums tracking-tighter ${item.isPriority ? 'text-red-700' : (item.isManual ? 'text-blue-600' : 'text-slate-900')}`}
                                                />
                                                <button
                                                    onClick={() => handleChange(index, 'isManual', !item.isManual)}
                                                    className={`hidden md:flex ml-2 p-1 rounded-full ${item.isManual ? 'text-blue-600 bg-blue-50' : 'text-slate-200 hover:text-slate-400'}`}
                                                >
                                                    <Calculator className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center hidden md:table-cell">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => handlePriorityToggle(index, e)}
                                                    className={`p-2 rounded-xl transition-all ${item.isPriority ? 'text-white bg-red-600 shadow-md' : 'text-slate-200 hover:text-red-400 hover:bg-red-50'}`}
                                                >
                                                    <AlertCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(index)}
                                                    className="p-2 rounded-xl text-slate-200 hover:text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isLastItem && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={6} className="py-3 px-4 md:px-10 text-right text-[8px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest border-t border-slate-50 italic">
                                                {currentGroup} SUB-TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index, currentGroup))}</span>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <tr>
                            <td colSpan={7} className="p-4 md:p-8">
                                <button
                                    onClick={handleAddItem}
                                    className="w-full py-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50/30 transition-all flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[4px]"
                                >
                                    <Plus className="w-6 h-6" />
                                    INSERT LEDGER ENTRY
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1.5">Official Justification</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 h-32 focus:ring-2 focus:ring-purple-500 resize-none text-xs md:text-sm font-medium"
                            placeholder="Provide operational context for this expenditure..."
                        />
                    </div>
                    <div className="hidden md:flex items-end justify-end gap-4 h-full">
                        <div className="flex flex-col items-end mr-8">
                             <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">AGGREGATE IMPACT</div>
                             <div className="text-4xl font-black text-emerald-600 tracking-tighter tabular-nums mb-4">
                                {new Intl.NumberFormat('en-UG').format(totalAmount)}
                             </div>
                        </div>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                        >
                            {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Syncing...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={isSaving}
                            className="px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center gap-4 font-black text-sm uppercase tracking-[2px] transition-all shadow-2xl shadow-purple-200 italic"
                        >
                            {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            {isSaving ? 'Processing...' : 'Submit Ledger'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
                <div className="bg-white/80 backdrop-blur-2xl border border-slate-200 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Amount</div>
                        <div className="text-lg font-black text-emerald-600 tracking-tighter leading-none">{new Intl.NumberFormat('en-UG').format(totalAmount)}</div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={onSave} disabled={isSaving} className="p-4 bg-slate-900 text-white rounded-2xl">
                             <Save className="w-5 h-5" />
                         </button>
                        <button
                            onClick={onSubmit}
                            disabled={isSaving}
                            className="px-6 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-200 italic"
                        >
                            {isSaving ? '...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>

            {isSelectorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <SelectionGrid
                            title="Select Category"
                            items={expenseCategories}
                            onSelect={handleCategorySelect}
                            onClose={() => setIsSelectorOpen(false)}
                            onEdit={() => setIsManagingCategories(true)}
                        />
                        <div className="text-center mt-6">
                            <button onClick={() => setIsSelectorOpen(false)} className="text-white/60 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors">Cancel Protocol</button>
                        </div>
                    </div>
                </div>
            )}

            {isManagingCategories && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-4 animate-in fade-in">
                    <div className="w-full max-w-sm h-[80vh] md:h-[600px] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative">
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

function RequisitionList({ title, requisitions, onEdit, onView, onDelete, onApprove, isReadOnly, onReuse }: any) {
    if (requisitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    {isReadOnly ? <CheckCircle className="w-12 h-12 text-emerald-600/20" /> : <FileText className="w-12 h-12 text-slate-200" />}
                </div>
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">{isReadOnly ? "No approved requisitions yet" : "No drafts or pending items"}</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-[10px] font-black text-slate-400 mb-6 px-4 border-l-4 border-purple-600 uppercase tracking-[2px]">{title}</h2>
            <div className="space-y-4 pb-20 md:pb-0">
                {requisitions.map((req: Requisition) => (
                    <div
                        key={req.id}
                        onClick={() => onView && onView(req)}
                        className="bg-white border border-slate-200 rounded-[2rem] p-6 transition-all group cursor-pointer hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-900/5 shadow-sm"
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-6 min-w-0 flex-1">
                                <div className={`mt-1 p-3 rounded-2xl shrink-0 ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {req.status === 'Approved' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full shrink-0 uppercase tracking-widest">{req.readableId || 'REQ-???'}</span>
                                        <h3 className="font-black text-slate-900 text-lg md:text-xl truncate tracking-tight uppercase leading-none">{req.title}</h3>
                                        {req.status === 'Rejected' && <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 font-black uppercase tracking-widest">Rejected</span>}
                                        {req.status === 'Submitted' && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-black uppercase tracking-widest">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 font-black uppercase tracking-widest">Pending</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-black">
                                        <span className="flex items-center gap-1.5 shrink-0"><Clock className="w-3.5 h-3.5" /> {req.date}</span>
                                        <span className="truncate">{req.account}</span>
                                        <span className="shrink-0">{req.items.length} LEDGER ENTRIES</span>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <div className="text-[10px] bg-slate-50 px-3 py-1.5 rounded-xl text-slate-500 truncate max-w-full font-bold uppercase tracking-tighter">
                                            {(req.items || []).slice(0, 2).map(i => i.name).join(", ")}
                                            {(req.items || []).length > 2 && ` +${(req.items || []).length - 2} more`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex flex-col items-start sm:items-end shrink-0">
                                <div className="text-2xl md:text-3xl font-black text-emerald-600 whitespace-nowrap tracking-tighter tabular-nums mb-2">
                                    {new Intl.NumberFormat('en-UG').format(
                                        (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                    )}
                                </div>
                                {!isReadOnly && (
                                    <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => onEdit && onEdit(req)} className="px-5 py-2 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white text-[10px] rounded-xl font-black uppercase tracking-widest shadow-lg shadow-slate-200">
                                            Modify
                                        </button>
                                        <button onClick={() => {
                                            if (confirm("Delete?")) onDelete && onDelete(req.id);
                                        }} className="px-5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 text-[10px] rounded-xl font-black uppercase tracking-widest">
                                            Delete
                                        </button>
                                    </div>
                                )}
                                {isReadOnly && (
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            onReuse && onReuse(req);
                                        }} className="flex items-center gap-2 text-[10px] text-purple-600 hover:bg-purple-50 border border-purple-100 px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-colors">
                                            <RotateCcw className="w-3.5 h-3.5" /> Clone
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
                <Trash2 className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-xs">The queue is empty.</p>
                <p className="text-[10px] opacity-60">Deleted line items will appear here for restoration.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-black text-red-600 flex items-center gap-3 uppercase tracking-[2px]">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </div>
                    Line Item Recycle Bin
                </h2>
                <button onClick={onClear} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Purge All
                </button>
            </div>

            <div className="bg-white border border-red-100 rounded-[2rem] overflow-hidden shadow-sm shadow-red-900/5">
                <table className="w-full text-left text-sm table-fixed">
                    <colgroup>
                        <col className="w-12 md:w-20" />
                        <col className="w-1/3 md:w-1/3" />
                        <col className="w-0 md:w-auto" />
                        <col className="w-20 md:w-32" />
                        <col className="w-20 md:w-44" />
                        <col className="w-16 md:w-28" />
                    </colgroup>
                    <thead className="bg-red-50 text-red-600 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="p-4 md:p-6 md:px-10">#</th>
                            <th className="p-4 md:p-6 px-1 md:px-4">Identifier</th>
                            <th className="hidden md:table-cell p-4 md:p-6 px-4">Node</th>
                            <th className="p-4 md:p-6 px-1 md:px-4 text-right">Qty</th>
                            <th className="p-4 md:p-6 px-1 md:px-4 text-right">Impact</th>
                            <th className="p-4 md:p-6 px-1 md:px-4 text-center">Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                        {queue.map((item, index) => (
                            <tr key={item.id} className={`hover:bg-red-50/50 transition-colors ${item.itemData.isPriority ? 'bg-red-50' : 'bg-white'}`}>
                                <td className="py-6 pl-4 md:pl-10 text-[8px] md:text-xs text-slate-300 font-black tabular-nums">{index + 1}</td>
                                <td className="p-4 md:p-6 px-1 md:px-4">
                                    <div className={`font-black tracking-tight text-[10px] md:text-lg leading-tight ${item.itemData.isPriority ? 'text-red-700' : 'text-slate-900'}`}>
                                        {item.itemData.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{item.itemData.quantity} x {Number(item.itemData.unitPrice).toLocaleString()}</div>
                                </td>
                                <td className="hidden md:table-cell p-4 md:p-6 px-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full border border-slate-100">{item.itemData.category}</span>
                                </td>
                                <td className="p-4 md:p-6 px-1 md:px-4 text-right font-black tabular-nums text-slate-900 text-base">{item.itemData.quantity}</td>
                                <td className="p-4 md:p-6 px-1 md:px-4 text-right font-black tabular-nums text-slate-900 text-base">{Number(item.itemData.amount).toLocaleString()}</td>
                                <td className="p-4 md:p-6 px-1 md:px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onRestore(item)} className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(item.id)} className="p-3 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pb-20 md:pb-0">
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 flex justify-between items-center shadow-sm">
                    <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Standard Items</span>
                    <span className="text-slate-900 text-lg font-black tabular-nums tracking-tighter">
                        {new Intl.NumberFormat('en-UG').format(queue.reduce((sum, i) => !i.itemData.isPriority ? sum + Number(i.itemData.amount) : sum, 0))}
                    </span>
                </div>
                <div className="bg-red-50/30 p-6 rounded-[1.5rem] border border-red-50 flex justify-between items-center shadow-sm">
                    <span className="text-red-600 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Priority Items
                    </span>
                    <span className="text-red-700 text-lg font-black tabular-nums tracking-tighter">
                        {new Intl.NumberFormat('en-UG').format(queue.reduce((sum, i) => i.itemData.isPriority ? sum + Number(i.itemData.amount) : sum, 0))}
                    </span>
                </div>
            </div>
        </div>
    );
}
