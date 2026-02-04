"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';

const LINKS = [
    { href: '/developer', label: 'Dashboard', icon: '📊' },
    { href: '/developer/dashboard', label: 'Student Dashboard', icon: '🏠' },
    { href: '/developer/content', label: 'Landing Page', icon: '🎨' },
    { href: '/developer/library', label: 'Content Library', icon: '📚' },
    { href: '/developer/settings', label: 'Global Settings', icon: '⚙️' },
    { href: '/developer/users', label: 'User Manager', icon: '👥' },
    { href: '/developer/schools', label: 'Schools', icon: '🏫' },
    { href: '/developer/applications', label: 'Applications', icon: '📥' },
    { href: '/developer/tutors', label: 'Tutors', icon: '👨‍🏫' },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { developerProfile, hydrated, logout } = useSchoolData();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (hydrated) {
            if (!developerProfile) {
                // Not a developer, redirect to login or show restricted
                router.push('/');
            } else {
                setIsAuthorized(true);
            }
        }
    }, [hydrated, developerProfile, router]);

    if (!hydrated || !isAuthorized) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Verifying Access...</h2>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Sidebar */}
            <div style={{
                width: '250px',
                background: '#0f172a',
                color: 'white',
                padding: '2rem 1rem',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>VINE <span style={{ color: '#3b82f6', fontSize: '0.9rem' }}>DEV</span></h1>
                    <p style={{ opacity: 0.5, fontSize: '0.8rem', margin: 0 }}>Super Admin Portal</p>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {LINKS.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: isActive ? '#3b82f6' : 'transparent',
                                color: isActive ? 'white' : '#ffffff',
                                textDecoration: 'none',
                                fontWeight: '600',
                                opacity: isActive ? 1 : 0.8,
                                transition: 'all 0.2s'
                            }}>
                                <span>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => {
                            logout();
                            window.location.href = '/';
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', paddingLeft: '1rem', fontWeight: 'bold' }}
                    >
                        🛑 Log Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="light-mode" style={{
                flex: 1,
                padding: '2rem',
                overflowY: 'auto',
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))'
            }}>
                {children}
            </div>
        </div>
    );
}
