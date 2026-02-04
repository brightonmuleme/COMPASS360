"use client";
import React, { useState } from 'react';
import BillingsView from '@/components/bursar/transactions/BillingsView';
import PaymentsView from '@/components/bursar/transactions/PaymentsView';

type Tab = 'billings' | 'payments';

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('billings');

    return (
        <div className="h-full w-full bg-slate-950 flex flex-col font-sans text-slate-100 min-h-screen">
            {/* Header Content */}
            <div className="bg-slate-900/50 backdrop-blur-md px-4 md:px-8 py-6 border-b border-slate-800 flex flex-col gap-6 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white uppercase">Ledger <span className="text-blue-500">Explorer</span></h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Audit and manage all financial transactions.</p>
                    </div>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('billings')}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all tracking-widest ${activeTab === 'billings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        BILLINGS
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all tracking-widest ${activeTab === 'payments' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        PAYMENTS
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                {activeTab === 'billings' ? <BillingsView /> : <PaymentsView />}
            </div>
        </div>
    );
}
