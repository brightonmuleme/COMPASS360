"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users,
    Star,
    CheckCircle,
    XCircle,
    Mail,
    CreditCard,
    Library,
    ArrowUpRight,
    Loader2
} from 'lucide-react';

export default function TutorManagementPage() {
    const [tutors, setTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTutors = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'Tutor')
                .order('created_at', { ascending: false });
            setTutors(data || []);
            setLoading(false);
        };
        fetchTutors();
    }, []);

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Tutor Ecosystem</h1>
                <p style={{ color: '#64748b' }}>Approve applications and manage content creator accounts.</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {tutors.map((tutor) => (
                        <div key={tutor.id} style={{
                            background: 'white',
                            padding: '1.5rem',
                            borderRadius: '24px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                            border: '1px solid #f1f5f9',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Watermark Icon */}
                            <Library size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03, color: '#3b82f6' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                                    {tutor.name?.[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{tutor.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
                                        <Mail size={12} /> {tutor.email}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: tutor.status === 'Active' ? '#10b981' : '#f59e0b', background: tutor.status === 'Active' ? '#10b98115' : '#f59e0b15', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                                        {tutor.status || 'Active'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>RESOURCES</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>24</div>
                                </div>
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>EARNINGS</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>UGX 0</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button style={{ flex: 1, padding: '0.6rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                    View Dashboard <ArrowUpRight size={14} />
                                </button>
                                <button style={{ padding: '0.6rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
