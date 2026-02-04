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
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-[400px] animate-pulse">
            <div className="flex justify-between items-start mb-8">
                <div className="space-y-3">
                    <div className="h-2 w-24 bg-slate-800 rounded"></div>
                    <div className="h-6 w-40 bg-slate-800 rounded"></div>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
            </div>
            <div className="space-y-6">
                <div className="h-2 w-32 bg-slate-800 rounded"></div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className="w-8 h-8 rounded-lg bg-slate-800"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-20 bg-slate-800 rounded"></div>
                                <div className="h-1.5 w-16 bg-slate-800 rounded"></div>
                            </div>
                        </div>
                        <div className="h-2 w-12 bg-slate-800 rounded"></div>
                    </div>
                ))}
            </div>
            <div className="mt-auto pt-6 border-t border-slate-800 flex justify-between">
                <div className="h-2 w-20 bg-slate-800 rounded"></div>
                <div className="h-3 w-3 bg-slate-800 rounded"></div>
            </div>
        </div>
    );

    // --- RENDER HELPERS ---

    const StatCard = ({ title, value, subtitle, colorClass, icon: Icon, onClick, feed, isMonetary = true }: any) => (
        <div
            onClick={onClick}
            className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 md:p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col min-h-0 md:min-h-[400px] backdrop-blur-sm active:scale-[0.98]"
        >
            <div className="border-b border-slate-100 dark:border-slate-800/50 pb-3 md:pb-5 mb-3 md:mb-5 flex justify-between items-start">
                <div>
                    <span className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-[0.2em]">{title}</span>
                    <div className={`text-lg md:text-2xl font-black mt-1 md:mt-2 tracking-tight ${colorClass}`}>
                        {isMonetary ? formatMoney(value) : (value > 0 ? value : "LIVE FEED")}
                    </div>
                </div>
                <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl ${colorClass.replace('text-', 'bg-').split(' ')[0]} bg-opacity-10 dark:bg-opacity-20 transition-all group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon size={18} className="md:w-[22px] md:h-[22px]" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <h4 className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 md:mb-4 flex items-center gap-1.5">
                    <Activity size={10} className="text-slate-400 md:w-3 md:h-3" /> {subtitle}
                </h4>
                <div className="space-y-2 md:space-y-4">
                    {feed && feed.length > 0 ? feed.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center group/item p-0.5">
                            <div className="flex gap-2.5 md:gap-4 items-center min-w-0">
                                <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm md:text-lg border border-slate-100 dark:border-slate-700/50">
                                    {Icon === Package ? "📦" : Icon === Receipt ? "📄" : Icon === Wallet ? "💵" : "🔌"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] md:text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.studentName || item.label}</div>
                                    <div className="text-[9px] text-slate-500 dark:text-slate-500 truncate leading-tight mt-0.5">{item.description || item.studentName}</div>
                                </div>
                            </div>
                            <div className={`text-[11px] md:text-xs font-black ${colorClass} flex-shrink-0 ml-2`}>
                                {Icon === Package ? `${item.brought} pc(s)` : formatMoney(item.amount)}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 md:py-16 text-slate-300 dark:text-slate-700 italic text-[10px]">
                            No active records.
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 md:mt-5 pt-2.5 md:pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span className="group-hover:text-blue-500 transition-colors">Explorer Archive</span>
                <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform md:w-[14px] md:h-[14px]" />
            </div>
        </div>
    );

    if (!hydrated) {
        return (
            <div className="pb-16 max-w-[1400px] mx-auto p-4 md:p-8">
                <div className="h-10 w-64 bg-slate-900 animate-pulse rounded mb-10"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (activeRole !== 'Bursar') {
        return <div className="p-8 flex items-center justify-center h-full text-gray-400">Loading module...</div>;
    }

    const { totalInvoiced, totalArrears, digitalTotal, cashTotal, manualOverridesTotal } = financialMetrics!;

    return (
        <div className="pb-16 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            <header className="mb-4 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        COMMAND <span className="text-blue-600">CENTER</span>
                    </h1>
                    <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1 md:mt-2 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500 md:w-4 md:h-4" />
                        Live financial performance & audit.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 border border-slate-200 dark:border-slate-800">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Live Sync Active</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                <StatCard
                    title="Total Invoiced"
                    value={totalInvoiced}
                    subtitle="Recent Billings"
                    colorClass="text-blue-500"
                    icon={Receipt}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={billingFeed}
                />
                <StatCard
                    title="Total Arrears"
                    value={totalArrears}
                    subtitle="Critical Defaulters"
                    colorClass="text-red-500"
                    icon={AlertCircle}
                    onClick={() => router.push('/bursar/learners')}
                    feed={topDefaulters}
                />
                <StatCard
                    title="Digital Collections"
                    value={digitalTotal}
                    subtitle="Bank & SchoolPay Entries"
                    colorClass="text-purple-500"
                    icon={BarChart3}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={digitalFeed}
                />
                <StatCard
                    title="Cash at Desk"
                    value={cashTotal}
                    subtitle="Manual Cash Receipts"
                    colorClass="text-emerald-500"
                    icon={Wallet}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={cashFeed}
                />
                <StatCard
                    title="Manual Overrides"
                    value={manualOverridesTotal}
                    subtitle="Administrative Adjustments"
                    colorClass="text-orange-500"
                    icon={TrendingUp}
                    onClick={() => router.push('/bursar/transactions')}
                    feed={[]} // Placeholder
                />
                <StatCard
                    title="Inventory"
                    value={0}
                    subtitle="Store Activity"
                    colorClass="text-slate-600"
                    icon={Package}
                    onClick={() => router.push('/bursar/inventory')}
                    feed={requirementsFeed}
                    isMonetary={false}
                />
            </div>
        </div>
    );
}
