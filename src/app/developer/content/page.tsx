"use client";
import React, { useState } from 'react';
import { useSchoolData, LandingPageRoleContent, FeaturedSchool } from '@/lib/store';
import {
    Plus, Trash2, Upload, X, Image as ImageIcon, Save, Edit3,
    School as SchoolIcon, Layout, Globe, CheckCircle2, RefreshCw,
    GalleryHorizontal, Sparkles, ChevronRight, Camera, Search, MapPin
} from 'lucide-react';

export default function ContentManager() {
    const {
        landingPageContent, updateLandingPageContent,
        featuredSchools, updateFeaturedSchools, deleteFeaturedSchool,
        developerSettings, updateDeveloperSettings
    } = useSchoolData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<LandingPageRoleContent | null>(null);
    const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
    const [schoolFormData, setSchoolFormData] = useState<FeaturedSchool | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const compressImage = (base64: string, maxWidth: number = 1920, quality: number = 0.7): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isSchool: boolean = true, isLogo: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const slimmed = await compressImage(base64String, 1200, 0.7);
            if (isSchool && schoolFormData) {
                if (isLogo) setSchoolFormData({ ...schoolFormData, logo: slimmed });
                else setSchoolFormData({ ...schoolFormData, image: slimmed });
            } else if (!isSchool && formData) {
                setFormData({ ...formData, image: slimmed });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !schoolFormData) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const slimmed = await compressImage(base64String, 1200, 0.7);
                setSchoolFormData(prev => prev ? {
                    ...prev,
                    gallery: [...(prev.gallery || []), slimmed]
                } : null);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeGalleryImage = (index: number) => {
        if (!schoolFormData) return;
        const newGallery = [...(schoolFormData.gallery || [])];
        newGallery.splice(index, 1);
        setSchoolFormData({ ...schoolFormData, gallery: newGallery });
    };

    const handleAddNewSchool = () => {
        const newSchool: FeaturedSchool = {
            id: `sch_${Date.now()}`,
            name: 'New Featured School',
            category: 'Academy',
            image: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800',
            tagline: 'Excellence in Education',
            description: 'A brief description of the school.',
            status: 'Active',
            location: 'Uganda',
            gallery: []
        };
        setEditingSchoolId(newSchool.id);
        setSchoolFormData(newSchool);
    };

    const handleSaveSchool = async () => {
        if (!schoolFormData) return;
        setIsSaving(true);
        try {
            const isNew = !featuredSchools.find(s => s.id === schoolFormData.id);
            const updated = isNew ? [...featuredSchools, schoolFormData] : featuredSchools.map(s => s.id === schoolFormData.id ? schoolFormData : s);
            await updateFeaturedSchools(updated);
            setEditingSchoolId(null);
            setSchoolFormData(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSchool = async (id: string) => {
        if (!window.confirm("Confirm deletion?")) return;
        setIsSaving(true);
        try {
            await deleteFeaturedSchool(id);
            setEditingSchoolId(null);
            setSchoolFormData(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsSaving(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64String = reader.result as string;
                const slimmed = await compressImage(base64String, 1920, 0.7);
                const currentWallpapers = developerSettings?.wallpapers || [];
                await updateDeveloperSettings({ ...developerSettings, wallpapers: [...currentWallpapers, slimmed] });
            } finally { setIsSaving(false); }
        };
        reader.readAsDataURL(file);
    };

    const removeWallpaper = async (index: number) => {
        setIsSaving(true);
        try {
            const currentWallpapers = [...(developerSettings?.wallpapers || [])];
            currentWallpapers.splice(index, 1);
            await updateDeveloperSettings({ ...developerSettings, wallpapers: currentWallpapers });
        } finally { setIsSaving(false); }
    };

    const handleEdit = (role: LandingPageRoleContent) => {
        setEditingId(role.id);
        setFormData({ ...role });
    };

    const handleSave = async () => {
        if (!formData || !editingId) return;
        setIsSaving(true);
        try {
            const updatedContent = landingPageContent.map(item => item.id === editingId ? formData : item);
            await updateLandingPageContent(updatedContent);
            setEditingId(null);
            setFormData(null);
        } finally { setIsSaving(false); }
    };

    const handleChange = (field: keyof LandingPageRoleContent, value: any) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    // --- UI VIEW STATE ---
    const [activeTab, setActiveTab] = useState<'Identity' | 'Schools' | 'Wallpaper'>('Identity');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // --- RENDER HELPERS ---

    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[2px]">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                <Layout size={20} className="text-white" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white leading-none">Developer</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Content Manager</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Contextual Actions based on Tab */}
                    {activeTab === 'Schools' && !editingSchoolId && (
                        <button onClick={handleAddNewSchool} className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">
                            <Plus size={20} />
                        </button>
                    )}
                    {activeTab === 'Wallpaper' && (
                        <label className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 shadow-lg shadow-blue-900/20 cursor-pointer">
                            <Camera size={20} />
                            <input type="file" accept="image/*" onChange={handleWallpaperUpload} className="hidden" disabled={isSaving} />
                        </label>
                    )}
                </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="flex items-center px-4 mt-2 gap-2 overflow-x-auto no-scrollbar">
                {[
                    { id: 'Identity', icon: Sparkles, label: 'Identity' },
                    { id: 'Schools', icon: SchoolIcon, label: 'Schools' },
                    { id: 'Wallpaper', icon: GalleryHorizontal, label: 'Wallpapers' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-lg'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {isSaving && (
                <div className="absolute top-full left-0 right-0 bg-blue-600/10 backdrop-blur-sm h-1">
                    <div className="h-full bg-blue-500 animate-progress origin-left"></div>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-full bg-black min-h-screen text-slate-200 pb-20">
            {renderHeader()}

            <div className="px-4 py-6 space-y-6">

                {/* --- TAB: IDENTITY --- */}
                {activeTab === 'Identity' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {landingPageContent.map((role) => (
                            <div key={role.id} className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all">
                                {/* Edit Mode */}
                                {editingId === role.id ? (
                                    <div className="p-4 space-y-4">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                                            <img src={formData?.image} className="w-full h-full object-cover opacity-50" />
                                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                                                <Camera size={24} className="text-white mb-2" />
                                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">Change Image</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                                            </label>
                                        </div>
                                        <div className="space-y-3">
                                            <input
                                                value={formData?.title}
                                                onChange={(e) => handleChange('title', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                                                placeholder="Title"
                                            />
                                            <input
                                                value={formData?.tagline}
                                                onChange={(e) => handleChange('tagline', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-blue-400 placeholder-slate-600 focus:border-blue-500 outline-none"
                                                placeholder="Tagline"
                                            />
                                            <textarea
                                                value={formData?.description}
                                                onChange={(e) => handleChange('description', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-blue-500 outline-none min-h-[80px]"
                                                placeholder="Description"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                                <CheckCircle2 size={14} /> Save
                                            </button>
                                            <button onClick={() => { setEditingId(null); setFormData(null); }} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <>
                                        <div className="relative aspect-video">
                                            <img src={role.image} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                                {role.id}
                                            </div>
                                            <button
                                                onClick={() => handleEdit(role)}
                                                className="absolute top-3 right-3 p-2 bg-slate-900/80 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>
                                        <div className="p-4 relative -mt-6">
                                            <h3 className="text-lg font-black text-white italic uppercase tracking-tight">{role.title}</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 mb-2" style={{ color: role.theme }}>{role.tagline}</p>
                                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{role.description}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* --- TAB: SCHOOLS --- */}
                {activeTab === 'Schools' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Render New School Form if adding */}
                        {editingSchoolId && !featuredSchools.find(s => s.id === editingSchoolId) && (
                            <div className="bg-slate-900 rounded-2xl border border-emerald-500/50 overflow-hidden shadow-2xl shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-1 bg-emerald-500 text-black text-[10px] font-black uppercase rounded">New Registration</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Logo</label>
                                            <div className="w-16 h-16 bg-black rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative group/logo cursor-pointer">
                                                {schoolFormData?.logo ? <img src={schoolFormData.logo} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-slate-700" />}
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Cover</label>
                                            <div className="h-16 bg-black rounded-xl border border-slate-800 overflow-hidden relative group/cover cursor-pointer">
                                                <img src={schoolFormData?.image} className="w-full h-full object-cover opacity-50" />
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true, false)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            value={schoolFormData?.name}
                                            onChange={(e) => setSchoolFormData({ ...schoolFormData!, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
                                            placeholder="School Name"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                value={schoolFormData?.category}
                                                onChange={(e) => setSchoolFormData({ ...schoolFormData!, category: e.target.value })}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 placeholder-slate-600 outline-none"
                                                placeholder="Category"
                                            />
                                            <input
                                                value={schoolFormData?.location}
                                                onChange={(e) => setSchoolFormData({ ...schoolFormData!, location: e.target.value })}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 placeholder-slate-600 outline-none"
                                                placeholder="Location"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                                        <button onClick={handleSaveSchool} disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSaving ? 'Saving...' : 'Establish School'}
                                        </button>
                                        <button onClick={() => { setEditingSchoolId(null); setSchoolFormData(null); }} className="px-3 bg-slate-800 text-slate-400 py-2 rounded-lg">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {featuredSchools.length === 0 && !editingSchoolId && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                <SchoolIcon size={48} className="mb-4 opacity-50" />
                                <p className="text-sm font-medium">No schools configured</p>
                                <button onClick={handleAddNewSchool} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-700">
                                    Add First School
                                </button>
                            </div>
                        )}

                        {featuredSchools.map((school) => (
                            <div key={school.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                                {editingSchoolId === school.id ? (
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Logo</label>
                                                <div className="w-16 h-16 bg-black rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative group/logo cursor-pointer">
                                                    {schoolFormData?.logo ? <img src={schoolFormData.logo} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-slate-700" />}
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Cover</label>
                                                <div className="h-16 bg-black rounded-xl border border-slate-800 overflow-hidden relative group/cover cursor-pointer">
                                                    <img src={schoolFormData?.image} className="w-full h-full object-cover opacity-50" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true, false)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <input
                                                value={schoolFormData?.name}
                                                onChange={(e) => setSchoolFormData({ ...schoolFormData!, name: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
                                                placeholder="School Name"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    value={schoolFormData?.category}
                                                    onChange={(e) => setSchoolFormData({ ...schoolFormData!, category: e.target.value })}
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 placeholder-slate-600 outline-none"
                                                    placeholder="Category"
                                                />
                                                <input
                                                    value={schoolFormData?.location}
                                                    onChange={(e) => setSchoolFormData({ ...schoolFormData!, location: e.target.value })}
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 placeholder-slate-600 outline-none"
                                                    placeholder="Location"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2 flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Gallery ({schoolFormData?.gallery?.length || 0})</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {(schoolFormData?.gallery || []).map((img, idx) => (
                                                    <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 group/gal">
                                                        <img src={img} className="w-full h-full object-cover" />
                                                        <button onClick={() => removeGalleryImage(idx)} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/gal:opacity-100 transition-opacity">
                                                            <X size={12} className="text-white" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="w-12 h-12 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-500 cursor-pointer shrink-0">
                                                    <Plus size={16} />
                                                    <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-slate-800">
                                            <button onClick={handleSaveSchool} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                Save
                                            </button>
                                            <button onClick={() => handleDeleteSchool(school.id)} className="px-3 bg-red-900/30 text-red-500 hover:bg-red-900/50 py-2 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                            <button onClick={() => { setEditingSchoolId(null); setSchoolFormData(null); }} className="px-3 bg-slate-800 text-slate-400 py-2 rounded-lg">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="p-4 flex gap-4">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 bg-black">
                                            <img src={school.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-white truncate">{school.name}</h3>
                                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">{school.category}</p>
                                                </div>
                                                <button onClick={() => { setEditingSchoolId(school.id); setSchoolFormData({ ...school }); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2 line-clamp-1 flex items-center gap-1">
                                                <MapPin size={10} /> {school.location}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                        }
                    </div>
                )}

                {/* --- TAB: WALLPAPERS --- */}
                {activeTab === 'Wallpaper' && (
                    <div className="grid grid-cols-2 gap-3 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {developerSettings?.wallpapers?.map((url, idx) => (
                            <div key={idx} className="relative aspect-[9/16] rounded-xl overflow-hidden group bg-slate-900 border border-slate-800">
                                <img src={url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => removeWallpaper(idx)} className="p-2 bg-red-600 rounded-full text-white shadow-lg hover:scale-110 transition-transform">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <label className="aspect-[9/16] rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-all cursor-pointer bg-slate-900/50">
                            <Plus size={24} />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Add New</span>
                            <input type="file" accept="image/*" onChange={handleWallpaperUpload} className="hidden" disabled={isSaving} />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}
