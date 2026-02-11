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

const TAKEN_USERNAMES = ['admin', 'user', 'brightoni', 'john', 'doe'];

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

    const {
        setActiveRole, setActiveAccountId, featuredSchools, setSchoolProfile, setDeveloperProfile
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

    const proceedToLogin = async () => {
        try {
            const { user } = await authService.getCurrentUser();
            const userEmail = user?.email;
            const userRole = user?.user_metadata?.role || (role === 'school' ? 'Director' : role === 'accountant' ? 'Bursar' : role);
            const isDeveloper = (userRole.toLowerCase() === 'developer') || (userEmail === 'callmebreyton500@gmail.com');

            if (isDeveloper) {
                setDeveloperProfile({
                    id: user!.id,
                    name: user!.user_metadata?.full_name || 'Developer',
                    role: 'Developer'
                });
                router.push('/developer');
            } else if (userRole === 'student') {
                router.push('/student-portal');
            } else if (userRole === 'tutor') {
                router.push('/tutor');
            } else if (['Director', 'Bursar', 'Registrar'].includes(userRole)) {
                router.push('/portal');
            } else {
                router.push('/portal');
            }
        } catch (err) {
            router.push('/');
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authService.login({ username, password });
            if (response.success) {
                const { user } = await authService.getCurrentUser();
                const schoolId = user?.user_metadata?.school_id;
                const userEmail = user?.email;
                const userRole = (user?.user_metadata?.role || '').toLowerCase();
                const isDeveloper = userRole === 'developer' || userEmail === 'callmebreyton500@gmail.com';

                if (!isDeveloper) {
                    // 1. Check for Pending Application by Email
                    const { data: application } = await supabase
                        .from('school_applications')
                        .select('status')
                        .eq('email', userEmail)
                        .maybeSingle();

                    if (application && application.status !== 'Approved') {
                        await authService.logout();
                        alert("Waiting for developer approval. Please contact support for assistance.");
                        setIsLoading(false);
                        return;
                    }

                    // 2. Check for Inactive School by ID
                    if (schoolId) {
                        const { data: school } = await supabase.from('schools').select('status').eq('id', schoolId).single();
                        if (school && school.status !== 'Active') {
                            await authService.logout();
                            alert("Account Inactive: Please contact support.");
                            setIsLoading(false);
                            return;
                        }
                    }
                }
                await proceedToLogin();
            } else {
                alert(`Login Failed: ${response.error}`);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Login exception:", err);
            alert("Connection error occurred.");
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setIsLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+256${phoneNumber.replace(/^0/, '')}`;
            const signupData = {
                username: email,
                password,
                email,
                phoneNumber: formattedPhone,
                name: `${firstName} ${lastName}`.trim(),
                role: role === 'school' ? 'Director' : role,
                schoolId: selectedSchool || undefined,
                payCode: payCode || undefined
            };

            const response = await authService.signUp(signupData);
            if (response.success) {
                if (role === 'school') {
                    // Create School Application record in Supabase
                    await databaseService.submitSchoolApplication({
                        schoolName: institutionName,
                        adminName: `${firstName} ${lastName}`,
                        email: email,
                        phone: formattedPhone
                    });

                    alert(`Application for ${institutionName} submitted! Please verify your email and wait for developer approval.`);
                    router.push('/');
                } else {
                    alert("Account created! Please check your email for verification.");
                    setMode('signin');
                }
            } else {
                alert(`Registration Error: ${response.error}`);
            }
        } catch (err) {
            alert("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputContainerStyle = {
        position: 'relative' as const,
        marginBottom: '1rem'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.875rem 1rem 0.875rem 2.75rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'white',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s'
    };

    const iconStyle = {
        position: 'absolute' as const,
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6b7280',
        width: '18px'
    };

    return (
        <main className={styles.authContainer}>
            {/* Ambient Background Glows */}
            <div className={`${styles.ambientGlow} ${styles.glow1}`} style={{ backgroundColor: getThemeColor() }}></div>
            <div className={`${styles.ambientGlow} ${styles.glow2}`} style={{ backgroundColor: getThemeColor() }}></div>

            <div className={styles.authCard}>
                {/* Header Tabs */}
                <div className={styles.authHeader}>
                    <button
                        onClick={() => setMode('signin')}
                        className={`${styles.tabButton} ${mode === 'signin' ? styles.tabButtonActive : ''}`}
                        style={mode === 'signin' ? { borderBottomColor: getThemeColor() } : {}}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`${styles.tabButton} ${mode === 'signup' ? styles.tabButtonActive : ''}`}
                        style={mode === 'signup' ? { borderBottomColor: getThemeColor() } : {}}
                    >
                        Join Now
                    </button>
                </div>

                <div className={styles.authContent}>
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </button>

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            {role === 'student' && <GraduationCap size={32} color={getThemeColor()} />}
                            {role === 'school' && <Rocket size={32} color={getThemeColor()} />}
                            {role === 'tutor' && <Briefcase size={32} color={getThemeColor()} />}
                            {role === 'accountant' && <ShieldCheck size={32} color={getThemeColor()} />}
                            <h2 className="text-3xl font-bold text-white">
                                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                        </div>
                        <p className="text-gray-400">
                            {mode === 'signin'
                                ? `Access the ${role} portal.`
                                : `Start your journey on Compass 360.`}
                        </p>
                    </div>

                    {mode === 'signin' ? (
                        <form onSubmit={handleSignIn}>
                            <div style={inputContainerStyle}>
                                <User style={iconStyle} />
                                <input
                                    type="text"
                                    style={inputStyle}
                                    className="focus:border-blue-500"
                                    required
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Email or Username"
                                    disabled={isLoading}
                                />
                            </div>

                            <div style={inputContainerStyle}>
                                <Lock style={iconStyle} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    style={inputStyle}
                                    className="focus:border-blue-500"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="flex justify-between items-center mb-8">
                                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                    <input type="checkbox" className="accent-blue-500" /> Remember me
                                </label>
                                <button type="button" className="text-sm text-blue-400 hover:underline">Forgot Password?</button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: `linear-gradient(135deg, ${getThemeColor()} 0%, #000 150%)` }}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Securing...</span>
                                    </div>
                                ) : 'Sign In'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegisterSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div style={inputContainerStyle}>
                                    <input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" disabled={isLoading} />
                                </div>
                                <div style={inputContainerStyle}>
                                    <input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" disabled={isLoading} />
                                </div>
                            </div>

                            <div style={inputContainerStyle}>
                                <Mail style={iconStyle} />
                                <input type="email" style={inputStyle} required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" disabled={isLoading} />
                            </div>

                            <div style={inputContainerStyle}>
                                <Phone style={iconStyle} />
                                <input type="tel" style={inputStyle} required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone Number" disabled={isLoading} />
                            </div>

                            {role === 'student' && (
                                <>
                                    <div style={inputContainerStyle}>
                                        <Building style={iconStyle} />
                                        <select
                                            style={{ ...inputStyle, appearance: 'none' }}
                                            value={selectedSchool}
                                            onChange={e => setSelectedSchool(e.target.value)}
                                            disabled={isLoading}
                                        >
                                            <option value="">Select School (Optional)</option>
                                            {featuredSchools.filter(s => s.status === 'Active').map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedSchool && (
                                        <div style={inputContainerStyle}>
                                            <Hash style={iconStyle} />
                                            <input type="text" style={inputStyle} required value={payCode} onChange={e => setPayCode(e.target.value)} placeholder="Enter Pay Code" disabled={isLoading} />
                                        </div>
                                    )}
                                </>
                            )}

                            {role === 'school' && (
                                <div style={inputContainerStyle}>
                                    <Building style={iconStyle} />
                                    <input type="text" style={inputStyle} required value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Institution Name" disabled={isLoading} />
                                </div>
                            )}

                            <div style={inputContainerStyle}>
                                <Lock style={iconStyle} />
                                <input type="password" style={inputStyle} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Create Password" disabled={isLoading} />
                            </div>

                            <div style={inputContainerStyle}>
                                <Lock style={iconStyle} />
                                <input type="password" style={inputStyle} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" disabled={isLoading} />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: `linear-gradient(135deg, ${getThemeColor()} 0%, #000 150%)` }}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Saving Details...</span>
                                    </div>
                                ) : 'Complete Registration'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>}>
            <AuthContent />
        </Suspense>
    );
}
