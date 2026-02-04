"use client";
import { useSchoolData, Requisition, GeneralTransaction } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ClipboardList, Truck, ShieldAlert, CheckCircle, XCircle, Clock } from "lucide-react";

export default function DirectorDashboard() {
    const {
        activeRole,
        requisitions,
        inventoryTransfers,
        generalTransactions,
        payments
    } = useSchoolData();
    const router = useRouter();

    useEffect(() => {
        if (!activeRole) {
            router.replace('/portal');
            return;
        }
        if (activeRole !== 'Director') {
            router.replace('/portal');
        }
    }, [activeRole, router]);

    // FIX 1: "PHANTOM METRICS" - Only count items actually waiting for approval
    const pendingRequisitionsCount = useMemo(() =>
        requisitions.filter(r => r.status === 'Pending Approval' || r.status === 'Submitted').length,
        [requisitions]);

    // FIX 1: "PHANTOM METRICS" - Only count transfers waiting for authorization
    const inventoryTransfersCount = useMemo(() =>
        // @ts-ignore - InventoryTransfer type inferred
        inventoryTransfers.filter(t => t.status === 'pending' || t.status === 'awaiting_approval').length,
        [inventoryTransfers]);

    // FIX 2: "THE PLACEHOLDER ILLUSION" - Count actual risks
    const flaggedTransactionsCount = useMemo(() =>
        generalTransactions.filter(t => t.isFlagged || t.riskLevel === 'High').length,
        [generalTransactions]);

    // --- FINANCIAL INTELLIGENCE SNAPSHOT ---
    const financialSnapshot = useMemo(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyIncomeTrans = generalTransactions.filter(t => t.type === 'Income' && new Date(t.date) >= firstDay);
        const monthlyPayments = (payments || []).filter(p => new Date(p.date) >= firstDay);
        const monthlyExpenseTrans = generalTransactions.filter(t => t.type === 'Expense' && new Date(t.date) >= firstDay);

        const incomeTotal = monthlyIncomeTrans.reduce((sum, t) => sum + Number(t.amount), 0) +
            monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const expenseTotal = monthlyExpenseTrans.reduce((sum, t) => sum + Number(t.amount), 0);

        return { incomeTotal, expenseTotal };
    }, [generalTransactions, payments]);

    // --- CRITICAL ACTION INTELLIGENCE ---
    const criticalActions = useMemo(() => {
        const highPriorityReqs = requisitions
            .filter(r => (r.status === 'Pending Approval' || r.status === 'Submitted') && r.priority === 'High')
            .map(r => ({
                id: r.id,
                title: r.title || `Req #${r.readableId}`,
                amount: r.items.reduce((sum, item) => sum + (item.amount || 0), 0),
                category: 'Urgent Requisition',
                severity: 'High'
            }));

        const flaggedTxs = generalTransactions
            .filter(t => t.isFlagged || t.riskLevel === 'High')
            .map(t => ({
                id: t.id,
                title: t.description,
                amount: Number(t.amount),
                category: 'High Risk Audit',
                severity: 'Critical'
            }));

        return [...highPriorityReqs, ...flaggedTxs].sort((a, b) => b.amount - a.amount).slice(0, 3);
    }, [requisitions, generalTransactions]);

    const recentActivity = useMemo(() => {
        const reqs = requisitions
            .filter(r => r.status === 'Approved' || r.status === 'Rejected')
            .map(r => ({
                id: r.id,
                type: 'Requisition',
                title: r.title || `Requisition #${r.readableId}`,
                subtitle: `${r.items.length} items requesting approval`,
                status: r.status,
                date: r.date,
                color: r.status === 'Approved' ? 'green' : 'red'
            }));

        const transfers = inventoryTransfers
            // @ts-ignore
            .filter(t => ['approved', 'completed', 'rejected'].includes(t.status?.toLowerCase()))
            // @ts-ignore
            .map(t => ({
                id: t.id,
                type: 'Transfer',
                title: 'Inventory Movement',
                // @ts-ignore
                subtitle: `Transfer to ${t.destination || 'Archive'}`,
                // @ts-ignore
                status: t.status,
                // @ts-ignore
                date: t.date,
                // @ts-ignore
                color: t.status === 'rejected' ? 'red' : 'blue'
            }));

        return [...reqs, ...transfers]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [requisitions, inventoryTransfers]);

    if (activeRole !== 'Director') {
        return <div className="p-8 flex items-center justify-center h-full text-gray-400">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans relative overflow-hidden">
            {/* BACKGROUND DECORATIVE GLOWS */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                <header className="mb-12">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-2">Executive Command Center</div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Director's Overview</h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-lg">Control center for school operations, financial intelligence, and primary approval queues.</p>
                </header>

                {/* FINANCIAL SNAPSHOT WIDGET */}
                <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Real-Time Revenue (MTD)</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-slate-500 font-bold">Ush</span>
                            <span className="text-4xl font-black text-white tracking-tighter">{financialSnapshot.incomeTotal.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Verified General & Student Payments
                        </div>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all"></div>
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Operational Burn (MTD)</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-slate-500 font-bold">Ush</span>
                            <span className="text-4xl font-black text-white tracking-tighter">{financialSnapshot.expenseTotal.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            Includes all Approved General Expenses
                        </div>
                    </div>
                </div>

                {/* CRITICAL ACTIONS SECTION */}
                {criticalActions.length > 0 && (
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Priority One: Critical Actions</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {criticalActions.map((action: any, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => router.push(action.category === 'Urgent Requisition' ? '/bursar/approvals/requisitions' : '/bursar/approvals/transactions')}
                                    className="bg-red-500/5 group hover:bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer ring-1 ring-red-500/0 hover:ring-red-500/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                            {action.category === 'Urgent Requisition' ? <ClipboardList size={20} /> : <ShieldAlert size={20} />}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">{action.category}</div>
                                            <div className="text-sm font-bold text-white group-hover:text-red-200 transition-colors">
                                                {action.title || action.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Impact</div>
                                        <div className="text-sm font-black text-white">{action.amount?.toLocaleString() || 'N/A'} Ush</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Pending Requisitions */}
                    <div
                        className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl hover:bg-slate-800/40 transition-all cursor-pointer group active:scale-95"
                        onClick={() => router.push('/bursar/approvals/requisitions')}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Queue</div>
                                <div className="text-xs font-bold text-slate-300 mt-1">Requisitions</div>
                                <div className="text-5xl font-black text-white mt-4 tracking-tighter">{pendingRequisitionsCount}</div>
                            </div>
                            <span className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/5">
                                <ClipboardList size={28} />
                            </span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:gap-3 transition-all">
                            Review Requests <span>→</span>
                        </div>
                    </div>

                    {/* Inventory Transfers */}
                    <div
                        className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl hover:bg-slate-800/40 transition-all cursor-pointer group active:scale-95"
                        onClick={() => router.push('/bursar/approvals/transfers')}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Flow</div>
                                <div className="text-xs font-bold text-slate-300 mt-1">Inventories</div>
                                <div className="text-5xl font-black text-white mt-4 tracking-tighter">{inventoryTransfersCount}</div>
                            </div>
                            <span className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/5">
                                <Truck size={28} />
                            </span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 group-hover:gap-3 transition-all">
                            Authorize <span>→</span>
                        </div>
                    </div>

                    {/* Flagged Transactions */}
                    <div
                        className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl hover:bg-slate-800/40 transition-all cursor-pointer group active:scale-95"
                        onClick={() => router.push('/bursar/approvals/transactions')}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Risk</div>
                                <div className="text-xs font-bold text-slate-300 mt-1">Audits</div>
                                <div className="text-5xl font-black text-white mt-4 tracking-tighter">{flaggedTransactionsCount}</div>
                            </div>
                            <span className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/5">
                                <ShieldAlert size={28} />
                            </span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400 group-hover:gap-3 transition-all">
                            Audit Control <span>→</span>
                        </div>
                    </div>
                </div>

                <div className="mt-16">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-6">Execution Log: Recent Activity</h3>
                    {recentActivity.length > 0 ? (
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden shadow-2xl">
                            {recentActivity.map(activity => (
                                <div key={activity.id} className="p-5 flex items-center gap-5 hover:bg-white/5 transition-all">
                                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${activity.color === 'green' ? 'bg-emerald-500/10 text-emerald-500' :
                                        activity.color === 'red' ? 'bg-rose-500/10 text-rose-500' :
                                            'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        {activity.status === 'Approved' ? <CheckCircle size={20} /> :
                                            activity.status === 'Rejected' ? <XCircle size={20} /> :
                                                <Clock size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className="font-bold text-white text-sm tracking-tight">{activity.title}</h4>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{new Date(activity.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium truncate">{activity.subtitle}</p>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${activity.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                        activity.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                                            'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        {activity.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-12 text-center text-slate-600 italic text-sm">
                            No executive logs available for this period.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
