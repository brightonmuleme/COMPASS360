"use client";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSchoolData, EnrolledStudent, formatMoney } from '@/lib/store';
import { LearnerAccountModal } from '@/components/bursar/LearnerAccountModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { MOCK_ENROLLED_STUDENTS } from '../../bursar/sharedData';

// --- MOCK CONSTANTS REMOVED ---
// (Replaced by dynamic store data)

function EnrollmentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { filteredProgrammes: programmes, services, bursaries, hydrated, filteredStudents: enrolledStudents, setStudents: setEnrolledStudents, addBilling, filteredBillings: billings, filteredPayments: payments, addPayment, generalTransactions, deleteGeneralTransaction, deleteStudent, deleteStudents, calculateStudentInitialFinancials } = useSchoolData(); // Use global data



    const [viewMode, setViewMode] = useState<'list' | 'form' | 'history' | 'pending' | 'archive'>('list');
    const [isEditing, setIsEditing] = useState(false);
    // const [enrolledStudents, setEnrolledStudents] = useState<any[]>(MOCK_ENROLLED_STUDENTS); // REPLACED BY GLOBAL STORE
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]); // For pending list (string IDs)
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);

    // ... (state remains) ...

    // Filter Pending Students Logic REMOVED for strict data separation.
    // Bursars must manually enroll students.
    const pendingStudents: any[] = []; // Empty array to satisfy strict type if used elsewhere, or just remove usage.

    const handleBatchEnroll = () => {
        // Feature Disabled: Manual Enrollment Only
        alert("Batch enrollment from Registrar is disabled for data integrity. Please enroll students manually.");
        setViewMode('list');
    };

    // ... (previous logic) ...








    const [searchTerm, setSearchTerm] = useState('');
    const [filterProgramme, setFilterProgramme] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterAgent, setFilterAgent] = useState(''); // Marketing Agent Filter
    const [dateRange, setDateRange] = useState({ start: '', end: '' }); // Date Filter
    const [filterMarketingAgent, setFilterMarketingAgent] = useState('');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const [studentInfo, setStudentInfo] = useState({ name: '', payCode: '', admissionDate: '', marketingAgent: '' });
    const [enrollmentData, setEnrollmentData] = useState({
        id: null as number | null,
        programme: '',
        entryLevel: '',
        selectedServices: [] as string[],
        previousBalance: 0
    });
    const [selectedBursary, setSelectedBursary] = useState('none');

    // const [showRequirements, setShowRequirements] = useState(false); // MOVED UP
    // const [studentRequirements, setStudentRequirements] = useState<any[]>([]);

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'payCode', 'programme', 'semester', 'status', 'prevBal', 'totalDue', 'action']);
    const [showColumnToggle, setShowColumnToggle] = useState(false);


    // Promotion History View State
    const [historyViewStudent, setHistoryViewStudent] = useState<any | null>(null);
    const isInitialLoad = useRef(true);
    const [modalStudentId, setModalStudentId] = useState<number | null>(null);
    const [showRequirements, setShowRequirements] = useState(true); // Default to TRUE
    const [studentRequirements, setStudentRequirements] = useState<any[]>([]);
    const [historyLimit, setHistoryLimit] = useState(50);


    // --- PRE-FILLING LOGIC ---
    useEffect(() => {
        const name = searchParams.get('name');
        const payCode = searchParams.get('payCode');
        const course = searchParams.get('course');
        const level = searchParams.get('entryLevel');
        const agent = searchParams.get('marketingAgent'); // Capture Agent

        if (name && payCode) {
            setStudentInfo({
                name,
                payCode,
                admissionDate: new Date().toISOString().split('T')[0],
                marketingAgent: agent || '' // Set Agent
            });
            // Auto-select programme and entry level if available
            if (course) {
                setEnrollmentData(prev => ({ ...prev, programme: course }));
            }
            if (level) {
                setEnrollmentData(prev => ({ ...prev, entryLevel: level }));
            }
            setViewMode('form');
        }

        const view = searchParams.get('view');
        if (view === 'pending') setViewMode('pending');
    }, [searchParams]);

    // Semester Progression Helper
    const getNextSemester = (current: string) => {
        // Find current programme levels
        const currentProg = programmes.find(p => p.name === enrollmentData.programme);
        const levels = currentProg?.levels || ["Year 1, Semester 1", "Year 1, Semester 2"]; // Default if not found
        const currentIndex = levels.indexOf(current);
        if (currentIndex === -1 || currentIndex === levels.length - 1) return current;
        return levels[currentIndex + 1];
    };

    const toggleColumn = (col: string) => {
        setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    };

    // Selection Logic
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = (students: any[]) => {
        if (selectedIds.length === students.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(students.map(s => s.id));
        }
    };

    // Bulk Actions
    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} enrollments? This will cascade to all related payments and billings.`)) {
            deleteStudents(selectedIds);
            setSelectedIds([]);
            alert("Enrollments and associated records deleted.");
        }
    };

    const handleBulkDeactivate = () => {
        if (!confirm(`Deactivate ${selectedIds.length} students? They will be moved to the Deactivated tab.`)) return;
        setEnrolledStudents(prev => prev.map(s =>
            selectedIds.includes(s.id) ? { ...s, status: 'deactivated' } : s
        ));
        setSelectedIds([]);
        alert("Students deactivated.");
    };

    const handleBulkTransition = (type: 'programme' | 'semester') => {
        const newValue = prompt(`Select new ${type}:`);
        if (!newValue) return;

        setEnrolledStudents(prev => prev.map(s => {
            if (selectedIds.includes(s.id)) {
                const targetProg = type === 'programme' ? newValue : s.programme;
                const targetLevel = type === 'semester' ? newValue : s.semester;

                // USE CENTRALIZED LOGIC
                const financials = calculateStudentInitialFinancials(targetProg, targetLevel);

                return {
                    ...s,
                    [type]: newValue,
                    balance: financials.totalFees,
                    totalFees: financials.totalFees,
                    services: financials.compulsoryServices,
                    physicalRequirements: financials.physicalRequirements,
                    previousBalance: 0
                };
            }
            return s;
        }));
        setSelectedIds([]);
        alert("Bulk transition completed. Financial targets and requirements reset for selected students based on new structure.");
    };

    const handleBulkPromote = () => {
        if (!confirm(`Promote ${selectedIds.length} students to the next semester? Balances will be carried over as Arrears.`)) return;

        const updatedStudents: any[] = []; // Track promoted students for billing
        let graduationReadyCount = 0;

        setEnrolledStudents(prev => prev.map(s => {
            if (selectedIds.includes(s.id)) {
                const nextSem = getNextSemester(s.semester);

                if (nextSem === s.semester) {
                    graduationReadyCount++;
                    return s;
                }

                // Create history entry with current balance
                const historyEntry = {
                    date: new Date().toISOString().split('T')[0],
                    fromSemester: s.semester,
                    toSemester: nextSem,
                    previousBalance: s.balance,
                    newBalance: s.balance // Will be updated by billing generation
                };

                const updated = {
                    ...s,
                    semester: nextSem,
                    previousBalance: s.balance,
                    promotionHistory: [historyEntry, ...(s.promotionHistory || [])]
                };

                updatedStudents.push(updated);
                return updated;
            }
            return s;
        }));

        // Trigger Automatic Billing for Promoted Students
        setTimeout(() => {
            updatedStudents.forEach(s => generateLocalBillings(s));
        }, 100);

        setSelectedIds([]);

        let msg = "PROMOTION COMPLETE: Students moved to next level and balances carried over as Arrears.";
        if (graduationReadyCount > 0) {
            msg += `\n\n⚠️ ${graduationReadyCount} students are already in their FINAL LEVEL. Use 'Bulk Graduate' to move them to archives.`;
        }
        alert(msg);
    };

    const handleBulkGraduate = () => {
        if (!confirm(`Mark ${selectedIds.length} students as GRADUATED? They will be moved to the Archive tab.`)) return;
        setEnrolledStudents(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status: 'graduated' } : s));
        setSelectedIds([]);
        alert("Selected students marked as Graduated.");
    };

    const handleReactivate = (id: number) => {
        if (!confirm("Reactivate this student account? Balance will be restored to active totals.")) return;
        setEnrolledStudents(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
        alert("Account reactivated.");
    };

    const handleReversePromotion = (studentId: number, silent = false) => {
        if (!silent && !confirm(`Reverse the last promotion for this student? academic level and balance will be restored.`)) return;

        setEnrolledStudents(prev => prev.map(s => {
            if (s.id === studentId && s.promotionHistory && s.promotionHistory.length > 0) {
                const [lastPromotion, ...remainingHistory] = s.promotionHistory;
                return {
                    ...s,
                    semester: lastPromotion.fromSemester,
                    balance: lastPromotion.previousBalance,
                    promotionHistory: remainingHistory
                };
            }
            return s;
        }));
        if (!silent) {
            alert("Promotion reversed.");
            setHistoryViewStudent(null);
        }
    };

    const handleBulkReversePromotion = () => {
        if (!confirm(`Reverse promotions for ${selectedHistoryIds.length} students?`)) return;
        selectedHistoryIds.forEach(id => handleReversePromotion(id, true));
        setSelectedHistoryIds([]);
        alert("Bulk reversal completed.");
    };

    const handleDeleteAccount = (id: number) => {
        if (confirm("Permanently delete this enrollment? This will cascade to payments and billings.")) {
            deleteStudent(id); // Use store action
            setViewMode('list');
            alert("Enrollment and associated records deleted.");
        }
    };

    // Parse URL params for pre-filling
    useEffect(() => {
        const name = searchParams.get('name');
        const payCode = searchParams.get('payCode');
        const course = searchParams.get('course');
        const entryLevel = searchParams.get('entryLevel');
        const agent = searchParams.get('marketingAgent');

        if (name && viewMode === 'list') {
            setStudentInfo({
                name: name,
                payCode: payCode || 'N/A',
                admissionDate: new Date().toISOString().split('T')[0],
                marketingAgent: agent || '' // Pre-fill agent
            });
            const level = entryLevel || '';
            setEnrollmentData({
                id: null,
                programme: course || '',
                entryLevel: level,
                selectedServices: [],
                previousBalance: 0
            });
            setSelectedBursary('none');

            // Requirements are properly initialized by the dependency effect below based on selected programme
            setStudentRequirements([]);

            setViewMode('form');
            setIsEditing(true); // New enrollment from Admissions is always edit mode
        }
    }, [searchParams]);

    // Update requirements when programme/level changes
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (viewMode === 'form' && enrollmentData.programme) {
            const prog = programmes.find(p => p.name === enrollmentData.programme);
            if (prog && prog.feeStructure) {
                // In a real app, you might map specific requirements per level.
                // For now, we take requirements from the first fee structure item as a generic set,
                // or filter by the selected level if structure matches 'year' to level name.
                const feeStruct = prog.feeStructure.find(fs => fs.level === enrollmentData.entryLevel) || prog.feeStructure[0];

                if (feeStruct && feeStruct.requirements) {
                    setStudentRequirements(feeStruct.requirements.map(r => ({
                        name: r.name,
                        required: r.quantity,
                        brought: 0,
                        color: '#3b82f6'
                    })));
                }
            }
        }
    }, [enrollmentData.programme, enrollmentData.entryLevel]);

    const handleServiceToggle = (serviceId: string) => {
        setEnrollmentData(prev => {
            const exists = prev.selectedServices.includes(serviceId);
            if (exists) {
                return { ...prev, selectedServices: prev.selectedServices.filter(id => id !== serviceId) };
            } else {
                return { ...prev, selectedServices: [...prev.selectedServices, serviceId] };
            }
        });
    };

    const handleRequirementIncrement = (index: number) => {
        setStudentRequirements(prev => prev.map((req, i) =>
            i === index ? { ...req, brought: req.brought + 1 } : req
        ));
    };

    const handleRequirementReset = (e: React.MouseEvent, index: number) => {
        e.stopPropagation(); // Prevent incrementing when clicking reset
        setStudentRequirements(prev => prev.map((req, i) =>
            i === index ? { ...req, brought: 0 } : req
        ));
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value, type } = e.target;
        // Treat previousBalance as number even if input type is text (to prevent scroll/arrow changes)
        const isNumericField = type === 'number' || name === 'previousBalance';

        setEnrollmentData(prev => ({
            ...prev,
            [name]: isNumericField ? (isNaN(parseFloat(value.replace(/,/g, ''))) ? 0 : parseFloat(value.replace(/,/g, ''))) : value
        }));
    };

    const handleEdit = (student: any) => {
        isInitialLoad.current = true;
        setStudentInfo({
            name: student.name,
            payCode: student.payCode,
            admissionDate: 'N/A',
            marketingAgent: ''
        });
        setEnrollmentData({
            id: student.id,
            programme: student.programme,
            entryLevel: student.semester,
            selectedServices: student.services || [],
            previousBalance: student.previousBalance || 0
        });
        setSelectedBursary(student.bursary || 'none');

        // Load Requirements
        // 1. Try to use saved requirements on student
        // 2. Fallback to Store configuration for that Programme & Level
        if (student.physicalRequirements && student.physicalRequirements.length > 0) {
            setStudentRequirements(student.physicalRequirements);
        } else {
            const prog = programmes.find(p => p.name === student.programme);
            if (prog && prog.feeStructure) {
                const feeStruct = prog.feeStructure.find(fs => fs.level === student.semester);
                // Fallback to first structure if exact level match fails (e.g. if level names changed)
                const targetStruct = feeStruct || prog.feeStructure[0];

                if (targetStruct && targetStruct.requirements) {
                    setStudentRequirements(targetStruct.requirements.map(r => ({
                        name: r.name,
                        required: r.quantity,
                        brought: 0,
                        color: '#3b82f6' // Default blue
                    })));
                } else {
                    setStudentRequirements([]);
                }
            } else {
                setStudentRequirements([]);
            }
        }

        setViewMode('form');
        setIsEditing(true);
    };

    // --- DYNAMIC CALCULATIONS ---
    const getSelectedProgramme = () => programmes.find(p => p.name === enrollmentData.programme);

    // Get Fee Structure for the selected Level
    const getLevelFeeStructure = () => {
        const prog = getSelectedProgramme();
        if (!prog || !prog.feeStructure) return null;
        return prog.feeStructure.find(f => f.level === enrollmentData.entryLevel);
    };

    const feeStruct = getLevelFeeStructure();

    const getProgrammeFee = () => feeStruct?.tuitionFee || 0;

    // "Semester Fee" / "Functional Fees" - usually part of tuition or separate? 
    // In our dynamic store "FeeStructureItem" has "tuitionFee". 
    // The previous mock had "base" (tuition) AND "SEMESTER_FEES". 
    // If the user wants separate semester fees, they should be in the store model. 
    // For now, we assume `tuitionFee` covers the base cost for that semester/level.
    const getSemesterFee = () => 0; // Deprecated separate semester fee, using Tuition Fee from structure

    const getCompulsoryData = () => {
        // In store, `FeeStructureItem` has `compulsoryServices` (IDs).
        // We need to resolve these IDs to names/costs if they are Services, but the mock structure
        // was {items: string[], cost: number }.
        // The Store `FeeStructureItem` has `compulsoryServices: string[]`. These exist in `services`.
        // Let's calculate the cost of compulsory services.
        if (!feeStruct || !feeStruct.compulsoryServices) return { items: [], cost: 0 };

        const compServices = services.filter(s => feeStruct.compulsoryServices.includes(s.id));
        const cost = compServices.reduce((sum, s) => sum + s.cost, 0);
        return { items: compServices.map(s => s.name), cost };
    };

    const getCompulsoryFee = () => getCompulsoryData().cost;

    const getBursaryDiscount = () => {
        const scheme = bursaries.find(b => b.id === selectedBursary);
        // Store Bursary interface: {id, name, value} - value is fixed amount.
        // Previous mock used percentage. 
        // If the store only holds fixed value, we subtract it directly.
        // Assuming `value` is the amount to deduct.
        return scheme ? scheme.value : 0;
    };

    const getServicesTotal = () => {
        const compulsoryIds = feeStruct?.compulsoryServices || [];

        return enrollmentData.selectedServices.reduce((total, id) => {
            // Exclude if it is currently compulsory
            if (compulsoryIds.includes(id)) return total;

            const s = services.find(srv => srv.id === id); // Use global services
            return total + (s ? s.cost : 0);
        }, 0);
    };

    const grandTotal = (getProgrammeFee() - getBursaryDiscount()) + getCompulsoryFee() + getServicesTotal() + enrollmentData.previousBalance;

    const generateLocalBillings = (student: any) => {
        const currentDate = new Date().toISOString();
        const prog = programmes.find(p => p.name === student.programme);
        const feeStruct = prog?.feeStructure?.find(fs => fs.level === student.semester) || prog?.feeStructure?.[0];
        const tuition = feeStruct?.tuitionFee || 0;

        // 1. Arrears (Balance Brought Forward)
        if (student.previousBalance > 0) {
            addBilling({
                id: crypto.randomUUID(),
                studentId: student.id,
                programmeId: prog?.id || 'unknown',
                level: student.semester,
                term: student.semester,
                type: 'Balance Brought Forward',
                description: `Arrears from previous semester (${student.promotionHistory?.[0]?.fromSemester || 'Prev'})`,
                amount: student.previousBalance,
                paidAmount: 0,
                balance: student.previousBalance,
                date: currentDate,
                status: 'Pending',
                history: [],
                isBroughtForward: true // Explicit Flag
            });
        }

        // 2. Tuition
        if (tuition > 0) {
            addBilling({
                id: crypto.randomUUID(),
                studentId: student.id,
                programmeId: prog?.id || 'unknown',
                level: student.semester,
                term: student.semester,
                type: 'Tuition',
                description: `Tuition Fee - ${student.semester}`,
                amount: tuition,
                paidAmount: 0,
                balance: tuition,
                date: currentDate,
                status: 'Pending',
                history: []
            });
        }

        // 2. Services
        student.services.forEach((sid: string) => {
            const s = services.find(srv => srv.id === sid);
            if (s) {
                addBilling({
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    programmeId: prog?.id || 'unknown',
                    level: student.semester,
                    term: student.semester,
                    type: 'Service',
                    description: `${s.name} - ${student.semester}`,
                    amount: s.cost,
                    paidAmount: 0,
                    balance: s.cost,
                    date: currentDate,
                    status: 'Pending',
                    history: []
                });
            }
        });
    };

    const handleEnrollSubmit = () => {
        const newStudentId = Date.now(); // Capture ID for consistency
        if (!enrollmentData.programme || !enrollmentData.entryLevel) {
            alert("Please select both a Programme and a Semester.");
            return;
        }

        if (enrollmentData.id) {
            setEnrolledStudents(prev => prev.map(s => s.id === enrollmentData.id ? {
                ...s,
                programme: enrollmentData.programme,
                semester: enrollmentData.entryLevel,
                services: enrollmentData.selectedServices,
                bursary: selectedBursary,
                previousBalance: enrollmentData.previousBalance,
                balance: grandTotal,
                physicalRequirements: studentRequirements
            } : s));
            alert("Enrollment details updated!");
        } else {
            // Check for duplicate enrollment (by Pay Code)
            const isDuplicate = enrolledStudents.some(s => s.payCode === studentInfo.payCode && s.origin === 'bursar');
            if (isDuplicate) {
                alert(`Student with Pay Code ${studentInfo.payCode} is already enrolled.`);
                return;
            }

            // MERGE SERVICES: Compulsory + Selected (Unique)
            const prog = programmes.find(p => p.name === enrollmentData.programme);
            const feeStruct = prog?.feeStructure?.find(fs => fs.level === enrollmentData.entryLevel) || prog?.feeStructure?.[0];
            const tuition = feeStruct?.tuitionFee || 0;
            const compulsoryServiceIds = feeStruct?.compulsoryServices || [];

            // Final Services Array (Compulsory + Selected)
            const allServices = Array.from(new Set([...compulsoryServiceIds, ...enrollmentData.selectedServices]));

            // GENERATE COMPASS NUMBER
            const existingCompassNumbers = enrolledStudents
                .map(s => parseInt(s.compassNumber || '0', 10))
                .filter(n => !isNaN(n));
            const maxCompass = existingCompassNumbers.length > 0 ? Math.max(...existingCompassNumbers) : 0;
            const nextCompassNumber = String(maxCompass + 1).padStart(3, '0');

            // 1. Add Student to State
            const newStudent = {
                id: newStudentId,
                name: studentInfo.name.toUpperCase(),
                payCode: studentInfo.payCode,
                programme: enrollmentData.programme,
                semester: enrollmentData.entryLevel,
                balance: 0, // Balance will be updated by billing generation
                totalFees: 0, // Total fees will be updated by billing generation
                services: allServices, // ENSURE SUBSCRIPTION
                bursary: selectedBursary,
                previousBalance: enrollmentData.previousBalance,
                physicalRequirements: studentRequirements,
                status: 'active' as const,
                level: enrollmentData.entryLevel, // Added required field
                origin: 'bursar' as const, // Tag as Bursar Enrollment
                compassNumber: nextCompassNumber // Auto-generated Compass Number
            };

            setEnrolledStudents(prev => [newStudent, ...prev]);

            // 2. Billing Generation is handled automatically by the store function
            // We pass the student object with the correct services and programme

            // REMOVED TIMEOUT: Execute immediately to ensure data consistency
            try {
                generateLocalBillings(newStudent);
            } catch (err) {
                console.error("Auto-billing failed:", err);
            }

            // 3. AUTO-SYNC: Check for pending/unsynced transactions for this paycode
            // We scan generalTransactions for any income items that match the PayCode
            const pendingMatches = generalTransactions.filter(t =>
                t.type === 'Income' &&
                (t.description.includes(newStudent.payCode) || (t as any).reference?.includes(newStudent.payCode))
            );

            // Also check for the specific DEMO mock ID from PaymentModes if it leaked/persisted (simulated)
            // Ideally, we'd have a 'pendingSyncs' store. For this demo, we can simulate finding one if the PayCode matches our test case.
            const isDemoMatch = newStudent.payCode === '1000000111' || newStudent.payCode === '2000000222';

            if (pendingMatches.length > 0 || isDemoMatch) {
                const count = pendingMatches.length || 1; // Default to 1 for the demo case

                // Convert matched general txs to payments
                pendingMatches.forEach(tx => {
                    const syncedPayment: any = {
                        id: crypto.randomUUID(),
                        studentId: newStudent.id,
                        amount: tx.amount,
                        date: tx.date,
                        method: tx.mode || 'SchoolPay',
                        reference: (tx as any).reference || 'REF-SYNC',
                        receiptNumber: `RCP-SYNC-${Date.now().toString().slice(-4)}`,
                        recordedBy: 'Auto-Sync',
                        description: `Auto-Synced: ${tx.description}`,
                        term: newStudent.semester,
                        status: 'approved',
                        allocations: { 'Tuition Fees': tx.amount },
                        history: []
                    };
                    addPayment(syncedPayment);
                    if (deleteGeneralTransaction) deleteGeneralTransaction(tx.id);
                });

                // If it was the demo case and no real generalTxs found, we simulate the add
                if (pendingMatches.length === 0 && isDemoMatch) {
                    // Determine amount/ref based on code
                    const isDemo2 = newStudent.payCode === '2000000222';
                    addPayment({
                        id: crypto.randomUUID(),
                        studentId: newStudent.id,
                        amount: isDemo2 ? 250000 : 150000,
                        date: new Date().toISOString(),
                        method: 'SchoolPay',
                        reference: isDemo2 ? 'UNCLAIMED-002' : 'UNCLAIMED-001',
                        receiptNumber: `RCP-SYNC-DEMO`,
                        recordedBy: 'Auto-Sync',
                        description: `Auto-Synced: Payment from ${isDemo2 ? 'Unknown' : '0770000000'}`,
                        term: newStudent.semester,
                        status: 'approved',
                        allocations: { 'Tuition Fees': isDemo2 ? 250000 : 150000 },
                        history: []
                    });
                }

                // Alert user of the convenience feature
                setTimeout(() => alert(`ℹ️ AUTOMATIC SYNC: Found and linked ${count} pending transaction(s) to ${newStudent.name}'s history.`), 500);
            }

            // Close screen immediately, then alert
            setViewMode('list');
            setTimeout(() => alert("ENROLLMENT SUCCESSFUL!"), 100);
        }


        setViewMode('list');
        router.replace('/bursar/enrollment');
    };

    // ACTIVE STUDENTS FILTER
    const filteredStudents = enrolledStudents.filter(s => {
        // STRICT SEPARATION: Only show Bursar Enrollments
        if (s.origin !== 'bursar') return false;

        const matchesTerm = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.payCode.includes(searchTerm);
        const matchesProgramme = filterProgramme ? s.programme === filterProgramme : true;
        const matchesSemester = filterSemester ? s.semester === filterSemester : true;
        const matchesAgent = filterAgent ? (s.marketingAgent || '').toLowerCase().includes(filterAgent.toLowerCase()) : true;
        const matchesDate = (dateRange.start || dateRange.end) ? (() => {
            // Use enrollment date or fallback to admission/today if missing
            const dStr = s.enrollmentDate || (s as any).admissionDate || '';
            if (!dStr) return true; // Keep if no date?? Or exclude? Usually include.
            const date = new Date(dStr).getTime();
            if (dateRange.start && date < new Date(dateRange.start).getTime()) return false;
            if (dateRange.end && date > new Date(dateRange.end).getTime()) return false;
            return true;
        })() : true;

        // ONLY SHOW ACTIVE HERE
        return s.status === 'active' && matchesTerm && matchesProgramme && matchesSemester && matchesAgent && matchesDate;
    });

    // ARCHIVED (Graduated & Deactivated) FILTER
    const archivedStudents = enrolledStudents.filter(s => s.status === 'graduated' || s.status === 'deactivated');
    const [archiveFilter, setArchiveFilter] = useState<{ status: string, name: string }>({ status: 'all', name: '' });

    const filteredArchived = archivedStudents.filter(s => {
        const matchesStatus = archiveFilter.status === 'all' ? true : s.status === archiveFilter.status;
        const matchesName = s.name.toLowerCase().includes(archiveFilter.name.toLowerCase()) || s.payCode.includes(archiveFilter.name);
        return matchesStatus && matchesName;
    });

    // Balances
    const archivedBalance = archivedStudents.reduce((sum, s) => sum + s.balance, 0);

    const totalBalance = filteredStudents.reduce((sum, s) => sum + s.balance, 0);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ["Student Name", "Pay Code", "Programme", "Semester", "Agent", "Status", "Prev. Bal", "Total Due"];
        const rows = filteredStudents.map(s => [
            `"${s.name}"`,
            `"${s.payCode}"`,
            `"${s.programme}"`,
            `"${s.semester}"`,
            `"${s.marketingAgent || '-'}"`,
            `"${s.status.toUpperCase()}"`,
            s.previousBalance || 0,
            s.balance
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `enrollment_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    /* RESET LAYOUT OFFSETS */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                    }
                    /* Remove the 250px margin from layout.tsx */
                    main {
                        margin-left: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                    /* HIDE SIDEBAR & OTHERS */
                    aside, .sidebar, [style*="margin-left: 250px"] {
                        display: none !important;
                    }
                    
                    body * {
                        visibility: hidden !important;
                    }
                    /* SHOW REPORT */
                    #printable-section, #printable-section * {
                        visibility: visible !important;
                    }
                    #printable-section {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: block !important;
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        z-index: 9999;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    
                    /* TABLE OPTIMIZATION */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 25px !important;
                    }
                    th, td {
                        border: 1pt solid #000 !important;
                        padding: 10pt 12pt !important;
                        font-size: 11pt !important;
                        line-height: 1.5 !important;
                        word-wrap: break-word !important;
                        color: black !important;
                    }
                    th {
                        background-color: #f0f0f0 !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                    }

                    /* Balanced column widths */
                    th:nth-child(1), td:nth-child(1) { width: 22%; }
                    th:nth-child(2), td:nth-child(2) { width: 14%; }
                    th:nth-child(3), td:nth-child(3) { width: 22%; }
                    th:nth-child(4), td:nth-child(4) { width: 18%; }
                    th:nth-child(5), td:nth-child(5) { width: 12%; text-align: right; }
                    th:nth-child(6), td:nth-child(6) { width: 12%; text-align: right; }
                    
                    h2 { font-size: 24pt !important; margin-bottom: 8pt !important; }
                    h3 { font-size: 16pt !important; margin-top: 15pt !important; }
                    p { font-size: 11pt !important; color: black !important; }
                }
            `}</style>

            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setViewMode('list')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'none',
                        color: 'white',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: viewMode === 'list' ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'list' ? 'bold' : 'normal'
                    }}
                >
                    Active Enrollments
                </button>
                <button
                    onClick={() => setViewMode('archive')}
                    style={{
                        padding: '1rem 0.5rem',
                        background: 'none',
                        color: viewMode === 'archive' ? 'white' : 'rgba(255,255,255,0.4)',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: viewMode === 'archive' ? '2px solid #ef4444' : 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    GRADUATED & DEACTIVATED
                </button>
            </div>


            <header className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Enrollment Management</h1>
                    <p className="text-sm md:text-base text-slate-400">Manage active enrollments and billing.</p>
                </div>
                {viewMode === 'list' && (
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowColumnToggle(!showColumnToggle)} className="btn btn-outline touch-target flex items-center gap-2 text-sm">
                                👁️ Columns
                            </button>
                            {showColumnToggle && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '1rem', zIndex: 1000, minWidth: '200px', marginTop: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>SHOW COLUMNS</div>
                                    {[
                                        { id: 'name', label: 'Student Name' },
                                        { id: 'payCode', label: 'Pay Code' },
                                        { id: 'programme', label: 'Programme' },
                                        { id: 'semester', label: 'Semester' },
                                        { id: 'status', label: 'Status' },
                                        { id: 'marketingAgent', label: 'Agent' },
                                        { id: 'prevBal', label: 'Prev. Bal' },
                                        { id: 'totalDue', label: 'Total Due' },
                                        { id: 'action', label: 'Action' }
                                    ].map(col => (
                                        <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={visibleColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} />
                                            {col.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-800/50 p-2 md:p-3 rounded-lg border border-slate-700">
                            <span className="text-[10px] md:text-xs uppercase tracking-wider opacity-70 block">Total Balance</span>
                            <div className="text-base md:text-lg font-bold text-red-500">UGX {totalBalance.toLocaleString()}</div>
                        </div>
                        <div className="bg-orange-500/10 p-2 md:p-3 rounded-lg border border-orange-500/25">
                            <span className="text-[10px] md:text-xs uppercase tracking-wider text-orange-500 opacity-90 block">Recoverable Debt</span>
                            <div className="text-base md:text-lg font-bold text-orange-500">UGX {archivedBalance.toLocaleString()}</div>
                        </div>
                        <button onClick={handleExportCSV} className="btn btn-outline touch-target flex items-center gap-2 text-sm border-green-500 text-green-500">
                            <span>📊</span> <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button onClick={handlePrint} className="btn btn-outline touch-target flex items-center gap-2 text-sm">
                            <span>🖨️</span> <span className="hidden sm:inline">Print</span>
                        </button>
                    </div>
                )}
                {viewMode === 'form' && (
                    <button onClick={() => setViewMode('list')} className="btn btn-outline">Back to List</button>
                )}
            </header>

            {viewMode === 'pending' && (
                <div className="card animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Pending Enrollments</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Admitted students ready to be enrolled.</p>
                        </div>
                        {selectedPendingIds.length > 0 && (
                            <button onClick={handleBatchEnroll} className="btn btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e' }}>
                                Enroll {selectedPendingIds.length} Selected
                            </button>
                        )}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'hsl(var(--muted))', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPendingIds.length === pendingStudents.length && pendingStudents.length > 0}
                                        onChange={() => setSelectedPendingIds(selectedPendingIds.length === pendingStudents.length ? [] : pendingStudents.map(s => s.id))}
                                    />
                                </th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Pay Code</th>
                                <th style={{ padding: '1rem' }}>Programme</th>
                                <th style={{ padding: '1rem' }}>Entry Level</th>
                                <th style={{ padding: '1rem' }}>Date Admitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingStudents.map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPendingIds.includes(s.id)}
                                            onChange={() => setSelectedPendingIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.name}</td>
                                    <td style={{ padding: '1rem' }}>{s.schoolPayCode || s.payCode}</td>
                                    <td style={{ padding: '1rem' }}>{s.programme || s.course}</td>
                                    <td style={{ padding: '1rem' }}>{s.entryClass || s.entryLevel}</td>
                                    <td style={{ padding: '1rem' }}>{s.admissionDate}</td>
                                </tr>
                            ))}
                            {pendingStudents.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No pending enrollments. All admitted students are enrolled.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}



            {
                viewMode === 'archive' && (
                    <div className="card animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Graduated & Deactivated Students</h3>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Manage past and inactive student records.</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Graduated Balance</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatMoney(archivedBalance)}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'hsl(var(--muted))', padding: '1rem', borderRadius: 'var(--radius)' }}>
                            <select
                                value={archiveFilter.status}
                                onChange={(e) => setArchiveFilter({ ...archiveFilter, status: e.target.value })}
                                className="input"
                                style={{ background: 'hsl(var(--background))', color: 'white', border: '1px solid hsl(var(--border))', padding: '0.5rem' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="graduated">Graduated</option>
                                <option value="deactivated">Deactivated</option>
                            </select>
                            <input
                                placeholder="Search Name or Pay Code..."
                                value={archiveFilter.name}
                                onChange={(e) => setArchiveFilter({ ...archiveFilter, name: e.target.value })}
                                className="input"
                                style={{ background: 'hsl(var(--background))', color: 'white', border: '1px solid hsl(var(--border))', padding: '0.5rem', minWidth: '300px' }}
                            />
                        </div>

                        <div className="overflow-x-auto -mx-4 md:mx-0 custom-scrollbar">
                            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'hsl(var(--muted))', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Pay Code</th>
                                        <th style={{ padding: '1rem' }}>Programme</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Outstanding Balance</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredArchived.map(s => (
                                        <tr
                                            key={s.id}
                                            style={{ borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onClick={() => setModalStudentId(s.id)}
                                            onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(var(--muted))'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.name}</td>
                                            <td style={{ padding: '1rem' }}>{s.payCode}</td>
                                            <td style={{ padding: '1rem' }}>{s.programme}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    background: s.status === 'graduated' ? '#3b82f6' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {s.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: s.balance > 0 ? '#ef4444' : '#22c55e' }}>
                                                {formatMoney(s.balance)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleReactivate(s.id)}
                                                    className="btn btn-outline"
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                                                >
                                                    Reactivate
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredArchived.length === 0 && (
                                        <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                viewMode === 'list' && (
                    <div id="printable-section" className="card" style={{ position: 'relative', paddingBottom: selectedIds.length > 0 ? '5rem' : '1rem' }}>
                        {/* Print Only Header ... */}
                        <div className="print-only" style={{ display: 'none', marginBottom: '2rem' }}>
                            {/* (Keeping print header as is) */}
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '20pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', color: 'black' }}>VINE EDUCATIONAL INSTITUTE</h2>
                                <p style={{ margin: '5px 0', fontSize: '10pt', color: 'black' }}>P.O. Box 7078, KAMPALA | Tel: +256 700 123456</p>
                                <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '10px', color: 'black' }}>OFFICIAL ENROLLMENT & BALANCES REPORT</h3>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', border: '1px solid #000', padding: '10px', color: 'black' }}>
                                <div>
                                    <strong>Filters:</strong> {filterProgramme || 'All Programmes'} / {filterSemester || 'All Semesters'}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                                    <strong>Outstanding:</strong> UGX {totalBalance.toLocaleString()}
                                </div>
                            </div>
                        </div>


                        <div className="md:hidden no-print mb-3">
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 text-sm"
                            >
                                {showMobileFilters ? '✕ Close Filters' : '🔍 Filter & Search Students'}
                            </button>
                        </div>

                        <div className={`${showMobileFilters ? 'flex' : 'hidden'} md:flex no-print flex-col md:flex-row flex-wrap gap-2 md:gap-4 mb-3 md:mb-6`}>
                            <input
                                placeholder="Search Name/Pay Code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                list="student-suggestions"
                                className="input w-full md:flex-1 md:min-w-[200px] touch-target px-3 py-2.5 md:py-2 bg-slate-900 text-white border border-slate-700 rounded-lg text-sm"
                            />
                            <datalist id="student-suggestions">
                                {enrolledStudents.map(s => (
                                    <option key={s.id} value={s.name} />
                                ))}
                            </datalist>

                            <input
                                placeholder="Marketing Agent..."
                                value={filterAgent}
                                onChange={(e) => setFilterAgent(e.target.value)}
                                list="agent-suggestions"
                                className="input w-full md:w-auto touch-target px-3 py-2.5 md:py-2 bg-slate-900 text-white border border-slate-700 rounded-lg text-sm"
                            />
                            <datalist id="agent-suggestions">
                                {Array.from(new Set(enrolledStudents.map(s => s.marketingAgent).filter(Boolean))).map(a => (
                                    <option key={a} value={a} />
                                ))}
                            </datalist>

                            <select value={filterProgramme} onChange={(e) => setFilterProgramme(e.target.value)} className="input w-full md:w-auto touch-target px-3 py-2.5 md:py-2 bg-slate-800 text-white rounded-lg text-sm">
                                <option value="">All Programmes</option>
                                {programmes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>

                            <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="input w-full md:w-auto touch-target px-3 py-2.5 md:py-2 bg-slate-800 text-white rounded-lg text-sm">
                                <option value="">All Semesters</option>
                                {(() => {
                                    if (filterProgramme) {
                                        const prog = programmes.find(p => p.name === filterProgramme);
                                        const levels = prog?.levels?.length ? prog.levels : (prog?.feeStructure?.map(fs => fs.level) || []);
                                        return levels.map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>);
                                    }
                                    const allLevels = Array.from(new Set(programmes.flatMap(p => p.levels || p.feeStructure?.map(fs => fs.level) || [])));
                                    return allLevels.sort().map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>);
                                })()}
                            </select>

                            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-2.5 md:py-2 rounded-lg w-full md:w-auto">
                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-transparent border-none text-white text-xs flex-1 outline-none" style={{ minWidth: '40px' }} />
                                <span className="text-white text-xs">→</span>
                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-transparent border-none text-white text-xs flex-1 outline-none" style={{ minWidth: '40px' }} />
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-4 md:mx-0 custom-scrollbar">
                            <table className="w-full min-w-[900px]" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'hsl(var(--muted))' }}>
                                        <th className="no-print" style={{ padding: '0.6rem md:0.8rem', width: '40px' }}>
                                            <input type="checkbox" checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0} onChange={() => toggleSelectAll(filteredStudents)} />
                                        </th>
                                        {visibleColumns.includes('name') && <th style={{ padding: '0.6rem md:0.8rem' }}>Student Name</th>}
                                        {visibleColumns.includes('payCode') && <th style={{ padding: '0.6rem md:0.8rem' }}>Pay Code</th>}
                                        {visibleColumns.includes('programme') && <th style={{ padding: '0.6rem md:0.8rem' }}>Programme</th>}
                                        {visibleColumns.includes('semester') && <th style={{ padding: '0.6rem md:0.8rem' }}>Semester</th>}
                                        {visibleColumns.includes('marketingAgent') && <th style={{ padding: '0.6rem md:0.8rem' }}>Agent</th>}
                                        {visibleColumns.includes('status') && <th style={{ padding: '0.6rem md:0.8rem' }}>Status</th>}
                                        {visibleColumns.includes('prevBal') && <th style={{ padding: '0.6rem md:0.8rem', textAlign: 'right' }}>Prev. Bal</th>}
                                        {visibleColumns.includes('totalDue') && <th style={{ padding: '0.6rem md:0.8rem', textAlign: 'right' }}>Total Due</th>}
                                        {visibleColumns.includes('action') && <th className="no-print" style={{ padding: '0.6rem md:0.8rem' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid hsl(var(--border))', opacity: student.status === 'deactivated' ? 0.5 : 1 }}>
                                            <td className="no-print" style={{ padding: '0.6rem md:0.8rem' }}>
                                                <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} />
                                            </td>
                                            {visibleColumns.includes('name') && (
                                                <td style={{ padding: '0.6rem md:0.8rem' }}>
                                                    <div
                                                        onClick={() => handleEdit(student)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem md:0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#3b82f6', fontSize: '0.9rem md:1rem' }}
                                                    >
                                                        {student.name}
                                                        {student.compassNumber && (
                                                            <span title="Compass Number" style={{
                                                                fontSize: '0.65rem',
                                                                background: '#ec4899',
                                                                color: 'white',
                                                                padding: '1px 4px',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(255,255,255,0.2)'
                                                            }}>
                                                                #{student.compassNumber}
                                                            </span>
                                                        )}
                                                        {student.promotionHistory && student.promotionHistory.length > 0 && (
                                                            <button onClick={(e) => { e.stopPropagation(); setHistoryViewStudent(student); }} title="View Promotion History" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.5 }}>📜</button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('payCode') && <td style={{ padding: '0.6rem md:0.8rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{student.payCode}</td>}
                                            {visibleColumns.includes('programme') && <td style={{ padding: '0.6rem md:0.8rem', fontSize: '0.85rem' }}>{student.programme}</td>}
                                            {visibleColumns.includes('semester') && <td style={{ padding: '0.6rem md:0.8rem', fontSize: '0.8rem' }}>{student.semester}</td>}
                                            {visibleColumns.includes('marketingAgent') && <td style={{ padding: '0.6rem md:0.8rem', fontSize: '0.8rem' }}>{student.marketingAgent || '-'}</td>}
                                            {visibleColumns.includes('status') && (
                                                <td style={{ padding: '0.6rem md:0.8rem' }}>
                                                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: student.status === 'active' ? '#22c55e20' : '#ef444420', color: student.status === 'active' ? '#22c55e' : '#ef4444', border: '1px solid', textTransform: 'uppercase' }}>
                                                        {student.status || 'ACTIVE'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.includes('prevBal') && <td style={{ padding: '0.6rem md:0.8rem', textAlign: 'right', fontSize: '0.85rem' }}>{student.previousBalance?.toLocaleString() || 0}</td>}
                                            {visibleColumns.includes('totalDue') && (
                                                <td style={{ padding: '0.6rem md:0.8rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    {(() => {
                                                        // Dynamic Calculation matching LearnerAccountModal
                                                        const sBillings = billings.filter(b => b.studentId === student.id);
                                                        const sPayments = payments.filter(p => p.studentId === student.id);
                                                        const totalBilled = sBillings.reduce((sum, b) => sum + b.amount, 0);
                                                        const totalPaid = sPayments.reduce((sum, p) => sum + p.amount, 0);
                                                        const bursaryVal = student.bursary !== 'none' ? (bursaries.find(b => b.id === student.bursary)?.value || 0) : 0;
                                                        const outstanding = totalBilled - bursaryVal + (student.previousBalance || 0) - totalPaid;

                                                        return (
                                                            <span style={{ color: outstanding > 0 ? '#ef4444' : '#22c55e' }}>
                                                                {outstanding.toLocaleString()}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns.includes('action') && (
                                                <td className="no-print" style={{ padding: '0.6rem md:0.8rem', textAlign: 'right' }}>
                                                    <button onClick={() => handleEdit(student)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Edit</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* BULK ACTION BAR */}
                        {selectedIds.length > 0 && (
                            <div className="no-print fixed bottom-3 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl p-2.5 md:p-4 rounded-xl md:rounded-full flex flex-col md:flex-row gap-2 md:gap-6 items-stretch md:items-center z-[100] max-w-full md:max-w-max">
                                <div className="border-b md:border-b-0 md:border-r border-slate-700 pb-1.5 md:pb-0 md:pr-4 font-bold text-center md:text-left text-xs md:text-base">
                                    {selectedIds.length} Selected
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    <button onClick={() => router.push('/bursar/enrollment?view=pending')} className="btn btn-primary text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2" style={{ background: '#22c55e', borderColor: '#22c55e' }}>
                                        <span className="hidden sm:inline">Enroll </span>Students
                                    </button>
                                    <button onClick={() => handleBulkTransition('programme')} className="btn btn-outline text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2">
                                        <span className="hidden sm:inline">Change </span>Prog
                                    </button>
                                    <button onClick={() => handleBulkTransition('semester')} className="btn btn-outline text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2">
                                        <span className="hidden sm:inline">Change </span>Level
                                    </button>
                                    <button onClick={handleBulkGraduate} className="btn btn-primary text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2" style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>🎓 <span className="hidden sm:inline">Graduate</span></button>
                                    <button onClick={handleBulkDeactivate} className="btn btn-primary text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>⛔ <span className="hidden sm:inline">Deactivate</span></button>
                                    <button onClick={handleBulkDelete} className="btn btn-primary text-[10px] md:text-sm px-2 py-1.5 md:px-3 md:py-2" style={{ background: '#ef4444', borderColor: '#ef4444' }}>🗑️ <span className="hidden sm:inline">Delete</span></button>
                                </div>
                                <button onClick={() => setSelectedIds([])} className="absolute top-1.5 right-1.5 md:static md:ml-auto bg-transparent border-none text-white opacity-50 hover:opacity-100 text-base p-1 rounded-full">✕</button>
                            </div>
                        )}

                        {/* PROMOTION HISTORY MODAL */}
                        {historyViewStudent && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                                <div className="card" style={{ width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                                    <button onClick={() => setHistoryViewStudent(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem' }}>Promotion History: {historyViewStudent.name}</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {(historyViewStudent.promotionHistory || []).map((h: any, i: number) => (
                                            <div key={i} style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: 'var(--radius)', borderLeft: '4px solid #3b82f6' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{h.fromSemester} → {h.toSemester}</span>
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{h.date}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', opacity: 0.8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>Arrears: UGX {h.previousBalance.toLocaleString()}</div>
                                                    <div>New Total: UGX {h.newBalance.toLocaleString()}</div>
                                                </div>
                                                {i === 0 && (
                                                    <button onClick={() => handleReversePromotion(historyViewStudent.id)} className="btn btn-outline" style={{ marginTop: '0.8rem', width: '100%', color: '#ef4444', borderColor: '#ef4444', fontSize: '0.8rem' }}>
                                                        ⏪ Reverse this Promotion
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {(!historyViewStudent.promotionHistory || historyViewStudent.promotionHistory.length === 0) && (
                                            <p style={{ textAlign: 'center', opacity: 0.5 }}>No promotion history recorded.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {
                viewMode === 'history' && (
                    <div className="card animate-fade-in" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Global Promotion History</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>History Log: Optimized View</span>
                            </div>
                        </div>

                        {/* Global History Table */}
                        {(() => {
                            const allHistory = enrolledStudents.flatMap(student =>
                                (student.promotionHistory || []).map((h: any, i: number) => ({ ...h, studentName: student.name, studentId: student.id, isLatest: i === 0 }))
                            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                            const visibleHistory = allHistory.slice(0, historyLimit);

                            if (viewMode !== 'history') return null;

                            return (
                                <>
                                    <div className="overflow-x-auto custom-scrollbar -mx-4 md:mx-0">
                                        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'hsl(var(--muted))', textAlign: 'left' }}>
                                                    <th style={{ padding: '1rem', width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedHistoryIds.length > 0 && enrolledStudents.filter(s => s.promotionHistory && s.promotionHistory.length > 0).every(s => selectedHistoryIds.includes(s.id))}
                                                            onChange={() => {
                                                                const allHistoryIds = enrolledStudents.filter(s => s.promotionHistory && s.promotionHistory.length > 0).map(s => s.id);
                                                                if (selectedHistoryIds.length === allHistoryIds.length) setSelectedHistoryIds([]);
                                                                else setSelectedHistoryIds(allHistoryIds);
                                                            }}
                                                        />
                                                    </th>
                                                    <th style={{ padding: '1rem' }}>Date</th>
                                                    <th style={{ padding: '1rem' }}>Student Name</th>
                                                    <th style={{ padding: '1rem' }}>From Semester</th>
                                                    <th style={{ padding: '1rem' }}>To Semester</th>
                                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Prev. Balance</th>
                                                    <th style={{ padding: '1rem', textAlign: 'right' }}>New Total</th>
                                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleHistory.map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid hsl(var(--border))', opacity: item.isLatest ? 1 : 0.6 }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            {item.isLatest && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedHistoryIds.includes(item.studentId)}
                                                                    onChange={() => setSelectedHistoryIds(prev => prev.includes(item.studentId) ? prev.filter(id => id !== item.studentId) : [...prev, item.studentId])}
                                                                />
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', opacity: 0.7 }}>{item.date}</td>
                                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.studentName}</td>
                                                        <td style={{ padding: '1rem' }}>{item.fromSemester}</td>
                                                        <td style={{ padding: '1rem' }}>{item.toSemester}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>{item.previousBalance.toLocaleString()}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{item.newBalance.toLocaleString()}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                            {item.isLatest ? (
                                                                <button onClick={() => handleReversePromotion(item.studentId)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#ef4444', borderColor: '#ef4444' }}>
                                                                    Reverse
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>Historic</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {allHistory.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                                            No promotion history records found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {allHistory.length > historyLimit && (
                                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                            <button onClick={() => setHistoryLimit(prev => prev + 50)} className="btn btn-outline" style={{ width: '200px' }}>
                                                Load More History ({allHistory.length - historyLimit} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {selectedHistoryIds.length > 0 && (
                            <div className="no-print animate-slide-up" style={{
                                position: 'fixed',
                                bottom: '2rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'hsl(var(--card))',
                                padding: '1rem 2rem',
                                borderRadius: '100px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                display: 'flex',
                                gap: '2rem',
                                alignItems: 'center',
                                zIndex: 1000,
                                border: '1px solid hsl(var(--border))'
                            }}>
                                <div style={{ color: 'white', fontWeight: 'bold' }}>
                                    {selectedHistoryIds.length} HISTORY ITEMS SELECTED
                                </div>
                                <button
                                    onClick={handleBulkReversePromotion}
                                    className="btn"
                                    style={{ background: '#ef4444', color: 'white' }}
                                >
                                    ↩️ Bulk Reverse
                                </button>
                                <button
                                    onClick={() => setSelectedHistoryIds([])}
                                    className="btn btn-outline"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            {
                viewMode === 'form' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-8">
                        <div className="card p-4 md:p-8">
                            <section style={{ marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))' }}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
                                        <div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Student Name</div>
                                            <div className="text-[1.1rem] md:text-[1.5rem] font-bold">{studentInfo.name.toUpperCase()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Pay Code</div>
                                            <div className="text-[1rem] md:text-[1.2rem]">{studentInfo.payCode}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Marketing Agent</div>
                                            <div className="text-[0.9rem] md:text-[1.1rem]" style={{ color: '#10b981' }}>{studentInfo.marketingAgent || 'N/A'}</div>
                                        </div>
                                    </div>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="btn btn-outline touch-target px-3 py-1.5 text-sm">
                                            Edit Enrollment
                                        </button>
                                    )}
                                </div>
                            </section>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.4rem' }}>Academic Billing</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', opacity: 0.7 }}>Programme</label>
                                        <select
                                            name="programme"
                                            value={enrollmentData.programme}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'white', opacity: isEditing ? 1 : 0.7, fontSize: '0.9rem' }}
                                        >
                                            <option value="">Select Programme</option>
                                            {programmes.map(prog => (
                                                <option key={prog.id} value={prog.name}>{prog.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', opacity: 0.7 }}>Semester / Level</label>
                                        <select
                                            name="entryLevel"
                                            value={enrollmentData.entryLevel}
                                            onChange={handleChange}
                                            disabled={!enrollmentData.programme || !isEditing}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'white', opacity: isEditing ? 1 : 0.7, fontSize: '0.9rem' }}
                                        >
                                            <option value="">Select Semester / Level</option>
                                            {getSelectedProgramme()?.levels?.map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            )) || <option disabled>No levels found for programme</option>}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', opacity: 0.7 }}>Bursary</label>
                                        <select
                                            name="bursary"
                                            value={selectedBursary}
                                            onChange={(e) => setSelectedBursary(e.target.value)}
                                            disabled={!isEditing}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'white', opacity: isEditing ? 1 : 0.7, fontSize: '0.9rem' }}
                                        >
                                            <option value="none">None (Standard Payer)</option>
                                            {bursaries.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} - {formatMoney(b.value)} Off</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', opacity: 0.7 }}>Previous Balance (Arrears)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="previousBalance"
                                            value={enrollmentData.previousBalance}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="input"
                                            style={{ background: 'hsl(var(--background))', color: 'white', padding: '0.7rem', width: '100%', opacity: isEditing ? 1 : 0.7, fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <section style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Compulsory Fees</h3>
                                <div style={{ background: 'hsl(var(--muted))', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                    <ul style={{ listStyle: 'none', fontSize: '0.8rem', padding: 0, margin: 0 }}>
                                        {getCompulsoryData().items.map((it: any) => <li key={it} style={{ marginBottom: '0.2rem' }}>• {it}</li>)}
                                    </ul>
                                    <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: '0.4rem', fontSize: '0.9rem' }}>{formatMoney(getCompulsoryFee())}</div>
                                </div>
                            </section>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.4rem' }}>Optional Services</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {services.filter(s => {
                                        const compulsory = getCompulsoryData().items || [];
                                        return !compulsory.includes(s.name);
                                    }).map(service => (
                                        <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', cursor: isEditing ? 'pointer' : 'default', background: enrollmentData.selectedServices.includes(service.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent', opacity: isEditing ? 1 : 0.7, fontSize: '0.85rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={enrollmentData.selectedServices.includes(service.id)}
                                                disabled={!isEditing}
                                                onChange={() => {
                                                    const exists = enrollmentData.selectedServices.includes(service.id);
                                                    setEnrollmentData(prev => ({
                                                        ...prev,
                                                        selectedServices: exists ? prev.selectedServices.filter(id => id !== service.id) : [...prev.selectedServices, service.id]
                                                    }));
                                                }}
                                            />
                                            <span style={{ flex: 1 }}>{service.name}</span>
                                            <span style={{ fontWeight: 'bold', color: '#10b981' }}>{formatMoney(service.cost)}</span>
                                        </label>
                                    ))}
                                    {services.length === 0 && <div style={{ color: 'gray', fontStyle: 'italic', fontSize: '0.8rem' }}>No optional services available.</div>}
                                </div>
                            </div>

                            <section style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>Physical Requirements</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                                    {studentRequirements.map((req, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleRequirementIncrement(idx)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '10px',
                                                background: `${req.color}15`,
                                                border: `1px solid ${req.color}40`,
                                                cursor: isEditing ? 'pointer' : 'default',
                                                transition: 'all 0.2s ease',
                                                textAlign: 'center',
                                                position: 'relative',
                                                opacity: isEditing ? 1 : 0.7,
                                                minHeight: '80px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center'
                                            }}
                                            className="requirement-card active:scale-95"
                                        >
                                            <button
                                                onClick={(e) => handleRequirementReset(e, idx)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '3px',
                                                    right: '3px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    opacity: 0.3,
                                                    padding: '3px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Reset count"
                                            >
                                                🔄
                                            </button>
                                            <div style={{ fontWeight: '600', marginBottom: '0.2rem', color: req.color, fontSize: '0.8rem' }}>{req.name}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                {req.brought} / {req.required}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.2rem' }}>Tap+1</div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col sm:flex-row gap-3 mt-8">
                                {isEditing && (
                                    <button onClick={handleEnrollSubmit} className="btn btn-primary touch-target py-3 flex-1">
                                        {enrollmentData.id ? 'Save Changes' : 'Confirm Enrollment'}
                                    </button>
                                )}
                                {enrollmentData.id && isEditing && (
                                    <button onClick={() => handleDeleteAccount(enrollmentData.id!)} className="btn btn-outline touch-target py-3" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                                        Delete Student
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ position: 'sticky', top: '2rem' }} className="h-fit">
                            <div className="card p-5 md:p-8 flex flex-col gap-4 md:gap-6">
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>Billing Breakdown</h2>

                                <div className="space-y-2 md:space-y-3 text-sm">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="opacity-70">Tuition</span>
                                        <span>{formatMoney(getProgrammeFee())}</span>
                                    </div>
                                    {selectedBursary !== 'none' && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                            <span className="opacity-70">Bursary Discount</span>
                                            <span>- {formatMoney(getBursaryDiscount())}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                        <span className="opacity-70">Compulsory</span>
                                        <span>{formatMoney(getCompulsoryFee())}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="opacity-70">Optional</span>
                                        <span>{formatMoney(getServicesTotal())}</span>
                                    </div>

                                    <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0.5rem 0' }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold' }}>Arrears</span>
                                        <span>{formatMoney(enrollmentData.previousBalance)}</span>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, marginBottom: '0.25rem' }}>GRAND TOTAL DUE</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#8b5cf6' }}>{formatMoney(grandTotal)}</div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setViewMode('list')} className="btn btn-outline touch-target py-2.5 text-sm">{isEditing ? 'Cancel Edit' : 'Back to List'}</button>
                                    {isEditing && <button onClick={handleEnrollSubmit} className="btn btn-primary touch-target py-3 text-sm">{enrollmentData.id ? 'Save Changes' : 'Confirm Enrollment'}</button>}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }



            {modalStudentId && <LearnerAccountModal studentId={modalStudentId} onClose={() => setModalStudentId(null)} />}
        </div>
    )
}

export default function EnrollmentPage() {
    return (
        <Suspense fallback={<div>Loading Enrollment Data...</div>}>
            <EnrollmentContent />
        </Suspense>
    );
}
