"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSchoolData, formatMoney } from "@/lib/store";
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
    Lock,
    ShieldCheck,
    Receipt
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
    const [lockedType, setLockedType] = useState<'verification' | 'subscription'>('verification');
    const [lockedFeatureLabel, setLockedFeatureLabel] = useState("");

    const handleLockedClick = (label: string, type: 'verification' | 'subscription') => {
        setLockedFeatureLabel(label);
        setLockedType(type);
        setShowLockedModal(true);
    };

    const confirmUnlock = () => {
        if (lockedType === 'verification') {
            router.push('/student/profile');
        } else {
            router.push('/student/fees');
        }
        setShowLockedModal(false);
        if (onMobileClose) onMobileClose();
    };

    const handleNavClick = () => {
        if (onMobileClose) onMobileClose();
    };

    const appName = "COMPASS 360"; // Enforced branding

    // 1. Verification Status
    const isBursarLinked = !!studentProfile.linkedStudentCode;
    const linkedStudent = isBursarLinked
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    // 2. Platform Pass Status
    const hasActivePass = studentProfile.subscriptionStatus === 'active';

    const isGuest = !isBursarLinked;

    const navItems = [
        { href: "/student", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/student/resources", icon: BookOpen, label: "Resource Center", subscriptionRequired: true },
        { href: "/student/news", icon: Newspaper, label: "News & Community", verificationRequired: true },
        { href: "/student/calendar", icon: Calendar, label: "Schedule", verificationRequired: true, subscriptionRequired: true },
        { href: "/student/liked", icon: Heart, label: "Saved Items", subscriptionRequired: true },
        { href: "/student/results", icon: GraduationCap, label: "Academics", verificationRequired: true, subscriptionRequired: true },
        { href: "/student/tutors", icon: Users, label: "Tutor Pulse", subscriptionRequired: true },
        { href: "/student/statement", icon: Receipt, label: "Financial Statement", verificationRequired: true, subscriptionRequired: true },
        { href: "/student/fees", icon: Wallet, label: "Wallet & Plans" },
        { href: "/student/profile", icon: Users, label: "Identity" },
    ];

    return (
        <aside className={`w-[260px] h-screen fixed left-0 top-0 bg-[#0d0d0d] border-r border-[#222] flex flex-col p-6 z-50 ${className}`}>
            <div className="mb-8 pl-2">
                <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tighter">
                    <span className="text-red-500">C</span>OMPASS 360
                    <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 rounded-full ${hasActivePass ? 'border-green-500/50 text-green-500 bg-green-500/10' : 'border-red-500/50 text-red-500 bg-red-500/10'}`}>
                        {hasActivePass ? 'Active' : 'Expired'}
                    </span>
                </h2>
            </div>

            <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    // Features like Wallet/Plans and Identity are NEVER locked
                    const isAlwaysOpen = item.label === "Wallet & Plans" || item.label === "Identity" || item.label === "Dashboard";
                    const isLocked = !isAlwaysOpen && ((item.verificationRequired && !isBursarLinked) || (item.subscriptionRequired && !hasActivePass));
                    const lockReason = (item.verificationRequired && !isBursarLinked) ? 'verification' : 'subscription';

                    return isLocked ? (
                        <div
                            key={item.href}
                            role="button"
                            tabIndex={0}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 font-medium transition-all group hover:bg-white/5 cursor-pointer relative`}
                            onClick={() => handleLockedClick(item.label, lockReason)}
                        >
                            <item.icon size={18} className="text-gray-600 transition-colors group-hover:text-gray-400" />
                            <span className="text-sm">{item.label}</span>
                            <Lock size={14} className="ml-auto text-gray-700" />
                        </div>
                    ) : (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavClick}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all group ${isActive
                                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <item.icon size={18} className={`${isActive ? 'text-white' : 'text-gray-500 group-hover:text-red-400'} transition-colors`} />
                            <span className="text-sm">{item.label}</span>
                            {item.label === "Wallet & Plans" && (studentProfile.walletBalance > 0 || linkedStudent?.walletBalance) ? (
                                <span className="ml-auto text-[10px] bg-red-500/10 px-2 py-0.5 rounded-md text-red-500 font-black border border-red-500/20">
                                    {formatMoney(studentProfile.walletBalance || linkedStudent?.walletBalance || 0)}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            <div className="pt-4 border-t border-[#222] mt-auto">
                <button
                    onClick={() => {
                        logout();
                        window.location.href = '/';
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all font-bold text-sm"
                >
                    <LogOut size={18} />
                    <span>Terminate Session</span>
                </button>
            </div>

            {/* Paywall / Auth Modal */}
            {showLockedModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#121212] border border-[#333] p-8 rounded-3xl max-w-sm w-full shadow-2xl skew-x-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Lock size={120} />
                        </div>

                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${lockedType === 'subscription' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {lockedType === 'subscription' ? <ShieldCheck size={32} /> : <Lock size={32} />}
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Access Restricted</h3>

                        <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                            The <strong className="text-white">{lockedFeatureLabel}</strong> portal is reserved for active members.
                            {lockedType === 'verification'
                                ? " Please link your Pay Code to verify your student status."
                                : " You need an active Platform Pass to view this premium content."}
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmUnlock}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${lockedType === 'subscription' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                            >
                                {lockedType === 'verification' ? 'Link Account' : 'Choose Plan'}
                            </button>
                            <button
                                onClick={() => setShowLockedModal(false)}
                                className="w-full py-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
