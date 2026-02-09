import React, { useState, useEffect } from 'react';
import styles from '../../app/landing.module.css';
import { useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, User, Lock, Mail, Phone, Building, Hash, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface SignUpModalProps {
    role: 'student' | 'school' | 'tutor' | 'accountant';
    onClose: () => void;
    initialMode?: 'signup' | 'signin';
}

const TAKEN_USERNAMES = ['admin', 'user', 'brightoni', 'john', 'doe'];

const SignUpModal: React.FC<SignUpModalProps> = ({ role, onClose, initialMode = 'signup' }) => {
    const router = useRouter();
    const [mode, setMode] = useState<string>(initialMode);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Student Specific
    const [selectedSchool, setSelectedSchool] = useState('');
    const [payCode, setPayCode] = useState('');
    const [institutionName, setInstitutionName] = useState('');

    const {
        staffAccounts, tutors, students, setActiveRole, setActiveAccountId,
        setStudentProfile, setTutorProfile, setDeveloperProfile, logout,
        featuredSchools, setSchoolProfile
    } = useSchoolData();

    // Username Availability Check
    useEffect(() => {
        const checkUsername = setTimeout(() => {
            if (username.length > 0) {
                const isTaken = TAKEN_USERNAMES.includes(username.toLowerCase());
                setUsernameAvailable(!isTaken);
            } else {
                setUsernameAvailable(null);
            }
        }, 500);
        return () => clearTimeout(checkUsername);
    }, [username]);

    const proceedToLogin = async () => {
        try {
            const { user } = await authService.getCurrentUser();
            if (!user) throw new Error("Authentication failed: No user context found.");

            const attributes = await authService.getUserAttributes();

            // CRITICAL FIX: Do NOT default to Student. Wait for actual role.
            const dbRole = attributes['role'] || user.user_metadata?.role;

            if (!dbRole) {
                console.error("No role found for user:", user.id);
                // Try one more fetch if first one missed it
                const refreshAttrs = await authService.getUserAttributes();
                if (!refreshAttrs['role']) throw new Error("Could not determine your account role. Please contact support.");
            }

            const name = attributes['name'] || user.user_metadata?.full_name || 'User';
            const userEmail = attributes['email'] || user.email;

            // 1. Clear previous conflicting sessions
            logout();

            // 2. Exact Routing Logic (Case-Insensitive)
            const normalizedRole = dbRole?.toLowerCase();

            if (normalizedRole === 'tutor') {
                setTutorProfile({
                    id: user.id,
                    name: name,
                    email: userEmail,
                    role: 'Tutor',
                    subscriptionDaysLeft: 30
                });
                setActiveRole(null);
                router.push('/tutor');
            } else if (normalizedRole === 'student') {
                setStudentProfile({
                    id: user.id,
                    name: name,
                    email: userEmail,
                    role: 'Student',
                    payCode: user.user_metadata?.pay_code || 'N/A',
                    linkedStudentCode: user.user_metadata?.pay_code,
                    subscriptionStatus: 'active'
                } as any);
                setActiveRole(null);
                router.push('/student/resources');
            } else if (['director', 'school', 'admin', 'developer', 'bursar', 'accountant', 'expense manager', 'estate manager', 'registrar'].includes(normalizedRole)) {
                if (normalizedRole === 'developer') {
                    setDeveloperProfile({ id: user.id, name: name, role: 'Developer' });
                    router.push('/developer');
                } else {
                    // Fetch School Status for Institutional Roles
                    const schoolId = attributes['school_id'] || user.user_metadata?.school_id;
                    if (schoolId) {
                        const { data: schoolData, error: schoolError } = await supabase
                            .from('schools')
                            .select('*')
                            .eq('id', schoolId)
                            .single();

                        if (schoolData) {
                            // Update store with actual school status
                            setSchoolProfile({
                                id: schoolData.id,
                                name: schoolData.name,
                                status: schoolData.status
                            });
                        } else if (schoolError) {
                            console.warn("Could not fetch school status, defaulting to current store state.", schoolError);
                        }
                    }

                    setActiveRole(null);
                    setActiveAccountId(user.id);
                    router.push('/portal');
                }
            } else {
                console.error("Critical: Unknown role encountered during login:", dbRole);
                throw new Error("Your account has an unassigned role. Please contact school administration.");
            }

            onClose();
        } catch (error: any) {
            console.error("Redirection error:", error);
            alert(error.message || "Login succeeded but profile could not be loaded.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // --- DEMO FALLBACKS ---
            if (password === 'password123') {
                if (username === 'sarah.n@vine.ac.ug') {
                    logout();
                    setTutorProfile({ id: 'tutor_1', name: 'Dr. Sarah N', email: 'sarah.n@vine.ac.ug', role: 'Tutor', subscriptionDaysLeft: 30 });
                    router.push('/tutor'); onClose(); return;
                }
                if (username === 'director') {
                    logout(); setActiveRole('Director'); router.push('/portal'); onClose(); return;
                }
                if (username === 'PAY-001') {
                    logout();
                    setStudentProfile({
                        id: '101', name: 'JOHN KAMAU', email: 'john.k@vine.ac.ug', phoneNumber: '0700000000', payCode: 'PAY-001',
                        linkedStudentCode: 'PAY-001', schoolId: '1', likedContentIds: [], subscribedTutorIds: [],
                        subscriptionStatus: 'active', subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                    router.push('/student/resources'); onClose(); return;
                }
                if (username === 'bursar') {
                    logout(); setActiveRole('Bursar'); router.push('/bursar'); onClose(); return;
                }
            }

            // --- REAL AUTHENTICATION (Supabase) ---
            const response = await authService.login({ username, password });
            if (response.success) {
                await proceedToLogin();
            } else {
                alert(`Login Failed: ${response.error}`);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Login exception:", err);
            alert("An unexpected error occurred. Please try again.");
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
            const result = await authService.signUp({
                username: username || email,
                password: password,
                email: email,
                name: `${firstName} ${lastName}`,
                phoneNumber: formattedPhone,
                role: role === 'accountant' ? 'Bursar' : (role === 'school' ? 'Director' : (role === 'tutor' ? 'Tutor' : 'Student')),
                payCode: payCode,
                schoolId: selectedSchool
            });

            if (result.success) {
                if (role === 'school') {
                    // Create School Application record in Supabase
                    const { error: appError } = await supabase
                        .from('school_applications')
                        .insert([{
                            schoolName: institutionName,
                            email: email,
                            contact: phoneNumber,
                            status: 'Pending',
                            applicantName: `${firstName} ${lastName}`
                        }]);

                    if (appError) console.error("Application insertion error:", appError);
                    alert(`Application for ${institutionName} submitted! Please wait for developer approval.`);
                } else {
                    alert(`Welcome aboard! Account created successfully.`);
                }
                setMode('signin');
            } else {
                alert(`Registration Failed: ${result.error}`);
            }
        } catch (err: any) {
            console.error("Registration Error", err);
            alert("Could not complete registration. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    // Shared Styles
    const inputContainerStyle: React.CSSProperties = { position: 'relative', marginBottom: '1.25rem' };
    const iconStyle: React.CSSProperties = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '18px', height: '18px' };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '14px', border: '1px solid #374151',
        background: '#1f2937', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s shadow'
    };

    return (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modalContent} style={{
                maxWidth: (mode === 'signup' && role !== 'school') ? '580px' : '440px',
                padding: '0', borderRadius: '28px', background: '#111827',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', border: '1px solid #374151', overflow: 'hidden'
            }}>
                {/* Header Tabs */}
                {(mode === 'signin' || mode === 'signup') && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', background: '#111827' }}>
                        {['signin', 'signup'].map((m) => (
                            <button key={m} onClick={() => setMode(m)} style={{
                                flex: 1, padding: '1.25rem', background: mode === m ? '#1f2937' : 'transparent',
                                color: mode === m ? '#60a5fa' : '#9ca3af', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                borderBottom: mode === m ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.3s'
                            }}>
                                {m === 'signin' ? 'Sign In' : 'Join Now'}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ padding: '2.5rem', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#1f2937', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

                    {mode === 'signin' ? (
                        <form onSubmit={handleSignIn}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Welcome Back</h2>
                            <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '0.95rem' }}>Enter your credentials to access the {role} portal.</p>

                            <div style={inputContainerStyle}>
                                <User style={iconStyle} />
                                <input type="text" style={inputStyle} required value={username} onChange={e => setUsername(e.target.value)} placeholder="Email or Username" disabled={isLoading} />
                            </div>

                            <div style={inputContainerStyle}>
                                <Lock style={iconStyle} />
                                <input type={showPassword ? "text" : "password"} style={inputStyle} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" disabled={isLoading} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ accentColor: '#3b82f6' }} /> Remember me
                                </label>
                                <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer' }}>Forgot Password?</button>
                            </div>

                            <button type="submit" disabled={isLoading} style={{
                                width: '100%', padding: '1rem', borderRadius: '16px', background: isLoading ? '#374151' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                            }}>
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                                {isLoading ? 'Securing Session...' : ''}
                            </button>

                        </form>
                    ) : (
                        <form onSubmit={handleRegisterSubmit}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Create Account</h2>
                            <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Join the Compass 360 educational community.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={inputContainerStyle}><input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" disabled={isLoading} /></div>
                                <div style={inputContainerStyle}><input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" disabled={isLoading} /></div>
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
                                        <select style={{ ...inputStyle, appearance: 'none' }} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} disabled={isLoading}>
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
                                    <input type="text" style={inputStyle} required value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Institution Name (e.g. Hillside Academy)" disabled={isLoading} />
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

                            <button type="submit" disabled={isLoading} style={{
                                width: '100%', padding: '1rem', borderRadius: '16px', background: isLoading ? '#374151' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                            }}>
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Complete Registration'}
                                {isLoading ? 'Verifying Details...' : ''}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignUpModal;
