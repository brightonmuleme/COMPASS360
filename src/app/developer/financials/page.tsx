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
    CreditCard,
    ChevronRight,
    Calendar,
    Hash,
    Phone
} from "lucide-react";

export default function FinancialCenter() {
    const { students, tutors, verifySubscriptionRequest, processPayout } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'deposits' | 'payouts' | 'analytics'>('deposits');
    const [searchQuery, setSearchQuery] = useState('');

    // --- DATA AGGREGATION ---
    const pendingDeposits = useMemo(() => {
        const all: (SubscriptionRequest & { studentId: string; studentName: string })[] = [];
        students.forEach(s => {
            (s.paymentRequests || []).forEach(r => {
                if (r.status === 'Pending') all.push({ ...r, studentId: s.id.toString(), studentName: s.name });
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Financial <span className="text-red-600">Ops</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-red-600"></span>
                        Liquidity & Settlement Control
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-3xl self-start lg:self-auto">
                    {(['deposits', 'payouts', 'analytics'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-red-600 shadow-xl shadow-red-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full flex items-center justify-center text-emerald-200 group-hover:scale-110 transition-transform -z-10" />
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Revenue</p>
                            <p className="text-2xl font-black text-slate-900">{formatMoney(stats.totalRevenue)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full flex items-center justify-center text-blue-200 group-hover:scale-110 transition-transform -z-10" />
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-rotate-6">
                            <ArrowRightLeft size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Payouts</p>
                            <p className="text-2xl font-black text-slate-900">{formatMoney(stats.totalPayouts)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0d0d0d] p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 group overflow-hidden relative sm:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-bl-full -z-0" />
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-600/40 group-hover:animate-pulse">
                            <Wallet size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-1">Net Reserve</p>
                            <p className="text-2xl font-black">{formatMoney(stats.platformBalance)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
                {activeTab === 'deposits' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase italic">
                                <Clock size={24} className="text-amber-500" />
                                Requests <span className="text-slate-300">/</span> {pendingDeposits.length}
                            </h2>
                            <div className="relative flex-1 max-w-md group">
                                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Scrub Transaction Registry..."
                                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Header for wide screens */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 px-10 py-5 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                <div className="col-span-3">User Identity</div>
                                <div className="col-span-4">Transaction Payload</div>
                                <div className="col-span-3">Sync Timestamp</div>
                                <div className="col-span-2 text-right">Operations</div>
                            </div>

                            <div className="space-y-4">
                                {pendingDeposits.length === 0 ? (
                                    <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 opacity-50 italic font-black uppercase tracking-widest text-slate-400 text-xs">
                                        No Inbound Signals Detected
                                    </div>
                                ) : (
                                    pendingDeposits.map(req => (
                                        <div key={req.id} className="lg:grid lg:grid-cols-12 lg:items-center gap-4 bg-white p-6 lg:px-10 lg:py-6 rounded-[2.5rem] border border-slate-100 hover:border-red-500/20 hover:shadow-xl hover:shadow-red-900/5 transition-all group overflow-hidden relative">
                                            <div className="col-span-3 flex items-center gap-4 mb-4 lg:mb-0">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 border border-slate-100 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                                    {req.studentName?.[0] || 'S'}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors leading-none mb-1.5 uppercase">{req.studentName}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter italic">ID: SYSTEM_STU_{req.studentId}</p>
                                                </div>
                                            </div>

                                            <div className="col-span-4 space-y-2 mb-6 lg:mb-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-mono font-black border border-red-100 group-hover:bg-white transition-colors">{req.transactionId}</span>
                                                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-400 italic">
                                                        <Phone size={12} /> {req.phoneNumber}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-slate-600 italic bg-slate-50/50 p-2.5 rounded-xl border border-dashed border-slate-200">
                                                    "{req.reference}"
                                                </div>
                                            </div>

                                            <div className="col-span-3 mb-6 lg:mb-0">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 lg:hidden italic">Received At:</div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <Calendar size={14} className="text-slate-300" />
                                                    {new Date(req.submittedAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleVerifyDeposit(req, 'Rejected')}
                                                    className="p-4 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-2xl transition-all border border-transparent hover:border-rose-100 active:scale-90"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyDeposit(req, 'Approved')}
                                                    className="flex-1 lg:flex-none px-6 py-4 bg-slate-900 group-hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 group-hover:shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <CheckCircle size={16} /> <span className="lg:hidden xl:block">Approve</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payouts' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase italic">
                            <ArrowRightLeft size={24} className="text-blue-500" />
                            Settlements <span className="text-slate-300">/</span> {pendingPayouts.length}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pendingPayouts.length === 0 ? (
                                <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-slate-100 opacity-50 italic font-black uppercase tracking-widest text-slate-400 text-xs">
                                    All Financial Obligations Fulfilled
                                </div>
                            ) : (
                                pendingPayouts.map(payout => (
                                    <div key={payout.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform -z-0" />
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-8">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 italic">Institutional Settlement</p>
                                                    <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight italic">{payout.tutorName}</h3>
                                                </div>
                                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                                    <CreditCard size={28} />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 italic">Net Disbursement</p>
                                                <p className="text-3xl font-black text-red-600 tracking-tighter">{formatMoney(payout.amount)}</p>
                                            </div>

                                            <div className="flex items-center justify-between gap-4">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                                                </div>
                                                <button
                                                    onClick={() => handleProcessPayout(payout)}
                                                    className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95"
                                                >
                                                    Finalize Payout
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="bg-white rounded-[4rem] p-12 md:p-24 border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50" />
                        <div className="relative z-10 max-w-lg mx-auto">
                            <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform group-hover:rotate-6">
                                <ShieldCheck size={48} className="text-slate-300 group-hover:text-red-600 transition-colors" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter italic uppercase mb-6">
                                Financial <br /> <span className="text-red-600 tracking-normal italic uppercase">Intelligence</span>
                            </h2>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed mb-12">
                                Advanced revenue heatmaps and tutor commission forecasts are currently being optimized for the next COMPASS update cycle.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/80 backdrop-blur-md p-8 rounded-[2rem] border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Net Margin</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter italic">20%</div>
                                </div>
                                <div className="bg-slate-50/80 backdrop-blur-md p-8 rounded-[2rem] border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">ARPU</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter italic">5.2<span className="text-sm font-bold ml-0.5">k</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
