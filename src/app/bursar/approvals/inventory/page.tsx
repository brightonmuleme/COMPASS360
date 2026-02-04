"use client";
import React, { useState } from 'react';
import { useSchoolData, InventoryItem } from '@/lib/store';
import { Package } from 'lucide-react';

export default function DirectorInventoryViewPage() {
    const {
        inventoryLists,
        inventoryGroups,
        inventoryItems,
        inventoryLogs,
        students
    } = useSchoolData();

    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);

    const activeList = inventoryLists.find(l => l.id === selectedListId);
    const listGroups = selectedListId ? inventoryGroups.filter(g => g.listId === selectedListId) : [];
    const getGroupItems = (groupId: string) => inventoryItems.filter(i => i.groupId === groupId);

    // Student requirements aggregation
    const studentRequirements: Record<string, number> = {};
    if (students) {
        students.forEach(s => {
            s.physicalRequirements?.forEach(r => {
                if (r.brought > 0) {
                    studentRequirements[r.name] = (studentRequirements[r.name] || 0) + r.brought;
                }
            });
        });
    }

    // Auto-select first list on mount
    React.useEffect(() => {
        if (!selectedListId && inventoryLists.length > 0) {
            setSelectedListId(inventoryLists[0].id);
        }
    }, [inventoryLists, selectedListId]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex">
            {/* SIDEBAR */}
            <aside className="w-64 bg-black border-r border-neutral-800 flex flex-col">
                <div className="p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-bold text-white">VINE Estate</h2>
                    <p className="text-xs text-neutral-500 mt-1">Inventory Management</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <div className="mb-4">
                        <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">LISTS</h3>
                        {inventoryLists.map(list => (
                            <button
                                key={list.id}
                                onClick={() => setSelectedListId(list.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${selectedListId === list.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                                    }`}
                            >
                                <Package className="w-4 h-4" />
                                {list.name}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t border-neutral-800">
                    <div className="text-xs text-neutral-600">
                        <p className="font-semibold">Director</p>
                        <p className="text-neutral-700">View Only Mode</p>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {!activeList ? (
                    <div className="flex-1 flex items-center justify-center text-neutral-600">
                        <div className="text-center">
                            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No List Selected</p>
                            <p className="text-sm">Select a list from the sidebar</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* HEADER */}
                        <header className="border-b border-neutral-800 px-8 py-6 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white uppercase tracking-wide">
                                    {activeList.name === 'Requirements' ? 'STUDENT REQUIREMENTS' : activeList.name}
                                </h1>
                                {activeList.name === 'Requirements' && (
                                    <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-900/50">SYNCED</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                                    title="View History"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                        </header>

                        {/* SCROLLABLE GRID */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {listGroups.map(group => {
                                const items = getGroupItems(group.id);
                                return (
                                    <div key={group.id} className="animate-fade-in">
                                        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            {group.name}
                                            <span className="text-xs text-neutral-700">({items.length})</span>
                                        </h2>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {items.map(item => {
                                                const isLowStock = item.quantity <= (item.minStock ?? 0);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="relative bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-blue-500/50 transition-all group"
                                                    >
                                                        {/* Low Stock Indicator */}
                                                        {isLowStock && (
                                                            <div className="absolute top-2 right-2 z-20">
                                                                <div className="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-1 rounded border border-red-900/50">
                                                                    LOW STOCK
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Item Name */}
                                                        <h3 className="text-base font-semibold text-white mb-1 pr-20">{item.name}</h3>

                                                        {/* Quantity Display */}
                                                        <div className={`relative z-10 ${activeList?.name === 'Requirements' ? 'text-neutral-300' : 'text-white/90'}`}>
                                                            {activeList?.name === 'Requirements' ? (
                                                                <div className="flex flex-col w-full mt-2">
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
                                                                                    <span className="text-4xl font-extrabold tracking-tight text-red-400">
                                                                                        -{used}
                                                                                    </span>
                                                                                    <span className="text-xs text-neutral-600 ml-1 mb-1">{item.units}</span>
                                                                                </div>

                                                                                {/* Bottom: Brought and Transfer Ins */}
                                                                                <div className="grid grid-cols-2 gap-2 text-center">
                                                                                    <div>
                                                                                        <div className="text-[9px] text-neutral-600 uppercase">Brought</div>
                                                                                        <div className="text-lg font-bold text-neutral-400">{brought}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-[9px] text-neutral-600 uppercase">Transfer Ins</div>
                                                                                        <div className="text-lg font-bold text-green-400">+{transferIns}</div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Available calculation info - more visible */}
                                                                                <div className="text-sm text-white mt-3 text-center font-bold border-t border-neutral-700 pt-3">
                                                                                    Available: <span className="text-blue-400 text-lg">{brought + transferIns - used}</span> <span className="text-neutral-500">{item.units}</span>
                                                                                </div>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-end gap-1">
                                                                    <span className="text-4xl font-extrabold tracking-tight">{item.quantity}</span>
                                                                    <span className="text-sm text-neutral-500 mb-1">{item.units}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Min Stock */}
                                                        <div className="mt-3 text-xs text-neutral-600">
                                                            Min: {item.minStock} {item.units}
                                                        </div>

                                                        {/* View History Button */}
                                                        <button
                                                            onClick={() => {
                                                                setViewingItem(item);
                                                                setIsHistoryOpen(true);
                                                            }}
                                                            className="mt-3 w-full px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors"
                                                        >
                                                            View History
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>

            {/* HISTORY MODAL (READ-ONLY) */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-neutral-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {viewingItem ? `${viewingItem.name} - History` : 'Inventory History'}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsHistoryOpen(false);
                                    setViewingItem(null);
                                }}
                                className="text-neutral-400 hover:text-slate-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                            {(() => {
                                const logs = viewingItem
                                    ? inventoryLogs.filter(l => l.itemId === viewingItem.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    : inventoryLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                if (logs.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-neutral-600">
                                            <p>No history available</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {logs.map(log => (
                                            <div key={log.id} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 group">
                                                <div className="flex items-start justify-between gap-4">
                                                    {/* Log Details */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-green-400 font-semibold">{log.itemName}</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action === 'add' ? 'bg-green-500/20 text-green-400' :
                                                                log.action === 'reduce' ? 'bg-red-500/20 text-red-400' :
                                                                    log.action === 'set' ? 'bg-blue-500/20 text-blue-400' :
                                                                        log.action === 'transfer_in' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                            'bg-orange-500/20 text-orange-400'
                                                                }`}>
                                                                {log.action === 'add' ? '+' : log.action === 'reduce' ? '-' : ''}{log.quantityChange} {inventoryItems.find(i => i.id === log.itemId)?.units}
                                                            </span>
                                                            <span className="text-neutral-500 text-sm">
                                                                → {log.newQuantity} {inventoryItems.find(i => i.id === log.itemId)?.units}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-neutral-400 mb-1">{log.comment}</p>
                                                        <div className="flex items-center gap-3 text-xs text-neutral-600">
                                                            <span>{new Date(log.date).toLocaleString()}</span>
                                                            <span>•</span>
                                                            <span>{log.user}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-6 border-t border-neutral-700 flex items-center justify-end">
                            <button
                                onClick={() => {
                                    setIsHistoryOpen(false);
                                    setViewingItem(null);
                                }}
                                className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
