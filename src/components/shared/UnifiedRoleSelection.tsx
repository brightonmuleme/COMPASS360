"use client";
import React from "react";
import { useSchoolData, AccountantRole } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Lock, EyeOff, Eye, ShieldCheck, RefreshCw, AlertCircle, Home, ArrowLeft } from "lucide-react";
import styles from "../bursar/RoleSelection.module.css"; // Reuse existing styles

export default function UnifiedRoleSelection() {
    const { setActiveRole, setActiveAccountId, staffAccounts, portalBranding, schoolProfile, logout } = useSchoolData();
    const router = useRouter();

    const [selectingRole, setSelectingRole] = React.useState<typeof roles[0] | null>(null);
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [isForgot, setIsForgot] = React.useState(false);

    // We removed the automatic role clearing to avoid triggering the Global Identity Guard loop.
    // Landing on /portal now correctly allows you to pick your staff role without being kicked out.

    // Handle Auth Submission
    const handleLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError("");

        if (!selectingRole) return;

        const account = staffAccounts.find(acc => acc.role === selectingRole.id);
        if (account && account.password === password) {
            setActiveRole(selectingRole.id);
            setActiveAccountId(account.id);
            router.push(selectingRole.path);
        } else {
            setError("Incorrect password. Please try again.");
            // Brief shake effect logic would go here if using Framer Motion
        }
    };

    const roles: {
        id: AccountantRole,
        title: string,
        description: string,
        icon: string,
        color: string,
        path: string,
        locked?: boolean
    }[] = [
            // --- ALL STAFF ROLES NOW LAND AT THE BURSAR HUB ---
            // The Layout and Sidebar will handle the specific view filtering.
            {
                id: 'Registrar',
                title: 'Registrar',
                description: 'Manage admissions, enrollments, and student academic records.',
                icon: '📋',
                color: portalBranding.primaryColor || '#8b5cf6', // violet-600
                path: '/bursar',
                locked: true
            },
            {
                id: 'School News Coordinator',
                title: 'News Coordinator',
                description: 'Post and manage school announcements and news updates.',
                icon: '📰',
                color: portalBranding.primaryColor || '#f59e0b', // amber-500
                path: '/bursar'
            },
            {
                id: 'Director',
                title: 'Director',
                description: 'Executive oversight, financial reports, and global monitoring.',
                icon: '👔',
                color: portalBranding.primaryColor || '#0f172a', // slate-900
                path: '/bursar'
            },
            {
                id: 'Bursar',
                title: 'Bursar',
                description: 'Manage fees, payments, student balances, and admissions.',
                icon: '💰',
                color: portalBranding.primaryColor || '#2563eb', // blue-600
                path: '/bursar'
            },
            {
                id: 'Expense Manager',
                title: 'Expense Manager',
                description: 'Handle requisitions, track expenses, and manage budgets.',
                icon: '📉',
                color: portalBranding.primaryColor || '#dc2626', // red-600
                path: '/bursar'
            },
            {
                id: 'Estate Manager',
                title: 'Estate Manager',
                description: 'Track inventory, assets, and general school maintenance settings.',
                icon: '🏢',
                color: portalBranding.primaryColor || '#16a34a', // green-600
                path: '/bursar'
            }
        ];

    const handleRoleClick = (role: typeof roles[0]) => {
        // --- DEVELOPMENT PROTECTOR ---
        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (role.locked && !isLocalhost) {
            alert("This role is currently under development. Please check back soon!");
            return;
        }

        const account = staffAccounts.find(acc => acc.role === role.id);
        if (!account) {
            alert(`⚠️ ACCESS DENIED: No staff account is currently linked to the "${role.title}" role. \n\nPlease contact the school administrator.`);
            return;
        }

        setSelectingRole(role);
        setPassword("");
        setError("");
        setIsForgot(false);
    };

    // SECURITY GATE: If Institution is Pending, block all role selections
    if (schoolProfile.status === 'Pending') {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-white font-sans selection:bg-blue-500/30">
                <div className="max-w-xl w-full text-center space-y-10 animate-in fade-in zoom-in duration-1000">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-8 bg-blue-600/10 blur-[60px] rounded-full animate-pulse transition-all duration-1000"></div>
                        <div className="relative w-32 h-32 bg-slate-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center text-blue-500 shadow-2xl group-hover:scale-105 transition-transform">
                            <RefreshCw size={56} className="animate-spin-slow opacity-80" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-tight">
                            Awaiting Developer Approval
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
                            Institutional verification for <span className="text-white">"{schoolProfile.name}"</span> in progress
                        </p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ShieldCheck size={120} />
                        </div>
                        <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
                            Welcome! Your school registration has been received. Our developer team is currently validating your institutional credentials to ensure platform security.
                        </p>
                        <div className="flex items-center gap-4 pt-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Network Status: Validation Queue</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.03] transition-all shadow-xl shadow-white/10"
                        >
                            <RefreshCw size={16} className="inline mr-2" /> Refresh Status
                        </button>
                        <button
                            onClick={() => { logout(); router.push('/'); }}
                            className="flex-1 bg-white/5 border border-white/10 text-white/50 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all"
                        >
                            Sign Out
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter max-w-sm mx-auto">
                        Once approved, you will gain full access to the Bursar, Registrar, and Director dashboards.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back to Landing Tab */}
            <div className="absolute top-8 left-8 z-[100]">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-full text-slate-500 hover:text-slate-900 hover:bg-white hover:border-slate-300 transition-all group shadow-sm active:scale-95"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Return to Website</span>
                </button>
            </div>

            <div className={styles.content}>
                <div className="flex flex-col items-center mb-16 animate-in fade-in slide-in-from-top-6 duration-1000">
                    <div className="relative mb-8 group">
                        {portalBranding.logo ? (
                            <div className="w-24 h-24 bg-white border border-slate-200 p-4 rounded-[2rem] shadow-xl group-hover:scale-110 transition-transform duration-500">
                                <img src={portalBranding.logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-xl">
                                <ShieldCheck size={40} />
                            </div>
                        )}
                        <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter text-center mb-4 leading-tight">
                        {portalBranding.schoolName}
                    </h1>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-6 opacity-60" />
                    <p className="text-slate-500 font-bold text-center uppercase tracking-[0.4em] text-[10px] sm:text-xs opacity-80 max-w-md">
                        {portalBranding.tagline || "Institutional Access Management"}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 max-w-6xl mx-auto">
                    {roles.map((role) => {
                        const account = staffAccounts.find(acc => acc.role === role.id);
                        const displayName = (account && account.name && account.name.trim() !== "")
                            ? account.name
                            : `MR. ${role.title.toUpperCase()}`;

                        return (
                            <button
                                key={role.id}
                                className={`group relative bg-white border border-slate-200 p-8 rounded-[2.5rem] text-left transition-all duration-500 flex flex-col items-start shadow-sm hover:shadow-2xl hover:-translate-y-2 overflow-hidden ${role.locked ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                onClick={() => handleRoleClick(role)}
                            >
                                {/* Subtle Hover Color Strip */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: role.color }}
                                />

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-2xl transition-all duration-500 group-hover:scale-110 shadow-sm"
                                    style={{ backgroundColor: `${role.color}10`, border: `1px solid ${role.color}20`, color: role.color }}>
                                    {role.icon}
                                </div>

                                <div className="space-y-1 mb-6">
                                    <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">
                                        {role.title}
                                    </h3>
                                    <p className="text-[10px] uppercase font-black tracking-[0.15em] opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: role.color }}>
                                        {displayName}
                                    </p>
                                </div>

                                <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow">
                                    {role.description}
                                </p>

                                <div className="w-full flex items-center justify-between pt-5 border-t border-slate-100">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
                                        {role.locked ? 'Under Development' : 'Staff Access'}
                                    </span>
                                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all group-hover:bg-slate-900 group-hover:text-white text-slate-400 shadow-sm">
                                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* AUTH MODAL */}
            {selectingRole && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-[420px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.1)] relative animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="p-10 text-center relative border-b border-slate-100 bg-slate-50/50">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-white border border-slate-200 mb-6 text-3xl overflow-hidden shadow-sm relative z-10">
                                {portalBranding.logo ? (
                                    <img src={portalBranding.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                                ) : (
                                    selectingRole.icon
                                )}
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight tracking-tight">
                                {portalBranding.schoolName}
                            </h2>
                            <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-full inline-flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectingRole.color }} />
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.1em]">
                                    {selectingRole.title}
                                </p>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-10 pt-8">
                            {!isForgot ? (
                                <form onSubmit={handleLogin}>
                                    <div className="mb-8">
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Identity Verification: {
                                                    (() => {
                                                        const acc = staffAccounts.find(a => a.role === selectingRole.id);
                                                        return (acc && acc.name && acc.name.trim() !== "") ? acc.name : `MR. ${selectingRole.title.toUpperCase()}`;
                                                    })()
                                                }
                                            </label>
                                        </div>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within/input:text-slate-900 transition-colors">
                                                <Lock size={20} />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                autoFocus
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 pl-14 pr-14 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono text-lg tracking-[0.2em]"
                                                placeholder="••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-slate-900 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {error && (
                                            <p className="mt-3 text-[11px] font-bold text-rose-600 flex items-center gap-2 px-1 animate-in slide-in-from-top-1">
                                                <AlertCircle size={14} />
                                                {error}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                                        >
                                            <ShieldCheck size={20} />
                                            Open Portal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectingRole(null)}
                                            className="w-full bg-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900 font-bold py-4 rounded-2xl transition-all text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsForgot(true)}
                                        className="w-full mt-8 text-[10px] text-slate-400 hover:text-slate-600 transition-colors text-center font-black uppercase tracking-widest underline underline-offset-4"
                                    >
                                        Forgotten credentials?
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-900 mb-6 border border-slate-200">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight text-center">Security Assistance</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed mb-8 px-4 font-medium italic">
                                        "For institutional security, credential recovery must be performed manually by the IT department."
                                        <br /><br />
                                        Please contact administration for support.
                                    </p>
                                    <button
                                        onClick={() => setIsForgot(false)}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-2xl transition-all uppercase tracking-widest text-xs"
                                    >
                                        Return to Identity
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
