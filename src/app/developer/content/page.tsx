"use client";
import React, { useState } from 'react';
import { useSchoolData, LandingPageRoleContent, FeaturedSchool } from '@/lib/store';

export default function ContentManager() {
    const { landingPageContent, updateLandingPageContent, featuredSchools, updateFeaturedSchools } = useSchoolData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<LandingPageRoleContent | null>(null);

    // School Editing State
    const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
    const [schoolFormData, setSchoolFormData] = useState<FeaturedSchool | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isSchool: boolean = true, isLogo: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (isSchool && schoolFormData) {
                if (isLogo) {
                    setSchoolFormData({ ...schoolFormData, logo: base64String });
                } else {
                    setSchoolFormData({ ...schoolFormData, image: base64String });
                }
            } else if (!isSchool && formData) {
                setFormData({ ...formData, image: base64String });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEdit = (role: LandingPageRoleContent) => {
        setEditingId(role.id);
        setFormData({ ...role }); // Clone Deeply if needed, but shallow is fine for strings
    };

    const handleSave = () => {
        if (!formData || !editingId) return;

        const updatedContent = landingPageContent.map(item =>
            item.id === editingId ? formData : item
        );

        updateLandingPageContent(updatedContent);
        setEditingId(null);
        setFormData(null);
        alert("Landing Page Content Updated!");
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
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Landing Page Content</h1>

            {/* Portal Sections (Existing) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {landingPageContent.map((role) => {
                    const isEditing = editingId === role.id;

                    return (
                        <div key={role.id} style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', background: role.theme,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                                    }}>
                                        {role.id[0].toUpperCase()}
                                    </div>
                                    <h2 style={{ fontSize: '1.2rem', margin: 0, textTransform: 'capitalize' }}>{role.id} Portal Section</h2>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => handleEdit(role)}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: 'white' }}
                                    >
                                        Edit Content
                                    </button>
                                )}
                            </div>

                            {isEditing && formData ? (
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>Heading Title</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>Tagline</label>
                                        <input
                                            type="text"
                                            value={formData.tagline}
                                            onChange={(e) => handleChange('tagline', e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>Hero Image</label>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, false)}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Or enter URL"
                                                    value={formData.image}
                                                    onChange={(e) => handleChange('image', e.target.value)}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}
                                                />
                                            </div>
                                            {/* Preview */}
                                            <div style={{
                                                width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden',
                                                border: '1px solid #eee', background: '#f8fafc', flexShrink: 0
                                            }}>
                                                <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image'} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>Key Features (Display 4)</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {formData.features.map((feat, idx) => (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    value={feat}
                                                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button
                                            onClick={handleSave}
                                            style={{ padding: '0.75rem 2rem', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setFormData(null); }}
                                            style={{ padding: '0.75rem 2rem', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '2rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{role.title}</h3>
                                        <p style={{ margin: '0 0 1rem 0', color: role.theme, fontWeight: 'bold' }}>{role.tagline}</p>
                                        <p style={{ opacity: 0.7 }}>{role.description}</p>
                                    </div>
                                    <div style={{ width: '200px' }}>
                                        <img src={role.image} alt={role.title} style={{ width: '100%', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Discover Top Schools Section */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px', background: '#000',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                🏫
                            </div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Discover Top Schools Section</h2>
                        </div>
                        <button
                            onClick={() => {
                                const newSchool: FeaturedSchool = {
                                    id: String(Date.now()),
                                    name: 'New School',
                                    category: 'General',
                                    image: '/schools/1.png',
                                    logo: '/schools/1_logo.png',
                                    tagline: 'Excellence in education',
                                    description: '',
                                    contact: '',
                                    email: '',
                                    location: ''
                                };
                                updateFeaturedSchools([...featuredSchools, newSchool]);
                            }}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#000', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                            + Add School
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {featuredSchools.map((school: FeaturedSchool, index: number) => {
                            const isEditingSchool = editingSchoolId === school.id;

                            return (
                                <div key={school.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1.5rem' }}>
                                    {isEditingSchool ? (
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>School Name</label>
                                                    <input
                                                        type="text"
                                                        value={schoolFormData?.name || ''}
                                                        onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Category</label>
                                                    <input
                                                        type="text"
                                                        value={schoolFormData?.category || ''}
                                                        onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, category: e.target.value } : null)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Tagline</label>
                                                <input
                                                    type="text"
                                                    value={schoolFormData?.tagline || ''}
                                                    onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, tagline: e.target.value } : null)}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>School Image</label>
                                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, true, false)}
                                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Or enter URL"
                                                                value={schoolFormData?.image || ''}
                                                                onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, image: e.target.value } : null)}
                                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}
                                                            />
                                                        </div>
                                                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                                            <img src={schoolFormData?.image || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=No+Img'} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>School Logo</label>
                                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, true, true)}
                                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Or enter URL"
                                                                value={schoolFormData?.logo || ''}
                                                                onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, logo: e.target.value } : null)}
                                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}
                                                            />
                                                        </div>
                                                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                                            <img src={schoolFormData?.logo || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=No+Logo'} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Email</label>
                                                    <input
                                                        type="email"
                                                        value={schoolFormData?.email || ''}
                                                        onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, email: e.target.value } : null)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Contact</label>
                                                    <input
                                                        type="text"
                                                        value={schoolFormData?.contact || ''}
                                                        onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, contact: e.target.value } : null)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Location</label>
                                                    <input
                                                        type="text"
                                                        value={schoolFormData?.location || ''}
                                                        onChange={(e) => setSchoolFormData(prev => prev ? { ...prev, location: e.target.value } : null)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <button
                                                    onClick={() => {
                                                        if (!schoolFormData) return;
                                                        const updated = featuredSchools.map((s: FeaturedSchool) => s.id === school.id ? schoolFormData : s);
                                                        updateFeaturedSchools(updated);
                                                        setEditingSchoolId(null);
                                                        setSchoolFormData(null);
                                                    }}
                                                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => { setEditingSchoolId(null); setSchoolFormData(null); }}
                                                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                                <img src={school.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem' }}>{school.name}</h4>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{school.category} • {school.tagline}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingSchoolId(school.id);
                                                        setSchoolFormData({ ...school });
                                                    }}
                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const updated = featuredSchools.filter((s: FeaturedSchool) => s.id !== school.id);
                                                        updateFeaturedSchools(updated);
                                                    }}
                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #fee2e2', color: '#ef4444', background: 'white', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
