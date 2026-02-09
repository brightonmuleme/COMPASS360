"use client";
import React, { useEffect, useState } from 'react';
import { useSchoolData } from '@/lib/store';
import { developerService, PlatformStats } from '@/services/developerService';
import {
    Users,
    School,
    BookOpen,
    TrendingUp,
    ShieldCheck,
    Activity,
    AlertCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';

export default function DeveloperMainPage() {
    const { developerProfile } = useSchoolData();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await developerService.getRealtimeStats();
            setStats(data);
            setIsLoading(false);
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Platform Users', value: stats ? stats.totalStudents + stats.totalTutors : 0, icon: Users, color: '#3b82f6' },
        { label: 'Partner Schools', value: stats?.totalSchools || 0, icon: School, color: '#10b981' },
        { label: 'Active Resources', value: stats?.totalContent || 0, icon: BookOpen, color: '#f59e0b' },
        { label: 'System Health', value: '99.9%', icon: Activity, color: '#8b5cf6' },
    ];

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Welcome back, {developerProfile?.name || 'Muleme Brighton'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                    Live snapshot of the {process.env.NEXT_PUBLIC_SITE_NAME || 'Compass 360'} production environment.
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {statCards.map((stat, i) => (
                    <div key={i} style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        border: '1px solid #f1f5f9'
                    }}>
                        <div style={{
                            padding: '1rem',
                            background: `${stat.color}15`,
                            color: stat.color,
                            borderRadius: '14px'
                        }}>
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <stat.icon size={28} />}
                        </div>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{stat.label}</p>
                            <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
                                {isLoading ? '...' : (typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value)}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* System Health */}
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '24px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    border: '1px solid #f1f5f9'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldCheck className="text-blue-500" />
                        Platform Security Status
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { label: 'Supabase Authentication', status: 'Healthy', icon: CheckCircle2, color: '#10b981' },
                            { label: 'Database Sync (Real-time)', status: 'Active', icon: CheckCircle2, color: '#10b981' },
                            { label: 'Media Storage (S3)', status: 'Healthy', icon: CheckCircle2, color: '#10b981' },
                            { label: 'Developer API Keys', status: 'Secured', icon: ShieldCheck, color: '#3b82f6' }
                        ].map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '12px'
                            }}>
                                <span style={{ fontWeight: 500, color: '#334155' }}>{item.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: item.color, fontWeight: 700, fontSize: '0.9rem' }}>
                                    <item.icon size={18} />
                                    {item.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    padding: '2rem',
                    borderRadius: '24px',
                    color: 'white'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Quick Deploy</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button style={{ width: '100%', padding: '0.875rem', background: '#3b82f6', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            Clear System Cache
                        </button>
                        <button style={{ width: '100%', padding: '0.875rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            Backup Database
                        </button>
                        <button style={{ width: '100%', padding: '0.875rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            Generate Logs Report
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#f59e0b20', borderRadius: '12px', border: '1px solid #f59e0b40' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            <AlertCircle size={14} /> SYSTEM ALERT
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                            Next maintenance window is scheduled for Sunday at 02:00 AM.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
