"use client";
import React, { useState } from 'react';
import { useSchoolData, formatMoney, PayoutRequest } from "@/lib/store";
import {
    Wallet,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    ShieldCheck,
    Loader2
} from "lucide-react";

export default function TutorBillingPage() {
    const { tutors, tutorProfile, claimTutorEarnings } = useSchoolData();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const tutor = tutors.find(t => t.id === tutorProfile?.id);

    if (!tutor) return <div className="p-8 text-gray-400">Loading billing data...</div>;

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!amount || numAmount < 1000) {
            setError('Minimum payout is 1,000 UGX');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await claimTutorEarnings(tutor.id, numAmount);
            setSuccess('Payout request submitted successfully.');
            setAmount('');
        } catch (err: any) {
            setError(err.message || 'Failed to claim earnings');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-black text-white tracking-tight">Billing & Earnings</h1>
                <p className="text-gray-500 font-medium">Track your content revenue and settlement history.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#111] to-black p-8 rounded-[2rem] border border-gray-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={100} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Available for Payout</p>
                    <h2 className="text-4xl font-black text-white mb-6 tracking-tighter">
                        {formatMoney(tutor.walletBalance || 0)}
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 bg-blue-400/5 border border-blue-400/20 px-3 py-1 rounded-full w-fit">
                        <ShieldCheck size={12} /> 80/20 Revenue Split Active
                    </div>
                </div>

                {/* Claim Form */}
                <div className="bg-[#0f0f0f] p-8 rounded-[2rem] border border-gray-800">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ArrowUpRight size={16} className="text-red-500" /> Request Settlement
                    </h3>
                    <form onSubmit={handleClaim} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Payout Amount (UGX)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount..."
                                className="w-full bg-black border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-red-500 transition-all font-bold text-white"
                            />
                        </div>
                        {error && <div className="text-red-500 text-[10px] font-bold flex items-center gap-1"><AlertCircle size={12} /> {error}</div>}
                        {success && <div className="text-green-500 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> {success}</div>}
                        <button
                            disabled={isSubmitting || (tutor.walletBalance || 0) < 1000}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Request Payout'}
                        </button>
                    </form>
                </div>
            </div>

            {/* History */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">Settlement History</h3>
                <div className="bg-[#0f0f0f] rounded-[2rem] border border-gray-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="p-6 text-[10px] font-black uppercase text-gray-500">Date</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-500">Amount</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-500">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-500">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900">
                            {(!tutor.payoutRequests || tutor.payoutRequests.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-gray-600 italic text-sm">No payout requests found.</td>
                                </tr>
                            ) : (
                                tutor.payoutRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm font-medium text-gray-300">
                                            {new Date(req.requestedAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-6 text-sm font-bold text-white">
                                            {formatMoney(req.amount)}
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${req.status === 'Paid' ? 'bg-green-500/10 text-green-500' : req.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-xs text-gray-500 font-mono">
                                            {req.paymentReference || '---'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
