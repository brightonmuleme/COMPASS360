"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSchoolData } from "@/lib/store";
import {
    LayoutDashboard,
    BookOpen,
    GraduationCap,
    Users,
    Wallet,
    Newspaper,
    Heart,
    Calendar,
    LogOut,
    Menu
} from "lucide-react";

interface StudentSidebarProps {
    className?: string;
    onMobileClose?: () => void;
}

export function StudentSidebar({ className = "", onMobileClose }: StudentSidebarProps) {
    const { studentProfile, students, logout, schoolProfile } = useSchoolData();
    const router = useRouter();
    const pathname = usePathname();
    const [showLockedModal, setShowLockedModal] = useState(false);
    const [lockedFeatureLabel, setLockedFeatureLabel] = useState("");

    const handleLockedClick = (label: string) => {
        setLockedFeatureLabel(label);
        setShowLockedModal(true);
    };

    const confirmUnlock = () => {
        router.push('/student/profile');
        setShowLockedModal(false);
        if (onMobileClose) onMobileClose();
    };

    const handleNavClick = () => {
        if (onMobileClose) onMobileClose();
    };

    const appName = schoolProfile?.name || "COMPASS 360";

    // 1. Bursar Link: Has linked a real school record
    const isBursarLinked = !!studentProfile.linkedStudentCode;
    const linkedStudent = isBursarLinked
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    // 2. Registrar Enrollment: Verified student record from registrar
    const isRegistrarEnrolled = isBursarLinked && linkedStudent?.origin === 'registrar';

    // Helper for visual status
    const isGuest = studentProfile?.payCode?.startsWith('GUEST-') || !studentProfile?.payCode;

    const navItems = [
        { href: "/student", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/student/resources", icon: BookOpen, label: "Resource Center" },
        { href: "/student/news", icon: Newspaper, label: "News & Suggestions", locked: !isBursarLinked },
        { href: "/student/calendar", icon: Calendar, label: "Schedule", locked: !isRegistrarEnrolled },
        { href: "/student/liked", icon: Heart, label: "Liked Content" },
        { href: "/student/results", icon: GraduationCap, label: "Results", locked: !isRegistrarEnrolled },
        { href: "/student/tutors", icon: Users, label: "My Tutors" },
        { href: "/student/fees", icon: Wallet, label: "Fees & Payments", locked: !isBursarLinked },
        { href: "/student/profile", icon: Users, label: "My Profile" },
    ];

    return (
        <aside className={`w-[260px] h-screen fixed left-0 top-0 bg-[#181818] border-r border-gray-800 flex flex-col p-6 z-50 ${className}`}>
            <div className="mb-8 pl-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate" title={appName}>
                    <span className="truncate max-w-[140px]">{appName}</span>
                    <span className="text-[10px] uppercase border border-gray-700 bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full">{isGuest ? 'Guest' : 'Student'}</span>
                </h2>
            </div>

            <nav className="flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return item.locked ? (
                        <div
                            key={item.href}
                            role="button"
                            tabIndex={0}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 font-medium transition-all opacity-50 cursor-not-allowed hover:bg-white/5`}
                            onClick={() => handleLockedClick(item.label)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleLockedClick(item.label);
                                }
                            }}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                            <span className="ml-auto text-[10px]">🔒</span>
                        </div>
                    ) : (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavClick}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${isActive
                                ? "bg-blue-600/10 text-blue-500"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="pt-4 border-t border-gray-800 mt-auto">
                <button
                    onClick={() => {
                        logout();
                        window.location.href = '/';
                    }}
                    className="flex items-center gap-3 px-3 py-2 w-full text-left text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm"
                >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>

            {/* Custom Locked Feature Modal */}
            {showLockedModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#181818] border border-gray-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl skew-y-0 transform transition-all">
                        <div className="flex items-center gap-3 mb-4 text-amber-500">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <LogOut className="rotate-180" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Feature Locked</h3>
                        </div>

                        <p className="text-gray-300 mb-6 leading-relaxed">
                            <strong className="text-white">{lockedFeatureLabel}</strong> requires a verified school record.
                            Link your <strong>Pay Code</strong> in your profile to unlock this feature immediately.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLockedModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUnlock}
                                className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Unlock Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
