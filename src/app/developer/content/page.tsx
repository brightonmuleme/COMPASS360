"use client";
import React, { useState } from 'react';
import { useSchoolData, LandingPageRoleContent, FeaturedSchool } from '@/lib/store';

export default function ContentManager() {
    const {
        landingPageContent, updateLandingPageContent,
        featuredSchools, updateFeaturedSchools,
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
                if (isLogo) {
                    setSchoolFormData({ ...schoolFormData, logo: slimmed });
                } else {
                    setSchoolFormData({ ...schoolFormData, image: slimmed });
                }
            } else if (!isSchool && formData) {
                setFormData({ ...formData, image: slimmed });
            }
        };
        reader.readAsDataURL(file);
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
                await updateDeveloperSettings({
                    ...developerSettings,
                    wallpapers: [...currentWallpapers, slimmed]
                });
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const removeWallpaper = async (index: number) => {
        setIsSaving(true);
        try {
            const currentWallpapers = [...(developerSettings?.wallpapers || [])];
            currentWallpapers.splice(index, 1);
            await updateDeveloperSettings({
                ...developerSettings,
                wallpapers: currentWallpapers
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (role: LandingPageRoleContent) => {
        setEditingId(role.id);
        setFormData({ ...role });
    };

    const handleSave = async () => {
        if (!formData || !editingId) return;

        setIsSaving(true);
        try {
            const updatedContent = landingPageContent.map(item =>
                item.id === editingId ? formData : item
            );

            await updateLandingPageContent(updatedContent);
            setEditingId(null);
            setFormData(null);
            alert("Landing Page Content Updated!");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof LandingPageRoleContent, value: any) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    const handleFeatureChange = (index: number, value: string) => {
        if (!formData) return;
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0', color: '#0f172a' }}>Landing Page Content</h1>
                {isSaving && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%' }} className="animate-spin" />
                        SYNCING TO CLOUD...
                    </div>
                )}
            </div>

            {/* Backdrop Wallpapers Section */}
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '2rem',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)',
                border: '1px solid #f1f5f9',
                marginBottom: '3rem',
                opacity: isSaving ? 0.6 : 1,
                pointerEvents: isSaving ? 'none' : 'auto',
                transition: 'opacity 0.2s'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '900', color: '#0f172a' }}>Hero Background Wallpapers</h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>These images will cycle in a cinematic slideshow on the landing page.</p>
                    </div>
                    <label style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '1rem',
                        background: isSaving ? '#94a3b8' : '#3b82f6',
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s'
                    }}>
                        {isSaving ? 'Processing...' : 'Add Wallpaper'}
                        <input type="file" accept="image/*" onChange={handleWallpaperUpload} style={{ display: 'none' }} disabled={isSaving} />
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                    {(developerSettings?.wallpapers || []).map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: '1.5rem', overflow: 'hidden', height: '120px', border: '1px solid #f1f5f9' }}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                                onClick={() => removeWallpaper(idx)}
                                style={{
                                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    background: 'rgba(255,0,0,0.8)', color: 'white',
                                    border: 'none', cursor: 'pointer', fontSize: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}
                            >✕</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Portal Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginBottom: '4rem' }}>
                {landingPageContent.map((role) => {
                    const isEditing = editingId === role.id;

                    return (
                        <div key={role.id} style={{
                            background: 'white',
                            padding: '2.5rem',
                            borderRadius: '2rem',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)',
                            border: '1px solid #f1f5f9'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '1rem', background: role.theme,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                        fontWeight: '900', fontSize: '1.2rem'
                                    }}>
                                        {role.id[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.1rem', margin: 0, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.05em', color: '#1e293b' }}>
                                            {role.id} Identity
                                        </h2>
                                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                                            Portal Landing Section
                                        </p>
                                    </div>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => handleEdit(role)}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            background: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: '#64748b'
                                        }}
                                    >
                                        Edit Content
                                    </button>
                                )}
                            </div>

                            {isEditing && formData ? (
                                <div style={{ display: 'grid', gap: '2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Hero Title</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => handleChange('title', e.target.value)}
                                                style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Accent Tagline</label>
                                            <input
                                                type="text"
                                                value={formData.tagline}
                                                onChange={(e) => handleChange('tagline', e.target.value)}
                                                style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600', color: role.theme }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Marketing Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', minHeight: '100px', fontSize: '0.9rem', lineHeight: '1.6', color: '#475569' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Visual Asset</label>
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, false)}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                                                />
                                            </div>
                                            <div style={{ width: '140px', height: '100px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                                <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button
                                            onClick={handleSave}
                                            style={{ padding: '1rem 2.5rem', borderRadius: '1rem', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase' }}
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setFormData(null); }}
                                            style={{ padding: '1rem 2.5rem', borderRadius: '1rem', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>{role.title}</h3>
                                        <p style={{ margin: '0 0 1.25rem 0', color: role.theme, fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase' }}>{role.tagline}</p>
                                        <p style={{ margin: 0, color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: '500' }}>{role.description}</p>
                                    </div>
                                    <div style={{ width: '240px', flexShrink: 0 }}>
                                        <img src={role.image} alt={role.title} style={{ width: '100%', borderRadius: '1.5rem', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '4px solid white' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Discover Top Schools Section */}
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '2rem', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', marginBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', background: '#0f172a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            🏫
                        </div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '900', color: '#0f172a' }}>Featured Schools Directory</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {featuredSchools.map((school: FeaturedSchool) => {
                        const isEditingSchool = editingSchoolId === school.id;

                        return (
                            <div key={school.id} style={{ border: '1px solid #f1f5f9', borderRadius: '1.5rem', padding: '1.5rem' }}>
                                {isEditingSchool ? (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <input
                                            type="text"
                                            value={schoolFormData?.name || ''}
                                            onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    if (!schoolFormData) return;
                                                    const updated = featuredSchools.map((s: FeaturedSchool) => s.id === school.id ? schoolFormData : s);
                                                    updateFeaturedSchools(updated);
                                                    setEditingSchoolId(null);
                                                    setSchoolFormData(null);
                                                }}
                                                style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setEditingSchoolId(null); setSchoolFormData(null); }}
                                                style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ width: '80px', height: '60px', borderRadius: '1rem', overflow: 'hidden', background: '#f8fafc' }}>
                                            <img src={school.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{school.name}</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{school.category} • {school.tagline}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingSchoolId(school.id);
                                                setSchoolFormData({ ...school });
                                            }}
                                            style={{ padding: '0.4rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', color: '#64748b' }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
