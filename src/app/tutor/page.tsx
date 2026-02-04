"use client";

import { useSchoolData } from "@/lib/store";
import { useMemo } from "react";
import Link from "next/link";

export default function TutorDashboard() {
    const { tutorContents, tutorSubscriptions, tutorSettings, tutorProfile } = useSchoolData();
    const mySettings = tutorSettings.find(s => s.tutorId === tutorProfile?.id) || tutorSettings[0];

    const stats = useMemo(() => {
        const activeSubs = tutorSubscriptions.filter(s => s.status === 'Active').length;
        const totalContent = tutorContents.length;
        const notes = tutorContents.filter(c => c.type === 'Note').length;
        const videos = tutorContents.filter(c => c.type === 'Video').length;
        const earnings = tutorSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);

        return { activeSubs, totalContent, notes, videos, earnings };
    }, [tutorContents, tutorSubscriptions]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Tutor Dashboard</h1>
                <p className="text-gray-400">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Subscribers */}
                <Link href="/tutor/subscribers" className="block transform transition-all hover:scale-[1.02]">
                    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors h-full">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="text-sm text-gray-400 font-medium relative z-10">Active Subscribers</div>
                        <div className="text-3xl font-bold text-white mt-2 relative z-10">{stats.activeSubs}</div>
                        <div className="text-xs text-green-400 mt-1 flex items-center gap-1 relative z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live Access
                        </div>
                    </div>
                </Link>

                {/* Total Content */}
                <Link href="/tutor/content" className="block transform transition-all hover:scale-[1.02]">
                    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm hover:border-gray-700 transition-colors h-full">
                        <div className="text-sm text-gray-400 font-medium">Total Content</div>
                        <div className="text-3xl font-bold text-white mt-2">{stats.totalContent}</div>
                        <div className="text-xs text-gray-500 mt-1">{stats.notes} Notes, {stats.videos} Videos</div>
                    </div>
                </Link>

                {/* Earnings */}
                <Link href="/tutor/billing" className="block transform transition-all hover:scale-[1.02]">
                    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm hover:border-green-900/50 transition-colors h-full">
                        <div className="text-sm text-gray-400 font-medium">Total Earnings</div>
                        <div className="text-3xl font-bold text-green-400 mt-2">
                            {stats.earnings.toLocaleString()} <span className="text-base font-normal text-gray-500">UGX</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Lifetime Revenue</div>
                    </div>
                </Link>

                {/* Subscription Status */}
                <Link href="/tutor/settings" className="block transform transition-all hover:scale-[1.02]">
                    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm hover:border-gray-700 transition-colors h-full">
                        <div className="text-sm text-gray-400 font-medium">Subscription Status</div>
                        <div className={`text-xl font-bold mt-2 ${mySettings?.isEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                            {mySettings?.isEnabled ? 'Active' : 'Disabled'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {mySettings?.subscriptionPrice ? `${mySettings.subscriptionPrice.toLocaleString()} UGX / ${mySettings.durationMonths} Mo` : 'Not Configured'}
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm">
                <h2 className="text-lg font-bold text-white mb-6">Recent Activity</h2>
                {tutorContents.length > 0 ? (
                    <div className="space-y-4">
                        {tutorContents.slice(-5).reverse().map(content => (
                            <div key={content.id} className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${content.type === 'Video' ? 'bg-red-500/10 text-red-500' :
                                    content.type === 'Question' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    {content.type[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-200 truncate">{content.title}</div>
                                    <div className="text-xs text-gray-500">Uploaded on {new Date(content.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                </div>
                                <div className="text-xs font-mono text-gray-600 bg-gray-950 px-2 py-1 rounded border border-gray-800 uppercase tracking-wider">{content.type}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-600">No recent activity</div>
                )}
            </div>
        </div>
    );
}
