"use client";
import React from 'react';
import { useSchoolData, CalendarEvent, EventType } from '@/lib/store';

interface ReadOnlyDayScheduleModalProps {
    date: Date | null;
    events: CalendarEvent[];
    onClose: () => void;
}

export function ReadOnlyDayScheduleModal({ date, events, onClose }: ReadOnlyDayScheduleModalProps) {
    const { programmes } = useSchoolData();

    if (!date) return null;

    const formattedDate = date.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
    });

    const getIcon = (type: EventType) => {
        switch (type) {
            case 'academic': return '📖';
            case 'administrative': return '💼';
            case 'activity': return '⚽';
            default: return '📅';
        }
    };

    const resolveProgName = (id: string) => {
        const prog = programmes.find(p => p.id === id);
        return prog ? prog.code : id; // Use code for brevity
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 pb-2 bg-white z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight leading-none">
                                {date.getDate()} {date.toLocaleDateString('default', { month: 'long' })}
                            </h2>
                            <p className="text-green-600 font-medium text-sm mt-1">{date.getFullYear()} ›</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Week Strip Mock (Static for Today's View context, but purely visual decoration based on user request) */}
                    <div className="flex justify-between text-center pb-4 border-b border-gray-100 overflow-x-auto gap-2">
                        {[-2, -1, 0, 1, 2].map(offset => {
                            const d = new Date(date);
                            d.setDate(d.getDate() + offset);
                            const isSelected = offset === 0;
                            return (
                                <div key={offset} className={`flex flex-col items-center min-w-[3rem] ${isSelected ? 'opacity-100' : 'opacity-40'}`}>
                                    <span className="text-xs font-bold text-gray-500 uppercase">{d.toLocaleDateString('default', { weekday: 'short' })}</span>
                                    <span className={`text-sm font-bold mt-1 w-8 h-8 flex items-center justify-center rounded-full ${isSelected ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'text-gray-700'}`}>
                                        {d.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[3.5rem] top-0 bottom-0 w-0.5 bg-gray-100" />

                    {sortedEvents.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center justify-center opacity-50 mt-10">
                            <span className="text-4xl mb-4 grayscale">🌴</span>
                            <p className="text-gray-400 font-medium">Relax. No slots booked.</p>
                            <p className="text-xs text-gray-300 mt-2">Time to plan a breather.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 mt-4">
                            {sortedEvents.map((evt, idx) => (
                                <div key={evt.id} className="relative flex gap-6">
                                    {/* Time Column */}
                                    <div className="w-10 text-right shrink-0 pt-1">
                                        <span className="text-xs font-bold text-gray-400 block">{evt.startTime || 'All Day'}</span>
                                        {evt.endTime && <span className="text-[10px] text-gray-300 block">{evt.endTime}</span>}
                                    </div>

                                    {/* Timeline Node & Content */}
                                    <div className="flex-1 relative pb-2 group">
                                        {/* Icon Node */}
                                        <div className={`absolute -left-[1.35rem] top-1 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-sm z-10 ${evt.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                            {getIcon(evt.type)}
                                        </div>

                                        {/* Card */}
                                        <div className="bg-white rounded-xl hover:bg-gray-50 transition p-3 -mt-2 -ml-2 pl-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm">{evt.title}</h3>
                                                    {/* Target Info (Requested) */}
                                                    {(evt.visibility === 'specific' && (evt.targetProgrammes?.length || evt.targetLevels?.length)) && (
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            {evt.targetProgrammes?.map(pid => (
                                                                <span key={pid} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                                    {resolveProgName(pid)}
                                                                </span>
                                                            ))}
                                                            {evt.targetLevels?.map(lvl => (
                                                                <span key={lvl} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100">
                                                                    {lvl}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Check/Status */}
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${evt.status === 'draft' ? 'border-amber-400' : 'border-green-500'}`}>
                                                    {evt.status !== 'draft' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{evt.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Action REMOVED */}
                <div className="p-4 bg-white border-t border-gray-50 z-20 text-center text-xs text-gray-400">
                    View Only • Changes disabled
                </div>
            </div>
        </div>
    );
}
