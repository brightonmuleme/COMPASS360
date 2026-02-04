import React, { useState } from 'react';
import { useSchoolData } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface ChangePasswordModalProps {
    onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const { activeRole, activeAccountId, updateStaffPassword, staffAccounts, logout } = useSchoolData();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const curr = currentPassword.trim();
        const next = newPassword.trim();
        const conf = confirmPassword.trim();

        if (!activeAccountId) {
            setError('No active account found. Please re-login.');
            return;
        }

        // Verify current password
        const account = staffAccounts.find(acc => acc.id === activeAccountId);
        if (account?.password !== curr) {
            setError('Current password is incorrect.');
            return;
        }

        if (next.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
        }

        if (curr === next) {
            setError('Your new password must be different from your current one.');
            return;
        }

        if (next !== conf) {
            setError('Passwords do not match.');
            return;
        }

        updateStaffPassword(activeAccountId, next);
        setSuccess(true);
        setTimeout(() => {
            logout();
            router.push('/');
        }, 2000);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
                    Change Password
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    Updating password for <strong>{activeRole}</strong>
                </p>

                {success ? (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        ✅ Password updated successfully!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: '#fef2f2',
                                color: '#991b1b',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                marginBottom: '1rem',
                                border: '1px solid #fee2e2'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                Current Password
                                <span onClick={() => setShowPasswords(!showPasswords)} style={{ cursor: 'pointer', color: '#2563eb', textTransform: 'none' }}>
                                    {showPasswords ? '🙈 Hide' : '👁️ Show'}
                                </span>
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                required
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                Confirm New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#475569',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Update
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
