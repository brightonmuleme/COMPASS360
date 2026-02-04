"use client";
import React, { useState } from 'react';
import { useSchoolData, InventoryTransfer, InventoryItem } from '@/lib/store';
import { Package, ArrowRight, Clock, CheckCircle, XCircle, Plus, Search, Filter, ArrowUp, ArrowDown, Edit, Trash2, Eye, MapPin, Printer } from 'lucide-react';

export default function TransfersPage() {
    const {
        inventoryTransfers,
        inventoryItems,
        inventoryGroups,
        inventoryLocations,
        inventoryLogs,
        inventoryLists,
        students,
        studentRequirements,
        addInventoryTransfer,

        updateInventoryTransfer,
        updateInventoryItem,
        addInventoryLocation,
        addInventoryLog,
        activeRole
    } = useSchoolData();

    // Derived: Requirements now come from store



    const [activeTab, setActiveTab] = useState<'All' | 'Draft' | 'In Transit' | 'Completed' | 'Approved' | 'Rejected'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [locationFilter, setLocationFilter] = useState('All Locations');
    const [showNewTransferModal, setShowNewTransferModal] = useState(false);
    const [viewingTransfer, setViewingTransfer] = useState<InventoryTransfer | null>(null);
    const [editingTransfer, setEditingTransfer] = useState<InventoryTransfer | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

    const filteredTransfers = inventoryTransfers.filter(transfer => {
        const matchesTab = activeTab === 'All' || transfer.status.toLowerCase().replace('-', ' ') === activeTab.toLowerCase();
        const matchesSearch = searchQuery === '' ||
            transfer.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            transfer.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transfer.destination.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'All Types' || transfer.type === typeFilter.toLowerCase();
        const matchesLocation = locationFilter === 'All Locations' ||
            transfer.source === locationFilter ||
            transfer.destination === locationFilter;

        return matchesTab && matchesSearch && matchesType && matchesLocation;
    });

    // --- HELPERS ---
    const getAvailableStock = (item: InventoryItem) => {
        const requirementsList = inventoryLists.find((list: any) => list.name === 'Requirements');
        const requirementGroups = inventoryGroups.filter((g: any) => g.listId === requirementsList?.id).map((g: any) => g.id);
        const isRequirement = requirementGroups.includes(item.groupId);


        if (!isRequirement) return item.quantity;

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

        return brought + transferIns - used;
    };

    const processTransferUpdate = (transfer: InventoryTransfer, newStatus: InventoryTransfer['status']) => {
        const updatedTransfer = { ...transfer, status: newStatus };
        updateInventoryTransfer(updatedTransfer);

        if (newStatus === 'in-transit' && transfer.type === 'out') {
            transfer.items.forEach(item => {
                const inventoryItem = inventoryItems.find(i => i.id === item.itemId);
                if (inventoryItem) {
                    const newQty = inventoryItem.quantity - item.quantity;
                    updateInventoryItem({ ...inventoryItem, quantity: newQty, lastUpdated: new Date().toISOString() });
                    addInventoryLog({
                        id: crypto.randomUUID(),
                        itemId: inventoryItem.id,
                        itemName: inventoryItem.name,
                        action: 'reduce',
                        quantityChange: item.quantity,
                        newQuantity: newQty,
                        comment: `Transfer OUT to ${transfer.destination} (Confirmed)`,
                        date: new Date().toISOString(),
                        user: activeRole || 'Estate Manager'
                    });
                }
            });
        }

        if (newStatus === 'completed' && transfer.type === 'in') {
            transfer.items.forEach(item => {
                const inventoryItem = inventoryItems.find(i => i.id === item.itemId);
                if (inventoryItem) {
                    const newQty = inventoryItem.quantity + item.quantity;
                    updateInventoryItem({ ...inventoryItem, quantity: newQty, lastUpdated: new Date().toISOString() });
                    addInventoryLog({
                        id: crypto.randomUUID(),
                        itemId: inventoryItem.id,
                        itemName: inventoryItem.name,
                        action: 'add',
                        quantityChange: item.quantity,
                        newQuantity: newQty,
                        comment: `Transfer IN from ${transfer.source} (Confirmed)`,
                        date: new Date().toISOString(),
                        user: activeRole || 'Estate Manager'
                    });
                }
            });
        }

        setActiveActionMenuId(null);
    };

    const handleEditTransfer = (transfer: InventoryTransfer) => {
        setEditingTransfer(transfer);
        setShowNewTransferModal(true);
    };

    const handleViewTransfer = (transfer: InventoryTransfer) => {
        setViewingTransfer(transfer);
    };

    return (
        <div className="min-h-screen bg-black text-slate-100 p-4 md:p-8">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Logistics</h1>
                        </div>
                        <p className="text-neutral-500 font-bold uppercase tracking-[0.2em] text-[10px]">Stock Movement Control Hub</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowLocationModal(true)}
                            className="h-14 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest border border-neutral-800 transition-all active:scale-95 shadow-xl"
                        >
                            <MapPin className="w-4 h-4 text-blue-500" />
                            Nodes
                        </button>
                        <button
                            onClick={() => {
                                setEditingTransfer(null);
                                setShowNewTransferModal(true);
                            }}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-blue-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Initiate Transfer
                        </button>
                    </div>
                </div>

                {/* Navigation & Search */}
                <div className="space-y-6">
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-2xl p-1 overflow-x-auto no-scrollbar scroll-smooth shadow-2xl">
                        {['All', 'Draft', 'In Transit', 'Completed', 'Approved', 'Rejected'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`whitespace-nowrap px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab
                                    ? 'bg-neutral-800 text-white shadow-inner shadow-black/40'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search inventory manifest..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-bold text-sm tracking-tight shadow-xl"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full h-14 px-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer font-black text-[10px] uppercase tracking-widest shadow-xl"
                            >
                                <option>All Types</option>
                                <option value="in">Incoming Flow</option>
                                <option value="out">Outgoing Flow</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full h-14 px-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer font-black text-[10px] uppercase tracking-widest shadow-xl"
                            >
                                <option>All Nodes</option>
                                {inventoryLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main List */}
            <div className="max-w-7xl mx-auto pb-20">
                {filteredTransfers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-neutral-900/50 rounded-[3rem] border border-neutral-800 border-dashed">
                        <Package className="w-20 h-20 mb-6 text-neutral-800" />
                        <p className="text-xl font-black text-neutral-700 uppercase tracking-tighter">No Movement Detected</p>
                        <p className="text-neutral-500 font-bold text-sm mt-1 uppercase tracking-widest">Adjust filters to see logs</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredTransfers.map((transfer) => (
                            <div
                                key={transfer.id}
                                className="group bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 hover:border-neutral-700 transition-all shadow-xl hover:shadow-neutral-900/40 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${transfer.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                transfer.status === 'in-transit' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-neutral-800 text-neutral-500 border-neutral-700'
                                                }`}>
                                                {transfer.status}
                                            </span>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${transfer.type === 'in' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                }`}>
                                                {transfer.type === 'in' ? 'Incoming' : 'Outgoing'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">{new Date(transfer.date).toLocaleDateString()}</span>
                                    </div>

                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em] block mb-1">Source</label>
                                            <p className="text-white font-bold text-lg leading-tight tracking-tight">{transfer.source}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700/50 shadow-lg shadow-black/50">
                                            <ArrowRight className="w-5 h-5 text-neutral-500" />
                                        </div>
                                        <div className="flex-1 text-right">
                                            <label className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em] block mb-1">Destination</label>
                                            <p className="text-white font-bold text-lg leading-tight tracking-tight">{transfer.destination}</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 rounded-2xl p-5 mb-8 border border-neutral-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Manifest Contents</label>
                                            <span className="text-[9px] font-black text-blue-400">{transfer.items.length} Units</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {transfer.items.slice(0, 3).map((item, idx) => (
                                                <span key={idx} className="px-3 py-1.5 bg-neutral-800/80 rounded-xl text-[10px] font-bold text-neutral-300 border border-neutral-700/30">
                                                    {item.quantity}× {item.name}
                                                </span>
                                            ))}
                                            {transfer.items.length > 3 && (
                                                <span className="px-3 py-1.5 bg-neutral-800/50 rounded-xl text-[10px] font-bold text-neutral-500">
                                                    +{transfer.items.length - 3} More
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-neutral-800/50">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewTransfer(transfer)}
                                            className="h-12 w-12 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-2xl flex items-center justify-center transition-all border border-neutral-700/50 active:scale-95"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        {transfer.status === 'draft' && (
                                            <button
                                                onClick={() => handleEditTransfer(transfer)}
                                                className="h-12 w-12 bg-neutral-800 hover:bg-neutral-700 text-blue-400 rounded-2xl flex items-center justify-center transition-all border border-neutral-700/50 active:scale-95"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {(transfer.status === 'draft' || transfer.status === 'in-transit') && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveActionMenuId(activeActionMenuId === transfer.id ? null : transfer.id)}
                                                className={`h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-neutral-800/50 flex items-center gap-3 ${activeActionMenuId === transfer.id
                                                    ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20'
                                                    : 'bg-neutral-800 text-green-400 hover:bg-neutral-700'
                                                    }`}
                                            >
                                                Update Flow
                                                <ArrowRight className="w-4 h-4" />
                                            </button>

                                            {activeActionMenuId === transfer.id && (
                                                <div className="absolute right-0 bottom-full mb-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-[110] min-w-[200px] overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">

                                                    <div className="px-4 py-3 bg-black/40 border-b border-neutral-800 text-[9px] font-black text-neutral-500 uppercase tracking-widest">Action Pipeline</div>
                                                    {transfer.status === 'draft' && (
                                                        <button
                                                            onClick={() => processTransferUpdate(transfer, 'in-transit')}
                                                            className="w-full px-5 py-4 text-left text-[11px] font-black text-yellow-400 hover:bg-neutral-800 transition-colors flex items-center gap-3 uppercase tracking-widest"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                                            Commit Dispatch
                                                        </button>
                                                    )}
                                                    {transfer.status === 'in-transit' && (
                                                        <button
                                                            onClick={() => processTransferUpdate(transfer, 'completed')}
                                                            className="w-full px-5 py-4 text-left text-[11px] font-black text-green-400 hover:bg-neutral-800 transition-colors flex items-center gap-3 uppercase tracking-widest"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            Confirm Arrival
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setActiveActionMenuId(null)}
                                                        className="w-full px-5 py-4 text-left text-[10px] font-black text-neutral-600 hover:bg-neutral-800 border-t border-neutral-800/50 uppercase tracking-widest"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* Modals Container */}
            {showNewTransferModal && (
                <NewTransferModal
                    onClose={() => {
                        setShowNewTransferModal(false);
                        setEditingTransfer(null);
                    }}
                    inventoryItems={inventoryItems}
                    inventoryLocations={inventoryLocations}
                    inventoryLogs={inventoryLogs}
                    inventoryLists={inventoryLists}
                    studentRequirements={studentRequirements}
                    addInventoryTransfer={addInventoryTransfer}
                    updateInventoryTransfer={updateInventoryTransfer}
                    updateInventoryItem={updateInventoryItem}
                    addInventoryLog={addInventoryLog}
                    activeRole={activeRole}
                    editingTransfer={editingTransfer}
                    getAvailableStock={getAvailableStock}
                />
            )}

            {viewingTransfer && (
                <ViewTransferModal
                    transfer={viewingTransfer}
                    onClose={() => setViewingTransfer(null)}
                />
            )}

            {showLocationModal && (
                <LocationManagementModal
                    locations={inventoryLocations}
                    addLocation={addInventoryLocation}
                    onClose={() => setShowLocationModal(false)}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function ViewTransferModal({ transfer, onClose }: { transfer: InventoryTransfer; onClose: () => void }) {
    const handlePrint = () => { window.print(); };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">

            <div className="bg-neutral-950 border border-neutral-800 rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b border-neutral-900 flex items-center justify-between print:hidden">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Transfer Summary</h2>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Ref ID: {transfer.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="h-12 w-12 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center transition-all"><Printer className="w-5 h-5" /></button>
                        <button onClick={onClose} className="h-12 w-12 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center transition-all"><XCircle className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-4 mb-10 print:hidden">
                        <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${transfer.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            transfer.status === 'in-transit' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'bg-neutral-900 text-neutral-500 border-neutral-800'
                            }`}>{transfer.status}</span>
                        <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border bg-neutral-900 text-neutral-400 border-neutral-800">
                            {transfer.type === 'in' ? 'Incoming Flow' : 'Outgoing Flow'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800/50">
                            <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block mb-1">Origin Node</label>
                            <p className="text-white font-bold text-xl">{transfer.source}</p>
                        </div>
                        <div className="bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800/50">
                            <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block mb-1">Target Node</label>
                            <p className="text-white font-bold text-xl">{transfer.destination}</p>
                        </div>
                    </div>

                    <div className="mb-10">
                        <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block mb-4">Inventory Manifest</label>
                        <div className="space-y-3">
                            {transfer.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
                                    <p className="text-sm font-bold text-neutral-200">{item.name}</p>
                                    <p className="text-lg font-black text-white">{item.quantity} <span className="text-[10px] text-neutral-500 uppercase tracking-widest ml-1">Units</span></p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {transfer.notes && (
                        <div className="mb-10">
                            <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block mb-2">Internal Logistics Notes</label>
                            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl italic text-sm text-neutral-400">"{transfer.notes}"</div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-700 uppercase tracking-[0.2em]">
                        <Clock className="w-4 h-4" />
                        Operation logged: {new Date(transfer.date).toLocaleString()}
                    </div>
                </div>

                <div className="p-8 border-t border-neutral-900">
                    <button onClick={onClose} className="w-full py-5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest rounded-3xl transition-all border border-neutral-800">Dismiss View</button>
                </div>
            </div>
        </div>
    );
}

function LocationManagementModal({ locations, addLocation, onClose }: any) {
    const [newLocation, setNewLocation] = useState('');
    const handleAdd = () => {
        if (newLocation.trim() && !locations.includes(newLocation.trim())) {
            addLocation(newLocation.trim());
            setNewLocation('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">

            <div className="bg-neutral-950 border border-neutral-800 rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-8 border-b border-neutral-900 flex items-center justify-between">
                    <div><h2 className="text-2xl font-black text-white uppercase tracking-tighter">Fleet Nodes</h2><p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Active Locations</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-900 rounded-2xl text-neutral-600"><XCircle className="w-6 h-6" /></button>
                </div>
                <div className="p-8">
                    <div className="flex gap-3 mb-8">
                        <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdd()} placeholder="Add new node..." className="flex-1 px-6 py-4 bg-neutral-900 border border-neutral-800 rounded-3xl text-white placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" />
                        <button onClick={handleAdd} className="px-6 bg-blue-600 hover:bg-blue-500 rounded-3xl text-white transition-all shadow-lg active:scale-95"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                        {locations.map((loc: string) => (
                            <div key={loc} className="flex items-center justify-between p-5 bg-neutral-900/50 rounded-3xl border border-neutral-800/40 group hover:border-neutral-700 transition-all"><span className="text-neutral-300 font-bold text-sm tracking-tight">{loc}</span><MapPin className="w-4 h-4 text-neutral-700 group-hover:text-blue-500" /></div>
                        ))}
                    </div>
                </div>
                <div className="p-8 border-t border-neutral-900"><button onClick={onClose} className="w-full py-5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest rounded-3xl transition-all border border-neutral-800">Close Node Manager</button></div>
            </div>
        </div>
    );
}

function NewTransferModal({ onClose, inventoryItems, inventoryLocations, inventoryLogs, inventoryLists, studentRequirements, addInventoryTransfer, updateInventoryTransfer, updateInventoryItem, addInventoryLog, activeRole, editingTransfer, getAvailableStock }: any) {
    const [transferType, setTransferType] = useState<'out' | 'in'>(editingTransfer?.type || 'out');
    const [fromLocation, setFromLocation] = useState(editingTransfer?.source || '');
    const [toLocation, setToLocation] = useState(editingTransfer?.destination || '');
    const [selectedItems, setSelectedItems] = useState<{ itemId: string; name: string; quantity: number }[]>(editingTransfer?.items || []);
    const [notes, setNotes] = useState(editingTransfer?.notes || '');
    const [currentItemId, setCurrentItemId] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState(1);

    const addItem = () => {
        if (!currentItemId) return;
        const item = inventoryItems.find((i: InventoryItem) => i.id === currentItemId);
        if (!item) return;

        const availableStock = getAvailableStock(item);
        const alreadyInCart = selectedItems.filter(si => si.itemId === currentItemId).reduce((sum, si) => sum + si.quantity, 0);
        const newTotal = alreadyInCart + currentQuantity;

        if (transferType === 'out' && newTotal > availableStock) {
            alert(`Insufficient Stock. Available: ${availableStock}. Checked out: ${alreadyInCart}.`);
            return;
        }

        setSelectedItems([...selectedItems, { itemId: item.id, name: item.name, quantity: currentQuantity }]);
        setCurrentItemId('');
        setCurrentQuantity(1);
    };

    const handleAction = (status: 'draft' | 'in-transit') => {
        if (!fromLocation || !toLocation || selectedItems.length === 0) {
            alert('Manifest incomplete. Fill all nodes and items.');
            return;
        }

        const transfer: InventoryTransfer = {
            id: editingTransfer?.id || crypto.randomUUID(),
            type: transferType,
            items: selectedItems,
            source: fromLocation,
            destination: toLocation,
            status: status,
            date: editingTransfer?.date || new Date().toISOString(),
            notes: notes
        };

        if (editingTransfer) updateInventoryTransfer(transfer);
        else addInventoryTransfer(transfer);

        if (status === 'in-transit' && transferType === 'out') {
            selectedItems.forEach(item => {
                const invItem = inventoryItems.find((i: InventoryItem) => i.id === item.itemId);
                if (invItem) {
                    const newQty = invItem.quantity - item.quantity;
                    updateInventoryItem({ ...invItem, quantity: newQty, lastUpdated: new Date().toISOString() });
                    addInventoryLog({
                        id: crypto.randomUUID(),
                        itemId: invItem.id,
                        itemName: invItem.name,
                        action: 'reduce',
                        quantityChange: item.quantity,
                        newQuantity: newQty,
                        comment: `Transfer OUT to ${toLocation}`,
                        date: new Date().toISOString(),
                        user: activeRole || 'Estate Manager'
                    });
                }
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-in slide-in-from-bottom-5 duration-500 lg:p-12">

            <div className="bg-neutral-950 border border-neutral-800 rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b border-neutral-900 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{editingTransfer ? 'Edit Mission' : 'New Mission'}</h2>
                        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.2em] mt-1">Configure Stock Transfer Pipeline</p>
                    </div>
                    <button onClick={onClose} className="h-12 w-12 bg-neutral-900 border border-neutral-800 text-neutral-600 rounded-2xl flex items-center justify-center hover:text-white transition-all"><XCircle className="w-6 h-6" /></button>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex gap-4 mb-10">
                        <button onClick={() => setTransferType('out')} className={`flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${transferType === 'out' ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20 active:scale-[0.98]' : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:bg-neutral-800'}`}>
                            <ArrowUp className="w-5 h-5 font-black" /> Outgoing (Export)
                        </button>
                        <button onClick={() => setTransferType('in')} className={`flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${transferType === 'in' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-[0.98]' : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:bg-neutral-800'}`}>
                            <ArrowDown className="w-5 h-5" /> Incoming (Import)
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Dispatch Node</label>
                            <select value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} className="w-full h-16 px-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white font-bold tracking-tight focus:ring-2 focus:ring-blue-500/50 appearance-none">
                                <option value="">Select origin...</option>
                                {inventoryLocations.map((loc: string) => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Target Node</label>
                            <select value={toLocation} onChange={(e) => setToLocation(e.target.value)} className="w-full h-16 px-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white font-bold tracking-tight focus:ring-2 focus:ring-blue-500/50 appearance-none">
                                <option value="">Select destination...</option>
                                {inventoryLocations.map((loc: string) => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-neutral-900/30 border border-neutral-800 rounded-[2rem] p-8 mb-10">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-6">Manifest Builder</label>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                            <div className="md:col-span-3">
                                <select value={currentItemId} onChange={(e) => setCurrentItemId(e.target.value)} className="w-full h-14 px-6 bg-black border border-neutral-800 rounded-2xl text-white font-bold">
                                    <option value="">Select item to add...</option>
                                    {inventoryItems.map((item: InventoryItem) => (
                                        <option key={item.id} value={item.id}>{item.name} (Stock: {getAvailableStock(item)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <input type="number" min="1" value={currentQuantity} onChange={(e) => setCurrentQuantity(Number(e.target.value))} className="w-full h-14 bg-black border border-neutral-800 rounded-2xl text-white text-center font-black" />
                            </div>
                            <button onClick={addItem} className="h-14 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Add Line</button>
                        </div>

                        <div className="space-y-3">
                            {selectedItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-black/40 border border-neutral-800/50 rounded-2xl group transition-all hover:border-neutral-700">
                                    <div><p className="text-sm font-bold text-white tracking-tight">{item.name}</p><p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-0.5">Quantity Breakdown</p></div>
                                    <div className="flex items-center gap-6">
                                        <p className="text-xl font-black text-white">{item.quantity} <span className="text-[10px] text-neutral-600 uppercase ml-1">Units</span></p>
                                        <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} className="text-neutral-700 hover:text-red-500 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {selectedItems.length === 0 && <div className="text-center py-12 border border-neutral-800 border-dashed rounded-3xl text-neutral-700 font-black uppercase tracking-widest text-xs">No Items in Manifest</div>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Logistics & Handling Memo</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter delivery instructions, special handling, or reasons for transfer..." className="w-full h-32 p-6 bg-neutral-900 border border-neutral-800 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-neutral-700 font-medium text-sm custom-scrollbar" />
                    </div>
                </div>

                <div className="p-8 border-t border-neutral-900 bg-black/40 flex flex-col md:flex-row gap-4">
                    <button onClick={onClose} className="flex-1 h-16 bg-neutral-900 hover:bg-neutral-800 text-neutral-500 rounded-3xl font-black text-xs uppercase tracking-widest border border-neutral-800 transition-all">Abort Mission</button>
                    <button onClick={() => handleAction('draft')} className="flex-1 h-16 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-3xl font-black text-xs uppercase tracking-widest border border-neutral-800 transition-all shadow-xl">Save as Schema</button>
                    <button onClick={() => handleAction('in-transit')} className="flex-[2] h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/50 active:scale-[0.98]">Authorize Transfer</button>
                </div>
            </div>
        </div>
    );
}

