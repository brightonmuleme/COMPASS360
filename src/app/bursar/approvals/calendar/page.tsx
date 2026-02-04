"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, CalendarEvent, EventType } from '@/lib/store';
import { ReadOnlyDayScheduleModal } from '@/components/bursar/ReadOnlyDayScheduleModal';

export default function DirectorCalendarViewPage() {
    const { calendarEvents, programmes } = useSchoolData();

    // View State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filters
    const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
    const [progFilter, setProgFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<string>('all');

    // View Event Modal
    // const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null); // Replaced by Day View
    const [viewingDay, setViewingDay] = useState<Date | null>(null);

    // Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    }, [currentDate, daysInMonth, firstDay]);

    const filteredEvents = useMemo(() => {
        return calendarEvents.filter(evt => {
            if (typeFilter !== 'all' && evt.type !== typeFilter) return false;

            if (progFilter !== 'all') {
                if (evt.visibility === 'specific') {
                    if (evt.targetProgrammes && evt.targetProgrammes.length > 0 && !evt.targetProgrammes.includes(progFilter)) {
                        return false;
                    }
                }
            }

            if (levelFilter !== 'all') {
                if (evt.visibility === 'specific') {
                    if (evt.targetLevels && evt.targetLevels.length > 0 && !evt.targetLevels.includes(levelFilter)) {
                        return false;
                    }
                }
            }

            return true;
        }).sort((a, b) => b.startDate.localeCompare(a.startDate));
    }, [calendarEvents, typeFilter, progFilter, levelFilter]);

    const availableLevels = useMemo(() => {
        if (progFilter === 'all') {
            return Array.from(new Set(programmes.flatMap(p => p.levels || [])));
        }
        const prog = programmes.find(p => p.id === progFilter);
        return prog?.levels || [];
    }, [programmes, progFilter]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const getEventStyle = (type: EventType) => {
        switch (type) {
            case 'academic': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'administrative': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'activity': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const resolveProgCodes = (ids?: string[]) => {
        if (!ids || !Array.isArray(ids) || ids.length === 0) return '';
        if (!programmes) return '';
        return programmes.filter(p => ids.includes(p.id)).map(p => p.code).join(', ');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">School Calendar</h1>
                        <p className="text-gray-500">Academic terms, holidays, and events</p>
                        <div className="mt-2 text-sm text-gray-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-block">
                            <span className="font-semibold text-blue-600">View Only Mode</span> - No editing capabilities
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <select
                            value={progFilter}
                            onChange={e => { setProgFilter(e.target.value); setLevelFilter('all'); }}
                            className="bg-white border border-gray-200 text-black px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none max-w-[200px]"
                        >
                            <option value="all">All Programmes</option>
                            {programmes.map(prog => (
                                <option key={prog.id} value={prog.id}>{prog.code}</option>
                            ))}
                        </select>

                        <select
                            value={levelFilter}
                            onChange={e => setLevelFilter(e.target.value)}
                            className="bg-white border border-gray-200 text-black px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none max-w-[150px]"
                        >
                            <option value="all">All Levels</option>
                            {availableLevels.map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>

                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value as any)}
                            className="bg-white border border-gray-200 text-black px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                            <option value="all">All Events</option>
                            <option value="academic">Academic</option>
                            <option value="administrative">Administrative</option>
                            <option value="activity">Activities</option>
                        </select>

                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${viewMode === 'grid' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                List
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                {viewMode === 'grid' ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">◀ Prev</button>
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">Next ▶</button>
                        </div>

                        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 auto-rows-[120px]">
                            {calendarDays.map((date, idx) => {
                                if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-50" />;

                                const dateStr = date.toISOString().split('T')[0];
                                const daysEvents = filteredEvents.filter(e => {
                                    if (e.endDate) {
                                        return dateStr >= e.startDate && dateStr <= e.endDate;
                                    }
                                    return e.startDate === dateStr;
                                });

                                return (
                                    <div
                                        key={dateStr}
                                        className="border-b border-r border-gray-100 p-2 relative hover:bg-blue-50/20 transition-colors cursor-pointer group"
                                        onClick={() => setViewingDay(date)}
                                    >
                                        <span className={`text-sm font-medium ${new Date().toDateString() === date.toDateString()
                                            ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full'
                                            : 'text-gray-700'
                                            }`}>
                                            {date.getDate()}
                                        </span>

                                        <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                                            {daysEvents.map(evt => (
                                                <button
                                                    key={evt.id}
                                                    onClick={(e) => { e.stopPropagation(); setViewingDay(date); }}
                                                    className={`text-xs w-full text-left px-1.5 py-0.5 rounded border mb-1 flex flex-col gap-0.5 ${getEventStyle(evt.type)} ${evt.status === 'draft' ? 'opacity-60' : ''}`}
                                                >
                                                    <span className="truncate font-semibold text-[10px] leading-tight md:text-xs">
                                                        {evt.status === 'draft' && 'Draft: '}
                                                        {evt.title}
                                                    </span>
                                                    {evt.visibility === 'specific' && (
                                                        <span className="text-[8px] opacity-75 truncate leading-none">
                                                            {resolveProgCodes(evt.targetProgrammes)}
                                                            {evt.targetLevels && evt.targetLevels.length > 0 && evt.targetProgrammes && evt.targetProgrammes.length > 0 && ' | '}
                                                            {evt.targetLevels?.join(', ')}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {filteredEvents.map(evt => (
                                <div key={evt.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-2 h-16 rounded-full shrink-0 ${getEventStyle(evt.type).split(' ')[0]}`} />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-800">{evt.title}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide border ${getEventStyle(evt.type)}`}>
                                                    {evt.type}
                                                </span>
                                                {evt.status === 'draft' && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">Draft</span>}
                                            </div>
                                            <div className="text-sm text-gray-500 mb-2">
                                                {evt.startDate} {evt.endDate ? ` - ${evt.endDate}` : ''}
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{evt.description}</p>

                                            {evt.visibility === 'specific' && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {evt.targetProgrammes && evt.targetProgrammes.length > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                            <strong>Progs:</strong> {resolveProgCodes(evt.targetProgrammes)}
                                                        </div>
                                                    )}
                                                    {evt.targetLevels && evt.targetLevels.length > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                                            <strong>Lvls:</strong> {evt.targetLevels.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <button
                                            onClick={() => {
                                                const [y, m, d] = evt.startDate.split('-').map(Number);
                                                setViewingDay(new Date(y, m - 1, d));
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredEvents.length === 0 && (
                                <div className="p-12 text-center text-gray-400">
                                    <p>No events found matching your filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* View Event Modal */}
                {/* Read Only Day Modal */}
                {viewingDay && (
                    <ReadOnlyDayScheduleModal
                        date={viewingDay}
                        events={viewingDay ? filteredEvents.filter(e => {
                            const dateStr = viewingDay.toISOString().split('T')[0];
                            if (e.endDate) return dateStr >= e.startDate && dateStr <= e.endDate;
                            return e.startDate === dateStr;
                        }) : []}
                        onClose={() => setViewingDay(null)}
                    />
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}
