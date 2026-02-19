"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Search, School, Trash2, AlertCircle, Loader2, RefreshCw, User, Shield, Info, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';
import { useSchoolData } from '@/lib/store';

export default function SchoolValidationPage() {
    const { staffAccounts, resetStaffPassword } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
    const [pendingSchools, setPendingSchools] = useState<any[]>([]);
    const [activeSchools, setActiveSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState<any | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendingRes, activeRes] = await Promise.all([
                supabase.from('school_applications').select('*').eq('status', 'Pending').order('created_at', { ascending: false }),
                supabase.from('schools').select('*').order('name', { ascending: true })
            ]);

            setPendingSchools(pendingRes.data || []);
            setActiveSchools(activeRes.data || []);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (id: string) => {
        const app = pendingSchools.find(s => s.id === id);
        if (!app) return;

        if (confirm(`Approve ${app.school_name}? This will create a live school profile.`)) {
            setLoading(true);
            try {
                const response = await fetch('/api/admin/approve-school', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicationId: id,
                        schoolName: app.school_name,
                        email: app.email
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to approve school');
                }

                alert("School approved successfully!");
                fetchData();
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleReject = async (id: string) => {
        if (confirm("Reject this application?")) {
            setLoading(true);
            await supabase.from('school_applications').update({ status: 'Rejected' }).eq('id', id);
            fetchData();
        }
    };

    const handleResetPassword = (accountId: string, staffName: string) => {
        if (confirm(`Are you sure you want to reset the password for ${staffName} to "password123"?`)) {
            resetStaffPassword(accountId);
            alert(`Success! Password for ${staffName} has been reset to: password123`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
                        School <span className="text-blue-600">Validators</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-blue-600"></span>
                        Educational Infrastructure Management
                    </p>
                </div>
                <div className="bg-blue-600 shadow-xl shadow-blue-200 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-3 self-start md:self-auto">
                    <School size={18} />
                    <span>{pendingSchools.length} Pending Requests</span>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 md:gap-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 font-black text-xs md:text-sm uppercase tracking-widest transition-all relative ${activeTab === 'pending' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Inbound Pipeline
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 font-black text-xs md:text-sm uppercase tracking-widest transition-all relative ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Active Network
                    {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* CONTENT AREA */}
            <div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                        <Loader2 className="animate-spin text-blue-600 mb-6" size={48} />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Cloud Database...</p>
                    </div>
                ) : activeTab === 'pending' ? (
                    <div className="space-y-4">
                        {pendingSchools.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm opacity-50">
                                <Check size={48} className="text-emerald-500 mb-4" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Repository Clear</h3>
                                <p className="text-[10px] font-bold text-slate-400">All school applications have been processed.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingSchools.map(app => (
                                    <div key={app.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] flex items-center justify-center text-blue-200 -z-10 group-hover:scale-110 transition-transform">
                                            <School size={40} />
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{app.school_name}</h3>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-4">
                                                <Mail size={12} /> {app.email}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Point of Contact</p>
                                                        <p className="text-xs font-black text-slate-700">{app.admin_name || 'System Generated'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                        <Phone size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Direct Line</p>
                                                        <p className="text-xs font-black text-slate-700 font-mono">{app.phone || 'NO_LINK'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleReject(app.id)}
                                                className="flex-1 px-4 py-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent hover:border-rose-100"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(app.id)}
                                                className="flex-[2] px-4 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check size={16} /> Approve Access
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Directory Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search the educational network..."
                                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm font-black focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Active Schools Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeSchools.map(school => (
                                <div key={school.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                                                <School size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase leading-none mb-2">{school.name}</h3>
                                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex w-fit items-center gap-1.5 ${school.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${school.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                                    {school.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-8">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Mail size={12} className="text-slate-300" /> {school.email || 'NO_EMAIL'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                            <MapPin size={12} className="text-blue-200" /> Regional Node: {school.id?.substring(0, 8) || 'SYSTEM_DEFAULT'}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedSchool(school)}
                                        className="w-full py-4 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-100 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-slate-200"
                                    >
                                        Manage Roles <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))}
                            {activeSchools.length === 0 && (
                                <div className="col-span-full py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm opacity-50 flex flex-col items-center justify-center">
                                    <AlertCircle size={48} className="text-slate-300 mb-4" />
                                    <p className="font-black uppercase tracking-widest text-xs text-slate-400">Institutional Database Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ROLE MANAGEMENT MODAL (REFURBISHED) */}
            {selectedSchool && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-10 bg-slate-900 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 opacity-20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 transform rotate-12">
                                        <Shield size={40} />
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-3xl font-black text-white leading-tight tracking-tighter uppercase">{selectedSchool.name}</h2>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2 opacity-80">Access Management Terminal</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSchool(null)}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8">
                            <div className="flex items-center gap-2 mb-8 text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl w-fit">
                                <User size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Personnel Registry</span>
                            </div>

                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const schoolId = selectedSchool.id ? selectedSchool.id : 'vine_intl';
                                    const associatedStaff = staffAccounts.filter(acc => acc.schoolId === schoolId || (schoolId === 'vine_intl' && !acc.schoolId));

                                    if (associatedStaff.length === 0) {
                                        return (
                                            <div className="py-20 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center text-slate-300">
                                                <Info size={40} className="mb-4 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center">Localized Staff Registry <br />is currently empty</p>
                                            </div>
                                        );
                                    }

                                    return associatedStaff.map(staff => (
                                        <div key={staff.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-blue-500/30 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all gap-6">
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:rotate-6 transition-all text-2xl">
                                                    👤
                                                </div>
                                                <div className="text-left flex-1">
                                                    <div className="font-black text-slate-900 uppercase tracking-tight text-lg leading-none mb-2">{staff.name || 'Anonymous User'}</div>
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-widest">{staff.role}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">@{staff.username}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleResetPassword(staff.id, staff.name)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 hover:border-transparent rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-sm group/btn active:scale-95"
                                            >
                                                <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-1000" />
                                                Reset Credentials
                                            </button>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setSelectedSchool(null)}
                                className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

