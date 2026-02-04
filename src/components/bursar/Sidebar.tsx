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
    const { activeRole, setActiveRole, schoolProfile, logout } = useSchoolData();
    const [showChangePassword, setShowChangePassword] = useState(false);

    const isActive = (path: string) => pathname === path;

    const handleSwitchRole = () => {
        window.location.href = '/portal';
    };

    const handleClose = () => onClose && onClose();

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
                <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '1rem' }}>
                    <div>
                        COMPASS 360 <span>{activeRole === 'Bursar' ? 'Bursar' : activeRole === 'Expense Manager' ? 'Finance' : activeRole === 'Estate Manager' ? 'Estate' : 'Admin'}</span>
                    </div>
                    {schoolProfile?.logo && (
                        <img
                            src={schoolProfile.logo}
                            alt="School Logo"
                            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                    )}
                </div>

                <nav className={styles.nav}>
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

                            <div style={{ padding: '1rem 0 0.5rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>SYSTEM VIEW</div>

                            <Link href="/bursar/approvals/stats" className={`${styles.link} ${isActive('/bursar/approvals/stats') ? styles.active : ''}`} onClick={handleClose}>
                                Financial Stats
                            </Link>
                            <Link href="/bursar/results" className={`${styles.link} ${isActive('/bursar/results') ? styles.active : ''}`} onClick={handleClose}>
                                Academic Results
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
                                    onClick={handleSwitchRole}
                                >
                                    Switch Role
                                </div>
                                <div
                                    className="text-[10px] text-green-300 hover:text-white cursor-pointer underline"
                                    onClick={() => setShowChangePassword(true)}
                                >
                                    Change Password
                                </div>
                                <div
                                    className="text-[10px] text-red-400 hover:text-white cursor-pointer underline"
                                    onClick={() => {
                                        logout();
                                        window.location.href = '/';
                                    }}
                                >
                                    Log Out
                                </div>
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
