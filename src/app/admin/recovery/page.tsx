"use client";
import { useState, useEffect } from 'react';
import { useSchoolData } from '@/lib/store';

export default function DisasterRecoveryPage() {
    const {
        schoolProfile,
        students,
        registrarStudents,
        payments,
        billings,
        setStudents,
        setRegistrarStudents,
        setPayments,
        setBillings,
        pullFromCloud,
        downloadBackup
    } = useSchoolData();
    const [scanResults, setScanResults] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState<string>('');

    const runRecoveryScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch(`/api/cloud/recovery?schoolId=${schoolProfile.id}`);
            const data = await res.json();
            setScanResults(data);
        } catch (e) {
            console.error(e);
            alert("Scan failed");
        } finally {
            setIsScanning(false);
        }
    };

    const reconstructData = async () => {
        if (!scanResults) return;
        setIsRestoring(true);
        setRestoreStatus('Starting deep reconstruction...');

        try {
            const { data } = scanResults;

            // 1. RECONSTRUCT ENROLLED STUDENTS (With Balances/Bursaries)
            const directStudents = data.directStudents || [];
            const missingStudents = directStudents.filter((ds: any) =>
                !students.some((cs: any) => cs.id === ds.id || cs.payCode === ds.id)
            );

            if (missingStudents.length > 0) {
                const restoredStudents = missingStudents.map((s: any) => ({
                    ...s,
                    name: s.name || s.full_name || 'Restored Student',
                    programme: s.programme || 'Unknown',
                    level: s.level || 'Year 1',
                    balance: s.balance || s.balance_ugx || 0,
                    totalFees: s.totalFees || 0,
                    origin: s.origin || 'bursar'
                }));
                setStudents((prev: any[]) => [...prev, ...restoredStudents]);
            }

            // 2. RECONSTRUCT ADMISSIONS (Registrar)
            const directAdmissions = data.admissions || [];
            const missingAdmissions = directAdmissions.filter((da: any) =>
                !registrarStudents.some((ca: any) => ca.id === da.id)
            );

            if (missingAdmissions.length > 0) {
                const restoredAdms = missingAdmissions.map((s: any) => ({
                    ...s,
                    name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Restored Admission',
                    origin: s.origin || 'registrar'
                }));
                setRegistrarStudents((prev: any[]) => [...prev, ...restoredAdms]);
            }

            // 3. RECONSTRUCT BILLINGS
            const directBillings = data.directBillings || [];
            const missingBillings = directBillings.filter((db: any) =>
                !billings.some((cb: any) => cb.id === db.id)
            );
            if (missingBillings.length > 0) {
                setBillings((prev: any[]) => [...prev, ...missingBillings]);
            }

            // 4. RECONSTRUCT PAYMENTS
            const directPayments = data.directPayments || [];
            const missingPayments = directPayments.filter((dp: any) =>
                !payments.some((cp: any) => cp.id === dp.id)
            );
            if (missingPayments.length > 0) {
                setPayments((prev: any[]) => [...prev, ...missingPayments]);
            }

            // 5. RECONSTRUCT FROM TRANSACTIONS (Fallback for mixed data)
            // If the standard tables missed something, we might find them in general transactions
            // Logic omitted for brevity but can be expanded if tables are empty.

            setRestoreStatus(`Success! Restored: ${missingStudents.length} Students, ${missingAdmissions.length} Admissions, ${missingBillings.length} Billings, ${missingPayments.length} Payments.`);
            alert("RECOVERY COMPLETE!\n\nAll financial records, student balances, and admissions found in the database have been merged back into your system.\n\nPlease WAIT on this page for 10 seconds to allow the Cloud Sync to save this state.");

        } catch (e: any) {
            setRestoreStatus(`Error: ${e.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-red-950/20 border border-red-500/50 p-6 rounded-2xl">
                <h1 className="text-2xl font-bold text-red-400 flex items-center gap-2">
                    <span className="text-3xl">☣️</span> Disaster Recovery Hub
                </h1>
                <p className="text-slate-400 mt-1">
                    Emergency tools for reconstructing your financial registry from low-level Supabase tables.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold">Current Cloud Pulse (Truncated)</h2>
                        <button
                            onClick={downloadBackup}
                            className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full font-bold transition-all"
                        >
                            📥 DOWNLOAD LOCAL BACKUP
                        </button>
                    </div>
                    <div className="space-y-3">
                        <StatRow label="Students" count={students.length} />
                        <StatRow label="Admissions" count={registrarStudents.length} />
                        <StatRow label="Payments" count={payments.length} />
                        <StatRow label="Billings" count={billings.length} />

                        <button
                            onClick={runRecoveryScan}
                            disabled={isScanning}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {isScanning ? '🔍 Scanning Tables...' : '🔍 Scan Database For Lost Data'}
                        </button>
                    </div>
                </div>

                {scanResults && (
                    <div className="bg-slate-900 border border-blue-500/30 p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-lg font-bold mb-4 text-blue-400">Database Discovery (Available for Restore)</h2>
                        <div className="space-y-3">
                            <StatRow label="Total Students in DB" count={scanResults.summary.individualTables.students} highlight />
                            <StatRow label="Total Admissions in DB" count={scanResults.summary.individualTables.admissions} highlight />
                            <StatRow label="Total Billings in DB" count={scanResults.summary.individualTables.billings} highlight />
                            <StatRow label="Total Payments in DB" count={scanResults.summary.individualTables.payments} highlight />

                            <div className="pt-4 space-y-3">
                                {scanResults.summary.individualTables.students > students.length ? (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                                        ✨ Found <b>{scanResults.summary.individualTables.students - students.length}</b> missing student records!
                                    </div>
                                ) : (
                                    <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400">
                                        No new students found compared to current view.
                                    </div>
                                )}

                                <button
                                    onClick={reconstructData}
                                    disabled={isRestoring}
                                    className="w-full bg-green-600 hover:bg-green-500 h-14 rounded-xl font-black text-lg shadow-lg shadow-green-900/20 transition-all border-b-4 border-green-800 active:border-b-0"
                                >
                                    {isRestoring ? 'RESTORING RECORDS...' : '🚀 DEEP RECONSTRUCT & MERGE'}
                                </button>
                                {restoreStatus && (
                                    <p className="text-center text-sm font-mono text-green-400 animate-pulse">
                                        {restoreStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 border border-white/5 p-8 rounded-2xl text-center">
                <h3 className="text-slate-400 text-sm mb-2 uppercase tracking-widest font-bold">Safe Recovery Policy</h3>
                <p className="text-slate-500 text-xs mb-6 max-w-lg mx-auto leading-relaxed">
                    This tool performs a <b>Merge Operation</b>. It only adds missing records and does not delete your current data. Student balances, bursaries, and transaction histories are linked by ID to ensure total continuity.
                </p>
                <button
                    onClick={() => pullFromCloud(true)}
                    className="text-slate-400 hover:text-white underline text-sm underline-offset-4"
                >
                    Cancel & Force Cloud Pull (Reset Local)
                </button>
            </div>
        </div>
    );
}

function StatRow({ label, count, highlight = false }: { label: string, count: number, highlight?: boolean }) {
    return (
        <div className={`flex justify-between p-3 rounded-lg ${highlight ? 'bg-blue-950/20 border border-blue-500/20' : 'bg-slate-950'}`}>
            <span className="text-slate-400">{label}</span>
            <span className={`font-mono font-bold ${highlight ? 'text-blue-400' : ''}`}>{count}</span>
        </div>
    );
}
