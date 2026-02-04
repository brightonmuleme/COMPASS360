"use client";
import { useSchoolData } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Users, Star, CheckCircle, ShieldCheck } from "lucide-react";

export default function TutorsPage() {
    const { tutors, schoolProfile } = useSchoolData();
    const router = useRouter();
    const appName = schoolProfile?.name || "VINE Institute";

    const handleSubscribe = (tutorName: string) => {
        // Mock logic as requested
        const hasBalance = true; // In production, check student.balance
        if (hasBalance) {
            alert(`✅ Subscription Successful!\n\nYou have successfully subscribed to ${tutorName}. The fee has been deducted from your tuition account.`);
        } else {
            alert(`❌ Insufficient Funds.\n\nPlease top up your tuition account to subscribe to this premium tutor.`);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Users className="text-blue-500" />
                    Find Tutors
                </h1>
                <p className="text-gray-400 max-w-2xl">
                    Subscribe to expert tutors from {appName} for exclusive notes, video lectures, and one-on-one guidance.
                    Subscription validity: <span className="text-blue-400 font-bold">6 months</span>.
                </p>
            </header>

            {tutors.length === 0 ? (
                <div className="p-12 text-center bg-[#181818] border border-gray-800 rounded-2xl">
                    <p className="text-gray-500">No active tutors found for your programme at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tutors.map(tutor => (
                        <div key={tutor.id} className="bg-[#181818] border border-gray-800 rounded-2xl p-6 flex flex-col hover:border-blue-500/50 transition-all shadow-lg shadow-black/20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                                    {tutor.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white leading-tight">{tutor.name}</h3>
                                    <span className="text-sm text-blue-400 font-medium">{tutor.specialization || "General Tutor"}</span>
                                    {tutor.type === 'Full-time' && (
                                        <div className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider mt-1">
                                            <ShieldCheck size={12} /> Verified Staff
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 flex-1">
                                <div className="flex justify-between items-center text-sm text-gray-400 bg-black/20 p-2 rounded-lg">
                                    <span>Subscribers</span>
                                    <span className="font-bold text-white flex items-center gap-1">
                                        <Users size={14} /> {tutor.stats?.subscribers || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm p-2">
                                    <span className="text-gray-400">Subscription Fee</span>
                                    <span className="font-bold text-xl text-green-400">50,000 UGX</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleSubscribe(tutor.name)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                Subscribe Now
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
