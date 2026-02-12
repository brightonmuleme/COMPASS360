"use client";
import React, { useState } from 'react';
import { useSchoolData, formatMoney } from "@/lib/store";
import {
    Settings,
    Zap,
    CheckCircle2,
    AlertCircle,
    Info,
    Loader2,
    Plus,
    X,
    ShieldCheck,
    Users,
    Video,
    FileText
} from "lucide-react";

export default function TutorSettingsPage() {
    const { tutors, tutorProfile, updateTutor } = useSchoolData();
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const tutor = tutors.find(t => t.id === tutorProfile?.id) || (tutorProfile?.id ? {
        id: tutorProfile.id,
        name: tutorProfile.name || 'Tutor',
        subscriptionPrice: 3500,
        subscriptionDuration: '6 Months',
        coveredServices: [],
        stats: { uploads: 0 }
    } as any : null);

    const [price, setPrice] = useState(tutor?.subscriptionPrice || 3500);
    const [duration, setDuration] = useState(tutor?.subscriptionDuration || '6 Months');
    const [coveredServices, setCoveredServices] = useState<string[]>(tutor?.coveredServices || []);
    const [newService, setNewService] = useState('');

    if (!tutor) return <div className="p-8 text-gray-400">Loading settings...</div>;

    const handleAddService = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newService.trim()) return;
        if (coveredServices.includes(newService.trim())) {
            setNewService('');
            return;
        }
        setCoveredServices([...coveredServices, newService.trim()]);
        setNewService('');
    };

    const removeService = (tag: string) => {
        setCoveredServices(coveredServices.filter(s => s !== tag));
    };

    const handleSave = async () => {
        if (price < 3000) {
            alert("Minimum price is 3,000 UGX");
            return;
        }

        setIsSaving(true);
        try {
            updateTutor({
                ...tutor,
                subscriptionPrice: price,
                subscriptionDuration: duration as any,
                coveredServices: coveredServices
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <header>
                <h1 className="text-4xl font-black text-white tracking-tight">Tutor Pass Identity</h1>
                <p className="text-gray-500 font-medium">Define your value and preview your digital pass card.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* LEFT: SETTINGS */}
                <div className="space-y-8">
                    <div className="bg-[#0f0f0f] p-8 rounded-[2.5rem] border border-gray-800 space-y-8">
                        {/* Pricing Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Zap size={16} className="text-red-500" /> Tiered Pricing
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Choose the price students pay to unlock your premium content library.
                            </p>

                            <div className="pt-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Monthly/Fixed Price (UGX)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="w-full bg-black border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-red-500 transition-all font-black text-2xl text-white"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 font-black">UGX</div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Access Duration</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['1 Month', '3 Months', '6 Months'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d as any)}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${duration === d ? 'bg-red-600 border-red-600 text-white' : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Coverage Section */}
                        <div className="space-y-6 pt-6 border-t border-gray-900">
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-500" /> Included Services
                                </h3>
                                <p className="text-xs text-gray-500">Add the Programmes or Course Units that this pass covers.</p>
                            </div>

                            <form onSubmit={handleAddService} className="relative">
                                <input
                                    type="text"
                                    placeholder="Type a Course Unit and press Enter..."
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all text-sm text-gray-300"
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white">
                                    <Plus size={18} />
                                </button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {coveredServices.map(tag => (
                                    <span key={tag} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                                        {tag}
                                        <button onClick={() => removeService(tag)} className="hover:text-white">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {coveredServices.length === 0 && (
                                    <p className="text-[10px] text-gray-600 italic">No services listed. Add some to show value to students.</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-900 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : (saved ? <CheckCircle2 size={16} /> : <Settings size={16} />)}
                                {saved ? 'Pass ID Validated' : 'Save Pass Identity'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: LIVE PREVIEW */}
                <div className="sticky top-8 h-fit">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 block text-center">Student-Facing Pass Preview</label>
                    <div className="relative group">
                        {/* THE CARD */}
                        <div className="aspect-[1.58/1] w-full max-w-lg mx-auto bg-[#050505] rounded-[2.5rem] border border-white/10 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all group-hover:shadow-blue-500/10 group-hover:border-white/20">
                            {/* Improved Decorative Blobs */}
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full animate-pulse" />
                            <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-purple-600/15 blur-[100px] rounded-full" />

                            {/* Subtle Glassmorphism Inner Border */}
                            <div className="absolute inset-2 rounded-[2rem] border border-white/5 pointer-events-none" />

                            <div className="relative h-full flex flex-col justify-between z-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-blue-500/20">
                                                {tutor.name[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-white font-black text-base tracking-tight">{tutor.name}</span>
                                                    <ShieldCheck size={16} className="text-blue-500" />
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tutor.department || 'Independent Creator'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white">{formatMoney(price)}</div>
                                        <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{duration} ACCESS</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-[1px] flex-1 bg-gray-800" />
                                        <span>Pass Coverage</span>
                                        <div className="h-[1px] flex-1 bg-gray-800" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {coveredServices.slice(0, 4).map(s => (
                                            <span key={s} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-300 backdrop-blur-md">
                                                {s}
                                            </span>
                                        ))}
                                        {coveredServices.length > 4 && (
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">+{coveredServices.length - 4} more</span>
                                        )}
                                        {coveredServices.length === 0 && (
                                            <span className="text-[10px] text-gray-600 font-medium italic">Full Content Library Access</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end pt-6 border-t border-white/5 mt-4">
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-400 transition-colors">
                                            <Video size={14} />
                                            <span className="text-[11px] font-black uppercase tracking-tighter">{tutor.stats?.uploads || 0} Lessons</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FileText size={14} />
                                            <span className="text-[11px] font-black uppercase tracking-tighter">Resources</span>
                                        </div>
                                    </div>
                                    <button className="bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 text-white text-[10px] font-black uppercase tracking-[0.15em] px-8 py-3.5 rounded-2xl transition-all shadow-[0_10px_25px_rgba(37,99,235,0.3)]">
                                        Buy Pass
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Floating Tooltip */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black border border-gray-800 px-4 py-2 rounded-full flex items-center gap-3 shadow-xl backdrop-blur-md">
                            <Users size={14} className="text-green-500" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">2.4k Students Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
