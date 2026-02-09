"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, formatMoney, SubscriptionRequest, PayoutRequest } from "@/lib/store";
import {
    CheckCircle,
    XCircle,
    Clock,
    Wallet,
    TrendingUp,
    Users,
    ShieldCheck,
    ArrowRightLeft,
    Search,
    Filter,
    CreditCard
} from "lucide-react";

export default function FinancialCenter() {
    const { students, tutors, verifySubscriptionRequest, processPayout } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'deposits' | 'payouts' | 'analytics'>('deposits');
    const [searchQuery, setSearchQuery] = useState('');

    // --- DATA AGGREGATION ---
    const pendingDeposits = useMemo(() => {
        const all: (SubscriptionRequest & { studentId: number })[] = [];
        students.forEach(s => {
            (s.paymentRequests || []).forEach(r => {
                if (r.status === 'Pending') all.push({ ...r, studentId: s.id });
            });
        });
        return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [students]);

    const pendingPayouts = useMemo(() => {
        const all: (PayoutRequest & { tutorName: string })[] = [];
        tutors.forEach(t => {
            (t.payoutRequests || []).forEach(r => {
                if (r.status === 'Pending') all.push({ ...r, tutorName: t.name });
            });
        });
        return all.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [tutors]);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalCommission = 0;
        let totalPayouts = 0;

        students.forEach(s => {
            (s.paymentRequests || []).forEach(r => {
                if (r.status === 'Approved') totalRevenue += (r.amount || 0);
            });
        });

        tutors.forEach(t => {
            (t.payoutRequests || []).forEach(r => {
                if (r.status === 'Paid') totalPayouts += r.amount;
            });
        });

        // Commission is 20% of content sales. 
        // For simplicity, we assume all approved deposits eventually go to subs.
        // But let's track actual tutor earnings (80% of content price).
        // Since we don't track historical "Sales" objects yet, we'll estimate or just show balance.
        return { totalRevenue, totalPayouts, platformBalance: totalRevenue - totalPayouts };
    }, [students, tutors]);

    // --- ACTIONS ---
    const handleVerifyDeposit = (req: any, status: 'Approved' | 'Rejected') => {
        const amount = status === 'Approved' ? prompt('Enter verified amount (UGX):', '5000') : '0';
        if (status === 'Approved' && !amount) return;

        const reason = status === 'Rejected' ? prompt('Reason for rejection:') : undefined;

        try {
            verifySubscriptionRequest(req.id, req.studentId, Number(amount), status, reason || undefined);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleProcessPayout = (payout: any) => {
        const ref = prompt('Enter payment reference (e.g. Airtel Transaction ID):');
        if (!ref) return;

        try {
            processPayout(payout.tutorId, payout.id, ref);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Financial Center</h1>
                    <p className="text-slate-500 font-medium">Monitoring platform liquidity and settlement.</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    {(['deposits', 'payouts', 'analytics'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Deposits</p>
                        <p className="text-xl font-black">{formatMoney(stats.totalRevenue)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Payouts</p>
                        <p className="text-xl font-black">{formatMoney(stats.totalPayouts)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Float</p>
                        <p className="text-xl font-black">{formatMoney(stats.platformBalance)}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                {activeTab === 'deposits' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black flex items-center gap-2">
                                <Clock size={20} className="text-amber-500" /> Pending Verifications
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px]">{pendingDeposits.length}</span>
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search TXN ID..."
                                    className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-red-500 transition-all w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Details</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted At</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {pendingDeposits.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center text-slate-400 italic">No pending payment requests.</td>
                                        </tr>
                                    ) : (
                                        pendingDeposits.map(req => (
                                            <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 font-bold text-sm">
                                                    {req.studentName}
                                                    <div className="text-[10px] text-slate-400 font-medium">#{req.studentId}</div>
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">{req.transactionId}</span>
                                                        <span className="text-xs text-slate-500">{req.phoneNumber}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 italic">"{req.reference}"</div>
                                                </td>
                                                <td className="py-6 text-xs text-slate-500 font-medium">
                                                    {new Date(req.submittedAt).toLocaleString()}
                                                </td>
                                                <td className="py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleVerifyDeposit(req, 'Rejected')}
                                                            className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerifyDeposit(req, 'Approved')}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-900/10 flex items-center gap-2"
                                                        >
                                                            <CheckCircle size={14} /> Verify
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'payouts' && (
                    <div className="p-8">
                        <h2 className="text-xl font-black mb-8 flex items-center gap-2">
                            <ArrowRightLeft size={20} className="text-blue-500" /> Tutor Settlements
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px]">{pendingPayouts.length}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pendingPayouts.length === 0 ? (
                                <div className="col-span-2 py-20 text-center text-slate-400 italic">No pending payout requests.</div>
                            ) : (
                                pendingPayouts.map(payout => (
                                    <div key={payout.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tutor Request</p>
                                            <p className="font-black text-lg">{payout.tutorName}</p>
                                            <p className="text-sm font-bold text-red-600 mb-2">{formatMoney(payout.amount)}</p>
                                            <p className="text-[10px] text-slate-500 italic">Requested on {new Date(payout.requestedAt).toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => handleProcessPayout(payout)}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                                        >
                                            Issue Payment
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-6 font-black text-3xl">G</div>
                        <h2 className="text-2xl font-black">Financial Intelligence</h2>
                        <p className="text-slate-500 max-w-sm mx-auto">Advanced revenue heatmaps and tutor commission forecasts are currently being optimized for the next COMPASS update.</p>
                        <div className="pt-8 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Margin</div>
                                <div className="text-2xl font-black">20%</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ARPU</div>
                                <div className="text-2xl font-black">5.2k</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
