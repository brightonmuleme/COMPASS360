"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import { authService } from '@/services/authService';
import { databaseService } from '@/services/databaseService';
import { supabase } from '@/lib/supabase';
import {
    Eye, EyeOff, User, Lock, Mail, Phone, Building, Hash,
    ArrowLeft, Loader2, Rocket, GraduationCap, Briefcase,
    ShieldCheck
} from 'lucide-react';
import styles from './auth.module.css';

function AuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get initial params
    const roleParam = (searchParams.get('role') || 'student') as 'student' | 'school' | 'tutor' | 'accountant';
    const modeParam = (searchParams.get('mode') || 'signup') as 'signup' | 'signin';

    const [mode, setMode] = useState<'signup' | 'signin'>(modeParam);
    const [role, setRole] = useState(roleParam);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Student Specific
    const [selectedSchool, setSelectedSchool] = useState('');
    const [payCode, setPayCode] = useState('');
    const [institutionName, setInstitutionName] = useState('');

    const [authError, setAuthError] = useState<string | null>(null);
    const [authSuccess, setAuthSuccess] = useState<string | null>(null);

    const {
        featuredSchools, setSchoolProfile,
        setDeveloperProfile, setTutorProfile, setStudentProfile, hydrated, checkingAccess, logout
    } = useSchoolData();

    // Theme Color Mapping
    const getThemeColor = () => {
        switch (role) {
            case 'school': return '#3b82f6';
            case 'tutor': return '#10b981';
            case 'student': return '#8b5cf6';
            case 'accountant': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError(null);
        setAuthSuccess(null);

        try {
            // DIRECT SUPABASE AUTH CALL
            const response = await authService.login({ username, password });
            
            if (response.success) {
                // 1. Get user profile immediately from DB, but handle failures gracefully
                const { user } = await authService.getCurrentUser();
                
                let userRole = (user?.user_metadata?.role || '').toLowerCase();
                let userEmail = user?.email || '';

                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user?.id)
                        .single();
                    if (profile?.role) userRole = profile.role.toLowerCase();
                } catch (e) {
                    console.warn("⚠️ PROFILE FETCH FAILED: Using metadata instead.");
                }

                const isDeveloper = (userRole === 'developer') || (userEmail === 'callmebreyton500@gmail.com');

                if (isDeveloper) {
                    router.push('/developer');
                } else if (userRole === 'tutor') {
                    router.push('/tutor');
                } else if (userRole === 'student') {
                    router.push('/student');
                } else {
                    router.push('/portal');
                }
            } else {
                setAuthError(`Login Failed: ${response.error || 'Check your credentials'}`);
                setIsLoading(false);
            }
        } catch (err: any) {
            setAuthError(err.message || "Connection error occurred.");
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setAuthSuccess(null);

        if (password !== confirmPassword) {
            setAuthError("Passwords do not match!");
            return;
        }

        setIsLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+256${phoneNumber.replace(/^0/, '')}`;
            const normalizedRole = role === 'school' ? 'Director' : (role === 'accountant' ? 'Bursar' : (role === 'tutor' ? 'Tutor' : 'Student'));

            const signupData = {
                username: email,
                password,
                email,
                phoneNumber: formattedPhone,
                name: `${firstName} ${lastName}`.trim(),
                role: normalizedRole,
                schoolId: selectedSchool || undefined,
                payCode: payCode || undefined
            };

            const response = await authService.signUp(signupData);
            if (response.success) {
                if (role === 'school') {
                    await databaseService.submitSchoolApplication({
                        schoolName: institutionName,
                        adminName: `${firstName} ${lastName}`,
                        email: email,
                        phone: formattedPhone
                    });
                    setAuthSuccess(`Application submitted! Please verify your email.`);
                } else {
                    setAuthSuccess(`Verification email sent to ${email}!`);
                }

                setTimeout(() => {
                    setMode('signin');
                    setAuthSuccess(null);
                }, 2000);
            } else {
                setAuthError(`Registration Failed: ${response.error}`);
            }
        } catch (err) {
            setAuthError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputContainerStyle = { position: 'relative' as const, marginBottom: '1rem' };
    const inputStyle = { width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' };
    const iconStyle = { position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '18px' };

    return (
        <main className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <button onClick={() => setMode('signin')} className={`${styles.tabButton} ${mode === 'signin' ? styles.tabButtonActive : ''}`} style={mode === 'signin' ? { borderBottomColor: getThemeColor() } : {}}>Sign In</button>
                    <button onClick={() => setMode('signup')} className={`${styles.tabButton} ${mode === 'signup' ? styles.tabButtonActive : ''}`} style={mode === 'signup' ? { borderBottomColor: getThemeColor() } : {}}>Join Now</button>
                </div>

                <div className={styles.authContent}>
                    <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"><ArrowLeft size={16} /> Back to Home</button>

                    {authError && <div className="p-3 bg-red-400/15 border border-red-400/30 rounded-xl text-red-400 text-sm font-medium mb-6">{authError}</div>}
                    {authSuccess && <div className="p-3 bg-emerald-400/15 border border-emerald-400/30 rounded-xl text-emerald-400 text-sm font-medium mb-6">{authSuccess}</div>}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            {role === 'student' && <GraduationCap size={32} color={getThemeColor()} />}
                            {role === 'school' && <Rocket size={32} color={getThemeColor()} />}
                            {role === 'tutor' && <Briefcase size={32} color={getThemeColor()} />}
                            {role === 'accountant' && <ShieldCheck size={32} color={getThemeColor()} />}
                            <h2 className="text-3xl font-bold text-white">{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
                        </div>
                        <p className="text-gray-400">{mode === 'signin' ? `Access the ${role} portal.` : `Start your journey on Compass 360.`}</p>
                    </div>

                    {mode === 'signin' ? (
                        <form onSubmit={handleSignIn}>
                            <div style={inputContainerStyle}><User style={iconStyle} /><input type="text" style={inputStyle} required value={username} onChange={e => setUsername(e.target.value)} placeholder="Email Address" disabled={isLoading} /></div>
                            <div style={inputContainerStyle}><Lock style={iconStyle} /><input type={showPassword ? "text" : "password"} style={inputStyle} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" disabled={isLoading} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                            <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-white font-bold text-lg" style={{ background: `linear-gradient(135deg, ${getThemeColor()} 0%, #000 150%)` }}>{isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Sign In'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegisterSubmit}>
                            <div className="grid grid-cols-2 gap-4"><input type="text" style={{...inputStyle, paddingLeft: '1rem'}} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" disabled={isLoading} /><input type="text" style={{...inputStyle, paddingLeft: '1rem'}} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" disabled={isLoading} /></div>
                            <div style={inputContainerStyle}><Mail style={iconStyle} /><input type="email" style={inputStyle} required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" disabled={isLoading} /></div>
                            <div style={inputContainerStyle}><Phone style={iconStyle} /><input type="tel" style={inputStyle} required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone Number" disabled={isLoading} /></div>
                            <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-white font-bold text-lg mt-4" style={{ background: `linear-gradient(135deg, ${getThemeColor()} 0%, #000 150%)` }}>{isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Create Account'}</button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function AuthPage() { return (<Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>}><AuthContent /></Suspense>); }
