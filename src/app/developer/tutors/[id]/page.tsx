"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    CreditCard,
    Activity,
    TrendingUp,
    ArrowUpRight,
    Loader2,
    Mail,
    Phone,
    Library,
    Users,
    Search,
    Calendar,
    Filter,
    Clock,
    ChevronRight,
    ShieldCheck,
    XCircle,
    RotateCcw
} from 'lucide-react';

export default function TutorDetailPage() {
    const params = useParams();
    const id = params.id;
    const router = useRouter();
    const [tutor, setTutor] = useState<any | null>(null);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'revenue' | 'payouts' | 'identity'>('revenue');
    const [payoutFilter, setPayoutFilter] = useState<'pending' | 'processed'>('pending');

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [magnitude, setMagnitude] = useState({ min: '', max: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const { data: tutorData } = await supabase.from('profiles').select('*').eq('id', id).single();
                setTutor(tutorData);
                const { data: allData } = await supabase.from('profiles').select('*');
                setAllProfiles(allData || []);
            } catch (error) {
                console.error("Error fetching tutor details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const formatMoney = (amount: number) => `USH ${new Intl.NumberFormat('en-US').format(Math.floor(amount))}`;

    const ledger = useMemo(() => {
        if (!tutor) return { revenue: [], payouts: [], stats: { total: 0, paid: 0, pending: 0, balance: 0 } };

        const revenue: any[] = [];
        const payouts: any[] = [];

        allProfiles.forEach(p => {
            const subs = Array.isArray(p.subscribed_tutors) ? p.subscribed_tutors :
                Array.isArray(p.tutorSubscriptions) ? p.tutorSubscriptions : [];

            subs.forEach((s: any) => {
                if (s.tutorId?.toString() === id?.toString()) {
                    const price = s.amount || 3500;
                    revenue.push({
                        id: `REV-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
                        student: p.full_name || 'Anonymous Student',
                        stuId: p.id,
                        date: s.timestamp || s.subscribedAt || 0,
                        amount: price * 0.8,
                        gross: price
                    });
                }
            });

            if (p.id?.toString() === id?.toString()) {
                const tutorPayouts = Array.isArray(p.payouts) ? p.payouts : [];
                tutorPayouts.forEach((pay: any) => {
                    payouts.push({
                        id: pay.id || `PAY-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
                        amount: pay.amount,
                        date: pay.paidAt || pay.timestamp || pay.requestedAt || 0,
                        status: pay.status || 'Pending',
                        method: pay.method || 'Bank Transfer'
                    });
                });
            }
        });

        const totalEarned = revenue.reduce((acc, curr) => acc + curr.amount, 0);
        const totalPaid = payouts.filter(p => ['Paid', 'Approved', 'Completed'].includes(p.status)).reduce((acc, curr) => acc + curr.amount, 0);
        const totalPending = payouts.filter(p => p.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

        return {
            revenue: revenue.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            payouts: payouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            stats: { total: totalEarned, paid: totalPaid, pending: totalPending, balance: totalEarned - totalPaid }
        };
    }, [tutor, allProfiles, id]);

    const applyFilters = (data: any[]) => {
        return data.filter(item => {
            // Search Query Filter
            const matchesSearch = searchQuery === '' ||
                (item.student || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.id || '').toLowerCase().includes(searchQuery.toLowerCase());

            // Date Range Filter
            const itemDate = new Date(item.date);
            const matchesDate = (dateRange.start === '' || itemDate >= new Date(dateRange.start)) &&
                (dateRange.end === '' || itemDate <= new Date(dateRange.end));

            // Magnitude Filter
            const matchesMagnitude = (magnitude.min === '' || item.amount >= parseFloat(magnitude.min)) &&
                (magnitude.max === '' || item.amount <= parseFloat(magnitude.max));

            return matchesSearch && matchesDate && matchesMagnitude;
        });
    };

    const filteredRevenue = applyFilters(ledger.revenue);
    const filteredPayouts = applyFilters(ledger.payouts).filter(p =>
        payoutFilter === 'pending' ? p.status === 'Pending' : p.status !== 'Pending'
    );

    const setQuickDate = (days: number) => {
        const end = new Date().toISOString().split('T')[0];
        const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setDateRange({ start, end });
    };

    const toggleVerification = async () => {
        if (!tutor) return;

        // Optimistic State Guard
        const previousState = tutor.is_verified;
        const nextStatus = !previousState;

        setTutor({ ...tutor, is_verified: nextStatus });
        setUpdating(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: nextStatus })
                .eq('id', id);

            if (error) throw error;

            // POST-AUDIT CHECK: Verify if the database actually committed the change
            // This catches silent RLS policy blocks
            const { data: verifyData } = await supabase
                .from('profiles')
                .select('is_verified')
                .eq('id', id)
                .single();

            if (verifyData && verifyData.is_verified !== nextStatus) {
                throw new Error("RLS_SYNC_REFUSAL: The database signal was accepted but the state was not committed. Please check Supabase Row Level Security (RLS) policies for the 'is_verified' column.");
            }

        } catch (err: any) {
            console.error("Forensic Sync Failure:", err);
            // ROLLBACK: Revert to previous state if DB fails
            setTutor({ ...tutor, is_verified: previousState });
            alert(`PROTOCOL SYNC ERROR: ${err.message || "Could not update certification status. Please check connectivity or database RLS policies."}`);
        } finally {
            setUpdating(false);
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setDateRange({ start: '', end: '' });
        setMagnitude({ min: '', max: '' });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 h-full">
            <Loader2 className="animate-spin text-red-600 mb-6" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Loading Auditor Port...</p>
        </div>
    );

    if (!tutor) return (
        <div className="text-center py-32 bg-white rounded-[4rem] border border-slate-100 m-8">
            <XCircle size={64} className="mx-auto text-red-100 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">Tutor Node Not Found</h2>
            <button onClick={() => router.push('/developer/tutors')} className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest leading-none">Back to Registrar</button>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-32 max-w-[1600px] mx-auto px-4 md:px-8">
            {/* Minimal High-Density Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-8">
                <div className="space-y-4">
                    <button onClick={() => router.push('/developer/tutors')} className="flex items-center gap-2 text-slate-400 hover:text-red-600 transition-colors">
                        <ArrowLeft size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Registrar</span>
                    </button>
                    <div className="flex items-center gap-6">
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{tutor.full_name || tutor.name}</h1>
                        {tutor.is_verified && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl shadow-xl animate-in zoom-in duration-500">
                                <ShieldCheck size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest italic">Premier Recommended</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center gap-12 shadow-2xl">
                    <div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Account Balance</p>
                        <p className="text-4xl font-black italic text-emerald-400">{formatMoney(ledger.stats.balance)}</p>
                    </div>
                    <div className="w-[1px] h-12 bg-white/10" />
                    <div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Awaiting Settlement</p>
                        <p className="text-2xl font-black italic text-orange-400">{formatMoney(ledger.stats.pending)}</p>
                    </div>
                </div>
            </div>

            {/* TAB NAV */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'revenue', label: 'Revenue Ledger', icon: Activity },
                    { id: 'payouts', label: 'Payout History', icon: CreditCard, count: ledger.payouts.filter(p => p.status === 'Pending').length },
                    { id: 'identity', label: 'Node Identity', icon: Users },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as any);
                            resetFilters();
                        }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <tab.icon size={16} /> {tab.label}
                        {tab.count !== undefined && tab.count > 0 && <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">{tab.count}</span>}
                    </button>
                ))}
            </div>

            {/* FORENSIC FILTER CONSOLE */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-8 animate-in slide-in-from-top-4 duration-500">
                <div className="flex flex-wrap items-center gap-6">
                    {/* Unified Search */}
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT OR REFERENCE ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/20"
                        />
                    </div>

                    {/* Magnitude Filter */}
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
                        <div className="px-4 text-[9px] font-black text-white/40 uppercase tracking-widest border-r border-white/10">Magnitude</div>
                        <input
                            type="number"
                            placeholder="MIN"
                            value={magnitude.min}
                            onChange={(e) => setMagnitude({ ...magnitude, min: e.target.value })}
                            className="bg-transparent w-20 text-white text-[10px] font-black uppercase tracking-widest focus:outline-none text-center"
                        />
                        <span className="text-white/20 px-1">/</span>
                        <input
                            type="number"
                            placeholder="MAX"
                            value={magnitude.max}
                            onChange={(e) => setMagnitude({ ...magnitude, max: e.target.value })}
                            className="bg-transparent w-20 text-white text-[10px] font-black uppercase tracking-widest focus:outline-none text-center"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
                        <Calendar className="ml-2 text-white/30" size={16} />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest focus:outline-none [color-scheme:dark]"
                        />
                        <span className="text-white/20 px-1 flex items-center justify-center">→</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest focus:outline-none [color-scheme:dark]"
                        />
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        className="bg-red-600/10 hover:bg-red-600/20 text-red-500 p-4 rounded-2xl transition-all border border-red-500/20"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>

                {/* Quick Presets & Stats */}
                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                    <div className="flex items-center gap-4">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mr-2">Audit Pulse:</p>
                        {[
                            { label: 'Today', days: 0 },
                            { label: '7 Days', days: 7 },
                            { label: '30 Days', days: 30 },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                onClick={() => setQuickDate(btn.days)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/5 transition-all"
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">
                            Filtered Signal Matches: <span className="text-white ml-2">{activeTab === 'revenue' ? filteredRevenue.length : filteredPayouts.length}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* AUDIT INTERFACE */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm min-h-[600px] overflow-hidden">
                {activeTab === 'revenue' && (
                    <div className="animate-in fade-in slide-in-from-left-4">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Student Purchase Audit</h3>
                            <p className="text-lg font-black italic text-slate-400">Yield Pool: <span className="text-emerald-600">{formatMoney(filteredRevenue.reduce((acc, c) => acc + c.amount, 0))}</span></p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                                        <th className="px-10 py-5">Reference</th>
                                        <th className="px-10 py-5">Student Identity</th>
                                        <th className="px-10 py-5">Timestamp</th>
                                        <th className="px-10 py-5 text-right">Magnitude (80%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRevenue.length === 0 ? (
                                        <tr><td colSpan={4} className="py-32 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No matching commercial signals found</td></tr>
                                    ) : filteredRevenue.map((r, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                            <td className="px-10 py-5 text-[10px] font-bold text-slate-400 font-mono">{r.id}</td>
                                            <td className="px-10 py-5">
                                                <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{r.student}</p>
                                                <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase">ID: {r.stuId?.slice(0, 8)}</p>
                                            </td>
                                            <td className="px-10 py-5 text-[11px] font-bold text-slate-600">{new Date(r.date).toLocaleString()}</td>
                                            <td className="px-10 py-5 text-right font-black italic text-slate-900 text-lg">{formatMoney(r.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'payouts' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Settlement Management</h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['pending', 'processed'].map((f) => (
                                    <button key={f} onClick={() => setPayoutFilter(f as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${payoutFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                                        {f === 'pending' ? 'Pending Disburse' : 'Settlement History'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                                        <th className="px-10 py-5">Ref ID</th>
                                        <th className="px-10 py-5">Method</th>
                                        <th className="px-10 py-5">Status</th>
                                        <th className="px-10 py-5">Date</th>
                                        <th className="px-10 py-5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayouts.length === 0 ? (
                                        <tr><td colSpan={5} className="py-32 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No matching settlement signals found</td></tr>
                                    ) : filteredPayouts.map((p, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                            <td className="px-10 py-5 text-[10px] font-bold text-slate-400 font-mono">{p.id}</td>
                                            <td className="px-10 py-5 text-[11px] font-black text-slate-900 uppercase italic">{p.method}</td>
                                            <td className="px-10 py-5">
                                                <span className={`px-2 py-1 text-[8px] font-black uppercase rounded-md italic border ${p.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{p.status}</span>
                                            </td>
                                            <td className="px-10 py-5 text-[11px] font-bold text-slate-600">{new Date(p.date).toLocaleString()}</td>
                                            <td className="px-10 py-5 text-right font-black italic text-slate-900 text-lg">{formatMoney(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'identity' && (
                    <div className="p-16 md:p-24 animate-in zoom-in-95 duration-500">
                        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Node Credentials</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 text-lg font-black text-slate-900 italic uppercase"><Mail size={20} className="text-red-600" /> {tutor.email}</div>
                                        <div className="flex items-center gap-4 text-lg font-black text-slate-900 italic uppercase"><Phone size={20} className="text-red-600" /> {tutor.phone || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Registry Hash</p>
                                    <code className="text-[10px] font-mono font-bold text-red-600 break-all">{tutor.id}</code>
                                </div>

                                {/* VERIFICATION CONSOLE */}
                                <div className="p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-sm space-y-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Auditor Controls</p>
                                        <h4 className="text-xl font-black text-slate-900 uppercase italic leading-none">Protocol Certification</h4>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                                        Certify this tutor to grant "Premier Recommended" status. This signals to all students that this is a highly trusted educator node.
                                    </p>

                                    <div className="pt-4">
                                        {!tutor.is_verified ? (
                                            <button
                                                onClick={toggleVerification}
                                                disabled={updating}
                                                className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 duration-200"
                                            >
                                                {updating ? <Loader2 className="animate-spin" size={16} /> : (
                                                    <>
                                                        <ShieldCheck size={18} className="text-emerald-400" />
                                                        Certify & Recommend Tutor
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="py-4 px-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-300">
                                                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                                        <ShieldCheck size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Certification</p>
                                                        <p className="text-[8px] font-bold text-emerald-400 uppercase italic">ID: CERTIFIED-NODE-{id?.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={toggleVerification}
                                                    disabled={updating}
                                                    className="w-full py-4 bg-white border-2 border-red-50 hover:bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[9px] uppercase tracking-widest italic group"
                                                >
                                                    {updating ? <Loader2 className="animate-spin text-red-600" size={16} /> : (
                                                        <>
                                                            <XCircle size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                                                            Revoke Certification Badge
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`p-10 rounded-[4rem] shadow-2xl space-y-8 h-fit transition-all duration-1000 border-4 ${tutor.is_verified
                                ? 'bg-[#05110c] border-emerald-500/40 shadow-emerald-500/10'
                                : 'bg-slate-900 border-slate-800'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 ${tutor.is_verified ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-white/5'
                                        }`}>
                                        <ShieldCheck size={28} className={tutor.is_verified ? 'text-white' : 'text-white/10'} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Protocol Integrity</p>
                                        <p className={`text-2xl font-black italic uppercase transition-all duration-700 tracking-tighter ${tutor.is_verified ? 'text-emerald-400' : 'text-white/10'}`}>
                                            {tutor.is_verified ? 'Elite Verified' : 'Standard Node'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-8 border-t border-white/5">
                                    <div className={`transition-all duration-700 ${tutor.is_verified ? 'opacity-100 translate-x-0' : 'opacity-20 translate-x-4'}`}>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 italic">Settlement Rails</p>
                                        <div className="flex items-center gap-3 text-white font-black italic uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {tutor.payout_method || 'Direct Bank Settlement'}
                                        </div>
                                    </div>
                                    <div className={`transition-all duration-700 delay-100 ${tutor.is_verified ? 'opacity-100 translate-x-0' : 'opacity-20 translate-x-4'}`}>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 italic">Creator Summary</p>
                                        <p className="text-xs font-bold text-white/60 leading-relaxed italic pr-4">
                                            {tutor.bio || 'This node is a validated professional content provider within the Compass 360 Ecosystem.'}
                                        </p>
                                    </div>
                                </div>

                                {tutor.is_verified && (
                                    <div className="pt-6 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <TrendingUp size={14} className="text-emerald-400" />
                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">Highly Recommended Protocol</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="text-center opacity-20"><p className="text-[9px] font-black uppercase tracking-[0.5em] italic">Forensic Audit Infrastructure Terminal v4.2</p></div>
        </div>
    );
}
