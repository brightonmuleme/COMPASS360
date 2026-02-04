"use client";
import BursarSidebar from "@/components/bursar/Sidebar";
import RoleSelection from "@/components/bursar/RoleSelection";
import { useSchoolData, SchoolProvider } from "@/lib/store";
import { useEffect, useState } from "react";

export default function BursarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // SchoolProvider is now at RootLayout level
    return <BursarLayoutContent>{children}</BursarLayoutContent>;
}

import { usePathname, useRouter } from "next/navigation";

// ...

function BursarLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const { activeRole, hydrated, studentProfile, tutorProfile } = useSchoolData();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const roleName = activeRole === 'Bursar' ? 'Admin' : activeRole === 'Expense Manager' ? 'Finance' : activeRole === 'Estate Manager' ? 'Estate' : 'Admin';

    useEffect(() => {
        setMounted(true);
    }, []);

    // --- SECURITY: Redirect students away from Bursar Portal ---
    useEffect(() => {
        const isLoggedStudent = studentProfile?.id && studentProfile.id !== 'std_user_1';
        if (mounted && hydrated && isLoggedStudent && !activeRole && !tutorProfile) {
            router.replace('/student');
        }
    }, [mounted, hydrated, studentProfile, activeRole, tutorProfile, router]);

    // --- ACCESS CONTROL LOGIC ---
    useEffect(() => {
        if (!mounted || !hydrated || !activeRole) return;

        const path = pathname || '';

        // 1. EXPENSE MANAGER
        // Can ONLY access: /bursar/requisitions, /bursar/expenses, /bursar/budget
        if (activeRole === 'Expense Manager') {
            const allowed = ['/bursar/requisitions', '/bursar/expenses', '/bursar/budget', '/bursar/activity-ledger', '/bursar/stats', '/bursar/settings'];
            if (!allowed.some(p => path.startsWith(p))) {
                // Redirect to home if trying to access restricted
                router.replace('/bursar/requisitions');
            }
        }

        // 2. ESTATE MANAGER
        // Can ONLY access: /bursar/inventory, /bursar/estate-settings, /bursar/transfers
        if (activeRole === 'Estate Manager') {
            const allowed = ['/bursar/inventory', '/bursar/estate-settings', '/bursar/transfers', '/bursar/activity-ledger'];
            if (!allowed.some(p => path.startsWith(p))) {
                router.replace('/bursar/inventory');
            }
        }

        // 3. BURSAR
        // Can access EVERYTHING EXCEPT the restricted Expense/Estate pages above? 
        // Or explicitly define what they CAN access. 
        // For now, let's restrict them from Expense/Estate pages to be safe.
        if (activeRole === 'Bursar') {
            const restricted = [
                '/bursar/requisitions', '/bursar/expenses', '/bursar/budget',
                '/bursar/inventory', '/bursar/estate-settings', '/bursar/activity-ledger'
            ];
            if (restricted.some(p => path.startsWith(p))) {
                router.replace('/bursar');
            }
        }

    }, [pathname, activeRole, mounted, hydrated, router]);


    if (!mounted || !hydrated) {
        return <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-500">Loading Portal...</div>;
    }

    const bursarRoles = ['Bursar', 'Expense Manager', 'Estate Manager', 'Director'];
    const isAuthorized = activeRole && bursarRoles.includes(activeRole);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-slate-400">
                <div className="text-center">
                    <p className="mb-4">Redirecting to Master Portal...</p>
                    <button
                        onClick={() => router.replace('/portal')}
                        className="text-xs text-blue-400 underline"
                    >
                        Click here if not redirected
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
            <BursarSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col md:ml-[260px] min-w-0">
                {/* Mobile Header Bar - Dark Themed & Functional */}
                <header className="md:hidden flex items-center justify-between px-4 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white shadow-lg">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white tracking-tight text-lg">
                            VINE <span className="text-blue-500">{roleName === 'Admin' ? 'PORTAL' : roleName}</span>
                        </span>
                    </div>

                    {/* Role Tag - Moved to absolute corner for clean mobile UI */}
                    <div className="absolute top-1 right-1">
                        <div className="bg-blue-600/10 text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-blue-600/20 backdrop-blur-sm">
                            {activeRole === 'Estate Manager' ? 'Stock' : 'Admin'}
                        </div>
                    </div>
                </header>

                {/* Swipe Handle for Mobile Sidebar */}
                <div
                    className="md:hidden fixed left-0 top-0 bottom-0 w-4 z-50"
                    onTouchStart={(e) => {
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startY = touch.clientY;

                        const handleMove = (moveEvent: TouchEvent) => {
                            const moveTouch = moveEvent.touches[0];
                            const diffX = moveTouch.clientX - startX;
                            const diffY = Math.abs(moveTouch.clientY - startY);

                            if (diffX > 50 && diffY < 30) {
                                setIsSidebarOpen(true);
                                document.removeEventListener('touchmove', handleMove);
                            }
                        };

                        document.addEventListener('touchmove', handleMove, { passive: true });
                        document.addEventListener('touchend', () => {
                            document.removeEventListener('touchmove', handleMove);
                        }, { once: true });
                    }}
                />


                <main className="flex-1 p-3 pt-20 md:pt-8 md:p-8 overflow-x-hidden w-full max-w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
