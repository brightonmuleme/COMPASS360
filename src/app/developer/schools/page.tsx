"use client";
import React, { useState } from 'react';
import { Check, X, Search, School, Trash2, AlertCircle } from 'lucide-react';

// MOCK DATA (Because we are not connected to Supabase yet)
const MOCK_PENDING_SCHOOLS = [
    { id: '1', name: 'Greenhill Academy', email: 'admin@greenhill.ac.ug', contact: 'Mr. John (Director)', date: '2024-02-05', plan: 'Enterprise' },
    { id: '2', name: 'Kampala Parents', email: 'info@kps.ac.ug', contact: 'Bursar Mary', date: '2024-02-04', plan: 'Premium' },
];

const MOCK_ACTIVE_SCHOOLS = [
    { id: '101', name: 'Vine International', email: 'info@vine.ac.ug', students: 1250, status: 'Active', plan: 'Enterprise' },
    { id: '102', name: 'City High School', email: 'admin@cityhigh.com', students: 850, status: 'Active', plan: 'Basic' },
    { id: '103', name: 'Apex Primary', email: 'apex@schools.ug', students: 400, status: 'Suspended', plan: 'Premium' },
];

export default function SchoolValidationPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
    const [pendingSchools, setPendingSchools] = useState(MOCK_PENDING_SCHOOLS);
    const [activeSchools, setActiveSchools] = useState(MOCK_ACTIVE_SCHOOLS);

    const handleApprove = (id: string) => {
        if (confirm("Approve this school? They will receive an email and can log in immediately.")) {
            // Logic: Move from pending to active (Mock)
            const school = pendingSchools.find(s => s.id === id);
            if (school) {
                setPendingSchools(prev => prev.filter(s => s.id !== id));
                setActiveSchools(prev => [...prev, {
                    id: school.id,
                    name: school.name,
                    email: school.email,
                    students: 0,
                    status: 'Active',
                    plan: school.plan
                }]);
            }
        }
    };

    const handleReject = (id: string) => {
        if (confirm("Reject application? This URL/Email will be blocked.")) {
            setPendingSchools(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">School Validations</h1>
                    <p className="text-slate-500 mt-2">Validate and manage school access requests.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <School size={16} />
                    {pendingSchools.length} Pending Requests
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative ${activeTab === 'pending' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Pending Approvals
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Active Schools Directory
                    {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                </button>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {activeTab === 'pending' ? (
                    // PENDING VIEW
                    <div>
                        {pendingSchools.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Check size={48} className="text-green-500 mb-4" />
                                <h3 className="text-lg font-bold">All caught up!</h3>
                                <p>No pending applications.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">School Name</th>
                                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Applicant</th>
                                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Plan</th>
                                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingSchools.map(school => (
                                        <tr key={school.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{school.name}</div>
                                                <div className="text-xs text-slate-500">{school.email}</div>
                                            </td>
                                            <td className="p-4 text-sm font-medium">{school.contact}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold uppercase">{school.plan}</span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-500">{school.date}</td>
                                            <td className="p-4 flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleReject(school.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(school.id)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-200 transition"
                                                >
                                                    <Check size={16} /> Approve
                                                </button>
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
                        <div className="p-4 border-b border-slate-100 flex gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">School</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Students</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Plan</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeSchools.map(school => (
                                    <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{school.name}</div>
                                            <div className="text-xs text-slate-500">{school.email}</div>
                                        </td>
                                        <td className="p-4 text-sm font-bold">{school.students.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase">{school.plan}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex w-fit items-center gap-1 ${school.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${school.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-slate-400 hover:text-slate-600 transition">
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 text-amber-800 text-sm">
                <AlertCircle />
                <div>
                    <h4 className="font-bold">Database Disconnected</h4>
                    <p>This portal is currently showing <strong>Mock Data</strong>. To validate real signups from other devices, please connect the Supabase database. See <code>DATABASE_SETUP.md</code> for instructions.</p>
                </div>
            </div>
        </div>
    );
}
