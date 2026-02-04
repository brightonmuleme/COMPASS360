"use client";

import { useSchoolData } from "@/lib/store";
import { useEffect, useState } from "react";
import TutorSidebar from "@/components/tutor/Sidebar";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";

function TutorLayoutContent({ children }: { children: React.ReactNode }) {
    const { hydrated, tutorProfile } = useSchoolData();
    const [isClient, setIsClient] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Access Control & Subscription Guard
    useEffect(() => {
        if (!isClient || !hydrated) return;

        if (!tutorProfile) {
            router.replace('/');
            return;
        }

        const isSubscriptionExpired = (tutorProfile.subscriptionDaysLeft ?? 0) <= 0;
        const isAllowedPath = pathname === '/tutor/billing' || pathname === '/tutor/profile';

        if (isSubscriptionExpired && !isAllowedPath) {
            router.replace('/tutor/billing');
        }
    }, [isClient, hydrated, tutorProfile, router, pathname]);

    // Close mobile menu on path change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

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

    if (!tutorProfile) return null;

    return (
        <div className="flex min-h-screen bg-[#050505] text-gray-100 relative">
            {/* Mobile Header Trigger */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-gray-800 z-40 flex items-center px-4">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
                </button>
            </div>

            {/* Unified Sidebar: Mobile Toggle + Desktop Persistent */}
            <TutorSidebar
                className={`
                    fixed inset-y-0 left-0 z-50
                    transform transition-transform duration-300
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                    md:translate-x-0 md:flex
                `}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Overlay for mobile backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area: Adjusted Margins */}
            <main className="flex-1 ml-0 md:ml-[250px] pt-16 md:pt-8 p-4 md:p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}

export default function TutorLayout({ children }: { children: React.ReactNode }) {
    return <TutorLayoutContent>{children}</TutorLayoutContent>;
}
