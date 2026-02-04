"use client";
import React from 'react';
import { useSchoolData } from "@/lib/store";
import { StudentFinancialRecord } from "@/components/student/StudentFinancialRecord";
import Link from "next/link";
import { Shield, Wallet } from "lucide-react";

export default function FeesPage() {
    const { studentProfile, students } = useSchoolData();

    // Find the linked student object from the main students array based on the Pay Code stored in the profile
    const linkedStudent = studentProfile.linkedStudentCode
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    if (!linkedStudent) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in text-gray-100">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <Wallet size={48} className="text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Financial Records Locked</h1>
                <p className="text-gray-400 mb-8 max-w-md text-lg">
                    Fee structures and financial statements are private to school students. Please link your official school record in your profile to access your financial data.
                </p>
                <Link
                    href="/student/profile"
                    className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-700 transition flex items-center gap-2"
                >
                    <Wallet size={18} /> Link School Record
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Fees & Requirements</h1>
                <p className="text-gray-400 mt-2">Real-time financial status for <span className="text-white font-bold">{linkedStudent.name}</span></p>
            </header>

            {/* Render the Read-Only Financial Record */}
            <StudentFinancialRecord studentId={linkedStudent.id} />
        </div>
    );
}
