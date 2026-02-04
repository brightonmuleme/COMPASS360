import React, { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, EventType, EventVisibility, useSchoolData } from '@/lib/store';

interface CalendarEventModalProps {
    event?: CalendarEvent | null; // If null, creating new
    initialDate?: string;
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({ event, initialDate, isOpen, onClose, onSave }) => {
    const { programmes } = useSchoolData();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [type, setType] = useState<EventType>('academic');
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [visibility, setVisibility] = useState<EventVisibility>('all');
    const [targetProgrammes, setTargetProgrammes] = useState<string[]>([]);
    const [targetLevels, setTargetLevels] = useState<string[]>([]);

    // Get levels specific to selected programmes (Moved to top level to avoid hook order errors)
    const availableLevels = useMemo(() => {
        if (!targetProgrammes || !Array.isArray(targetProgrammes) || targetProgrammes.length === 0) return [];
        const relevantProgrammes = programmes.filter(p => targetProgrammes.includes(p.id));
        return Array.from(new Set(relevantProgrammes.flatMap(p => p.levels || [])));
    }, [programmes, targetProgrammes]);

    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setDescription(event.description);
            setStartDate(event.startDate);
            setEndDate(event.endDate || '');
            setStartTime(event.startTime || '');
            setEndTime(event.endTime || '');
            setType(event.type);
            setStatus(event.status);
            setVisibility(event.visibility);
            setTargetProgrammes(event.targetProgrammes || []);
            setTargetLevels(event.targetLevels || []);
        } else {
            // Defaults for new event
            setTitle('');
            setDescription('');
            setStartDate(initialDate || new Date().toISOString().split('T')[0]);
            setEndDate('');
            setStartTime('');
            setEndTime('');
            setType('academic');
            setStatus('draft');
            setVisibility('all');
            setTargetProgrammes([]);
            setTargetLevels([]);
        }
    }, [event, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Fix Risk D: Stop "Zombie Records" (Visibility Void)
        if (visibility === 'specific' && targetProgrammes.length === 0 && targetLevels.length === 0) {
            alert("Please select at least one Programme or Level for Specific Visibility.");
            return;
        }

        const newEvent: CalendarEvent = {
            id: event?.id || `evt_${Date.now()}`,
            title,
            description,
            startDate,
            endDate: endDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            type,
            status,
            visibility,
            targetProgrammes: visibility === 'specific' ? targetProgrammes : undefined,
            targetLevels: visibility === 'specific' ? targetLevels : undefined,
            createdAt: event?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        onSave(newEvent);
        onClose();
    };

    // Helper for multi-select toggles
    const toggleSelection = (list: string[], item: string, setter: (val: string[]) => void) => {
        if (list.includes(item)) {
            setter(list.filter(i => i !== item));
        } else {
            setter([...list, item]);
        }
    };

    // Helper for multi-select toggles

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {event ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-1">Event Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white"
                                placeholder="e.g. End of Semester Exams"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Event Type</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as EventType)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                            >
                                <option value="academic">Academic</option>
                                <option value="administrative">Administrative</option>
                                <option value="activity">Activity</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Start Time (Optional)</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">End Time (Optional)</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 bg-white"
                            placeholder="Details about the event..."
                        />
                    </div>

                    {/* Visibility Settings */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Visibility Settings</label>

                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    checked={visibility === 'all'}
                                    onChange={() => setVisibility('all')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-700">All Students</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    checked={visibility === 'specific'}
                                    onChange={() => setVisibility('specific')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-700">Specific Groups</span>
                            </label>
                        </div>

                        {visibility === 'specific' && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Programmes</span>
                                    <div className="flex flex-wrap gap-2">
                                        {programmes.map(prog => (
                                            <button
                                                key={prog.id}
                                                type="button"
                                                onClick={() => toggleSelection(targetProgrammes, prog.id, setTargetProgrammes)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${targetProgrammes.includes(prog.id)
                                                    ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                {prog.code}
                                            </button>
                                        ))}
                                    </div>
                                    {targetProgrammes.length === 0 && <p className="text-xs text-orange-500 mt-1">⚠ No programme selected (Effective for NO ONE)</p>}
                                </div>

                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Levels</span>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                        {availableLevels.length === 0 && targetProgrammes.length > 0 && <p className="text-xs text-gray-400">No levels found for selected programmes.</p>}
                                        {availableLevels.length === 0 && targetProgrammes.length === 0 && <p className="text-xs text-gray-400">Select a programme first to see levels.</p>}
                                        {availableLevels.map(lvl => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => toggleSelection(targetLevels, lvl, setTargetLevels)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${targetLevels.includes(lvl)
                                                    ? 'bg-purple-100 border-purple-200 text-purple-700 font-medium'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={status === 'published'}
                                onChange={e => setStatus(e.target.checked ? 'published' : 'draft')}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                            />
                            <span className={`text-sm font-medium ${status === 'published' ? 'text-green-700' : 'text-gray-500'}`}>
                                {status === 'published' ? 'Published (Visible)' : 'Draft (Hidden)'}
                            </span>
                        </label>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition transform hover:scale-105"
                            >
                                Save Event
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
