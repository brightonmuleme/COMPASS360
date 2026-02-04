"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import { useSchoolData } from '@/lib/store';

// Define Allowed Routes for each Role
const ROLE_ACCESS: Record<string, string[]> = {
    'Registrar': ['/admin/admissions', '/admin/enrollment', '/admin/results', '/admin/activity', '/admin/calendar', '/admin/profile'],
    'School News Coordinator': ['/admin/news'],
    'Director': ['/admin/dashboard', '/bursar'] // Director access
};

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { activeRole, hydrated, studentProfile, tutorProfile } = useSchoolData();
    const pathname = usePathname();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
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
            // Trigger custom event for same-tab reactivity
            window.dispatchEvent(new Event('admin_force_desktop_change'));
        }
    }, [forceDesktop]);

    useEffect(() => {
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

    // 2. Security: Redirect students away from Admin Portal
    useEffect(() => {
        const isLoggedStudent = studentProfile?.id && studentProfile.id !== 'std_user_1';
        if (isClient && hydrated && isLoggedStudent && !activeRole && !tutorProfile) {
            router.replace('/student');
        }
    }, [isClient, hydrated, studentProfile, activeRole, tutorProfile, router]);

    // --- RENDER GUARDS (Must be after all hooks) ---

    // Prevent hydration mismatch
    if (!isClient || !hydrated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-200 mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    // Security Check
    if (!activeRole || !ROLE_ACCESS[activeRole]) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
                Redirecting to Master Portal...
            </div>
        );
    }

    // Check if current path is allowed for the active role
    const allowedPrefixes = ROLE_ACCESS[activeRole] || [];
    const isAllowed = allowedPrefixes.some(prefix => pathname.startsWith(prefix));

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-8 text-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
                    <p className="text-slate-500 mb-4">Your current role does not have permission to view this page.</p>
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
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                    <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
                </button>
                <div className="font-bold text-gray-800">VINE <span className="text-blue-600">Admin</span></div>
                <button
                    onClick={() => setForceDesktop(!forceDesktop)}
                    className={`p-2 rounded-lg text-xs font-bold transition ${forceDesktop ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    {forceDesktop ? 'DESKTOP' : 'MOBILE'}
                </button>
            </header>

            {/* Desktop Force View Toggle (Floating in header area) */}
            <div className="hidden md:block fixed top-4 right-8 z-50">
                <button
                    onClick={() => setForceDesktop(!forceDesktop)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm border transition-all ${forceDesktop
                        ? 'bg-blue-600 border-blue-700 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    FORCE DESKTOP VIEW: {forceDesktop ? 'ON' : 'OFF'}
                </button>
            </div>

            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={`flex-1 transition-all duration-300 font-sans ${forceDesktop ? 'min-w-[1200px]' : ''} md:ml-[250px] p-4 md:p-8`}>
                {children}
            </main>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
