"use client";
import React, { useEffect, useState } from 'react';
import { developerService } from '@/services/developerService';
import {
    Settings,
    Save,
    Bell,
    Shield,
    Globe,
    Palette,
    MessageSquare,
    Zap,
    Lock,
    Eye,
    RefreshCw,
    Terminal,
    Cpu,
    Database,
    Cloud,
    CheckCircle2
} from 'lucide-react';

export default function GlobalSettingsPage() {
    const [settings, setSettings] = useState<any>({
        siteName: 'Compass 360',
        maintenanceMode: false,
        allowRegistration: true,
        primaryColor: '#3b82f6',
        supportEmail: 'support@vine.ac.ug',
        systemVersion: '1.2.5'
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await developerService.updateGlobalSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error(error);
            alert("Failed to save settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                        System <span className="text-red-600">Settings</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-12 h-[1px] bg-red-600"></span>
                        Platform Logic & Global Variables
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`
                        flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95
                        ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'}
                        ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : (saved ? <CheckCircle2 size={16} /> : <Save size={16} />)}
                    {saved ? 'Synchronized' : 'Execute Update'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Config */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform" />

                    <div className="relative z-10">
                        <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest italic">
                            <div className="p-2 bg-slate-900 text-white rounded-xl group-hover:bg-red-600 transition-colors">
                                <Globe size={16} />
                            </div>
                            Core Environment
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Platform Alias</label>
                                <input
                                    type="text"
                                    value={settings.siteName}
                                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all italic uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">NOC Support Email</label>
                                <input
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-500 transition-all italic uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Toggles */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform" />

                    <div className="relative z-10">
                        <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest italic">
                            <div className="p-2 bg-slate-900 text-white rounded-xl group-hover:bg-amber-500 transition-colors">
                                <Shield size={16} />
                            </div>
                            Security Toggles
                        </h3>

                        <div className="space-y-8">
                            <div className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group/item">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Stasis Mode</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase leading-tight max-w-[200px]">Restrict platform access to root level only.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.maintenanceMode}
                                        onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                                </label>
                            </div>

                            <div className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group/item">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Open Registry</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase leading-tight max-w-[200px]">Onboard new entities to the ecosystem.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowRegistration}
                                        onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Infrastructure Details */}
                <div className="md:col-span-2 bg-[#0d0d0d] p-8 md:p-12 rounded-[3rem] text-white overflow-hidden relative">
                    <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-red-600/10 rounded-full blur-[80px]" />
                    <div className="absolute -left-16 -top-16 w-64 h-64 bg-slate-600/10 rounded-full blur-[80px]" />

                    <div className="relative z-10 flex flex-col lg:flex-row gap-12">
                        <div className="lg:w-1/3">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-red-600 rounded-2xl shadow-xl shadow-red-600/20">
                                    <Terminal size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Infrastructure</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Core Engine Specifications</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase italic">
                                Critical server-side parameters and API handshake protocols. Modify with extreme caution as these affect production stability.
                            </p>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest italic">
                                    <Cloud size={14} /> Data Cloud URL
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value="https://ccxgdztlplwtaznwrfyr.supabase.co"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono font-bold text-slate-400 outline-none"
                                    />
                                    <Eye size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                </div>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest italic">
                                    <Cpu size={14} /> Engine Hash
                                </div>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono font-black text-blue-400 italic">
                                        v{settings.systemVersion}-STABLE
                                    </code>
                                    <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                        <Database size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest italic">Database</div>
                                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Status: Online</div>
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                            </div>

                            <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-slate-800 text-slate-400 rounded-xl">
                                        <RefreshCw size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest italic">Cache</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Last Scanned: 2m ago</div>
                                    </div>
                                </div>
                                <button className="text-[9px] font-black uppercase text-red-500 hover:underline tracking-widest italic">Purge Buffer</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
