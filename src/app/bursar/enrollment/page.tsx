"use client";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSchoolData, EnrolledStudent, formatMoney, Billing, Payment, Bursary } from '@/lib/store';
import { calculateStudentFinancials as calculateFinancials } from '@/lib/financialCore';
import { LearnerAccountModal } from '@/components/bursar/LearnerAccountModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { MOCK_ENROLLED_STUDENTS } from '../../bursar/sharedData';

// --- MOCK CONSTANTS REMOVED ---
// (Replaced by dynamic store data)

function EnrollmentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { filteredProgrammes: programmes, services, bursaries, hydrated, filteredStudents: enrolledStudents, setStudents: setEnrolledStudents, addBilling, filteredBillings: billings, filteredPayments: payments, addPayment, generalTransactions, deleteGeneralTransaction, deleteStudent, deleteStudents, calculateStudentInitialFinancials, registrarStudents, activeRole, unclaimedPayments } = useSchoolData(); // Use global data
    const isDirector = activeRole === 'Director';

    // Marketing Agent Autocompletion
    const marketingAgentSuggestions = React.useMemo(() => {
        const agents = new Set<string>();
        // Check Admissions
        (registrarStudents || []).forEach(s => { if (s.marketingAgent) agents.add(s.marketingAgent); });
        // Check Active Enrollments
        (enrolledStudents || []).forEach(s => { if (s.marketingAgent) agents.add(s.marketingAgent); });
        return Array.from(agents).sort();
    }, [registrarStudents, enrolledStudents]);



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
        setIsEditing(false); // Existing records are View-Only by default - LOCKED
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
                physicalRequirements: studentRequirements,
                marketingAgent: studentInfo.marketingAgent // Preserve marketing agent on update
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
            const newStudent: EnrolledStudent = {
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
                compassNumber: nextCompassNumber, // Auto-generated Compass Number
                marketingAgent: studentInfo.marketingAgent, // Persist marketing agent
                walletBalance: 0,
                paymentRequests: [],
                tutorSubscriptions: []
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

            // 3. AUTO-SYNC: (REPLACED BY GLOBAL BACKGROUND RECONCILIATION)
            // The global store now automatically detects new students and links matching unclaimed payments.
            const hasPotentialUnclaimed = unclaimedPayments.some(up =>
                up.studentPaymentCode === newStudent.payCode ||
                up.description.includes(newStudent.payCode)
            );

            if (hasPotentialUnclaimed) {
                setTimeout(() => alert(`ℹ️ COMPASS SYNC: Matching payments for PayCode ${newStudent.payCode} were found and are being linked to ${newStudent.name}'s account in the background.`), 1000);
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

        const matchesTerm = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.payCode.includes(searchTerm) ||
            (s.marketingAgent || '').toLowerCase().includes(searchTerm.toLowerCase());
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
    const [archiveFilter, setArchiveFilter] = useState<{ status: string, name: string, agent: string }>({ status: 'all', name: '', agent: '' });

    const filteredArchived = archivedStudents.filter(s => {
        const matchesStatus = archiveFilter.status === 'all' ? true : s.status === archiveFilter.status;
        const matchesName = s.name.toLowerCase().includes(archiveFilter.name.toLowerCase()) ||
            s.payCode.includes(archiveFilter.name);
        const matchesAgent = archiveFilter.agent ? (s.marketingAgent || '').toLowerCase().includes(archiveFilter.agent.toLowerCase()) : true;
        return matchesStatus && matchesName && matchesAgent;
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
                                placeholder="Marketing Agent..."
                                value={archiveFilter.agent}
                                onChange={(e) => setArchiveFilter({ ...archiveFilter, agent: e.target.value })}
                                list="agent-suggestions"
                                className="input"
                                style={{ background: 'hsl(var(--background))', color: 'white', border: '1px solid hsl(var(--border))', padding: '0.5rem', flex: 1 }}
                            />
                            <input
                                placeholder="Search Name or Pay Code..."
                                value={archiveFilter.name}
                                onChange={(e) => setArchiveFilter({ ...archiveFilter, name: e.target.value })}
                                className="input"
                                style={{ background: 'hsl(var(--background))', color: 'white', border: '1px solid hsl(var(--border))', padding: '0.5rem', minWidth: '300px', flex: 2 }}
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
                                {marketingAgentSuggestions.map(a => (
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
                                                        const summary = calculateFinancials(student, billings, payments, bursaries, student.semester);
                                                        const outstanding = summary.outstandingBalance;

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

            <style jsx global>{`
                .premium-glass {
                    background: rgba(18, 18, 18, 0.95) !important;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                }
                .premium-card {
                    background: rgba(22, 22, 22, 0.98) !important;
                    border-radius: 2rem !important;
                    padding: 2.5rem !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    transition: all 0.3s ease;
                }
                .input-premium {
                    background: rgba(255, 255, 255, 0.05) !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    border-radius: 12px !important;
                    padding: 1rem !important;
                    color: white !important;
                    width: 100%;
                    transition: all 0.2s ease;
                }
                .input-premium option {
                    background: #1a1a1a !important;
                    color: white !important;
                }
                .input-premium:focus {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
                    outline: none;
                }
                .section-header {
                    font-size: 0.75rem;
                    font-weight: 950;
                    text-transform: uppercase;
                    letter-spacing: 0.2rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .section-header::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(to right, rgba(255, 255, 255, 0.2), transparent);
                }
                .section-header::before {
                    content: "";
                    width: 4px;
                    height: 12px;
                    background: #3b82f6;
                    border-radius: 2px;
                }
                .requirement-card-premium {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .requirement-card-premium:hover {
                    background: rgba(255, 255, 255, 0.06) !important;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                }
                .option-label-premium {
                    background: rgba(255, 255, 255, 0.02) !important;
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .option-label-premium:hover {
                    background: rgba(255, 255, 255, 0.07) !important;
                    border-color: rgba(255, 255, 255, 0.3) !important;
                }
                .total-glow {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%) !important;
                    border: 1px solid rgba(139, 92, 246, 0.3) !important;
                    box-shadow: 0 0 50px rgba(139, 92, 246, 0.2);
                }
                .stat-label-premium {
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: rgba(255, 255, 255, 0.7);
                }
            `}</style>

            {
                viewMode === 'form' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 animate-fade-in p-2 md:p-6 max-w-[1600px] mx-auto">
                        <div className="premium-card premium-glass relative overflow-hidden">
                            {/* Accent Glow */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>

                            <section className="mb-10 relative">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex flex-wrap gap-8 md:gap-12">
                                        <div>
                                            <div className="stat-label-premium mb-1 text-white/40">Student Identity</div>
                                            <div className="text-2xl md:text-3xl font-black tracking-tight text-white">{studentInfo.name.toUpperCase()}</div>
                                        </div>
                                        <div>
                                            <div className="stat-label-premium mb-1 text-white/40">Pay Code</div>
                                            <div className="text-xl font-bold font-mono text-blue-400">{studentInfo.payCode}</div>
                                        </div>
                                        <div>
                                            <div className="stat-label-premium mb-1 text-white/40">Marketing Entity</div>
                                            {isEditing ? (
                                                <div style={{ position: 'relative' }}>
                                                    <datalist id="enrollment-marketing-list">
                                                        {marketingAgentSuggestions.map(agent => (
                                                            <option key={agent} value={agent} />
                                                        ))}
                                                    </datalist>
                                                    <input
                                                        list="enrollment-marketing-list"
                                                        value={studentInfo.marketingAgent}
                                                        onChange={(e) => setStudentInfo(prev => ({ ...prev, marketingAgent: e.target.value }))}
                                                        className="text-lg font-bold text-emerald-400 bg-transparent border-b border-emerald-400/30 focus:border-emerald-400 outline-none w-full"
                                                        placeholder="Type Agent Name..."
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-lg font-bold text-emerald-400">{studentInfo.marketingAgent || 'DIRECT ADMISSION'}</div>
                                            )}
                                        </div>
                                    </div>
                                    {enrollmentData.id && (
                                        <div className="px-6 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                            <span className="text-[0.65rem] font-black text-amber-500 uppercase tracking-widest">Locked Record</span>
                                        </div>
                                    )}
                                    {!isEditing && !enrollmentData.id && (
                                        <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                            Modify Record
                                        </button>
                                    )}
                                </div>
                            </section>

                            <div className="space-y-10 relative">
                                <div>
                                    <h3 className="section-header">Academic Configuration</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="stat-label-premium ml-1">Enrolled Programme</label>
                                            <select
                                                name="programme"
                                                value={enrollmentData.programme}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                className="input-premium appearance-none"
                                            >
                                                <option value="">Select Programme</option>
                                                {programmes.map(prog => (
                                                    <option key={prog.id} value={prog.name}>{prog.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="stat-label-premium ml-1">Current Academic Level</label>
                                            <select
                                                name="entryLevel"
                                                value={enrollmentData.entryLevel}
                                                onChange={handleChange}
                                                disabled={!enrollmentData.programme || !isEditing}
                                                className="input-premium appearance-none"
                                            >
                                                <option value="">Select Academic Level</option>
                                                {getSelectedProgramme()?.levels?.map(lvl => (
                                                    <option key={lvl} value={lvl}>{lvl}</option>
                                                )) || <option disabled>No levels found for programme</option>}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="stat-label-premium ml-1">Financial Classification</label>
                                            <select
                                                name="bursary"
                                                value={selectedBursary}
                                                onChange={(e) => setSelectedBursary(e.target.value)}
                                                disabled={!isEditing}
                                                className="input-premium appearance-none"
                                            >
                                                <option value="none">Standard Payer (N/A)</option>
                                                {bursaries.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name} — {formatMoney(b.value)} Subsidy</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="stat-label-premium ml-1">Balance Brought Forward</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">UGX</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    name="previousBalance"
                                                    value={enrollmentData.previousBalance}
                                                    onChange={handleChange}
                                                    readOnly={!isEditing}
                                                    className="input-premium pl-14 font-mono font-bold text-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <section>
                                    <h3 className="section-header">Mandatory Fees Overview</h3>
                                    <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <ul className="space-y-3">
                                                {getCompulsoryData().items.map((it: any) => (
                                                    <li key={it} className="flex items-center gap-3 text-sm text-white/80">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {it}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="flex flex-col justify-end items-end">
                                                <div className="stat-label-premium text-white/40 mb-1">Subtotal Compulsory</div>
                                                <div className="text-xl font-black text-white">{formatMoney(getCompulsoryFee())}</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div>
                                    <h3 className="section-header">Ancillary & Resource Subscriptions</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {services.filter(s => {
                                            const compulsory = getCompulsoryData().items || [];
                                            return !compulsory.includes(s.name);
                                        }).map(service => (
                                            <label key={service.id} className={`group option-label-premium flex items-center gap-4 p-4 rounded-2xl cursor-pointer ${enrollmentData.selectedServices.includes(service.id) ? 'bg-blue-600/10 border-blue-500/30' : 'bg-transparent'} ${!isEditing ? 'opacity-50 cursor-default' : 'hover:bg-white/5'}`}>
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${enrollmentData.selectedServices.includes(service.id) ? 'bg-blue-500 border-blue-500' : 'border-white/40'}`}>
                                                    {enrollmentData.selectedServices.includes(service.id) && <span className="text-[0.6rem] text-white">✓</span>}
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={enrollmentData.selectedServices.includes(service.id)}
                                                        disabled={!isEditing}
                                                        onChange={() => isEditing && handleServiceToggle(service.id)}
                                                    />
                                                </div>
                                                <span className="flex-1 text-sm font-bold text-white/90">{service.name}</span>
                                                <span className="text-sm font-black text-emerald-400">{formatMoney(service.cost).replace('UGX', '').trim()}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <section>
                                    <h3 className="section-header">Consumable Requirements Tracker</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {studentRequirements.map((req, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => isEditing && handleRequirementIncrement(idx)}
                                                style={{
                                                    background: `${req.color}08`,
                                                    borderColor: `${req.color}20`,
                                                }}
                                                className="requirement-card-premium p-5 rounded-3xl border text-center relative flex flex-col items-center justify-center gap-2 group"
                                            >
                                                {isEditing && (
                                                    <button
                                                        onClick={(e) => handleRequirementReset(e, idx)}
                                                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/40 text-[0.6rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Reset"
                                                    >
                                                        ↺
                                                    </button>
                                                )}
                                                <div className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: req.color }}>{req.name}</div>
                                                <div className="text-2xl font-black text-white">
                                                    {req.brought}<span className="text-white/20 mx-1">/</span>{req.required}
                                                </div>
                                                <div className="text-[0.55rem] font-bold text-white/20 uppercase tracking-[0.1rem]">Incremental Tap</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-10 border-t border-white/5">
                                {isEditing && (
                                    <button
                                        onClick={handleEnrollSubmit}
                                        className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                    >
                                        {enrollmentData.id ? '💾 Commit Changes' : '🚀 Finalize Enrollment'}
                                    </button>
                                )}
                                {enrollmentData.id && isEditing && (
                                    <button
                                        onClick={() => handleDeleteAccount(enrollmentData.id!)}
                                        className="px-8 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl font-black uppercase tracking-widest transition-all"
                                    >
                                        Purge Record
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR - BILLING SNAPSHOT */}
                        <div className="h-fit lg:sticky lg:top-8">
                            <div className="premium-card premium-glass total-glow p-8 space-y-8">
                                <div className="text-center">
                                    <h2 className="text-[0.7rem] font-black uppercase tracking-[0.2rem] text-white/40 mb-1">Financial Projection</h2>
                                    <div className="text-xl font-bold text-white">Billing Breakdown</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="stat-label-premium">Base Tuition</span>
                                        <span className="text-sm font-bold text-white">{formatMoney(getProgrammeFee())}</span>
                                    </div>
                                    {selectedBursary !== 'none' && (
                                        <div className="flex justify-between items-center px-2 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <span className="text-[0.65rem] font-black text-emerald-400 uppercase tracking-widest">Bursary Subsidy</span>
                                            <span className="text-sm font-black text-emerald-400">-{formatMoney(getBursaryDiscount())}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center px-2">
                                        <span className="stat-label-premium">Statutory Fees</span>
                                        <span className="text-sm font-bold text-amber-500">{formatMoney(getCompulsoryFee())}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="stat-label-premium">Selected Services</span>
                                        <span className="text-sm font-bold text-blue-400">{formatMoney(getServicesTotal())}</span>
                                    </div>

                                    <div className="h-px bg-white/10 mx-2"></div>

                                    <div className="flex justify-between items-center px-2">
                                        <span className="stat-label-premium">Account Arrears</span>
                                        <span className="text-sm font-mono font-bold text-red-500">{formatMoney(enrollmentData.previousBalance)}</span>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2rem] bg-black/60 border border-white/10 text-center relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-70"></div>
                                    <div className="relative">
                                        <div className="stat-label-premium text-white/40 mb-2">Total Financial Liability</div>
                                        <div className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                            {formatMoney(grandTotal).replace('UGX', '').trim()}<span className="text-xs ml-1 text-white/40">UGX</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[0.65rem] font-black uppercase tracking-[0.15rem] transition-all border border-white/5"
                                    >
                                        {isEditing ? 'Abort Changes' : 'Return to Directory'}
                                    </button>

                                    {isEditing && (
                                        <button
                                            onClick={handleEnrollSubmit}
                                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-[0.2rem] shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
                                        >
                                            Confirm Submission
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }



            {modalStudentId && <LearnerAccountModal studentId={modalStudentId} onClose={() => setModalStudentId(null)} mode={isDirector ? 'director' : 'bursar'} />}
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
