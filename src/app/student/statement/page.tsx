"use client";
import React from 'react';
import { useSchoolData } from "@/lib/store";
import { LearnerAccountCore } from "@/components/bursar/LearnerAccountModal";
import { ShieldCheck, Receipt } from "lucide-react";

export default function StudentStatementPage() {
    const {
        studentProfile,
        students
    } = useSchoolData();

    // 1. Identify the linked student
    const linkedStudent = studentProfile?.linkedStudentCode
        ? students.find(s => s.payCode === studentProfile.linkedStudentCode)
        : null;

    if (!linkedStudent) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in text-gray-100 bg-[#0a0a0a]">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldCheck size={48} className="text-red-500" />
                </div>
                <h1 className="text-4xl font-black mb-4 tracking-tight">Identity Required</h1>
                <p className="text-gray-400 mb-8 max-w-md text-lg leading-relaxed">
                    Financial records are protected by institutional privacy.
                    Please link your Compass ID in your profile to view your statement.
                </p>
                <a
                    href="/student/profile"
                    className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-red-700 transition-all flex items-center gap-2 shadow-xl shadow-red-900/20 active:scale-95 uppercase tracking-widest text-sm"
                >
                    Verify My Identity
                </a>
            </div>
        );
    }

    // 2. Subscription Guard for Financial Statement
    const hasActivePass = studentProfile.subscriptionStatus === 'active';

    if (!hasActivePass) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in text-gray-100 bg-[#050505]">
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-blue-600/20 blur-[80px] rounded-full"></div>
                    <div className="relative w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/20 blur-xl"></div>
                        <ShieldCheck size={64} className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>
                </div>

                <h1 className="text-5xl font-black mb-6 tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">Statement Locked</h1>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10 max-w-lg backdrop-blur-md">
                    <p className="text-gray-400 text-lg leading-relaxed font-medium">
                        Your institution's financial ledger is part of our <span className="text-blue-400 font-bold uppercase tracking-wider text-sm italic">Premium Portal Suite</span>.
                        An active <span className="text-white font-black">App Pass</span> is required to view transaction history and clearance statuses.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <a
                        href="/student/plans"
                        className="flex-1 bg-blue-600 text-white px-8 py-5 rounded-2xl font-black hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest text-xs"
                    >
                        Renew App Pass
                    </a>
                    <a
                        href="/student"
                        className="flex-1 bg-white/5 text-gray-400 px-8 py-5 rounded-2xl font-black hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-xs"
                    >
                        Back to Dashboard
                    </a>
                </div>

                <div className="mt-16 flex items-center gap-6 opacity-30 grayscale">
                    <div className="h-px w-12 bg-white/20"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Grade Security</p>
                    <div className="h-px w-12 bg-white/20"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen bg-[#050505] text-gray-100">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter mb-2">Institutional Ledger</h1>
                        <p className="text-gray-500 flex items-center gap-2 uppercase tracking-widest text-[10px] font-black">
                            Official Bursar Record <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Verified
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                        <Receipt size={24} className="text-blue-500" />
                        <div className="text-right">
                            <div className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">Status</div>
                            <div className="text-sm font-black text-blue-400">SYNCED</div>
                        </div>
                    </div>
                </div>

                <LearnerAccountCore
                    studentId={linkedStudent.id}
                    mode="student"
                    isPage={true}
                />

                <footer className="mt-12 text-center text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">
                    This statement is generated directly from the Bursar's internal ledger.
                    Any discrepancies should be reported to the Finance Department.
                </footer>
            </div>
        </div>
    );
}
