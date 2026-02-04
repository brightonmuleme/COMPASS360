"use client";

import { useState, useEffect, useRef } from 'react';
import { useSchoolData, SchoolProfile } from '@/lib/store';
import styles from './page.module.css';

export default function SchoolProfilePage() {
    const { schoolProfile, updateSchoolProfile, activeRole } = useSchoolData();
    const [formData, setFormData] = useState<SchoolProfile>({
        name: '',
        motto: '',
        type: 'Mixed',
        poBox: '',
        city: '',
        phone: '',
        email: '',
        logo: '',
        principal: '',
        administrator: '',
        tin: '',
        website: ''
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        if (schoolProfile) {
            setFormData(schoolProfile);
            setLogoPreview(schoolProfile.logo || null);
        }
    }, [schoolProfile]);

    // Prevention of Silent Data Loss
    useEffect(() => {
        const hasChanges = JSON.stringify(formData) !== JSON.stringify(schoolProfile);
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData, schoolProfile]);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Logo Optimization: Reject files > 500KB
            if (file.size > 500 * 1024) {
                showNotification("error", "Logo size must be less than 500KB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setFormData(prev => ({ ...prev, logo: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        // Validation Engine
        if (!formData.name) {
            showNotification("error", "School Name is required");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            showNotification("error", "Please enter a valid email address");
            return;
        }

        const phoneClean = formData.phone.replace(/[^0-9]/g, '');
        if (formData.phone && phoneClean.length < 10) {
            showNotification("error", "Phone number must be at least 10 digits");
            return;
        }

        updateSchoolProfile(formData);
        showNotification("success", "School Profile updated successfully");
    };

    return (
        <div className={styles.container}>
            {notification && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
                        color: 'white',
                        fontWeight: '500',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 50
                    }}
                >
                    {notification.message}
                </div>
            )}

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>School Profile</h1>
                    <p className={styles.subtitle}>Manage school identity and contact information</p>
                </div>
                <button className={styles.primaryButton} onClick={handleSave}>
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                {/* Left Column: Logo & Branding */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">School Logo</h2>
                        <div className="flex flex-col items-center">
                            <div
                                className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center overflow-hidden bg-gray-50 mb-4 cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="School Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm">Upload Logo</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <button
                                className="text-sm text-blue-600 font-medium hover:text-blue-700"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Change Logo
                            </button>
                            <p className="text-xs text-gray-400 mt-2">Recommended: Square, PNG or JPG</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Form Fields */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="e.g. Vine International School"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motto</label>
                                <input
                                    type="text"
                                    name="motto"
                                    value={formData.motto}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="e.g. Excellence in all things"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className={styles.select}
                                >
                                    <option value="Day">Day</option>
                                    <option value="Boarding">Boarding</option>
                                    <option value="Mixed">Mixed (Day & Boarding)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identification Number (TIN)</label>
                                    <input
                                        type="text"
                                        name="tin"
                                        value={formData.tin || ''}
                                        onChange={handleChange}
                                        className={styles.input}
                                        placeholder="e.g. 1000XXXXXXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website || ''}
                                        onChange={handleChange}
                                        className={styles.input}
                                        placeholder="e.g. https://www.school.ac.ug"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact & Location</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">P.O. Box</label>
                                <input
                                    type="text"
                                    name="poBox"
                                    value={formData.poBox}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="e.g. P.O. Box 12345"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City / District</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="e.g. Kampala"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="e.g. +256 700 000 000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="admin@school.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Administration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Principal / Head Teacher</label>
                                <input
                                    type="text"
                                    name="principal"
                                    value={formData.principal}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="Name of Principal"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Administrator</label>
                                <input
                                    type="text"
                                    name="administrator"
                                    value={formData.administrator}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="Name of Administrator"
                                />
                            </div>
                        </div>

                        {activeRole === 'Director' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="p-1 bg-purple-100 rounded text-purple-600">🔐</span>
                                    Accountant Access
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Accountant Role Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="accountantPassword"
                                                value={formData.accountantPassword || ''}
                                                onChange={handleChange}
                                                className={styles.input}
                                                placeholder="Set secure password"
                                                style={{ paddingRight: '40px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: 0.5,
                                                    fontSize: '1.2rem'
                                                }}
                                                title={showPassword ? "Hide Password" : "Show Password"}
                                            >
                                                {showPassword ? "🙈" : "👁️"}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Used for sensitive financial operations.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
