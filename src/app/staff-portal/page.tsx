"use client";
import React from 'react';
import Link from 'next/link';

export default function StaffPortalSelection() {
    const STAFF_ROLES = [
        {
            id: 'director',
            title: 'School Director',
            description: 'Overview of school performance, finances, and administration.',
            icon: '👔',
            color: '#1e3a8a', // Dark Blue
            href: '/admin'
        },
        {
            id: 'bursar',
            title: 'Bursar',
            description: 'Manage school fees, payments, and financial records.',
            icon: '💰',
            color: '#059669', // Emerald
            href: '/bursar'
        },
        {
            id: 'registrar',
            title: 'Registrar',
            description: 'Handle student admissions, enrollments, and academic records.',
            icon: '📋',
            color: '#d97706', // Amber
            href: '/admin/enrollment'
        },
        {
            id: 'expense_manager',
            title: 'Expense Manager',
            description: 'Track school expenditures, requisitions, and budget usage.',
            icon: '📉',
            color: '#dc2626', // Red
            href: '/bursar/expenses'
        },
        {
            id: 'estate_manager',
            title: 'Estate Manager',
            description: 'Manage school inventory, assets, and estate settings.',
            icon: '🏗️',
            color: '#7c3aed', // Violet
            href: '/bursar/estate-settings'
        },
        {
            id: 'news_coordinator',
            title: 'News Coordinator',
            description: 'Publish school updates, newsletters, and announcements.',
            icon: '📰',
            color: '#db2777', // Pink
            href: '/admin/news'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 font-sans">
            <div className="w-full max-w-5xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Staff Portal Access</h1>
                    <p className="text-slate-500 text-lg">Select your operational role to access your dashboard.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {STAFF_ROLES.map((role) => (
                        <Link
                            key={role.id}
                            href={role.href}
                            className="group relative bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] transition-all duration-300 border border-slate-100 hover:border-slate-200 flex flex-col items-start hover:-translate-y-1"
                        >
                            <div
                                className="w-14 h-14 rounded-xl mb-6 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform duration-300"
                                style={{ backgroundColor: `${role.color}15`, color: role.color }}
                            >
                                {role.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                                {role.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-8">
                                {role.description}
                            </p>

                            <div className="mt-auto flex items-center text-sm font-semibold transition-colors" style={{ color: role.color }}>
                                Access Dashboard
                                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-xs text-slate-400">© 2026 Vine School Platform. Authorized Personnel Only.</p>
                </div>
            </div>
        </div>
    );
}
