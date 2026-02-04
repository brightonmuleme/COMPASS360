"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSchoolData, Programme, ResultPageConfig, determineStudentStatus, EnrolledStudent } from '@/lib/store';
import { StatusRing } from '@/components/StatusRing';
import { EditResultsModal } from '@/components/bursar/results/EditResultsModal';
import { PostPreviewModal } from '@/components/bursar/results/PostPreviewModal';
import { PostHistoryModal } from '@/components/bursar/results/PostHistoryModal';
import { ResultHistoryModal } from '@/components/bursar/results/ResultHistoryModal';
import { ResultArchive } from '@/lib/store';

export default function BursarResultsPage() {
    const {
        programmes, resultPageConfigs, courseUnits, updateResultPageConfig, addResultPageConfig, deleteResultPageConfig,
        students, studentResults, financialSettings, deleteStudentResult, addCourseUnit, deleteCourseUnit,
        studentPageSummaries, performDeepRepair, saveStudentPageSummary, postHistory, addPostHistory, deletePostHistory,
        addResultArchive, deleteResultsByPageConfig, resultArchives
    } = useSchoolData();
    const [expandedProgramme, setExpandedProgramme] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<{ progId: string, level: string } | null>(null);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Edit Results State
    const [editingResultStudent, setEditingResultStudent] = useState<EnrolledStudent | null>(null);

    // Bulk Selection State
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [filterResultStatus, setFilterResultStatus] = useState<'all' | 'failures' | 'missing'>('all');
    const [filterResultSubjectId, setFilterResultSubjectId] = useState<string>('any');

    // Post & History State
    const [isPostPreviewOpen, setIsPostPreviewOpen] = useState(false);
    const [isPostHistoryOpen, setIsPostHistoryOpen] = useState(false);

    // Result History State
    const [isResultHistoryOpen, setIsResultHistoryOpen] = useState(false);
    const [viewingArchive, setViewingArchive] = useState<ResultArchive | null>(null);

    // Clear/Archive Modal State
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [archiveReason, setArchiveReason] = useState('');

    // Effective Data (Live or Archived)
    const effectiveStudentResults = useMemo(() => viewingArchive ? viewingArchive.data.results : studentResults, [viewingArchive, studentResults]);
    const effectiveStudentPageSummaries = useMemo(() => viewingArchive ? viewingArchive.data.summaries : studentPageSummaries, [viewingArchive, studentPageSummaries]);
    const effectivePostHistory = useMemo(() => viewingArchive ? viewingArchive.data.postHistory : postHistory, [viewingArchive, postHistory]);


    // Column Visibility
    const [visibleColumns, setVisibleColumns] = useState({
        details: true,
        payCode: true,
        marks: true,
        overall: true,
        status: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // ... handleAddPage, bulk handlers, validateMark (might still need it? No, modal has it), handleEditClick (simplified) ...


    const handleAddPage = () => {
        if (!selectedLevel) return;
        const name = prompt("Enter new page name (e.g., 'Retakes'):");
        if (name) {
            const newDetail = {
                id: `rpc_${Date.now()} `,
                programmeId: selectedLevel.progId,
                level: selectedLevel.level,
                name,
                courseUnitIds: [],
                markingScheme: 'percentage' as const,
                overallScoreSystem: 'gpa' as const
            };
            addResultPageConfig(newDetail);
            setActivePageId(newDetail.id);
        }
    };

    // Bulk Handlers
    const toggleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const toggleSelectStudent = (id: number) => {
        if (selectedStudentIds.includes(id)) {
            setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
        } else {
            setSelectedStudentIds(prev => [...prev, id]);
        }
    };

    const handleBulkPostClick = () => {
        setIsPostPreviewOpen(true);
    };

    const confirmPostResults = () => {
        if (!activePageConfig) return;

        // Logic to mark results as posted
        const allSelected = students.filter(s => selectedStudentIds.includes(s.id));

        // Filter out "Not Synced" (No Pay Code or explicitly ignored OR no financial data)
        const validStudents = allSelected.filter(s => {
            const isFinanciallyEmpty = (!s.totalFees || s.totalFees === 0) && (!s.balance || s.balance === 0);
            const hasPayCode = s.payCode && s.payCode !== 'NOT_SYNCED';
            return hasPayCode && !isFinanciallyEmpty;
        });
        const rejectedCount = allSelected.length - validStudents.length;

        if (validStudents.length === 0) {
            alert("None of the selected students can be posted because they are not synced (missing Pay Code).");
            setIsPostPreviewOpen(false);
            return;
        }

        if (rejectedCount > 0) {
            if (!confirm(`${rejectedCount} students are not synced and will be skipped. Continue posting for ${validStudents.length} students?`)) {
                return;
            }
        }

        // Update "Posted At" for valid students
        const timestamp = new Date().toISOString();

        validStudents.forEach(student => {
            const summary = studentPageSummaries.find(s => s.studentId === student.id && s.pageConfigId === activePageConfig.id);
            if (summary) {
                saveStudentPageSummary({
                    ...summary,
                    postedAt: timestamp
                });
            } else {
                // If no summary exists yet (only marks), create one? 
                // Usually summary exists if marks exist? Not always.
                // Create skeleton summary to track post
                saveStudentPageSummary({
                    id: `summary_${student.id}_${activePageConfig.id}`,
                    studentId: student.id,
                    pageConfigId: activePageConfig.id,
                    overallScore: '',
                    postedAt: timestamp,
                    updatedAt: timestamp
                });
            }
        });

        // Add to Global History
        addPostHistory({
            id: `batch_${Date.now()}`,
            date: timestamp,
            count: validStudents.length,
            students: validStudents.map(s => s.name),
            studentIds: validStudents.map(s => s.id),
            pageName: activePageConfig.name,
            pageConfigId: activePageConfig.id
        });

        alert(`Successfully posted results for ${validStudents.length} students.`);
        setSelectedStudentIds([]);
        setIsPostPreviewOpen(false);
    };

    const handleBulkClear = () => {
        if (confirm(`Are you sure you want to CLEAR results for ${selectedStudentIds.length} students? This will reset their marks but keep the students on the list.`)) {
            // Mock Clear
            selectedStudentIds.forEach(id => {
                // deleteStudentResult(id, 'ALL_FOR_PAGE') 
                // We don't have a bulk clear tool exposed yet, simulating:
                console.log("Clearing results for", id);
            });
            alert("Results cleared.");
            setSelectedStudentIds([]);
        }
    };

    const handleRevertPost = (item: any) => {
        if (!confirm(`Are you sure you want to REVERT this post? This will unpublish results for ${item.count} students.`)) {
            return;
        }

        // 1. Identify Students
        let targetStudentIds: number[] = item.studentIds || [];

        // Legacy Fallback: If no IDs, try to match names (riskier but needed for old mock data)
        if (targetStudentIds.length === 0 && item.students) {
            targetStudentIds = students
                .filter(s => item.students.includes(s.name))
                .map(s => s.id);
        }

        // 2. Identify Config
        // We need the config ID to find the summary.
        // If stored, use it. If not, check if it matches current active page.
        const configId = item.pageConfigId || (activePageConfig?.name === item.pageName ? activePageConfig?.id : null);

        if (!configId) {
            alert("Could not identify the specific Results Page for this history item. Revert failed.");
            return;
        }

        // 3. Unpublish (Remove postedAt)
        let updatedCount = 0;
        targetStudentIds.forEach(sid => {
            const summary = studentPageSummaries.find(s => s.studentId === sid && s.pageConfigId === configId);
            if (summary && summary.postedAt) {
                saveStudentPageSummary({
                    ...summary,
                    postedAt: undefined // Remove field
                });
                updatedCount++;
            }
        });

        // 4. Remove from History
        deletePostHistory(item.id);
        alert(`Successfully reverted results for ${updatedCount} students.`);
    };



    const handleClearPageResults = () => {
        if (!activePageConfig) return;
        setArchiveReason('');
        setIsClearModalOpen(true);
    };

    const confirmClearAndArchive = () => {
        if (!activePageConfig || !archiveReason) return;

        // Create Snapshot
        const resultsToArchive = studentResults.filter(r => r.pageConfigId === activePageConfig.id);
        const summariesToArchive = studentPageSummaries.filter(s => s.pageConfigId === activePageConfig.id);
        const historyToArchive = postHistory.filter(h => h.pageConfigId === activePageConfig.id);

        if (resultsToArchive.length === 0 && summariesToArchive.length === 0 && historyToArchive.length === 0) {
            alert("No results or history to clear.");
            setIsClearModalOpen(false);
            return;
        }

        const snapshot: ResultArchive = {
            id: `archive_${Date.now()}`,
            name: archiveReason,
            date: new Date().toISOString(),
            pageConfigId: activePageConfig.id,
            data: {
                results: resultsToArchive,
                summaries: summariesToArchive,
                postHistory: historyToArchive
            }
        };

        addResultArchive(snapshot);
        deleteResultsByPageConfig(activePageConfig.id);
        alert(`Results cleared and archived under '${archiveReason}'.`);
        setIsClearModalOpen(false);
    };

    const handleEditClick = (student: EnrolledStudent) => {
        if (viewingArchive) return; // Read-only mode
        setEditingResultStudent(student);
    };



    // Filter configs for selected level
    const availablePages = useMemo(() => {
        if (!selectedLevel) return [];
        return resultPageConfigs.filter(
            c => c.programmeId === selectedLevel.progId && c.level === selectedLevel.level
        );
    }, [selectedLevel, resultPageConfigs]);

    // Auto-seed Default Pages (Internals & Externals) if none exist
    useEffect(() => {
        if (!selectedLevel) return;

        // Case-insensitive check to confirm existence
        const hasInternals = availablePages.some(p => p.name.toLowerCase() === 'internals');
        const hasExternals = availablePages.some(p => p.name.toLowerCase() === 'externals');

        if (!hasInternals) {
            addResultPageConfig({
                id: `rpc_${Date.now()}_int`,
                programmeId: selectedLevel.progId,
                level: selectedLevel.level,
                name: 'Internals',
                courseUnitIds: [],
                isDefault: true,
                markingScheme: 'percentage' as const,
                overallScoreSystem: 'gpa' as const
            });
        }

        if (!hasExternals) {
            // Seed Externals (small delay to ensure unique ID if Date.now() is same)
            setTimeout(() => {
                addResultPageConfig({
                    id: `rpc_${Date.now()}_ext`,
                    programmeId: selectedLevel.progId,
                    level: selectedLevel.level,
                    name: 'Externals',
                    courseUnitIds: [],
                    isDefault: true,
                    markingScheme: 'percentage' as const,
                    overallScoreSystem: 'gpa' as const
                });
            }, 50);
        }
    }, [selectedLevel]); // Run only when level changes to avoid infinite loop with availablePages

    // Auto-select first page tab
    useEffect(() => {
        if (activePageId) return; // Don't override if already selected
        if (availablePages.length > 0) {
            setActivePageId(availablePages[0].id);
        }
    }, [availablePages, activePageId]);

    // Active page config
    const activePageConfig = useMemo(() => {
        if (!activePageId) return null;
        return resultPageConfigs.find(c => c.id === activePageId);
    }, [activePageId, resultPageConfigs]);

    // Dynamic Columns
    const courseUnitsOnPage = useMemo(() => {
        if (!activePageConfig) return [];
        return courseUnits.filter(cu => activePageConfig.courseUnitIds.includes(cu.id));
    }, [activePageConfig, courseUnits]);

    // --- PERFORMANCE OPTIMIZATION: Staged Filtering ---

    // 1. Filter by Programme & Level once (Static)
    const baseLevelStudents = useMemo(() => {
        if (!selectedLevel) return [];
        const prog = programmes.find(p => p.id === selectedLevel.progId);
        if (!prog) return [];

        const normalize = (str: string | undefined | null) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const pName = normalize(prog.name);
        const pCode = normalize(prog.code);
        const selLevel = normalize(selectedLevel.level);

        return students.filter(s => {
            const sProg = normalize(s.programme);
            const matchesProg = sProg.includes(pName) || pName.includes(sProg) || sProg.includes(pCode);

            const sLevel = normalize(s.level);
            const matchesLevel = sLevel.includes(selLevel) || selLevel.includes(sLevel);

            return matchesProg && matchesLevel;
        }).map(s => ({
            ...s,
            _searchKey: `${s.name.toLowerCase()} ${s.payCode.toLowerCase()}`
        }));
    }, [students, selectedLevel, programmes]);

    // 2. Filter by Search & Status (Dynamic)
    const filteredStudents = useMemo(() => {
        const lowerSearch = debouncedSearchTerm.toLowerCase();

        return baseLevelStudents.filter(s => {
            // Fast Search Check
            if (lowerSearch && !s._searchKey.includes(lowerSearch)) return false;

            // Status Filter
            if (filterStatus === 'not_synced') {
                const isFinanciallyEmpty = (!s.totalFees || s.totalFees === 0) && (!s.balance || s.balance === 0);
                if (!(isFinanciallyEmpty || !s.payCode || s.payCode === 'NOT_SYNCED')) return false;
            } else if (filterStatus !== 'all') {
                const status = determineStudentStatus(s, financialSettings);
                if (status !== filterStatus) return false;
            }

            // Result Status Filter
            if (filterResultStatus === 'failures' && activePageConfig?.passMark !== undefined) {
                const hasFailure = courseUnitsOnPage.some(cu => {
                    const res = effectiveStudentResults.find(r => r.studentId === s.id && r.courseUnitId === cu.id && r.pageConfigId === activePageConfig.id);
                    return res && !isNaN(Number(res.marks)) && Number(res.marks) < activePageConfig.passMark!;
                });
                if (!hasFailure) return false;
            }

            // Missing Marks Filter
            if (filterResultStatus === 'missing') {
                if (filterResultSubjectId === 'any') {
                    const hasMissing = courseUnitsOnPage.some(cu => {
                        const res = effectiveStudentResults.find(r => r.studentId === s.id && r.courseUnitId === cu.id && r.pageConfigId === activePageConfig?.id);
                        return !res || res.marks === '' || res.marks === null || res.marks === undefined;
                    });
                    if (!hasMissing) return false;
                } else {
                    const res = effectiveStudentResults.find(r => r.studentId === s.id && r.courseUnitId === filterResultSubjectId && r.pageConfigId === activePageConfig?.id);
                    if (res && res.marks !== '' && res.marks !== null && res.marks !== undefined) return false;
                }
            }

            return true;
        });
    }, [baseLevelStudents, debouncedSearchTerm, filterStatus, financialSettings, filterResultStatus, filterResultSubjectId, activePageConfig, courseUnitsOnPage, effectiveStudentResults]);

    // Config Modal State
    const [configName, setConfigName] = useState('');
    const [configCUIds, setConfigCUIds] = useState<string[]>([]);
    const [configMarkingSystem, setConfigMarkingSystem] = useState<'percentage' | 'number' | 'letter'>('percentage');
    const [configPassMark, setConfigPassMark] = useState<number | undefined>(undefined);
    const [configOverallSystem, setConfigOverallSystem] = useState<'gpa' | 'average' | 'points' | 'other'>('gpa');

    // Create New CU State
    const [isCreatingCU, setIsCreatingCU] = useState(false);
    const [newCUCode, setNewCUCode] = useState('');
    const [newCUName, setNewCUName] = useState('');
    const [newCUCredit, setNewCUCredit] = useState('3');
    const [newCUGrading, setNewCUGrading] = useState<'percentage' | 'number' | 'letter'>('percentage');

    const handleOpenConfig = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activePageConfig) {
            setConfigName(activePageConfig.name);
            setConfigCUIds([...activePageConfig.courseUnitIds]);
            setConfigMarkingSystem(activePageConfig.markingScheme || 'percentage');
            setConfigPassMark(activePageConfig.passMark);
            setConfigOverallSystem(activePageConfig.overallScoreSystem || 'gpa');
            setIsConfigModalOpen(true);
            setIsCreatingCU(false); // Reset create mode
        }
    };

    const handleSaveConfig = () => {
        if (!activePageConfig) return;
        updateResultPageConfig({
            ...activePageConfig,
            name: configName,
            courseUnitIds: configCUIds,
            markingScheme: configMarkingSystem,
            passMark: configPassMark,
            overallScoreSystem: configOverallSystem
        });
        setIsConfigModalOpen(false);
    };

    const handleCreateCU = () => {
        if (!selectedLevel || !newCUCode || !newCUName) return;

        const newCU = {
            id: `cu_${Date.now()} `,
            code: newCUCode.toUpperCase(),
            name: newCUName,
            creditUnits: parseInt(newCUCredit) || 3,
            programmeId: selectedLevel.progId,
            level: selectedLevel.level,
            semester: 'Semester 1', // Defaulting for now
            type: 'Core' as const,
            defaultGrading: newCUGrading
        };

        addCourseUnit(newCU);
        setConfigCUIds(prev => [...prev, newCU.id]); // Auto-add to selected

        // Reset
        setNewCUCode('');
        setNewCUName('');
        setIsCreatingCU(false);
    };



    const handleDeleteCU = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete course unit "${name}" ? This action cannot be undone.`)) {
            // Remove from current config if it's there
            if (configCUIds.includes(id)) {
                setConfigCUIds(configCUIds.filter(cid => cid !== id));
            }
            deleteCourseUnit(id);
        }
    };

    const handleDeletePage = () => {
        if (!activePageConfig) return;
        if (activePageConfig.isDefault) {
            alert("Cannot delete default pages (Internals/Externals).");
            return;
        }
        if (confirm(`Delete page "${activePageConfig.name}" ? This cannot be undone.`)) {
            deleteResultPageConfig(activePageConfig.id);
            setActivePageId(null);
            setIsConfigModalOpen(false);
        }
    };

    // Seeding Missing Required Units (Anatomy, Micro, Pharma)
    const seededRef = React.useRef(false);
    useEffect(() => {
        if (!selectedLevel || selectedLevel.progId !== 'mbchb' || selectedLevel.level !== 'Year 1' || seededRef.current) return;

        const defaults = [
            { name: 'Anatomy', code: 'ANA101' },
            { name: 'Microbiology', code: 'MIC101' },
            { name: 'Pharmacology', code: 'PHA101' }
        ];

        let added = false;
        defaults.forEach(def => {
            const exists = courseUnits.find(cu =>
                cu.programmeId === selectedLevel.progId &&
                cu.level === selectedLevel.level &&
                (cu.name.includes(def.name) || cu.code === def.code)
            );

            if (!exists) {
                // Seed it
                addCourseUnit({
                    id: `seed_${def.code}_${Date.now()} `,
                    code: def.code,
                    name: def.name,
                    creditUnits: 4,
                    programmeId: selectedLevel.progId,
                    level: selectedLevel.level,
                    semester: 'Year 1, Semester 1',
                    type: 'Core'
                });
                added = true;
            }
        });
        if (added) seededRef.current = true;
    }, [selectedLevel, addCourseUnit, courseUnits]); // Added addCourseUnit and courseUnits to dependencies for completeness, though the ref handles re-seeding.

    // Available CUs for Config (Pool = All CUs for this prog/level MINUS selected)
    const availableCUsForConfig = useMemo(() => {
        if (!selectedLevel) return [];
        return courseUnits.filter(cu =>
            cu.programmeId === selectedLevel.progId &&
            cu.level === selectedLevel.level &&
            !configCUIds.includes(cu.id)
        );
    }, [courseUnits, selectedLevel, configCUIds]);

    // Selected CUs objects (ordered)
    const selectedCUsForConfig = useMemo(() => {
        return configCUIds.map(id => courseUnits.find(cu => cu.id === id)).filter(Boolean) as typeof courseUnits;
    }, [configCUIds, courseUnits]);

    const moveCU = (index: number, direction: 'up' | 'down') => {
        const newIds = [...configCUIds];
        if (direction === 'up' && index > 0) {
            [newIds[index], newIds[index - 1]] = [newIds[index - 1], newIds[index]];
        } else if (direction === 'down' && index < newIds.length - 1) {
            [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
        }
        setConfigCUIds(newIds);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in space-y-8 relative">
            {/* DEVELOPMENT BANNER - DIRECTOR REQUEST */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg shadow-sm flex items-start gap-3">
                <span className="text-2xl">🚧</span>
                <div>
                    <h3 className="text-yellow-800 font-bold uppercase tracking-wider text-xs mb-1">Under Construction</h3>
                    <p className="text-yellow-700 text-sm font-medium">The Academic Results module is currently in development. Features and data persistence may be limited.</p>
                </div>
            </div>

            {/* Edit Results Modal */}




            {/* Post History Modal */}
            {isPostHistoryOpen && (
                <PostHistoryModal
                    history={effectivePostHistory.filter(h => activePageConfig ? h.pageName === activePageConfig.name : true)}
                    allStudents={students}
                    financialSettings={financialSettings}
                    onClose={() => setIsPostHistoryOpen(false)}
                    onRevert={viewingArchive ? () => alert("Cannot revert archived history.") : handleRevertPost}
                />
            )}

            {/* Results Archive History Modal */}
            {isResultHistoryOpen && (
                <ResultHistoryModal
                    archives={resultArchives.filter(a => activePageConfig ? a.pageConfigId === activePageConfig.id : true)}
                    onClose={() => setIsResultHistoryOpen(false)}
                    onView={(archive) => {
                        setViewingArchive(archive);
                        setIsResultHistoryOpen(false);
                    }}
                />
            )}

            {/* VIEWING ARCHIVE BANNER */}
            {viewingArchive && (
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 mb-4 flex justify-between items-center shadow-sm">
                    <div>
                        <span className="font-bold">📂 Viewing History:</span> {viewingArchive.name} <span className="text-sm opacity-75">({new Date(viewingArchive.date).toLocaleDateString()})</span>
                    </div>
                    <button
                        onClick={() => setViewingArchive(null)}
                        className="bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded font-bold text-sm transition"
                    >
                        Exit View Mode
                    </button>
                </div>
            )}

            {/* Modal Overlay */}


            {/* CLEAR PAGE WARNING MODAL */}
            {isClearModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsClearModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-xl font-bold text-red-700">Warning: Archiving Results</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-700 font-medium">
                                You are about to <span className="text-red-600 font-bold">ARCHIVE</span> the current results.
                            </p>
                            <p className="text-sm text-gray-600 border-l-4 border-red-200 pl-3 italic">
                                This will clear all marks from the page and move them to "Results History".
                                Requires a reason.
                            </p>
                            <p className="text-xs text-red-500 font-bold mt-2">
                                Please consult support if you do not understand the meaning of this action.
                            </p>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Reason for archiving:</label>
                                <input
                                    type="text"
                                    placeholder="e.g. '2025 Year 1 Final Results'"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                    value={archiveReason}
                                    onChange={e => setArchiveReason(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsClearModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmClearAndArchive}
                                disabled={!archiveReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
                            >
                                Confirm & Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!selectedLevel ? (
                /* 1. PROGRAMME GRID VIEW */
                <div className="max-w-6xl mx-auto relative z-10">
                    <header className="mb-12">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-2">Academic Intelligence</div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Academic Results</h1>
                        <p className="text-slate-400 mt-2 text-sm max-w-lg">Manage internals, externals, and custom results across all programmes.</p>
                    </header>

                    <div className="space-y-4">
                        {programmes.map(prog => (
                            <div key={prog.id} className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:bg-slate-900/60">
                                <button
                                    onClick={() => setExpandedProgramme(expandedProgramme === prog.id ? null : prog.id)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all text-left"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                                            {prog.code.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white tracking-tight">{prog.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400 border border-blue-500/20">{prog.code}</span>
                                                <span>{prog.duration}</span>
                                                <span>{prog.levels?.length || 0} Levels</span>
                                                <span className="text-slate-400">{students.filter(s => s.programme === prog.name).length} Students</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`transform transition-transform ${expandedProgramme === prog.id ? 'rotate-180' : ''} text-slate-500`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                    </span>
                                </button>

                                {/* EXPANDED ENTRY LEVELS */}
                                {expandedProgramme === prog.id && (
                                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                                        {prog.levels?.map(level => (
                                            <button
                                                key={level}
                                                onClick={() => {
                                                    setSelectedLevel({ progId: prog.id, level });
                                                    const defaults = resultPageConfigs.filter(c => c.programmeId === prog.id && c.level === level);
                                                    if (defaults.length > 0) setActivePageId(defaults[0].id);
                                                }}
                                                className="group p-5 bg-slate-950/50 rounded-2xl border border-white/5 shadow-xl hover:bg-blue-600/10 hover:border-blue-500/30 transition-all text-left relative overflow-hidden"
                                            >
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Entry Level</div>
                                                <div className="text-lg font-black text-white group-hover:scale-105 transition-transform origin-left">{level}</div>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <div className="text-[10px] font-black text-blue-500/80 bg-blue-500/10 px-2 py-0.5 rounded">
                                                        {students.filter(s => s.programme === prog.name && s.level === level).length} Students
                                                    </div>
                                                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-400">→</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* 2. SELECTED LEVEL MAIN VIEW */
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col min-h-[85vh]">
                    {/* Header glass panel */}
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 mb-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setSelectedLevel(null)}
                                    className="w-12 h-12 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-2xl text-slate-400 flex items-center justify-center transition-all active:scale-90 group"
                                >
                                    <svg className="w-5 h-5 group-hover:text-white group-hover:-translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">
                                        {programmes.find(p => p.id === selectedLevel.progId)?.name}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{selectedLevel.level} Board</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{activePageConfig?.name || 'Loading...'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsResultHistoryOpen(true)}
                                    className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all shadow-lg shadow-black/20"
                                >
                                    📂 Results History
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="w-12 h-12 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-2xl text-slate-400 flex items-center justify-center transition-all hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* TABS OVERLAY */}
                        <div className="flex gap-2 mt-8 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm w-fit max-w-full overflow-x-auto scroller-hide">
                            {availablePages.map(page => (
                                <button
                                    key={page.id}
                                    onClick={() => setActivePageId(page.id)}
                                    className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 relative z-10 ${activePageId === page.id
                                        ? 'text-white'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {activePageId === page.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl animate-in scale-95 duration-300"></div>
                                    )}
                                    <span className="relative z-20">{page.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 flex flex-col">
                        {activePageId ? (
                            <div className="space-y-6 animate-in fade-in duration-700">
                                {/* FILTERS BAR */}
                                <div className="p-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-wrap gap-4 justify-between items-center shadow-2xl">
                                    <div className="flex gap-4 items-center flex-1 min-w-[300px]">
                                        <div className="relative flex-1 max-w-md">
                                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            <input
                                                type="text"
                                                placeholder="Search Student..."
                                                className="pl-12 py-3 w-full bg-slate-950/50 border border-white/5 rounded-2xl text-[13px] font-bold text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none shadow-inner transition-all"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="px-4 py-3 bg-slate-950/50 border border-white/5 rounded-2xl text-[12px] font-black uppercase text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none shadow-inner cursor-pointer"
                                            value={filterStatus}
                                            onChange={e => setFilterStatus(e.target.value)}
                                        >
                                            <option value="all">Financial: All</option>
                                            <option value="cleared">Cleared</option>
                                            <option value="probation">Probation</option>
                                            <option value="defaulter">Defaulter</option>
                                            <option value="not_synced">Not Synced</option>
                                        </select>

                                        <select
                                            className={`px-4 py-3 border rounded-2xl text-[12px] font-black uppercase focus:ring-2 focus:ring-blue-500/50 outline-none shadow-inner cursor-pointer transition-all ${filterResultStatus !== 'all' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-slate-950/50 border-white/5 text-slate-400'}`}
                                            value={filterResultStatus}
                                            onChange={e => setFilterResultStatus(e.target.value as any)}
                                        >
                                            <option value="all">Results: All</option>
                                            {activePageConfig?.passMark !== undefined && (
                                                <option value="failures">Failures (Below {activePageConfig.passMark})</option>
                                            )}
                                            <option value="missing">Missing Marks</option>
                                        </select>

                                        {/* MISSING SUBJECT SUB-FILTER */}
                                        {filterResultStatus === 'missing' && (
                                            <select
                                                className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[12px] font-black uppercase text-amber-500 focus:ring-2 focus:ring-blue-500/50 outline-none shadow-inner cursor-pointer"
                                                value={filterResultSubjectId}
                                                onChange={e => setFilterResultSubjectId(e.target.value)}
                                            >
                                                <option value="any">Any Subject</option>
                                                {courseUnitsOnPage.map(cu => (
                                                    <option key={cu.id} value={cu.id}>{cu.code}</option>
                                                ))}
                                            </select>
                                        )}

                                        <div className="ml-auto flex items-center gap-4">
                                            <div className="text-[10px] font-black text-blue-400/80 bg-blue-400/10 px-4 py-2 rounded-xl border border-blue-400/20 whitespace-nowrap uppercase tracking-widest shadow-lg shadow-blue-500/5">
                                                {filteredStudents.length} Pool
                                            </div>

                                            <div className="relative z-30">
                                                <button
                                                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${showColumnDropdown ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:text-white'}`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                {showColumnDropdown && (
                                                    <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-3xl rounded-3xl p-4 animate-in fade-in duration-300 z-50">
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Visibility Matrix</h4>
                                                        <div className="space-y-1">
                                                            {Object.entries(visibleColumns).map(([key, val]) => (
                                                                <label key={key} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-colors group">
                                                                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${val ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-white/5'}`}>
                                                                        {val && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    <input type="checkbox" className="hidden" checked={val} onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !val }))} />
                                                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${val ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{key.replace(/([A-Z])/g, ' $1')}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                {/* TABLE CONTAINER */}
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all">
                                    <div className="overflow-x-auto scroller-dark">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-950/60 border-b border-white/5">
                                                    <th className="p-6 w-14">
                                                        <div
                                                            onClick={toggleSelectAll}
                                                            className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all ${filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-white/10'}`}
                                                        >
                                                            {filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                    </th>
                                                    {visibleColumns.details && <th className="p-6 font-black text-[10px] text-slate-500 uppercase tracking-widest min-w-[250px]">Executive Intelligence / Bio</th>}
                                                    {visibleColumns.payCode && <th className="p-6 font-black text-[10px] text-slate-500 uppercase tracking-widest min-w-[150px]">Reg Code</th>}

                                                    {/* Dynamic Course Unit Headers */}
                                                    {visibleColumns.marks && courseUnitsOnPage.map(cu => {
                                                        const failCount = filteredStudents.filter(s => {
                                                            const res = effectiveStudentResults.find(r => r.studentId === s.id && r.courseUnitId === cu.id && r.pageConfigId === activePageConfig?.id);
                                                            return activePageConfig?.passMark !== undefined && res && !isNaN(Number(res.marks)) && Number(res.marks) < activePageConfig.passMark;
                                                        }).length;

                                                        return (
                                                            <th key={cu.id} className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-center border-l border-white/5 min-w-[100px]">
                                                                <div className="text-white hover:text-blue-400 transition-colors cursor-help" title={cu.name}>{cu.code}</div>
                                                                <div className="text-slate-600 font-bold mt-0.5">{cu.creditUnits} CU</div>
                                                                {failCount > 0 && <div className="mt-1.5 inline-block bg-rose-500/10 text-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded-full ring-1 ring-rose-500/20 shadow-lg shadow-rose-500/10 transition-all">FAIL: {failCount}</div>}
                                                            </th>
                                                        );
                                                    })}

                                                    {/* Overall Score Header */}
                                                    {visibleColumns.overall && activePageConfig?.overallScoreSystem && (
                                                        <th className="p-6 font-black text-[10px] text-blue-400 uppercase tracking-widest text-center border-l border-blue-500/20 bg-blue-600/5 min-w-[100px]">
                                                            {activePageConfig?.overallScoreSystem === 'gpa' ? 'GPA' :
                                                                activePageConfig?.overallScoreSystem === 'average' ? 'Avg' :
                                                                    activePageConfig?.overallScoreSystem === 'points' ? 'Pts' :
                                                                        'Overall'}
                                                        </th>
                                                    )}
                                                    {visibleColumns.status && <th className="p-6 font-black text-[10px] text-slate-500 uppercase tracking-widest text-center border-l border-white/5">Audit</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredStudents.length > 0 ? filteredStudents.map((student, sIdx) => {
                                                    const status = determineStudentStatus(student, financialSettings);
                                                    const isSelected = selectedStudentIds.includes(student.id);

                                                    return (
                                                        <tr key={student.id} className={`transition-all duration-300 group ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}>
                                                            <td className="p-6">
                                                                <div
                                                                    onClick={() => toggleSelectStudent(student.id)}
                                                                    className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-white/10 group-hover:border-slate-500'}`}
                                                                >
                                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                            </td>
                                                            {visibleColumns.details && (
                                                                <td className="p-6">
                                                                    <div
                                                                        onClick={() => handleEditClick(student)}
                                                                        className="font-black text-[15px] text-white hover:text-blue-400 transition-all cursor-pointer flex items-center gap-2 group/name"
                                                                    >
                                                                        {student.name}
                                                                        <span className="opacity-0 group-hover/name:opacity-100 text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded transition-all">EDIT</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1.5">
                                                                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{student.programme.substring(0, 30)}...</div>
                                                                        {(() => {
                                                                            const summary = effectiveStudentPageSummaries.find(s => s.studentId === student.id && s.pageConfigId === activePageConfig?.id);
                                                                            if (summary?.postedAt) {
                                                                                return (
                                                                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                                                                                        <span>SENT</span>
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleColumns.payCode && <td className="p-6 font-mono text-xs text-slate-500 font-black tracking-widest">{student.payCode}</td>}

                                                            {/* Marks Columns */}
                                                            {visibleColumns.marks && courseUnitsOnPage.map(cu => {
                                                                const result = effectiveStudentResults.find(r => r.studentId === student.id && r.courseUnitId === cu.id && r.pageConfigId === activePageConfig?.id);
                                                                const isFail = activePageConfig?.passMark !== undefined && result && !isNaN(Number(result.marks)) && Number(result.marks) < activePageConfig.passMark;

                                                                return (
                                                                    <td key={cu.id} className="p-4 text-center border-l border-white/5">
                                                                        <div className={`text-[15px] font-black transition-all ${isFail ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : result ? 'text-white' : 'text-slate-800'}`}>
                                                                            {result ? result.marks : '—'}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}

                                                            {/* Overall Score Value */}
                                                            {visibleColumns.overall && activePageConfig?.overallScoreSystem && (
                                                                <td className="p-4 text-center border-l border-blue-500/20 bg-blue-600/5">
                                                                    <div className="font-italic text-blue-400 font-black text-lg">
                                                                        {(() => {
                                                                            const summary = effectiveStudentPageSummaries.find(s => s.studentId === student.id && s.pageConfigId === activePageId);
                                                                            return summary?.overallScore || '—';
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                            )}

                                                            {visibleColumns.status && (
                                                                <td className="p-6 border-l border-white/5">
                                                                    <div className="flex justify-center">
                                                                        <StatusRing student={student} size={36} />
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan={10} className="p-20 text-center animate-pulse">
                                                            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 inline-block">
                                                                <svg className="w-12 h-12 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">No matching students in database</h4>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 animate-in fade-in duration-1000">
                                <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-white/5 flex items-center justify-center text-slate-600 mb-8 shadow-2xl">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <h3 className="text-xl font-black text-slate-400 tracking-tight uppercase">Audit Board Empty</h3>
                                <p className="text-slate-600 text-[10px] font-bold tracking-[0.2em] mt-2 underline">SELECT AN EVALUATION CATEGORY TO BEGIN</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
