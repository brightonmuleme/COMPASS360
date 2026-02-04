import React, { useState, useEffect } from 'react';
import styles from '../../app/landing.module.css';
import { useRouter } from 'next/navigation';
import { useSchoolData, StaffAccount, Tutor, EnrolledStudent } from '@/lib/store';
import { authService } from '@/services/authService';

interface SignUpModalProps {
    role: 'student' | 'school' | 'tutor' | 'accountant';
    onClose: () => void;
    initialMode?: 'signup' | 'signin';
}

// Mock list of taken usernames for demonstration
const TAKEN_USERNAMES = ['admin', 'user', 'brightoni', 'john', 'doe'];

const SignUpModal: React.FC<SignUpModalProps> = ({ role, onClose, initialMode = 'signup' }) => {
    const router = useRouter();
    // Mode: 'signup' or 'signin' or 'payment' or 'account_info' or 'verification'
    const [mode, setMode] = useState<'signup' | 'signin' | 'payment' | 'account_info' | 'verification'>(initialMode);

    // Payment State
    const [selectedPlan, setSelectedPlan] = useState('1 month Premium plan @ 30k Ugx');
    const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card' | 'paypal'>('mobile_money');
    const [paymentPhone, setPaymentPhone] = useState('');
    const [mobileNetwork, setMobileNetwork] = useState('airtel'); // Default

    // Card State
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

    // Account Settings State (simulating Image 2)


    // Student Specific
    const [selectedSchool, setSelectedSchool] = useState('');
    const [payCode, setPayCode] = useState('');

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

    // Initialize payment phone from signup phone
    useEffect(() => {
        if (phoneNumber && !paymentPhone) {
            setPaymentPhone(phoneNumber);
        }
    }, [phoneNumber, paymentPhone]);

    const {
        staffAccounts, tutors, students, setActiveRole,
        setStudentProfile, setTutorProfile, logout,
        featuredSchools, addStudent, addTutor, addStaffAccount
    } = useSchoolData();

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

        // --- REAL REGISTRATION ---
        let userRole = 'Student';
        if (role === 'tutor') userRole = 'Tutor';
        if (role === 'school') userRole = 'Director'; // Or 'School'
        if (role === 'accountant') userRole = 'Bursar';

        try {
            // Note: We use the 'email' field as the username for simplicity in this flow,
            // or the 'username' field if your Cognito pool allows it.
            // Based on previous code, 'username' seems to be the main identifier.

            // Format phone number to E.164 if possible, or just pass as is (Cognito is strict)
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+256${phoneNumber.replace(/^0/, '')}`;

            const result = await authService.signUp({
                username: username, // Using username as the unique ID
                password: password,
                email: email,
                name: `${firstName} ${lastName}`,
                phoneNumber: formattedPhone, // rigorous formatting needed in prod
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

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- REAL AUTHENTICATION ---
        try {
            // 1. Attempt Real Login
            const response = await authService.login({ username, password });

            if (response.success) {
                // Login Successful!
                console.log("Real login successful", response);

                // Fetch User Attributes to determine Role
                const attributes = await authService.getUserAttributes();
                const dbRole = attributes['custom:role'] || 'Student'; // Default if missing
                const dbSchoolId = attributes['custom:schoolId'] || '1';

                let redirectPath = '/student';
                let userRole = 'Student';

                if (dbRole === 'Tutor') {
                    userRole = 'Tutor';
                    redirectPath = '/tutor';
                } else if (dbRole === 'Director' || dbRole === 'School') {
                    userRole = 'Director';
                    redirectPath = '/admin';
                } else if (dbRole === 'Bursar') {
                    userRole = 'Bursar';
                    redirectPath = '/bursar';
                } else {
                    // Default / Student
                    userRole = 'Student';
                    redirectPath = '/student';
                }

                logout(); // Clear any old mock state
                setActiveRole(userRole);

                // If it's a student, we might want to set the student profile. 
                // Since we don't have the full student object from Cognito yet, we might need to fetch it or mock it minimally.
                if (userRole === 'Student') {
                    setStudentProfile({
                        id: 'cognito_user',
                        name: username, // or use sub
                        email: username,
                        // Defaults
                        schoolId: '1',
                        linkedStudentCode: '',
                        likedContentIds: [],
                        subscribedTutorIds: [],
                        subscriptionStatus: 'active',
                        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                }
                else if (userRole === 'Tutor') {
                    setTutorProfile({
                        id: 'cognito_tutor',
                        name: username,
                        email: username,
                        role: 'Tutor',
                        subscriptionDaysLeft: 30
                    });
                }

                router.push(redirectPath);
                onClose();
                return;
            } else {
                console.warn("Real login failed:", response.error);
                // Fallthrough to mock login if real login fails (optional, or show error)
                // If the error was "Incorrect username or password", we should probably stop here and show it
                if (response.error) {
                    alert(`Login Failed: ${response.error}`);
                    return;
                }
            }
        } catch (err) {
            console.error("Login exception:", err);
        }

        // --- EMERGENCY DEMO LOGIN BYPASS (FALLBACK) ---
        // Fixes "Invalid Credentials" if local storage is stale or empty
        if (username === 'sarah.n@vine.ac.ug' && password === 'password123') {
            logout();
            setTutorProfile({ id: 'tutor_1', name: 'Dr. Sarah N', email: 'sarah.n@vine.ac.ug', role: 'Tutor', subscriptionDaysLeft: 30 });
            router.push('/tutor');
            onClose();
            return;
        }
        if (username === 'director' && password === 'password123') {
            logout();
            setActiveRole('Director');
            router.push('/portal');
            onClose();
            return;
        }
        if (username === 'PAY-001' && password === 'password123') {
            logout();
            setStudentProfile({
                id: '101', name: 'JOHN KAMAU', email: 'john.k@vine.ac.ug', phoneNumber: '0700000000', payCode: 'PAY-001',
                linkedStudentCode: 'PAY-001', schoolId: '1', likedContentIds: [], subscribedTutorIds: [],
                subscriptionStatus: 'active', subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            router.push('/student');
            onClose();
            return;
        }
        if (username === 'bursar' && password === 'password123') {
            logout();
            setActiveRole('Bursar');
            router.push('/bursar');
            onClose();
            return;
        }

        // 1. Check Staff Accounts (Director, Registrar, Bursar, etc.)
        const staff = staffAccounts.find(s => (s.username === username || s.name === username) && s.password === password);
        if (staff && staff.role) {
            logout();

            setActiveRole(staff.role);
            router.push('/portal');
            onClose();
            return;
        }

        // 2. Check Tutors
        const tutor = tutors.find(t => (t.email === username || t.name === username) && t.password === password);
        if (tutor) {
            logout();

            setTutorProfile({
                id: tutor.id,
                name: tutor.name,
                email: tutor.email,
                role: 'Tutor',
                subscriptionDaysLeft: tutor.subscriptionDaysLeft
            });
            router.push('/tutor');
            onClose();
            return;
        }

        // 3. Check Students
        const student = students.find(s => (s.email === username || s.payCode === username || s.name === username) && (s.password ? s.password === password : password === 'password123'));
        if (student) {
            logout();

            setStudentProfile({
                id: student.id.toString(),
                name: student.name,
                email: student.email || username,
                phoneNumber: student.phoneNumber,
                payCode: student.payCode,
                linkedStudentCode: student.payCode?.startsWith('GUEST-') ? undefined : student.payCode,
                schoolId: student.payCode?.startsWith('GUEST-') ? undefined : (featuredSchools[0]?.id || '1'),
                likedContentIds: [],
                subscribedTutorIds: [],
                subscriptionStatus: (student.subscriptionDaysLeft ?? 0) > 0 ? 'active' : 'expired',
                subscriptionEndDate: student.subscriptionExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            router.push('/student');
            onClose();
            return;
        }

        alert("Invalid credentials. Please check your username and password.");
    };

    const handlePaymentSubmit = () => {
        if (paymentMethod === 'mobile_money') {
            if (!paymentPhone) {
                alert("Please enter a phone number to charge.");
                return;
            }
            if (!/^\d{9,15}$/.test(paymentPhone.replace(/\+/g, '').replace(/\s/g, ''))) {
                alert("Please enter a valid phone number.");
                return;
            }
            alert(`Payment Initiated via ${mobileNetwork} on ${paymentPhone}! \n\nCheck your device for the prompt.`);
        } else if (paymentMethod === 'card') {
            if (!cardNumber || !cardExpiry || !cardCVC) {
                alert("Please fill in all card details.");
                return;
            }
            alert("Processing Card Payment... Success!");
        } else if (paymentMethod === 'paypal') {
            alert("Redirecting to PayPal... Payment Success!");
        }
        onClose();
    }

    const handleUpdateAccountInfo = () => {
        if (!/^\d{9,15}$/.test(paymentPhone.replace(/\+/g, '').replace(/\s/g, ''))) {
            alert("Invalid Phone Number. Please check and try again.");
            return;
        }
        // Save logic would be here
        alert("Account info updated successfully!");
        setMode('payment');
    };

    return (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                className={styles.modalContent}
                style={{
                    maxWidth: (mode === 'payment' || mode === 'account_info') ? '500px' : '420px',
                    padding: '2.5rem',
                    transition: 'all 0.3s ease',
                    background: mode === 'account_info' ? '#fff' : undefined
                }}
            >
                <button className={styles.closeButton} onClick={onClose} style={{ color: mode === 'account_info' ? '#333' : 'white' }}>✕</button>

                {/* --- LOGIN VIEW --- */}
                {mode === 'signin' && (
                    <form onSubmit={handleSignIn} style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                            {role === 'tutor' ? 'Tutor Portal' : role === 'school' ? 'School Portal' : 'Sign In'}
                        </h2>

                        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            login to access!
                        </div>

                        <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                            <label className={styles.label}>Email / Username:</label>
                            <input type="text" className={styles.input} required value={username} onChange={e => setUsername(e.target.value)} placeholder="your email or username" />
                        </div>

                        <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <label className={styles.label}>Password:</label>
                                <span style={{ fontSize: '0.75rem', color: '#16a34a', cursor: 'pointer' }}>Forgot password?</span>
                            </div>
                            <input type="password" className={styles.input} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                        </div>

                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (role === 'tutor') {
                                        setUsername('sarah.n@vine.ac.ug');
                                        setPassword('password123');
                                    } else if (role === 'school') {
                                        setUsername('director');
                                        setPassword('password123');
                                    } else if (role === 'student') {
                                        setUsername('PAY-001');
                                        setPassword('password123');
                                    } else if (role === 'accountant') {
                                        setUsername('bursar');
                                        setPassword('password123');
                                    }
                                }}
                                style={{
                                    background: '#e0f2fe',
                                    color: '#0284c7',
                                    border: '1px dashed #0284c7',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                }}
                            >
                                ⚡ Auto-Fill Demo Credentials
                            </button>
                        </div>

                        <button type="submit" className={styles.btnPrimary} style={{ width: '100%', marginTop: '0.5rem', background: '#74c043', padding: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                            Sign In
                        </button>

                        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#888' }}>
                            Don't have an account? <span style={{ color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setMode('signup')}>signup</span>
                        </div>
                    </form>
                )}

                {/* --- ACCOUNT INFO / SETTINGS VIEW (Image 2) --- */}
                {mode === 'account_info' && (
                    <div style={{ color: '#333', textAlign: 'left', animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => setMode('payment')}>
                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem', fontWeight: 'bold' }}>←</span>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Upgrade to premium</h2>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>My account - <span style={{ color: '#74c043' }}>{username || 'Brightoni'}</span></h3>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>Created: 2026-01-28 19:01:02</div>
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Username:</label>
                            <input type="text" value={username} readOnly style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#333' }} />
                        </div>

                        <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#666' }}>Default phone:</label>
                                <span style={{ background: 'red', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Change mobile money number</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', width: '80px' }} defaultValue="+256">
                                    <option>🇺🇬 +256</option>
                                    <option>🇷🇺 +7</option>
                                </select>
                                <input
                                    type="text"
                                    value={paymentPhone}
                                    onChange={e => setPaymentPhone(e.target.value)}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                                />
                            </div>
                        </div>



                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Email address:</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333' }} />
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>First name:</label>
                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333' }} />
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Last name:</label>
                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333' }} />
                        </div>

                        <button
                            onClick={handleUpdateAccountInfo}
                            className={styles.btnPrimary}
                            style={{ width: '100%', marginTop: '1rem', background: '#74c043', padding: '1rem', fontSize: '1rem', fontWeight: 600, color: '#fff' }}
                        >
                            Update account info
                        </button>
                    </div>
                )}

                {/* --- PAYMENT VIEW --- */}
                {mode === 'payment' && (
                    <div style={{ color: '#fff', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                        <h2 style={{ fontSize: '1.2rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                            CHOOSE {role === 'school' ? 'SCHOOL' : role === 'tutor' ? 'TUTOR' : 'PREMIUM'} SUBSCRIPTION PLAN
                        </h2>

                        <div style={{ margin: '2rem 0' }}>
                            <select
                                className={styles.input}
                                value={selectedPlan}
                                onChange={e => setSelectedPlan(e.target.value)}
                                style={{ background: '#fff', color: '#333', fontWeight: 'bold' }}
                            >
                                <option>1 month Premium plan @ 30k Ugx</option>
                                <option>3 months Premium plan @ 80k Ugx</option>
                                <option>1 year Premium plan @ 300k Ugx</option>
                            </select>
                        </div>

                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            UGX {selectedPlan.includes('30k') ? '30k' : selectedPlan.includes('80k') ? '80k' : '300k'}
                        </div>
                        <div style={{ color: '#888', marginBottom: '2rem' }}>
                            {selectedPlan.includes('1 month') ? '31 days' : selectedPlan.includes('3 months') ? '93 days' : '365 days'}
                        </div>

                        <div style={{ borderTop: '1px dashed #444', margin: '1rem 0' }}></div>

                        <div style={{ textAlign: 'left', marginBottom: '1rem', color: '#ccc', fontWeight: 600 }}>
                            {selectedPlan.split('@')[0].toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left', color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Continue by selecting payment method
                        </div>

                        {/* Payment Methods */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Mobile Money */}
                            <div
                                style={{
                                    background: '#f5f5f5', borderRadius: '8px', padding: '1rem',
                                    border: paymentMethod === 'mobile_money' ? '2px solid #0071e3' : '1px solid #ddd',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setPaymentMethod('mobile_money')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ width: '24px', height: '24px', background: mobileNetwork === 'airtel' ? '#ff0000' : '#ffd700', borderRadius: '4px' }}></div> {/* Airtel Red, MTN Yellow */}
                                        <span style={{ color: '#333', fontWeight: 'bold' }}>{mobileNetwork === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money'}</span>
                                    </div>
                                    <input type="radio" checked={paymentMethod === 'mobile_money'} readOnly />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'left', marginLeft: '2rem' }}>
                                    <span
                                        style={{ color: '#0071e3', cursor: 'pointer', fontWeight: 'bold' }}
                                        onClick={(e) => { e.stopPropagation(); setMobileNetwork(mobileNetwork === 'airtel' ? 'mtn' : 'airtel'); }}
                                    >
                                        Change to {mobileNetwork === 'airtel' ? 'MTN' : 'Airtel'} Mobile Money
                                    </span>
                                </div>
                            </div>

                            {paymentMethod === 'mobile_money' && (
                                <div style={{ animation: 'fadeIn 0.3s' }}>
                                    <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>📱 Select mobile number to be charged</span>
                                    </div>

                                    {/* Display Selected Number or ADD BUTTON */}
                                    {paymentPhone ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{paymentPhone}</span>
                                            <button
                                                onClick={() => setMode('account_info')}
                                                style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setMode('account_info')}
                                            style={{
                                                width: '100%',
                                                textAlign: 'center',
                                                background: '#3f5d88', // Muted blue button as in mockup
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.75rem',
                                                borderRadius: '20px',
                                                fontWeight: 600,
                                                marginBottom: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            ADD PHONE NUMBER <span style={{ background: '#fff', color: '#3f5d88', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>+</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handlePaymentSubmit}
                                        style={{
                                            width: '100%',
                                            background: '#3b82f6', color: 'white', border: 'none',
                                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
                                        }}
                                    >
                                        PAY
                                    </button>
                                </div>
                            )}

                            {/* Card Payment */}
                            <div
                                style={{
                                    background: '#f5f5f5', borderRadius: '8px', padding: '1rem',
                                    border: paymentMethod === 'card' ? '2px solid #0071e3' : '1px solid #ddd',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setPaymentMethod('card')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.2rem' }}>💳</span>
                                        <span style={{ color: '#333', fontWeight: 'bold' }}>VISA / MasterCard</span>
                                    </div>
                                    <input type="radio" checked={paymentMethod === 'card'} readOnly />
                                </div>
                            </div>

                            {paymentMethod === 'card' && (
                                <div style={{ animation: 'fadeIn 0.3s', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <input type="text" className={styles.input} placeholder="Card Number (0000 0000 0000 0000)" value={cardNumber} onChange={e => setCardNumber(e.target.value)} style={{ marginBottom: '0.5rem', background: '#fff', color: '#333' }} />
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input type="text" className={styles.input} placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} style={{ background: '#fff', color: '#333', width: '50%' }} />
                                        <input type="text" className={styles.input} placeholder="CVC" value={cardCVC} onChange={e => setCardCVC(e.target.value)} style={{ background: '#fff', color: '#333', width: '50%' }} />
                                    </div>
                                    <button
                                        onClick={handlePaymentSubmit}
                                        style={{
                                            width: '100%',
                                            marginTop: '1rem',
                                            background: '#3b82f6', color: 'white', border: 'none',
                                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
                                        }}
                                    >
                                        PAY
                                    </button>
                                </div>
                            )}

                            {/* PayPal Payment */}
                            <div
                                style={{
                                    background: '#f5f5f5', borderRadius: '8px', padding: '1rem',
                                    border: paymentMethod === 'paypal' ? '2px solid #0071e3' : '1px solid #ddd',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setPaymentMethod('paypal')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.2rem', color: '#003087', fontWeight: 'bold' }}>PayPal</span>
                                    </div>
                                    <input type="radio" checked={paymentMethod === 'paypal'} readOnly />
                                </div>
                            </div>

                            {paymentMethod === 'paypal' && (
                                <div style={{ animation: 'fadeIn 0.3s', padding: '0.5rem', textAlign: 'center' }}>
                                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>You will be redirected to PayPal to complete your purchase safely.</p>
                                    <button
                                        onClick={handlePaymentSubmit}
                                        style={{
                                            width: '100%',
                                            marginTop: '1rem',
                                            background: '#ffc439', color: '#000', border: 'none',
                                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
                                        }}
                                    >
                                        Proceed to PayPal
                                    </button>
                                </div>
                            )}

                        </div>

                        <div style={{ marginTop: '2rem', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            PROM: SUBSCRIBE 3 MONTHS OR MORE - GET 1 MONTH FREE!
                        </div>

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
                            <button
                                onClick={() => {
                                    const routes = {
                                        student: '/student',
                                        tutor: '/tutor',
                                        school: '/admin',
                                        accountant: '/bursar'
                                    };
                                    alert(`Welcome! Redirecting to ${role} portal with Limited Access.`);
                                    router.push(routes[role]);
                                    onClose();
                                }}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #666',
                                    color: '#ccc',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    marginTop: '0.5rem'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#fff'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#666'}
                            >
                                Continue with Limited Access
                            </button>
                        </div>
                    </div>
                )}

                {/* --- REGISTER VIEW --- */}
                {mode === 'signup' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Start your Journey</h2>
                            <div style={{ width: '50px', height: '4px', background: '#34c759', margin: '0 auto 1.5rem auto' }}></div>
                        </div>

                        {['student', 'school', 'tutor'].includes(role) && (
                            <form onSubmit={handleRegisterSubmit}>
                                {role === 'school' ? (
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>School Name / ID</label>
                                        <input type="text" className={styles.input} required value={username} onChange={e => setUsername(e.target.value)} placeholder="VineHigh" />
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div className={styles.formGroup} style={{ flex: 1 }}>
                                                <label className={styles.label}>First Name</label>
                                                <input type="text" className={styles.input} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                                            </div>
                                            <div className={styles.formGroup} style={{ flex: 1 }}>
                                                <label className={styles.label}>Last Name</label>
                                                <input type="text" className={styles.input} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Username</label>
                                            <input type="text" className={styles.input} required value={username} onChange={e => setUsername(e.target.value)} placeholder="CoolUser123"
                                                style={{ borderColor: usernameAvailable === false ? 'red' : usernameAvailable === true ? 'green' : undefined }} />
                                            {username.length > 0 && <div style={{ fontSize: '0.8rem', marginTop: '4px', color: usernameAvailable ? 'green' : 'red', fontWeight: 'bold' }}>{usernameAvailable ? 'OK' : 'Taken'}</div>}
                                        </div>
                                    </>
                                )}

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email</label>
                                    <input type="email" className={styles.input} required value={email} onChange={e => setEmail(e.target.value)} placeholder={`${role}@example.com`} />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Telephone no:</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            className={styles.input}
                                            style={{ width: '160px', padding: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', color: '#333', backgroundColor: '#fff' }}
                                            defaultValue="+256"
                                        >
                                            <option value="+256" style={{ color: '#333' }}>🇺🇬 Uganda (+256)</option>
                                            <option value="+254" style={{ color: '#333' }}>🇰🇪 Kenya (+254)</option>
                                            <option value="+255" style={{ color: '#333' }}>🇹🇿 Tanzania (+255)</option>
                                            <option value="+250" style={{ color: '#333' }}>🇷🇼 Rwanda (+250)</option>
                                            <option value="+1" style={{ color: '#333' }}>🇺🇸 USA (+1)</option>
                                            <option value="+44" style={{ color: '#333' }}>🇬🇧 UK (+44)</option>
                                        </select>
                                        <input
                                            type="tel"
                                            className={styles.input}
                                            required
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setPhoneNumber(val);
                                            }}
                                            placeholder="700123456"
                                            style={{ flex: 1 }}
                                            pattern="[0-9]{8,15}"
                                            title="Please enter a valid phone number (digits only)"
                                        />
                                    </div>
                                </div>

                                {role === 'student' && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>School <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal' }}>(Optional)</span></label>
                                        <select className={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                                            <option value="">Select your school...</option>
                                            <option value="vine_high">Vine High School</option>
                                            <option value="st_marys">St. Mary's College</option>
                                            <option value="international">Kampala International</option>
                                        </select>
                                    </div>
                                )}

                                {role === 'student' && selectedSchool && (
                                    <div className={styles.formGroup} style={{ animation: 'fadeIn 0.3s' }}>
                                        <label className={styles.label}>Pay Code <span style={{ color: 'red' }}>*</span> (From Bursar)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            required={!!selectedSchool}
                                            value={payCode}
                                            onChange={e => setPayCode(e.target.value)}
                                            placeholder="Enter Pay Code or Student ID"
                                        />
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                                            Required to link your account to {selectedSchool}.
                                        </div>
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Password:</label>
                                    <input type="password" className={styles.input} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Confirm Password:</label>
                                    <input type="password" className={styles.input} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••••" />
                                </div>

                                <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        required
                                        checked={acceptedTerms}
                                        onChange={e => setAcceptedTerms(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#34c759' }}
                                    />
                                    <label style={{ fontSize: '0.85rem', color: acceptedTerms ? '#34c759' : '#666' }}>
                                        I accept the <span style={{ fontWeight: 'bold' }}>Terms and Conditions</span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                    style={{
                                        width: '100%',
                                        marginTop: '1.5rem',
                                        background: '#74c043',
                                        padding: '1rem',
                                        fontSize: '1rem',
                                        fontWeight: 600
                                    }}
                                >
                                    Sign Up
                                </button>

                                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
                                    Already have an account? <span style={{ color: '#34c759', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setMode('signin')}>Sign In</span>
                                </div>
                            </form>
                        )}

                        {role === 'accountant' && <div style={{ textAlign: 'center' }}><p>Registration for {role}s is currently invite-only by the School Admin.</p></div>}
                    </>
                )}

                {/* --- VERIFICATION VIEW --- */}
                {mode === 'verification' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>Verify Your Email</h2>
                        <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
                            We sent a 6-digit code to <span style={{ color: '#fff', fontWeight: 'bold' }}>{email}</span>.
                            <br />Please enter it below to confirm your account.
                        </p>

                        <form onSubmit={handleVerificationSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Verification Code</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    required
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    placeholder="123456"
                                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.btnPrimary}
                                style={{
                                    width: '100%',
                                    marginTop: '1.5rem',
                                    background: '#74c043',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600
                                }}
                            >
                                Verify & Continue
                            </button>
                        </form>

                        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
                            Didn't receive code? <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => alert('Resend logic to be implemented via authService.resendSignUpCode(username)')}>Resend Code</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignUpModal;
