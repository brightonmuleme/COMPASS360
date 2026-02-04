import React from 'react';
import { EnrolledStudent } from '@/lib/store';

interface PostPreviewModalProps {
    students: EnrolledStudent[];
    pageName: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const PostPreviewModal: React.FC<PostPreviewModalProps> = ({ students, pageName, onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                    <h3 className="text-xl font-bold text-gray-800">Confirm Grading Post</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-4">
                        You are about to post results for <span className="font-bold text-gray-900">{students.length} students</span> to the <span className="font-bold text-blue-600">{pageName}</span> board.
                    </p>
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-6">
                        ⚠️ Posted results will be visible to students instantaneously. They remain editable by administrators.
                    </p>

                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg bg-gray-50 p-2 mb-6">
                        <ul className="space-y-1">
                            {students.map(s => (
                                <li key={s.id} className="text-sm text-gray-700 flex justify-between px-2 py-1 hover:bg-white rounded">
                                    <span>{s.name}</span>
                                    <span className="font-mono text-gray-500 text-xs">{s.payCode}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md hover:shadow-lg transition-transform transform active:scale-95"
                        >
                            Confirm Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
