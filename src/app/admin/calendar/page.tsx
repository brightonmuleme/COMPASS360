"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, CalendarEvent } from '@/lib/store';
import { CalendarEventModal } from '@/components/bursar/calendar/CalendarEventModal';
import { DayScheduleModal } from '@/components/bursar/calendar/DayScheduleModal';
import MasterTimetable from '@/components/bursar/calendar/MasterTimetable';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function CalendarPage() {
    const { calendarEvents: events, addCalendarEvent: addEvent, updateCalendarEvent: updateEvent, deleteCalendarEvent: deleteEvent } = useSchoolData();

    // View State
    const [viewMode, setViewMode] = useState<'calendar' | 'timetable'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Selected Date for Day Modal
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Event Modal State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [targetDateForNewEvent, setTargetDateForNewEvent] = useState<string>('');


    // --- CALENDAR LOGIC ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    };

    const calendarGrid = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days: (number | null)[] = Array(firstDay).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // --- EVENT HANDLERS ---
    const handleDayClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(date);
    };

    const handleAddEvent = (dateString?: string) => {
        setEditingEvent(null);
        setTargetDateForNewEvent(dateString || new Date().toISOString().split('T')[0]);
        setIsEventModalOpen(true);
        // If triggered from DayModal, we keep DayModal open or close it? 
        // Typically close DayModal or stack them. Let's stack/close based on UX.
        // For simplicity, we can close DayModal to focus on Event creation
        // setSelectedDate(null); // Optional: close day modal
    };

    const handleEditEvent = (event: CalendarEvent) => {
        setEditingEvent(event);
        setIsEventModalOpen(true);
        // setSelectedDate(null);
    };

    const handleDeleteEvent = (id: string) => {
        if (confirm("Are you sure you want to delete this event?")) {
            deleteEvent(id);
            // Refresh logic handled by store
        }
    };

    const handleSaveEvent = (event: CalendarEvent) => {
        if (editingEvent) {
            updateEvent(event);
        } else {
            addEvent(event);
        }
        setIsEventModalOpen(false);
    };

    // Filter events for selected day (Memoized)
    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = selectedDate.toISOString().split('T')[0];
        return events.filter(e => {
            if (e.startDate === dateStr) return true;
            // Multi-day check
            if (e.endDate && e.startDate <= dateStr && e.endDate >= dateStr) return true;
            return false;
        });
    }, [selectedDate, events]);

    // get events for a specific day number in current month
    const getEventsForDay = (day: number) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        // Simplified check
        return events.filter(e => e.startDate === dateStr || (e.endDate && e.startDate <= dateStr && e.endDate >= dateStr));
    };

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in relative min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">School Calendar</h1>
                    <p className="text-slate-400 mt-1">Manage academic schedules, events, and timetables.</p>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <CalendarIcon size={16} />
                        Events & Schedule
                    </button>
                    <button
                        onClick={() => setViewMode('timetable')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'timetable' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Clock size={16} />
                        Master Timetable
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            {viewMode === 'calendar' ? (
                <div className="space-y-6">
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-xl">
                        <div className="flex items-center gap-4">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full text-white transition"><ChevronLeft /></button>
                            <h2 className="text-xl font-bold text-white w-48 text-center">
                                {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full text-white transition"><ChevronRight /></button>
                        </div>
                        <button
                            onClick={() => handleAddEvent()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
                        >
                            + Add Event
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-slate-900 p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                        {calendarGrid.map((day, idx) => (
                            <div
                                key={idx}
                                onClick={() => day && handleDayClick(day)}
                                className={`min-h-[120px] bg-slate-950/80 p-3 transition-colors relative border-t border-l border-white/5
                                    ${day ? 'hover:bg-slate-900 cursor-pointer group' : 'bg-slate-950/40'}
                                    ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() ? 'bg-blue-900/10' : ''}
                                `}
                            >
                                {day && (
                                    <>
                                        <span className={`text-sm font-bold ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-blue-500/30' : 'text-slate-400 group-hover:text-white'}`}>
                                            {day}
                                        </span>
                                        <div className="mt-2 space-y-1">
                                            {getEventsForDay(day).slice(0, 3).map((evt) => (
                                                <div
                                                    key={evt.id}
                                                    className={`text-[10px] truncate px-1.5 py-0.5 rounded border border-l-2
                                                        ${evt.type === 'academic' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 border-l-blue-500' :
                                                            evt.type === 'activity' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30 border-l-orange-500' :
                                                                'bg-purple-500/10 text-purple-300 border-purple-500/30 border-l-purple-500'}
                                                    `}
                                                    title={evt.title}
                                                >
                                                    {evt.title}
                                                </div>
                                            ))}
                                            {getEventsForDay(day).length > 3 && (
                                                <div className="text-[9px] text-slate-500 pl-1">
                                                    +{getEventsForDay(day).length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-xl animate-scale-in origin-top">
                    {/* Render Master Timetable (Black text context, so wrap in white or adjust component) */}
                    {/* MasterTimetable is designed for white background (admin style). We wrap it in a white container. */}
                    <MasterTimetable />
                </div>
            )}

            {/* Modals */}
            <CalendarEventModal
                isOpen={isEventModalOpen}
                event={editingEvent}
                initialDate={targetDateForNewEvent}
                onClose={() => setIsEventModalOpen(false)}
                onSave={handleSaveEvent}
            />

            {selectedDate && (
                <DayScheduleModal
                    date={selectedDate}
                    events={selectedDayEvents}
                    onClose={() => setSelectedDate(null)}
                    onEditEvent={handleEditEvent}
                    onAddEvent={handleAddEvent}
                    onDeleteEvent={handleDeleteEvent}
                />
            )}
        </div>
    );
}
