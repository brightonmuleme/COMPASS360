"use strict";
"use client";

import React, { useState } from 'react';
import { useSchoolData, EnrolledStudent } from '@/lib/store';
import { Save, AlertTriangle, Check, FileText } from 'lucide-react';

export default function RecoveryPage() {
    const {
        filteredStudents: enrolledStudents,
        setStudents,
        payments
    } = useSchoolData();

    const [csvInput, setCsvInput] = useState('');
    const [previewStudents, setPreviewStudents] = useState<EnrolledStudent[]>([]);
    const [recoveryLog, setRecoveryLog] = useState<string[]>([]);

    // 1. Identify "Ghost" Pay Codes (Payments without a Student)
    const ghostPayCodes = React.useMemo(() => {
        const studentPayCodes = new Set(enrolledStudents.map(s => s.payCode));
        // Find payments whose payCode is NOT in the enrolled students list
        const ghosts = new Set<string>();
        payments.forEach(p => {
            if (p.metadata?.payCode && !studentPayCodes.has(p.metadata.payCode)) {
                ghosts.add(p.metadata.payCode);
            }
        });
        return ghosts;
    }, [enrolledStudents, payments]);

    const handleParse = () => {
        if (!csvInput.trim()) return;

        const lines = csvInput.split('\n');
        const headers = lines[0].split('\t'); // Assuming Excel copy-paste (Tab items)

        // Map Column Indexes (Dynamic for safety)
        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => {
            const header = h.trim().toLowerCase();
            if (header.includes('first name')) colMap['firstName'] = i;
            if (header.includes('last name')) colMap['lastName'] = i;
            if (header.includes('payment c')) colMap['payCode'] = i; // "Payment Code"
            if (header.includes('course')) colMap['course'] = i;
            if (header.includes('year 1')) colMap['level'] = i; // "Year 1 Sem..." -> Level/Sem
            if (header.includes('gender')) colMap['gender'] = i;
        });

        const recovered: EnrolledStudent[] = [];
        const logs: string[] = [];

        // CALCULATE COMPASS NUMBER START
        const existingCompassNumbers = enrolledStudents
            .map(s => parseInt(s.compassNumber || '0', 10))
            .filter(n => !isNaN(n));
        let nextCompass = (existingCompassNumbers.length > 0 ? Math.max(...existingCompassNumbers) : 0) + 1;

        // PARSE ROWS
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split('\t');
            if (row.length < 2) continue;

            // Extract Pay Code (Handle Excel Scientific Notation if needed, though copy-paste often fixes it)
            // If strictly scientific: 1.01E+09 -> we might need to be careful. 
            // Usually copying from Excel to Textarea preserves text interaction.
            let payCode = row[colMap['payCode']]?.trim();

            // CLEAN PAY CODE: Remove spaces, potential quotes
            payCode = payCode?.replace(/['"]/g, '');

            // CHECK IF GHOST
            if (payCode && ghostPayCodes.has(payCode)) {
                const firstName = row[colMap['firstName']]?.trim() || '';
                const lastName = row[colMap['lastName']]?.trim() || '';
                const fullName = `${firstName} ${lastName}`.toUpperCase();
                const course = row[colMap['course']]?.trim() || 'Certificate in Nursing'; // Fallback
                const rawLevel = row[colMap['level']]?.trim() || 'Year 1';

                // Normalize Level/Semester
                let level = 'Year 1';
                let semester = 'Semester 1';
                if (rawLevel.includes('Year 2')) level = 'Year 2';

                // Construct Student
                const newStudent: EnrolledStudent = {
                    id: Date.now() + i, // Unique ID per row
                    name: fullName,
                    payCode: payCode,
                    programme: course,
                    level: level,
                    semester: semester,
                    gender: row[colMap['gender']]?.trim() as any,
                    compassNumber: String(nextCompass++).padStart(3, '0'),

                    // DEFAULTS
                    balance: 0,
                    totalFees: 0,
                    services: [], // Will need to re-add manually or auto-assign defaults
                    bursary: 'none',
                    previousBalance: 0,
                    status: 'active',
                    origin: 'bursar',
                    walletBalance: 0,
                    paymentRequests: [],
                    tutorSubscriptions: []
                };

                recovered.push(newStudent);
                logs.push(`✅ Found Match: ${fullName} (${payCode})`);
            }
        }

        setPreviewStudents(recovered);
        setRecoveryLog(logs);
    };

    const handleResurrect = () => {
        if (confirm(`Are you sure you want to resurrect ${previewStudents.length} students? This will add them to the live database.`)) {
            setStudents(prev => [...prev, ...previewStudents]);
            alert("Resurrection Complete! Students have been restored.");
            setPreviewStudents([]);
            setCsvInput('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Save /> Lazarus Pit (Data Recovery)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* INPUT SECTION */}
                <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h2 className="font-bold mb-2 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={20} />
                            Step 1: Paste Excel Data
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Copy columns A to E (First Name, Last Name, PayCode, Course, Level) from your Excel sheet and paste them here.
                            Ensure specific headers exist: <strong>First Name, Last Name, Payment C, Course, Year 1</strong>
                        </p>
                        <textarea
                            className="w-full h-96 bg-black font-mono text-xs p-4 border border-gray-700 rounded-lg focus:border-emerald-500 outline-none"
                            placeholder="Paste Excel data here..."
                            value={csvInput}
                            onChange={(e) => setCsvInput(e.target.value)}
                        />
                        <button
                            onClick={handleParse}
                            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Analyze & Find Ghosts
                        </button>
                    </div>

                    {/* STATUS */}
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-gray-400 mb-2">System Status</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-black p-3 rounded-lg">
                                <div className="text-2xl font-bold text-white">{enrolledStudents.length}</div>
                                <div className="text-xs text-gray-500">Active Students</div>
                            </div>
                            <div className="bg-black p-3 rounded-lg">
                                <div className="text-2xl font-bold text-amber-500">{ghostPayCodes.size}</div>
                                <div className="text-xs text-gray-500">Ghosts (Unlinked Payments)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIEW SECTION */}
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col h-[80vh]">
                    <h2 className="font-bold mb-4 flex items-center gap-2">
                        <FileText className="text-blue-400" size={20} />
                        Step 2: Preview Resurrection ({previewStudents.length})
                    </h2>

                    <div className="flex-1 overflow-y-auto bg-black rounded-lg border border-gray-700 p-2 space-y-2">
                        {previewStudents.length === 0 ? (
                            <div className="text-center text-gray-500 py-20">
                                No matching ghosts found yet. Paste data to begin.
                            </div>
                        ) : (
                            previewStudents.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-900 border border-gray-800 rounded hover:border-emerald-500/50 transition-colors">
                                    <div>
                                        <div className="font-bold text-white">{s.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{s.payCode} • {s.programme}</div>
                                    </div>
                                    <div className="text-emerald-500 font-bold text-xs uppercase tracking-wider border border-emerald-900 bg-emerald-900/20 px-2 py-1 rounded">
                                        Ready to Restore
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {previewStudents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={handleResurrect}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-lg animate-pulse"
                            >
                                <Check size={24} /> Resurrect {previewStudents.length} Students
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
