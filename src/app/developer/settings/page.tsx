"use client";
import React, { useState } from 'react';
import { useSchoolData, DeveloperSettings } from '@/lib/store';

export default function GlobalSettings() {
    const { developerSettings, updateDeveloperSettings } = useSchoolData();
    const [settings, setSettings] = useState<DeveloperSettings>(developerSettings);

    const handleSave = () => {
        updateDeveloperSettings(settings);
        alert("Settings Saved!");
    };

    const handleFeeChange = (index: number, field: string, value: any) => {
        const newFees = [...settings.subscriptionFees];
        newFees[index] = { ...newFees[index], [field]: value };
        setSettings({ ...settings, subscriptionFees: newFees });
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Global Settings</h1>

            <div className="card" style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                    Subscription Pricing
                </h2>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {settings.subscriptionFees.map((fee, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ width: '120px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                {fee.portal} Portal
                            </div>

                            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    value={fee.amount}
                                    onChange={(e) => handleFeeChange(idx, 'amount', parseInt(e.target.value))}
                                    style={{ width: '120px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <select
                                    value={fee.currency}
                                    onChange={(e) => handleFeeChange(idx, 'currency', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                >
                                    <option>UGX</option>
                                    <option>USD</option>
                                    <option>KES</option>
                                </select>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ {fee.interval}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                    System Controls
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                            <div style={{ fontWeight: '500' }}>Maintenance Mode</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Disable access for all non-admin users</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                            style={{ width: '20px', height: '20px' }}
                        />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                            <div style={{ fontWeight: '500' }}>Allow New Registrations</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Public sign-ups for Schools/Tutors</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.allowNewRegistrations}
                            onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
                            style={{ width: '20px', height: '20px' }}
                        />
                    </label>

                    <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Global Announcement Banner</label>
                        <input
                            type="text"
                            placeholder="Enter message to display on all portals..."
                            value={settings.globalAnnouncement || ''}
                            onChange={(e) => setSettings({ ...settings, globalAnnouncement: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                style={{
                    width: '100%', padding: '1rem', background: '#3b82f6', color: 'white',
                    fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1.1rem'
                }}
            >
                Save All Usage Settings
            </button>
        </div>
    );
}
