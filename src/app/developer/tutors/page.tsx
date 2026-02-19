"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useSchoolData } from '@/lib/store';
import {
    Users,
    Star,
    CheckCircle,
    XCircle,
    Mail,
    CreditCard,
    Library,
    ArrowUpRight,
    Loader2,
    Search,
    Filter,
    Phone,
    ChevronRight,
    Trophy,
    Activity
} from 'lucide-react';

export default function TutorManagementPage() {
    const { tutors: localTutors } = useSchoolData();
    const [dbTutors, setDbTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('role', ['Tutor', 'tutor'])
                    .order('created_at', { ascending: false });
                setDbTutors(data || []);
            } catch (error) {
                console.error("Error fetching DB tutors:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTutors();
    }, []);

    // Merge local verified tutors with DB tutors, avoiding duplicates by email
    const allTutors = useMemo(() => {
        const combined = [...localTutors];
        const localEmails = new Set(localTutors.map(t => t.email.toLowerCase()));

        dbTutors.forEach(dbT => {
            if (dbT.email && !localEmails.has(dbT.email.toLowerCase())) {
                combined.push({
                    id: dbT.id,
                    name: dbT.full_name || 'Unregistered Tutor',
                    email: dbT.email,
                    phone: dbT.phone || '',
                    status: 'Active',
                    stats: { subscribers: dbT.subscribers_count || 0, views: 0, uploads: dbT.resources_count || 0 },
                    department: 'Community'
                } as any);
            }
        });
        return combined;
    }, [localTutors, dbTutors]);

    const filteredTutors = allTutors.filter(t =>
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Tutor <span className="text-red-600">Registrar</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-red-600"></span>
                        Content Creators & Ecosystem Health
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 sm:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search creator registry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all shadow-sm"
                        />
                    </div>
                    <button className="w-full sm:w-auto p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-600 transition-all shadow-sm active:scale-95">
                        <Filter size={24} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <Loader2 className="animate-spin text-red-600 mb-6" size={48} />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Ecosystem Data...</p>
                </div>
            ) : filteredTutors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTutors.map((tutor) => (
                        <div
                            key={tutor.id}
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-red-900/5 transition-all group relative overflow-hidden flex flex-col"
                        >
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-[#0d0d0d] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-slate-200 group-hover:bg-red-600 group-hover:rotate-6 transition-all">
                                        {tutor.name?.[0] || 'T'}
                                    </div>
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </span>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-red-500 transition-colors uppercase tracking-tight italic">
                                        {tutor.name || 'Anonymous Tutor'}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-slate-400 text-xs font-bold">
                                            <Mail size={14} className="text-slate-300" />
                                            <span className="truncate">{tutor.email || 'No email registered'}</span>
                                        </div>
                                        {tutor.phone && (
                                            <div className="flex items-center gap-3 text-slate-400 text-xs font-bold">
                                                <Phone size={14} className="text-slate-300" />
                                                <span className="font-mono tracking-tighter">{tutor.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Library size={12} className="text-slate-300" />
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Library</span>
                                        </div>
                                        <div className="text-lg font-black text-slate-900 italic">
                                            {tutor.resources_count || 0} <span className="text-[10px] text-slate-300 font-medium not-italic">Items</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Activity size={12} className="text-slate-300" />
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Reach</span>
                                        </div>
                                        <div className="text-lg font-black text-slate-900 italic">
                                            {tutor.subscribers_count || 0} <span className="text-[10px] text-slate-300 font-medium not-italic">Users</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center gap-3">
                                    <button className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">
                                        Control Center <ArrowUpRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[4rem] p-12 md:p-24 border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50" />
                    <div className="relative z-10 max-w-lg mx-auto">
                        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform group-hover:rotate-6">
                            <Users size={48} className="text-slate-300 group-hover:text-red-600 transition-colors" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter italic uppercase mb-6">
                            Registry <br /> <span className="text-red-600 tracking-normal italic uppercase">Empty</span>
                        </h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed mb-4">
                            When tutors join the ecosystem, their profiles will automatically manifest here for oversight.
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 italic">Ecosystem initialization in progress...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
