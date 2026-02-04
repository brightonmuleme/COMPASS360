
import React from 'react';
import { EnrolledStudent, ResultPageConfig } from '@/lib/store';

interface ResultCardProps {
    student?: EnrolledStudent;
    config: ResultPageConfig;
    onClick?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
    student,
    config,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-200">{config.name}</h3>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                    {config.level}
                </span>
            </div>

            <div className="text-sm text-gray-400 mb-4">
                Programme: {config.programmeId}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>View Details</span>
                <span>→</span>
            </div>
        </div>
    );
};
