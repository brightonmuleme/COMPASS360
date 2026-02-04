"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSchoolData } from '@/lib/store';
import { Clock, Zap, ExternalLink } from "lucide-react";

export default function StudentDashboard() {
    const { students, adverts, studentProfile, hydrated, appUpdates, appOffers, developerSettings, schoolProfile } = useSchoolData();
    const router = useRouter();

    // Derived State
    const STUDENT = students.find(s => s.id.toString() === studentProfile?.id);
    const appName = schoolProfile?.name || "VINE Institute";

    useEffect(() => {
        if (hydrated && !STUDENT) {
            router.replace('/');
        }
    }, [STUDENT, hydrated, router]);

    // Timer Logic
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!STUDENT?.subscriptionExpiry) return;

        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(STUDENT.subscriptionExpiry!);
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

        const timerId = setInterval(updateTimer, 1000); // Standard 1s interval
        updateTimer(); // Initial call

        return () => clearInterval(timerId);
    }, [STUDENT]);

    if (!STUDENT) return null;

    // Helpers
    const isLinked = !!studentProfile.linkedStudentCode;
    const linkedStudent = isLinked
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;
    const isRegistrarEnrolled = isLinked && linkedStudent?.origin === 'registrar';

    const isActive = studentProfile.subscriptionStatus === 'active';
    const isTrial = studentProfile.subscriptionStatus === 'trial';

    // Theme Colors
    const tierGradient = isActive
        ? "bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900"
        : isTrial
            ? "bg-gradient-to-br from-emerald-900 to-teal-900"
            : "bg-gradient-to-br from-gray-900 to-gray-800";

    const tierTitle = isActive ? "PLATINUM MEMBER" : isTrial ? "TRIAL ACCESS" : "MEMBERSHIP EXPIRED";

    return (
        <div className="max-w-7xl mx-auto pb-16 p-4 md:p-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Welcome Back, {STUDENT.name.split(' ')[0]}</h1>
                    <p className="text-gray-400 mt-1">Your personal learning hub at <span className="text-blue-400">{appName}</span>.</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg ${isLinked ? (isRegistrarEnrolled ? 'bg-green-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-700 text-gray-300'
                    }`}>
                    {isLinked ? (isRegistrarEnrolled ? 'Verified Student' : 'School Member') : 'Independent Learner'}
                </div>
            </div>

            {/* Premium Card */}
            <div className={`rounded-3xl p-8 mb-12 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden ${tierGradient}`}>
                {/* Background decorative elements could go here */}

                <div className="flex-1 min-w-[300px] z-10">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-2">Membership Status</div>
                    <h2 className="text-4xl xs:text-5xl font-black text-white mb-4 transparent-text-gradient bg-clip-text">
                        {tierTitle}
                    </h2>
                    <p className="text-blue-100/70 max-w-md mb-8 leading-relaxed">
                        Access unlimited resources, 24/7 AI tutor support, and premium medical library content.
                    </p>

                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{timeLeft.days}</div>
                            <div className="text-[10px] uppercase text-white/40 font-bold">Days Left</div>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{timeLeft.hours}</div>
                            <div className="text-[10px] uppercase text-white/40 font-bold">Hours</div>
                        </div>
                        {timeLeft.days === 0 && (
                            <>
                                <div className="h-8 w-px bg-white/10"></div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-red-400">{timeLeft.minutes}</div>
                                    <div className="text-[10px] uppercase text-white/40 font-bold">Mins</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="z-10 w-full md:w-auto">
                    <button
                        onClick={() => router.push('/student/fees')}
                        className="w-full md:w-auto bg-white text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        Renew Now <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                    </button>
                    <p className="text-center text-xs text-white/40 mt-3 font-medium">
                        Secure payment via Mobile Money
                    </p>
                </div>
            </div>

            {/* Link CTA */}
            {!isLinked && (
                <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 p-8 mb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Unlock Your Full School Experience</h3>
                        <p className="text-gray-400 text-sm">Link your official school code to sync results and billing.</p>
                    </div>
                    <button
                        onClick={() => router.push('/student/profile')}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all"
                    >
                        Link Account
                    </button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* News Column */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" /> Latest Updates
                    </h3>

                    {appUpdates.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-[#181818] border border-gray-800 text-center text-gray-500 text-sm">
                            No updates available.
                        </div>
                    ) : (
                        appUpdates.map(news => (
                            <div key={news.id} className="p-6 rounded-2xl bg-[#181818] border-l-4 border-gray-800 hover:border-gray-700 transition-colors" style={{ borderLeftColor: news.color }}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/5" style={{ color: news.color }}>
                                        {news.type}
                                    </span>
                                    <span className="text-xs text-gray-500">{news.date}</span>
                                </div>
                                <h4 className="font-bold text-white mb-2">{news.title}</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">{news.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Offers Column */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap size={20} className="text-pink-500" /> Special Offers
                    </h3>

                    <div className="space-y-4">
                        {appOffers.map(offer => (
                            <div key={offer.id} className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-pink-600 to-rose-700 text-white shadow-lg">
                                <div className="relative z-10">
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Limited Time</div>
                                    <h4 className="text-2xl font-black mb-2">{offer.title}</h4>
                                    <p className="text-sm opacity-90 mb-4">{offer.description}</p>
                                    <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono">
                                        Code: {offer.code}
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 text-9xl font-black opacity-10 rotate-12">%</div>
                            </div>
                        ))}
                    </div>

                    {/* Sponsored Ad */}
                    {adverts.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-800">
                            <div className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4">Sponsored</div>
                            <div className="grid gap-4">
                                {adverts.map(ad => (
                                    <div key={ad.id} className="flex gap-4 items-start p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                        {ad.imageUrl && (
                                            <div className="w-16 h-12 rounded-lg bg-gray-800 overflow-hidden">
                                                <img src={ad.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-blue-400 text-sm">{ad.schoolName}</h4>
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
