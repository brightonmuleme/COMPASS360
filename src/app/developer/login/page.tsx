"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import { authService } from '@/services/authService';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function DeveloperLoginPage() {
    const router = useRouter();
    const { setDeveloperProfile, logout } = useSchoolData();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Force logout to ensure clean session
            logout();

            const response = await authService.login({ username: email, password });

            if (response.success) {
                const { user } = await authService.getCurrentUser();
                const attributes = await authService.getUserAttributes();
                const role = attributes['role'];

                if (role === 'Developer') {
                    setDeveloperProfile({
                        id: user!.id,
                        name: attributes['name'] || 'Developer',
                        role: 'Developer'
                    });
                    router.push('/developer');
                } else {
                    alert("Unauthorized: This portal is for Developers only.");
                    await authService.logout();
                }
            } else {
                alert(`Login Failed: ${response.error}`);
            }
        } catch (error) {
            console.error("Developer Login Error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                background: '#1e293b',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #334155'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1rem',
                        background: '#3b82f620',
                        borderRadius: '16px',
                        color: '#3b82f6',
                        marginBottom: '1rem'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>VINE DEV</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
                        <input
                            type="email"
                            placeholder="Developer Email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem', position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: isLoading ? '#334155' : '#3b82f6',
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: '12px',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Enter Command Center'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/')}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                        Return to Site
                    </button>
                </div>
            </div>
        </div>
    );
}
