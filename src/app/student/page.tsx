"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSchoolData, NewsItem, Suggestion, formatMoney } from '@/lib/store';
import { Clock, Zap, ExternalLink, Play, MessageSquare, Lightbulb, Wallet, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

export default function StudentDashboard() {
    const {
        students, adverts, studentProfile, hydrated,
        appUpdates, appOffers, developerSettings,
        schoolProfile, news, suggestions, tutors, developerProfile,
        pullFromCloud, isCloudSyncing
    } = useSchoolData();
    const router = useRouter();

    // The Portal User Profile
    const STUDENT = students.find(s => s.id.toString() === studentProfile?.id) || {
        ...studentProfile,
        id: studentProfile.id,
        name: studentProfile.name,
        subscriptionExpiry: studentProfile.subscriptionExpiry,
        totalFees: 0,
        balance: 0,
        programme: 'Independent Learner',
        level: 'N/A',
        status: 'Active',
        payCode: '',
        compassNumber: 0
    };
    const appName = schoolProfile?.name || "COMPASS 360";

    // Institutional Record Link
    const isLinked = !!studentProfile.linkedStudentCode;
    const linkedStudent = useMemo(() => {
        if (!studentProfile.linkedStudentCode) return null;
        return students.find(s => s.payCode === studentProfile.linkedStudentCode);
    }, [students, studentProfile.linkedStudentCode]);

    // Priority Data: Use linkedStudent (institutional record) if available
    const displayStudent = linkedStudent || STUDENT;

    // ☁️ CLOUD SYNC BRIDGE: Force a pull on mount to resolve Local vs Live discrepancies
    useEffect(() => {
        if (hydrated && studentProfile?.id !== 'std_user_1') {
            console.log("☁️ DASHBOARD: Triggering background cloud pull...");
            pullFromCloud(true);
        }
    }, [hydrated, studentProfile?.id]);

    useEffect(() => {
        // Only redirect if there is absolutely no profile (which shouldn't happen due to store defaults)
        if (hydrated && !studentProfile?.id) {
            router.replace('/');
        }
    }, [studentProfile, hydrated, router]);

    // Unified Expiry Date - Prioritize the institutional record, fallback to cloud profile
    const effectiveExpiry = displayStudent?.subscriptionExpiry || studentProfile.subscriptionExpiry;
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!effectiveExpiry) return;

        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(effectiveExpiry);
            const totalSeconds = Math.floor((expiry.getTime() - now.getTime()) / 1000);

            if (totalSeconds > 0) {
                setTimeLeft({
                    days: Math.floor(totalSeconds / (3600 * 24)),
                    hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
                    minutes: Math.floor((totalSeconds % 3600) / 60),
                    seconds: Math.floor(totalSeconds % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(timerId);
    }, [effectiveExpiry]);

    const SYSTEM_TUTOR_IDS = useMemo(() => ['system', 'admin_main', developerProfile?.id].filter(Boolean) as string[], [developerProfile]);

    const checkTutorAccess = (tutorId: string) => {
        if (SYSTEM_TUTOR_IDS.includes(tutorId)) return true;

        // Priority check for institutional record subs
        const hasFinancialSub = linkedStudent?.tutorSubscriptions?.some(sub =>
            sub.tutorId === tutorId &&
            sub.status === 'Active' &&
            new Date(sub.expiryDate) > new Date()
        );

        const isSelectedSub = studentProfile?.subscribedTutorIds?.includes(tutorId) || false;
        return hasFinancialSub || isSelectedSub;
    };

    const activeTutors = useMemo(() => tutors.filter(t => checkTutorAccess(t.id) && !SYSTEM_TUTOR_IDS.includes(t.id)), [tutors, linkedStudent, studentProfile]);

    if (!STUDENT) return null;

    // Status logic: Platinum if institutional sub is active, Trial if portal sub is trial
    const now = new Date();
    const expiryDate = new Date(effectiveExpiry || 0);
    const isDateActive = expiryDate > now;

    const isActive = isDateActive;
    const isTrial = !isActive && studentProfile.subscriptionStatus === 'trial' && isDateActive;

    // Theme Colors
    const tierGradient = isActive
        ? "bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900"
        : isTrial
            ? "bg-gradient-to-br from-emerald-900 to-teal-900"
            : "bg-gradient-to-br from-gray-900 to-gray-800";

    const tierTitle = isActive ? "PLATINUM MEMBER" : isTrial ? "TRIAL ACCESS" : "MEMBERSHIP EXPIRED";

    const effectiveBalance = (linkedStudent?.walletBalance ?? 0) || (studentProfile.walletBalance ?? 0);

    return (
        <div className="max-w-7xl mx-auto pb-16 p-6 md:p-12 space-y-12 animate-fade-in">

            {/* Header + Quick Wallet */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-white/5">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">Welcome, {(STUDENT.name || 'Student').split(' ')[0]}</h1>
                    <p className="text-gray-500 font-medium mt-2 flex items-center gap-2">
                        {isLinked ? <ShieldCheck size={16} className="text-blue-500" /> : <Clock size={16} className="text-gray-600" />}
                        {isLinked ? `Verified Academic Account • ${schoolProfile?.name}` : 'Independent Learner Account • COMPASS 360'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* SYNC BUTTON */}
                    <button
                        onClick={() => pullFromCloud(true)}
                        disabled={isCloudSyncing}
                        className={`bg-[#111] border border-white/5 px-6 py-4 rounded-2xl flex items-center gap-3 transition-all hover:bg-white/5 ${isCloudSyncing ? 'opacity-50 grayscale' : ''}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isCloudSyncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{isCloudSyncing ? 'Syncing...' : 'Cloud Active'}</span>
                    </button>

                    {(isLinked || effectiveBalance > 0) && (
                        <div className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-8 shadow-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Compass Wallet</p>
                                    <p className="text-2xl font-black text-white">{formatMoney(effectiveBalance)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/student/fees')}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Membership & Active Passes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Premium Card */}
                <div className={`lg:col-span-2 rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden transition-all hover:shadow-blue-500/10 group ${tierGradient}`}>
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 blur-[100px] rounded-full" />

                    <div className="flex-1 z-10">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                            <CheckCircle size={14} /> Subscription Status
                        </div>
                        <h2 className="text-5xl font-black text-white mb-6">
                            {tierTitle}
                        </h2>

                        <div className="flex items-center gap-10">
                            <div>
                                <div className="text-4xl font-black text-white">{timeLeft.days}</div>
                                <div className="text-[10px] uppercase text-white/40 font-black tracking-widest mt-1">Days Left</div>
                            </div>
                            <div className="h-12 w-px bg-white/10"></div>
                            <div>
                                <div className="text-4xl font-black text-white">{timeLeft.hours}</div>
                                <div className="text-[10px] uppercase text-white/40 font-black tracking-widest mt-1">Hours</div>
                            </div>
                        </div>
                    </div>

                    <div className="z-10 w-full md:w-auto space-y-4">
                        <button
                            onClick={() => router.push('/student/fees')}
                            className="w-full md:w-auto bg-white text-blue-900 px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                        >
                            Top Up & Renew <Zap size={16} className="fill-blue-900" />
                        </button>
                        <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            Secure Mobile Money Link
                        </p>
                    </div>
                </div>

                {/* Subscribed Tutors Quick Access */}
                <div className="bg-[#0f0f0f] border border-white/5 rounded-[3rem] p-8 flex flex-col justify-center">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Play size={14} className="text-blue-500" /> Active Creator Passes
                    </h3>

                    {activeTutors.length > 0 ? (
                        <div className="space-y-4">
                            {activeTutors.slice(0, 3).map(tutor => (
                                <Link href="/student/resources" key={tutor.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black">
                                            {tutor.name?.[0] || 'T'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{tutor.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{tutor.department}</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                </Link>
                            ))}
                            {activeTutors.length > 3 && (
                                <Link href="/student/tutors" className="text-center block py-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">
                                    View {activeTutors.length - 3} more passes
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                No active tutor passes.<br />Visit Tutor Pulse to explore.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-12 border-t border-white/5">

                {/* News & Announcements Column */}
                <div className="space-y-10">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Clock size={16} className="text-blue-500" /> Latest Feed
                    </h3>

                    <div className="space-y-6">
                        {news.filter((n: NewsItem) => n.schoolId === schoolProfile?.id).map((item: NewsItem) => (
                            <div key={item.id} className="p-8 rounded-[2rem] bg-[#0f0f0f] border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 ${item.category === 'Academic' ? 'text-blue-400' : 'text-purple-400'}`}>
                                        {item.category}
                                    </span>
                                    <span className="text-[10px] text-gray-600 font-bold">{item.date}</span>
                                </div>
                                <h4 className="font-black text-lg text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{item.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Offers Column */}
                <div className="space-y-10">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Zap size={16} className="text-rose-500" /> Special Offers
                    </h3>

                    <div className="space-y-6">
                        {appOffers.map(offer => (
                            <div key={offer.id} className="relative overflow-hidden rounded-[2rem] p-8 bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-xl shadow-rose-900/10 transition-transform hover:scale-[1.02]">
                                <div className="relative z-10">
                                    <h4 className="text-2xl font-black mb-2 tracking-tighter">{offer.title}</h4>
                                    <p className="text-xs font-bold opacity-80 mb-6">{offer.description}</p>
                                    <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border border-white/10 uppercase">
                                        Code: {offer.code}
                                    </div>
                                </div>
                                <div className="absolute -right-6 -bottom-6 text-9xl font-black opacity-10 rotate-12">%</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Community & Suggestions Column */}
                <div className="space-y-10">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <MessageSquare size={16} className="text-amber-500" /> Experience Box
                    </h3>

                    <Link href="/student/news?tab=suggestions" className="block p-8 rounded-[2rem] bg-[#111] border border-amber-500/10 hover:border-amber-500/30 transition-all group">
                        <Lightbulb size={32} className="text-amber-500 mb-6" />
                        <h4 className="font-black text-xl text-white mb-2 decoration-amber-500 group-hover:underline">Have an Idea?</h4>
                        <p className="text-xs font-bold text-gray-600 leading-relaxed mb-6 uppercase tracking-widest">Share feedback with faculty</p>
                        <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            Launch Box <ArrowRight size={14} />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
