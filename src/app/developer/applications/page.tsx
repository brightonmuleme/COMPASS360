"use client";
import React, { useState } from 'react';
import { useSchoolData, SchoolApplication } from '@/lib/store';
import {
    Search,
    Filter,
    Calendar,
    ChevronRight,
    Mail,
    Phone,
    MapPin,
    User,
    GraduationCap,
    BookOpen,
    Clock,
    X,
    ExternalLink,
    CheckCircle2,
    CheckCircle,
    Info,
    History,
    Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ApplicationsManager() {
    const { schoolApplications, updateSchoolApplicationStatus, syncApplications, deleteSchoolApplication } = useSchoolData();
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'viewed' | 'contacted'>('all');
    
    const [isSyncing, setIsSyncing] = useState(false);

    const performManualSync = async () => {
        setIsSyncing(true);
        console.log("📡 Hub: Initiating Direct Cloud Sync...");
        if (syncApplications) {
            await syncApplications();
        }
        setIsSyncing(false);
    };

    React.useEffect(() => {
        performManualSync();
    }, []);

    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

    const filteredApps = schoolApplications.filter(app => {
        const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;
        const matchesSchool = schoolFilter === 'all' ? true : app.schoolName === schoolFilter;

        let matchesDate = true;
        if (dateRange.start || dateRange.end) {
            const appDate = new Date(app.submittedAt).getTime();
            if (dateRange.start) {
                const start = new Date(dateRange.start).getTime();
                if (appDate < start) matchesDate = false;
            }
            if (dateRange.end) {
                const end = new Date(dateRange.end).getTime() + 86400000;
                if (appDate > end) matchesDate = false;
            }
        }
        return matchesStatus && matchesSchool && matchesDate;
    });

    const handleDelete = async (appId: string) => {
        if (!window.confirm("⚠️ IRREVERSIBLE ACTION: Are you sure you want to permanently delete this application record across all systems?")) return;
           try {
            // 1. Delete from Cloud (using the direct admission_applications table)
            console.log(`📡 Cloud: Initiating wipe for ID: ${appId}...`);
            const { error } = await supabase
                .from('admission_applications')
                .delete()
                .eq('id', appId);

            if (error) {
                console.error("Cloud Deletion Error:", error);
                throw new Error(`Cloud rejection: ${error.message}`);
            }

            // 2. Instant Local/Store Clean-Up
            setSelectedAppId(null);
            if (deleteSchoolApplication) deleteSchoolApplication(appId);
             
            console.log(`✅ Registry Success: Record ${appId} has been wiped.`);
            alert("SUCCESS: Record has been permanently deleted from cloud.");
        } catch (err: any) {
            console.error("Deletion Protocol Failed:", err);
            alert(`DELETION FAILED: ${err.message || "Unknown Cloud Error"}`);
        }
    };

    const selectedApp = schoolApplications.find(a => a.id === selectedAppId);
    const schoolNames = Array.from(new Set(schoolApplications.map(app => app.schoolName)));

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'viewed': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'contacted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const StatusBadge = ({ status }: { status: string }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(status)}`}>
            {status}
        </span>
    );

    const LabelValue = ({ label, value, icon: Icon }: { label: string, value?: string | number, icon?: any }) => (
        <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                {Icon && <Icon size={12} />} {label}
            </span>
            <span className="block text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors uppercase leading-tight italic">
                {value || 'Not Disclosed'}
            </span>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Applications <span className="text-red-600">Hub</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-red-600"></span>
                        Reviewing {schoolApplications.length} Admissions Pipeline
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-3xl self-start">
                    {(['all', 'pending', 'viewed', 'contacted'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white text-red-600 shadow-xl shadow-red-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors z-10 pointer-events-none italic font-black text-[10px] uppercase tracking-widest">School</span>
                    <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="w-full pl-20 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all appearance-none italic"
                    >
                        <option value="all">ALL INSTITUTIONS</option>
                        {schoolNames.map(name => <option key={name} value={name}>{name.toUpperCase()}</option>)}
                    </select>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-red-500 transition-colors z-10 italic font-black text-[8px] uppercase tracking-tighter">Start</span>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all italic"
                        />
                    </div>
                    <div className="flex-1 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-red-500 transition-colors z-10 italic font-black text-[8px] uppercase tracking-tighter">End</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all italic"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={performManualSync}
                        disabled={isSyncing}
                        className={`flex-1 min-w-[120px] h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                    >
                        {isSyncing ? 'SYNCING...' : 'SYNC CLOUD'}
                    </button>
                    <button className="flex-1 h-full bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">
                        Apply Scrub
                    </button>
                    <button
                        onClick={() => { setSchoolFilter('all'); setStatusFilter('all'); setDateRange({ start: '', end: '' }) }}
                        className="p-4 bg-slate-100 text-slate-400 hover:text-red-600 rounded-2xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {isSyncing && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                        <Clock size={16} className="text-white animate-spin" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-red-600 italic">Syncing Admissions...</p>
                        <p className="text-[9px] font-bold text-red-400 uppercase">Fetching latest cloud records from Supabase</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Applications List */}
                <div className={`${selectedAppId ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                    {filteredApps.length === 0 ? (
                        <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <History size={48} className="text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase mb-2">Registry Silent</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No matching signals found in transmission</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredApps.map(app => (
                                <div
                                    key={app.id}
                                    onClick={() => setSelectedAppId(app.id)}
                                    className={`
                                        group relative bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden flex flex-col sm:flex-row sm:items-center gap-6
                                        ${selectedAppId === app.id ? 'border-red-600 shadow-2xl shadow-red-900/10' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200'}
                                    `}
                                >
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 bg-gradient-to-br from-slate-50 to-slate-100 flex-shrink-0 overflow-hidden border border-slate-100 ring-4 ring-slate-50">
                                        {app.profilePhoto ? (
                                            <img src={app.profilePhoto} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User size={32} className="text-slate-300" />
                                            </div>
                                        )}
                                        {app.status === 'pending' && <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse" />}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl font-black text-slate-900 truncate leading-none uppercase italic tracking-tight group-hover:text-red-600 transition-colors">
                                                {app.applicantName}
                                            </h3>
                                            <StatusBadge status={app.status} />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                            <span className="flex items-center gap-1.5"><GraduationCap size={12} className="text-red-400" /> {app.schoolName}</span>
                                            <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" /> {new Date(app.submittedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2">
                                            <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                                {app.programmes || 'Academic Path'}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-tighter italic">
                                                {app.entryLevel || 'L1'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-4 sm:ml-auto">
                                        {app.academicResults && (
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1 group-hover:border-red-200 transition-colors">
                                                <img src={app.academicResults} alt="Doc preview" className="w-full h-full object-cover rounded-lg opacity-40 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detailed Sidebar / Drawer */}
                {selectedAppId && (
                    <div className="lg:col-span-5 lg:sticky lg:top-8 animate-in slide-in-from-right-8 duration-500">
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                            {/* Profile Header */}
                            <div className="relative p-8 bg-[#0d0d0d] text-white">
                                <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                                    <button
                                        onClick={() => handleDelete(selectedApp!.id)}
                                        className="w-10 h-10 rounded-full bg-red-600/20 hover:bg-red-600 hover:text-white text-red-500 flex items-center justify-center transition-all shadow-lg"
                                        title="Phase Out Record"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedAppId(null)}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="relative z-10 flex flex-col items-center gap-6 py-4">
                                    <div className="relative w-32 h-32 rounded-[2.5rem] bg-white/10 p-[4px] ring-4 ring-white/5 shadow-2xl shadow-black/50 overflow-hidden">
                                        <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-white/5">
                                            {selectedApp?.profilePhoto ? (
                                                <img src={selectedApp.profilePhoto} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">🧑</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <h2 className="text-3xl font-black italic uppercase tracking-tight mb-1">{selectedApp?.applicantName}</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] italic mb-6">
                                            Identity: <span className="text-red-500">REF_{selectedApp?.id?.toString().slice(-8).toUpperCase() || '...'}</span>
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            <div className="relative group">
                                                <select
                                                    value={selectedApp?.status}
                                                    onChange={(e) => updateSchoolApplicationStatus(selectedApp!.id, e.target.value as any)}
                                                    className="w-full pl-4 pr-10 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer transition-all outline-none"
                                                >
                                                    <option value="pending" className="text-slate-900">Pending</option>
                                                    <option value="viewed" className="text-slate-900">Viewed</option>
                                                    <option value="contacted" className="text-slate-900">Contacted</option>
                                                </select>
                                                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
                                            </div>
                                            <button
                                                onClick={() => window.open(`mailto:${selectedApp?.applicantEmail}`)}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Mail size={14} /> Contact
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Panels */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                                {/* Academic Focus */}
                                <section>
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic">
                                        <GraduationCap size={16} /> Admission Profile
                                    </h4>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                                            <LabelValue label="Institution Request" value={selectedApp?.schoolName} icon={GraduationCap} />
                                        </div>
                                        <div className="col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Selected Programmes" value={selectedApp?.programmes} icon={BookOpen} />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Entry Level" value={selectedApp?.entryLevel} />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Study Mode" value={selectedApp?.modeOfStudy} />
                                        </div>
                                    </div>
                                </section>

                                {/* Results Section */}
                                {selectedApp?.academicResults && (
                                    <section>
                                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-6 italic">
                                            <Info size={16} /> Official Credentials
                                        </h4>
                                        <div
                                            className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border-2 border-slate-100 group cursor-zoom-in"
                                            onClick={() => window.open(selectedApp.academicResults)}
                                        >
                                            <img src={selectedApp.academicResults} alt="Results" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ExternalLink size={32} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-center mt-3 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Encrypted Document Link</p>
                                    </section>
                                )}

                                {/* Bio Data */}
                                <section>
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-6 italic">
                                        <User size={16} /> Bio-Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                                        <LabelValue label="Gender" value={selectedApp?.gender} />
                                        <LabelValue label="Nationality" value={selectedApp?.nationality} />
                                        <LabelValue label="Date of Birth" value={selectedApp?.dob} />
                                        <LabelValue label="Sync ID" value={selectedApp?.id?.slice(0, 8)} />
                                        <div className="col-span-2 pt-2">
                                            <LabelValue label="Primary Contact" value={selectedApp?.applicantPhone} icon={Phone} />
                                        </div>
                                        <div className="col-span-2">
                                            <LabelValue label="Residential" value={selectedApp?.address} icon={MapPin} />
                                        </div>
                                    </div>
                                </section>

                                {/* Background */}
                                <section>
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-6 italic">
                                        <History size={16} /> Legacy History
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-full p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Prior Institution" value={selectedApp?.lastInstitution} />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Highest Award" value={selectedApp?.highestQualification} />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <LabelValue label="Final Year" value={selectedApp?.completionYear} />
                                        </div>
                                    </div>
                                </section>

                                {/* Emergency */}
                                <section>
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 mb-6 italic">
                                        <Phone size={16} /> Emergency Linkage
                                    </h4>
                                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                        <LabelValue label="Next of Kin" value={selectedApp?.nokName} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <LabelValue label="Relationship" value={selectedApp?.nokRelationship} />
                                            <LabelValue label="Kin Pulse" value={selectedApp?.nokPhone} />
                                        </div>
                                    </div>
                                </section>

                                {/* Message */}
                                {selectedApp?.message && (
                                    <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-4 italic">Applicant Memo</h4>
                                        <p className="text-sm font-bold italic text-slate-300 leading-relaxed uppercase">
                                            "{selectedApp.message}"
                                        </p>
                                    </section>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
