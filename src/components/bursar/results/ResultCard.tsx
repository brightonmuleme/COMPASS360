"use client";

import React, { useMemo } from 'react';
import { useSchoolData, EnrolledStudent, ResultPageConfig } from '@/lib/store';

interface ResultCardProps {
    student: EnrolledStudent;
    config: ResultPageConfig;
    onClick: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ student, config, onClick }) => {
    const { studentResults, courseUnits, studentPageSummaries } = useSchoolData();

    // 1. Get Overall Score
    const overallScore = useMemo(() => {
        const summary = studentPageSummaries.find(s => s.studentId === student.id && s.pageConfigId === config.id);
        return summary ? summary.overallScore : null;
    }, [studentPageSummaries, student.id, config.id]);

    // 2. Get Course Units for this Page
    const pageCourseUnits = useMemo(() => {
        return courseUnits.filter(cu => config.courseUnitIds.includes(cu.id));
    }, [courseUnits, config.courseUnitIds]);

    // 3. Get Marks for these Course Units
    const marksData = useMemo(() => {
        return pageCourseUnits.map(cu => {
            const res = studentResults.find(r =>
                r.studentId === student.id &&
                r.courseUnitId === cu.id &&
                r.pageConfigId === config.id
            );
            return {
                code: cu.code,
                name: cu.name,
                mark: res ? res.marks : null
            };
        });
    }, [pageCourseUnits, studentResults, student.id, config.id]);

    const hasData = overallScore || marksData.some(m => m.mark !== null);

    return (
        <button
            onClick={onClick}
            className="flex flex-col text-left bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all overflow-hidden group w-full"
        >
            {/* Header: Page Name & Overall Score */}
            <div className={`w-full p-4 border-b border-gray-100 ${hasData ? 'bg-blue-50/30' : 'bg-gray-50/50'}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800 text-sm">{config.name}</span>
                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">{config.level}</span>
                </div>

                {/* Overall Score Display */}
                <div className="mt-2">
                    {overallScore ? (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-600 tracking-tight">{overallScore}</span>
                            <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                                {config.overallScoreSystem === 'gpa' ? "GPA" :
                                    config.overallScoreSystem === 'average' ? "Avg" :
                                        "Score"}
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400 italic">No overall score</span>
                    )}
                </div>
            </div>

            {/* Body: Course Unit Breakdown */}
            <div className="w-full p-4 space-y-2 min-h-[100px]">
                {marksData.length > 0 ? (
                    <div className="space-y-1.5">
                        {marksData.map((item, idx) => {
                            const isFail = (config.passMark !== undefined &&
                                ['percentage', 'number'].includes(config.markingScheme || '') &&
                                item.mark !== null &&
                                !isNaN(Number(item.mark)) &&
                                Number(item.mark) < config.passMark) ||
                                (item.mark === 'F' || item.mark === 'D'); // Bug #25: Letter grade fail check

                            return (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600 truncate max-w-[70%]" title={item.name}>
                                        {item.code}
                                    </span>
                                    <span className={`font-mono font-medium ${isFail ? 'text-red-600 font-bold' : item.mark !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                        {item.mark !== null ? item.mark : '-'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic text-center py-4">No subjects configured</p>
                )}
            </div>

            {/* Footer: Action Hint */}
            <div className="w-full py-2 px-4 bg-gray-50 border-t border-gray-100 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                    {hasData ? 'Click to View Full Result' : 'Click to Enter Results'}
                </span>
            </div>
        </button>
    );
};
