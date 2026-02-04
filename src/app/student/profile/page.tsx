"use client";

import { useSchoolData } from "@/lib/store";
import { useState } from "react";
import { User, Link as LinkIcon, Shield, CreditCard, School, CheckCircle, AlertCircle, Lock, Phone, Save, Eye, EyeOff } from "lucide-react";

export default function StudentProfile() {
    const { studentProfile, students, updateStudentProfile, schoolProfile } = useSchoolData();
    const [selectedSchool, setSelectedSchool] = useState("");
    const [payCodeInput, setPayCodeInput] = useState("");
    const [compassInput, setCompassInput] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

    const availableSchools = [{ id: schoolProfile?.id || 'vine', name: schoolProfile?.name || 'Vine International Institute' }];

    const linkedStudent = studentProfile.linkedStudentCode
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    const schoolName = linkedStudent
        ? (availableSchools.find(s => s.id === studentProfile.schoolId)?.name || 'Vine International Institute')
        : '';

    const handleLink = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!selectedSchool) {
            setError("Please select your school first.");
            return;
        }

        // Find student matching Pay Code and Compass Number (Prefer Registrar Origin)
        const found = students.find(s => {
            const matchesPayCode = s.payCode === payCodeInput.trim();
            const matchesCompass = String(s.compassNumber).trim() === String(compassInput).trim();
            return matchesPayCode && matchesCompass;
        });

        if (found) {
            updateStudentProfile({
                linkedStudentCode: found.payCode,
                schoolId: selectedSchool
            });
            setSuccess(`Successfully linked to ${found.name}!`);
            setPayCodeInput("");
            setCompassInput("");
            setSelectedSchool("");
        } else {
            setError("Authentication failed. No student found with this Pay Code and Compass ID combination.");
        }
    };

    const confirmUnlink = () => {
        updateStudentProfile({ linkedStudentCode: undefined, schoolId: undefined });
        setShowUnlinkConfirm(false);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-white">My Profile</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* PORTAL ACCOUNT & SETTINGS */}
                <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 shadow-sm h-fit text-white">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <User className="text-blue-500" /> Account Settings
                    </h2>

                    {/* Basic Info */}
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-800">
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                            {studentProfile.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">{studentProfile.name}</h3>
                            <p className="text-gray-400 text-sm">{studentProfile.email}</p>
                            <span className="inline-block mt-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {studentProfile.linkedStudentCode ? 'School Member' : 'Independent Learner'}
                            </span>
                        </div>
                    </div>

                    {/* Security & Contact Settings Form */}
                    <ProfileSettingsForm />
                </div>

                {/* LINKED SCHOOL RECORD */}
                <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 shadow-sm h-fit text-white">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <School className="text-purple-500" /> School Record
                    </h2>

                    {linkedStudent ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-purple-900/20 p-6 rounded-xl border border-purple-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <School size={80} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">
                                        <CheckCircle size={14} /> Verified Student Record
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight mb-1 uppercase">
                                        {linkedStudent.name}
                                    </h3>
                                    <p className="text-purple-400 font-bold text-sm mb-4">{schoolName}</p>

                                    <div className="flex flex-wrap gap-2">
                                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
                                            PAY CODE: {linkedStudent.payCode}
                                        </div>
                                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-pink-600 text-white text-xs font-bold">
                                            COMPASS ID: #{linkedStudent.compassNumber || '000'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-gray-400 font-medium">Programme</span>
                                    <span className="font-bold text-right text-white">{linkedStudent.programme}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-gray-400 font-medium">Entry Level</span>
                                    <span className="font-bold text-white">{linkedStudent.level}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-gray-400 font-medium">Account Status</span>
                                    <span className="font-bold capitalize text-green-400">{linkedStudent.status}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowUnlinkConfirm(true)}
                                className="w-full py-3 border-2 border-dashed border-red-500/30 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center gap-2"
                            >
                                <LinkIcon size={16} /> Unlink Current Record
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-6">
                                <p className="text-blue-300 text-sm font-medium leading-relaxed">
                                    <span className="font-bold">Not Linked!</span> Enter your credentials from the Bursar's portal to sync your official school records.
                                </p>
                            </div>

                            <form onSubmit={handleLink} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">1. Select Your School</label>
                                    <div className="relative">
                                        <School className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <select
                                            value={selectedSchool}
                                            onChange={e => setSelectedSchool(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-[#111] text-white font-bold appearance-none transition-all"
                                            required
                                        >
                                            <option value="">-- Choose Your Institution --</option>
                                            {availableSchools.map(school => (
                                                <option key={school.id} value={school.id}>{school.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">2. Pay Code</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                value={payCodeInput}
                                                onChange={e => setPayCodeInput(e.target.value)}
                                                placeholder="e.g. 77777"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-[#111] text-white font-bold placeholder:text-gray-600 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">3. Compass ID</label>
                                        <div className="relative">
                                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                value={compassInput}
                                                onChange={e => setCompassInput(e.target.value)}
                                                placeholder="e.g. 001"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-[#111] text-white font-bold placeholder:text-gray-600 transition-all"
                                                required
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">Found on your admission letter (might be 3 or 4 digits)</p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-500/30 animate-shake">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="bg-green-900/20 text-green-400 p-3 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-500/30">
                                        <CheckCircle size={16} /> {success}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-purple-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-purple-700 shadow-lg shadow-purple-900/50 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
                                >
                                    <LinkIcon size={20} /> Link School Record
                                </button>
                                <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                                    Secure Verification Powered by VINE Institute
                                </p>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {showUnlinkConfirm && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#181818] border border-red-500/30 p-6 rounded-xl max-w-sm w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Unlink School Record?</h3>
                        <p className="text-gray-400 text-sm mb-4">You will lose access to all results and tuition data immediately.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowUnlinkConfirm(false)} className="flex-1 bg-gray-800 text-white py-2 rounded-lg">Cancel</button>
                            <button onClick={confirmUnlink} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold">Unlink</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProfileSettingsForm() {
    const { studentProfile, updateStudentProfile } = useSchoolData();
    const [phone, setPhone] = useState(studentProfile.phoneNumber || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        // Validation
        if (password && password !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords do not match." });
            setIsSaving(false);
            return;
        }

        if (password && password.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters." });
            setIsSaving(false);
            return;
        }

        // Update Profile
        updateStudentProfile({
            password: password || undefined,
            // Phone is locked, so we don't update it from here normally, 
            // but if we did, it would be { phoneNumber: phone }
        });

        setIsSaving(false);
        setMessage({ type: 'success', text: "Password updated successfully." });
        setPassword("");
        setConfirmPassword("");
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* Contact Info */}
            <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Verified Mobile Number</label>
                <div className="relative opacity-60">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="tel"
                        value={phone}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl cursor-not-allowed bg-gray-800 text-gray-400 font-bold focus:outline-none"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-medium">To change your verified number, please contact the School Registrar.</p>
            </div>

            {/* Password Reset */}
            <div className="pt-6 border-t border-gray-800">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Update Portal Password</label>

                <div className="space-y-3">
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-[#111] text-white font-bold placeholder:text-gray-600 transition-all"
                            placeholder="New Secure Password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-[#111] text-white font-bold placeholder:text-gray-600 transition-all"
                            placeholder="Confirm New Password"
                        />
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`text-xs font-bold flex items-center gap-2 p-3 rounded-xl border ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Action Button */}
            <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-lg transition-all ${isSaving ? 'bg-gray-700 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-900/50'
                    }`}
            >
                {isSaving ? (
                    'Syncing Settings...'
                ) : (
                    <>
                        <Save size={18} /> Update Profile
                    </>
                )}
            </button>
        </form>
    );
}
