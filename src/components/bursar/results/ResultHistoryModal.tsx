import React from 'react';
import { ResultArchive } from '@/lib/store';

interface ResultHistoryModalProps {
    archives: ResultArchive[];
    onClose: () => void;
    onView: (archive: ResultArchive) => void;
}

export function ResultHistoryModal({ archives, onClose, onView }: ResultHistoryModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Results History</h3>
                        <p className="text-sm text-gray-500">View snapshots of cleared results</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition">✕</button>
                </div>

                <div className="p-6 overflow-y-auto bg-gray-50/30 flex-1">
                    {archives.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                            <span className="text-4xl mb-2 opacity-50">📂</span>
                            <span className="italic">No history folders found.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {archives.map(archive => (
                                <button
                                    key={archive.id}
                                    onClick={() => onView(archive)}
                                    className="group flex flex-col items-center p-4 border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 rounded-xl transition shadow-sm hover:shadow-md text-center"
                                >
                                    <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-200">📂</div>
                                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 w-full break-words leading-tight min-h-[2.5rem] flex items-center justify-center">
                                        {archive.name}
                                    </h4>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                        {new Date(archive.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        {archive.data.results.length} Entries
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
