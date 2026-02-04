"use client";
import React from 'react';
import { useSchoolData } from '@/lib/store';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';

export default function TutorBilling() {
    const { tutorProfile, tutorSubscriptions, generalTransactions, addGeneralTransaction } = useSchoolData();
    const [activeTab, setActiveTab] = React.useState<'income' | 'withdrawals'>('income');

    // Financial Calculations
    const totalRevenue = tutorSubscriptions
        .filter(s => s.tutorId === tutorProfile?.id)
        .reduce((sum, s) => sum + s.amount, 0);

    const withdrawals = generalTransactions
        .filter(t => t.category === 'Tutor Payout' && t.toAccount === tutorProfile?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalWithdrawn = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalRevenue - totalWithdrawn;

    const handleRequestPayout = () => {
        if (balance < 10000) {
            alert("Minimum withdrawal threshold is 10,000 UGX.");
            return;
        }

        const amountStr = prompt(`Enter amount to withdraw (Max: ${balance.toLocaleString()} UGX):`);
        if (!amountStr) return;

        const amount = parseInt(amountStr.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
            alert("Invalid amount.");
            return;
        }

        if (amount > balance) {
            alert("Insufficient funds.");
            return;
        }

        // Create Payout Transaction
        addGeneralTransaction({
            id: `payout_${Date.now()}`,
            date: new Date().toISOString(),
            amount: amount,
            type: 'Expense',
            category: 'Tutor Payout',
            description: `Payout to ${tutorProfile?.name}`,
            mode: 'Mobile Money',
            method: 'Mobile Money',
            recordedBy: 'System',
            toAccount: tutorProfile?.id || '',
            fromAccount: 'School Operations'
        });

        alert("Payout request submitted successfully!");
    };

    const handleExport = () => {
        const data = activeTab === 'income'
            ? tutorSubscriptions.filter(s => s.tutorId === tutorProfile?.id)
            : withdrawals;

        const csvContent = "data:text/csv;charset=utf-8,"
            + data.map(row => JSON.stringify(row)).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${activeTab}_report.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            <header className="mb-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/10 text-blue-500 mb-6 border border-blue-500/20">
                    <CreditCard size={32} />
                </div>
                <h1 className="text-4xl font-bold mb-4">Billing & Earnings</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Track your revenue from student subscriptions and manage your payouts.
                </p>
            </header>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
                    <div className="text-3xl font-bold text-green-400">{totalRevenue.toLocaleString()} UGX</div>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Available Balance</div>
                    <div className="text-3xl font-bold text-white">{balance.toLocaleString()} UGX</div>
                    <div className="text-xs text-gray-500 mt-1">Total Withdrawn: {totalWithdrawn.toLocaleString()} UGX</div>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Next Payout</div>
                    <div className="text-3xl font-bold text-blue-400">
                        {balance >= 10000 ? 'Eligible' : 'Pending'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Minimum threshold: 10k UGX</div>
                </div>
            </div>

            {/* Actions & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
                <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'income' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Incoming
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawals')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'withdrawals' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Withdrawals
                    </button>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition-all font-medium text-sm">
                        Export {activeTab === 'income' ? 'Income' : 'Payouts'}
                    </button>
                    <button onClick={handleRequestPayout} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm">
                        Request Payout
                    </button>
                </div>
            </div>

            {/* Dynamic Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-950 border-b border-gray-800">
                        <tr>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Date</th>
                            {activeTab === 'income' ? (
                                <>
                                    <th className="p-4 font-semibold text-gray-400 text-sm">Student ID</th>
                                    <th className="p-4 font-semibold text-gray-400 text-sm">Plan</th>
                                    <th className="p-4 font-semibold text-gray-400 text-sm text-right">Amount</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-4 font-semibold text-gray-400 text-sm">Reference</th>
                                    <th className="p-4 font-semibold text-gray-400 text-sm">Method</th>
                                    <th className="p-4 font-semibold text-gray-400 text-sm text-right">Withdrawn</th>
                                </>
                            )}
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'income' ? (
                            useSchoolData().tutorSubscriptions
                                .filter(s => s.tutorId === tutorProfile?.id)
                                .slice(0, 10).map(sub => (
                                    <tr key={sub.id} className="border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-gray-400 text-sm font-mono">{new Date(sub.startDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-gray-200 text-sm">{sub.studentId}</td>
                                        <td className="p-4 text-gray-400 text-sm">Standard Access</td>
                                        <td className="p-4 text-green-400 text-sm text-right font-mono font-bold">+{sub.amount.toLocaleString()}</td>
                                        <td className="p-4 text-right"><span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded border border-green-500/20">Completed</span></td>
                                    </tr>
                                ))
                        ) : (
                            withdrawals.length > 0 ? withdrawals.map(tx => (
                                <tr key={tx.id} className="border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-400 text-sm font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-200 text-sm font-mono text-xs">{tx.id}</td>
                                    <td className="p-4 text-gray-400 text-sm">{tx.method}</td>
                                    <td className="p-4 text-red-400 text-sm text-right font-mono font-bold">-{tx.amount.toLocaleString()}</td>
                                    <td className="p-4 text-right"><span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20">Processed</span></td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">No withdrawals yet.</td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            <footer className="mt-16 pt-8 border-t border-zinc-900 text-center text-gray-500 text-sm">
                Need a custom plan for your school department? <button className="text-blue-500 hover:underline font-medium">Contact Sales</button>
            </footer>
        </div>
    );
}
