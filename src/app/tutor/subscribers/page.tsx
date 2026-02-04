"use client";

import { useSchoolData } from "@/lib/store";
import { useState } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";

export default function SubscribersPage() {
    const { tutorSubscriptions, students, tutorProfile } = useSchoolData();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Secure Identity
    if (!tutorProfile) {
        return <div className="p-8 text-center text-gray-500">Please log in to view subscribers.</div>;
    }

    const currentTutorId = tutorProfile.id;

    // Data Processing
    const mySubs = tutorSubscriptions.filter(s => s.tutorId === currentTutorId);

    // Pagination Logic
    const totalPages = Math.ceil(mySubs.length / itemsPerPage);
    const paginatedSubs = mySubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Helpers
    const getStudentName = (id: string) => {
        const student = students.find(s => s.id.toString() === id);
        return student ? student.name : `Student #${id}`;
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-white mb-2">My Subscribers</h1>

            {/* --- MOBILE CARD VIEW (md:hidden) --- */}
            <div className="md:hidden space-y-4">
                {paginatedSubs.length > 0 ? (
                    paginatedSubs.map(sub => (
                        <div key={sub.id} className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-900/20 text-blue-400 flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-200">{getStudentName(sub.studentId)}</div>
                                        <div className="text-xs text-blue-400">ID: {sub.studentId}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold border ${sub.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {sub.status}
                                </span>
                            </div>

                            <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-gray-500">Amount Paid</div>
                                    <div className="font-mono font-bold text-white">{sub.amount.toLocaleString()} UGX</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">{formatDate(sub.startDate)} - {formatDate(sub.expiryDate)}</div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">
                        No subscribers yet.
                    </div>
                )}
            </div>

            {/* --- DESKTOP TABLE VIEW (hidden md:block) --- */}
            <div className="hidden md:block bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-950 border-b border-gray-800">
                        <tr>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Student</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Status</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Start Date</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Expiry Date</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSubs.length > 0 ? (
                            paginatedSubs.map(sub => (
                                <tr key={sub.id} className="border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-200 font-medium">{getStudentName(sub.studentId)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${sub.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">{formatDate(sub.startDate)}</td>
                                    <td className="p-4 text-gray-400 text-sm">{formatDate(sub.expiryDate)}</td>
                                    <td className="p-4 text-gray-200 text-sm text-right font-mono">{sub.amount.toLocaleString()} UGX</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-500">
                                    No subscribers yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PAGINATION CONTROLS --- */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
