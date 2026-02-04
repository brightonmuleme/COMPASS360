import React, { useState, useEffect } from 'react';
import styles from '../../app/landing.module.css';
import { useRouter } from 'next/navigation';
import { useSchoolData } from '@/lib/store';
import { authService } from '@/services/authService';
import { Eye, EyeOff, User, Lock, Mail, Phone, Building, Hash, Check, AlertCircle, ArrowLeft } from 'lucide-react';

interface SignUpModalProps {
    role: 'student' | 'school' | 'tutor' | 'accountant';
    onClose: () => void;
    initialMode?: 'signup' | 'signin';
}

// Mock list of taken usernames for demonstration
const TAKEN_USERNAMES = ['admin', 'user', 'brightoni', 'john', 'doe'];

const SignUpModal: React.FC<SignUpModalProps> = ({ role, onClose, initialMode = 'signup' }) => {
    const router = useRouter();
    // Mode: 'signup' | 'signin' | 'payment' | 'account_info' | 'verification' | 'new_password'
    const [mode, setMode] = useState<string>(initialMode);
    const [showPassword, setShowPassword] = useState(false);

    // Payment State
    const [selectedPlan, setSelectedPlan] = useState('1 month Premium plan @ 30k Ugx');
    const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card' | 'paypal'>('mobile_money');
    const [paymentPhone, setPaymentPhone] = useState('');
    const [mobileNetwork, setMobileNetwork] = useState('airtel');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVC, setCardCVC] = useState('');

    // Common Form State
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Verification State
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Student Specific
    const [selectedSchool, setSelectedSchool] = useState('');
    const [payCode, setPayCode] = useState('');

    const {
        staffAccounts, tutors, students, setActiveRole,
        setStudentProfile, setTutorProfile, logout,
        featuredSchools
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

    // Initialize payment phone
    useEffect(() => {
        if (phoneNumber && !paymentPhone) {
            setPaymentPhone(phoneNumber);
        }
    }, [phoneNumber, paymentPhone]);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (role !== 'student' && !usernameAvailable) {
            alert("Username is already taken!");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (role === 'student' && payCode && !selectedSchool) {
            alert("Please select a school to associate with your Pay Code.");
            return;
        }

        let userRole = 'Student';
        if (role === 'tutor') userRole = 'Tutor';
        if (role === 'school') userRole = 'Director';
        if (role === 'accountant') userRole = 'Bursar';

        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+256${phoneNumber.replace(/^0/, '')}`;
            const result = await authService.signUp({
                username: username,
                password: password,
                email: email,
                name: `${firstName} ${lastName}`,
                phoneNumber: formattedPhone,
                role: userRole
            });

            if (result.success) {
                alert(`Account created! Please check your email (${email}) for the verification code.`);
                setMode('verification');
            } else {
                alert(`Registration Failed: ${result.error}`);
            }

        } catch (err: any) {
            console.error("Registration Error", err);
            alert("An error occurred during registration. Please try again.");
        }
    };

    const handleNewPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await authService.confirmSignIn(newPassword);
            if (result.success) {
                proceedToLogin();
            } else {
                alert(`Password Update Failed: ${result.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleVerificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await authService.confirmSignUp(username, verificationCode);
            if (result.success) {
                alert("Verification Successful! You can now log in.");
                setMode('signin');
            } else {
                alert(`Verification Failed: ${result.error}`);
            }
        } catch (err) {
            alert("Verification failed. Please check the code and try again.");
        }
    };

    const proceedToLogin = async () => {
        // Reuse the success logic
        const attributes = await authService.getUserAttributes();
        const dbRole = attributes['nickname'] || attributes['custom:role'] || 'Student'; // Default if missing

        let redirectPath = '/student';
        let userRole = 'Student';

        if (dbRole === 'Tutor') {
            userRole = 'Tutor';
            redirectPath = '/tutor';
        } else if (dbRole === 'Director' || dbRole === 'School') {
            userRole = 'Director';
            redirectPath = '/portal';
        } else if (dbRole === 'Bursar') {
            userRole = 'Bursar';
            redirectPath = '/bursar';
        }

        logout();
        setActiveRole(userRole as any);
        router.push(redirectPath);
        onClose();
    }

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- 0. BYPASS FOR DEMO ACCOUNTS (Local Testing) ---
        const demoUsers = ['PAY-001', 'director', 'bursar', 'sarah.n@vine.ac.ug'];
        if (demoUsers.includes(username)) {
            // Logic handled below
        } else {
            // --- 1. REAL AUTHENTICATION (AWS) ---
            try {
                const response = await authService.login({ username, password });
                if (response.success) {
                    await proceedToLogin();
                    return;
                } else {
                    if (response.error === 'NEW_PASSWORD_REQUIRED') {
                        setMode('new_password');
                        return;
                    }
                    if (response.error) {
                        alert(`Login Failed: ${response.error}`);
                        return;
                    }
                }
            } catch (err) {
                console.error("Login exception:", err);
            }
        }

        // --- DEMO FALLBACKS ---
        if (username === 'sarah.n@vine.ac.ug' && password === 'password123') {
            logout();
            setTutorProfile({ id: 'tutor_1', name: 'Dr. Sarah N', email: 'sarah.n@vine.ac.ug', role: 'Tutor', subscriptionDaysLeft: 30 });
            router.push('/tutor'); onClose(); return;
        }
        if (username === 'director' && password === 'password123') {
            logout(); setActiveRole('Director'); router.push('/portal'); onClose(); return;
        }
        if (username === 'PAY-001' && password === 'password123') {
            logout();
            setStudentProfile({
                id: '101', name: 'JOHN KAMAU', email: 'john.k@vine.ac.ug', phoneNumber: '0700000000', payCode: 'PAY-001',
                linkedStudentCode: 'PAY-001', schoolId: '1', likedContentIds: [], subscribedTutorIds: [],
                subscriptionStatus: 'active', subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            router.push('/student'); onClose(); return;
        }
        if (username === 'bursar' && password === 'password123') {
            logout(); setActiveRole('Bursar'); router.push('/bursar'); onClose(); return;
        }

        const staff = staffAccounts.find(s => (s.username === username || s.name === username) && s.password === password);
        if (staff && staff.role) {
            logout(); setActiveRole(staff.role); router.push('/portal'); onClose(); return;
        }
        const tutor = tutors.find(t => (t.email === username || t.name === username) && t.password === password);
        if (tutor) {
            logout();
            setTutorProfile({ id: tutor.id, name: tutor.name, email: tutor.email, role: 'Tutor', subscriptionDaysLeft: tutor.subscriptionDaysLeft });
            router.push('/tutor'); onClose(); return;
        }
        const student = students.find(s => (s.email === username || s.payCode === username || s.name === username) && (s.password ? s.password === password : password === 'password123'));
        if (student) {
            logout();
            setStudentProfile({
                id: student.id.toString(), name: student.name, email: student.email || username, phoneNumber: student.phoneNumber, payCode: student.payCode,
                linkedStudentCode: student.payCode?.startsWith('GUEST-') ? undefined : student.payCode,
                schoolId: student.payCode?.startsWith('GUEST-') ? undefined : (featuredSchools[0]?.id || '1'),
                likedContentIds: [], subscribedTutorIds: [], subscriptionStatus: (student.subscriptionDaysLeft ?? 0) > 0 ? 'active' : 'expired',
                subscriptionEndDate: student.subscriptionExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            router.push('/student'); onClose(); return;
        }

        alert("Invalid credentials. Please check your username and password.");
    };

    const handlePaymentSubmit = () => {
        alert("Payment Logic Placeholder");
        onClose();
    }

    // Styles for Inputs
    const inputContainerStyle: React.CSSProperties = {
        position: 'relative',
        marginBottom: '1rem',
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af',
        width: '18px',
        height: '18px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.875rem 0.875rem 0.875rem 2.75rem',
        borderRadius: '12px',
        border: '1px solid #374151',
        background: '#1f2937',
        color: 'white',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s'
    };

    // Helper to auto-fill demo
    const fillDemo = () => {
        if (role === 'tutor') { setUsername('sarah.n@vine.ac.ug'); setPassword('password123'); }
        else if (role === 'school') { setUsername('director'); setPassword('password123'); }
        else if (role === 'student') { setUsername('PAY-001'); setPassword('password123'); }
        else if (role === 'accountant') { setUsername('bursar'); setPassword('password123'); }
    }

    return (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                className={styles.modalContent}
                style={{
                    maxWidth: (mode === 'signup' && role !== 'school') ? '600px' : '480px', // Wider for student signup
                    padding: '0',
                    borderRadius: '24px',
                    background: '#111827', // Dark background
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid #374151',
                    overflow: 'hidden'
                }}
            >
                {/* --- HEADER (Tabs) --- */}
                {(mode === 'signin' || mode === 'signup') && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #374151' }}>
                        <button
                            onClick={() => setMode('signin')}
                            style={{ flex: 1, padding: '1.25rem', background: mode === 'signin' ? '#1f2937' : 'transparent', color: mode === 'signin' ? '#3b82f6' : '#9ca3af', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderBottom: mode === 'signin' ? '2px solid #3b82f6' : 'none' }}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setMode('signup')}
                            style={{ flex: 1, padding: '1.25rem', background: mode === 'signup' ? '#1f2937' : 'transparent', color: mode === 'signup' ? '#3b82f6' : '#9ca3af', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderBottom: mode === 'signup' ? '2px solid #3b82f6' : 'none' }}
                        >
                            Create Account
                        </button>
                    </div>
                )}

                {/* --- CONTENT CONTAINER --- */}
                <div style={{ padding: '2rem' }}>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer', zIndex: 10 }} onClick={onClose}>
                        <div style={{ background: '#374151', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✕</div>
                    </div>

                    {/* --- SIGN IN VIEW --- */}
                    {mode === 'signin' && (
                        <form onSubmit={handleSignIn} style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                                Welcome back
                            </h2>
                            <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '0.9rem' }}>
                                Access your {role} portal securely.
                            </p>

                            <div style={inputContainerStyle}>
                                <User size={18} style={iconStyle} />
                                <input
                                    type="text"
                                    style={inputStyle}
                                    required
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Username or Email"
                                />
                            </div>

                            <div style={inputContainerStyle}>
                                <Lock size={18} style={iconStyle} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    style={inputStyle}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                />
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ accentColor: '#3b82f6' }} /> Remember me
                                </label>
                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', cursor: 'pointer' }}>Forgot Password?</span>
                            </div>

                            <button type="submit" className={styles.btnPrimary} style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', fontSize: '1rem', fontWeight: 600 }}>
                                Log In
                            </button>

                            {/* Demo Link */}
                            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                <button type="button" onClick={fillDemo} style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                    (Dev) Auto-fill Demo Credentials
                                </button>
                            </div>
                        </form>
                    )}

                    {/* --- SIGN UP VIEW --- */}
                    {mode === 'signup' && (
                        <form onSubmit={handleRegisterSubmit} style={{ animation: 'fadeIn 0.3s' }}>
                            {role === 'accountant' ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#9ca3af' }}>
                                    <AlertCircle size={48} style={{ margin: '0 auto 1rem', display: 'block', color: '#ef4444' }} />
                                    <p>Registration for Bursars is invite-only by the School Director.</p>
                                </div>
                            ) : (
                                <>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                                        Join Compass 360
                                    </h2>
                                    <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Create your {role} account today.
                                    </p>

                                    {/* Name Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={inputContainerStyle}>
                                            <input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" />
                                        </div>
                                        <div style={inputContainerStyle}>
                                            <input type="text" style={{ ...inputStyle, paddingLeft: '1rem' }} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" />
                                        </div>
                                    </div>

                                    <div style={inputContainerStyle}>
                                        <User size={18} style={iconStyle} />
                                        <input
                                            type="text"
                                            style={{ ...inputStyle, borderColor: usernameAvailable === false ? '#ef4444' : (usernameAvailable ? '#10b981' : '#374151') }}
                                            required
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="Choose a Username"
                                        />
                                        {usernameAvailable !== null && (
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                                {usernameAvailable ? <Check size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                                            </div>
                                        )}
                                    </div>

                                    <div style={inputContainerStyle}>
                                        <Mail size={18} style={iconStyle} />
                                        <input type="email" style={inputStyle} required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" />
                                    </div>

                                    {/* Phone & Password Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
                                        <div style={inputContainerStyle}>
                                            <Phone size={18} style={iconStyle} />
                                            <input type="tel" style={inputStyle} required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone Number" />
                                        </div>
                                    </div>

                                    {/* School Specific */}
                                    {role === 'student' && (
                                        <div style={inputContainerStyle}>
                                            <Building size={18} style={iconStyle} />
                                            <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                                                <option value="" style={{ color: '#9ca3af' }}>Select School (Optional)</option>
                                                <option value="vine_high">Vine High School</option>
                                                <option value="st_marys">St. Mary's College</option>
                                            </select>
                                        </div>
                                    )}

                                    {role === 'student' && selectedSchool && (
                                        <div style={inputContainerStyle}>
                                            <Hash size={18} style={iconStyle} />
                                            <input type="text" style={inputStyle} required value={payCode} onChange={e => setPayCode(e.target.value)} placeholder="Enter Pay Code" />
                                        </div>
                                    )}

                                    <div style={inputContainerStyle}>
                                        <Lock size={18} style={iconStyle} />
                                        <input type="password" style={inputStyle} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Create Password" />
                                    </div>

                                    <div style={inputContainerStyle}>
                                        <Lock size={18} style={iconStyle} />
                                        <input type="password" style={inputStyle} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
                                    </div>

                                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', background: 'linear-gradient(to right, #34d399, #10b981)', fontSize: '1rem', fontWeight: 600 }}>
                                        Create Account
                                    </button>
                                </>
                            )}
                        </form>
                    )}

                    {/* --- VERIFICATION VIEW --- */}
                    {mode === 'verification' && (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                            <div style={{ background: '#1f2937', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #3b82f6' }}>
                                <Mail size={32} color="#3b82f6" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Check your Email</h2>
                            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>We sent a code to <span style={{ color: 'white' }}>{email}</span>.</p>

                            <form onSubmit={handleVerificationSubmit}>
                                <div style={inputContainerStyle}>
                                    <Hash size={18} style={iconStyle} />
                                    <input
                                        type="text"
                                        style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        required
                                        value={verificationCode}
                                        onChange={e => setVerificationCode(e.target.value)}
                                        placeholder="000 000"
                                    />
                                </div>
                                <button type="submit" className={styles.btnPrimary} style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', background: '#3b82f6', fontSize: '1rem', fontWeight: 600 }}>
                                    Verify & Log In
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignUpModal;
