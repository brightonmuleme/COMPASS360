import React from 'react';
import { PostHistoryItem, EnrolledStudent, FinancialSettings, determineStudentStatus } from '@/lib/store';

interface PostHistoryModalProps {
    history: PostHistoryItem[];
    allStudents: EnrolledStudent[];
    financialSettings: FinancialSettings;
    onClose: () => void;
    onRevert: (item: PostHistoryItem) => void;
}

export const PostHistoryModal: React.FC<PostHistoryModalProps> = ({ history, allStudents, financialSettings, onClose, onRevert }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">Posting History</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-0 max-h-[70vh] overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            No history available yet.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Date Posted</th>
                                    <th className="p-4 text-center">Student Count</th>
                                    <th className="p-4">Details</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map(item => {
                                    // Determine Status for Single Student Batches
                                    let statusNode = <span className="text-gray-400 italic">Batch</span>;
                                    if (item.students.length === 1) {
                                        const studentName = item.students[0];
                                        const student = allStudents.find(s => s.name === studentName);
                                        if (student) {
                                            const status = determineStudentStatus(student, financialSettings);
                                            const statusColors = {
                                                'cleared': 'bg-green-100 text-green-700 border-green-200',
                                                'probation': 'bg-orange-100 text-orange-700 border-orange-200',
                                                'defaulter': 'bg-red-100 text-red-700 border-red-200'
                                            };
                                            statusNode = (
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {status.toUpperCase()}
                                                </span>
                                            );
                                        } else {
                                            statusNode = <span className="text-gray-400 italic">Unknown</span>;
                                        }
                                    }

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                {statusNode}
                                            </td>
                                            <td className="p-4 text-gray-800">
                                                {new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/50 rounded">{item.count}</td>
                                            <td className="p-4 text-gray-500 truncate max-w-xs" title={item.students.join(', ')}>
                                                <span className="font-semibold text-gray-700">{item.pageName}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                {item.students.slice(0, 3).join(', ')} {item.students.length > 3 && `+${item.students.length - 3} more`}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => onRevert(item)}
                                                    className="text-red-600 hover:text-red-800 text-xs font-medium hover:underline bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition"
                                                >
                                                    Revert
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
