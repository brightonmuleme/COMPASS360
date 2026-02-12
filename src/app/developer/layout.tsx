"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';

const LINKS = [
    { href: '/developer', label: 'Dashboard', icon: '📊' },
    { href: '/developer/dashboard', label: 'Student Dashboard', icon: '🏠' },
    { href: '/developer/financials', label: 'Financial Center', icon: '💰' },
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
    const { developerProfile, hydrated, checkingAccess, logout } = useSchoolData();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (hydrated && !checkingAccess) {
            if (!developerProfile) {
                // Not a developer, redirect to developer login
                if (pathname !== '/developer/login') {
                    router.push('/developer/login');
                }
            } else {
                setIsAuthorized(true);
            }
        }
    }, [hydrated, checkingAccess, developerProfile, router, pathname]);

    const isLoginPage = pathname === '/developer/login';

    if (!hydrated || checkingAccess || (!isAuthorized && !isLoginPage)) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Verifying Identity...</h2>
                </div>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Sidebar */}
            <div style={{
                width: '260px',
                background: '#0d0d0d',
                color: 'white',
                padding: '2.5rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #222'
            }}>
                <div style={{ marginBottom: '3.5rem' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                        COMPASS <span style={{ color: '#ef4444' }}>DEV</span>
                    </h1>
                    <p style={{ opacity: 0.4, fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '1px' }}>Main Systems Controller</p>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {LINKS.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.75rem 1.2rem',
                                borderRadius: '14px',
                                background: isActive ? '#ef4444' : 'transparent',
                                color: isActive ? 'white' : '#999',
                                textDecoration: 'none',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #222' }}>
                    <button
                        onClick={() => {
                            logout();
                            window.location.href = '/';
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                        🔒 Logout Session
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '2.5rem',
                overflowY: 'auto',
                background: '#fcfcfc',
                color: '#0a0a0a'
            }}>
                {children}
            </main>
        </div>
    );
}
