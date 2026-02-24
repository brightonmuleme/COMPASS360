"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, formatMoney, SubscriptionRequest, PayoutRequest } from "@/lib/store";
import { supabase } from "@/lib/supabase";
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
    const [viewMode, setViewMode] = useState<'pending' | 'deposits_archive' | 'payouts_archive' | 'activity_stream' | 'tutor_activity'>('pending');
    const { tutors, verifySubscriptionRequest, processPayout } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'pending' | 'analytics'>('pending');
    const [pendingSubTab, setPendingSubTab] = useState<'deposits' | 'settlements'>('deposits');
    const [cloudProfiles, setCloudProfiles] = useState<any[]>([]);
    const [loadingLedger, setLoadingLedger] = useState(true);

    const fetchCloudLedger = async () => {
        try {
            setLoadingLedger(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCloudProfiles(data || []);
        } catch (err) {
            console.error("❌ Cloud Ledger Sync Failed:", err);
        } finally {
            setLoadingLedger(false);
        }
    };

    React.useEffect(() => {
        fetchCloudLedger();
    }, []);
    const approvedTransactions = useMemo(() => {
        const all: (any)[] = [];
        cloudProfiles.forEach(p => {
            const requests = Array.isArray(p.payment_requests) ? p.payment_requests : [];
            requests.forEach((r: any) => {
                if (r.status === 'Approved') all.push({
                    ...r,
                    studentName: p.full_name || p.name || 'Cloud User',
                    type: 'Sync',
                    label: `[Sync] ${formatMoney(r.amount || 0)} Deposit Approved for ${p.full_name || 'User'}`
                });
            });
        });
        return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [cloudProfiles]);

    const approvedPayouts = useMemo(() => {
        const all: (any)[] = [];
        tutors.forEach(t => {
            (t.payoutRequests || []).forEach(r => {
                if (r.status === 'Paid') all.push({
                    ...r,
                    tutorName: t.name,
                    type: 'Payout',
                    label: `[Payout] Sent ${formatMoney(r.amount)} to ${t.name}`
                });
            });
        });
        return all.sort((a, b) => new Date(b.paidAt || b.requestedAt).getTime() - new Date(a.paidAt || a.requestedAt).getTime());
    }, [tutors]);

    const appPassPurchases = useMemo(() => {
        const all: (any)[] = [];
        cloudProfiles.forEach(p => {
            // 1. Try explicit logs first
            let logs = p.activity_logs || p.activityLogs || [];
            if (typeof logs === 'string') try { logs = JSON.parse(logs); } catch (e) { logs = []; }

            const explicitLogs = Array.isArray(logs) ? logs.filter((l: any) => l.type === 'AppPass') : [];

            if (explicitLogs.length > 0) {
                explicitLogs.forEach((l: any) => all.push({ ...l, userName: p.full_name || p.name, amount: l.amount || 5000, date: l.timestamp || l.date || p.created_at }));
            }
            // 2. Smart Recovery: If wallet < deposits and user has active sub, derive the spend
            else {
                const totalDeposits = (p.payment_requests || []).reduce((sum: number, r: any) => r.status === 'Approved' ? sum + Number(r.amount) : sum, 0);
                const currentWallet = Number(p.wallet_balance || 0);
                const spendingGap = totalDeposits - currentWallet;

                if (spendingGap > 0 && p.subscription_status === 'active') {
                    all.push({
                        type: 'AppPass',
                        userName: p.full_name || p.name,
                        amount: spendingGap, // Likely the 5,000 or 9,000
                        date: p.subscription_expiry || p.created_at,
                        isDerived: true
                    });
                }
            }
        });
        return all;
    }, [cloudProfiles]);

    const tutorSubscriptions = useMemo(() => {
        const all: (any)[] = [];
        cloudProfiles.forEach(p => {
            let subs = p.subscribed_tutors || p.tutorSubscriptions || p.tutor_subscriptions || [];
            if (typeof subs === 'string') try { subs = JSON.parse(subs); } catch (e) { subs = []; }
            if (!Array.isArray(subs)) subs = [];

            subs.forEach((s: any) => {
                const tutor = tutors.find(t => t.id === s.tutorId);
                all.push({
                    ...s,
                    userName: p.full_name || p.name || 'Cloud User',
                    tutorName: tutor?.name || s.tutorName || 'Tutor',
                    price: s.amount || s.price || 3000,
                    timestamp: s.subscribedAt || s.timestamp || s.date || s.submittedAt
                });
            });
        });
        return all;
    }, [cloudProfiles, tutors]);

    const activityStream = useMemo(() => {
        const all: any[] = [];

        // 1. App Pass Purchases (100% Leakage)
        appPassPurchases.forEach(p => {
            all.push({
                ...p,
                type: 'Leakage',
                amount: p.amount,
                label: `APP PASS PURCHASE - ${p.userName || 'Student'}`,
                subLabel: 'Platform Revenue',
                timestamp: p.timestamp || p.date || p.submittedAt || 0
            });
        });

        // 2. Commissions (20% Leakage)
        tutorSubscriptions.forEach(s => {
            const comm = (s.price || 5000) * 0.2;
            all.push({
                ...s,
                type: 'Leakage',
                amount: comm,
                label: `COMMISSION FROM ${s.userName}'S PURCHASE (Tutor: ${s.tutorName})`,
                subLabel: 'Automated Cut',
                timestamp: s.timestamp || s.subscribedAt || 0
            });
        });

        // 3. Payouts (100% Leakage/Outflow)
        approvedPayouts.forEach(p => {
            all.push({
                ...p,
                type: 'Leakage',
                amount: p.amount,
                label: `SETTLEMENT PROCESSED FOR ${p.tutorName}`,
                subLabel: 'Bank Outflow',
                timestamp: p.paidAt || p.requestedAt || 0
            });
        });

        return all.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime() || 0;
            const timeB = new Date(b.timestamp).getTime() || 0;
            return timeB - timeA;
        });
    }, [appPassPurchases, tutorSubscriptions, approvedPayouts]);

    const tutorActivityStream = useMemo(() => {
        const all: any[] = [];

        // 1. Tutor Earnings (80% share)
        tutorSubscriptions.forEach(s => {
            const earning = (s.price || 3000) * 0.8;
            all.push({
                ...s,
                type: 'TutorEarning',
                amount: earning,
                label: `TUTOR ${s.tutorName?.toUpperCase()} EARNED ${formatMoney(earning)} FROM ${s.userName?.toUpperCase()} PASS PURCHASE`,
                subLabel: '80% Marketplace Share',
                timestamp: s.timestamp || s.subscribedAt || 0
            });
        });

        // 2. Payouts (Negative Outflow)
        approvedPayouts.forEach(p => {
            all.push({
                ...p,
                type: 'Payout',
                amount: p.amount,
                label: `SETTLEMENT PROCESSED FOR ${p.tutorName?.toUpperCase()}`,
                subLabel: 'Bank Outflow (Liability Reduction)',
                timestamp: p.paidAt || p.requestedAt || 0
            });
        });

        return all.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime() || 0;
            const timeB = new Date(b.timestamp).getTime() || 0;
            return timeB - timeA;
        });
    }, [tutorSubscriptions, approvedPayouts]);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalPayouts = 0;
        let totalAppPassValue = 0;
        let tutorNetReserve = 0;
        let studentNetReserve = 0;
        let totalCommission = 0;

        approvedTransactions.forEach(r => totalRevenue += (r.amount || 0));
        approvedPayouts.forEach(r => totalPayouts += (r.amount || 0));

        // Tutors Net Reserve (Liability: Sum of all tutor wallet balances)
        tutors.forEach(t => {
            tutorNetReserve += (t.walletBalance || 0);
        });

        // Students Net Reserve (Liability: Sum of all student wallet balances)
        cloudProfiles.forEach(p => {
            studentNetReserve += Number(p.wallet_balance || 0);
        });

        // Expenditures (Value leaving the mobile money/reserve pool)
        appPassPurchases.forEach(p => totalAppPassValue += (p.amount || 0));

        // Commissions
        cloudProfiles.forEach(p => {
            const subs = Array.isArray(p.subscribed_tutors) ? p.subscribed_tutors : [];
            subs.forEach((s: any) => {
                const price = s.amount || 3000;
                totalCommission += (price * 0.2);
            });
        });

        const platformProfit = totalAppPassValue + totalCommission;
        const availableLiquidity = totalRevenue - totalPayouts;
        const totalLiability = studentNetReserve + tutorNetReserve;
        const reserveSurplus = availableLiquidity - totalLiability;
        const yieldRate = totalRevenue > 0 ? (platformProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalPayouts,
            appPassRevenue: totalAppPassValue,
            netReserve: totalLiability,
            tutorNetReserve,
            totalCommission,
            platformProfit,
            availableLiquidity,
            reserveSurplus,
            yieldRate,
            subscriberCount: cloudProfiles.filter(p => p.subscription_status === 'active' || p.subscriptionStatus === 'active').length
        };
    }, [approvedTransactions, approvedPayouts, appPassPurchases, tutors, cloudProfiles]);

    const pendingDeposits = useMemo(() => {
        const all: (SubscriptionRequest & { studentId: string; studentName: string; email?: string })[] = [];
        cloudProfiles.forEach(p => {
            const requests = Array.isArray(p.payment_requests) ? p.payment_requests : [];
            requests.forEach((r: any) => {
                if (r.status === 'Pending') {
                    all.push({
                        ...r,
                        studentId: p.id.toString(),
                        studentName: p.full_name || p.name || 'Cloud User',
                        email: p.email // useful for contact
                    });
                }
            });
        });
        return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [cloudProfiles]);

    const pendingPayouts = useMemo(() => {
        const all: (PayoutRequest & { tutorName: string })[] = [];
        tutors.forEach(t => {
            (t.payoutRequests || []).forEach(r => {
                if (r.status === 'Pending') all.push({ ...r, tutorName: t.name });
            });
        });
        return all.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [tutors]);

    // --- ACTIONS ---
    const handleVerifyDeposit = async (req: any, status: 'Approved' | 'Rejected') => {
        const amountResponse = status === 'Approved' ? prompt('Enter verified amount (UGX):', req.amount?.toString() || '5000') : '0';
        if (status === 'Approved' && !amountResponse) return;

        const verifiedAmount = Number(amountResponse);
        const reason = status === 'Rejected' ? prompt('Reason for rejection:') : undefined;

        try {
            await verifySubscriptionRequest(req.id, req.studentId, verifiedAmount, status, reason || undefined);
            fetchCloudLedger();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleProcessPayout = (payout: any) => {
        const ref = prompt('Enter payment reference (e.g. Airtel Transaction ID):');
        if (!ref) return;

        try {
            processPayout(payout.tutorId, payout.id, ref);
            fetchCloudLedger(); // Refresh
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        Financial <span className="text-red-600">Ops</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-red-600"></span>
                        Liquidity & Settlement Control
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 bg-slate-100 p-2 rounded-3xl self-start lg:self-auto">
                    {(['pending', 'analytics'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab as any);
                                if (tab === 'pending') setViewMode('pending');
                                if (tab === 'analytics') setViewMode('activity_stream');
                            }}
                            className={`px-4 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-red-600 shadow-xl shadow-red-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* COMMAND BUTTONS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                    onClick={() => { setViewMode('deposits_archive'); setActiveTab('pending'); }}
                    className={`bg-white p-6 rounded-[2.5rem] border transition-all group overflow-hidden relative text-left outline-none ${viewMode === 'deposits_archive' ? 'border-red-600 ring-4 ring-red-500/5 shadow-2xl shadow-red-200/50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full flex items-center justify-center text-emerald-200 group-hover:scale-110 transition-transform -z-10" />
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all transform group-hover:rotate-6 ${viewMode === 'deposits_archive' ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Revenue</p>
                            <p className="text-xl font-black text-slate-900">{formatMoney(stats.totalRevenue)}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => { setViewMode('payouts_archive'); setActiveTab('pending'); }}
                    className={`bg-white p-6 rounded-[2.5rem] border transition-all group overflow-hidden relative text-left outline-none ${viewMode === 'payouts_archive' ? 'border-red-600 ring-4 ring-red-500/5 shadow-2xl shadow-red-200/50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full flex items-center justify-center text-blue-200 group-hover:scale-110 transition-transform -z-10" />
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all transform group-hover:-rotate-6 ${viewMode === 'payouts_archive' ? 'bg-red-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <ArrowRightLeft size={24} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Payouts</p>
                            <p className="text-xl font-black text-slate-900">{formatMoney(stats.totalPayouts)}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => { setViewMode('activity_stream'); setActiveTab('pending'); }}
                    className={`p-6 rounded-[2.5rem] text-white shadow-2xl transition-all group overflow-hidden relative outline-none ${viewMode === 'activity_stream' ? 'bg-red-600 ring-4 ring-red-500/20 shadow-red-900/40' : 'bg-[#0d0d0d] hover:scale-[1.02] shadow-slate-900/20'}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -z-0" />
                    <div className="relative z-10 flex items-center gap-4 text-left">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${viewMode === 'activity_stream' ? 'bg-white text-red-600 shadow-xl' : 'bg-red-600 text-white shadow-xl shadow-red-600/40 group-hover:rotate-6'}`}>
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${viewMode === 'activity_stream' ? 'text-white' : 'text-red-500'}`}>Net Reserve</p>
                            <p className="text-xl font-black">{formatMoney(stats.netReserve)}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => { setViewMode('tutor_activity'); setActiveTab('pending'); }}
                    className={`p-6 rounded-[2.5rem] text-white transition-all group overflow-hidden relative text-left outline-none ${viewMode === 'tutor_activity' ? 'bg-red-600 ring-4 ring-red-500/20 shadow-red-900/40' : 'bg-slate-900 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-bl-full transform group-hover:scale-125 transition-transform" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${viewMode === 'tutor_activity' ? 'bg-white text-red-600 shadow-xl' : 'bg-white/10 text-red-500'}`}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${viewMode === 'tutor_activity' ? 'text-white' : 'text-slate-400'}`}>Tutor Net Reserve</p>
                            <p className="text-xl font-black">{formatMoney(stats.tutorNetReserve)}</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* List Body Contextualized by ActiveTab & ViewMode */}
            {activeTab === 'pending' ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase italic">
                            {viewMode === 'pending' ? <Clock size={24} className="text-amber-500" /> : <ShieldCheck size={24} className="text-red-600" />}
                            {viewMode === 'pending' ? 'Pending Requests' : viewMode === 'deposits_archive' ? 'Revenue Archive' : viewMode === 'payouts_archive' ? 'Settlement Archive' : viewMode === 'tutor_activity' ? 'Tutor Activity Ledger' : 'Activity Stream'}
                            <span className="text-slate-300">/</span> {
                                viewMode === 'pending' ? (pendingSubTab === 'deposits' ? pendingDeposits.length : pendingPayouts.length) :
                                    viewMode === 'deposits_archive' ? approvedTransactions.length :
                                        viewMode === 'payouts_archive' ? approvedPayouts.length :
                                            viewMode === 'tutor_activity' ? tutorActivityStream.length :
                                                activityStream.length
                            }
                        </h2>

                        {viewMode === 'pending' && (
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                <button
                                    onClick={() => setPendingSubTab('deposits')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${pendingSubTab === 'deposits' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Deposits <span className={`px-2 py-0.5 rounded-lg text-[9px] ${pendingSubTab === 'deposits' ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-500'}`}>{pendingDeposits.length}</span>
                                </button>
                                <button
                                    onClick={() => setPendingSubTab('settlements')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${pendingSubTab === 'settlements' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Settlements <span className={`px-2 py-0.5 rounded-lg text-[9px] ${pendingSubTab === 'settlements' ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-500'}`}>{pendingPayouts.length}</span>
                                </button>
                            </div>
                        )}

                        {viewMode !== 'pending' && (
                            <button
                                onClick={() => setViewMode('pending')}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors flex items-center gap-2"
                            >
                                Return to Pending Registry <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {viewMode === 'pending' && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                {pendingSubTab === 'deposits' ? (
                                    <>
                                        {pendingDeposits.length === 0 ? (
                                            <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-slate-100 border-dashed">
                                                <ShieldCheck className="mx-auto text-slate-200 mb-4" size={48} />
                                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No Pending Deposits To Verify</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingDeposits.map(req => (
                                                    <div key={req.id} className="bg-white p-6 lg:px-10 lg:py-8 rounded-[2.5rem] border border-slate-100 hover:border-red-500/20 hover:shadow-xl hover:shadow-red-900/5 transition-all group relative">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center font-black text-slate-400 border border-slate-100 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:rotate-6 text-xl">
                                                                    {req.studentName?.[0]}
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors uppercase">{req.studentName}</h3>
                                                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                                                        <span>TXN: {req.transactionId}</span>
                                                                        <span>•</span>
                                                                        <span>{req.phoneNumber}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 lg:px-12">
                                                                <div className="text-xs font-bold text-slate-600 italic bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                                                                    "{req.reference}"
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={() => handleVerifyDeposit(req, 'Rejected')} className="p-4 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-2xl transition-all"><XCircle size={24} /></button>
                                                                <button onClick={() => handleVerifyDeposit(req, 'Approved')} className="px-8 py-5 bg-slate-900 group-hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all">Approve Deposit</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {pendingPayouts.length === 0 ? (
                                            <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-slate-100 border-dashed">
                                                <ArrowRightLeft className="mx-auto text-slate-200 mb-4" size={48} />
                                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No Pending Settlements To Process</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingPayouts.map(payout => (
                                                    <div key={payout.id} className="bg-white p-6 lg:px-10 lg:py-8 rounded-[2.5rem] border border-blue-100 hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 flex items-center justify-center font-black text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-rotate-6">
                                                                    <CreditCard size={28} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{payout.tutorName}</h3>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Requested Settlement</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 lg:px-12">
                                                                <div className="text-3xl font-black text-slate-900 tracking-tighter italic">{formatMoney(payout.amount)}</div>
                                                            </div>
                                                            <button onClick={() => handleProcessPayout(payout)} className="px-8 py-5 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all">Process Payout</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {viewMode !== 'pending' && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                {(viewMode === 'deposits_archive' ? approvedTransactions :
                                    viewMode === 'payouts_archive' ? approvedPayouts :
                                        viewMode === 'tutor_activity' ? tutorActivityStream :
                                            activityStream).map((log, idx) => (
                                                <div key={log.id || idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between gap-6 group hover:border-red-500/10 transition-all shadow-sm">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${log.type === 'Sync' || log.type === 'TutorEarning' ? 'bg-emerald-50 text-emerald-600' :
                                                            log.type === 'Payout' || log.type === 'Leakage' ? 'bg-rose-50 text-rose-600' :
                                                                'bg-slate-50 text-slate-400'
                                                            }`}>
                                                            {log.type === 'Sync' ? <TrendingUp size={20} /> : log.type === 'Leakage' || log.type === 'TutorEarning' ? <ArrowRightLeft size={20} /> : <Hash size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{log.label}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                                {new Date(log.timestamp || log.submittedAt || log.paidAt).toLocaleString()}
                                                                {log.subLabel && <span className={`${log.type === 'TutorEarning' ? 'text-emerald-500' : 'text-red-500'}/60 font-black ml-2`}>• {log.subLabel}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-black ${log.type === 'Leakage' || log.type === 'Payout' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {log.type === 'Leakage' || log.type === 'Payout' ? '-' : '+'}{formatMoney(log.amount || 0)}
                                                        </div>
                                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                            {log.type === 'Leakage' ? 'Leakage Record' : log.type === 'TutorEarning' ? 'Earning Log' : 'Verified Log'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-[4] rotate-12 -z-10 text-red-600">
                                <TrendingUp size={100} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-8">Platform Yield <span className="text-red-600">&</span> Commissions</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Platform Profit</p>
                                    <div className="flex items-baseline gap-3">
                                        <p className="text-5xl font-black text-slate-900 tracking-tighter italic">{formatMoney(stats.platformProfit)}</p>
                                        <p className="text-xs font-black text-emerald-600 italic">+{stats.yieldRate.toFixed(1)}% Yield</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2 italic">
                                        Gross Retained Income (Commissions + Pass Sales)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserve Surplus</p>
                                    <p className={`text-5xl font-black tracking-tighter italic ${stats.reserveSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(stats.reserveSurplus)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2 italic">
                                        Free Capital After All Liabilities
                                    </p>
                                </div>
                            </div>

                            <div className="mt-12 pt-12 border-t border-dashed border-slate-100 grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 italic">Total Revenue</p>
                                    <p className="text-lg font-black text-slate-900 italic">{formatMoney(stats.totalRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 italic">Active Tutors</p>
                                    <p className="text-lg font-black text-slate-900 italic">{tutors.length} Users</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 italic">Subscribers</p>
                                    <p className="text-lg font-black text-slate-900 italic">{stats.subscriberCount} Active</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-10 rounded-[3rem] text-white">
                            <h3 className="text-xl font-black uppercase italic mb-6">Financial Strategy</h3>
                            <div className="space-y-4">
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest">Auto-Settlement Threshold</p>
                                    <p className="font-black text-red-500">UGX 50,000</p>
                                </div>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest">Marketplace Commission</p>
                                    <p className="font-black text-red-500">20.0%</p>
                                </div>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest">Withdrawal Processing Fee</p>
                                    <p className="font-black text-red-500">UGX 1,500</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-red-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-red-600/20">
                            <h3 className="text-xl font-black uppercase italic mb-2">Platform Health</h3>
                            <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-8">Liquidity vs Liabilities</p>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 italic">
                                        <span>Current Liquidity Coverage</span>
                                        <span>{stats.availableLiquidity >= stats.netReserve ? 'HEALTHY' : 'CRITICAL'}</span>
                                    </div>
                                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden relative">
                                        <div
                                            className={`h-full transition-all duration-1000 ${stats.availableLiquidity >= stats.netReserve ? 'bg-emerald-400' : 'bg-white'}`}
                                            style={{ width: `${Math.min((stats.availableLiquidity / (stats.netReserve || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-red-100 mt-2 opacity-60 italic">Cash on hand vs Total System Liabilities</p>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-red-200 mb-1">Available Settlement Surplus</p>
                                    <p className="text-3xl font-black italic">{formatMoney(stats.reserveSurplus)}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-red-100 mt-1 opacity-60 italic">Free capital after potential exit</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
