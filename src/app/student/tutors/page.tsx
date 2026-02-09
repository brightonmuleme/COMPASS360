"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, formatMoney } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Users, Star, CheckCircle, ShieldCheck, Zap, AlertCircle, ShoppingBag, Clock } from "lucide-react";

export default function TutorsPage() {
    const {
        tutors,
        schoolProfile,
        studentProfile,
        students,
        subscribeToTutor,
        developerProfile
    } = useSchoolData();
    const router = useRouter();
    const appName = schoolProfile?.name || "COMPASS 360";

    const linkedStudent = useMemo(() => {
        if (!studentProfile.linkedStudentCode) return null;
        return students.find(s => s.payCode === studentProfile.linkedStudentCode);
    }, [students, studentProfile.linkedStudentCode]);

    const SYSTEM_TUTOR_IDS = useMemo(() => ['system', 'admin_main', developerProfile?.id].filter(Boolean) as string[], [developerProfile]);

    const checkTutorAccess = (tutorId: string) => {
        if (SYSTEM_TUTOR_IDS.includes(tutorId)) return true;
        if (!linkedStudent) return false;

        const hasFinancialSub = linkedStudent.tutorSubscriptions?.some(sub =>
            sub.tutorId === tutorId &&
            sub.status === 'Active' &&
            new Date(sub.expiryDate) > new Date()
        );
        const isSelectedSub = studentProfile.subscribedTutorIds.includes(tutorId);
        return hasFinancialSub || isSelectedSub;
    };

    const myTutors = useMemo(() => tutors.filter(t => checkTutorAccess(t.id) && !SYSTEM_TUTOR_IDS.includes(t.id)), [tutors, linkedStudent, studentProfile]);
    const exploreTutors = useMemo(() => tutors.filter(t => !checkTutorAccess(t.id) && !SYSTEM_TUTOR_IDS.includes(t.id)), [tutors, linkedStudent, studentProfile]);

    const handlePurchase = (tutorId: string) => {
        if (!linkedStudent) {
            alert("Please link your student account in the Identity tab first.");
            return;
        }

        const tutor = tutors.find(t => t.id === tutorId);
        if (!tutor) return;

        const price = tutor.subscriptionPrice || 3500;
        const balance = linkedStudent.walletBalance || 0;

        if (balance < price) {
            if (confirm(`Insufficient Wallet Balance.\n\nYou need ${formatMoney(price)} but your balance is ${formatMoney(balance)}.\n\nGo to Wallet & Plans to top up?`)) {
                router.push('/student/fees');
            }
            return;
        }

        if (confirm(`Purchase ${tutor.name}'s Pass for ${formatMoney(price)}?`)) {
            try {
                subscribeToTutor(linkedStudent.id, tutorId);
                alert("✅ Pass Purchased! You now have access to this tutor's exclusive resources.");
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const TutorCard = ({ tutor, isOwned = false }: { tutor: any, isOwned?: boolean }) => (
        <div
            onClick={() => router.push(`/student/tutors/${tutor.id}`)}
            className={`bg-[#0f0f0f] border rounded-[2.5rem] p-8 flex flex-col transition-all group cursor-pointer hover:border-white/10 ${isOwned ? 'border-blue-500/20 shadow-[0_20px_40px_rgba(37,99,235,0.05)]' : 'border-gray-800'}`}
        >
            <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-blue-600 to-indigo-900 border border-white/5 flex items-center justify-center text-3xl font-black text-white shadow-2xl shrink-0">
                    {tutor.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-xl text-white tracking-tighter truncate uppercase">{tutor.name}</h3>
                        <CheckCircle size={18} className="text-blue-500 shrink-0" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">{tutor.department || "Independent Creator"}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Active Learners</p>
                    <p className="text-lg font-black text-white">{tutor.stats?.subscribers.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Library Size</p>
                    <p className="text-lg font-black text-white">{tutor.stats?.uploads || 0}</p>
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Channel Pass</p>
                        <p className="text-2xl font-black text-white">{formatMoney(tutor.subscriptionPrice || 3500)}</p>
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); isOwned ? router.push(`/student/tutors/${tutor.id}`) : handlePurchase(tutor.id); }}
                    className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 shadow-2xl ${isOwned
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20'
                        : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                >
                    {isOwned ? (
                        <><Zap size={16} /> Enter Channel</>
                    ) : (
                        <><ShoppingBag size={16} /> Buy Subscription</>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-6 sm:p-12 lg:p-20 max-w-7xl mx-auto min-h-screen text-white space-y-24">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pb-16 border-b border-white/5">
                <div className="space-y-4">
                    <div className="bg-blue-600 w-fit px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[0.4em] mb-4">Creator Network</div>
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">Tutor Pulse</h1>
                    <p className="text-gray-500 font-medium max-w-xl text-lg leading-relaxed">
                        Discover and subscribe to expert creators from {appName}. Unlock cinematic video guides,
                        interactive notes, and high-yield academic repository.
                    </p>
                </div>
                {linkedStudent && (
                    <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 flex items-center gap-10 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] rounded-full group-hover:bg-blue-600/10 transition-colors" />
                        <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-2xl">
                            <Zap size={32} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em] mb-2">Available Balance</p>
                            <p className="text-4xl font-black text-white tracking-tighter">{formatMoney(linkedStudent.walletBalance || 0)}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* MY SUBSCRIPTIONS */}
            {myTutors.length > 0 && (
                <section className="space-y-12 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1.5 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.4em]">My Verified Channels</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {myTutors.map(tutor => (
                            <TutorCard key={tutor.id} tutor={tutor} isOwned={true} />
                        ))}
                    </div>
                </section>
            )}

            {/* EXPLORE */}
            <section className="space-y-12 pb-32">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-1.5 bg-gray-800 rounded-full" />
                    <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-gray-500">The Marketplace</h2>
                </div>
                {exploreTutors.length === 0 ? (
                    <div className="p-24 text-center bg-[#070707] border border-white/5 rounded-[4rem] shadow-inner">
                        <p className="text-gray-600 font-black uppercase tracking-[0.5em] text-sm opacity-50">Discovery Exhausted. All Channels Subscribed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {exploreTutors.map(tutor => (
                            <TutorCard key={tutor.id} tutor={tutor} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
