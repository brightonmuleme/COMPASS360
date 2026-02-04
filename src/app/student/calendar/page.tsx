"use client";

import { useSchoolData, CalendarEvent, ClassSession, EnrolledStudent } from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    MapPin,
    Clock,
    CalendarClock,
    User,
    BookOpen
} from "lucide-react";
import Link from 'next/link';

export default function StudentSchedule() {
    const {
        calendarEvents,
        students,
        programmes,
        courseUnits,
        tutors,
        studentProfile
    } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'calendar' | 'timetable'>('calendar');

    // --- LINKED STUDENT AUTH ---
    const linkedStudent = studentProfile.linkedStudentCode
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    // --- CALENDAR LOGIC ---
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [expandedDay, setExpandedDay] = useState<Date | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Mobile check
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Timezone-safe date helper
    const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Escape key handler for modals
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedEvent(null);
                setExpandedDay(null);
            }
        };
        if (selectedEvent || expandedDay) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [selectedEvent, expandedDay]);

    // Auto-focus close button when modal opens
    useEffect(() => {
        if (selectedEvent) closeButtonRef.current?.focus();
    }, [selectedEvent]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sun

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);

    const dateGrid = [];
    for (let i = 0; i < startDay; i++) dateGrid.push(null);
    for (let i = 1; i <= daysInMonth; i++) dateGrid.push(new Date(year, month, i));

    const changeMonth = (delta: number) => {
        setViewDate(new Date(year, month + delta, 1));
    };

    // --- FILTER EVENTS FOR STUDENT ---
    const getEventsForDay = (date: Date) => {
        if (!linkedStudent) return []; // Fallback if no student
        const dateStr = toLocalDateString(date);

        return calendarEvents.filter(e => {
            // 1. Basic Filters
            if (e.status !== 'published') return false;

            // 2. Date Match
            const isDateMatch = e.endDate
                ? (dateStr >= e.startDate && dateStr <= e.endDate)
                : e.startDate === dateStr;

            if (!isDateMatch) return false;

            // 3. Visibility Filter (The Core Logic)
            if (e.visibility === 'all') return true; // Public events
            if (e.visibility === 'staff') return false; // Hidden from students
            if (e.visibility === 'specific') {
                // Must match Programme AND/OR Level
                const myProgId = programmes.find(p => p.name === linkedStudent.programme || p.id === linkedStudent.programme)?.id;

                // Debug warning for data inconsistency
                if (linkedStudent.programme && !programmes.find(p => p.id === linkedStudent.programme)) {
                    console.warn(`Student programme is stored as name "${linkedStudent.programme}" instead of ID. Please migrate to ID-based references.`);
                }

                // If event has Target Programmes, I must be in one
                if (e.targetProgrammes && e.targetProgrammes.length > 0) {
                    if (!myProgId || !e.targetProgrammes.includes(myProgId)) return false;
                }

                // If event has Target Levels, I must be in one
                if (e.targetLevels && e.targetLevels.length > 0) {
                    // Normalize levels logic if needed, usually exact match
                    if (!e.targetLevels.includes(linkedStudent.level)) return false;
                }

                return true;
            }

            return false;
        });
    };

    // --- TIMETABLE LOGIC ---
    const weeklyTimetable = useMemo(() => {
        if (!linkedStudent) return [];
        const prog = programmes.find(p => p.name === linkedStudent.programme || p.id === linkedStudent.programme);

        // Debug warning for data inconsistency
        if (linkedStudent.programme && !programmes.find(p => p.id === linkedStudent.programme)) {
            console.warn(`Student programme is stored as name "${linkedStudent.programme}" instead of ID. Please migrate to ID-based references.`);
        }

        if (!prog) return [];

        const levelConfig = prog.feeStructure?.find(fs => fs.level === linkedStudent.level);
        return levelConfig?.timetable || [];
    }, [linkedStudent, programmes]);

    const upcomingClasses = useMemo(() => {
        // Reuse same filtering logic for special classes if needed
        return calendarEvents
            .filter(e => e.type === 'timetable' && new Date(e.startDate) >= new Date()) // Using 'timetable' as generic placeholder for special academic events
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [calendarEvents]);

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Helper to resolve names
    const getSessionDetails = (session: ClassSession) => {
        const cu = courseUnits.find(c => c.id === session.courseUnitId);
        const tut = tutors.find(t => t.id === session.tutorId);
        return {
            subject: cu ? cu.name : 'Unknown Subject',
            tutorName: tut ? tut.name : (session.lecturer || '[Staff TBA]'),
            isInactive: tut?.status === 'Inactive'
        };
    };

    const getEventStyle = (index: number) => {
        const styles = [
            'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:border-blue-400',
            'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-400',
            'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:border-purple-400',
            'bg-orange-500/10 text-orange-300 border-orange-500/30 hover:border-orange-400',
            'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:border-pink-400'
        ];
        return styles[index % styles.length];
    };

    // --- CONDITIONAL VIEW ---
    const isRegistrarEnrolled = linkedStudent?.origin === 'registrar';

    if (!linkedStudent || !isRegistrarEnrolled) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in text-gray-100">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <CalendarIcon size={48} className="text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">{!linkedStudent ? "Academic Schedule Locked" : "Enrollment Pending"}</h1>
                <p className="text-gray-400 mb-8 max-w-md text-lg">
                    {!linkedStudent
                        ? "Personalized school schedules are private to admitted students. Please link your official school record in your profile."
                        : "Your account is linked, but you haven't been admitted in the Registrar's portal yet. Please contact the Registrar's office for admission."}
                </p>
                <Link
                    href="/student/profile"
                    className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-700 transition flex items-center gap-2"
                >
                    <CalendarIcon size={18} /> {!linkedStudent ? "Link School Record" : "Go to My Profile"}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen animate-fade-in text-gray-100">
            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        {activeTab === 'calendar' ? (
                            <><CalendarIcon className="text-blue-500" size={32} /> Academic Calendar</>
                        ) : (
                            <><CalendarClock className="text-purple-500" size={32} /> Class Timetable</>
                        )}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        {activeTab === 'calendar'
                            ? `Overview for ${linkedStudent.programme}`
                            : `Weekly schedule for ${linkedStudent.level}`}
                    </p>
                </div>

                <div className="bg-[#181818] p-1.5 rounded-xl flex shrink-0 border border-gray-800">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-[#2a2a2a] text-blue-400 shadow-sm border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <CalendarIcon size={16} /> Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab('timetable')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'timetable' ? 'bg-[#2a2a2a] text-purple-400 shadow-sm border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <CalendarClock size={16} /> Timetable
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            {activeTab === 'calendar' ? (
                // === CALENDAR VIEW ===
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4 bg-[#181818] border border-gray-800 p-2 rounded-xl shadow-sm">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-white"><ChevronLeft size={20} /></button>
                            <span className="font-bold text-lg min-w-[160px] text-center text-gray-200">
                                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-white"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    {/* RESPONSIVE CALENDAR GRID */}
                    <div className="bg-[#181818] rounded-xl shadow-sm border border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-7 bg-[#202020] border-b border-gray-800 divide-x divide-gray-800 text-center">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-2 md:py-4 font-bold text-gray-500 text-[10px] md:text-xs uppercase tracking-widest truncate">{d.slice(0, 3)}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 divide-x divide-y divide-gray-800 bg-[#181818]">
                            {dateGrid.map((date, idx) => {
                                if (!date) return <div key={idx} className="bg-[#121212]/50 min-h-[50px] md:min-h-[140px]" />;

                                const isToday = new Date().toDateString() === date.toDateString();
                                const dailyEvents = getEventsForDay(date);

                                // Mobile vs Desktop Render Logic handled via CSS classes
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => isMobile && dailyEvents.length > 0 && setExpandedDay(date)}
                                        className={`min-h-[80px] md:min-h-[140px] p-1 md:p-2 transition-all hover:bg-[#202020] group relative cursor-pointer md:cursor-default ${isToday ? 'bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex justify-center md:justify-between items-start mb-1 md:mb-2">
                                            <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 group-hover:bg-gray-700 group-hover:text-white'}`}>
                                                {date.getDate()}
                                            </span>
                                        </div>

                                        {/* DESKTOP: Text List */}
                                        <div className="hidden md:block space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                                            {dailyEvents.slice(0, 3).map((evt, idx) => (
                                                <button
                                                    key={evt.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                                                    className={`w-full text-left text-xs px-2 py-1.5 rounded-md border truncate transition-all hover:scale-105 shadow-sm hover:shadow active:scale-95 ${getEventStyle(idx)}`}
                                                >
                                                    {evt.title}
                                                </button>
                                            ))}
                                            {dailyEvents.length > 3 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedDay(date); }}
                                                    className="text-[10px] text-blue-400 hover:underline w-full text-left px-2"
                                                >
                                                    +{dailyEvents.length - 3} more
                                                </button>
                                            )}
                                        </div>

                                        {/* MOBILE: Dot Indicators */}
                                        <div className="md:hidden flex flex-wrap justify-center gap-1 mt-1">
                                            {dailyEvents.slice(0, 5).map((evt, idx) => {
                                                // Extract generic color from getEventStyle or fallback
                                                const styleClass = getEventStyle(idx);
                                                let dotClass = "bg-gray-500";
                                                if (styleClass.includes("blue")) dotClass = "bg-blue-500";
                                                else if (styleClass.includes("emerald")) dotClass = "bg-emerald-500";
                                                else if (styleClass.includes("purple")) dotClass = "bg-purple-500";
                                                else if (styleClass.includes("orange")) dotClass = "bg-orange-500";
                                                else if (styleClass.includes("pink")) dotClass = "bg-pink-500";

                                                return (
                                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                                                )
                                            })}
                                            {dailyEvents.length > 5 && <span className="text-[8px] text-gray-500">+</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* EVENT DETAIL MODAL (Read Only) */}
                    {selectedEvent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEvent(null)}>
                            <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl p-6 relative border border-gray-700 animate-scale-up" onClick={e => e.stopPropagation()}>
                                <button
                                    ref={closeButtonRef}
                                    onClick={() => setSelectedEvent(null)}
                                    className="absolute top-4 right-4 bg-gray-800 p-1.5 rounded-full hover:bg-gray-700 text-gray-400 transition-colors"
                                >
                                    <ChevronRight size={16} className="rotate-90" />
                                </button>

                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm transform -rotate-3 bg-blue-500/20 text-blue-400`}>
                                    <CalendarIcon size={24} />
                                </div>

                                <h2 className="text-2xl font-bold mb-1 text-white">{selectedEvent.title}</h2>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-6 border border-gray-700">
                                    {selectedEvent.type}
                                </span>

                                <div className="space-y-4 mb-8 bg-[#121212] p-4 rounded-xl border border-gray-800">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Clock size={18} className="text-gray-500" />
                                        <span className="font-medium text-sm">
                                            {(selectedEvent as any).endDate && (selectedEvent as any).endDate !== selectedEvent.startDate ? (
                                                <>
                                                    {new Date(selectedEvent.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                    {' - '}
                                                    {new Date((selectedEvent as any).endDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </>
                                            ) : (
                                                new Date(selectedEvent.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                            )}
                                            {(selectedEvent as any).startTime && ` at ${(selectedEvent as any).startTime}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <MapPin size={18} className="text-gray-500" />
                                        <span className="font-medium text-sm">
                                            {(selectedEvent as any).location || 'Location TBA'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-gray-400 text-sm leading-relaxed mb-6">
                                    {selectedEvent.description || "No description provided."}
                                </div>

                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all shadow-lg active:scale-95"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    )}

                    {/* DAY VIEW MODAL */}
                    {expandedDay && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setExpandedDay(null)}>
                            <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <h2 className="text-xl font-bold mb-4 text-white">
                                    {expandedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h2>
                                <div className="space-y-2">
                                    {getEventsForDay(expandedDay).map((evt, idx) => (
                                        <button
                                            key={evt.id}
                                            onClick={() => { setExpandedDay(null); setSelectedEvent(evt); }}
                                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all hover:scale-105 ${getEventStyle(idx)}`}
                                        >
                                            {evt.title}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setExpandedDay(null)}
                                    className="w-full mt-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // === TIMETABLE VIEW ===
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {!linkedStudent ? (
                        <div className="p-8 text-center text-gray-500">Loading Student Config...</div>
                    ) : (
                        <>
                            {/* WEEKLY GRID */}
                            {weeklyTimetable.length === 0 ? (
                                <div className="text-center py-20 bg-[#181818] rounded-xl border border-dashed border-gray-800">
                                    <CalendarClock className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                                    <p className="text-gray-400 text-lg font-medium mb-2">
                                        No Timetable Available
                                    </p>
                                    <p className="text-gray-600 text-sm max-w-md mx-auto">
                                        Your programme's timetable hasn't been published yet. Please check back later or contact the Registrar's office.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-5 mb-12">
                                    {weekDays.map(day => {
                                        const sessions = weeklyTimetable.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                                        const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

                                        return (
                                            <div key={day} className={`rounded-xl border flex flex-col h-full bg-[#181818] transition-all ${isToday ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] ring-1 ring-purple-500 transform -translate-y-1' : 'border-gray-800 hover:border-gray-600 shadow-sm'}`}>
                                                <div className={`p-4 border-b ${isToday ? 'bg-purple-600 text-white' : 'bg-[#202020] text-gray-400'} rounded-t-xl font-bold text-center tracking-wide text-sm uppercase`}>
                                                    {day}
                                                </div>
                                                <div className="p-3 space-y-3 flex-grow bg-[#121212]">
                                                    {sessions.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-gray-700 min-h-[150px]">
                                                            <BookOpen size={24} className="mb-2 opacity-30" />
                                                            <span className="text-xs font-medium">No classes</span>
                                                        </div>
                                                    ) : (
                                                        sessions.map((session, i) => {
                                                            const { subject, tutorName, isInactive } = getSessionDetails(session);
                                                            return (
                                                                <SessionCard key={i} session={session} isToday={isToday} subjectName={subject} tutorName={tutorName} isInactive={isInactive} />
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function SessionCard({ session, isToday, subjectName, tutorName, isInactive }: { session: ClassSession, isToday: boolean, subjectName: string, tutorName: string, isInactive?: boolean }) {
    return (
        <div className={`p-3 rounded-lg border shadow-sm text-sm transition-all group cursor-pointer relative overflow-hidden ${isToday ? 'bg-[#222] border-purple-500/30 hover:border-purple-500/60 hover:shadow-md' : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isToday ? 'bg-purple-500' : 'bg-gray-700 group-hover:bg-gray-500'}`} />
            <div className="pl-2">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-200 line-clamp-1 group-hover:text-purple-400 transition-colors">{subjectName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-2 text-xs font-mono bg-[#121212] inline-block px-1.5 py-0.5 rounded border border-gray-800">
                    <Clock size={10} />
                    <span>{session.startTime} - {session.endTime}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {session.room}</span>
                </div>
                {tutorName && (
                    <div className="mt-2 text-xs flex items-center gap-1.5 pt-2 border-t border-dashed border-gray-800">
                        <User size={10} className="text-purple-500/70" />
                        <span className={`line-clamp-1 ${isInactive ? 'text-gray-600 italic' : 'text-gray-500'}`}>
                            {tutorName} {isInactive && '(Former)'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
