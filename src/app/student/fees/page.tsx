"use client";
import React, { useState } from 'react';
import { useSchoolData, formatMoney } from "@/lib/store";
import {
    Wallet,
    Smartphone,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Zap,
    ShieldCheck,
    Copy,
    ChevronRight,
    Loader2
} from "lucide-react";

export default function FeesPage() {
    const {
        studentProfile,
        students,
        submitSubscriptionRequest,
        purchasePlatformPass
    } = useSchoolData();

    const [transactionId, setTransactionId] = useState('');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const hasActivePass = studentProfile.subscriptionStatus === 'active';

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId || !reference) {
            setError('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Updated to be profile-first
            await submitSubscriptionRequest({
                transactionId,
                reference,
                phoneNumber: studentProfile.phoneNumber || 'N/A'
            } as any);
            setSuccess('Payment request submitted! Awaiting manual verification.');
            setTransactionId('');
            setReference('');
        } catch (err: any) {
            setError(err.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyPass = async (type: '6 Months' | '1 Year') => {
        if (isPurchasing) return;
        setIsPurchasing(true);
        try {
            await purchasePlatformPass(type);
            setSuccess(`Successfully purchased ${type} Platform Pass!`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="p-4 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-600 rounded-lg">
                            <Wallet size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase">Wallet & Plans</h1>
                    </div>
                    <p className="text-gray-500 font-medium">Manage your COMPASS 360 balance and learning subscriptions.</p>
                </header>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-shake">
                        <AlertCircle size={20} />
                        <p className="text-sm font-bold uppercase tracking-wider">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 animate-slide-up">
                        <CheckCircle2 size={20} />
                        <p className="text-sm font-bold uppercase tracking-wider">{success}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Wallet Status */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Wallet Card */}
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-8 rounded-[2.5rem] border border-[#222] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Zap size={100} />
                            </div>

                            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Available Balance</h3>
                            <div className="text-5xl font-black mb-8 tracking-tighter">
                                {formatMoney(studentProfile.walletBalance || 0)}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${hasActivePass ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5'}`}>
                                    {hasActivePass ? 'Platform Access Active' : 'Access Expired'}
                                </div>
                            </div>

                            {studentProfile.subscriptionEndDate && (
                                <p className="text-gray-500 text-[10px] mt-4 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} /> Expires: {new Date(studentProfile.subscriptionEndDate).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        {/* Top-up Instructions */}
                        <div className="bg-[#111] p-6 rounded-[2rem] border border-[#222]">
                            <h4 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Smartphone size={16} className="text-red-500" /> Method: Airtel Money
                            </h4>

                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-[10px] text-gray-500 uppercase font-black mb-1">USSD Code</div>
                                    <div className="flex items-center justify-between">
                                        <code className="text-xl font-bold text-red-500">*185*9#</code>
                                        <button onClick={() => navigator.clipboard.writeText("*185*9#")} className="text-gray-600 hover:text-white transition-colors">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Merchant Code</div>
                                    <div className="flex items-center justify-between">
                                        <code className="text-xl font-bold text-red-500">7002180</code>
                                        <button onClick={() => navigator.clipboard.writeText("7002180")} className="text-gray-600 hover:text-white transition-colors">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-[11px] text-gray-500 leading-relaxed px-2">
                                    1. Dial USSD and enter Merchant Code.<br />
                                    2. Enter Amount.<br />
                                    3. <strong>Note down</strong> the Transaction ID.<br />
                                    4. Submit the ID below for verification.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: Plans & Top up */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Plans */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: '6 Months Pass', cost: 5000, duration: '6 Months', best: false },
                                { title: '1 Year Pass', cost: 9000, duration: '1 Year', best: true },
                            ].map((plan) => (
                                <div key={plan.title} className={`p-8 rounded-[2.5rem] border ${plan.best ? 'border-red-600/50 bg-red-600/5' : 'border-[#222] bg-[#111]'} relative overflow-hidden flex flex-col`}>
                                    {plan.best && <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1.5 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest">Best Value</div>}
                                    <h4 className="text-lg font-black mb-1">{plan.title}</h4>
                                    <div className="text-3xl font-black mb-6">
                                        {formatMoney(plan.cost)}
                                    </div>
                                    <ul className="space-y-3 mb-8 flex-1">
                                        <li className="flex items-center gap-2 text-xs text-gray-400">
                                            <CheckCircle2 size={14} className="text-red-500" /> Full Resource Access
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-gray-400">
                                            <CheckCircle2 size={14} className="text-red-500" /> Unlock Tutor Pulse
                                        </li>
                                    </ul>
                                    <button
                                        onClick={() => handleBuyPass(plan.duration as any)}
                                        disabled={isPurchasing}
                                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${plan.best ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2`}
                                    >
                                        {isPurchasing ? <Loader2 className="animate-spin" size={16} /> : 'Purchase Pass'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Top-up Form */}
                        <div className="bg-[#111] p-8 rounded-[2.5rem] border border-[#222]">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <ArrowUpRight size={20} className="text-red-500" /> Verify Deposit
                            </h3>

                            <form onSubmit={handleSubmitPayment} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Transaction ID</label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            placeholder="e.g. 7695028421"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-red-500 outline-none transition-all font-bold placeholder:text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Reference (Name/Phone)</label>
                                        <input
                                            type="text"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="e.g. JOHN DOE / 0700..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-red-500 outline-none transition-all font-bold placeholder:text-gray-700"
                                        />
                                    </div>
                                </div>

                                {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
                                {success && <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-xl flex items-center gap-2"><CheckCircle2 size={14} /> {success}</div>}

                                <button
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto bg-white text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit for Verification'}
                                </button>
                            </form>
                        </div>

                        {/* Recent Requests */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 px-2">Verification History</h3>
                            <div className="space-y-3">
                                {(!studentProfile.paymentRequests || studentProfile.paymentRequests.length === 0) ? (
                                    <div className="bg-[#111] p-10 rounded-[2rem] border border-[#222] text-center text-gray-600 italic text-sm">
                                        No recent payment submissions.
                                    </div>
                                ) : (
                                    studentProfile.paymentRequests.map((req) => (
                                        <div key={req.id} className="bg-[#111] p-5 rounded-2xl border border-[#222] flex items-center justify-between group hover:border-[#333] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${req.status === 'Approved' ? 'bg-green-500/10 text-green-500' : req.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {req.status === 'Approved' ? <CheckCircle2 size={18} /> : req.status === 'Rejected' ? <X size={18} /> : <Clock size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">TXN: {req.transactionId}</span>
                                                        <span className="text-[10px] text-gray-600 uppercase font-black">{new Date(req.submittedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500">{req.reference}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-[10px] font-black uppercase tracking-widest ${req.status === 'Approved' ? 'text-green-500' : req.status === 'Rejected' ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {req.status}
                                                </div>
                                                {req.amount && <div className="text-xs font-bold text-gray-400">+{formatMoney(req.amount)}</div>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function X({ size }: { size: number }) {
    return <AlertCircle size={size} />;
}
