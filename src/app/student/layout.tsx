"use client";
import { StudentSidebar } from "@/components/student/Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#111] text-white">
            {/* Desktop Sidebar (Fixed Left) - Hidden on Mobile */}
            <StudentSidebar className="hidden md:flex" />

            {/* Mobile Header (Fixed Top) - Visible only on Mobile */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#181818] border-b border-gray-800 z-40 flex items-center justify-between px-4 shadow-md bg-opacity-90 backdrop-blur-sm">
                <div className="font-bold text-white text-lg tracking-wider">VINE Portal</div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={28} />
                </button>
            </div>

            {/* Mobile Sidebar Overlay Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sidebar Instance for Mobile */}
                    {/* It already has fixed positioning, so we just render it. 
                        We add 'shadow-2xl' for depth. 
                    */}
                    <StudentSidebar
                        className="flex shadow-2xl animate-slide-in-left"
                        onMobileClose={() => setIsMobileMenuOpen(false)}
                    />
                </div>
            )}

            {/* Main Content Area 
                - ml-0 on mobile (no sidebar space reserved)
                - ml-[260px] on desktop (sidebar space reserved)
                - pt-20 on mobile (to clear the fixed header)
                - pt-0 on desktop (no top header)
            */}
            <main className="flex-1 ml-0 md:ml-[260px] transition-all duration-300">
                <div className="pt-20 md:pt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
