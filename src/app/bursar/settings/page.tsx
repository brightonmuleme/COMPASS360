"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useSchoolData } from '@/lib/store';

export default function SettingsPage() {
    const { transactionSettings, updateTransactionSettings } = useSchoolData();
    const carryOver = transactionSettings?.carryOver ?? false;

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans text-slate-800">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full">

                {/* SECTION: TRANS */}
                <div className="mb-8">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Trans.</div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {/* Transaction Settings */}
                        <div className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer group relative">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Transaction Settings</div>
                                <div className="text-xs text-slate-400 mt-1">Monthly Start Date, Carry-over Setting, Period...</div>

                                {/* Toggle for Carry Over */}
                                <div className="mt-2 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); if (updateTransactionSettings) updateTransactionSettings({ carryOver: !carryOver }); }}>
                                    <button className={`w-10 h-5 rounded-full relative transition-colors ${carryOver ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${carryOver ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                    <span className="text-xs text-slate-500 font-medium">{carryOver ? 'Carry Over ON' : 'Carry Over OFF'}</span>
                                </div>
                            </div>
                        </div>




                    </div>
                </div>


                {/* SECTION: Categories/Accounts */}
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Category/Accounts</div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">

                        {/* Income Categories */}
                        <Link href="/bursar/settings/categories/income" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="flex-1 font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Income Category Setting</div>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </Link>

                        {/* Expense Categories */}
                        <Link href="/bursar/settings/categories/expense" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <div className="flex-1 font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Expenses Category Setting</div>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </Link>

                        {/* Accounts Setting */}
                        <Link href="/bursar/settings/accounts" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Accounts Setting</div>
                                <div className="text-xs text-slate-400 mt-1">Account Group, Accounts, Include in totals...</div>
                            </div>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </Link>

                        {/* Budget Setting */}
                        <Link href="/bursar/settings/budget" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>
                                <svg className="w-5 h-5 absolute opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1 font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">Budget Setting</div>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
