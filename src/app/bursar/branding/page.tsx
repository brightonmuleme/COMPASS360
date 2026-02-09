"use client";

import { useState, useRef, useEffect } from 'react';
import { useSchoolData } from '@/lib/store';
import { Layout, Image as ImageIcon, Type, Palette, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function PortalBrandingPage() {
    const { portalBranding, updatePortalBranding } = useSchoolData();

    const [formData, setFormData] = useState(portalBranding);
    const [logoPreview, setLogoPreview] = useState<string | null>(portalBranding.logo || null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(portalBranding);
        setLogoPreview(portalBranding.logo || null);
    }, [portalBranding]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit for portal logo
                setStatus({ type: 'error', message: 'Logo must be under 1MB' });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setFormData(prev => ({ ...prev, logo: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!formData.schoolName.trim()) {
            setStatus({ type: 'error', message: 'School Name cannot be empty' });
            return;
        }

        setIsSaving(true);
        updatePortalBranding(formData);

        setTimeout(() => {
            setIsSaving(false);
            setStatus({ type: 'success', message: 'Portal Branding updated! These changes are now live on the staff landing page.' });
        }, 800);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Notification */}
            {status && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-10 duration-300 ${status.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{status.message}</span>
                    <button onClick={() => setStatus(null)} className="ml-4 opacity-50 hover:opacity-100">&times;</button>
                </div>
            )}

            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                        <Layout size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Portal Branding</h1>
                        <p className="text-slate-400 font-medium">Control the "Front Door" of your school system</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-white hover:bg-slate-100 text-slate-950 font-bold px-8 py-3.5 rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                    {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? "Publishing..." : "Publish Branding"}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Preview Card */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-8 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Live Preview
                        </h2>

                        {/* Mock Login Page Header */}
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-8 text-center">
                            <div className="w-20 h-20 mx-auto bg-slate-900 border border-slate-800 rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon size={32} className="text-slate-700" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                                {formData.schoolName || "Your School Name"}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                                {formData.tagline || "Your Portal Tagline"}
                            </p>
                        </div>

                        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-[11px] text-amber-500 leading-relaxed font-medium">
                                <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
                                <strong>Director Note:</strong> This branding ONLY applies to the Staff Landing page and Security Modals. It won't change your internal paperwork.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Identity Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Type size={20} className="text-indigo-400" />
                            Core Identity
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Institutional Name</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    placeholder="e.g. Vine International School"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Portal Tagline</label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={formData.tagline}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="e.g. Select your role to access the system"
                                />
                                <p className="mt-2 text-[10px] text-slate-500 font-medium">This appears right under the school name on the login page.</p>
                            </div>
                        </div>
                    </div>

                    {/* Logo Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <ImageIcon size={20} className="text-indigo-400" />
                            Portal Logo
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-900 transition-all group overflow-hidden"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-600 group-hover:text-indigo-400">
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <h4 className="text-white font-bold mb-1">Upload Institutional Logo</h4>
                                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                    Square format (1:1) works best. PNG or SVG with a transparent background is recommended for a premium look.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs font-bold text-indigo-400 hover:text-white transition-colors"
                                    >
                                        Browse Files
                                    </button>
                                    <span className="text-slate-800">|</span>
                                    <button
                                        onClick={() => { setLogoPreview(null); setFormData(p => ({ ...p, logo: undefined })); }}
                                        className="text-xs font-bold text-slate-600 hover:text-rose-400 transition-colors"
                                    >
                                        Remove Logo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Theme Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Palette size={20} className="text-indigo-400" />
                            Brand Color
                        </h3>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div
                                    className="w-12 h-12 rounded-2xl border-2 border-slate-800"
                                    style={{ backgroundColor: formData.primaryColor }}
                                />
                                <input
                                    type="color"
                                    name="primaryColor"
                                    value={formData.primaryColor}
                                    onChange={handleChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    name="primaryColor"
                                    value={formData.primaryColor}
                                    onChange={handleChange}
                                    className="bg-transparent border-b border-slate-800 text-slate-300 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors py-1"
                                />
                                <p className="mt-1 text-[10px] text-slate-500 font-medium tracking-tight">System primary accent color for the landing page grid cards.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
