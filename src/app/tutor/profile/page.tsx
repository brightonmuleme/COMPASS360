"use client";

import { useSchoolData, Tutor } from "@/lib/store";
import { useState, useEffect } from "react";
import { Info } from "lucide-react";

export default function TutorProfile() {
    const { tutors, updateTutor, tutorProfile } = useSchoolData();

    // Lazy init: Find full Tutor object using the session ID to avoid type mismatches
    const [form, setForm] = useState<Tutor | null>(() => {
        if (!tutorProfile?.id) return null;
        return tutors.find(t => t.id === tutorProfile.id) || null;
    });

    const [saved, setSaved] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    // Sync if profile updates externally
    useEffect(() => {
        if (tutorProfile?.id) {
            const found = tutors.find(t => t.id === tutorProfile.id);
            if (found) setForm(prev => ({ ...prev, ...found }));
        }
    }, [tutorProfile, tutors]);

    const handleSave = () => {
        if (!form) return;

        // 1. Update Profile Details
        updateTutor(form);

        // 2. Handle Password Separately (Mock API)
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            // SECURITY: Do NOT save password to frontend state store.
            // In a real app: await api.changePassword(newPassword);
            console.log("Secure Password Update Triggered (Mock API)");
            setNewPassword("");
            setConfirmPassword("");
        }

        setSaved(true);
        setError("");
        setTimeout(() => setSaved(false), 3000);
    };

    if (!form) return <div className="p-8 text-gray-500 animate-pulse">Loading profile data...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

            <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-sm space-y-6">
                <div className="flex items-center gap-6 mb-8 border-b border-gray-800 pb-8">
                    <div className="w-24 h-24 bg-blue-900/30 text-blue-500 border border-blue-500/20 rounded-full flex items-center justify-center text-3xl font-bold">
                        {form.name[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">{form.name}</h2>
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-1 rounded-full font-medium">
                            {form.type} Tutor
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-200"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Staff ID</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                            value={form.staffId || 'N/A'}
                            disabled
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-200"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            className="w-full p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-200"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-medium text-white mb-4">Security</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                            <input
                                type="password"
                                className="w-full p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-200"
                                value={newPassword}
                                onChange={e => {
                                    setNewPassword(e.target.value);
                                    if (error) setError("");
                                }}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                className="w-full p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-200"
                                value={confirmPassword}
                                onChange={e => {
                                    setConfirmPassword(e.target.value);
                                    if (error) setError("");
                                }}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                <div className="pt-6 border-t border-gray-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                    >
                        {saved ? 'Profile Updated!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
