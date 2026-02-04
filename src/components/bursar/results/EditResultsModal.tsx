"use client";
import React, { useState, useEffect } from 'react';
import { useSchoolData, EnrolledStudent, ResultPageConfig } from '@/lib/store';

interface EditResultsModalProps {
    student: EnrolledStudent;
    pageConfig: ResultPageConfig;
    onClose: () => void;
    readOnly?: boolean;
}

export const EditResultsModal: React.FC<EditResultsModalProps> = ({ student, pageConfig, onClose, readOnly }) => {
    const { studentResults, saveStudentResult, deleteStudentResult, courseUnits, studentPageSummaries, saveStudentPageSummary } = useSchoolData();

    const [marksForm, setMarksForm] = useState<Record<string, string>>({});
    const [overallScore, setOverallScore] = useState('');
    const [isViewMode, setIsViewMode] = useState(true);
    const [isDirty, setIsDirty] = useState(false); // Bug #28: Track unsaved changes

    // Derived Data
    const courseUnitsOnPage = React.useMemo(() => {
        return courseUnits.filter(cu => pageConfig.courseUnitIds.includes(cu.id));
    }, [pageConfig, courseUnits]);

    // Locked State (Controlled by parent via readOnly prop)
    const isLocked = !!readOnly;

    // Load Data on Mount
    useEffect(() => {
        // Load marks
        const validCUs = pageConfig.courseUnitIds || [];
        const initialMarks: Record<string, string> = {};
        validCUs.forEach(cuId => {
            // Updated: Find result specific to this page config
            const res = studentResults.find(r =>
                r.studentId === student.id &&
                r.courseUnitId === cuId &&
                r.pageConfigId === pageConfig.id
            );
            if (res) initialMarks[cuId] = res.marks.toString();
        });
        setMarksForm(initialMarks);

        // Load Overall Score
        const summary = studentPageSummaries.find(s => s.studentId === student.id && s.pageConfigId === pageConfig.id);
        setOverallScore(summary ? summary.overallScore : '');
    }, [student.id, pageConfig, studentResults, studentPageSummaries]);

    // Bug #28: Handle Close with warning
    const handleClose = () => {
        if (isDirty && !isViewMode) {
            if (!confirm("⚠️ You have unsaved changes. Are you sure you want to close?")) return;
        }
        onClose();
    };

    const validateMark = (mark: string, scheme: string): boolean => {
        if (!mark) return true;
        if (scheme === 'letter') {
            return /^[A-Z][+-]?$/.test(mark);
        }
        const num = parseFloat(mark);
        if (isNaN(num)) return false;
        if (scheme === 'number') return num >= 0 && num <= 10;
        return num >= 0 && num <= 100;
    };



    const handleSaveResults = () => {
        let hasError = false;
        const scheme = pageConfig.markingScheme || 'percentage';

        // Validate Overall Score
        const overallSys = pageConfig.overallScoreSystem;
        if (overallScore && overallSys) {
            const val = parseFloat(overallScore);
            if (overallSys === 'gpa' && (isNaN(val) || val < 0 || val > 5.0)) {
                alert("Overall GPA must be between 0.0 and 5.0");
                return;
            }
            if (overallSys === 'average' && (isNaN(val) || val < 0 || val > 100)) {
                alert("Overall Average must be between 0 and 100");
                return;
            }
        }

        // Validate Marks
        Object.entries(marksForm).forEach(([cuId, markStr]) => {
            if (markStr.trim()) {
                if (!validateMark(markStr, scheme)) {
                    hasError = true;
                }
            }
        });

        if (hasError) {
            alert(`Some marks are invalid for the '${scheme}' grading scheme. Please fix fields highlighted in red.`);
            return;
        }

        // Save Course Unit Marks
        Object.entries(marksForm).forEach(([cuId, markStr]) => {
            // Handle Empty -> Delete
            if (!markStr.trim()) {
                deleteStudentResult(student.id, cuId, pageConfig.id); // Bug #26: Pass pageConfigId
                return;
            }

            let finalMarks: string | number = markStr;
            if (scheme === 'percentage' || scheme === 'number') {
                finalMarks = parseFloat(markStr);
            }

            const existing = studentResults.find(r =>
                r.studentId === student.id &&
                r.courseUnitId === cuId &&
                r.pageConfigId === pageConfig.id
            );
            const payload = {
                id: existing ? existing.id : `res_${Date.now()}_${Math.random()}`,
                studentId: student.id,
                courseUnitId: cuId,
                pageConfigId: pageConfig.id, // Linked to Page
                marks: finalMarks,
                isPosted: false,
                updatedAt: new Date().toISOString()
            };
            saveStudentResult(payload);
        });

        // Save Overall Score
        saveStudentPageSummary({
            id: `summary_${student.id}_${pageConfig.id}`,
            studentId: student.id,
            pageConfigId: pageConfig.id,
            overallScore: overallScore,
            updatedAt: new Date().toISOString()
        });

        setIsDirty(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{pageConfig.name} Entry</h3>
                        <p className="text-sm text-gray-500">{student.name} - {student.payCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isViewMode ? (
                            isLocked ? (
                                <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2 cursor-not-allowed" title="Results from previous semesters are locked">
                                    🔒 Locked
                                </span>
                            ) : (
                                <button
                                    onClick={() => setIsViewMode(false)}
                                    className="px-3 py-1.5 text-xs font-medium bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition shadow-sm flex items-center gap-2"
                                >
                                    ✏️ Edit Results
                                </button>
                            )
                        ) : (
                            <button
                                onClick={handleClose}
                                className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                            >
                                Cancel Edit
                            </button>
                        )}
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">

                    {/* Overall Score Section */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-2">
                            {pageConfig.overallScoreSystem === 'gpa' ? "GPA" :
                                pageConfig.overallScoreSystem === 'average' ? "Average" :
                                    pageConfig.overallScoreSystem === 'points' ? "Points" :
                                        pageConfig.overallScoreSystem === 'other' ? "Overall Score" :
                                            "Overall Academic Score / GPA"}
                        </label>
                        <input
                            type={['gpa', 'average', 'points'].includes(pageConfig.overallScoreSystem || '') ? "number" : "text"}
                            step={['gpa', 'average'].includes(pageConfig.overallScoreSystem || '') ? "0.01" : "1"}
                            min="0"
                            max={
                                pageConfig.overallScoreSystem === 'gpa' ? 5 :
                                    pageConfig.overallScoreSystem === 'average' ? 100 :
                                        undefined
                            }
                            readOnly={isViewMode}
                            list="overall-score-suggestions"
                            placeholder={
                                pageConfig.overallScoreSystem === 'gpa' ? "e.g. 4.50" :
                                    pageConfig.overallScoreSystem === 'average' ? "e.g. 85.5" :
                                        pageConfig.overallScoreSystem === 'points' ? "e.g. 20" :
                                            "e.g. Distinction"
                            }
                            className={`w-full p-3 border rounded-lg focus:ring-2 outline-none transition-all font-mono text-lg ${isViewMode ? 'bg-transparent border-transparent px-0 font-bold text-gray-800' : 'bg-white border-blue-200 focus:ring-blue-100 focus:border-blue-400 text-gray-900'}`}
                            value={overallScore}
                            onChange={e => {
                                setOverallScore(e.target.value);
                                setIsDirty(true);
                            }}
                        />
                        {pageConfig.overallScoreSystem === 'other' && (
                            <datalist id="overall-score-suggestions">
                                <option value="Distinction" />
                                <option value="Merit" />
                                <option value="Credit" />
                                <option value="Pass" />
                                <option value="Fail" />
                                <option value="First Class" />
                                <option value="Second Class Upper" />
                                <option value="Second Class Lower" />
                                <option value="Third Class" />
                                <option value="Excellent" />
                                <option value="Very Good" />
                                <option value="Good" />
                                <option value="Satisfactory" />
                                <option value="Unsatisfactory" />
                                <option value="Competent" />
                                <option value="Not Yet Competent" />
                                <option value="Completed" />
                                <option value="Incomplete" />
                                <option value="Deferred" />
                                <option value="Supplementary Required" />
                                <option value="Proceed" />
                                <option value="Proceed on Probation" />
                                <option value="Repeat Year" />
                                <option value="Discontinued" />
                            </datalist>
                        )}
                        {pageConfig.overallScoreSystem === 'gpa' && (
                            <p className="text-xs text-blue-400 mt-1">Enter a value between 0.0 and 5.0</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {courseUnitsOnPage.map(cu => (
                            <div key={cu.id} className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    {cu.code} - {cu.name}
                                    <span className="ml-2 text-xs font-normal text-gray-400">({cu.creditUnits} CU)</span>
                                </label>
                                {isViewMode ? (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 font-mono text-gray-800 font-medium">
                                        {marksForm[cu.id] || <span className="text-gray-400 italic">Not set</span>}
                                    </div>
                                ) : (
                                    <input
                                        type={pageConfig.markingScheme === 'letter' ? 'text' : 'number'}
                                        min="0"
                                        max={pageConfig.markingScheme === 'number' ? 10 : 100}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 outline-none transition-all text-gray-900 font-mono ${marksForm[cu.id] && !validateMark(marksForm[cu.id], pageConfig.markingScheme || 'percentage')
                                            ? 'border-red-500 focus:ring-red-200 focus:border-red-500 bg-red-50'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        placeholder={
                                            pageConfig.markingScheme === 'letter' ? "Grade (A-Z)" :
                                                pageConfig.markingScheme === 'number' ? "Score (0-100)" :
                                                    "Percentage (0-100)"
                                        }
                                        value={marksForm[cu.id] || ''}
                                        onChange={e => {
                                            setMarksForm(prev => ({ ...prev, [cu.id]: e.target.value.toUpperCase() }));
                                            setIsDirty(true);
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    {courseUnitsOnPage.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No course units configured for this page.</p>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        {isViewMode ? 'Close' : 'Cancel'}
                    </button>
                    {!isViewMode && (
                        <button
                            onClick={handleSaveResults}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                        >
                            Save Results
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
