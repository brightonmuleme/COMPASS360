"use client";
import React from 'react';
import Link from 'next/link';
import { useSchoolData } from '@/lib/store';

export default function RoleSelectionPage() {
    const { landingPageContent } = useSchoolData();
    const roles = landingPageContent || [];

    // Map role IDs to their actual routes
    const getRoute = (roleId: string) => {
        switch (roleId.toLowerCase()) {
            case 'admin': return '/admin';
            case 'bursar': return '/bursar';
            case 'student': return '/student';
            case 'tutor': return '/tutor';
            case 'developer': return '/developer';
            case 'registrar': return '/admin/enrollment'; // Registrar usually shares admin or has specific path
            default: return '/#';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Select Your Portal</h1>
            <p className="text-gray-500 mb-12">Choose a role to sign in or view the dashboard.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
                {roles.map((role) => (
                    <Link
                        key={role.id}
                        href={getRoute(role.id)}
                        className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100 flex flex-col items-center text-center cursor-pointer"
                    >
                        {/* Icon/Image Placeholder */}
                        <div
                            className="w-20 h-20 rounded-full mb-6 flex items-center justify-center text-4xl shadow-inner"
                            style={{ backgroundColor: `${role.theme}20`, color: role.theme }}
                        >
                            {/* Simple Logic to pick an emoji based on role if no image, or just use colored box */}
                            <span className="group-hover:scale-110 transition-transform duration-300">
                                {role.id === 'admin' && '👔'}
                                {role.id === 'bursar' && '💰'}
                                {role.id === 'student' && '🎓'}
                                {role.id === 'tutor' && '👨‍🏫'}
                                {role.id === 'developer' && '🛠️'}
                                {role.id === 'registrar' && '📋'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{role.tagline}</p>

                        <div className="mt-6 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            Enter Portal →
                        </div>

                        {/* Hover Border Effect */}
                        <div
                            className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-current opacity-10 pointer-events-none transition-colors"
                            style={{ color: role.theme }}
                        />
                    </Link>
                ))}
            </div>

            <div className="mt-12 text-center text-xs text-gray-400">
                <Link href="/" className="hover:underline">← Back to Landing Page</Link>
            </div>
        </div>
    );
}
