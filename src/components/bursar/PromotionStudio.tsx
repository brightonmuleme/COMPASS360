import React, { useState, useEffect } from 'react';
import { Programme, EnrolledStudent, useSchoolData, PromotionBatch, PromotionChange, Billing, Payment, Bursary } from '@/lib/store';
import { LearnerAccountModal } from '@/components/bursar/LearnerAccountModal';
import { useSensitiveAction } from '@/components/shared/SensitiveActionGuard';

interface PromotionGroup {
    id: string;
    targetLevel: string;
    studentIds: number[];
}

interface PromotionStudioProps {
    programme: Programme;
    variant?: 'dark' | 'light';
}

export default function PromotionStudio({ programme, variant = 'dark' }: PromotionStudioProps) {
    const isDark = variant === 'dark';

    // Theme Constants
    const theme = {
        bg: isDark ? 'bg-[#1f2937]' : 'bg-white',
        bgSecondary: isDark ? 'bg-[#111827]' : 'bg-gray-50',
        text: isDark ? 'text-white' : 'text-gray-900',
        textSecondary: isDark ? 'text-gray-400' : 'text-gray-500',
        border: isDark ? 'border-gray-700' : 'border-gray-200',
        cardBg: isDark ? 'bg-[#1f2937]' : 'bg-white',
        cardBorder: isDark ? 'border-gray-600' : 'border-gray-200',
        modalBg: isDark ? 'bg-[#1f2937]' : 'bg-white',
        inputBg: isDark ? 'bg-gray-950' : 'bg-gray-50',
    };
    const {
        students, updateStudent, promotionBatches, addPromotionBatch, updatePromotionBatch,
        addBilling, updatePayment, services, programmes, billings, payments, bursaries,
        batchUpdateData, isProcessingPromotion, setIsProcessingPromotion,
        deletePromotionBatch
    } = useSchoolData();

    const { runGuardedAction, GuardComponent } = useSensitiveAction();

    // Ensure we work with the latest programme data (e.g. if fees were updated)
    const freshProgramme = programmes.find(p => p.id === programme.id) || programme;

    // View State
    const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

    // Editor State
    const [previewSourceLevel, setPreviewSourceLevel] = useState<string | null>(null);
    const [sourceStudents, setSourceStudents] = useState<EnrolledStudent[]>([]);

    // Draft State (Inside Modal)
    const [mainTargetLevel, setMainTargetLevel] = useState<string>('');
    const [mainGroupIds, setMainGroupIds] = useState<number[]>([]); // These are IDs of students to be moved
    const [promotionGroups, setPromotionGroups] = useState<PromotionGroup[]>([]);

    // Create Batch Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newBatchName, setNewBatchName] = useState('');

    // Audit & Search State
    const [viewStudentId, setViewStudentId] = useState<number | null>(null);
    const [draftSearch, setDraftSearch] = useState('');
    const [mobileViewTab, setMobileViewTab] = useState<'pool' | 'destinations'>('pool');

    const levels = programme.levels || [];

    // Dynamic Level Discovery:
    // We start with the configured levels for the programme.
    // However, if students have been promoted to a 'semester' or level NOT in that list (e.g. "Year 1 Semester 2"),
    // they would be invisible. So we must scan the student population for ANY level/semester that matches this programme.

    const normalize = (str: string) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';

    // 1. Get Set of all unique levels/semesters occupied by students in this programme
    const discoveredLevels = new Set<string>();
    const programmeLevelsNormalized = new Set(levels.map(normalize));

    students.forEach(s => {
        // Check if student belongs to this programme
        if (s.programme === programme.id || s.programme === programme.name) {
            // Check if active/enrolled
            if (['active', 'enrolled', 'suspended', 'probation'].includes(s.status)) {
                // Add their level and semester to discovery if meaningful
                if (s.level) discoveredLevels.add(s.level);
                if (s.semester) discoveredLevels.add(s.semester);
            }
        }
    });

    // 2. Identify "Extra" levels that are NOT in the static config
    const extraLevels = Array.from(discoveredLevels).filter(L => !programmeLevelsNormalized.has(normalize(L)));

    // 3. Merged Display List: Configured Levels + Extra Discovered Levels
    // Filter out potential bad data (e.g. concatenated strings with commas)
    const displayLevels = [...levels, ...extraLevels.sort()].filter(l => !l.includes(','));

    // --- DASHBOARD LOGIC ---

    const handleCreateBatchClick = () => {
        if (isDark) {
            // Legacy/Bursar Flow
            const name = prompt("Enter a name for this Promotion Folder (e.g. 'End of Year 2025')");
            if (name) createBatch(name);
        } else {
            // Registrar/Light Flow (With Warning)
            setIsCreateModalOpen(true);
        }
    };

    const createBatch = (name: string) => {
        const newBatch: PromotionBatch = {
            id: crypto.randomUUID(),
            name,
            programmeId: programme.id,
            programmeName: programme.name,
            status: 'draft',
            origin: isDark ? 'bursar' : 'registrar',
            createdAt: new Date().toISOString(),
            changes: []
        };
        addPromotionBatch(newBatch);
    };

    const handleConfirmCreateBatch = () => {
        if (!newBatchName.trim()) return;
        createBatch(newBatchName);
        setIsCreateModalOpen(false);
        setNewBatchName('');
    };

    const openBatch = (batchId: string) => {
        setActiveBatchId(batchId);
        setViewMode('editor');
    };

    const activeBatch = promotionBatches.find(b => b.id === activeBatchId);

    // --- EDITOR LOGIC ---

    const getNextLevel = (current: string) => {
        const idx = displayLevels.indexOf(current);
        if (idx !== -1 && idx < displayLevels.length - 1) return displayLevels[idx + 1];
        return 'Graduated';
    };

    const handlePreview = (level: string) => {
        if (!activeBatch) return;

        const target = normalize(level);

        // 1. Find eligible source students (Generic Logic)
        const eligible = students.filter(s => {
            const progMatch = s.programme === programme.id || s.programme === programme.name;
            // Include 'active', 'enrolled', 'suspended' etc?
            // Usually we promote active students. 
            // If they are pending/suspended, maybe we still promote them? Let's include active/enrolled.
            const statusMatch = ['active', 'enrolled', 'suspended', 'probation'].includes(s.status);
            const levelMatch = s.level === level || normalize(s.level) === target || normalize(s.semester) === target;

            return progMatch && statusMatch && levelMatch;
        });

        setSourceStudents(eligible);
        setPreviewSourceLevel(level);

        // 2. Load Existing Drafts for this Level from the Batch
        // We need to reconstruct the "Groups" from the flat list of changes.
        const defaultNext = getNextLevel(level);

        // Find changes affecting these students
        const relevantChanges = activeBatch.changes.filter(c => eligible.some(s => s.id === c.studentId));

        if (relevantChanges.length === 0) {
            // New setup: Default everyone to main target
            setMainTargetLevel(defaultNext);
            setMainGroupIds(eligible.map(s => s.id));
            setPromotionGroups([]);
        } else {
            // Rehydrate State
            // Usually we have 1 Main Target (the most common one) and others are custom.
            // Heuristic: Find most common target level.
            const targets = relevantChanges.map(c => c.toLevel);
            const counts: Record<string, number> = {};
            targets.forEach(t => counts[t] = (counts[t] || 0) + 1);

            const sortedTargets = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const primaryTarget = sortedTargets[0]?.[0] || defaultNext;

            setMainTargetLevel(primaryTarget);

            // IDs going to primary
            const primaryIds = relevantChanges.filter(c => c.toLevel === primaryTarget).map(c => c.studentId);
            setMainGroupIds(primaryIds);

            // IDs going elsewhere -> Create Groups
            const otherTargets = sortedTargets.slice(1).map(x => x[0]);
            const reconstructedGroups: PromotionGroup[] = otherTargets.map((t, idx) => ({
                id: `g_restored_${idx}`,
                targetLevel: t,
                studentIds: relevantChanges.filter(c => c.toLevel === t).map(c => c.studentId)
            }));

            setPromotionGroups(reconstructedGroups);
        }
    };

    const handleAddGroup = () => {
        const newGroup: PromotionGroup = {
            id: `g_${Date.now()}`,
            targetLevel: levels[0] || 'Year 1 Semester 1',
            studentIds: []
        };
        setPromotionGroups([...promotionGroups, newGroup]);
    };

    const toggleStudentInMainGroup = (studentId: number) => {
        if (mainGroupIds.includes(studentId)) {
            setMainGroupIds(mainGroupIds.filter((id: number) => id !== studentId));
        } else {
            // Remove from any other custom group first
            const updatedCustomGroups = promotionGroups.map((g: PromotionGroup) => ({
                ...g,
                studentIds: g.studentIds.filter((id: number) => id !== studentId)
            }));
            setPromotionGroups(updatedCustomGroups);
            setMainGroupIds([...mainGroupIds, studentId]);
        }
    };

    const toggleStudentInCustomGroup = (groupId: string, studentId: number) => {
        setPromotionGroups(prev => prev.map(g => {
            if (g.id !== groupId) {
                if (g.studentIds.includes(studentId)) {
                    return { ...g, studentIds: g.studentIds.filter((id: number) => id !== studentId) };
                }
                return g;
            }
            if (g.studentIds.includes(studentId)) {
                return { ...g, studentIds: g.studentIds.filter((id: number) => id !== studentId) };
            } else {
                if (mainGroupIds.includes(studentId)) {
                    setMainGroupIds(prevMain => prevMain.filter((id: number) => id !== studentId));
                }
                return { ...g, studentIds: [...g.studentIds, studentId] };
            }
        }));
    };

    const handleSelectAllInDraft = () => {
        // Only select students that match search and aren't in other groups
        const filtered = sourceStudents.filter(s =>
            s.name.toLowerCase().includes(draftSearch.toLowerCase()) &&
            !promotionGroups.some(g => g.studentIds.includes(s.id))
        );
        const allFilteredIds = filtered.map(s => s.id);

        if (allFilteredIds.every((id: number) => mainGroupIds.includes(id))) {
            // Deselect all
            setMainGroupIds((prev: number[]) => prev.filter((id: number) => !allFilteredIds.includes(id)));
        } else {
            // Select all
            setMainGroupIds((prev: number[]) => Array.from(new Set([...prev, ...allFilteredIds])));
        }
    };

    const handleBatchMoveToGroup = (groupId: string) => {
        // Move all currently selected Main Group students to a custom group
        if (mainGroupIds.length === 0) return;

        setPromotionGroups((prev: PromotionGroup[]) => prev.map((g: PromotionGroup) => {
            if (g.id === groupId) {
                return { ...g, studentIds: Array.from(new Set([...g.studentIds, ...mainGroupIds])) };
            }
            return g;
        }));
        setMainGroupIds([]);
    };

    const saveDraftToBatch = () => {
        if (!activeBatch || !previewSourceLevel) return;

        // 1. Convert current state to PromotionChange objects
        const newChanges: PromotionChange[] = [];

        // Main Group
        mainGroupIds.forEach((sid: number) => {
            const s = sourceStudents.find(x => x.id === sid);
            if (s) {
                newChanges.push({
                    studentId: s.id,
                    studentName: s.name,
                    fromLevel: previewSourceLevel,
                    toLevel: mainTargetLevel,
                    actionType: mainTargetLevel === 'Graduated' ? 'graduate' : 'promote' // Simplified
                });
            }
        });

        // Custom Groups
        promotionGroups.forEach(g => {
            g.studentIds.forEach((sid: number) => {
                const s = sourceStudents.find(x => x.id === sid);
                if (s) {
                    newChanges.push({
                        studentId: s.id,
                        studentName: s.name,
                        fromLevel: previewSourceLevel,
                        toLevel: g.targetLevel,
                        actionType: 'promote' // Logic could be smarter (e.g. check if level is same -> repeat)
                    });
                }
            });
        });

        // 2. Validate History Constraints (User Request: Prevent re-promotion to past levels)
        const invalidMoves = newChanges.filter(c => {
            const s = sourceStudents.find(x => x.id === c.studentId);
            if (!s || !s.promotionHistory) return false;

            // Skip validation for Graduation/Deactivation
            if (c.toLevel === 'Graduated' || c.toLevel === 'Deactivated') return false;

            const targetNorm = normalize(c.toLevel);
            // Check if they have been in this level (either promoted FROM it or TO it in the past)
            const hasHistory = s.promotionHistory.some((h: any) =>
                normalize(h.fromSemester) === targetNorm || normalize(h.toSemester) === targetNorm
            );

            return hasHistory;
        });

        if (invalidMoves.length > 0) {
            const proceed = confirm(`⚠️ Warning: ${invalidMoves.length} students (e.g., ${invalidMoves[0].studentName}) are being assigned to a level they have already attended (${invalidMoves[0].toLevel}).\n\nThis usually happens for Repeaters or Retakes. Do you want to proceed with this draft?`);
            if (!proceed) return;
        }

        // 3. Merge with existing batch changes
        // Remove any old changes for these specific students (overwrite logic)
        const relevantStudentIds = sourceStudents.map((s: EnrolledStudent) => s.id);
        const otherChanges = activeBatch.changes.filter((c: PromotionChange) => !relevantStudentIds.includes(c.studentId));

        const updatedBatch = {
            ...activeBatch,
            changes: [...otherChanges, ...newChanges]
        };

        updatePromotionBatch(updatedBatch);
        setPreviewSourceLevel(null); // Close Modal
    };

    const handleRefreshFinancials = () => {
        if (!activeBatch) return;
        // Refresh financial snapshots is effectively a re-render since useSchoolData is live,
        // but we can explicitly log it or trigger any derived recalculations if they were cached.
        // In this architecture, we just need to alert the user that data is synced.
        alert("Financial snapshots refreshed with latest ledger data.");
    };

    const commitBatch = () => {
        if (!activeBatch) return;
        runGuardedAction(() => {
            if (!confirm(`Are you sure you want to promote ${activeBatch.changes.length} students?\nThis will update their records and statuses permanently.`)) return;

            setIsProcessingPromotion(true);

            // Prepare batch updates
            const updatedStudents: EnrolledStudent[] = [];
            const newBillings: Billing[] = [];
            const updatedPayments: Payment[] = [];

            activeBatch.changes.forEach(change => {
                const student = students.find(s => s.id === change.studentId);
                if (student) {
                    const isGraduating = change.toLevel === 'Graduated';
                    const isDeactivated = change.toLevel === 'Deactivated';

                    const targetScopeTerm = student.semester; // The term we are promoting FROM

                    // A. Calculate Arrears from OLD semester
                    const studentBillings = billings.filter(b => b.studentId === student.id && b.term === targetScopeTerm);
                    const totalBilledOld = studentBillings.reduce((sum, b) => sum + b.amount, 0);
                    const studentPaymentsOld = payments.filter(p => p.studentId === student.id && (p.term === targetScopeTerm || !p.term));
                    const totalPaidOld = studentPaymentsOld.reduce((sum, p) => sum + p.amount, 0);
                    const bursaryValOld = student.bursary && student.bursary !== 'none'
                        ? (bursaries?.find((b: any) => b.id === student.bursary)?.value || 0) : 0;

                    const hasBFBill = studentBillings.some(b => b.type === 'Balance Brought Forward' || b.description.includes('Balance Brought Forward'));
                    const effectivePrevBal = hasBFBill ? 0 : (student.previousBalance || 0);

                    const finalSnapshotArrears = (totalBilledOld + effectivePrevBal - bursaryValOld) - totalPaidOld;

                    // B. Create carrier bill for NEW semester if needed
                    if (!isGraduating && !isDeactivated && finalSnapshotArrears > 0) {
                        newBillings.push({
                            id: crypto.randomUUID(),
                            studentId: student.id,
                            programmeId: programme.id,
                            level: change.toLevel,
                            term: change.toLevel,
                            amount: finalSnapshotArrears,
                            description: `Balance Brought Forward (${student.semester || 'Prev'})`,
                            date: new Date().toISOString().split('T')[0],
                            type: 'Balance Brought Forward',
                            paidAmount: 0,
                            balance: finalSnapshotArrears,
                            status: 'Pending',
                            history: []
                        });
                    }

                    // C. Auto-Billing for New Semester
                    let newTermTuition = 0;
                    let newTermServices: string[] = [];
                    if (!isGraduating && !isDeactivated) {
                        const feeConfig = freshProgramme.feeStructure?.find(f => normalize(f.level) === normalize(change.toLevel));
                        if (feeConfig) {
                            if (feeConfig.tuitionFee > 0) {
                                newTermTuition = feeConfig.tuitionFee;
                                newBillings.push({
                                    id: crypto.randomUUID(),
                                    studentId: student.id,
                                    programmeId: programme.id,
                                    level: change.toLevel,
                                    term: change.toLevel,
                                    amount: feeConfig.tuitionFee,
                                    description: `Tuition (${change.toLevel})`,
                                    date: new Date().toISOString().split('T')[0],
                                    type: 'Tuition',
                                    paidAmount: 0,
                                    balance: feeConfig.tuitionFee,
                                    status: 'Pending',
                                    history: []
                                });
                            }
                            if (feeConfig.compulsoryServices) {
                                newTermServices = feeConfig.compulsoryServices;
                                feeConfig.compulsoryServices.forEach(serviceId => {
                                    const service = services.find(s => s.id === serviceId);
                                    if (service) {
                                        newBillings.push({
                                            id: crypto.randomUUID(),
                                            studentId: student.id,
                                            programmeId: programme.id,
                                            level: change.toLevel,
                                            term: change.toLevel,
                                            amount: service.cost,
                                            description: service.name,
                                            date: new Date().toISOString().split('T')[0],
                                            type: 'Functional Fees',
                                            paidAmount: 0,
                                            balance: service.cost,
                                            status: 'Pending',
                                            history: []
                                        });
                                    }
                                });
                            }
                        }
                    }

                    // D. Tag Untagged Payments
                    const untaggedPayments = payments.filter(p => p.studentId === student.id && !p.term);
                    untaggedPayments.forEach(p => {
                        updatedPayments.push({ ...p, term: change.fromLevel });
                    });

                    // E. Explicit Financial Balancing (New Engine)
                    // New Total Fees = (New Tuition + Sum of New Compulsory Services)
                    let newTermFeesSum = newTermTuition;
                    newTermServices.forEach(sid => {
                        const srv = services.find(s => s.id === sid);
                        if (srv) newTermFeesSum += srv.cost;
                    });

                    const totalLedgerPayments = payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0);
                    const bursaryValNew = student.bursary && student.bursary !== 'none'
                        ? (bursaries.find(b => b.id === student.bursary)?.value || 0) : 0;

                    // Arrears = snapshot arrears (we'll assume the B/F bill is the ONLY arrears now)
                    const finalNewBalance = (newTermFeesSum + finalSnapshotArrears) - 0; // Payments haven't been made for new term yet

                    // Actually, let's use the Universal Engine for sanity:
                    // New Balance = (All Historical Billings + Initial Arrears) - (All Payments + New Bursary)
                    // This will be calculated in the store or at the end of commitment.

                    // F. Update Student Object
                    const newReqs = (freshProgramme.feeStructure?.find(f => normalize(f.level) === normalize(change.toLevel))?.requirements || []).map(req => ({
                        name: req.name,
                        required: Number(req.quantity || 0),
                        brought: 0,
                        color: '#94a3b8',
                        entries: []
                    }));

                    updatedStudents.push({
                        ...student,
                        level: (isGraduating || isDeactivated) ? student.level : change.toLevel,
                        semester: (isGraduating || isDeactivated) ? student.semester : change.toLevel,
                        status: isGraduating ? 'graduated' : isDeactivated ? 'deactivated' : 'active',
                        physicalRequirements: newReqs,
                        previousBalance: 0, // Arrears moved to B/F bill
                        totalFees: student.totalFees + newTermFeesSum + finalSnapshotArrears, // Cumulative
                        balance: (newTermFeesSum + finalSnapshotArrears), // Current Term starting balance (assuming no new payments yet)
                        services: newTermServices,
                        promotionHistory: [
                            ...(student.promotionHistory || []),
                            {
                                date: new Date().toISOString(),
                                fromSemester: change.fromLevel,
                                toSemester: change.toLevel,
                                previousBalance: 0,
                                newBalance: 0,
                                requirementsSnapshot: student.physicalRequirements || [],
                                bursarySnapshot: student.bursary,
                                servicesSnapshot: student.services,
                                snapshotArrears: finalSnapshotArrears,
                                initialPreviousBalance: student.previousBalance || 0
                            }
                        ]
                    });
                }
            });

            // Atomic Commit
            batchUpdateData({
                students: updatedStudents,
                billings: newBillings,
                payments: updatedPayments,
                logAction: "Promotion Commitment",
                logDetails: `Committed batch ${activeBatch.name} for ${updatedStudents.length} students`
            });

            updatePromotionBatch({ ...activeBatch, status: 'committed' });

            setTimeout(() => {
                setIsProcessingPromotion(false);
                alert(`Batch Executed! ${updatedStudents.length} students updated and billed.`);
                setViewMode('dashboard');
            }, 1000);
        });
    };

    // Calculate "Remaining"
    const assignedIds = new Set([...mainGroupIds, ...promotionGroups.flatMap(g => g.studentIds)]);
    const unassignedStudents = sourceStudents.filter(s => !assignedIds.has(s.id));


    // --- RENDER ---

    if (previewSourceLevel) {
        return (
            <div className={`fixed inset-0 z-[999999] bg-[#0b0f13] flex flex-col overflow-hidden text-white font-sans animate-fade-in`}>
                {/* FULL SCREEN STEWARD/AUDITOR HEADER */}
                <div className={`p-4 border-b border-gray-800 bg-[#161b22] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl z-10`}>
                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Studio</span>
                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest truncate max-w-[150px]">{programme.name}</span>
                            </div>
                            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                DRAFTING: {previewSourceLevel}
                            </h2>
                            <p className="hidden md:block text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Promotion Auditor & Destination Manager</p>
                        </div>

                        <div className="hidden md:block h-10 w-[1px] bg-gray-800"></div>

                        {/* CRITICAL ACTIONS PORTED TO LEFT FOR VISIBILITY */}
                        <div className="flex items-center gap-2 md:gap-3 ml-auto md:ml-0">
                            {activeBatch?.status !== 'committed' && (
                                <button
                                    onClick={saveDraftToBatch}
                                    className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 touch-target"
                                >
                                    <span className="text-sm">💾</span>
                                    <span className="text-[10px] md:text-xs uppercase tracking-wider">Save</span>
                                </button>
                            )}
                            <button
                                onClick={() => { setPreviewSourceLevel(null); setDraftSearch(''); }}
                                className="px-4 md:px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-target"
                            >
                                Exit
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={draftSearch}
                                onChange={(e) => setDraftSearch(e.target.value)}
                                className="bg-black border border-gray-700 text-white text-[11px] rounded-full px-5 py-2 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            {draftSearch && (
                                <button onClick={() => setDraftSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">×</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile View Switcher */}
                <div className="md:hidden flex bg-[#161b22] border-b border-gray-800">
                    <button
                        onClick={() => setMobileViewTab('pool')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${mobileViewTab === 'pool' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
                    >
                        Student Pool ({sourceStudents.length})
                    </button>
                    <button
                        onClick={() => setMobileViewTab('destinations')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${mobileViewTab === 'destinations' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-500'}`}
                    >
                        Destinations ({promotionGroups.length + 1})
                    </button>
                </div>

                {/* Body Container */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-[#0b0f13]">
                    {/* Left Pane: Student Pool */}
                    <div className={`
                        ${mobileViewTab === 'pool' ? 'flex' : 'hidden'}
                        md:flex w-full md:w-1/2 border-r border-gray-800 flex-col h-full bg-[#161b22]/30
                    `}>
                        <div className="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Student Pool</h3>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={handleSelectAllInDraft}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest border border-blue-500/30 px-2 py-1 rounded touch-target"
                                >
                                    {mainGroupIds.length > 0 ? 'Toggle' : 'All'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-1">
                                {sourceStudents
                                    .filter((s: EnrolledStudent) => s.name.toLowerCase().includes(draftSearch.toLowerCase()))
                                    .map((student: EnrolledStudent) => {
                                        const isSelected = mainGroupIds.includes(student.id);
                                        const isInOtherGroup = promotionGroups.find((g: PromotionGroup) => g.studentIds.includes(student.id));

                                        return (
                                            <div key={student.id}
                                                onClick={() => !isInOtherGroup && toggleStudentInMainGroup(student.id)}
                                                className={`group flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all border ${isInOtherGroup ? 'opacity-30 grayscale pointer-events-none' : isSelected ? 'bg-blue-500/20 border-blue-500/40 shadow-sm' : 'hover:bg-white/5 border-transparent'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                                        {isSelected && <span className="text-[10px] text-white">✓</span>}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>{student.name}</span>
                                                        {isInOtherGroup && <span className="text-[10px] text-purple-400 truncate font-mono">ASSIGNED TO {isInOtherGroup.targetLevel.toUpperCase()}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewStudentId(student.id); }}
                                                        className="md:opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-700 rounded text-blue-400 transition-all touch-target"
                                                        title="Review Account"
                                                    >
                                                        🔍
                                                    </button>
                                                    <span className="hidden sm:inline text-[11px] font-mono opacity-20 text-gray-400">#{String(student.id).slice(-4)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                            {sourceStudents.filter((s: EnrolledStudent) => s.name.toLowerCase().includes(draftSearch.toLowerCase())).length === 0 && (
                                <div className="py-20 text-center text-gray-500 italic text-sm">No students matched search.</div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Multi-Destination Panels */}
                    <div className={`
                        ${mobileViewTab === 'destinations' ? 'flex' : 'hidden'}
                        md:flex flex-1 overflow-y-auto h-full p-4 md:p-8 space-y-4 md:space-y-8 bg-[#0b0f13] custom-scrollbar flex-col
                    `}>
                        {/* 1. MAIN DESTINATION */}
                        <div className={`bg-[#161b22] rounded-2xl border-2 ${mainGroupIds.length > 0 ? 'border-blue-500/50 shadow-2xl shadow-blue-500/10' : 'border-gray-800'} p-4 md:p-8 transition-all`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm md:text-lg font-black shadow-lg">1</span>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-black text-white">Primary Destination</h3>
                                        <p className="text-[10px] md:text-[11px] text-blue-500 font-bold uppercase tracking-widest">Target: {mainGroupIds.length} students selected</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-4 bg-black/40 p-2 rounded-xl border border-gray-800 w-full sm:w-auto">
                                    <span className="hidden lg:inline text-xs font-black text-gray-500 uppercase tracking-widest pl-2">Action:</span>
                                    <select
                                        value={mainTargetLevel}
                                        onChange={(e) => setMainTargetLevel(e.target.value)}
                                        className="bg-gray-800 border-none text-white text-xs md:text-sm font-bold rounded-lg px-2 md:px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                                    >
                                        {displayLevels.map(l => <option key={l} value={l}>Promote to {l}</option>)}
                                        <option value="Graduated">Graduate Students</option>
                                        <option value="Deactivated">Deactivate Accounts</option>
                                    </select>
                                </div>
                            </div>
                            {mainGroupIds.length === 0 ? (
                                <div className="py-12 text-center text-gray-600 border border-dashed border-gray-700 rounded-2xl text-sm italic bg-black/10">
                                    Assign students from the pool to set their promotion target.
                                </div>
                            ) : (
                                <div className="max-h-[200px] overflow-y-auto flex flex-wrap gap-2 p-4 bg-black/40 rounded-2xl border border-gray-800 custom-scrollbar">
                                    {mainGroupIds.map(id => {
                                        const s = sourceStudents.find(st => st.id === id);
                                        return (
                                            <div key={id} className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 text-xs text-blue-300 font-bold flex items-center gap-2 group/tag">
                                                <span className="truncate max-w-[150px]">{s?.name}</span>
                                                <button onClick={() => toggleStudentInMainGroup(id)} className="hover:text-white text-blue-600 font-black">×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 2. CUSTOM GROUPS (EXCEPTIONS) */}
                        {promotionGroups.map((group, idx) => (
                            <div key={group.id} className="bg-[#161b22] rounded-2xl border border-gray-800 p-4 md:p-8 relative animate-fade-in shadow-xl">
                                <button
                                    onClick={() => setPromotionGroups(promotionGroups.filter(g => g.id !== group.id))}
                                    className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-600 hover:text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest touch-target"
                                >
                                    Remove
                                </button>

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-6 sm:pt-0">
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm md:text-lg font-black shadow-lg">{idx + 2}</span>
                                        <div>
                                            <h3 className="text-lg md:text-xl font-black text-white">Sub-Group Exception</h3>
                                            <p className="text-[10px] md:text-[11px] text-purple-400 font-bold uppercase tracking-widest">{group.studentIds.length} Assigned</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4 w-full sm:w-auto">
                                        {mainGroupIds.length > 0 && (
                                            <button
                                                onClick={() => handleBatchMoveToGroup(group.id)}
                                                className="text-[9px] md:text-[10px] font-black bg-purple-500/10 text-purple-400 px-3 md:px-4 py-2 rounded-full border border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest touch-target"
                                            >
                                                Move Selected ({mainGroupIds.length})
                                            </button>
                                        )}
                                        <select
                                            value={group.targetLevel}
                                            onChange={(e) => {
                                                const newGroups = [...promotionGroups];
                                                newGroups[idx].targetLevel = e.target.value;
                                                setPromotionGroups(newGroups);
                                            }}
                                            className="bg-gray-800 border-none text-white text-xs md:text-sm font-bold rounded-lg px-2 md:px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
                                        >
                                            {displayLevels.map(l => <option key={l} value={l}>Promote to {l}</option>)}
                                            <option value="Deactivated">Deactivate</option>
                                            <option value="Graduated">Graduate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="max-h-[150px] md:max-h-[200px] overflow-y-auto flex flex-wrap gap-2 p-3 md:p-4 bg-black/40 rounded-2xl border border-gray-800 custom-scrollbar">
                                    {group.studentIds.map(id => {
                                        const s = sourceStudents.find(st => st.id === id);
                                        return (
                                            <div key={id} className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-purple-300 font-bold flex items-center gap-2">
                                                <span className="truncate max-w-[100px] md:max-w-[150px]">{s?.name}</span>
                                                <button onClick={() => toggleStudentInCustomGroup(group.id, id)} className="hover:text-white text-purple-600 font-black touch-target">×</button>
                                            </div>
                                        );
                                    })}
                                    {group.studentIds.length === 0 && <span className="text-gray-600 text-xs italic py-4 block w-full text-center">No students in this group.</span>}
                                </div>
                            </div>
                        ))}

                        {/* ADD GROUP BUTTON */}
                        <button
                            onClick={handleAddGroup}
                            className="w-full py-6 md:py-8 border-4 border-dashed border-gray-800 rounded-2xl text-gray-600 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-2 font-black touch-target"
                        >
                            <span className="text-2xl md:text-3xl">+</span>
                            <span className="uppercase tracking-[0.2em] md:tracking-[0.3em] text-[9px] md:text-[11px]">New Exception Group</span>
                        </button>
                    </div>
                </div>

                {/* Footer Section - Information Only */}
                <div className="p-3 bg-black border-t border-gray-800 flex flex-wrap justify-center items-center gap-4 md:gap-10">
                    <span className="text-[9px] md:text-[10px] font-mono text-blue-500 font-bold uppercase tracking-widest">{sourceStudents.length} POOL</span>
                    <span className="text-[9px] md:text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-widest">{unassignedStudents.length} UNASSIGNED</span>
                    <span className="text-[9px] md:text-[10px] font-mono text-green-500 font-bold uppercase tracking-widest">{promotionGroups.reduce((acc, g) => acc + g.studentIds.length, 0) + mainGroupIds.length} READY</span>
                </div>
                {GuardComponent}
            </div>
        );
    }
    const myBatches = promotionBatches.filter((b: PromotionBatch) => {
        const progMatch = b.programmeId === programme.id;
        const batchOrigin = b.origin || 'bursar';
        if (!isDark) {
            if (batchOrigin !== 'registrar') return false;
        } else {
            if (batchOrigin !== 'bursar') return false;
        }
        return progMatch;
    });

    if (viewMode === 'dashboard') {
        return (
            <div className="space-y-6 animate-fade-in p-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className={`text-2xl font-bold ${theme.text}`}>Promotion Folders</h2>
                        <p className={theme.textSecondary}>Manage bulk promotions in drafts before committing.</p>
                    </div>
                    <button onClick={handleCreateBatchClick} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all">+ New Promotion Folder</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myBatches.map(batch => (
                        <div key={batch.id} onClick={() => openBatch(batch.id)} className={`relative group p-6 rounded-2xl border transition-all cursor-pointer ${batch.status === 'committed' ? (isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-100 border-gray-200') + ' opacity-70' : `${theme.cardBg} ${theme.cardBorder} hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10`}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl">
                                    {batch.status === 'committed' ? '🔒' : '📁'}
                                </div>
                                <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${batch.status === 'committed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-600'}`}>
                                    {batch.status}
                                </span>
                            </div>
                            <h3 className={`text-lg font-bold ${theme.text} mb-2`}>{batch.name}</h3>
                            <p className={`text-sm ${theme.textSecondary} px-2 border-l-2 ${theme.border}`}>
                                {batch.changes.length} pending updates
                            </p>
                            <div className={`mt-4 text-xs ${theme.textSecondary}`}>
                                Created: {new Date(batch.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}

                    {myBatches.length === 0 && (
                        <div className={`col-span-full py-12 text-center border-2 border-dashed ${theme.border} rounded-2xl`}>
                            <div className="text-4xl mb-4">📂</div>
                            <p className={theme.textSecondary}>No promotion folders yet.</p>
                            <button onClick={handleCreateBatchClick} className="text-blue-400 font-bold mt-2 hover:underline">Create one to get started</button>
                        </div>
                    )}

                    {/* CREATE BATCH MODAL (REGISTRAR ONLY) */}
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-gray-200">
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Create Promotion Folder</h3>

                                    {/* WARNING NOTICE */}
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                                <h4 className="font-bold text-red-700 uppercase text-xs tracking-wider mb-1">Critical Warning</h4>
                                                <p className="text-sm text-red-800 leading-relaxed">
                                                    Before creating this folder, ensure you have <span className="font-bold underline">CLEARED THE RESULTS PAGE</span> for the previous academic year.
                                                </p>
                                                <p className="text-xs text-red-600 mt-2">
                                                    Failure to do so may result in data conflicts or duplicate records. If you are unsure, please contact support immediately.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Folder Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="e.g. End of Year 2025"
                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={newBatchName}
                                            onChange={e => setNewBatchName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleConfirmCreateBatch()}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmCreateBatch}
                                        disabled={!newBatchName.trim()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Folder
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {GuardComponent}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Editor Header */}
            <div className={`flex flex-col md:flex-row items-start md:items-center justify-between ${theme.bgSecondary} p-4 rounded-xl border ${theme.border} gap-4`}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => setViewMode('dashboard')} className={`${theme.textSecondary} hover:${theme.text} touch-target`}>← <span className="hidden sm:inline">Back</span></button>
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-0.5 truncate">{programme.name}</p>
                        <h2 className={`text-lg md:text-xl font-bold ${theme.text} truncate`}>{activeBatch?.name}</h2>
                        <div className="flex items-center gap-2">
                            {activeBatch?.status === 'committed' ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-green-500 uppercase font-bold tracking-widest">Committed</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                    <span className="text-xs text-yellow-500 uppercase font-bold tracking-widest">Draft</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                    {activeBatch?.status === 'draft' && (
                        <button
                            onClick={handleRefreshFinancials}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 text-[10px] md:text-xs font-bold transition-all touch-target"
                        >
                            🔄 <span className="hidden sm:inline">Refresh Financials</span><span className="sm:hidden">Refresh</span>
                        </button>
                    )}
                    <div className="text-right">
                        <div className={`text-[10px] md:text-sm ${theme.textSecondary}`}>Total Moves</div>
                        <div className={`text-lg md:text-xl font-mono ${theme.text} leading-none`}>{activeBatch?.changes.length || 0}</div>
                    </div>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayLevels.map((level, idx) => {
                    const next = getNextLevel(level);

                    // Stats for this level in the batch
                    const pendingMoves = activeBatch?.changes.filter(c => c.fromLevel === level).length || 0;

                    // Count real students
                    const normalize = (str: string) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
                    const target = normalize(level);
                    const realCount = students.filter((s: EnrolledStudent) => {
                        const progMatch = s.programme === programme.id || s.programme === programme.name;
                        const statusMatch = ['active', 'enrolled', 'suspended', 'probation'].includes(s.status);
                        const levelMatch = s.level === level || normalize(s.level) === target || normalize(s.semester) === target;
                        return progMatch && statusMatch && levelMatch;
                    }).length;

                    const isFullyScheduled = pendingMoves >= realCount && realCount > 0;

                    return (
                        <div key={level} className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 relative group hover:border-blue-500/50 transition-colors ${isFullyScheduled ? (isDark ? 'border-green-500/30 bg-green-900/10' : 'border-green-300 bg-green-50') : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`text-lg font-bold ${theme.text} mb-1`}>{level}</h3>
                                    <div className="flex gap-2">
                                        <div className={`text-xs ${theme.textSecondary} ${theme.bgSecondary} px-2 py-1 rounded`}>
                                            Total: {realCount}
                                        </div>
                                        {pendingMoves > 0 && (
                                            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-bold border border-green-200">
                                                Scheduled: {pendingMoves}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xs ${theme.textSecondary} uppercase tracking-widest mb-1`}>Promotes To</div>
                                    <div className={`text-sm ${theme.text} font-medium opacity-80`}>{next}</div>
                                </div>
                            </div>

                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handlePreview(level)}
                                    className={`px-4 py-2 ${activeBatch?.status === 'committed' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'} text-white text-sm font-semibold rounded-lg shadow-lg flex items-center gap-2`}
                                >
                                    <span>{activeBatch?.status === 'committed' ? 'View Details' : (pendingMoves > 0 ? 'Edit Draft' : 'Plan Promotion')}</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Bar for Commitment */}
            {activeBatch?.status === 'draft' && (
                <div className={`fixed bottom-0 left-0 right-0 ${theme.bgSecondary} border-t ${theme.border} p-4 flex justify-between md:justify-end items-center gap-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]`}>
                    <div className={`${theme.textSecondary} text-[10px] md:text-sm max-w-[150px] md:max-w-none`}>
                        Ready to apply logic to all students?
                    </div>
                    <button
                        onClick={commitBatch}
                        disabled={activeBatch.changes.length === 0}
                        className={`px-6 md:px-8 py-3 rounded-xl font-bold text-white shadow-2xl transition-all text-xs md:text-base touch-target ${activeBatch.changes.length > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                        Commit All
                    </button>
                </div>
            )}

            {/* Commitment Lock Overlay */}
            {isProcessingPromotion && (
                <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl animate-fade-in">
                    <div className="w-20 h-20 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-blue-500/20"></div>
                    <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">Commitment in Progress</h2>
                    <div className="w-96 h-1 bg-gray-800 rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-blue-500 animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-gray-400 max-w-md text-center font-bold text-sm uppercase tracking-widest leading-relaxed">
                        Processing massive student batch. Migrating artifacts, updating financial ledgers, and issuing new billing cycles.
                    </p>
                </div>
            )}
            {GuardComponent}
        </div>
    );
}
