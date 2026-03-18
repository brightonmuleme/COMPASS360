"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Requisition, InQueueItem } from '@/lib/store';
import { FileText, Clock, CheckCircle, Trash2, Edit, Eye, RotateCcw, XCircle, Printer, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- MAIN PAGE ---
export default function RequisitionsApprovalPage() {
    const { requisitions, requisitionQueue, approveRequisition, deleteRequisitionCascade, updateRequisition, activeRole, verifySensitiveAction } = useSchoolData();
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

    const handleDeleteCascade = async (id: string) => {
        const password = prompt("🚨 DIRECTOR OVERRIDE REQUIRED\n\nDeleting this requisition will also PURGE all associated ledger entries from the Activity Ledger.\n\nPlease enter your password to confirm this action:");

        if (!password) return;

        if (verifySensitiveAction(password)) {
            await deleteRequisitionCascade(id);
            alert("✅ Requisition and related ledger entries have been successfully purged.");
        } else {
            alert("❌ Invalid password. Authorization denied.");
        }
    };

    return (
        <div className="p-2 md:p-6 text-slate-900 min-h-screen bg-slate-50">
            {/* Header / Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 md:mb-8 gap-3 md:gap-6">
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                        <div className="p-1.5 md:p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                            <FileText className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        Requisitions
                    </h1>
                    <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1">Director Verification Portal</p>
                </div>

                <div className="flex bg-white/80 backdrop-blur-md rounded-2xl p-1 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                    {['Pending', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab === 'Pending' ? 'Drafts' : tab as any)}
                            className={`px-4 md:px-8 py-2 md:py-3 rounded-xl transition-all font-black text-[9px] md:text-xs uppercase tracking-widest whitespace-nowrap ${(activeTab === 'Drafts' && tab === 'Pending') || activeTab === tab
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className={`bg-white border border-slate-200 rounded-[2.5rem] min-h-[600px] p-6 relative shadow-xl shadow-slate-200/50`}>

                {activeTab === 'Drafts' && (
                    <RequisitionList
                        title="Pending Approval"
                        requisitions={requisitions.filter(r => r.status === 'Pending Approval' || r.status === 'Submitted')}
                        onView={handleView}
                        onApprove={handleApprove}
                        onDelete={handleDeleteCascade}
                        activeRole={activeRole}
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
                        onDelete={handleDeleteCascade}
                        activeRole={activeRole}
                    />
                )}

            </div>

        </div>
    );
}

// --- COMPONENTS (Replicated from Expense Manager) ---

function RequisitionList({ title, requisitions, onView, onApprove, onDelete, isReadOnly, activeRole }: any) {
    if (requisitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <div className="bg-slate-100 p-6 rounded-full mb-4">
                    {isReadOnly ? <CheckCircle className="w-12 h-12 text-emerald-500/50" /> : <FileText className="w-12 h-12 text-slate-300" />}
                </div>
                <p className="text-lg font-bold uppercase tracking-tight">{isReadOnly ? "No approved history" : "Clear Approval Queue"}</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <h2 className="text-sm md:text-lg font-black text-slate-800 mb-6 px-4 border-l-4 border-purple-600 uppercase tracking-widest">{title}</h2>
            <div className="grid grid-cols-1 gap-4">
                {requisitions.map((req: Requisition) => (
                    <div
                        key={req.id}
                        onClick={() => onView(req)}
                        className={`bg-white border border-slate-200 rounded-3xl p-5 md:p-8 transition-all group cursor-pointer hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/10 relative overflow-hidden`}
                    >
                        {/* Interactive Background Element */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700 pointer-events-none" />

                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 relative z-10">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={`hidden md:flex mt-1 p-4 rounded-2xl shrink-0 ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {req.status === 'Approved' ? <CheckCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-widest shrink-0 border border-slate-200/50">{req.readableId || 'REQ-???'}</span>
                                        {req.status === 'Rejected' && <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 uppercase tracking-widest">Rejected</span>}
                                        {req.status === 'Submitted' && <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest">Awaiting Verification</span>}
                                        {req.status === 'Approved' && <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Verified & Safe</span>}
                                    </div>
                                    <h3 className="font-black text-slate-900 text-xl md:text-2xl leading-none mb-3 truncate group-hover:text-purple-700 transition-colors uppercase tracking-tight">{req.title}</h3>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-black">
                                        <span className="flex items-center gap-2 font-bold"><Clock className="w-4 h-4 text-purple-600" /> {req.date}</span>
                                        <span className="hidden md:inline text-slate-200 text-lg leading-none">|</span>
                                        <span className="px-3 py-1 bg-slate-50 rounded-full text-slate-600 border border-slate-200/50">{req.account}</span>
                                        <span className="hidden md:inline text-slate-200 text-lg leading-none">|</span>
                                        <span className="text-purple-600/70">{req.items.length} Elements Linked</span>
                                    </div>
                                    <div className="mt-5 text-[10px] bg-slate-50 px-4 py-2.5 rounded-2xl text-slate-500 w-full md:w-fit font-bold border border-slate-100 italic uppercase tracking-tighter">
                                        {(req.items || []).slice(0, 3).map(i => i.name).join(" • ")}
                                        {(req.items || []).length > 3 && ` + ${(req.items || []).length - 3} additional lines`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end gap-4 border-t border-slate-100 lg:border-0 pt-5 lg:pt-0">
                                <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
                                        (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                    ).replace('UGX', 'USh')}
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    {!isReadOnly && (
                                        <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-[2px] rounded-2xl shadow-xl shadow-purple-200 transition-all active:scale-95">
                                            Verify Funds
                                        </button>
                                    )}
                                    {isReadOnly && (
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 transition-all active:scale-95 shadow-sm">
                                                View Document
                                            </button>
                                            {activeRole === 'Director' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(req.id); }}
                                                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl border border-red-100 transition-all active:scale-95 shadow-sm"
                                                    title="Director Override: Delete and Purge Ledger"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
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
                <div className="flex-1 bg-slate-50 p-2 md:p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <h3 className="text-[7px] md:text-xs uppercase font-black text-slate-400 mb-0.5 tracking-tighter whitespace-nowrap">Standard Removed</h3>
                    <div className="text-sm md:text-3xl font-black text-slate-900 line-clamp-1">{standardItems.length} ITM</div>
                    <div className="text-[8px] md:text-sm font-black text-emerald-600 mt-0.5">{new Intl.NumberFormat('en-UG').format(totalStandard)}</div>
                </div>
                <div className="flex-1 bg-red-50 p-2 md:p-6 rounded-2xl border border-red-100 text-center shadow-sm">
                    <h3 className="text-[7px] md:text-xs uppercase font-black text-red-400 mb-0.5 tracking-tighter whitespace-nowrap">Priority Removed</h3>
                    <div className="text-sm md:text-3xl font-black text-red-600 line-clamp-1">{priorityItems.length} ITM</div>
                    <div className="text-[8px] md:text-sm font-black text-red-500 mt-0.5">{new Intl.NumberFormat('en-UG').format(totalPriority)}</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-hidden">
                    <table className="w-full text-left text-[9px] md:text-sm text-slate-600">
                        <thead className="bg-slate-50 text-[8px] md:text-xs uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 hidden md:table-header-group">
                            <tr>
                                <th className="p-4 md:p-6">Content Element</th>
                                <th className="p-4 md:p-6">Class</th>
                                <th className="p-4 md:p-6 text-right">Magnitude</th>
                                <th className="p-4 md:p-6 text-right font-black">Period</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {queue.map((q, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-1.5 md:p-6 font-black text-slate-900">
                                        <div className="flex flex-col">
                                            <div className="md:hidden text-[7px] text-slate-400 uppercase font-black tracking-tighter mb-0.5">{q.itemData.category}</div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="truncate max-w-[120px] md:max-w-none leading-none">{q.itemData.name}</span>
                                                {q.itemData.isPriority && <span className="text-[6px] md:text-[9px] bg-red-600 text-white px-1 md:px-2 py-0.5 rounded-sm uppercase tracking-tighter">URGENT</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-1.5 md:p-6 font-bold text-slate-400 hidden md:table-cell uppercase text-[10px]">{q.itemData.category}</td>
                                    <td className="p-1.5 md:p-6 text-right font-black text-emerald-600 min-w-[70px] md:min-w-0">{new Intl.NumberFormat('en-UG').format(Number(q.itemData.amount))}</td>
                                    <td className="p-1.5 md:p-6 text-right font-bold text-slate-400 text-[8px] md:text-[10px] whitespace-nowrap min-w-[50px] md:min-w-0 italic">{new Date(q.dateRemoved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

