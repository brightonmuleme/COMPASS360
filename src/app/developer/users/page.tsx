"use client";
import React, { useEffect, useState } from 'react';
import { developerService } from '@/services/developerService';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    Calendar,
    BadgeCheck,
    Loader2,
    Plus,
    ChevronDown,
    User
} from 'lucide-react';

export default function UserManagerPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await developerService.getAllUsers();
                console.log("🔍 USER DATA FETCHED:", data);
                if (!data || data.length === 0) {
                    console.warn("⚠️ Cloud returned 0 users. Checking RLS policies might be necessary.");
                }
                setUsers(data || []);
            } catch (err: any) {
                console.error("❌ Failed to fetch users:", err);
                setError(err.message || "An unknown error occurred while syncing with the cloud.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.full_name || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' ||
            (user.role?.toLowerCase() === roleFilter.toLowerCase());
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        User <span className="text-red-600">Manager</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-6 h-[1px] bg-red-600"></span>
                        Platform Identity Control Center
                    </p>
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95">
                    <Plus size={18} />
                    New Account
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search system registry..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500 transition-all border border-transparent focus:bg-white"
                    />
                </div>
                <div className="relative group min-w-[160px]">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-600 focus:outline-none border border-transparent focus:border-red-500 transition-all cursor-pointer"
                    >
                        <option value="All">All Roles</option>
                        <option value="Student">Students</option>
                        <option value="Tutor">Tutors</option>
                        <option value="Bursar">Bursars</option>
                        <option value="Director">Directors</option>
                        <option value="Developer">Developers</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-red-500" />
                </div>
            </div>

            {/* Final Diagnostic UI */}
            {error ? (
                <div className="flex flex-col items-center justify-center py-32 bg-red-50 rounded-[3rem] border border-red-100 shadow-sm">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <MoreVertical size={32} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-900 mb-2">Cloud Sync Failed</h3>
                    <p className="text-xs font-bold text-red-500 max-w-md text-center px-8">{error}</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <Loader2 className="animate-spin text-red-600 mb-6" size={48} />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Cloud Identity...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm opacity-50">
                    <Users size={48} className="text-slate-300 mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Registry Entry Not Found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* Header for Desktop */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-2xl">
                        <div className="col-span-4">User Identity</div>
                        <div className="col-span-2">System Role</div>
                        <div className="col-span-3">Contact Payload</div>
                        <div className="col-span-2">Joined Date</div>
                        <div className="col-span-1 text-center">Ops</div>
                    </div>

                    {/* Scrollable / Card Grid */}
                    <div className="space-y-3">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="lg:grid lg:grid-cols-12 items-center gap-4 bg-white p-6 lg:px-8 lg:py-4 rounded-[2rem] border border-slate-100 hover:border-red-500/20 hover:shadow-xl hover:shadow-red-900/5 transition-all group">
                                {/* Mobile/Desktop Identity Header */}
                                <div className="col-span-4 flex items-center gap-4 mb-4 lg:mb-0">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-lg border border-slate-100 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                                        {(user.full_name || user.name || '?')?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors uppercase leading-none mb-1.5">{user.full_name || user.name || 'Anonymous User'}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">ID: {user.id.slice(0, 12)}</p>
                                    </div>
                                </div>

                                {/* Role - Desktop & Mobile Positioning */}
                                <div className="col-span-2 mb-4 lg:mb-0">
                                    <span className={`
                                        px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                        ${user.role?.toLowerCase() === 'student' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            user.role?.toLowerCase() === 'developer' ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'}
                                    `}>
                                        {user.role}
                                    </span>
                                </div>

                                {/* Contact Info */}
                                <div className="col-span-3 space-y-1 mb-4 lg:mb-0">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 truncate">
                                        <Mail size={14} className="text-slate-300" /> {user.email || 'Cloud Profile Verified'}
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <Phone size={12} className="text-slate-300" /> {user.phone}
                                        </div>
                                    )}
                                </div>

                                {/* Date */}
                                <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 lg:mb-0">
                                    <span className="lg:hidden text-[10px] text-slate-300 mr-2">Registered:</span>
                                    {new Date(user.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 flex justify-end">
                                    <button className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-2xl text-slate-400 transition-all active:scale-90 border border-slate-100">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
