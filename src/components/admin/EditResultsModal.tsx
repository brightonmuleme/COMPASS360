
import React from 'react';
import { EnrolledStudent, ResultPageConfig } from '@/lib/store';

interface EditResultsModalProps {
    student: EnrolledStudent;
    pageConfig: ResultPageConfig;
    onClose: () => void;
    readOnly?: boolean;
}

export const EditResultsModal: React.FC<EditResultsModalProps> = ({
    student,
    pageConfig,
    onClose,
    readOnly = false
}) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{pageConfig.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-4 border rounded bg-gray-50 mb-4">
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.payCode}</p>
                </div>

                <div className="py-8 text-center text-gray-500">
                    <p>Results details not available in this preview.</p>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
