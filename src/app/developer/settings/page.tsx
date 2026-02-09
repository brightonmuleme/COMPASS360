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
    RefreshCw
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
            // In a real app, this would upsert to 'platform_settings' table
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
        <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>System Settings</h1>
                    <p style={{ color: '#64748b' }}>Configure the global environment and platform behavior.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background: saved ? '#10b981' : '#3b82f6',
                        color: 'white',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : (saved ? <Zap size={18} /> : <Save size={18} />)}
                    {saved ? 'System Updated' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* General Config */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', border: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Settings className="text-blue-500" size={20} />
                        Basic Configuration
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Platform Name</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Support Email</label>
                            <input
                                type="email"
                                value={settings.supportEmail}
                                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {/* System Toggles */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', border: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield className="text-orange-500" size={20} />
                        Platform Guard
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>Maintenance Mode</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Lock the site for everyone except developers.</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>Open Registration</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Allow new students/tutors to sign up.</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.allowRegistration}
                                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                                style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div style={{ gridColumn: '1 / -1', background: '#0f172a', padding: '2rem', borderRadius: '24px', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: '#3b82f6' }}>
                            <Lock size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Critical Infrastructure</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Advanced server-side credentials and API endpoint management.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>Supabase Project URL</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    readOnly
                                    value="https://ccxgdztlplwtaznwrfyr.supabase.co"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#94a3b8', outline: 'none' }}
                                />
                                <Eye size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'no-allowed', opacity: 0.5 }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>System Version</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <code style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#3b82f6', fontWeight: 700 }}>
                                    v{settings.systemVersion} (STABLE)
                                </code>
                                <button style={{ padding: '0.5rem 1rem', background: '#334155', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'not-allowed' }}>
                                    Update Engine
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
