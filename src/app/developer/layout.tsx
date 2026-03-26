"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import {
    Menu,
    X,
    LayoutDashboard,
    Home,
    CircleDollarSign,
    Palette,
    Library,
    Settings as SettingsIcon,
    Users as UsersIcon,
    School as SchoolIcon,
    Inbox,
    GraduationCap,
    Lock,
    LogOut,
    ChevronRight,
    Search
} from 'lucide-react';

const LINKS = [
    { href: '/developer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/developer/dashboard', label: 'Student Dashboard', icon: Home },
    { href: '/developer/financials', label: 'Financial Center', icon: CircleDollarSign },
    { href: '/developer/content', label: 'Landing Page', icon: Palette },
    { href: '/developer/library', label: 'Content Library', icon: Library },
    { href: '/developer/settings', label: 'Global Settings', icon: SettingsIcon },
    { href: '/developer/users', label: 'User Manager', icon: UsersIcon },
    { href: '/developer/schools', label: 'Schools', icon: SchoolIcon },
    { href: '/developer/applications', label: 'Applications', icon: Inbox },
    { href: '/developer/tutors', label: 'Tutors', icon: GraduationCap },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { developerProfile, hydrated, checkingAccess, logout } = useSchoolData();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (hydrated && !checkingAccess) {
            if (!developerProfile) {
                if (pathname !== '/developer/login') {
                    router.push('/developer/login');
                }
            } else {
                setIsAuthorized(true);
            }
        }
    }, [hydrated, checkingAccess, developerProfile, router, pathname]);

    // Close sidebar on navigation
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    const [emergencyBypass, setEmergencyBypass] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hydrated || checkingAccess) {
                console.warn("🛡️ EMERGENCY BYPASS: Access verification took too long. Forcing layout mount.");
                setEmergencyBypass(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [hydrated, checkingAccess]);

    const isLoginPage = pathname === '/developer/login';

    if (!emergencyBypass && (!hydrated || checkingAccess || (!isAuthorized && !isLoginPage))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="mb-6 relative">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-3xl border border-blue-500/30 flex items-center justify-center mx-auto animate-pulse">
                            <Lock className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">Security Clearance</h2>
                    <p className="mt-2 text-xs font-bold text-neutral-400">Verifying System Identity...</p>
                </div>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[#fcfcfc] text-[#0a0a0a]">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-6 h-16 bg-[#0d0d0d] text-white sticky top-0 z-[60] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">
                        Compass <span className="text-red-500">Dev</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-black">
                        {developerProfile?.name?.[0] || 'M'}
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] md:hidden animate-in fade-in duration-300"
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-[280px] bg-[#0d0d0d] text-white p-8 flex flex-col z-[80] border-right border-white/5
                transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto
                ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="mb-10 hidden md:block group">
                    <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
                        COMPASS <span className="text-red-500 group-hover:text-red-400 transition-colors">DEV</span>
                    </h1>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <span className="w-2 h-[1px] bg-red-500/50"></span>
                        Main Systems Controller
                    </p>
                </div>

                <div className="relative mb-8 md:hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">Navigation</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg">
                            <X className="w-4 h-4 text-white/50" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar -mx-2 px-2">
                    {LINKS.map(link => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`
                                    flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                                    ${isActive
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                        : 'text-neutral-500 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-red-500/70 transition-colors'}`} />
                                    <span className="text-sm font-black tracking-tight uppercase whitespace-nowrap">{link.label}</span>
                                </div>
                                {isActive && <ChevronRight className="w-4 h-4 text-white/40" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-4 group cursor-pointer hover:bg-white/10 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black">
                            {developerProfile?.name?.[0] || 'M'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-white/80 truncate uppercase tracking-tighter">
                                {developerProfile?.name || 'Muleme Brighton'}
                            </p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Systems Admin</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            window.location.href = '/';
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-neutral-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-[#fcfcfc] overflow-y-auto h-[calc(100vh-4rem)] md:h-screen no-scrollbar">
                <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
