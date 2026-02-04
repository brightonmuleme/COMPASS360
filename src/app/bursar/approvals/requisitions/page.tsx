"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Requisition, InQueueItem } from '@/lib/store';
import { FileText, Clock, CheckCircle, Trash2, Edit, Eye, RotateCcw, XCircle, Printer, AlertTriangle } from 'lucide-react';

// --- MAIN PAGE ---
export default function RequisitionsApprovalPage() {
    const { requisitions, requisitionQueue, approveRequisition, deleteRequisition, updateRequisition } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'Drafts' | 'In-Queue' | 'Approved'>('Drafts');
    const [viewingReq, setViewingReq] = useState<Requisition | null>(null);

    // --- ACTIONS ---
    const handleApprove = (id: string) => {
        if (confirm("Are you sure you want to approve this requisition?")) {
            approveRequisition(id);
            setViewingReq(null);
        }
    };

    return (
        <div className="p-6 text-slate-100 min-h-screen bg-slate-900/50">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-400" />
                    Requisition Approvals (Director)
                </h1>

                <div className="flex bg-slate-800 rounded-lg p-1">
                    {['Pending', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab === 'Pending' ? 'Drafts' : tab as any)}
                            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${(activeTab === 'Drafts' && tab === 'Pending') || activeTab === tab
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
            <div className={`bg-slate-800/50 border border-slate-700 rounded-xl min-h-[600px] p-4 relative shadow-xl`}>

                {activeTab === 'Drafts' && (
                    <RequisitionList
                        title="Pending Approval"
                        requisitions={requisitions.filter(r => r.status === 'Pending Approval' || r.status === 'Submitted')}
                        onView={setViewingReq}
                        onApprove={handleApprove}
                    />
                )}

                {activeTab === 'In-Queue' && (
                    <InQueueList queue={requisitionQueue} />
                )}

                {activeTab === 'Approved' && (
                    <RequisitionList
                        title="Approved History"
                        requisitions={requisitions.filter(r => r.status === 'Approved')}
                        isReadOnly
                        onView={setViewingReq}
                    />
                )}

            </div>

            {/* VIEW MODAL WITH APPROVAL CONTROLS */}
            {viewingReq && (
                <DirectorRequisitionModal
                    requisition={viewingReq}
                    onClose={() => setViewingReq(null)}
                    onApprove={() => handleApprove(viewingReq.id)}
                    isReadOnly={activeTab === 'Approved'}
                />
            )}
        </div>
    );
}

// --- COMPONENTS (Replicated from Expense Manager) ---

function RequisitionList({ title, requisitions, onView, onApprove, isReadOnly }: any) {
    if (requisitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <div className="bg-slate-800 p-6 rounded-full mb-4">
                    {isReadOnly ? <CheckCircle className="w-12 h-12 text-emerald-500/50" /> : <FileText className="w-12 h-12 text-slate-600" />}
                </div>
                <p className="text-lg font-medium">{isReadOnly ? "No approved requisitions yet" : "No pending requisitions"}</p>
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
                        onClick={() => onView(req)}
                        className={`bg-slate-900/40 border border-slate-700/50 rounded-lg p-4 transition-all group cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <div className={`mt-1 p-2 rounded-lg ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                    {req.status === 'Approved' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-950 px-1 rounded">{req.readableId || 'REQ-???'}</span>
                                        <h3 className="font-bold text-slate-200 text-lg">{req.title}</h3>
                                        {req.status === 'Rejected' && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-900">Rejected</span>}
                                        {req.status === 'Submitted' && <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-800/50">Pending Approval</span>}
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.date}</span>
                                        <span className="text-slate-600">|</span>
                                        <span>{req.account}</span>
                                        <span className="text-slate-600">|</span>
                                        <span>{req.items.length} Items</span>
                                    </div>
                                    <div className="mt-2 text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 w-fit">
                                        {(req.items || []).slice(0, 3).map(i => i.name).join(", ")}
                                        {(req.items || []).length > 3 && ` +${(req.items || []).length - 3} more`}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-emerald-400">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                        (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                    )}
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    {!isReadOnly && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center gap-1">
                                                <Eye className="w-3 h-3" /> Review
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onApprove(req.id); }} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded shadow-lg">
                                                Approve
                                            </button>
                                        </>
                                    )}
                                    {isReadOnly && (
                                        <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded border border-slate-700 flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InQueueList({ queue }: { queue: InQueueItem[] }) {
    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Trash2 className="w-16 h-16 mb-4 opacity-20" />
                <p>The queue is empty.</p>
            </div>
        );
    }

    const priorityItems = queue.filter(q => q.itemData.isPriority);
    const standardItems = queue.filter(q => !q.itemData.isPriority);
    const totalPriority = priorityItems.reduce((s, q) => s + Number(q.itemData.amount), 0);
    const totalStandard = standardItems.reduce((s, q) => s + Number(q.itemData.amount), 0);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Recycle Bin (In-Queue)
                </h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Standard Items Removed</h3>
                    <div className="text-2xl font-bold text-slate-300">{standardItems.length} items</div>
                    <div className="text-sm text-emerald-400 mt-1">{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(totalStandard)}</div>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-lg border border-red-900/30">
                    <h3 className="text-xs uppercase font-bold text-red-400/70 mb-2">Priority Items Removed</h3>
                    <div className="text-2xl font-bold text-red-400">{priorityItems.length} items</div>
                    <div className="text-sm text-red-300 mt-1">{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(totalPriority)}</div>
                </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-500">
                        <tr>
                            <th className="p-4">Item</th>
                            <th className="p-4">Category</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Date Removed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {queue.map((q, i) => (
                            <tr key={i} className="hover:bg-slate-800/20">
                                <td className="p-4 font-medium text-slate-300">
                                    {q.itemData.name}
                                    {q.itemData.isPriority && <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1 rounded uppercase">Priority</span>}
                                </td>
                                <td className="p-4">{q.itemData.category}</td>
                                <td className="p-4 text-right font-mono text-slate-300">{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(Number(q.itemData.amount))}</td>
                                <td className="p-4 text-right">{new Date(q.dateRemoved).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- MODAL (Copied & Adapted) ---

const DirectorRequisitionModal = ({ requisition, onClose, onApprove, isReadOnly }: any) => {
    if (!requisition) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-auto">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{requisition.readableId || 'REQ-???'} - {requisition.title}</h2>
                        <p className={`text-sm font-medium px-2 py-0.5 rounded w-fit ${requisition.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                            {requisition.status}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {!isReadOnly && (
                            <div className="flex gap-2 mr-4">
                                <button onClick={onApprove} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold shadow-lg transition-all hover:scale-105">
                                    Approve Requisition
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors">
                            <XCircle className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    {/* Details Header */}
                    <div className="grid grid-cols-3 gap-6 mb-8 text-sm bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Date</label>
                            <p className="text-slate-200 text-lg">{requisition.date}</p>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Account</label>
                            <p className="text-slate-200 text-lg">{requisition.account}</p>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Total Amount</label>
                            <p className="text-emerald-400 font-bold text-xl">
                                {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                    requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-sm border-collapse mb-8">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-500 text-xs uppercase">
                                <th className="py-3 w-10">#</th>
                                <th className="py-3">Category</th>
                                <th className="py-3">Item Description</th>
                                <th className="py-3 text-right">Qty</th>
                                <th className="py-3 text-right">Unit Price</th>
                                <th className="py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {(() => {
                                const getMain = (i: any) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");

                                // SORT ITEMS TO ENSURE GROUPING WORKS
                                const sortedItems = [...(requisition.items || [])].sort((a, b) => {
                                    const groupA = getMain(a);
                                    const groupB = getMain(b);
                                    return groupA.localeCompare(groupB);
                                });

                                return sortedItems.map((item: any, index: number) => {
                                    const currentGroup = getMain(item);
                                    const prevGroup = index > 0 ? getMain(sortedItems[index - 1]) : null;
                                    const isNewGroup = index > 0 && prevGroup !== currentGroup;
                                    const getGroupSum = (endIndex: number, groupName: string) => {
                                        let sum = 0;
                                        for (let i = endIndex; i >= 0; i--) {
                                            if (getMain(sortedItems[i]) !== groupName) break;
                                            sum += Number(sortedItems[i].amount);
                                        }
                                        return sum;
                                    };

                                    return (
                                        <React.Fragment key={index}>
                                            {isNewGroup && (
                                                <tr className="bg-slate-800/30">
                                                    <td colSpan={5} className="p-2 text-right text-xs uppercase text-slate-500">
                                                        {prevGroup} Subtotal
                                                    </td>
                                                    <td className="p-2 text-right text-slate-300">
                                                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index - 1, prevGroup || ""))}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className={`border-b border-slate-700/50 last:border-0 ${item.isPriority ? 'bg-red-500/5' : ''}`}>
                                                <td className="py-3 text-slate-500 text-xs">{index + 1}</td>
                                                <td className={`py-3 ${item.isPriority ? 'text-red-400 font-bold' : 'text-slate-400'}`}>{item.category}</td>
                                                <td className="py-3 text-slate-200 font-medium">{item.name}</td>
                                                <td className="py-3 text-right text-slate-400">{item.quantity}</td>
                                                <td className="py-3 text-right text-slate-400">{Number(item.unitPrice).toLocaleString()}</td>
                                                <td className={`py-3 text-right font-mono ${requisition.status === 'Draft' && item.isManual ? 'text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded' : 'text-slate-200'}`}>
                                                    {Number(item.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                            {index === requisition.items.length - 1 && (
                                                <tr className="bg-slate-800/30">
                                                    <td colSpan={5} className="p-2 text-right text-xs uppercase text-slate-500">
                                                        {currentGroup} Subtotal
                                                    </td>
                                                    <td className="p-2 text-right text-slate-300">
                                                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index, currentGroup))}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>

                    {/* Notes */}
                    {requisition.notes && (
                        <div className="mb-8 border-t border-slate-700 pt-4">
                            <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Notes</h3>
                            <p className="text-slate-300 text-sm italic whitespace-pre-wrap">{requisition.notes}</p>
                        </div>
                    )}

                    {/* Queue Snapshot */}
                    {requisition.queueSnapshot && requisition.queueSnapshot.length > 0 && (
                        <div className="mt-8 pt-8 border-t-2 border-slate-700">
                            <h3 className="text-lg font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Audit Snapshot: Deleted Items
                            </h3>
                            <table className="w-full text-left text-xs border border-slate-700">
                                <thead className="bg-slate-800 text-slate-400 font-bold uppercase">
                                    <tr>
                                        <th className="p-2">Item Name</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2 text-right">Orig. Amount</th>
                                        <th className="p-2 text-right">Date Removed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {requisition.queueSnapshot.map((qItem: any, idx: number) => (
                                        <tr key={idx} className={`${qItem.itemData.isPriority ? 'bg-red-500/10' : ''}`}>
                                            <td className="p-2"><div className={`font-semibold ${qItem.itemData.isPriority ? 'text-red-400' : 'text-slate-300'}`}>{qItem.itemData.name}</div></td>
                                            <td className="p-2 text-slate-400">{qItem.itemData.category}</td>
                                            <td className="p-2 text-right text-slate-400">{Number(qItem.itemData.amount).toLocaleString()}</td>
                                            <td className="p-2 text-right text-slate-500">{new Date(qItem.dateRemoved).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
