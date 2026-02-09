"use client";

import { useSchoolData, TutorContent, Tutor, formatMoney } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import {
    ChevronLeft,
    CheckCircle,
    ShieldCheck,
    Zap,
    AlertCircle,
    Lock,
    X,
    Heart,
    FileText,
    Play,
    ShoppingBag
} from "lucide-react";
import SharedContentLibrary from "@/components/shared/SharedContentLibrary";

export default function TutorProfilePage() {
    const params = useParams();
    const router = useRouter();
    const tutorId = params.id as string;

    const {
        tutors,
        publishedTutorContents,
        studentProfile,
        students,
        subscribeToTutor,
        developerProfile
    } = useSchoolData();

    const [purchasingTutorId, setPurchasingTutorId] = useState<string | null>(null);

    const tutor = useMemo(() => tutors.find(t => t.id === tutorId), [tutors, tutorId]);

    const linkedStudent = useMemo(() => {
        if (!studentProfile.linkedStudentCode) return null;
        return students.find(s => s.payCode === studentProfile.linkedStudentCode);
    }, [students, studentProfile.linkedStudentCode]);

    const SYSTEM_TUTOR_IDS = useMemo(() => ['system', 'admin_main', developerProfile?.id].filter(Boolean) as string[], [developerProfile]);

    const checkTutorAccess = (tid: string) => {
        if (SYSTEM_TUTOR_IDS.includes(tid)) return true;
        if (!linkedStudent) return false;

        const hasFinancialSub = linkedStudent.tutorSubscriptions?.some(sub =>
            sub.tutorId === tid &&
            sub.status === 'Active' &&
            new Date(sub.expiryDate) > new Date()
        );
        return hasFinancialSub || studentProfile.subscribedTutorIds.includes(tid);
    };

    const hasAccess = checkTutorAccess(tutorId);

    // Calculate days remaining if active
    const daysRemaining = useMemo(() => {
        if (!linkedStudent?.tutorSubscriptions) return 0;
        const sub = linkedStudent.tutorSubscriptions.find(s => s.tutorId === tutorId && s.status === 'Active');
        if (!sub) return 0;
        const diff = new Date(sub.expiryDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    }, [linkedStudent, tutorId]);

    if (!tutor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#111]">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-black text-white/20 uppercase tracking-[0.5em]">Tutor Not Found</h2>
                    <button onClick={() => router.back()} className="text-blue-500 font-black text-xs uppercase tracking-widest">Return to Safety</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans animate-fade-in">
            {/* CINEMATIC BRAND HEADER */}
            <div className="h-[25vh] md:h-[45vh] bg-gradient-to-br from-blue-900 via-indigo-950 to-black relative">
                {/* Back Navigation */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-8 left-8 z-30 bg-black/40 backdrop-blur-md p-3 md:p-4 rounded-full text-white border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 group"
                >
                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden md:block text-[10px] font-black uppercase tracking-widest pr-2">Back to Explorer</span>
                </button>

                {hasAccess && (
                    <div className="absolute top-8 right-8 z-30 bg-white text-black px-4 md:px-6 py-2 rounded-full shadow-2xl scale-90 md:scale-100 flex items-center gap-3">
                        <ShieldCheck size={16} className="text-blue-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                            {daysRemaining} Days Remaining
                        </p>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90" />

                <div className="absolute bottom-[-2rem] md:bottom-[-3rem] left-6 md:left-12 flex items-end gap-6 md:gap-12 w-full">
                    <div className="w-24 h-24 md:w-56 md:h-56 rounded-[2rem] md:rounded-[4rem] bg-blue-600 border-[8px] border-[#0a0a0a] flex items-center justify-center text-4xl md:text-8xl font-black text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] shrink-0">
                        {tutor.name.charAt(0)}
                    </div>
                    <div className="mb-6 md:mb-12 flex-1 pr-8">
                        <h1 className="text-2xl md:text-8xl font-black text-white tracking-tighter flex items-center gap-2 md:gap-6">
                            {tutor.name}
                            <CheckCircle size={32} className="text-blue-500 hidden md:block" />
                        </h1>
                        <p className="text-gray-500 font-black uppercase tracking-[0.2em] md:tracking-[0.5em] text-[8px] md:text-sm mt-1 md:mt-4">
                            {tutor.department || 'Elite Creator'} • Verified Faculty
                        </p>
                    </div>
                </div>
            </div>

            {/* MAIN PROFILE AREA */}
            <div className="px-6 md:px-12 pt-20 md:pt-36 max-w-7xl mx-auto space-y-16 md:space-y-24 pb-32">

                {/* Stats & CTA Row */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
                    <div className="max-w-3xl space-y-8 md:space-y-12">
                        <p className="text-gray-400 text-lg md:text-3xl font-medium leading-[1.1] tracking-tight">
                            {tutor.bio || 'Pioneering educational excellence through digital mastery and academic guidance.'}
                        </p>
                        <div className="flex gap-8 md:gap-16 text-[9px] md:text-[12px] font-black uppercase tracking-[0.3em] text-gray-500">
                            <div><span className="text-white text-xl md:text-2xl block mb-2">{tutor.stats?.subscribers.toLocaleString() || 0}</span> Active Learners</div>
                            <div><span className="text-white text-xl md:text-2xl block mb-2">{tutor.stats?.uploads.toLocaleString() || 0}</span> Total Resources</div>
                            <div className="hidden sm:block"><span className="text-white text-xl md:text-2xl block mb-2">9.8/10</span> User Rating</div>
                        </div>
                    </div>

                    {!hasAccess && (
                        <div className="w-full lg:w-[400px] shrink-0 bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] rounded-full" />
                            <div className="relative z-10 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white tracking-tighter">Unlimited Access</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Subscription Required</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-3xl font-black text-white">{formatMoney(tutor.subscriptionPrice || 3500)}</p>
                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{tutor.subscriptionDuration || '6 Months'} Duration</p>
                                </div>
                                <button
                                    onClick={() => setPurchasingTutorId(tutor.id)}
                                    className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.03] active:scale-95 transition-all"
                                >
                                    Get Channel Pass
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT LIBRARY SECTION */}
                <div className="space-y-12">
                    <div className="flex items-center gap-6">
                        <div className="h-8 w-1.5 md:w-2 bg-blue-600 rounded-full" />
                        <h4 className="text-xs md:text-base font-black text-white uppercase tracking-[0.4em]">CHANNEL REPOSITORY</h4>
                    </div>

                    {hasAccess ? (
                        <div className="animate-fade-in">
                            <SharedContentLibrary tutorId={tutor.id} readOnly={true} />
                        </div>
                    ) : (
                        <div className="bg-[#111] border border-white/5 rounded-[3rem] p-12 md:p-24 text-center space-y-10 group hover:border-white/10 transition-all shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform">
                                <Lock size={40} className="text-gray-600" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Library Locked</h4>
                                <p className="text-gray-500 font-medium text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                                    Subscribe to {tutor.name} to unlock over {tutor.stats?.uploads || 20} premium academic guides, clinical videos, and expert study notes.
                                </p>
                            </div>
                            <button
                                onClick={() => setPurchasingTutorId(tutor.id)}
                                className="bg-blue-600 px-12 md:px-16 py-4 md:py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] text-white hover:scale-105 transition-all shadow-xl shadow-blue-900/10"
                            >
                                Unlock Library Now
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* PURCHASE MODAL - PORTED FROM RESOURCES */}
            {purchasingTutorId && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 animate-fade-in backdrop-blur-2xl">
                    {(() => {
                        const t = tutors.find(tt => tt.id === purchasingTutorId);
                        if (!t) return null;
                        const price = t.subscriptionPrice || 3500;
                        const duration = t.subscriptionDuration || '6 Months';
                        const hasFunds = (linkedStudent?.walletBalance || 0) >= price;

                        return (
                            <div className="bg-[#0f0f0f] w-full max-w-lg rounded-[3rem] md:rounded-[3.5rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-scale-in">
                                <div className="p-10 md:p-12 space-y-10">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h3 className="text-3xl font-black text-white tracking-tighter">Purchase Pass</h3>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                                                <ShieldCheck size={14} className="text-blue-500" /> Secure Checkout
                                            </p>
                                        </div>
                                        <button onClick={() => setPurchasingTutorId(null)} className="text-gray-600 hover:text-white transition-colors">
                                            <X size={28} />
                                        </button>
                                    </div>

                                    <div className="bg-gradient-to-br from-[#111] to-black border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                                        <div className="relative z-10 space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black">
                                                    {t.name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-white font-black text-base">{t.name}</div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t.department}</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-white/5 pt-6">
                                                <div>
                                                    <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">Pricing Plan</div>
                                                    <div className="text-3xl font-black text-white">{formatMoney(price)}</div>
                                                </div>
                                                <div className="text-xs text-blue-500 font-black uppercase tracking-widest pb-1">{duration}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Compass Wallet</span>
                                            <span className={`text-sm font-black ${hasFunds ? 'text-white' : 'text-red-500 animate-pulse'}`}>
                                                {formatMoney(linkedStudent?.walletBalance || 0)}
                                            </span>
                                        </div>
                                        {hasFunds ? (
                                            <button
                                                onClick={() => { subscribeToTutor(linkedStudent!.id, purchasingTutorId); setPurchasingTutorId(null); }}
                                                className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
                                            >
                                                Confirm & Activate
                                            </button>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4">
                                                    <AlertCircle size={24} className="text-red-500 shrink-0" />
                                                    <p className="text-[11px] font-bold text-red-500 leading-tight">Insufficient funds. Top up your wallet to continue.</p>
                                                </div>
                                                <Link href="/student/fees" className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:bg-red-700">
                                                    Top Up Wallet <Zap size={16} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
