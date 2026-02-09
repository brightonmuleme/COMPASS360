"use client";

import { useState } from 'react';
import { useSchoolData } from '@/lib/store';
import { Shield, User, Lock, Save, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function MyAccountPage() {
    const { activeAccountId, staffAccounts, updateStaffProfile, activeRole } = useSchoolData();

    const account = staffAccounts.find(a => a.id === activeAccountId);

    const [name, setName] = useState(account?.name || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPasswords, setShowPasswords] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!account) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertCircle className="mx-auto mb-4 opacity-20" size={48} />
                <p>Account not found. Please log in again.</p>
            </div>
        );
    }

    const handleUpdateName = async () => {
        if (!name.trim()) {
            setStatus({ type: 'error', message: 'Name cannot be empty' });
            return;
        }

        setIsSaving(true);
        updateStaffProfile(account.id, { name: name.trim() });

        setTimeout(() => {
            setIsSaving(false);
            setStatus({ type: 'success', message: 'Display name updated successfully! This will appear on the role portal.' });
        }, 800);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setStatus({ type: 'error', message: 'Please fill in all password fields' });
            return;
        }

        if (currentPassword !== account.password) {
            setStatus({ type: 'error', message: 'Current password is incorrect' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 4) {
            setStatus({ type: 'error', message: 'Password must be at least 4 characters' });
            return;
        }

        setIsSaving(true);
        updateStaffProfile(account.id, { password: newPassword });

        setTimeout(() => {
            setIsSaving(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setStatus({ type: 'success', message: 'Password changed successfully!' });
        }, 800);
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Notification */}
            {status && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-10 duration-300 ${status.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{status.message}</span>
                    <button onClick={() => setStatus(null)} className="ml-4 opacity-50 hover:opacity-100">&times;</button>
                </div>
            )}

            <header className="mb-10">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                        <User size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">My Account</h1>
                        <p className="text-slate-400 font-medium">Manage your personal identity and security</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Identity Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Shield size={120} />
                    </div>

                    <div className="relative">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400"><User size={18} /></span>
                            Personal Identity
                        </h2>

                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            This name will be displayed on the Role Selection portal. Setting a clear name helps you identify your account quickly.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">My Display Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="e.g. Muleme Bright"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Role</label>
                                <div className="px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-300 font-medium select-none">
                                    {activeRole}
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateName}
                                disabled={isSaving || name === account.name}
                                className="w-full mt-4 bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
                            >
                                <Save size={18} />
                                {isSaving ? "Saving..." : "Update Identity"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Lock size={120} />
                    </div>

                    <div className="relative">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400"><Lock size={18} /></span>
                            Security & Access
                        </h2>

                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Ensure your password is strong and kept private. Changes here take effect immediately on your next login.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder:text-slate-800"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder:text-slate-800"
                                        placeholder="••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder:text-slate-800"
                                        placeholder="••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {showPasswords ? "Hide Passwords" : "View Passwords"}
                                </button>
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={isSaving || !newPassword}
                                className="w-full mt-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
                            >
                                <Shield size={18} />
                                {isSaving ? "Changing..." : "Update Security"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500">
                <p className="text-xs max-w-md mx-auto leading-relaxed">
                    Identity and security changes are stored securely for your account (ID: {account.id}).
                    If you lose access, please contact the System Developer for a recovery bypass.
                </p>
            </footer>
        </div>
    );
}
