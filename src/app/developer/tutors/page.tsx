"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
    Phone
} from 'lucide-react';

export default function TutorManagementPage() {
    const [tutors, setTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTutors = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['Tutor', 'tutor'])
                .order('created_at', { ascending: false });
            setTutors(data || []);
            setLoading(false);
        };
        fetchTutors();
    }, []);

    const filteredTutors = tutors.filter(t =>
        (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500/10 p-2 rounded-xl">
                            <Users className="text-red-500" size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tutor Registrar</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Monitor active content creators and ecosystem health.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl w-full md:w-[300px] outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all text-sm font-medium"
                        />
                    </div>
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 transition-colors">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-red-500" size={40} />
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading Ecosystem...</p>
                </div>
            ) : filteredTutors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTutors.map((tutor) => (
                        <div
                            key={tutor.id}
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all group relative overflow-hidden"
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                            <Library size={120} className="absolute -right-8 -bottom-8 opacity-[0.02] text-slate-900 -rotate-12" />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-red-500 to-red-600 p-[2px] shadow-lg shadow-red-200">
                                        <div className="w-full h-full bg-white rounded-[1.4rem] flex items-center justify-center text-red-600 text-2xl font-black">
                                            {tutor.full_name?.[0] || 'T'}
                                        </div>
                                    </div>
                                    <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                        Active
                                    </span>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 truncate group-hover:text-red-500 transition-colors">
                                        {tutor.full_name || 'Anonymous Tutor'}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                                            <Mail size={14} className="text-slate-300" />
                                            <span className="truncate">{tutor.email || 'No email registered'}</span>
                                        </div>
                                        {tutor.phone && (
                                            <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                                                <Phone size={14} className="text-slate-300" />
                                                <span>{tutor.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Content</div>
                                        <div className="text-lg font-bold text-slate-800">
                                            {tutor.resources_count || 0} <span className="text-[10px] text-slate-400 font-normal ml-1">Items</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Impact</div>
                                        <div className="text-lg font-bold text-slate-800">
                                            {tutor.subscribers_count || 0} <span className="text-[10px] text-slate-400 font-normal ml-1">Subs</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="flex-1 py-4 bg-slate-900 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 hover:shadow-red-200">
                                        View Dashboard
                                    </button>
                                    <button className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="text-slate-300" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">No Tutors Found</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">When tutors sign up join the ecosystem, their profiles will automatically appear here for your oversight.</p>
                </div>
            )}
        </div>
    );
}
