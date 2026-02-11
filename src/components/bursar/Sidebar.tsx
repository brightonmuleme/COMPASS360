"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSchoolData } from "@/lib/store";
import styles from "../student/sidebar.module.css";
import { useState } from "react";
import ChangePasswordModal from "../shared/ChangePasswordModal";

export default function BursarSidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { activeRole, setActiveRole, activeAccountId, staffAccounts, schoolProfile, logout, lastCloudSync, isCloudSyncing, pullFromCloud } = useSchoolData();
    const [showChangePassword, setShowChangePassword] = useState(false);

    const activeStaff = staffAccounts.find(a => a.id === activeAccountId);

    const isActive = (path: string) => pathname === path;

    const handleSwitchRole = () => {
        window.location.href = '/portal';
    };

    const handleClose = () => onClose && onClose();

    const renderCommonLinks = () => (
        <Link href="/bursar/my-account" className={`${styles.link} ${isActive('/bursar/my-account') ? styles.active : ''}`} onClick={handleClose}>
            🔒 My Account
        </Link>
    );

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
                    onClick={handleClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-[100] shadow-2xl md:shadow-none`}>
                <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="font-black tracking-tighter text-sm">
                        COMPASS 360 <span className="text-blue-500">{activeRole === 'Bursar' ? 'Bursar' : activeRole === 'Expense Manager' ? 'Finance' : activeRole === 'Estate Manager' ? 'Estate' : 'Admin'}</span>
                    </div>
                    {schoolProfile?.logo && (
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                            <img
                                src={schoolProfile.logo}
                                alt="School Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </div>

                <nav className={styles.nav}>
                    {renderCommonLinks()}
                    <div style={{ margin: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

                    {activeRole === 'Bursar' && (
                        <>
                            <Link href="/bursar" className={`${styles.link} ${isActive('/bursar') ? styles.active : ''}`} onClick={handleClose}>
                                Dashboard
                            </Link>
                            <Link href="/bursar/admissions" className={`${styles.link} ${isActive('/bursar/admissions') ? styles.active : ''}`} onClick={handleClose}>
                                Admissions
                            </Link>
                            <Link href="/bursar/enrollment" className={`${styles.link} ${isActive('/bursar/enrollment') ? styles.active : ''}`} onClick={handleClose}>
                                Enrollments
                            </Link>
                            <Link href="/bursar/learners" className={`${styles.link} ${isActive('/bursar/learners') ? styles.active : ''}`} onClick={handleClose}>
                                Learners Accounts
                            </Link>
                            <Link href="/bursar/services" className={`${styles.link} ${isActive('/bursar/services') ? styles.active : ''}`} onClick={handleClose}>
                                Services, Bursaries & Req.
                            </Link>
                            <Link href="/bursar/fees" className={`${styles.link} ${isActive('/bursar/fees') ? styles.active : ''}`} onClick={handleClose}>
                                Fees Structures & Programmes
                            </Link>
                            <Link href="/bursar/transactions" className={`${styles.link} ${isActive('/bursar/transactions') ? styles.active : ''}`} onClick={handleClose}>
                                Transactions
                            </Link>
                            <Link href="/bursar/payment-modes" className={`${styles.link} ${isActive('/bursar/payment-modes') ? styles.active : ''}`} onClick={handleClose}>
                                Payment Modes
                            </Link>
                            <Link href="/bursar/profile" className={`${styles.link} ${isActive('/bursar/profile') ? styles.active : ''}`} onClick={handleClose}>
                                School Profile
                            </Link>

                        </>
                    )}

                    {activeRole === 'Expense Manager' && (
                        <>
                            <Link href="/bursar" className={`${styles.link} ${isActive('/bursar') ? styles.active : ''}`} onClick={handleClose}>
                                Finance Hub
                            </Link>

                            <Link href="/bursar/requisitions" className={`${styles.link} ${isActive('/bursar/requisitions') ? styles.active : ''}`} onClick={handleClose}>
                                Requisitions
                            </Link>

                            <Link href="/bursar/activity-ledger" className={`${styles.link} ${isActive('/bursar/activity-ledger') ? styles.active : ''}`} onClick={handleClose}>
                                Activity Ledger
                            </Link>

                            <Link href="/bursar/stats" className={`${styles.link} ${isActive('/bursar/stats') ? styles.active : ''}`} onClick={handleClose}>
                                Stats
                            </Link>
                            <Link href="/bursar/settings" className={`${styles.link} ${isActive('/bursar/settings') ? styles.active : ''}`} onClick={handleClose}>
                                Settings
                            </Link>
                        </>
                    )}

                    {activeRole === 'Estate Manager' && (
                        <>
                            <Link href="/bursar" className={`${styles.link} ${isActive('/bursar') ? styles.active : ''}`} onClick={handleClose}>
                                Estate Hub
                            </Link>
                            <Link href="/bursar/inventory" className={`${styles.link} ${isActive('/bursar/inventory') ? styles.active : ''}`} onClick={handleClose}>
                                Inventory List
                            </Link>
                            <Link href="/bursar/transfers" className={`${styles.link} ${isActive('/bursar/transfers') ? styles.active : ''}`} onClick={handleClose}>
                                Transfers
                            </Link>
                        </>
                    )}

                    {activeRole === 'Director' && (
                        <>
                            <Link href="/admin/dashboard" className={`${styles.link} ${isActive('/admin/dashboard') ? styles.active : ''}`} onClick={handleClose}>
                                Executive Dashboard
                            </Link>

                            <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>APPROVAL QUEUES</div>

                            <Link href="/bursar/approvals/requisitions" className={`${styles.link} ${isActive('/bursar/approvals/requisitions') ? styles.active : ''}`} onClick={handleClose}>
                                Requisitions
                            </Link>
                            <Link href="/bursar/approvals/transfers" className={`${styles.link} ${isActive('/bursar/approvals/transfers') ? styles.active : ''}`} onClick={handleClose}>
                                Inventory Transfers
                            </Link>
                            <Link href="/bursar/approvals/transactions" className={`${styles.link} ${isActive('/bursar/approvals/transactions') ? styles.active : ''}`} onClick={handleClose}>
                                Transactions Audit
                            </Link>
                            <Link href="/bursar/approvals/log" className={`${styles.link} ${isActive('/bursar/approvals/log') ? styles.active : ''}`} onClick={handleClose}>
                                Approvals Log
                            </Link>

                            <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>REAL-TIME INTELLIGENCE</div>

                            <Link href="/bursar/learners" className={`${styles.link} ${isActive('/bursar/learners') ? styles.active : ''}`} onClick={handleClose}>
                                Learners Matrix
                            </Link>
                            <Link href="/bursar/services" className={`${styles.link} ${isActive('/bursar/services') ? styles.active : ''}`} onClick={handleClose}>
                                Services & Bursaries
                            </Link>
                            <Link href="/bursar/inventory" className={`${styles.link} ${isActive('/bursar/inventory') ? styles.active : ''}`} onClick={handleClose}>
                                Stock Inventory
                            </Link>

                            <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>SYSTEM VIEW</div>

                            <Link href="/bursar/approvals/stats" className={`${styles.link} ${isActive('/bursar/approvals/stats') ? styles.active : ''}`} onClick={handleClose}>
                                Financial Stats
                            </Link>
                            <Link href="/bursar/results" className={`${styles.link} ${isActive('/bursar/results') ? styles.active : ''}`} onClick={handleClose}>
                                Academic Results
                            </Link>

                            <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>SYSTEM CONFIGURATION</div>

                            <Link href="/bursar/branding" className={`${styles.link} ${isActive('/bursar/branding') ? styles.active : ''}`} onClick={handleClose}>
                                🏛️ Portal Branding
                            </Link>
                        </>
                    )}

                    {activeRole === 'Registrar' && (
                        <>
                            <Link href="/admin/admissions" className={`${styles.link} ${isActive('/admin/admissions') ? styles.active : ''}`} onClick={handleClose}>
                                Admissions
                            </Link>
                            <Link href="/admin/enrollment" className={`${styles.link} ${isActive('/admin/enrollment') ? styles.active : ''}`} onClick={handleClose}>
                                Enrollments
                            </Link>
                            <Link href="/admin/results" className={`${styles.link} ${isActive('/admin/results') ? styles.active : ''}`} onClick={handleClose}>
                                Academic Results
                            </Link>
                            <Link href="/admin/activity" className={`${styles.link} ${isActive('/admin/activity') ? styles.active : ''}`} onClick={handleClose}>
                                Programmes & Time Tables
                            </Link>
                            <Link href="/admin/calendar" className={`${styles.link} ${isActive('/admin/calendar') ? styles.active : ''}`} onClick={handleClose}>
                                Calendar
                            </Link>
                            <Link href="/admin/profile" className={`${styles.link} ${isActive('/admin/profile') ? styles.active : ''}`} onClick={handleClose}>
                                School Profile
                            </Link>
                        </>
                    )}

                    {activeRole === 'School News Coordinator' && (
                        <>
                            <Link href="/admin/news" className={`${styles.link} ${isActive('/admin/news') ? styles.active : ''}`} onClick={handleClose}>
                                School News Updates
                            </Link>
                        </>
                    )}
                </nav>

                <div className={styles.footer} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto' }}>
                    <div className={styles.user} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-lg">
                            {activeStaff?.name?.[0] || activeRole?.[0]}
                        </div>
                        <div className={styles.info}>
                            <div className="text-[12px] font-black tracking-tight text-white leading-tight">
                                {activeStaff?.name || activeRole}
                            </div>
                            <div className="text-[9px] text-blue-400 uppercase font-black tracking-widest mt-0.5 opacity-80">
                                {activeRole}
                            </div>
                            {/* Cloud Sync Status */}
                            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isCloudSyncing ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500'}`} />
                                <div className="flex flex-col">
                                    <span className="text-[7px] text-slate-500 uppercase font-black tracking-tighter">Cloud {isCloudSyncing ? 'Syncing...' : 'Connected'}</span>
                                    {lastCloudSync && <span className="text-[6px] text-slate-600 font-medium">Last: {new Date(lastCloudSync).toLocaleTimeString()}</span>}
                                </div>
                                <button
                                    onClick={() => pullFromCloud(true)}
                                    disabled={isCloudSyncing}
                                    className="ml-auto text-blue-400/60 hover:text-blue-400 disabled:opacity-30"
                                    title="Force Pull from Cloud"
                                >
                                    <svg className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button
                                    className="text-[10px] text-slate-400 hover:text-white transition-colors underline font-medium"
                                    onClick={handleSwitchRole}
                                >
                                    Switch
                                </button>
                                <span className="text-slate-700">|</span>
                                <button
                                    className="text-[10px] text-red-400/80 hover:text-red-400 transition-colors underline font-medium"
                                    onClick={() => {
                                        logout();
                                        window.location.href = '/';
                                    }}
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {showChangePassword && (
                    <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
                )}
            </aside >
        </>
    );
}
