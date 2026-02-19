"use client";
import React, { useState } from 'react';
import { useSchoolData, AppUpdate, AppOffer } from '@/lib/store';
import {
    Plus, Trash2, Edit2, Save, X, Megaphone, Tag,
    Calendar, Layout, ArrowLeft, Sparkles, Zap,
    TrendingUp, Shield, Bell, CheckCircle2, Search
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardContentManager() {
    const {
        appUpdates, addAppUpdate, updateAppUpdate, deleteAppUpdate,
        appOffers, addAppOffer, updateAppOffer, deleteAppOffer
    } = useSchoolData();

    const [activeTab, setActiveTab] = useState<'updates' | 'offers'>('updates');
    const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null);
    const [editingOffer, setEditingOffer] = useState<AppOffer | null>(null);
    const [isAddingUpdate, setIsAddingUpdate] = useState(false);
    const [isAddingOffer, setIsAddingOffer] = useState(false);

    const emptyUpdate: AppUpdate = {
        id: crypto.randomUUID(),
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        type: 'News',
        color: '#3b82f6'
    };

    const emptyOffer: AppOffer = {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        code: '',
        expiry: ''
    };

    const [updateForm, setUpdateForm] = useState<AppUpdate>(emptyUpdate);
    const [offerForm, setOfferForm] = useState<AppOffer>(emptyOffer);

    const handleSaveUpdate = () => {
        if (!updateForm.title || !updateForm.content) return;
        if (editingUpdate) updateAppUpdate(updateForm);
        else addAppUpdate(updateForm);
        setEditingUpdate(null);
        setIsAddingUpdate(false);
        setUpdateForm(emptyUpdate);
    };

    const handleSaveOffer = () => {
        if (!offerForm.title || !offerForm.code) return;
        if (editingOffer) updateAppOffer(offerForm);
        else addAppOffer(offerForm);
        setEditingOffer(null);
        setIsAddingOffer(false);
        setOfferForm(emptyOffer);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/developer" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={24} className="text-slate-600" />
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Internal <span className="text-amber-500">Comms</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-12 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-amber-500"></span>
                        Student Dashboard Announcements
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('updates')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'updates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('offers')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'offers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Campaigns
                    </button>
                </div>
            </div>

            {/* TAB: UPDATES */}
            {activeTab === 'updates' && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Megaphone className="text-blue-600" size={20} />
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Live Broadcasts</h2>
                        </div>
                        {!isAddingUpdate && (
                            <button
                                onClick={() => { setIsAddingUpdate(true); setUpdateForm(emptyUpdate); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
                            >
                                <Plus size={14} /> New Beacon
                            </button>
                        )}
                    </div>

                    {isAddingUpdate && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-500/5 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black italic uppercase tracking-tighter">{editingUpdate ? 'Modify Signal' : 'Initialize Broadcast'}</h3>
                                <button onClick={() => setIsAddingUpdate(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Transmission Header</label>
                                        <input
                                            type="text"
                                            value={updateForm.title}
                                            onChange={e => setUpdateForm({ ...updateForm, title: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase italic focus:outline-none focus:border-blue-500"
                                            placeholder="BROADCAST TITLE..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Temporal Date</label>
                                            <input type="date" value={updateForm.date} onChange={e => setUpdateForm({ ...updateForm, date: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic focus:outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Signal Type</label>
                                            <select value={updateForm.type} onChange={e => setUpdateForm({ ...updateForm, type: e.target.value as any })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic focus:outline-none">
                                                <option value="Update">SYSTEM UPDATE</option>
                                                <option value="Alert">CRITICAL ALERT</option>
                                                <option value="Offer">MARKET OFFER</option>
                                                <option value="News">GLOBAL NEWS</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Core Narrative</label>
                                        <textarea
                                            rows={5}
                                            value={updateForm.content}
                                            onChange={e => setUpdateForm({ ...updateForm, content: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:border-blue-500"
                                            placeholder="Transmitting details to all nodes..."
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aura Tag</label>
                                            <input type="color" value={updateForm.color} onChange={e => setUpdateForm({ ...updateForm, color: e.target.value })} className="w-12 h-8 p-1 rounded-lg cursor-pointer bg-white border border-slate-200" />
                                        </div>
                                        <button onClick={handleSaveUpdate} className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/10">
                                            <Zap size={16} className="text-amber-500" />
                                            {editingUpdate ? 'Sync Signal' : 'Broadcast Pulse'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {appUpdates.map(u => (
                            <div key={u.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="w-1.5 h-16 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: u.color }}>{u.type}</span>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{u.date}</span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-900 uppercase italic tracking-tight">{u.title}</h4>
                                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1 max-w-2xl">{u.content}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingUpdate(u); setUpdateForm(u); setIsAddingUpdate(true); }} className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteAppUpdate(u.id)} className="p-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: OFFERS */}
            {activeTab === 'offers' && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="text-pink-600" size={20} />
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Growth Campaigns</h2>
                        </div>
                        {!isAddingOffer && (
                            <button
                                onClick={() => { setIsAddingOffer(true); setOfferForm(emptyOffer); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-700 transition-all shadow-lg shadow-pink-600/10"
                            >
                                <Plus size={14} /> New Campaign
                            </button>
                        )}
                    </div>

                    {isAddingOffer && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-pink-100 shadow-xl shadow-pink-500/5 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black italic uppercase tracking-tighter">{editingOffer ? 'Recalibrate Offer' : 'Launch New Campaign'}</h3>
                                <button onClick={() => setIsAddingOffer(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Reward Header</label>
                                        <input type="text" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase italic focus:outline-none focus:border-pink-500" placeholder="e.g. 50% TUITION REBATE..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Activation Hash</label>
                                            <input type="text" value={offerForm.code} onChange={e => setOfferForm({ ...offerForm, code: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic focus:outline-none" placeholder="VINE-2024" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Stasis Deadline</label>
                                            <input type="text" value={offerForm.expiry} onChange={e => setOfferForm({ ...offerForm, expiry: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic focus:outline-none" placeholder="72 Hours Remaining" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Value Proposition</label>
                                        <textarea rows={3} value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:border-pink-500" placeholder="Summarize the utility gain for students..." />
                                    </div>
                                    <button onClick={handleSaveOffer} className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-pink-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-700 shadow-xl shadow-pink-600/10">
                                        <CheckCircle2 size={16} />
                                        {editingOffer ? 'Authorize Update' : 'Initialize Protocol'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {appOffers.map(o => (
                            <div key={o.id} className="relative group p-8 rounded-[3rem] text-white overflow-hidden shadow-2xl shadow-pink-500/20" style={{ background: 'linear-gradient(135deg, #be185d 0%, #db2777 100%)' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0" />
                                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-2xl" />

                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Tag size={20} className="text-white" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingOffer(o); setOfferForm(o); setIsAddingOffer(true); }} className="p-2 bg-white/10 hover:bg-white/30 rounded-lg transition-all"><Edit2 size={14} /></button>
                                            <button onClick={() => deleteAppOffer(o.id)} className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2 mb-8">
                                        <h4 className="text-xl font-black italic uppercase tracking-tighter leading-tight">{o.title}</h4>
                                        <p className="text-[10px] font-bold uppercase opacity-80 leading-relaxed">{o.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                                        <div className="px-5 py-2.5 bg-black/20 rounded-xl text-[11px] font-mono font-black text-pink-100 tracking-[0.2em]">{o.code}</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest bg-white text-pink-600 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">{o.expiry}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {appOffers.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                <Tag className="mx-auto mb-4 text-slate-200" size={40} />
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No active campaigns in deployment</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
