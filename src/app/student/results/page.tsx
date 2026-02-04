"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
    useSchoolData,
    EnrolledStudent,
    ResultPageConfig,
    DocumentRecord
} from "@/lib/store";
import { Shield, GraduationCap } from "lucide-react";
import Link from "next/link";
import { ResultCard } from "@/components/admin/ResultCard";
import { EditResultsModal } from "@/components/admin/EditResultsModal";
import { StatusRing } from "@/components/StatusRing";

// Logic for finding required docs (Matches Admin Logic)
const getLevelRequirements = (programmeObj: any, targetLevel: string) => {
    if (!programmeObj || !programmeObj.feeStructure) return [];

    const config = programmeObj.feeStructure.find(
        (f: any) => f.level === targetLevel
    );
    if (config && config.requiredDocuments) {
        return config.requiredDocuments.map((d: any) => d.name);
    }

    return []; // Fail safe: Return empty array, don't invent requirements.

    return [];
};


export default function ResultsPage() {
    const { studentProfile, students, resultPageConfigs, programmes } = useSchoolData();
    const [selectedResultPageConfigId, setSelectedResultPageConfigId] = useState<string | null>(null);

    // 1. Authenticate Linked Student
    const linkedStudent = studentProfile.linkedStudentCode
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    // --- State for View ---
    const [selectedSemester, setSelectedSemester] = useState<string>("");
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Initialize selectedSemester
    useEffect(() => {
        if (linkedStudent?.level) {
            setSelectedSemester(linkedStudent.level);
        }
    }, [linkedStudent?.level]);


    // --- Derived Data Hooks (Safe even if student is null) ---
    const programmeObj = useMemo(() => {
        if (!linkedStudent) return null;
        return programmes.find(
            (p) => p.name === linkedStudent.programme || p.id === linkedStudent.programme
        );
    }, [linkedStudent, programmes]);

    // reliability check
    useEffect(() => {
        if (linkedStudent?.programme && !programmeObj) {
            console.warn(`Programme lookup failed for "${linkedStudent.programme}". Ensure the student record refers to a valid Programme ID.`);
        }
    }, [linkedStudent, programmeObj]);

    const availableLevels = useMemo(() => {
        return programmeObj?.levels || ["Year 1 Semester 1", "Year 1 Semester 2"];
    }, [programmeObj]);

    // Construct "Attended Semesters" list
    const attendedSemesters = useMemo(() => {
        if (!linkedStudent || !availableLevels.length) return [linkedStudent?.level || "Unknown Level"];

        const currentLevelIdx = availableLevels.indexOf(linkedStudent.level);
        // If level not found in config, just show current level to avoid crash
        if (currentLevelIdx === -1) return [linkedStudent.level];

        return availableLevels.slice(0, currentLevelIdx + 1);
    }, [linkedStudent, availableLevels]);

    // Ensure selectedSemester is valid
    const effectiveSemester = selectedSemester || (linkedStudent?.level ?? "");

    // Requirements for Effective Semester
    const requiredDocs = useMemo(() => {
        return getLevelRequirements(programmeObj, effectiveSemester);
    }, [programmeObj, effectiveSemester]);

    // Filter Documents
    const submittedDocs = useMemo(() => {
        return (linkedStudent?.documentHistory || []).filter(
            (d) => d.status === "submitted"
        );
    }, [linkedStudent]);

    const returnedDocs = useMemo(() => {
        return (linkedStudent?.documentHistory || []).filter(
            (d) => d.status === "returned"
        );
    }, [linkedStudent]);

    // Results: Filter by student AND semester
    const visibleResultConfigs = useMemo(() => {
        if (!linkedStudent) return [];
        return resultPageConfigs.filter((config) => {
            // Match Programme
            const isProgMatch = config.programmeId === programmeObj?.id;
            // Match Semester
            const isSemMatch = config.level === effectiveSemester;
            return isProgMatch && isSemMatch;
        });
    }, [resultPageConfigs, linkedStudent, programmeObj, effectiveSemester]);

    const selectedResultPageConfig = useMemo(
        () =>
            resultPageConfigs.find((c) => c.id === selectedResultPageConfigId) ||
            null,
        [resultPageConfigs, selectedResultPageConfigId]
    );

    // Escape key handler for preview modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreviewImageUrl(null);
        };
        if (previewImageUrl) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [previewImageUrl]);

    // Ghost result check
    const hasGrades = (configId: string) => {
        // Placeholder logic: Check if student has metrics for this result sheet
        // In real app: return linkedStudent.results.some(r => r.configId === configId)
        return true;
    };

    // --- CONDITIONAL RENDERING ---

    const isRegistrarEnrolled = linkedStudent?.origin === 'registrar';

    if (!linkedStudent || !isRegistrarEnrolled) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in text-gray-100">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <GraduationCap size={48} className="text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">{!linkedStudent ? "Academic Results Locked" : "Results Not Available"}</h1>
                <p className="text-gray-400 mb-8 max-w-md text-lg">
                    {!linkedStudent
                        ? "Official transcripts and academic results are private to admitted students. Please link your school record in your profile."
                        : "Your account is linked, but you haven't been admitted in the Registrar's portal yet. Academic results are only available to enrolled students."}
                </p>
                <Link
                    href="/student/profile"
                    className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-700 transition flex items-center gap-2"
                >
                    <Shield size={18} /> {!linkedStudent ? "Link School Record" : "Go to My Profile"}
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in min-h-screen">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white/5 p-8 rounded-xl border border-white/10 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full md:w-auto">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-lg bg-gray-800 flex items-center justify-center">
                            {linkedStudent.profilePic ? (
                                <img
                                    src={linkedStudent.profilePic}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl text-gray-500">👤</span>
                            )}
                        </div>
                    </div>

                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-extrabold mb-2 text-white">
                            {linkedStudent.name}
                        </h1>
                        <div className="text-gray-400 flex flex-wrap gap-3 text-sm items-center justify-center md:justify-start">
                            <span className="bg-white/10 px-3 py-1 rounded-full font-medium text-white border border-white/5">
                                {linkedStudent.programme}
                            </span>
                            <span className="opacity-50">•</span>
                            {/* Semester Selector */}
                            <div className="relative group z-30 inline-block">
                                <button className="flex items-center gap-2 font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                                    <span>{effectiveSemester}</span>
                                    <span className="text-xs">▼</span>
                                </button>
                                {/* Dropdown */}
                                <div className="absolute top-full left-0 md:left-auto md:right-auto mt-2 w-56 bg-[#1a1a1a] rounded-xl shadow-xl border border-white/10 hidden group-hover:block overflow-hidden transition-all animate-fade-in">
                                    <div className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/5 border-b border-white/5">
                                        Select Semester View
                                    </div>
                                    {attendedSemesters.map((sem) => (
                                        <button
                                            key={sem}
                                            onClick={() => setSelectedSemester(sem)}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center justify-between ${sem === effectiveSemester
                                                ? "text-blue-400 font-bold bg-blue-500/10"
                                                : "text-gray-300"
                                                }`}
                                        >
                                            <span>{sem}</span>
                                            {sem === linkedStudent.level && (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold border border-green-500/30">
                                                    CURRENT
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <span className="opacity-50">•</span>
                            <span className="font-mono text-gray-500">
                                {linkedStudent.payCode}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 mt-6 md:mt-0 relative z-10 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Financial Clearance
                    </span>
                    <div className="flex items-center gap-4">
                        <StatusRing student={linkedStudent} size={80} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. REQUIRED DOCUMENTS */}
                <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 lg:col-span-1 h-fit backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <h2 className="text-lg font-extrabold text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                            <span className="text-2xl">📋</span> Required Docs
                        </h2>
                        <span
                            className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold truncate max-w-[100px]"
                            title={effectiveSemester}
                        >
                            {effectiveSemester}
                        </span>
                    </div>
                    <ul className="space-y-3">
                        {(requiredDocs || []).map((docName: string, idx: number) => {
                            const isSubmitted = submittedDocs.some(
                                (d) => d.type === docName || d.name === docName
                            );
                            return (
                                <li
                                    key={idx}
                                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5"
                                >
                                    <span className="text-gray-300 font-medium text-sm">
                                        {docName}
                                    </span>
                                    {isSubmitted ? (
                                        <span className="text-green-500 text-lg">✓</span>
                                    ) : (
                                        <span
                                            className="text-red-500 text-lg font-bold animate-pulse"
                                            title="Missing"
                                        >
                                            ❗
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                        {requiredDocs.length === 0 && (
                            <li className="text-gray-500 italic text-center p-4 text-xs bg-white/5 rounded-lg border border-dashed border-white/10">
                                No document requirements configured for this semester.
                                <br />
                                <span className="text-[10px] opacity-70">Contact the Registrar if you believe this is an error.</span>
                            </li>
                        )}
                    </ul>
                </div>

                {/* 2 & 3. MAIN CONTENT (Docs + Results) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* ACADEMIC RESULTS SECTION */}
                    <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                            Academic Results
                            <span className="text-sm font-normal text-gray-400 bg-white/10 px-2 py-1 rounded ml-auto">
                                {effectiveSemester}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visibleResultConfigs
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((config) => (
                                    hasGrades(config.id) ? (
                                        <ResultCard
                                            key={`${config.id}-${config.name}`}
                                            student={linkedStudent}
                                            config={config}
                                            onClick={() => setSelectedResultPageConfigId(config.id)}
                                        />
                                    ) : (
                                        <div key={config.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-center text-gray-500 text-sm italic">
                                            No Grades Published
                                        </div>
                                    )
                                ))}
                            {visibleResultConfigs.length === 0 && (
                                <div className="col-span-2 bg-black/20 rounded-lg p-8 text-center border-2 border-dashed border-white/5">
                                    <p className="text-gray-400 italic mb-2">
                                        No results published for {effectiveSemester}.
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Check back later or switch semester view.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RETURNED DOCUMENTS (PROMOTED & URGENT) */}
                    {returnedDocs.length > 0 && (
                        <div className="p-6 rounded-xl shadow-lg border backdrop-blur-sm bg-red-500/10 border-red-500/30">
                            <h2 className="text-xl font-bold mb-6 text-red-400 flex items-center gap-2">
                                <span>⚠️</span> Returned Documents History
                            </h2>
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-gray-400 uppercase bg-black/20 border-b border-red-500/20">
                                    <tr>
                                        <th className="p-3">Document</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-500/20">
                                    {returnedDocs.map((doc) => (
                                        <tr key={doc.id}>
                                            <td className="p-3 font-medium text-gray-200">
                                                {doc.name}
                                            </td>
                                            <td className="p-3 text-gray-400">
                                                {doc.returnDate}
                                            </td>
                                            <td className="p-3 text-red-300 italic">
                                                "{doc.returnReason}"
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* SUBMITTED DOCUMENTS */}
                    <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Submitted Documents</h2>
                            <Link
                                href="/student/profile?tab=documents"
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-2"
                            >
                                <span>Upload / Manage</span>
                                <span className="text-lg leading-none">↗</span>
                            </Link>
                        </div>

                        {submittedDocs.length === 0 ? (
                            <p className="text-gray-500 italic text-center py-8">
                                No documents currently held.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="p-3">Document</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {submittedDocs.map((doc) => (
                                            <tr key={doc.id} className="group hover:bg-white/5 transition-colors">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 bg-gray-800 rounded border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition"
                                                            onClick={() =>
                                                                doc.fileUrl &&
                                                                // TODO: In production, fetch a secure signed URL from API before setting state
                                                                setPreviewImageUrl(doc.fileUrl)
                                                            }
                                                        >
                                                            {doc.fileUrl ? (
                                                                <img
                                                                    src={doc.fileUrl}
                                                                    alt="doc"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">
                                                                    📄
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div
                                                                className="font-medium text-gray-200 cursor-pointer hover:text-blue-400"
                                                                onClick={() =>
                                                                    doc.fileUrl &&
                                                                    // TODO: In production, fetch a secure signed URL from API before setting state
                                                                    setPreviewImageUrl(doc.fileUrl)
                                                                }
                                                            >
                                                                {doc.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {doc.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-400">
                                                    {doc.submissionDate}
                                                </td>
                                                <td className="p-3">
                                                    <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20">
                                                        Received
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Modal */}
            {selectedResultPageConfig && (
                <EditResultsModal
                    student={linkedStudent}
                    pageConfig={selectedResultPageConfig}
                    onClose={() => setSelectedResultPageConfigId(null)}
                    readOnly={true}
                />
            )}

            {/* Image Preview Modal */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl">
                        ×
                    </button>
                    <img
                        src={previewImageUrl}
                        alt="Document Preview"
                        crossOrigin="anonymous"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
                    />
                </div>
            )}
        </div>
    );
}
