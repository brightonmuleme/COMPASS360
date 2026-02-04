import React, { useState, useMemo } from 'react';
import { useSchoolData, ClassSession, Programme } from '@/lib/store';

export default function MasterTimetable() {
    const { programmes, courseUnits, tutors } = useSchoolData();

    // Filters State
    const [selectedProgramme, setSelectedProgramme] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = [
        "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
        "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
    ];

    // Helper to get tutor name
    const getTutorName = (id?: string) => {
        if (!id) return 'TBA';
        const t = tutors.find(t => t.id === id);
        return t ? t.name : 'Unknown Tutor';
    };

    // Helper to get CU code
    const getCUCode = (id: string) => {
        const cu = courseUnits.find(c => c.id === id);
        return cu ? cu.code : '???';
    };

    // Helper to get CU name
    const getCUName = (id: string) => {
        const cu = courseUnits.find(c => c.id === id);
        return cu ? cu.name : 'Unknown Course';
    };

    // Flatten all sessions
    const allSessions = useMemo(() => {
        const sessions: {
            session: ClassSession,
            programmeName: string,
            programmeCode: string,
            level: string,
            semester: string
        }[] = [];

        programmes.forEach(prog => {
            (prog.feeStructure || []).forEach(fs => {
                // Determine semester from level name if possible, or just use level
                // Assuming feeStructure items represent "Year X Semester Y" or simply "Level"
                (fs.timetable || []).forEach(s => {
                    sessions.push({
                        session: s,
                        programmeName: prog.name,
                        programmeCode: prog.code,
                        level: fs.level, // "Year 1 Semester 1"
                        semester: '' // Implicit in level usually
                    });
                });
            });
        });

        return sessions;
    }, [programmes]);

    // Apply Filters
    const filteredSessions = useMemo(() => {
        return allSessions.filter(item => {
            const matchesProg = selectedProgramme ? item.programmeCode === selectedProgramme || item.programmeName === selectedProgramme : true; // Matching ID probably better if available, relying on ID match in select
            const matchesLevel = selectedLevel ? item.level.includes(selectedLevel) : true;
            const matchesDay = selectedDay ? item.session.day === selectedDay : true;

            // For Programme match, let's use ID comparison
            const prog = programmes.find(p => p.id === selectedProgramme);
            const strictProgMatch = selectedProgramme ? (prog ? item.programmeName === prog.name : false) : true;

            return strictProgMatch && matchesLevel && matchesDay;
        });
    }, [allSessions, selectedProgramme, selectedLevel, selectedDay, programmes]);

    // Get unique levels for filter (Scoped to Selected Programme if active)
    const availableLevels = useMemo(() => {
        if (selectedProgramme) {
            const prog = programmes.find(p => p.id === selectedProgramme);
            if (prog) {
                // Prefer configured levels from feeStructure/timetable config
                const configuredLevels = new Set<string>();
                if (prog.levels) prog.levels.forEach(l => configuredLevels.add(l));
                if (prog.feeStructure) prog.feeStructure.forEach(fs => configuredLevels.add(fs.level));

                if (configuredLevels.size > 0) return Array.from(configuredLevels).sort();
            }
        }
        // Fallback: All levels from all sessions
        return Array.from(new Set(allSessions.map(s => s.level))).sort();
    }, [selectedProgramme, programmes, allSessions]);

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-row items-center gap-4 overflow-x-auto">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium whitespace-nowrap">
                    <span className="text-lg">⚡</span> Filters:
                </div>

                <select
                    className="light-input min-w-[200px]"
                    value={selectedProgramme}
                    onChange={(e) => setSelectedProgramme(e.target.value)}
                >
                    <option value="">All Programmes</option>
                    {programmes.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                </select>

                <select
                    className="light-input min-w-[150px]"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                >
                    <option value="">All Levels</option>
                    {availableLevels.map(l => (
                        <option key={l} value={l}>{l}</option>
                    ))}
                </select>

                <select
                    className="light-input min-w-[150px]"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                >
                    <option value="">All Days</option>
                    {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                {(selectedProgramme || selectedLevel || selectedDay) && (
                    <button
                        onClick={() => { setSelectedProgramme(''); setSelectedLevel(''); setSelectedDay(''); }}
                        className="text-red-500 text-sm hover:underline"
                    >
                        Clear Filters
                    </button>
                )}

                <button
                    onClick={() => window.print()}
                    className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-all printing-hide"
                    title="Print Current Timetable View"
                >
                    <span>🖨️</span> Print
                </button>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 bg-gray-50 border-b border-r border-gray-200 text-xs uppercase text-gray-400 font-bold w-24 sticky left-0 z-10">Time</th>
                            {days.map(day => (
                                <th key={day} className={`p-4 bg-gray-50 border-b border-gray-200 text-xs w-[13%] uppercase font-bold ${day === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
                                    {day.slice(0, 3)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {timeSlots.map(slot => (
                            <tr key={slot} className="group hover:bg-gray-50/50">
                                <td className="p-3 border-r border-gray-100 text-xs text-gray-400 font-mono text-center sticky left-0 bg-white group-hover:bg-gray-50/50 z-10">
                                    {slot}
                                </td>
                                {days.map(day => {
                                    // Find sessions active in this slot for this day
                                    const activeSessions = filteredSessions.filter(item => {
                                        if (item.session.day !== day) return false;
                                        const start = parseInt(item.session.startTime.split(':')[0]);
                                        const end = parseInt(item.session.endTime.split(':')[0]);
                                        const current = parseInt(slot.split(':')[0]);
                                        return current >= start && current < end;
                                    });

                                    return (
                                        <td key={`${day}-${slot}`} className="p-1 border-r border-gray-100 align-top h-24 relative">
                                            <div className="flex flex-col gap-1 h-full">
                                                {activeSessions.map((item, idx) => (
                                                    <div
                                                        key={`${item.session.id}-${idx}`}
                                                        className={`p-2 rounded-md border text-[10px] shadow-sm leading-tight transition-transform hover:scale-105 hover:z-20 cursor-default
                                                            ${item.session.room ? 'bg-indigo-50 border-indigo-100 text-indigo-900' : 'bg-orange-50 border-orange-100 text-orange-900'}
                                                        `}
                                                    >
                                                        <div className="font-bold truncate">{getCUCode(item.session.courseUnitId)}</div>
                                                        <div className="truncate opacity-75 mb-1" title={getCUName(item.session.courseUnitId)}>{getCUName(item.session.courseUnitId)}</div>

                                                        <div className="flex items-center gap-1 opacity-60">
                                                            <span>📍 {item.session.room || 'No Room'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-60 mt-0.5">
                                                            <span>👨‍🏫 {getTutorName(item.session.tutorId)}</span>
                                                        </div>

                                                        <div className="truncate text-[9px] font-medium mt-1 opacity-90 pt-1 border-t border-black/5" title={item.programmeName}>
                                                            {item.programmeName}
                                                        </div>

                                                        {/* Badge for Programme/Level */}
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            <span className="px-1 py-0.5 bg-white/50 rounded text-[9px] font-semibold">{item.programmeCode}</span>
                                                            <span className="px-1 py-0.5 bg-white/50 rounded text-[9px]">{item.level}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-center text-xs text-gray-400 mt-4">
                Showing {filteredSessions.length} active sessions based on current filters.
            </div>
        </div>
    );
}
