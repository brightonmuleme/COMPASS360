"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSchoolData, InventoryItem, InventoryLog } from '@/lib/store';
import { Menu, X, List, History, Settings, Plus, Edit, Trash2, AlertCircle, MoreVertical, Lock } from 'lucide-react';

const SUGGESTED_UNITS = ['pcs', 'kgs', 'ltrs', 'metres', 'pairs', 'bags', 'boxes', 'tins'];
const LOG_LIMIT = 50;

export default function InventoryPage() {
    const {
        activeRole,
        inventoryLists, addInventoryList, deleteInventoryList,
        inventoryGroups, addInventoryGroup, updateInventoryGroup, deleteInventoryGroup,
        inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
        inventoryLogs, addInventoryLog, updateInventoryLog, deleteInventoryLog,
        inventorySettings, updateInventorySettings,
        students,
        studentRequirements
    } = useSchoolData();


    // STATE
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [visibleLogsCount, setVisibleLogsCount] = useState(LOG_LIMIT);


    // LIST FORM
    const [newListName, setNewListName] = useState('');
    const [isAddingList, setIsAddingList] = useState(false);

    // ADD ITEM FORM STATE
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemGroupId, setNewItemGroupId] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [newItemUnits, setNewItemUnits] = useState('');
    const [newItemMinStock, setNewItemMinStock] = useState('');

    // EDIT ITEM MODAL STATE
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editMode, setEditMode] = useState<'adjust' | 'details' | 'history'>('adjust');
    const [editAction, setEditAction] = useState<'add' | 'reduce'>('reduce');
    const [editQuantity, setEditQuantity] = useState('');
    const [editComment, setEditComment] = useState('');
    const [editDate, setEditDate] = useState('');

    // EDIT DETAILS FORM STATE
    const [detailName, setDetailName] = useState('');
    const [detailUnits, setDetailUnits] = useState('');
    const [detailMinStock, setDetailMinStock] = useState('');

    // HISTORY EDIT STATE
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editLogQty, setEditLogQty] = useState('');
    const [editLogComment, setEditLogComment] = useState('');

    // COMBO ANIMATION STATE
    const [combo, setCombo] = useState<{ itemId: string; count: number; x: number; y: number; key: number } | null>(null);
    const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- DERIVED DATA ---
    const activeList = inventoryLists.find(l => l.id === selectedListId);

    const listGroups = useMemo(() => {
        if (!selectedListId) return [];
        return inventoryGroups.filter(g => g.listId === selectedListId);
    }, [inventoryGroups, selectedListId]);

    const getGroupItems = (groupId: string) => inventoryItems.filter(i => i.groupId === groupId);

    // --- STUDENT REQUIREMENTS LOGIC ---
    // Aggregated totals now come from store directly as studentRequirements


    // Manual Sync Logic
    const handleSyncRequirements = async () => {
        setIsSyncing(true);
        // 1. Ensure List Exists
        let reqList = inventoryLists.find(l => l.name === 'Requirements');
        let reqListId = reqList?.id;

        if (!reqList) {
            reqListId = crypto.randomUUID();
            addInventoryList({ id: reqListId, name: 'Requirements' });
            addInventoryGroup({ id: crypto.randomUUID(), listId: reqListId, name: 'General' });
        }

        // 2. Ensure Items Exist
        const groups = inventoryGroups.filter(g => g.listId === reqListId);
        const reqGroup = groups[0] || { id: crypto.randomUUID() };
        if (!groups[0]) {
            addInventoryGroup({ id: reqGroup.id, listId: reqListId!, name: 'General' });
        }

        Object.keys(studentRequirements).forEach(reqName => {
            const exists = inventoryItems.some(i => i.groupId === reqGroup.id && i.name === reqName);
            if (!exists) {
                addInventoryItem({
                    id: crypto.randomUUID(),
                    name: reqName,
                    groupId: reqGroup.id,
                    quantity: 0,
                    units: 'pcs',
                    minStock: 0,
                    color: '#e2e8f0',
                    lastUpdated: new Date().toISOString()
                });
            }
        });

        setTimeout(() => setIsSyncing(false), 800);
    };


    // Initial Date Effect
    useEffect(() => {
        if (editingItem) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setEditDate(now.toISOString().slice(0, 16));

            // Init details form
            setDetailName(editingItem.name);
            setDetailUnits(editingItem.units || 'pcs');
            setDetailMinStock(editingItem.minStock?.toString() || '');
        }
    }, [editingItem]);

    // Clear combo timeout logic
    useEffect(() => {
        if (combo) {
            if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
            comboTimeoutRef.current = setTimeout(() => {
                setCombo(null);
            }, 1000); // Clear after 1s of inactivity
        }
        return () => {
            if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        };
    }, [combo?.key]);

    // --- ACTIONS ---
    const handleAddList = () => {
        if (!newListName.trim()) return;
        const newListId = crypto.randomUUID();
        addInventoryList({
            id: newListId,
            name: newListName
        });

        if (newListName.trim() === 'Requirements') {
            addInventoryGroup({
                id: crypto.randomUUID(),
                listId: newListId,
                name: 'General'
            });
        }

        setNewListName('');
        setIsAddingList(false);
    };

    const handleAddItem = () => {
        if (!newItemName.trim() || !newItemGroupId) return;

        const qty = parseInt(newItemQty) || 0;
        const min = parseInt(newItemMinStock) || 0;

        addInventoryItem({
            id: crypto.randomUUID(),
            name: newItemName,
            groupId: newItemGroupId,
            quantity: Math.max(0, qty),
            units: newItemUnits || 'pcs',
            minStock: min,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            lastUpdated: new Date().toISOString()
        });

        setIsAddingItem(false);
        setNewItemName('');
        setNewItemQty('');
        setNewItemUnits('');
        setNewItemMinStock('');
    };

    const handleConfirmStockEdit = () => {
        if (!editingItem || !editQuantity) return;

        const qty = parseInt(editQuantity);
        if (isNaN(qty) || qty <= 0) return;

        // Check if reduction would result in negative quantity
        if (editAction === 'reduce' && editingItem.quantity < qty) {
            alert(`Cannot reduce by ${qty} ${editingItem.units}. Only ${editingItem.quantity} ${editingItem.units} available in stock.`);
            return;
        }

        let newQty = editAction === 'add'
            ? editingItem.quantity + qty
            : editingItem.quantity - qty;

        updateInventoryItem({
            ...editingItem,
            quantity: newQty,
            lastUpdated: editDate ? new Date(editDate).toISOString() : new Date().toISOString()
        });

        addInventoryLog({
            id: crypto.randomUUID(),
            itemId: editingItem.id,
            itemName: editingItem.name,
            action: editAction,
            quantityChange: qty,
            newQuantity: newQty,
            comment: editComment || (editAction === 'add' ? 'Stock added' : 'Stock reduced'),
            date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(),
            user: activeRole || 'Unknown'
        });

        // Don't close modal, just switch state or clear form to allow rapid edits?
        // User probably expects it to close.
        setEditingItem(null);
        setEditQuantity('');
        setEditComment('');
    };

    const handleSaveDetails = () => {
        if (!editingItem) return;
        updateInventoryItem({
            ...editingItem,
            name: detailName,
            units: detailUnits,
            minStock: parseInt(detailMinStock) || 0
        });
        setEditMode('adjust');
    };

    const handleQuickAction = (item: InventoryItem, e: React.MouseEvent) => {
        e.stopPropagation();

        // Special handling for Requirements List
        const isRequirementsList = activeList?.name === 'Requirements';

        // For requirements: Click ALWAYS reduces by 1 (increments "Used" counter)
        // For other lists: Use the quick action setting
        const action = isRequirementsList ? 'reduce' : (inventorySettings?.quickAction || 'reduce');
        const qty = 1;

        // Check if reduction would result in negative quantity
        if (action === 'reduce' && item.quantity < qty) {
            // Don't perform action if insufficient stock
            return;
        }

        let newQty = action === 'add'
            ? item.quantity + qty
            : item.quantity - qty;

        updateInventoryItem({
            ...item,
            quantity: newQty,
            lastUpdated: new Date().toISOString()
        });

        addInventoryLog({
            id: crypto.randomUUID(),
            itemId: item.id,
            itemName: item.name,
            action: action,
            quantityChange: qty,
            newQuantity: newQty,
            comment: action === 'add' ? 'Quick Add' : (isRequirementsList ? 'Issued Requirement' : 'Quick Reduce'),
            date: new Date().toISOString(),
            user: activeRole || 'Unknown'
        });

        const isAdd = action === 'add';
        const change = isAdd ? 1 : -1;

        setCombo(prev => {
            if (!prev || prev.itemId !== item.id) {
                return {
                    itemId: item.id,
                    count: change,
                    x: e.clientX,
                    y: e.clientY,
                    key: 0
                };
            }
            return {
                ...prev,
                count: prev.count + change,
                x: e.clientX,
                y: e.clientY,
                key: prev.key + 1
            };
        });
    };

    // --- HISTORY MANAGEMENT ---
    const handleDeleteLog = (log: InventoryLog) => {
        if (!confirm('Are you sure you want to delete this log? This will reverse the stock change.')) return;

        const item = inventoryItems.find(i => i.id === log.itemId);
        if (item) {
            let restoredQty = item.quantity;
            if (log.action === 'add') {
                restoredQty = Math.max(0, item.quantity - log.quantityChange);
            } else if (log.action === 'reduce') {
                restoredQty = item.quantity + log.quantityChange;
            }

            updateInventoryItem({
                ...item,
                quantity: restoredQty
            });
        }
        deleteInventoryLog(log.id);
    };

    const handleSaveLogEdit = (log: InventoryLog) => {
        const newQtyChange = parseInt(editLogQty);
        if (isNaN(newQtyChange) || newQtyChange <= 0) return;

        const item = inventoryItems.find(i => i.id === log.itemId);
        if (item) {
            let currentQty = item.quantity;
            const oldQtyChange = log.quantityChange;

            // Calculate Delta
            let delta = 0;
            if (log.action === 'add') {
                delta = newQtyChange - oldQtyChange;
                currentQty = Math.max(0, currentQty + delta);
            } else if (log.action === 'reduce') {
                delta = oldQtyChange - newQtyChange;
                currentQty = currentQty + delta;
            }

            updateInventoryItem({
                ...item,
                quantity: currentQty
            });
        }

        updateInventoryLog({
            ...log,
            quantityChange: newQtyChange,
            comment: editLogComment,
        });
        setEditingLogId(null);
    };

    const relevantLogs = useMemo(() => {
        let logs = inventoryLogs;
        if (selectedListId) {
            const listGroupIds = inventoryGroups.filter(g => g.listId === selectedListId).map(g => g.id);
            const listItems = inventoryItems.filter(i => listGroupIds.includes(i.groupId)).map(i => i.id);
            logs = inventoryLogs.filter(l => listItems.includes(l.itemId));
        }
        return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [inventoryLogs, selectedListId, inventoryGroups, inventoryItems]);

    // --- RENDER HELPERS ---
    const renderHistory = (itemId?: string) => {
        let displayLogs = itemId ? relevantLogs.filter(l => l.itemId === itemId) : relevantLogs;
        const totalLogs = displayLogs.length;
        displayLogs = displayLogs.slice(0, visibleLogsCount);

        return (
            <div className="space-y-4">
                {displayLogs.map(log => {
                    const isEditing = editingLogId === log.id;
                    const item = inventoryItems.find(i => i.id === log.itemId);
                    return (
                        <div key={log.id} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-neutral-800/50 transition-all group border border-transparent hover:border-neutral-800">
                            <div className="text-[10px] text-neutral-500 w-12 pt-1.5 font-mono shrink-0 font-bold uppercase tracking-tighter">
                                {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>

                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={editLogQty}
                                                onChange={e => setEditLogQty(e.target.value)}
                                                className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-center text-white outline-none focus:border-blue-600"
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                value={editLogComment}
                                                onChange={e => setEditLogComment(e.target.value)}
                                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-600"
                                            />
                                        </div>
                                        <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest pl-1">
                                            <button onClick={() => handleSaveLogEdit(log)} className="text-blue-500 hover:text-blue-400 transition-colors">Apply</button>
                                            <button onClick={() => setEditingLogId(null)} className="text-neutral-600 hover:text-neutral-400 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-white tracking-tight">
                                                {log.itemName}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${log.action === 'add' || log.action === 'transfer_in'
                                                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                                                : 'text-red-400 border-red-500/20 bg-red-500/5'
                                                }`}>
                                                {log.action === 'set' ? 'SET' : (log.action === 'add' || log.action === 'transfer_in' ? 'IN' : 'OUT')} {Math.abs(log.quantityChange)}
                                            </span>
                                            {log.newQuantity !== undefined && (
                                                <span className="text-[10px] font-bold text-neutral-500 tracking-tight">
                                                    → {log.newQuantity} {item?.units || ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[9px] font-bold text-neutral-600 mt-1 uppercase tracking-[0.1em]">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        {log.comment && <div className="text-xs text-neutral-400 mt-1.5 leading-relaxed italic opacity-80 break-words">"{log.comment}"</div>}
                                    </>
                                )}
                            </div>

                            {!isEditing && (
                                <div className="flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(log.action === 'add' || log.action === 'reduce') && !log.comment?.toLowerCase().includes('transfer') && log.comment !== 'Stock added' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingLogId(log.id);
                                                    setEditLogQty(log.quantityChange.toString());
                                                    setEditLogComment(log.comment || '');
                                                }}
                                                className="p-1.5 text-neutral-600 hover:text-blue-500 hover:bg-neutral-800 rounded-lg transition-all"
                                                title="Edit Entry"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLog(log)}
                                                className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-neutral-800 rounded-lg transition-all"
                                                title="Delete Entry"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                    {(log.comment?.toLowerCase().includes('transfer') || log.action === 'transfer_in' || log.action === 'transfer_out' || log.comment === 'Stock added') && (
                                        <div className="p-1.5 text-neutral-700" title="System Locked Entry">
                                            <Lock className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {totalLogs > visibleLogsCount && (
                    <div className="pt-6 pb-2 px-3">
                        <button
                            onClick={() => setVisibleLogsCount(prev => prev + LOG_LIMIT)}
                            className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-neutral-700/50"
                        >
                            Review Older Entries ({totalLogs - visibleLogsCount} more)
                        </button>
                    </div>
                )}

                {displayLogs.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-neutral-600 opacity-40">
                        <History className="w-12 h-12 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No transaction history found</span>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="flex h-screen bg-neutral-900 text-gray-100 font-sans overflow-hidden">
            {/* SIDEBAR - Mobile Reactive */}
            <div className={`fixed inset-y-0 left-0 z-[50] w-64 bg-black border-r border-neutral-800 transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">VINE Estate</h1>
                        <p className="text-[10px] text-neutral-500 mt-0.5 uppercase tracking-wider font-bold">Inventory System</p>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto py-4 space-y-1">
                    <div className="px-4 pb-2 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Lists</div>
                    {inventoryLists.map(list => (
                        <button
                            key={list.id}
                            onClick={() => {
                                setSelectedListId(list.id);
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full text-left px-6 py-4 flex items-center justify-between transition-all relative group
                                ${selectedListId === list.id
                                    ? 'text-white bg-neutral-900 border-l-4 border-blue-600 font-bold'
                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {list.name === 'Requirements' ? (
                                    <List className={`w-4 h-4 ${selectedListId === list.id ? 'text-blue-500' : 'text-neutral-600'}`} />
                                ) : (
                                    <span className={`w-2 h-2 rounded-full ${selectedListId === list.id ? 'bg-blue-500' : 'bg-neutral-800 group-hover:bg-neutral-600'}`}></span>
                                )}
                                <span className="text-sm">{list.name}</span>
                            </div>
                        </button>
                    ))}

                    <button
                        onClick={() => setIsAddingList(true)}
                        className="w-full text-left px-6 py-4 text-xs font-bold text-neutral-600 hover:text-blue-400 flex items-center gap-2 transition-all mt-4 border-t border-neutral-900 pt-6"
                    >
                        <Plus className="w-4 h-4" />
                        Create New List
                    </button>
                </div>

                {isAddingList && (
                    <div className="mx-4 mb-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl">
                        <input
                            autoFocus
                            value={newListName}
                            onChange={e => setNewListName(e.target.value)}
                            placeholder="Name..."
                            className="bg-black text-white border border-neutral-800 px-3 py-2 rounded-xl text-sm w-full mb-3 outline-none focus:border-blue-600 transition-all"
                            onKeyDown={e => e.key === 'Enter' && handleAddList()}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleAddList} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors">Add</button>
                            <button onClick={() => setIsAddingList(false)} className="px-3 py-2 text-neutral-500 text-xs hover:text-white transition-colors">✕</button>
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-neutral-800 text-[10px] text-neutral-700 flex justify-between font-mono">
                    <span>VINE FINANCE</span>
                    <span>v2.0.MOBILE</span>
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-300"></div>
            )}


            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden relative">
                {/* Mobile Navigation Persistence: Ensures Hamburger is always available */}
                <div className="md:hidden h-16 flex items-center px-4 shrink-0 bg-black/40 backdrop-blur-md border-b border-neutral-800 z-[40]">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-neutral-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    {!selectedListId && <span className="ml-3 text-xs font-black text-white uppercase tracking-[0.2em]">Inventory Hub</span>}
                </div>

                {!selectedListId ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                        <div className="w-16 h-16 bg-neutral-800 rounded-3xl flex items-center justify-center mb-6 text-neutral-600 shadow-2xl">
                            <List className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-neutral-300 uppercase tracking-tighter">Inventory Core</h2>
                        <p className="max-w-xs text-center mt-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed">System Standby. Activate a manifest from the registry to begin monitoring.</p>
                    </div>
                ) : (

                    <>
                        {/* HEADER */}
                        <header className="hidden md:flex h-16 border-b border-neutral-800 items-center justify-between px-8 bg-black/40 backdrop-blur-md z-[40] sticky top-0 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">

                                <h2 className="text-base md:text-xl font-black text-white tracking-tight truncate">
                                    {activeList?.name === 'Requirements' ? 'REQUIREMENTS' : activeList?.name}
                                </h2>
                                {activeList?.name === 'Requirements' && (
                                    <span className="hidden xs:inline-block bg-blue-500/20 text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/30 uppercase">SYNC</span>
                                )}
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2">
                                {activeList?.name === 'Requirements' && (
                                    <button
                                        onClick={handleSyncRequirements}
                                        disabled={isSyncing}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSyncing ? 'bg-neutral-800 text-neutral-600' : 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20'}`}
                                    >
                                        <AlertCircle className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                        {isSyncing ? 'Syncing...' : 'Repair Registry'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsManageGroupsOpen(true)}

                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
                                    title="Groups"
                                >
                                    <List className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setVisibleLogsCount(LOG_LIMIT);
                                        setIsHistoryOpen(true);
                                    }}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
                                    title="History"
                                >
                                    <History className="w-5 h-5" />
                                </button>
                                {activeList?.name !== 'Requirements' && (
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
                                        title="Settings"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </header>

                        {/* SCROLLABLE GRID */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 no-scrollbar">
                            {listGroups.map(group => {
                                const items = getGroupItems(group.id);
                                return (
                                    <div key={group.id} className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-2">
                                            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                                {group.name}
                                                <span className="bg-neutral-800 text-neutral-500 rounded-full px-2 py-0.5 text-[10px]">{items.length}</span>
                                            </h3>
                                            {activeList?.name !== 'Requirements' && (
                                                <button
                                                    onClick={() => {
                                                        setNewItemGroupId(group.id);
                                                        setIsAddingItem(true);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-all text-lg"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">

                                            {items.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`group relative p-3.5 sm:p-5 rounded-xl transition-all cursor-pointer overflow-hidden border
                                                        ${activeList?.name === 'Requirements'
                                                            ? 'bg-neutral-900 border-neutral-800 hover:border-blue-500/50'
                                                            : 'bg-neutral-800 border-neutral-700/50 hover:-translate-y-1 hover:shadow-lg'
                                                        }`}

                                                    style={{
                                                        borderLeftWidth: activeList?.name === 'Requirements' ? '1px' : '4px',
                                                        borderLeftColor: activeList?.name === 'Requirements' ? undefined : item.color,
                                                        boxShadow: activeList?.name === 'Requirements' ? undefined : `0 4px 6px -1px ${item.color}10`
                                                    }}
                                                    onClick={(e) => handleQuickAction(item, e)}
                                                >
                                                    {/* Card Content... Copied and styled from original but adapted for dark theme */}
                                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                                        <span className="text-sm sm:text-base font-bold leading-tight pr-6 break-words text-white">{item.name}</span>


                                                        {item.minStock && item.quantity <= item.minStock && (
                                                            <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full shadow-md animate-pulse z-10">
                                                                !
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={`relative z-10 ${activeList?.name === 'Requirements' ? 'text-neutral-300' : 'text-white/90'}`}>
                                                        {activeList?.name === 'Requirements' ? (
                                                            <div className="flex flex-col w-full mt-2">
                                                                {/* Calculate counters for requirements */}
                                                                {(() => {
                                                                    const brought = studentRequirements[item.name] || 0;
                                                                    const transferIns = inventoryLogs
                                                                        .filter(l => l.itemId === item.id && (
                                                                            l.comment?.toLowerCase().includes('transfer in') ||
                                                                            (l.action === 'add' && !l.comment?.toLowerCase().includes('transfer out'))
                                                                        ))
                                                                        .reduce((acc, l) => acc + l.quantityChange, 0);
                                                                    const used = inventoryLogs
                                                                        .filter(l => l.itemId === item.id && (
                                                                            l.comment?.toLowerCase().includes('transfer out') ||
                                                                            (l.action === 'reduce' && !l.comment?.toLowerCase().includes('transfer in'))
                                                                        ))
                                                                        .reduce((acc, l) => acc + l.quantityChange, 0);

                                                                    return (
                                                                        <>
                                                                            {/* Top: Used (negative number) */}
                                                                            <div className="flex items-end justify-center mb-3">
                                                                                <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-red-400">
                                                                                    -{used}
                                                                                </span>
                                                                                <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 mb-1 sm:mb-1.5 ml-1">{item.units}</span>
                                                                            </div>


                                                                            {/* Bottom: Brought (left) and Transfer Ins (right) */}
                                                                            <div className="flex justify-between mt-3 text-[10px] text-neutral-500 border-t border-neutral-800 pt-3">
                                                                                <div className="flex flex-col">
                                                                                    <span>Brought</span>
                                                                                    <span className="text-white font-mono text-sm">{brought}</span>
                                                                                </div>
                                                                                <div className="flex flex-col text-right">
                                                                                    <span>Transfer Ins</span>
                                                                                    <span className="text-green-400 font-mono text-sm">+{transferIns}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Available calculation info - more visible */}
                                                                            <div className="text-[11px] sm:text-sm text-white mt-3 text-center font-bold border-t border-neutral-700 pt-3">
                                                                                Available: <span className="text-blue-400 text-sm sm:text-lg">{brought + transferIns - used}</span> <span className="text-neutral-500">{item.units}</span>
                                                                            </div>

                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-end gap-1.5 mt-2">
                                                                <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white" style={{ color: item.color }}>{item.quantity}</span>
                                                                <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 mb-1 sm:mb-1.5">{item.units}</span>
                                                            </div>

                                                        )}
                                                    </div>

                                                    {/* Three Dots - Edit */}
                                                    <button
                                                        className="absolute top-1 sm:top-2 right-1 sm:right-2 p-1.5 sm:p-2 rounded-full hover:bg-black/20 text-white/50 hover:text-white transition-colors z-20"

                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingItem(item);
                                                            setEditMode('adjust');
                                                            setEditQuantity('');
                                                            setEditComment('');
                                                        }}
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Add Item Card Ghost */}
                                            {activeList?.name !== 'Requirements' && (
                                                <button
                                                    onClick={() => {
                                                        setNewItemGroupId(group.id);
                                                        setIsAddingItem(true);
                                                    }}
                                                    className="border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-6 text-neutral-600 hover:text-neutral-400 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all min-h-[160px]"
                                                >
                                                    <span className="text-3xl mb-2 font-light">+</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider">Add Item</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="h-32"></div>
                        </div>
                    </>
                )}
            </div>

            {/* COMBO ANIMATION */}
            {combo && (
                <div
                    key={combo.key}
                    className="pointer-events-none fixed z-[9999] text-4xl font-black animate-float-up text-shadow-sm"
                    style={{
                        left: combo.x,
                        top: combo.y,
                        color: combo.count > 0 ? '#4ade80' : '#f87171',
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    {combo.count > 0 ? '+' : ''}{combo.count}
                </div>
            )}

            {/* --- MODAL: SETTINGS (Dark Mode) --- */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/80 z-[100] animate-fade-in flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden animate-scale-up shadow-2xl">
                        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-neutral-400 hover:text-white font-medium text-sm">Done</button>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4 tracking-wider">Quick Interaction</h3>
                            <div className="space-y-3">
                                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${inventorySettings?.quickAction === 'reduce' ? 'bg-neutral-800 border-blue-600' : 'bg-transparent border-neutral-800 hover:bg-neutral-800'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${inventorySettings?.quickAction === 'reduce' ? 'border-blue-500' : 'border-neutral-600'}`}>
                                        {inventorySettings?.quickAction === 'reduce' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">Reduce on Tap</div>
                                        <div className="text-xs text-neutral-400">Tapping an item decreases stock by 1</div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="quickAction"
                                        className="hidden"
                                        checked={inventorySettings?.quickAction === 'reduce'}
                                        onChange={() => updateInventorySettings({ quickAction: 'reduce' })}
                                    />
                                </label>
                                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${inventorySettings?.quickAction === 'add' ? 'bg-neutral-800 border-blue-600' : 'bg-transparent border-neutral-800 hover:bg-neutral-800'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${inventorySettings?.quickAction === 'add' ? 'border-blue-500' : 'border-neutral-600'}`}>
                                        {inventorySettings?.quickAction === 'add' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">Add on Tap</div>
                                        <div className="text-xs text-neutral-400">Tapping an item increases stock by 1</div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="quickAction"
                                        className="hidden"
                                        checked={inventorySettings?.quickAction === 'add'}
                                        onChange={() => updateInventorySettings({ quickAction: 'add' })}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: ADD NEW ITEM (Dark Mode) --- */}
            {isAddingItem && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden p-6 animate-scale-up shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 text-white">New Item</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Item Name</label>
                                <input
                                    autoFocus
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                    placeholder="e.g. Marker Pens"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Category Group</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white outline-none appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        value={newItemGroupId}
                                        onChange={e => setNewItemGroupId(e.target.value)}
                                    >
                                        {listGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Initial Stock</label>
                                    <input
                                        type="number"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                        placeholder="0"
                                        value={newItemQty}
                                        onChange={e => setNewItemQty(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Units</label>
                                    <input
                                        list="unit-suggestions"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="pcs"
                                        value={newItemUnits}
                                        onChange={e => setNewItemUnits(e.target.value)}
                                    />
                                    <datalist id="unit-suggestions">
                                        {SUGGESTED_UNITS.map(u => <option key={u} value={u} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsAddingItem(false)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleAddItem} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all">Save Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: EDIT / ADJUST ITEM --- */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-0 relative min-h-[400px] max-h-[85vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 pb-4 bg-neutral-800/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{editingItem.name}</h2>
                                    <p className="text-neutral-400 text-sm mt-0.5">{editingItem.quantity} {editingItem.units} in stock</p>
                                </div>
                                <button onClick={() => setEditingItem(null)} className="text-neutral-500 hover:text-white p-1 bg-neutral-800 rounded-full transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 mt-6 bg-neutral-900/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setEditMode('adjust')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${editMode === 'adjust' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    Adjust Stock
                                </button>
                                <button
                                    onClick={() => setEditMode('details')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${editMode === 'details' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    Edit Details
                                </button>
                                <button
                                    onClick={() => setEditMode('history')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${editMode === 'history' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    History
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {editMode === 'adjust' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setEditAction('add')}
                                            className={`flex-1 py-4 px-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${editAction === 'add' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-neutral-800 bg-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
                                        >
                                            <span className="text-2xl font-bold">+</span>
                                            <span className="text-xs font-bold uppercase">Add Stock</span>
                                        </button>
                                        <button
                                            onClick={() => setEditAction('reduce')}
                                            className={`flex-1 py-4 px-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${editAction === 'reduce' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-neutral-800 bg-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
                                        >
                                            <span className="text-2xl font-bold">-</span>
                                            <span className="text-xs font-bold uppercase">Reduce</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Quantity Change</label>
                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-4 text-3xl font-mono text-center text-white placeholder-neutral-600 outline-none focus:border-blue-500 transition-all"
                                            placeholder="0"
                                            value={editQuantity}
                                            onChange={e => setEditQuantity(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Reason / Comment</label>
                                        <textarea
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-blue-500 transition-all resize-none"
                                            placeholder="Optional note..."
                                            rows={2}
                                            value={editComment}
                                            onChange={e => setEditComment(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Date (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        onClick={handleConfirmStockEdit}
                                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${editAction === 'add' ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'}`}
                                    >
                                        Confirm {editAction === 'add' ? 'Addition' : 'Reduction'}
                                    </button>
                                </div>
                            )}

                            {editMode === 'details' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Item Name</label>
                                        <input
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                            value={detailName}
                                            onChange={e => setDetailName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Units</label>
                                        <input
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                            value={detailUnits}
                                            onChange={e => setDetailUnits(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 text-yellow-500">Min Stock Alert</label>
                                        <input
                                            type="number"
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500"
                                            value={detailMinStock}
                                            onChange={e => setDetailMinStock(e.target.value)}
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            onClick={handleSaveDetails}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this item permanently?')) {
                                                    deleteInventoryItem(editingItem.id);
                                                    setEditingItem(null);
                                                }
                                            }}
                                            className="w-full py-3 mt-3 text-red-500 hover:bg-red-500/10 font-bold rounded-xl transition-all"
                                        >
                                            Delete Item
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editMode === 'history' && (
                                <div className="animate-fade-in -mx-2">
                                    {renderHistory(editingItem.id)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* --- MODAL: MANAGE GROUPS (Premium Dark) --- */}
            {isManageGroupsOpen && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-500">

                        <div className="p-8 border-b border-neutral-800 bg-black/40 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">Categories</h2>
                                <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.3em] mt-2">Logical Groupings</p>
                            </div>
                            <button onClick={() => setIsManageGroupsOpen(false)} className="bg-neutral-800 p-2.5 rounded-2xl hover:bg-neutral-700 transition-colors">
                                <X className="w-6 h-6 text-neutral-400" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar space-y-3">
                            {listGroups.map(g => (
                                <div key={g.id} className="flex justify-between items-center p-4 bg-neutral-950/30 rounded-2xl border border-neutral-800 transition-all hover:bg-neutral-800/50">
                                    <span className="font-black text-neutral-300 text-sm tracking-tight">{g.name}</span>
                                    <button onClick={() => { if (confirm(`Purge category "${g.name}" and all contents?`)) deleteInventoryGroup(g.id); }} className="text-neutral-700 hover:text-red-500 p-2 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 bg-black/20">
                            <button onClick={() => { const name = prompt("New Group Name:"); if (name && selectedListId) addInventoryGroup({ id: crypto.randomUUID(), listId: selectedListId, name }); }} className="w-full py-5 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:bg-neutral-200 transition-all">
                                + New Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: GLOBAL LOGS (Premium Dark) --- */}
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-[3rem] shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">

                        <div className="px-8 py-6 border-b border-neutral-800 flex justify-between items-center bg-black/40">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">Master Logs</h2>
                                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mt-1">Full Transaction Audit</p>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} className="bg-neutral-800 p-2.5 rounded-2xl hover:bg-neutral-700 transition-colors">
                                <X className="w-6 h-6 text-neutral-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-neutral-900/50">
                            {renderHistory()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
