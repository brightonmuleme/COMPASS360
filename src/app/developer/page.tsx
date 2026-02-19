"use client";
import React, { useEffect, useState } from 'react';
import { useSchoolData } from '@/lib/store';
import { developerService, PlatformStats } from '@/services/developerService';
import {
    Users,
    School,
    BookOpen,
    TrendingUp,
    ShieldCheck,
    Activity,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Database,
    Cloud,
    Key
} from 'lucide-react';

export default function DeveloperMainPage() {
    const { developerProfile } = useSchoolData();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await developerService.getRealtimeStats();
            setStats(data);
            setIsLoading(false);
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Platform Users', value: stats ? stats.totalStudents + stats.totalTutors : 0, icon: Users, color: '#3b82f6' },
        { label: 'Partner Schools', value: stats?.totalSchools || 0, icon: School, color: '#10b981' },
        { label: 'Active Resources', value: stats?.totalContent || 0, icon: BookOpen, color: '#f59e0b' },
        { label: 'System Health', value: '99.9%', icon: Activity, color: '#8b5cf6' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                    System <span className="text-red-600">Overview</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-[0.3em] mt-3 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-red-600"></span>
                    Live production snapshot for {process.env.NEXT_PUBLIC_SITE_NAME || 'Compass 360'}
                </p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-5">
                        <div className="p-4 rounded-2xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <stat.icon size={24} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '...' : (typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value)}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Health */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                                <ShieldCheck className="text-red-500 w-5 h-5" />
                                Security Status
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time infrastructure health</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            All Systems Active
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Auth Subsystem', status: 'Healthy', icon: CheckCircle2, color: '#10b981', sub: 'Supabase Logic' },
                            { label: 'Database Sync', status: 'Active', icon: Database, color: '#10b981', sub: 'Real-time Hub' },
                            { label: 'Media Storage', status: 'Healthy', icon: Cloud, color: '#10b981', sub: 'S3 Node' },
                            { label: 'API Gateway', status: 'Secured', icon: Key, color: '#3b82f6', sub: 'Key Manager' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-100/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm text-slate-400">
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 tracking-tight">{item.label}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.sub}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600">
                                    {item.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-[#0d0d0d] p-8 rounded-[2.5rem] text-white flex flex-col shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-red-600/20 transition-all duration-700"></div>

                    <h2 className="text-xl font-black tracking-tight uppercase mb-8 relative z-10 flex items-center gap-3">
                        <Activity className="text-red-500 w-5 h-5" />
                        Quick Ops
                    </h2>

                    <div className="space-y-3 relative z-10">
                        <button className="w-full group/btn p-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-red-600/20">
                            Clear System Cache
                        </button>
                        <button className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/70 hover:text-white font-black text-xs uppercase tracking-widest transition-all">
                            Backup Database
                        </button>
                        <button className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/70 hover:text-white font-black text-xs uppercase tracking-widest transition-all">
                            Generate Logs Report
                        </button>
                    </div>

                    <div className="mt-10 p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20 relative z-10">
                        <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                            <AlertCircle size={14} /> System Alert
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                            Next maintenance window is scheduled for Sunday at 02:00 AM.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
