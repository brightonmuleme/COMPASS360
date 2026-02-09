"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Requisition, InQueueItem } from '@/lib/store';
import { FileText, Clock, CheckCircle, Trash2, Edit, Eye, RotateCcw, XCircle, Printer, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- MAIN PAGE ---
export default function RequisitionsApprovalPage() {
    const { requisitions, requisitionQueue, approveRequisition, deleteRequisition, updateRequisition } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'Drafts' | 'In-Queue' | 'Approved'>('Drafts');
    const router = useRouter();

    const handleView = (req: Requisition) => {
        router.push(`/bursar/approvals/requisitions/${req.id}`);
    };

    const handleApprove = (id: string) => {
        if (confirm("Are you sure you want to approve this requisition?")) {
            approveRequisition(id);
        }
    };

    return (
        <div className="p-2 md:p-6 text-slate-100 min-h-screen bg-slate-950">
            {/* Header / Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 md:mb-8 gap-3 md:gap-6">
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <div className="p-1.5 md:p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                            <FileText className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        Requisitions
                    </h1>
                    <p className="text-[8px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 ml-1">Director Verification Portal</p>
                </div>

                <div className="flex bg-slate-800/80 backdrop-blur-md rounded-xl p-0.5 md:p-1 shadow-inner border border-slate-700/50 overflow-x-auto no-scrollbar">
                    {['Pending', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab === 'Pending' ? 'Drafts' : tab as any)}
                            className={`px-3 md:px-6 py-2 md:py-2.5 rounded-lg transition-all font-black text-[9px] md:text-xs uppercase tracking-widest whitespace-nowrap ${(activeTab === 'Drafts' && tab === 'Pending') || activeTab === tab
                                ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20'
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
                        onView={handleView}
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
                        onView={handleView}
                    />
                )}

            </div>

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
            <h2 className="text-sm md:text-lg font-black text-white mb-6 px-4 border-l-4 border-purple-500 uppercase tracking-widest">{title}</h2>
            <div className="grid grid-cols-1 gap-4">
                {requisitions.map((req: Requisition) => (
                    <div
                        key={req.id}
                        onClick={() => onView(req)}
                        className={`bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 md:p-6 transition-all group cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/80 shadow-lg`}
                    >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`hidden md:flex mt-1 p-3 rounded-xl ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                    {req.status === 'Approved' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded uppercase tracking-tighter border border-slate-800">{req.readableId || 'REQ-???'}</span>
                                        {req.status === 'Rejected' && <span className="text-[10px] font-black bg-red-900/40 text-red-400 px-2 py-0.5 rounded border border-red-900/50 uppercase">Rejected</span>}
                                        {req.status === 'Submitted' && <span className="text-[10px] font-black bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50 uppercase">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-[10px] font-black bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-800/50 uppercase">Pending Verification</span>}
                                        {req.status === 'Approved' && <span className="text-[10px] font-black bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 uppercase">Verified</span>}
                                    </div>
                                    <h3 className="font-black text-slate-100 text-lg md:text-xl leading-tight mb-2 truncate group-hover:text-purple-400 transition-colors">{req.title}</h3>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] md:text-xs text-slate-500 uppercase tracking-widest font-black">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {req.date}</span>
                                        <span className="hidden md:inline text-slate-700">|</span>
                                        <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-400">{req.account}</span>
                                        <span className="hidden md:inline text-slate-700">|</span>
                                        <span className="text-purple-400/70">{req.items.length} Elements</span>
                                    </div>
                                    <div className="mt-4 text-[10px] bg-slate-950/40 px-3 py-2 rounded-xl text-slate-500 w-full md:w-fit font-bold border border-slate-800/50 italic">
                                        {(req.items || []).slice(0, 3).map(i => i.name).join(", ")}
                                        {(req.items || []).length > 3 && ` +${(req.items || []).length - 3} additional`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-4 border-t border-slate-800/50 md:border-0 pt-4 md:pt-0">
                                <div className="text-xl md:text-3xl font-black text-emerald-400 tracking-tighter">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
                                        (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                    ).replace('UGX', 'USh')}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {!isReadOnly && (
                                        <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-purple-900/20 transition-all active:scale-95">
                                            Verify
                                        </button>
                                    )}
                                    {isReadOnly && (
                                        <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-700 transition-all active:scale-95">
                                            Details
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs md:text-lg font-black text-red-400 flex items-center gap-2 uppercase tracking-widest">
                    <Trash2 className="w-4 h-4" />
                    Recycle Bin (In-Queue)
                </h2>
            </div>

            {/* Compact Metrics Bar */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-900/60 p-2 md:p-6 rounded-xl md:rounded-2xl border border-slate-800 text-center">
                    <h3 className="text-[7px] md:text-xs uppercase font-black text-slate-500 mb-0.5 tracking-tighter whitespace-nowrap">Standard Removed</h3>
                    <div className="text-sm md:text-3xl font-black text-slate-200 line-clamp-1">{standardItems.length} ITM</div>
                    <div className="text-[8px] md:text-sm font-black text-emerald-400 mt-0.5">{new Intl.NumberFormat('en-UG').format(totalStandard)}</div>
                </div>
                <div className="flex-1 bg-red-900/10 p-2 md:p-6 rounded-xl md:rounded-2xl border border-red-900/20 text-center">
                    <h3 className="text-[7px] md:text-xs uppercase font-black text-red-500/80 mb-0.5 tracking-tighter whitespace-nowrap">Priority Removed</h3>
                    <div className="text-sm md:text-3xl font-black text-red-500 line-clamp-1">{priorityItems.length} ITM</div>
                    <div className="text-[8px] md:text-sm font-black text-red-300 mt-0.5">{new Intl.NumberFormat('en-UG').format(totalPriority)}</div>
                </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-hidden">
                    <table className="w-full text-left text-[9px] md:text-sm text-slate-400">
                        <thead className="bg-slate-900/80 text-[8px] md:text-xs uppercase font-black text-slate-500 tracking-widest border-b border-slate-800 hidden md:table-header-group">
                            <tr>
                                <th className="p-4 md:p-6">Content Element</th>
                                <th className="p-4 md:p-6">Class</th>
                                <th className="p-4 md:p-6 text-right">Magnitude</th>
                                <th className="p-4 md:p-6 text-right font-black">Period</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {queue.map((q, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-1.5 md:p-6 font-black text-slate-200">
                                        <div className="flex flex-col">
                                            <div className="md:hidden text-[7px] text-slate-600 uppercase font-black tracking-tighter mb-0.5">{q.itemData.category}</div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="truncate max-w-[120px] md:max-w-none leading-none">{q.itemData.name}</span>
                                                {q.itemData.isPriority && <span className="text-[6px] md:text-[9px] bg-red-600 text-white px-1 md:px-2 py-0.5 rounded-sm uppercase tracking-tighter">URGENT</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-1.5 md:p-6 font-bold text-slate-500 hidden md:table-cell uppercase text-[10px]">{q.itemData.category}</td>
                                    <td className="p-1.5 md:p-6 text-right font-black text-emerald-400/80 min-w-[70px] md:min-w-0">{new Intl.NumberFormat('en-UG').format(Number(q.itemData.amount))}</td>
                                    <td className="p-1.5 md:p-6 text-right font-bold text-slate-700 md:text-slate-600 text-[8px] md:text-[10px] whitespace-nowrap min-w-[50px] md:min-w-0 italic">{new Date(q.dateRemoved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

