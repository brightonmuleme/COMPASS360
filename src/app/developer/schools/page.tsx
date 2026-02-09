"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Search, School, Trash2, AlertCircle, Loader2, RefreshCw, User, Shield, Info } from 'lucide-react';
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
                // 1. Create the school
                const { error: schoolError } = await supabase.from('schools').insert([{
                    name: app.school_name,
                    email: app.email,
                    plan: app.plan || 'Standard',
                    status: 'Active'
                }]);

                if (schoolError) throw schoolError;

                // 2. Update application status
                await supabase.from('school_applications').update({ status: 'Approved' }).eq('id', id);

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
        <div className="max-w-6xl mx-auto p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">Partner School Management</h1>
                    <p className="text-slate-500 mt-2 font-medium">Scale the platform by validating and onboarding new educational institutions.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 text-blue-700 px-5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 shadow-sm">
                    <School size={18} />
                    {pendingSchools.length} New Requests
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-6 mb-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 font-black text-sm transition-all relative ${activeTab === 'pending' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Pending Approvals
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 font-black text-sm transition-all relative ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Active Schools Directory
                    {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Cloud Database</p>
                    </div>
                ) : activeTab === 'pending' ? (
                    // PENDING VIEW
                    <div>
                        {pendingSchools.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Check size={48} className="text-green-500 mb-4" />
                                <h3 className="text-lg font-bold">All caught up!</h3>
                                <p>No pending school applications.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Institution</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Contact Person</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Plan Type</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose text-right">Verification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingSchools.map(app => (
                                        <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-5">
                                                <div className="font-black text-slate-900 text-lg">{app.school_name}</div>
                                                <div className="text-xs font-bold text-slate-400 mt-0.5">{app.email}</div>
                                            </td>
                                            <td className="p-5 text-sm font-bold text-slate-600">{app.admin_name || 'N/A'}</td>
                                            <td className="p-5">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider">{app.plan || 'Standard'}</span>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleReject(app.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                        title="Reject Application"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(app.id)}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-lg shadow-slate-200 transition-all active:scale-95"
                                                    >
                                                        <Check size={16} /> Approve Access
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    // ACTIVE VIEW
                    <div>
                        <div className="p-6 border-b border-slate-100 flex gap-4 bg-slate-50/30">
                            <div className="relative flex-1 max-w-md group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search institutional database..."
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">School ID & Name</th>
                                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Plan</th>
                                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Status</th>
                                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeSchools.map(school => (
                                    <tr key={school.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <School size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900">{school.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {school.id?.substring(0, 8) || 'VINE_INTL'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider">{school.plan}</span>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex w-fit items-center gap-1.5 ${school.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${school.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button
                                                onClick={() => setSelectedSchool(school)}
                                                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                            >
                                                Manage Roles
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeSchools.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <School size={48} className="mb-4" />
                                                <p className="font-black uppercase tracking-widest text-xs">Repository Empty</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ROLE MANAGEMENT MODAL */}
            {selectedSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-5 text-left">
                                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                                    <Shield size={32} />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedSchool.name}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Institutional Identity & Access Management</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSchool(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-200 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 text-left">
                            <div className="flex items-center gap-2 mb-6 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl w-fit">
                                <User size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Staff Accounts</span>
                            </div>

                            <div className="space-y-4">
                                {(() => {
                                    // Use hardcoded vine_intl if the school ID matches our legacy mock, otherwise match dynamic ID
                                    const schoolId = selectedSchool.id ? selectedSchool.id : 'vine_intl';
                                    const associatedStaff = staffAccounts.filter(acc => acc.schoolId === schoolId || (schoolId === 'vine_intl' && !acc.schoolId));

                                    if (associatedStaff.length === 0) {
                                        return (
                                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center text-slate-400">
                                                <Info size={32} className="mb-3 opacity-20" />
                                                <p className="text-sm font-bold">No localized staff accounts found.</p>
                                                <p className="text-xs italic mt-1 font-medium">Create staff accounts to see them here.</p>
                                            </div>
                                        );
                                    }

                                    return associatedStaff.map(staff => (
                                        <div key={staff.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 hover:bg-white transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-200 group-hover:scale-110 transition-transform">
                                                    <span className="text-xl">👤</span>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-black text-slate-900">{staff.name || 'Staff Member'}</div>
                                                    <div className="flex gap-2 items-center mt-0.5">
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{staff.role}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono">@{staff.username}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleResetPassword(staff.id, staff.name)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                            >
                                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-1000" />
                                                Reset Password
                                            </button>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 pt-0 flex justify-end">
                            <button
                                onClick={() => setSelectedSchool(null)}
                                className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-black transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

