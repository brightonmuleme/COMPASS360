"use client";
import React, { useEffect, useMemo } from "react";
import { useSchoolData, formatMoney } from "@/lib/store";
import { Activity, Wallet, Receipt, Package, ArrowUpRight, TrendingUp, BarChart3, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { calculateStudentFinancials } from "@/lib/financialCore";

export default function BursarDashboard() {
    const {
        activeRole,
        students,
        billings,
        payments,
        bursaries,
        hydrated
    } = useSchoolData();
    const router = useRouter();

    useEffect(() => {
        if (hydrated && !activeRole) {
            router.replace('/portal');
            return;
        }
        if (activeRole === 'Expense Manager') {
            router.replace('/bursar/expenses');
        } else if (activeRole === 'Estate Manager') {
            router.replace('/bursar/estate-settings');
        } else if (activeRole === 'Director') {
            router.replace('/admin/dashboard');
        } else if (activeRole !== 'Bursar') {
            // Wait for hydration
        }
    }, [activeRole, router, hydrated]);

    // --- LIVE CALCULATIONS (Using Centralized Core) ---

    const financialMetrics = useMemo(() => {
        if (!hydrated) return null;

        let totalInvoiced = 0;
        let totalArrears = 0;
        let digitalTotal = 0;
        let cashTotal = 0;
        let manualOverridesTotal = 0;

        totalInvoiced = billings.reduce((sum, b) => sum + b.amount, 0);

        students.forEach(student => {
            const summary = calculateStudentFinancials(student, billings, payments, bursaries);
            totalArrears += Math.max(0, summary.outstandingBalance);
        });

        payments.forEach(p => {
            const method = p.method?.toLowerCase() || '';
            if (['bank', 'card', 'mobile', 'digital', 'schoolpay', 'pegpay'].some(m => method.includes(m))) {
                digitalTotal += p.amount;
            } else if (method === 'cash') {
                cashTotal += p.amount;
            } else if (method === 'manual') {
                manualOverridesTotal += p.amount;
            }
        });

        return { totalInvoiced, totalArrears, digitalTotal, cashTotal, manualOverridesTotal };
    }, [billings, students, payments, bursaries, hydrated]);

    // --- FEEDS ---

    const billingFeed = useMemo(() => {
        return [...billings]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(b => ({
                id: b.id,
                studentName: students.find(s => s.id === b.studentId)?.name || 'Unknown',
                description: b.description,
                amount: b.amount
            }));
    }, [billings, students]);

    const topDefaulters = useMemo(() => {
        return students
            .map(s => {
                const summary = calculateStudentFinancials(s, billings, payments, bursaries);
                return { id: s.id, studentName: s.name, description: s.programme, amount: summary.outstandingBalance };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [students, billings, payments, bursaries]);

    const digitalFeed = useMemo(() => {
        return payments
            .filter(p => ['bank', 'card', 'mobile', 'digital', 'schoolpay', 'pegpay'].some(m => p.method?.toLowerCase().includes(m.toLowerCase())))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                studentName: students.find(s => s.id === p.studentId)?.name || 'Unknown',
                description: p.reference || 'Digital Sync',
                amount: p.amount
            }));
    }, [payments, students]);

    const cashFeed = useMemo(() => {
        return payments
            .filter(p => p.method?.toLowerCase() === 'cash')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                studentName: students.find(s => s.id === p.studentId)?.name || 'Unknown',
                description: 'Cash Payment',
                amount: p.amount
            }));
    }, [payments, students]);

    const requirementsFeed = useMemo(() => {
        const feed: any[] = [];
        students.forEach(student => {
            student.physicalRequirements?.forEach(req => {
                if (req.brought > 0) {
                    feed.push({
                        id: `${student.id}-${req.name}-${Date.now()}`,
                        label: req.name,
                        studentName: student.name,
                        brought: req.brought,
                        amount: 0 // placeholder for list renderer
                    });
                }
            });
        });
        return feed.slice(0, 5);
    }, [students]);

    // --- SKELETON LOADER ---
    const SkeletonCard = () => (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 h-[450px] animate-pulse">
            <div className="flex justify-between items-start mb-8">
                <div className="space-y-4">
                    <div className="h-2 w-24 bg-white/5 rounded-full"></div>
                    <div className="h-10 w-48 bg-white/5 rounded-2xl"></div>
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-[1.5rem]"></div>
            </div>
            <div className="space-y-6">
                <div className="h-2 w-32 bg-white/5 rounded-full mb-8"></div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-2xl bg-white/5"></div>
                            <div className="space-y-3">
                                <div className="h-2 w-24 bg-white/5 rounded-full"></div>
                                <div className="h-1.5 w-16 bg-white/5 rounded-full opacity-50"></div>
                            </div>
                        </div>
                        <div className="h-2 w-12 bg-white/5 rounded-full"></div>
                    </div>
                ))}
            </div>
            <div className="mt-auto pt-8 border-t border-white/5 flex justify-between">
                <div className="h-2 w-24 bg-white/5 rounded-full"></div>
                <div className="h-4 w-4 bg-white/5 rounded-lg"></div>
            </div>
        </div>
    );

    // --- RENDER HELPERS ---

    const StatCard = ({ title, value, subtitle, colorClass, icon: Icon, onClick, feed, isMonetary = true, trend = "+0.0%" }: any) => (
        <div
            onClick={onClick}
            className="relative overflow-hidden bg-white/5 dark:bg-slate-950/40 border border-white/10 dark:border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer group flex flex-col min-h-[450px] backdrop-blur-3xl active:scale-[0.98] hover:-translate-y-2"
        >
            {/* Ambient Glow behind card */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity ${colorClass.replace('text-', 'bg-')}`} />

            <div className="relative z-10 border-b border-white/5 pb-8 mb-8 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.4em] font-heading">{title}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>{trend}</span>
                    </div>
                    <div className={`text-4xl font-black mt-3 tracking-tighter bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent group-hover:to-white transition-all duration-500 leading-tight`}>
                        {isMonetary ? formatMoney(value) : (value > 0 ? value : "SYSTEM FEED")}
                    </div>
                </div>
                <div className={`p-4 rounded-[1.5rem] ${colorClass.replace('text-', 'bg-').split(' ')[0]} bg-opacity-10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12`}>
                    <Icon size={28} className={colorClass} />
                </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 flex items-center gap-3 tracking-[0.2em]">
                    <Activity size={12} className={colorClass} /> {subtitle}
                </h4>
                <div className="space-y-5">
                    {feed && feed.length > 0 ? feed.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center group/item p-2 hover:bg-white/[0.04] rounded-2xl transition-all duration-300 transform-gpu hover:translate-x-1">
                            <div className="flex gap-4 items-center min-w-0">
                                <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-2xl shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                    {Icon === Package ? "📦" : Icon === Receipt ? "📄" : Icon === Wallet ? "💵" : "🔌"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-white/90 truncate group-hover/item:text-white transition-colors">{item.studentName || item.label}</div>
                                    <div className="text-[10px] text-slate-500 truncate leading-tight mt-1 font-semibold tracking-wide">{item.description || item.studentName}</div>
                                </div>
                            </div>
                            <div className={`text-xs font-black ${colorClass} flex-shrink-0 ml-3 drop-shadow-md`}>
                                {Icon === Package ? `${item.brought} pc(s)` : formatMoney(item.amount).replace('UGX', '').trim()}
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-700 italic border-2 border-dashed border-white/[0.03] rounded-3xl opacity-50">
                            <span className="text-xl mb-2">📡</span>
                            <span className="text-[10px] font-bold tracking-widest uppercase">Waiting for broadcast...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                <span className="group-hover:text-white transition-colors cursor-pointer">Deep Analytics</span>
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all border border-white/5 group-hover:border-white/10">
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
            </div>

            {/* Animated Bottom Progress Bar Effect */}
            <div className={`absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-700 ease-in-out ${colorClass.replace('text-', 'bg-')}`} />
        </div>
    );

    if (!hydrated) {
        return (
            <div className="pb-16 max-w-[1400px] mx-auto p-12">
                <div className="h-16 w-96 bg-slate-900/50 animate-pulse rounded-[2rem] mb-16"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (activeRole !== 'Bursar') {
        return <div className="p-12 flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-widest text-[12px]">Decrypting Module Access...</div>;
    }

    const { totalInvoiced, totalArrears, digitalTotal, cashTotal, manualOverridesTotal } = financialMetrics!;

    return (
        <div className="min-h-screen pb-24 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Premium Decorative Mesh Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100 mix-blend-overlay" />
            </div>

            <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-10 relative z-10 px-4 md:px-0">
                <div>
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 shadow-2xl shadow-blue-500/5">
                        <TrendingUp size={14} /> Intelligence Dashboard
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none font-heading">
                        COMMAND <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">CENTER</span>
                    </h1>
                    <p className="text-base md:text-xl text-slate-400 font-medium mt-6 max-w-2xl leading-relaxed">
                        Precision orchestration of fiscal cycles. Audit liquidity, mitigate exposure, and synchronize digital payment gateways in one unified high-fidelity view.
                    </p>
                </div>
                <div className="flex gap-6">
                    <div className="bg-white/5 backdrop-blur-2xl px-8 py-6 rounded-[2.5rem] flex items-center gap-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <div className="relative">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping absolute top-0 left-0 opacity-40"></div>
                            <div className="w-4 h-4 rounded-full bg-emerald-500 relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-[.2em] text-slate-500 mb-1">Global Connection</span>
                            <span className="text-sm font-black text-white tracking-wide">Live Sync Active</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10 p-4 md:p-0">
                <StatCard
                    title="Total Invoiced"
                    value={totalInvoiced}
                    subtitle="Performance Bench"
                    colorClass="text-blue-400"
                    trend="+4.2%"
                    icon={Receipt}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={billingFeed}
                />
                <StatCard
                    title="Total Arrears"
                    value={totalArrears}
                    subtitle="Exposure Risk"
                    colorClass="text-rose-500"
                    trend="-2.1%"
                    icon={AlertCircle}
                    onClick={() => router.push('/bursar/learners')}
                    feed={topDefaulters}
                />
                <StatCard
                    title="Digital Collections"
                    value={digitalTotal}
                    subtitle="Financial Transit"
                    colorClass="text-indigo-400"
                    trend="+18.5%"
                    icon={BarChart3}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={digitalFeed}
                />
                <StatCard
                    title="Cash at Desk"
                    value={cashTotal}
                    subtitle="Liquidity Pulse"
                    colorClass="text-emerald-400"
                    trend="-0.8%"
                    icon={Wallet}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={cashFeed}
                />
                <StatCard
                    title="Manual Overrides"
                    value={manualOverridesTotal}
                    subtitle="Audit Adjustments"
                    colorClass="text-amber-400"
                    trend="+0.0%"
                    icon={TrendingUp}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={[]} // Placeholder
                />
                <StatCard
                    title="Inventory"
                    value={0}
                    subtitle="Resource Stockpile"
                    colorClass="text-slate-400"
                    trend="+12 pc"
                    icon={Package}
                    onClick={() => router.push('/bursar/inventory')}
                    feed={requirementsFeed}
                    isMonetary={false}
                />
            </div>
        </div>
    );
}
