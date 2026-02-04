"use client";
import React, { useState } from 'react';
import { useSchoolData, AppUpdate, AppOffer } from '@/lib/store';
import { Plus, Trash2, Edit2, Save, X, Megaphone, Tag, Calendar, Layout, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardContentManager() {
    const {
        appUpdates, addAppUpdate, updateAppUpdate, deleteAppUpdate,
        appOffers, addAppOffer, updateAppOffer, deleteAppOffer
    } = useSchoolData();

    const [activeTab, setActiveTab] = useState<'updates' | 'offers'>('updates');

    // --- State for Forms ---
    const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null);
    const [editingOffer, setEditingOffer] = useState<AppOffer | null>(null);
    const [isAddingUpdate, setIsAddingUpdate] = useState(false);
    const [isAddingOffer, setIsAddingOffer] = useState(false);

    // Initial Form States
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

    // --- Actions ---
    const handleSaveUpdate = () => {
        if (!updateForm.title || !updateForm.content) return;
        if (editingUpdate) {
            updateAppUpdate(updateForm);
        } else {
            addAppUpdate(updateForm);
        }
        setEditingUpdate(null);
        setIsAddingUpdate(false);
        setUpdateForm(emptyUpdate);
    };

    const handleSaveOffer = () => {
        if (!offerForm.title || !offerForm.code) return;
        if (editingOffer) {
            updateAppOffer(offerForm);
        } else {
            addAppOffer(offerForm);
        }
        setEditingOffer(null);
        setIsAddingOffer(false);
        setOfferForm(emptyOffer);
    };

    const startEditUpdate = (u: AppUpdate) => {
        setEditingUpdate(u);
        setUpdateForm(u);
        setIsAddingUpdate(true);
    };

    const startEditOffer = (o: AppOffer) => {
        setEditingOffer(o);
        setOfferForm(o);
        setIsAddingOffer(true);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/developer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    <ArrowLeft size={20} />
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Dashboard Content</h1>
            </div>

            <div style={{
                display: 'flex',
                gap: '1rem',
                background: '#f1f5f9',
                padding: '0.5rem',
                borderRadius: '12px',
                marginBottom: '2rem'
            }}>
                <button
                    onClick={() => setActiveTab('updates')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none',
                        background: activeTab === 'updates' ? 'white' : 'transparent',
                        fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        boxShadow: activeTab === 'updates' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    <Megaphone size={18} /> VINE Updates
                </button>
                <button
                    onClick={() => setActiveTab('offers')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none',
                        background: activeTab === 'offers' ? 'white' : 'transparent',
                        fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        boxShadow: activeTab === 'offers' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    <Tag size={18} /> Exclusive Offers
                </button>
            </div>

            {/* TAB: UPDATES */}
            {activeTab === 'updates' && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Manage Platform Updates</h2>
                        {!isAddingUpdate && (
                            <button
                                onClick={() => { setIsAddingUpdate(true); setUpdateForm(emptyUpdate); }}
                                style={{
                                    background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.2rem',
                                    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Plus size={18} /> New Update
                            </button>
                        )}
                    </div>

                    {isAddingUpdate && (
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontWeight: 'bold' }}>{editingUpdate ? 'Edit Update' : 'New Platform Update'}</h3>
                                <button onClick={() => setIsAddingUpdate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>TITLE</label>
                                    <input
                                        type="text"
                                        value={updateForm.title}
                                        onChange={e => setUpdateForm({ ...updateForm, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        placeholder="e.g. New Feature: Tutor Marketplace"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>CONTENT</label>
                                    <textarea
                                        rows={3}
                                        value={updateForm.content}
                                        onChange={e => setUpdateForm({ ...updateForm, content: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        placeholder="Detailed explanation of the update..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>DATE</label>
                                        <input
                                            type="date"
                                            value={updateForm.date}
                                            onChange={e => setUpdateForm({ ...updateForm, date: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>TYPE</label>
                                        <select
                                            value={updateForm.type}
                                            onChange={e => setUpdateForm({ ...updateForm, type: e.target.value as any })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="Update">Update</option>
                                            <option value="Alert">Alert</option>
                                            <option value="Offer">Offer</option>
                                            <option value="News">News</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>ACCENT COLOR</label>
                                        <input
                                            type="color"
                                            value={updateForm.color}
                                            onChange={e => setUpdateForm({ ...updateForm, color: e.target.value })}
                                            style={{ width: '100%', height: '42px', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveUpdate}
                                    style={{
                                        background: '#0f172a', color: 'white', border: 'none', padding: '1rem',
                                        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem'
                                    }}
                                >
                                    {editingUpdate ? 'Update Announcement' : 'Publish Announcement'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {appUpdates.map(u => (
                            <div key={u.id} style={{
                                background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '4px', height: '40px', background: u.color, borderRadius: '2px' }}></div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: u.color }}>{u.type} • {u.date}</div>
                                        <h4 style={{ fontWeight: 'bold', margin: '2px 0' }}>{u.title}</h4>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>{u.content}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => startEditUpdate(u)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'none', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deleteAppUpdate(u.id)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fee2e2', color: '#ef4444', background: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {appUpdates.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No updates yet.</div>}
                    </div>
                </div>
            )}

            {/* TAB: OFFERS */}
            {activeTab === 'offers' && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Exclusive Student Offers</h2>
                        {!isAddingOffer && (
                            <button
                                onClick={() => { setIsAddingOffer(true); setOfferForm(emptyOffer); }}
                                style={{
                                    background: '#ec4899', color: 'white', border: 'none', padding: '0.6rem 1.2rem',
                                    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Plus size={18} /> New Offer
                            </button>
                        )}
                    </div>

                    {isAddingOffer && (
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontWeight: 'bold' }}>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                                <button onClick={() => setIsAddingOffer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>OFFER TITLE</label>
                                    <input
                                        type="text"
                                        value={offerForm.title}
                                        onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        placeholder="e.g. 50% OFF Premium"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>DESCRIPTION</label>
                                    <input
                                        type="text"
                                        value={offerForm.description}
                                        onChange={e => setOfferForm({ ...offerForm, description: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        placeholder="Upgrade to VINE Gold for half the price..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>PROMO CODE</label>
                                        <input
                                            type="text"
                                            value={offerForm.code}
                                            onChange={e => setOfferForm({ ...offerForm, code: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            placeholder="e.g. GOLD50"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', opacity: 0.6 }}>EXPIRY LABEL</label>
                                        <input
                                            type="text"
                                            value={offerForm.expiry}
                                            onChange={e => setOfferForm({ ...offerForm, expiry: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            placeholder="e.g. 2 days left"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveOffer}
                                    style={{
                                        background: '#ec4899', color: 'white', border: 'none', padding: '1rem',
                                        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem'
                                    }}
                                >
                                    {editingOffer ? 'Update Offer' : 'Publish Offer'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {appOffers.map(o => (
                            <div key={o.id} style={{
                                background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
                                padding: '1.5rem', borderRadius: '16px', color: 'white',
                                position: 'relative', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <Tag size={24} opacity={0.5} />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => startEditOffer(o)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => deleteAppOffer(o.id)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <h4 style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{o.title}</h4>
                                <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '1rem' }}>{o.description}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}>{o.code}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'white', color: '#be185d', padding: '2px 8px', borderRadius: '4px' }}>{o.expiry}</div>
                                </div>
                            </div>
                        ))}
                        {appOffers.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No offers yet.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
