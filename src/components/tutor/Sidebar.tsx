"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../student/sidebar.module.css";
import { useSchoolData } from "@/lib/store";
import { X } from "lucide-react";

interface TutorSidebarProps {
    className?: string;
    onMobileClose?: () => void;
}

export default function TutorSidebar({ className = "", onMobileClose }: TutorSidebarProps) {
    const pathname = usePathname();
    const { setActiveRole, logout } = useSchoolData();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className={`${styles.sidebar} fixed left-0 top-0 bottom-0 w-[250px] !bg-black !border-r-gray-900 !text-gray-400 !shadow-xl !shadow-black/50 !z-50 flex flex-col transition-transform duration-300 ${className}`}>
            {/* Mobile Close Button */}
            <div className="md:hidden absolute top-4 right-4">
                <button onClick={onMobileClose} className="p-2 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <div className={styles.logo}>
                COMPASS 360 <span>Tutor</span>
            </div>

            <nav className={`${styles.nav} flex-1 overflow-y-auto`}>
                <Link href="/tutor" className={`${styles.link} ${isActive('/tutor') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Dashboard
                </Link>
                <Link href="/tutor/content" className={`${styles.link} ${isActive('/tutor/content') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Content Library
                </Link>
                <Link href="/tutor/subscribers" className={`${styles.link} ${isActive('/tutor/subscribers') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Subscribers
                </Link>
                <Link href="/tutor/billing" className={`${styles.link} ${isActive('/tutor/billing') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Billing & Earnings
                </Link>
                <Link href="/tutor/settings" className={`${styles.link} ${isActive('/tutor/settings') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Subscription Settings
                </Link>
                <Link href="/tutor/profile" className={`${styles.link} ${isActive('/tutor/profile') ? styles.active : ''}`} onClick={() => onMobileClose?.()}>
                    Profile
                </Link>
            </nav>

            <div className={styles.footer}>
                <div className={styles.user}>
                    <div className={styles.avatar}>T</div>
                    <div className={styles.info}>
                        <div className={styles.name}>Tutor Portal</div>
                        <div
                            className="text-[10px] text-blue-300 hover:text-white cursor-pointer underline mt-1"
                            onClick={() => {
                                logout();
                                window.location.href = '/';
                            }}
                        >
                            Log Out Entirely
                        </div>
                        <div
                            className="text-[10px] text-zinc-400 hover:text-white cursor-pointer underline mt-1"
                            onClick={() => setActiveRole(null)}
                        >
                            <Link href="/">Switch Portal</Link>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
