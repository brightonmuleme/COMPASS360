"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BursarSidebar from "@/components/bursar/Sidebar";
import { useSchoolData } from '@/lib/store';

// Define Allowed Routes for each Role
const ROLE_ACCESS: Record<string, string[]> = {
    'Registrar': ['/admin/admissions', '/admin/enrollment', '/admin/results', '/admin/activity', '/admin/calendar', '/admin/profile'],
    'School News Coordinator': ['/admin/news'],
    'Director': ['/admin/dashboard', '/admin/recovery', '/bursar/learners', '/bursar/services', '/bursar/approvals', '/bursar/results', '/bursar'] // Director access
};

// Global flag to prevent flashing loading state during layout swaps
let portalAlreadyMounted = false;

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { activeRole, hydrated, studentProfile, tutorProfile } = useSchoolData();
    const pathname = usePathname();
    const router = useRouter();
    const [isClient, setIsClient] = useState(() => (typeof window !== 'undefined' && portalAlreadyMounted));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [forceDesktop, setForceDesktop] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('admin_force_desktop') === 'true';
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin_force_desktop', String(forceDesktop));
            window.dispatchEvent(new Event('admin_force_desktop_change'));
        }
    }, [forceDesktop]);

    useEffect(() => {
        portalAlreadyMounted = true;
        setIsClient(true);
    }, []);

    // 1. Redirect to /portal if no role or invalid role
    useEffect(() => {
        if (hydrated && isClient) {
            if (!activeRole || !ROLE_ACCESS[activeRole]) {
                router.replace('/portal');
            }
        }
    }, [activeRole, hydrated, isClient, router]);

    // 2. Security: Students and other roles are handled by the activeRole check above.
    useEffect(() => {
        // Redirection is now primarily handled by activeRole logic
    }, [isClient, hydrated, studentProfile, activeRole, tutorProfile, router]);

    // --- RENDER GUARDS (Must be after all hooks) ---

    // Prevent hydration mismatch
    if (!isClient || !hydrated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-slate-900 mb-4 border border-white/5"></div>
                    <div className="h-4 w-32 bg-slate-900 rounded border border-white/5"></div>
                </div>
            </div>
        );
    }

    // Security Check
    if (!activeRole || !ROLE_ACCESS[activeRole]) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-500">
                Redirecting to Master Portal...
            </div>
        );
    }

    // Check if current path is allowed for the active role
    const allowedPrefixes = ROLE_ACCESS[activeRole] || [];
    const isAllowed = allowedPrefixes.some(prefix => pathname.startsWith(prefix));

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-8 text-center text-white">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
                    <p className="text-slate-400 mb-4">Your current role does not have permission to view this page.</p>
                    <button
                        onClick={() => router.replace('/portal')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
                    >
                        Return to Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950 flex-col md:flex-row text-white overflow-x-hidden">
            <BursarSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col md:ml-[260px] min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between px-4 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white shadow-lg">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-slate-400 hover:bg-slate-900 rounded-lg transition"
                    >
                        <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
                    </button>
                    <div className="font-bold text-white">VINE <span className="text-blue-500">Admin</span></div>
                    <button
                        onClick={() => setForceDesktop(!forceDesktop)}
                        className={`p-2 rounded-lg text-xs font-bold transition ${forceDesktop ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                    >
                        {forceDesktop ? 'DESKTOP' : 'MOBILE'}
                    </button>
                </header>

                {/* Desktop Force View Toggle (Floating in header area) */}
                <div className="hidden md:block fixed top-4 right-8 z-50">
                    <button
                        onClick={() => setForceDesktop(!forceDesktop)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg border transition-all ${forceDesktop
                            ? 'bg-blue-600 border-blue-700 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        FORCE DESKTOP VIEW: {forceDesktop ? 'ON' : 'OFF'}
                    </button>
                </div>

                <main className={`flex-1 transition-all duration-300 font-sans ${forceDesktop ? 'min-w-[1200px]' : ''} p-3 pt-20 md:pt-8 md:p-8 overflow-x-hidden w-full max-w-full`}>
                    {children}
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
