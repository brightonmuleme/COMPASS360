"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSchoolData } from "@/lib/store";
import styles from "../student/sidebar.module.css";
import { useState } from "react";
import ChangePasswordModal from "../shared/ChangePasswordModal";

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const { activeRole, setActiveRole, schoolProfile } = useSchoolData();
    const [showChangePassword, setShowChangePassword] = useState(false);

    const isActive = (path: string) => pathname === path;

    return (
        <aside className={`${styles.sidebar} fixed md:fixed top-0 left-0 bottom-0 w-[250px] bg-[#1a1c1e] z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className={styles.logo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2">
                    COMPASS 360 <span className="text-blue-400">Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    {schoolProfile?.logo ? (
                        <img src={schoolProfile.logo} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-gray-600" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-100 text-xs font-bold border border-blue-800">
                            {schoolProfile?.name?.charAt(0) || 'V'}
                        </div>
                    )}
                    <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-white">✕</button>
                </div>
            </div>

            <nav className={styles.nav}>
                {activeRole === 'Registrar' && (
                    <>
                        <Link href="/admin/admissions" className={`${styles.link} ${isActive('/admin/admissions') ? styles.active : ''}`}>
                            Admissions
                        </Link>
                        <Link href="/admin/enrollment" className={`${styles.link} ${isActive('/admin/enrollment') ? styles.active : ''}`}>
                            Enrollments
                        </Link>
                        <Link href="/admin/results" className={`${styles.link} ${isActive('/admin/results') ? styles.active : ''}`}>
                            Results
                        </Link>
                        <Link href="/admin/activity" className={`${styles.link} ${isActive('/admin/activity') ? styles.active : ''}`}>
                            Programmes & Time Tables
                        </Link>
                        <Link href="/admin/calendar" className={`${styles.link} ${isActive('/admin/calendar') ? styles.active : ''}`}>
                            Calendar
                        </Link>
                        <Link href="/admin/profile" className={`${styles.link} ${isActive('/admin/profile') ? styles.active : ''}`}>
                            School Profile
                        </Link>
                    </>
                )}

                {activeRole === 'School News Coordinator' && (
                    <>
                        <Link href="/admin/news" className={`${styles.link} ${isActive('/admin/news') ? styles.active : ''}`}>
                            School News
                        </Link>
                    </>
                )}

                {activeRole === 'Director' && (
                    <>
                        <Link href="/admin/dashboard" className={`${styles.link} ${isActive('/admin/dashboard') ? styles.active : ''}`}>
                            Executive Dashboard
                        </Link>
                        <Link href="/bursar/approvals/transactions" className={`${styles.link} ${isActive('/bursar/approvals/transactions') ? styles.active : ''}`}>
                            Transactions Audit
                        </Link>
                        <Link href="/bursar/approvals/requisitions" className={`${styles.link} ${isActive('/bursar/approvals/requisitions') ? styles.active : ''}`}>
                            Requisitions
                        </Link>
                        <Link href="/bursar/expenses" className={`${styles.link} ${isActive('/bursar/expenses') ? styles.active : ''}`}>
                            Expenses View
                        </Link>
                        <Link href="/bursar/budget" className={`${styles.link} ${isActive('/bursar/budget') ? styles.active : ''}`}>
                            Budgets
                        </Link>
                        <Link href="/bursar/approvals/stats" className={`${styles.link} ${isActive('/bursar/approvals/stats') ? styles.active : ''}`}>
                            Financial Stats
                        </Link>
                    </>
                )}

                {activeRole === 'Expense Manager' && (
                    <>
                        <Link href="/bursar/requisitions" className={`${styles.link} ${isActive('/bursar/requisitions') ? styles.active : ''}`}>
                            Requisitions
                        </Link>
                        <Link href="/bursar/transactions" className={`${styles.link} ${isActive('/bursar/transactions') ? styles.active : ''}`}>
                            Transactions
                        </Link>
                        <Link href="/bursar/expenses" className={`${styles.link} ${isActive('/bursar/expenses') ? styles.active : ''}`}>
                            Expenses
                        </Link>
                        <Link href="/bursar/stats" className={`${styles.link} ${isActive('/bursar/stats') ? styles.active : ''}`}>
                            Status
                        </Link>
                    </>
                )}
            </nav>

            <div className={styles.footer}>
                <div className={styles.user}>
                    <div className={styles.avatar}>{activeRole?.[0]}</div>
                    <div className={styles.info}>
                        <div className={styles.name}>{activeRole}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div
                                className="text-[10px] text-blue-300 hover:text-white cursor-pointer underline"
                                onClick={() => {
                                    window.location.href = '/portal';
                                }}
                            >
                                Switch Role
                            </div>
                            <div
                                className="text-[10px] text-green-300 hover:text-white cursor-pointer underline"
                                onClick={() => setShowChangePassword(true)}
                            >
                                Change Password
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showChangePassword && (
                <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
            )}
        </aside>
    );
}
