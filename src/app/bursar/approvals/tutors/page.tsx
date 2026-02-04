"use client";
import React, { useState } from 'react';
import { useSchoolData, Tutor, CourseUnit } from '@/lib/store';

export default function DirectorTutorsViewPage() {
    const {
        programmes,
        tutors,
        courseUnits
    } = useSchoolData();

    const [viewTutor, setViewTutor] = useState<Tutor | null>(null);
    const [tutorSearch, setTutorSearch] = useState('');
    const [tutorProgFilter, setTutorProgFilter] = useState('');
    const [tutorCUFilter, setTutorCUFilter] = useState('');

    // Filter logic
    const doesTutorTeachCU = (tutorId: string, cuId: string) => {
        return programmes.some(p =>
            (p.feeStructure || []).some(fs =>
                (fs.timetable || []).some(s => s.tutorId === tutorId && s.courseUnitId === cuId)
            )
        );
    };

    const filteredTutors = tutors.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(tutorSearch.toLowerCase());
        const matchesProg = tutorProgFilter ? t.programmeIds.includes(tutorProgFilter) : true;

        let matchesCU = true;
        if (tutorCUFilter) {
            matchesCU = doesTutorTeachCU(t.id, tutorCUFilter);
        }

        return matchesSearch && matchesProg && matchesCU;
    });

    const uniqueCourseUnits = Array.from(new Set(courseUnits.map(cu => cu.id)))
        .map(id => courseUnits.find(c => c.id === id))
        .filter(c => c !== undefined && (!tutorProgFilter || c.programmeId === tutorProgFilter))
        .sort((a, b) => a!.name.localeCompare(b!.name));

    // Helper to get assigned course units for a tutor
    const getAssignedCourseUnits = (tutorId: string) => {
        const assigned: { cu: CourseUnit, day: string, time: string, level: string, prog: string }[] = [];

        programmes.forEach(prog => {
            (prog.feeStructure || []).forEach(config => {
                (config.timetable || []).filter(s => s.tutorId === tutorId || s.lecturer === tutorId).forEach(session => {
                    const cu = courseUnits.find(c => c.id === session.courseUnitId);
                    if (cu) {
                        assigned.push({
                            cu,
                            day: session.day,
                            time: `${session.startTime} - ${session.endTime}`,
                            level: config.level,
                            prog: prog.code
                        });
                    }
                });
            });
        });
        return assigned;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .light-input {
                    width: 100%;
                    padding: 0.6rem 0.8rem;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    color: #111827;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .light-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
            `}</style>

            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Global Tutors Directory</h1>
                    <p className="text-gray-500 mt-1">Centralized management for all academic staff.</p>
                    <div className="mt-2 text-sm text-gray-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-block">
                        <span className="font-semibold text-blue-600">View Only Mode</span> - No editing capabilities
                    </div>
                </div>

                {/* FILTERS */}
                {tutors.length > 0 && (
                    <div className="mb-6 flex flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                        <div className="relative flex-1 min-w-[250px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Search tutor by name..."
                                className="light-input pl-10"
                                value={tutorSearch}
                                onChange={(e) => setTutorSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="light-input w-48 flex-none"
                            value={tutorProgFilter}
                            onChange={(e) => { setTutorProgFilter(e.target.value); setTutorCUFilter(''); }}
                        >
                            <option value="">All Programmes</option>
                            {programmes.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </select>
                        <select
                            className="light-input w-48 flex-none"
                            value={tutorCUFilter}
                            onChange={(e) => setTutorCUFilter(e.target.value)}
                        >
                            <option value="">All Course Units</option>
                            {uniqueCourseUnits.map(cu => <option key={cu!.id} value={cu!.id}>{cu!.code} - {cu!.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Tutors Table */}
                {tutors.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                        <p className="text-gray-400 text-lg">No tutors available.</p>
                    </div>
                ) : (
                    <>
                        {filteredTutors.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                                <p className="text-gray-400 text-lg">No tutors matching your filters.</p>
                                <button onClick={() => { setTutorSearch(''); setTutorProgFilter(''); setTutorCUFilter(''); }} className="mt-2 text-blue-600 hover:underline">Clear Filters</button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold text-xs">
                                            <tr>
                                                <th className="p-5 font-bold text-gray-700">Name & Contact</th>
                                                <th className="p-5 font-bold text-gray-700">Type</th>
                                                <th className="p-5 font-bold text-gray-700 w-1/3">Linked Programmes</th>
                                                <th className="p-5 font-bold text-gray-700">Status</th>
                                                <th className="p-5 font-bold text-gray-700 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredTutors.map(tutor => (
                                                <tr key={tutor.id} className="group hover:bg-gray-50 transition-colors">
                                                    <td className="p-5">
                                                        <div className="font-bold text-gray-900 text-base">{tutor.name}</div>
                                                        <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                                            <span>{tutor.email}</span>
                                                            <span>{tutor.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${tutor.type === 'Full-time' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                            {tutor.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-wrap gap-2">
                                                            {tutor.programmeIds.map(pid => {
                                                                const p = programmes.find(pr => pr.id === pid);
                                                                const display = p ? (p.code || p.name) : 'Unknown';
                                                                return (
                                                                    <span key={pid} className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap shadow-sm">
                                                                        {display}
                                                                    </span>
                                                                );
                                                            })}
                                                            {tutor.programmeIds.length === 0 && <span className="text-gray-400 italic text-xs">No programmes linked</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${tutor.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${tutor.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                            {tutor.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => setViewTutor(tutor)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors" title="View Details">
                                                                View
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* View Tutor Modal */}
                {viewTutor && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
                            <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">{viewTutor.name}</h2>
                                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">📧 {viewTutor.email}</span>
                                        <span className="flex items-center gap-1">📱 {viewTutor.phone}</span>
                                        <span className={`px-2 py-0.5 rounded font-medium ${viewTutor.type === 'Full-time' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{viewTutor.type}</span>
                                    </div>
                                </div>
                                <button onClick={() => setViewTutor(null)} className="text-gray-400 hover:text-gray-800 text-3xl leading-none">×</button>
                            </div>

                            <div className="p-8 overflow-y-auto bg-white">
                                <h3 className="text-xl font-bold mb-4 text-gray-900 border-l-4 border-blue-500 pl-3">Assigned Course Units</h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                            <tr>
                                                <th className="p-4">Course Unit</th>
                                                <th className="p-4">Programme</th>
                                                <th className="p-4">Level</th>
                                                <th className="p-4">Schedule</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {getAssignedCourseUnits(viewTutor.id).length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No active timetable assignments found for this tutor.</td></tr>
                                            ) : (
                                                getAssignedCourseUnits(viewTutor.id).map((assignment, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-900">{assignment.cu.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{assignment.cu.code}</div>
                                                        </td>
                                                        <td className="p-4 text-gray-600 font-medium">{assignment.prog}</td>
                                                        <td className="p-4 text-gray-600">{assignment.level}</td>
                                                        <td className="p-4 font-mono text-blue-600 font-medium bg-blue-50/50">{assignment.day} {assignment.time}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
