"use client";
import React, { useState } from 'react';
import { useSchoolData, InventoryTransfer } from '@/lib/store';
import { Package, ArrowRight, Clock, CheckCircle, XCircle, Search, Printer } from 'lucide-react';

export default function TransfersApprovalPage() {
    const { inventoryTransfers, updateInventoryTransfer, addInventoryTransfer, inventoryItems, updateInventoryItem, addInventoryLog, activeRole } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingTransfer, setViewingTransfer] = useState<InventoryTransfer | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Filter transfers that need approval (in-transit or completed)
    const pendingTransfers = inventoryTransfers.filter(t => t.status === 'in-transit' || t.status === 'completed');
    const approvedTransfers = inventoryTransfers.filter(t => t.status === 'approved');
    const rejectedTransfers = inventoryTransfers.filter(t => t.status === 'rejected');

    const filteredTransfers = (
        activeTab === 'Pending' ? pendingTransfers :
            activeTab === 'Approved' ? approvedTransfers :
                rejectedTransfers
    ).filter(transfer =>
        searchQuery === '' ||
        transfer.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        transfer.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApprove = (transfer: InventoryTransfer) => {
        updateInventoryTransfer({
            ...transfer,
            status: 'approved'
        });
        setViewingTransfer(null);
    };

    const handleReject = (transfer: InventoryTransfer) => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        // Update transfer status to rejected
        updateInventoryTransfer({
            ...transfer,
            status: 'rejected',
            rejectionReason: rejectionReason
        } as any);

        // Create reversal transfer
        const reversalTransfer: InventoryTransfer = {
            id: crypto.randomUUID(),
            type: transfer.type === 'out' ? 'in' : 'out', // Opposite type
            items: transfer.items, // Same items
            source: transfer.destination, // Swapped
            destination: transfer.source, // Swapped
            status: 'in-transit', // Automatically in-transit
            date: new Date().toISOString(),
            notes: `Reversal of rejected transfer ${transfer.id}. Reason: ${rejectionReason}`
        };

        addInventoryTransfer(reversalTransfer);

        // Update inventory quantities for reversal
        if (transfer.type === 'out') {
            // Original was OUT, so reversal is IN (add back)
            // For requirements: This should DECREASE the Used counter (reduce the negative value)
            transfer.items.forEach(item => {
                const inventoryItem = inventoryItems.find((i: any) => i.id === item.itemId);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.quantity + item.quantity;
                    updateInventoryItem({
                        ...inventoryItem,
                        quantity: newQuantity,
                        lastUpdated: new Date().toISOString()
                    });

                    // Use 'reduce' action with NEGATIVE quantityChange to decrease Used counter
                    addInventoryLog({
                        id: crypto.randomUUID(),
                        itemId: inventoryItem.id,
                        itemName: inventoryItem.name,
                        action: 'reduce',
                        quantityChange: -item.quantity, // Negative to decrease Used counter
                        newQuantity: newQuantity,
                        comment: `Reversal: Rejected Transfer OUT to ${transfer.destination}`,
                        date: new Date().toISOString(),
                        user: activeRole || 'Director'
                    });
                }
            });
        } else {
            // Original was IN, so reversal is OUT (remove)
            // For requirements: This should DECREASE the Transfer Ins counter
            transfer.items.forEach(item => {
                const inventoryItem = inventoryItems.find((i: any) => i.id === item.itemId);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.quantity - item.quantity;
                    updateInventoryItem({
                        ...inventoryItem,
                        quantity: Math.max(0, newQuantity),
                        lastUpdated: new Date().toISOString()
                    });

                    // Use 'add' action with NEGATIVE quantityChange to decrease Transfer Ins counter
                    addInventoryLog({
                        id: crypto.randomUUID(),
                        itemId: inventoryItem.id,
                        itemName: inventoryItem.name,
                        action: 'add',
                        quantityChange: -item.quantity, // Negative to decrease Transfer Ins counter
                        newQuantity: Math.max(0, newQuantity),
                        comment: `Reversal: Rejected Transfer IN from ${transfer.source}`,
                        date: new Date().toISOString(),
                        user: activeRole || 'Director'
                    });
                }
            });
        }

        setViewingTransfer(null);
        setRejectionReason('');
        alert('Transfer rejected and reversal created successfully');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Package className="w-8 h-8 text-blue-400" />
                            Transfer Approvals
                        </h1>
                        <p className="text-slate-400 mt-1">Review and approve inventory transfers</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
                    {['Pending', 'Approved', 'Rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {tab} ({
                                tab === 'Pending' ? pendingTransfers.length :
                                    tab === 'Approved' ? approvedTransfers.length :
                                        rejectedTransfers.length
                            })
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search transfers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Transfers List */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                {filteredTransfers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No Transfers Found</p>
                        <p className="text-sm">There are no transfers in this category.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTransfers.map((transfer) => (
                            <div
                                key={transfer.id}
                                className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/50 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${transfer.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                transfer.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                                    transfer.status === 'in-transit' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        transfer.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {transfer.status.toUpperCase()}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${transfer.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {transfer.type === 'in' ? 'INCOMING' : 'OUTGOING'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm mb-3">
                                            <span className="text-slate-300 font-medium">{transfer.source}</span>
                                            <ArrowRight className="w-4 h-4 text-slate-500" />
                                            <span className="text-slate-300 font-medium">{transfer.destination}</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(transfer.date).toLocaleDateString()}
                                            </span>
                                            <span>{transfer.items.length} items</span>
                                        </div>

                                        {transfer.notes && (
                                            <p className="text-sm text-slate-400 mt-2 italic">{transfer.notes}</p>
                                        )}
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <button
                                            onClick={() => setViewingTransfer(transfer)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {viewingTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Review Transfer</h2>
                            <button onClick={() => {
                                setViewingTransfer(null);
                                setRejectionReason('');
                            }} className="text-slate-400 hover:text-slate-200">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${viewingTransfer.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    viewingTransfer.status === 'in-transit' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {viewingTransfer.status.toUpperCase()}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${viewingTransfer.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {viewingTransfer.type === 'in' ? 'INCOMING' : 'OUTGOING'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-sm text-slate-500">FROM</label>
                                    <p className="text-white font-medium">{viewingTransfer.source}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-500">TO</label>
                                    <p className="text-white font-medium">{viewingTransfer.destination}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="text-sm text-slate-500 mb-2 block">ITEMS TRANSFERRED</label>
                                <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                                    {viewingTransfer.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm border-b border-slate-700 pb-2 last:border-0">
                                            <span className="text-slate-300">{item.name}</span>
                                            <span className="text-slate-400 font-medium">{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {viewingTransfer.notes && (
                                <div className="mb-4">
                                    <label className="text-sm text-slate-500 mb-2 block">NOTES</label>
                                    <p className="text-slate-300 text-sm">{viewingTransfer.notes}</p>
                                </div>
                            )}

                            {activeTab === 'Pending' && (
                                <div className="mb-4">
                                    <label className="text-sm text-slate-500 mb-2 block">REJECTION REASON (Optional)</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Provide a reason if rejecting..."
                                        rows={3}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            )}

                            <div className="text-xs text-slate-500">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(viewingTransfer.date).toLocaleString()}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setViewingTransfer(null);
                                    setRejectionReason('');
                                }}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            {activeTab === 'Pending' && (
                                <>
                                    <button
                                        onClick={() => handleReject(viewingTransfer)}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Reject & Reverse
                                    </button>
                                    <button
                                        onClick={() => handleApprove(viewingTransfer)}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
