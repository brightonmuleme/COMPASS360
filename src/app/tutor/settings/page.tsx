"use client";

import { useSchoolData, TutorSettings } from "@/lib/store";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function SubscriptionSettings() {
    const { tutorSettings, updateTutorSettings, tutorProfile, courseUnits } = useSchoolData();
    const currentTutorId = tutorProfile?.id;

    const [form, setForm] = useState<TutorSettings>({
        tutorId: currentTutorId || '',
        subscriptionPrice: 50000,
        durationMonths: 1,
        isEnabled: false,
        taughtCourseUnitIds: []
    });

    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (currentTutorId) {
            const existing = tutorSettings.find(s => s.tutorId === currentTutorId);
            if (existing) setForm(existing);
            else setForm(prev => ({ ...prev, tutorId: currentTutorId }));
        }
    }, [tutorSettings, currentTutorId]);

    const handleSave = () => {
        if (!currentTutorId) return;

        // Validation Logic
        if (form.subscriptionPrice < 10000 || form.subscriptionPrice > 500000) {
            setError("Price must be between 10k and 500k UGX");
            setTimeout(() => setError(""), 3000);
            return;
        }

        updateTutorSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (!currentTutorId) return <div className="p-8 text-gray-500">Loading profile...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Subscription Settings</h1>
                <p className="text-gray-400">Configure how students access your premium content.</p>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-sm space-y-8">
                <div>
                    <label className="flex items-center gap-4 cursor-pointer group">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.isEnabled}
                            onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
                            className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.isEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300 ${form.isEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className="font-bold text-gray-200 group-hover:text-white transition-colors">Enable Subscriptions</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-3 pl-18 leading-relaxed">
                        When enabled, students must subscribe to access your content.
                        Your mock earnings will increase as students subscribe.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Price (UGX)</label>
                        <input
                            type="number"
                            className={`w-full p-3 bg-gray-950 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white font-mono placeholder-gray-700 transition-all ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'}`}
                            value={form.subscriptionPrice}
                            onChange={e => setForm({ ...form, subscriptionPrice: Number(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${error ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                            {error ? <span className="text-red-400 font-bold">{error}</span> : 'Platform Range: 10k - 500k UGX'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Duration (Months)</label>
                        <div className="relative">
                            <select
                                className="w-full p-3 bg-gray-950 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none cursor-pointer transition-all focus:border-blue-500"
                                value={form.durationMonths}
                                onChange={e => setForm({ ...form, durationMonths: Number(e.target.value) })}
                            >
                                <option value={1}>1 Month</option>
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months (Semester)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                ▼
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-800">
                    <label className="block text-sm font-medium text-gray-400 mb-4">Included Course Units</label>
                    <p className="text-xs text-gray-500 mb-4">Select the subjects student will get access to when they subscribe.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {courseUnits.map(cu => {
                            const isSelected = (form.taughtCourseUnitIds || []).includes(cu.id);
                            return (
                                <div
                                    key={cu.id}
                                    onClick={() => {
                                        const current = form.taughtCourseUnitIds || [];
                                        const newSelection = isSelected
                                            ? current.filter(id => id !== cu.id)
                                            : [...current, cu.id];
                                        setForm({ ...form, taughtCourseUnitIds: newSelection });
                                    }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-medium flex items-center gap-2 ${isSelected
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                        {isSelected && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <span className="truncate">{cu.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Custom Subject Input */}
                    <div className="mt-4 flex gap-2">
                        <input
                            type="text"
                            placeholder="Type custom subject name..."
                            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                        const newId = `cu_${Date.now()}`;
                                        // @ts-ignore
                                        setCourseUnits(prev => [...prev, { id: newId, name: val, code: val.substring(0, 3).toUpperCase(), type: 'Custom', duration: 'N/A' }]);
                                        setForm(prev => ({ ...prev, taughtCourseUnitIds: [...(prev.taughtCourseUnitIds || []), newId] }));
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                            onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const val = input.value.trim();
                                if (val) {
                                    const newId = `cu_${Date.now()}`;
                                    // @ts-ignore
                                    setCourseUnits(prev => [...prev, { id: newId, name: val, code: val.substring(0, 3).toUpperCase(), type: 'Custom', duration: 'N/A' }]);
                                    setForm(prev => ({ ...prev, taughtCourseUnitIds: [...(prev.taughtCourseUnitIds || []), newId] }));
                                    input.value = '';
                                }
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Preview Card */}
                <div className="pt-6 border-t border-gray-800">
                    <label className="block text-sm font-medium text-gray-400 mb-4">Student View Preview</label>
                    <div className="bg-black/40 p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-64 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">
                                {form.durationMonths} Month{form.durationMonths > 1 ? 's' : ''} Pay
                            </div>
                            <div className="mb-4">
                                <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Access Pass</div>
                                <div className="text-2xl font-bold text-white">{form.subscriptionPrice.toLocaleString()} UGX</div>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-500" />
                                    <div className="flex flex-wrap gap-1">
                                        {(form.taughtCourseUnitIds && form.taughtCourseUnitIds.length > 0) ? (
                                            courseUnits
                                                .filter(cu => form.taughtCourseUnitIds?.includes(cu.id))
                                                .slice(0, 3)
                                                .map(cu => (
                                                    <span key={cu.id} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{cu.name}</span>
                                                ))
                                        ) : (
                                            <span className="text-gray-600 text-[10px]">No subjects selected</span>
                                        )}
                                        {(form.taughtCourseUnitIds?.length || 0) > 3 && (
                                            <span className="text-[10px] text-gray-400 self-center">+{(form.taughtCourseUnitIds?.length || 0) - 3} more</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-500" />
                                    <span>Unlimited Content Access</span>
                                </div>
                            </div>
                            <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg opacity-50 cursor-not-allowed">
                                Subscribe Now
                            </button>
                        </div>
                        <div className="flex-1 text-sm text-gray-500 italic">
                            "This is how your subscription card will appear to students on their dashboard."
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!currentTutorId}
                    >
                        {saved && <CheckCircle size={18} />}
                        {saved ? 'Saved Successfully!' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
