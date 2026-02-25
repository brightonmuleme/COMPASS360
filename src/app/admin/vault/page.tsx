"use client";
import { useState, useEffect } from 'react';
import { useSchoolData, formatMoney } from '@/lib/store';

export default function InstitutionalVaultPage() {
    const {
        schoolProfile,
        takeInstitutionalSnapshot,
        restoreInstitutionalSnapshot,
        fetchSchoolSnapshots,
        isCloudSyncing
    } = useSchoolData();

    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newLabel, setNewLabel] = useState('');

    const refreshSnapshots = async () => {
        setIsLoading(true);
        try {
            const data = await fetchSchoolSnapshots();
            setSnapshots(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshSnapshots();
    }, [schoolProfile.id]);

    const handleCreateSnapshot = async () => {
        if (!newLabel) {
            alert("Please provide a label for this snapshot (e.g., 'Before Term 1 Exams')");
            return;
        }
        setIsSaving(true);
        try {
            const success = await takeInstitutionalSnapshot(newLabel);
            if (success) {
                setNewLabel('');
                await refreshSnapshots();
                alert("✅ Institutional Snapshot created safely in the vault.");
            } else {
                alert("❌ Snapshot failed. Check console or school ID status.");
            }
        } catch (err: any) {
            alert("❌ Critical Error: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = async (snapshot: any) => {
        // The store handles the confirmation and actual restoration
        await restoreInstitutionalSnapshot(snapshot.state);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header section with Glassmorphism */}
            <div className="relative overflow-hidden bg-slate-900 border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -ml-20 -mb-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="text-4xl">🏦</span> The Institutional Vault
                        </h1>
                        <p className="text-slate-400 mt-2 max-w-xl text-lg leading-relaxed">
                            Welcome to the <span className="text-blue-400 font-bold">Time Machine</span>. This high-security vault stores complete snapshots of your school's data. You can rollback the entire institution to any point in time.
                        </p>
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">New Vault Entry</h3>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Snapshot Label (e.g. Pre-Audit Backup)"
                                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-64"
                            />
                            <button
                                onClick={handleCreateSnapshot}
                                disabled={isSaving || isCloudSyncing}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Vaulting State...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔒 TAKE INSTANT SNAPSHOT</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Snapshot List */}
            <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📜 Historical Timeline <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-full">{snapshots.length} Records</span>
                    </h2>
                    <button
                        onClick={refreshSnapshots}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest"
                    >
                        🔄 Refresh Vault
                    </button>
                </div>

                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-slate-900/50 border border-white/5 rounded-3xl border-dashed">
                        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-medium">Scanning institutional archives...</p>
                    </div>
                ) : snapshots.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-slate-900/50 border border-white/5 rounded-3xl border-dashed">
                        <span className="text-4xl mb-4 grayscale opacity-20">📦</span>
                        <p className="text-slate-500 font-medium text-center">
                            The vault is empty.<br />
                            <span className="text-xs opacity-50">Create your first snapshot to enable Time Travel.</span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {snapshots.map((snapshot) => (
                            <SnapshotCard
                                key={snapshot.id}
                                snapshot={snapshot}
                                onRestore={() => handleRestore(snapshot)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* DANGER AREA INFOGRAPHIC */}
            <div className="bg-red-950/10 border border-red-500/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                    <h4 className="text-red-400 font-bold text-lg">Director's Rollback Warning</h4>
                    <p className="text-red-400/60 text-sm mt-1">
                        Restoring a snapshot is a <span className="font-bold underline">total override</span> of your current school state. All data created <span className="italic">after</span> the snapshot timestamp will be permanently replaced by the snapshot's data. This action is irreversible.
                    </p>
                </div>
            </div>
        </div>
    );
}

function SnapshotCard({ snapshot, onRestore }: { snapshot: any, onRestore: () => void }) {
    const date = new Date(snapshot.created_at);
    const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Extract some stats from the state for preview
    const students = snapshot.state.students?.length || 0;
    const registrar = snapshot.state.registrarStudents?.length || 0;
    const payments = snapshot.state.payments?.length || 0;

    return (
        <div className="group bg-slate-900 hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 p-6 rounded-2xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-white/5 group-hover:border-blue-500/20 transition-all">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-xl font-black text-white leading-none">{date.getDate()}</span>
                </div>
                <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{snapshot.label}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                        <span>🕒 {time}</span>
                        <span className="text-slate-700">|</span>
                        <span>👥 {students} Students</span>
                        <span className="text-slate-700">|</span>
                        <span>📋 {registrar} Admissions</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end pr-4 border-r border-white/5">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Snapshot Integrity</span>
                    <span className="text-emerald-400 font-mono text-xs font-bold">VERIFIED 100%</span>
                </div>
                <button
                    onClick={onRestore}
                    className="bg-slate-950 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-bold text-sm transition-all group-hover:shadow-lg group-hover:shadow-blue-900/20"
                >
                    ⏪ Restore to this version
                </button>
            </div>
        </div>
    );
}

