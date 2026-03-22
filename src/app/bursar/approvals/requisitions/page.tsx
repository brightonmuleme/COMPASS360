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
        <div className="p-0 sm:p-6 text-slate-900 min-h-screen bg-slate-50">
            {/* Header / Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 md:mb-8 gap-4 sm:gap-6 bg-white sm:bg-transparent p-4 sm:p-0 border-b sm:border-none border-slate-200 sticky top-0 sm:relative z-[60]">
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter leading-none">
                        <div className="p-2 md:p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
                            <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        Requisitions
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 ml-1">Verification Protocol</p>
                </div>

                <div className="flex bg-slate-200/50 backdrop-blur-md rounded-2xl p-1 overflow-x-auto no-scrollbar max-w-full">
                    {['Pending', 'In-Queue', 'Approved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab === 'Pending' ? 'Drafts' : tab as any)}
                            className={`px-4 md:px-8 py-2.5 md:py-3 rounded-xl transition-all font-black text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap ${(activeTab === 'Drafts' && tab === 'Pending') || activeTab === tab
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
            <div className={`rounded-none sm:rounded-[2.5rem] min-h-[500px] sm:min-h-[600px] p-0 sm:p-4 relative`}>

                {activeTab === 'Drafts' && (
                    <RequisitionList
                        title="Pending Verification Queue"
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
                        title="Aggregated Audit History"
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

// --- COMPONENTS ---

function RequisitionList({ title, requisitions, onView, onApprove, onDelete, isReadOnly, activeRole }: any) {
    if (requisitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    {isReadOnly ? <CheckCircle className="w-12 h-12 text-emerald-600/20" /> : <FileText className="w-12 h-12 text-slate-200" />}
                </div>
                <p className="font-black uppercase tracking-widest text-[10px]">{isReadOnly ? "No approved history" : "Clear Approval Queue"}</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <h2 className="text-[10px] font-black text-slate-400 mb-8 px-4 border-l-4 border-purple-600 uppercase tracking-[2px]">{title}</h2>
            <div className="grid grid-cols-1 gap-6 pb-24 md:pb-0">
                {requisitions.map((req: Requisition) => (
                    <div
                        key={req.id}
                        onClick={() => onView(req)}
                        className="bg-white border border-slate-200 rounded-[2.5rem] p-6 sm:p-10 transition-all group cursor-pointer hover:border-purple-400/50 hover:shadow-2xl hover:shadow-purple-900/5 relative overflow-hidden shadow-sm mx-4 sm:mx-0"
                    >
                        {/* Interactive Background Element */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700 pointer-events-none opacity-50" />

                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 relative z-10">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="hidden sm:flex mt-1 p-4 bg-slate-50 rounded-2xl shrink-0 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors border border-slate-100">
                                    {req.status === 'Approved' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <FileText className="w-8 h-8 text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-widest shrink-0 border border-purple-100">{req.readableId || 'REQ-INF'}</span>
                                        {req.status === 'Submitted' && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">Submitted</span>}
                                        {req.status === 'Pending Approval' && <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest">Verification Node</span>}
                                        {req.status === 'Approved' && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Verified Vault</span>}
                                    </div>
                                    <h3 className="font-black text-slate-900 text-xl md:text-3xl leading-none mb-3 truncate group-hover:text-purple-800 transition-colors uppercase tracking-tighter">{req.title}</h3>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-black">
                                        <span className="flex items-center gap-2 font-bold"><Clock className="w-4 h-4 text-purple-600" /> {req.date}</span>
                                        <span className="truncate">{req.account || "ADMINISTRATION"}</span>
                                        <span className="text-purple-600/70">{req.items.length} LEDGER ENTRIES</span>
                                    </div>
                                    <div className="mt-5 text-[9px] bg-slate-50 px-4 py-2.5 rounded-2xl text-slate-500 w-fit font-bold border border-slate-100 italic uppercase tracking-tighter">
                                        {(req.items || []).slice(0, 2).map(i => i.name).join(" • ")}
                                        {(req.items || []).length > 2 && ` + ${(req.items || []).length - 2} additional lines`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end gap-6 border-t border-slate-100 lg:border-0 pt-6 lg:pt-0">
                                <div className="flex flex-col items-start lg:items-end">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Aggregate Sum:</div>
                                    <div className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                        <span className="text-[10px] md:text-lg mr-1 opacity-40">USh</span>
                                        {new Intl.NumberFormat('en-UG').format(
                                            (req.items || []).reduce((s, i) => s + Number(i.amount), 0)
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    {!isReadOnly && (
                                        <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase tracking-[2px] rounded-2xl shadow-xl shadow-purple-200 transition-all active:scale-95 italic border border-purple-500">
                                            Verify Funds
                                        </button>
                                    )}
                                    {isReadOnly && (
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); onView(req); }} className="px-6 py-4 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95">
                                                Audit Doc
                                            </button>
                                            {activeRole === 'Director' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(req.id); }}
                                                    className="p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl border border-red-100 transition-all active:scale-95 shadow-sm"
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
                <Trash2 className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-[10px]">The pool is empty.</p>
            </div>
        );
    }

    const priorityItems = queue.filter(q => q.itemData.isPriority);
    const standardItems = queue.filter(q => !q.itemData.isPriority);
    const totalPriority = priorityItems.reduce((s, q) => s + Number(q.itemData.amount), 0);
    const totalStandard = standardItems.reduce((s, q) => s + Number(q.itemData.amount), 0);

    return (
        <div className="animate-in fade-in duration-500 px-4 sm:px-0 pb-24 md:pb-0">
            <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="text-[10px] font-black text-red-600 flex items-center gap-3 uppercase tracking-[2px]">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </div>
                    Purged Elements Protocol
                </h2>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-[8px] uppercase font-black text-slate-400 mb-2 tracking-widest">Standard Purge</h3>
                    <div className="text-xl md:text-3xl font-black text-slate-900 tabular-nums leading-none mb-2">{standardItems.length} <span className="text-[10px] opacity-30">ELEMENTS</span></div>
                    <div className="text-[10px] md:text-xs font-bold text-emerald-600 tabular-nums">USh {new Intl.NumberFormat('en-UG').format(totalStandard)}</div>
                </div>
                <div className="bg-red-50/30 p-6 rounded-[2rem] border border-red-100 shadow-sm">
                    <h3 className="text-[8px] uppercase font-black text-red-400 mb-2 tracking-widest">Priority Purge</h3>
                    <div className="text-xl md:text-3xl font-black text-red-600 tabular-nums leading-none mb-2">{priorityItems.length} <span className="text-[10px] opacity-30">ELEMENTS</span></div>
                    <div className="text-[10px] md:text-xs font-bold text-red-500 tabular-nums">USh {new Intl.NumberFormat('en-UG').format(totalPriority)}</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left table-fixed">
                    <colgroup>
                        <col className="w-12 md:w-20" />
                        <col className="w-auto" />
                        <col className="w-24 md:w-44" />
                    </colgroup>
                    <thead className="bg-slate-900 text-white text-[8px] sm:text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th className="p-4 sm:p-6 sm:px-10">#</th>
                            <th className="p-4 sm:p-6">Content Detail</th>
                            <th className="p-4 sm:p-6 sm:px-10 text-right">Magnitude</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {queue.map((q, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 sm:p-6 sm:px-10 text-[8px] sm:text-xs font-black text-slate-300 tabular-nums">{i + 1}</td>
                                <td className="p-4 sm:p-6">
                                    <div className="flex flex-col min-w-0">
                                        <div className="text-[6px] sm:text-[8px] text-slate-400 uppercase font-black tracking-widest mb-0.5 truncate">{q.itemData.category}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-black text-slate-900 text-[10px] sm:text-base truncate uppercase tracking-tight">{q.itemData.name}</div>
                                            {q.itemData.isPriority && <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 sm:p-6 sm:px-10 text-right">
                                    <div className="text-[11px] sm:text-xl font-black text-emerald-600 tabular-nums tracking-tighter">{new Intl.NumberFormat('en-UG').format(Number(q.itemData.amount))}</div>
                                    <div className="text-[7px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-tighter italic mt-0.5">{new Date(q.dateRemoved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
