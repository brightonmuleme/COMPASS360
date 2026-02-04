"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolData, RegistrarStudent, AdmissionFormData } from '@/lib/store';

export default function AdmissionsPage() {
    const router = useRouter();
    // Connect to Global Store for Persistence
    const {
        filteredRegistrarStudents: registrarStudents,
        addRegistrarStudent,
        updateRegistrarStudent,
        deleteRegistrarStudent,
        filteredProgrammes: programmes,
        documentTemplates,
        admissionFormData,
        setAdmissionFormData,
        filteredStudents: enrolledStudents,
        setStudents,
        services,
        bursaries,
        schoolProfile
    } = useSchoolData();

    // UI State
    const [viewMode, setViewMode] = useState<'list' | 'single' | 'batch'>('list');
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // Changed to string[] for Store IDs

    // Filters State
    const [filters, setFilters] = useState({
        name: '',
        course: '',
        admissionDate: '',
        marketingAgent: '',
        entryLevel: ''
    });

    // Batch Upload State
    const [batchFile, setBatchFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [step, setStep] = useState(1);
    // Local Form State for Performance (Syncs to Global onBlur/Effect)
    const [localFormData, setLocalFormData] = useState<AdmissionFormData>(admissionFormData || {
        firstName: '', lastName: '', schoolPayCode: '', dob: '', gender: 'Male', nationality: 'Ugandan',
        course: '', entryLevel: 'Year 1, Semester 1', admissionDate: new Date().toISOString().split('T')[0],
        marketingAgent: '', parentName: '', parentContact: '', email: '', digitalPaymentMethod: ['School Pay'],
        paymentDetails: [{ method: 'School Pay', code: '' }]
    });

    // ... (useEffect sync remains)

    // Dynamic Levels Logic
    const selectedProgramme = programmes.find(p => p.name === localFormData.course);
    const availableLevels = selectedProgramme?.levels && selectedProgramme.levels.length > 0
        ? selectedProgramme.levels
        : (selectedProgramme?.feeStructure?.map(fs => fs.level) || []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // 1. Update Local State Immediately (Fast)
        setLocalFormData(prev => ({ ...prev, [name]: value }));

        // ... (Global sync logic) ...
        if (e.target.tagName === 'SELECT') {
            setAdmissionFormData(prev => ({ ...prev, [name]: value }));
            if (name === 'course') {
                setLocalFormData(prev => ({ ...prev, course: value, entryLevel: '' }));
                setAdmissionFormData(prev => ({ ...prev, course: value, entryLevel: '' }));
            }
        }
    };

    // Dynamic Payment Methods Logic
    const handleAddPaymentRow = () => {
        setLocalFormData(prev => ({
            ...prev,
            paymentDetails: [...(prev.paymentDetails || []), { method: '', code: '' }]
        }));
    };

    const handleRemovePaymentRow = (index: number) => {
        setLocalFormData(prev => {
            const updated = [...(prev.paymentDetails || [])];
            updated.splice(index, 1);
            return { ...prev, paymentDetails: updated };
        });
    };

    const handlePaymentDetailChange = (index: number, field: 'method' | 'code', value: string) => {
        setLocalFormData(prev => {
            const updated = [...(prev.paymentDetails || [])];
            updated[index] = { ...updated[index], [field]: value };

            // Sync legacy field if it's the first one
            const overrides = {};
            if (index === 0) {
                if (field === 'code') (overrides as any).schoolPayCode = value;
            }

            return { ...prev, paymentDetails: updated, ...overrides };
        });
    };

    const handleBlur = () => {
        // Sync to Global Store on Blur (Preserves typing performance)
        setAdmissionFormData(localFormData);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // Filter Logic

    const filteredStudents = registrarStudents.filter(student => {
        const matchesName = (student.name || '').toLowerCase().includes(filters.name.toLowerCase());
        const matchesCourse = filters.course ? student.course === filters.course : true;
        const matchesAgent = (student.marketingAgent || '').toLowerCase().includes(filters.marketingAgent.toLowerCase());
        const matchesDate = filters.admissionDate ? student.admissionDate === filters.admissionDate : true;
        const matchesLevel = (student.entryLevel || '').toLowerCase().includes(filters.entryLevel.toLowerCase());

        // Check enrollment status (match by Pay Code)
        const isEnrolled = enrolledStudents.some(e =>
            (e.payCode === student.schoolPayCode) ||
            (e.payCode === student.payCode)
        );

        return matchesName && matchesCourse && matchesAgent && matchesDate && matchesLevel && !isEnrolled;
    });

    // Selection Logic
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStudents.map(s => s.id));
        }
    };

    // Bulk Actions
    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} accounts? This cannot be undone.`)) {
            selectedIds.forEach(id => deleteRegistrarStudent(id));
            setSelectedIds([]);
            alert("Accounts deleted successfully.");
        }
    };

    const handleBulkDeactivate = () => {
        registrarStudents.forEach(s => {
            if (selectedIds.includes(s.id)) {
                updateRegistrarStudent({ ...s, status: s.status === 'deactivated' ? 'active' : 'deactivated' });
            }
        });
        setSelectedIds([]);
        alert("Account status updated for selected students.");
    };

    const handleExportCSV = () => {
        if (filteredStudents.length === 0) return alert("No students to export.");

        const headers = ["Name", "Programme", "Entry Level", "Date", "Agent", "Pay Code"];
        const rows = filteredStudents.map(s => [
            s.name,
            s.programme || s.course || '',
            s.entryClass || s.entryLevel || '',
            s.admissionDate,
            s.marketingAgent || '',
            s.schoolPayCode || s.payCode || ''
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `admissions_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkTransition = (type: 'programme' | 'entryClass') => {
        const newValue = prompt(`Enter the new ${type === 'programme' ? 'Programme' : 'Entry Level'}:`);
        if (!newValue) return;

        // Confirm Transition
        if (confirm(`Change ${type === 'programme' ? 'Programme' : 'Entry Level'} to "${newValue}" for ${selectedIds.length} students?`)) {
            registrarStudents.forEach(s => {
                if (selectedIds.includes(s.id)) {
                    updateRegistrarStudent({ ...s, [type]: newValue });
                }
            });
            setSelectedIds([]);
            alert("Bulk update successful.");
        }
    };

    const handlePrintAdmission = (student: RegistrarStudent) => {
        if (!schoolProfile?.name) {
            alert("Please configure School Name in Profile settings first.");
            return;
        }

        // 1. Find Programme
        const prog = programmes.find(p => p.name === student.course || p.id === student.course);
        if (!prog) return alert(`Programme '${student.course}' not found. Cannot generate letter.`);

        // 2. Find Admission Letter Template
        let template = documentTemplates.find(t => t.type === 'ADMISSION_LETTER' && (t as any).programmeId === prog.id);
        if (!template) {
            template = documentTemplates.find(t => t.type === 'ADMISSION_LETTER' && t.isDefault);
        }
        if (!template) {
            template = documentTemplates.find(t => t.type === 'ADMISSION_LETTER');
        }

        if (!template) return alert("No Admission Letter template found in system.");

        // 3. Construct HTML
        let content = template.sections.sort((a, b) => a.order - b.order).map(s => s.content).join('');

        // 4. Substitutions
        const specificLogo = localStorage.getItem(`logo_${template.id}`);
        const globalLogo = localStorage.getItem('school_logo');
        const activeLogo = specificLogo || globalLogo;

        const logoHtml = activeLogo ? `<img src="${activeLogo}" style="max-height: 100px; width: auto; display: block; margin: 0 auto;" />` : '';

        const replacements: Record<string, string> = {
            '{{student_name}}': student.name,
            '{{student_code}}': student.id,
            '{{programme_name}}': prog.name,
            '{{institution_name}}': schoolProfile.name,
            '{{current_date}}': new Date().toLocaleDateString(),
            '{{reporting_date}}': student.admissionDate,
            '{{admission_date}}': student.admissionDate,
            '{{pay_code}}': student.schoolPayCode || student.payCode || '',
            '{{year}}': new Date().getFullYear().toString(),
            '{{programme_logo}}': logoHtml
        };

        Object.entries(replacements).forEach(([key, val]) => {
            content = content.replace(new RegExp(key, 'g'), val);
        });

        // 5. Open Window
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Admission Letter - ${student.name}</title></head><body style="padding: 40px; font-family: sans-serif;">${content}</body></html>`);
            win.document.close();
            win.onload = () => {
                win.print();
                win.close();
            };
        } else {
            alert("Popup blocked. Please allow popups to print.");
        }
    };

    // ... (Selection Logic remain) ...

    // ... (Bulk Actions remain) ...

    // ... (handlePrintAdmission remain) ...

    const handleDeleteAccount = (id: string) => {
        if (confirm("Are you sure you want to delete this account? DATA WILL BE PERMANENTLY LOST.")) {
            deleteRegistrarStudent(id);
            setViewMode('list');
            setEditingId(null);
            alert("Account deleted.");
        }
    };

    const validateStep = (currentStep: number) => {
        if (currentStep === 1) {
            if (!localFormData.firstName || !localFormData.lastName) {
                alert("Please fill in Student Names.");
                return false;
            }
            // Payment Validation
            const payments = localFormData.paymentDetails || [];
            const validPayments = payments.filter(p => p.method && p.code);

            if (validPayments.length === 0) {
                alert("Please add at least ONE Compulsory Payment Method with a valid Code.");
                return false;
            }
            if (validPayments.length !== payments.length) {
                alert("Please ensure ALL added payment rows have both a Method and a Code (or remove the empty rows).");
                return false;
            }
        }
        if (currentStep === 2) {
            // ... (remains same)
            if (!localFormData.course || !localFormData.entryLevel || !localFormData.admissionDate || !localFormData.marketingAgent) {
                alert("Please fill in all compulsory fields: Course, Entry Level, Admission Date, Marketing Agent.");
                return false;
            }
        }
        return true;
    };

    const handleEdit = (student: RegistrarStudent) => {
        const nameParts = student.name.split(' ');

        // Map Legacy Data to New Structure if needed
        let payments = student.paymentDetails || [];
        if (payments.length === 0 && (student.schoolPayCode || student.payCode)) {
            // Backward compatibility
            payments = [{ method: 'School Pay', code: student.schoolPayCode || student.payCode || '' }];
            if (student.digitalPaymentMethod && student.digitalPaymentMethod.length > 0) {
                // Try to map existing checked methods if possible, though code might be missing
                student.digitalPaymentMethod.forEach(m => {
                    if (m !== 'School Pay') payments.push({ method: m, code: '' }); // User will need to fill code
                });
            }
        }
        // Ensure at least one empty slot if nothing exists
        if (payments.length === 0) payments = [{ method: 'School Pay', code: '' }];

        const editData: AdmissionFormData = {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            schoolPayCode: student.schoolPayCode || student.payCode || '',
            dob: student.dob || '',
            gender: student.gender || 'Male',
            nationality: 'Ugandan',
            course: student.programme || student.course || '',
            entryLevel: student.entryClass || student.entryLevel || '',
            admissionDate: student.admissionDate,
            marketingAgent: (student as any).marketingAgent || '',
            parentName: student.parentName || '',
            parentContact: student.parentContact || '',
            email: (student as any).email || '',
            digitalPaymentMethod: student.digitalPaymentMethod || [],
            paymentDetails: payments
        };
        // Update both local and global
        setLocalFormData(editData);
        setAdmissionFormData(editData);
        setEditingId(student.id);
        setSelectedIds([]);
        setStep(1);
        setViewMode('single');
    };

    const handleRegistration = () => {
        const primaryPayment = (localFormData.paymentDetails && localFormData.paymentDetails[0])
            ? localFormData.paymentDetails[0]
            : { method: 'School Pay', code: localFormData.schoolPayCode };

        // 1. Check for Duplicate Pay Code (Primary)
        if (primaryPayment.code) {
            const duplicate = registrarStudents.find(s => (s.schoolPayCode === primaryPayment.code || s.payCode === primaryPayment.code) && s.id !== editingId && s.origin === 'bursar');
            if (duplicate) {
                alert(`REGISTRATION DENIED:\nThe Pay Code "${primaryPayment.code}" is already registered to ${duplicate.name}.`);
                return;
            }
        }

        const studentData: RegistrarStudent = {
            id: editingId || crypto.randomUUID(),
            name: `${localFormData.firstName} ${localFormData.lastName}`,
            programme: localFormData.course,
            course: localFormData.course,
            entryClass: localFormData.entryLevel,
            entryLevel: localFormData.entryLevel,
            admissionDate: localFormData.admissionDate,
            schoolPayCode: primaryPayment.code, // Main one
            payCode: primaryPayment.code,
            marketingAgent: localFormData.marketingAgent,
            dob: localFormData.dob,
            gender: localFormData.gender as 'Male' | 'Female',
            parentName: localFormData.parentName,
            parentContact: localFormData.parentContact,
            email: localFormData.email,
            digitalPaymentMethod: localFormData.paymentDetails?.map(p => p.method), // Legacy list
            paymentDetails: localFormData.paymentDetails, // New Structure
            status: 'active',
            country: localFormData.nationality,
            district: '',
            placeOfOrigin: '',
            origin: 'bursar' // Mark as from Bursar
        };

        if (editingId) {
            updateRegistrarStudent(studentData);
            alert("Student details updated successfully!");
        } else {
            addRegistrarStudent(studentData);
            alert("Registration Successful! Student saved to Database.");
        }

        // Reset
        const emptyForm: AdmissionFormData = {
            firstName: '', lastName: '', schoolPayCode: '', dob: '', gender: 'Male', nationality: 'Ugandan',
            course: '', entryLevel: 'Year 1, Semester 1', admissionDate: new Date().toISOString().split('T')[0], marketingAgent: '', parentName: '', parentContact: '', email: '', digitalPaymentMethod: [],
            paymentDetails: [{ method: 'School Pay', code: '' }]
        };
        setLocalFormData(emptyForm);
        setAdmissionFormData(emptyForm);
        setEditingId(null);
        setStep(1);
        setViewMode('list');
    };

    // Batch Upload Logic
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBatchFile(e.target.files[0]);
        }
    };

    const processCSV = (csvText: string) => {
        const lines = csvText.split('\n');
        const students: RegistrarStudent[] = [];

        // Skip header (i=1), assume first row is header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',').map(c => c.trim());

            // Expected: FirstName, LastName, PayCode, Gender, Course, EntryLevel, AdmissionDate, MarketingAgent
            if (cols.length >= 8) {
                students.push({
                    id: crypto.randomUUID(),
                    name: `${cols[0]} ${cols[1]}`, // First + Last Name
                    payCode: cols[2],
                    schoolPayCode: cols[2], // New field
                    gender: (cols[3]?.trim() === 'Female' ? 'Female' : 'Male'),
                    course: cols[4],
                    programme: cols[4], // New field
                    entryLevel: cols[5],
                    entryClass: cols[5], // New field
                    admissionDate: cols[6],
                    marketingAgent: cols[7],
                    status: 'active',
                    // Default values for required fields missing in CSV
                    dob: '',
                    parentName: '',
                    parentContact: '',
                    country: 'Uganda',
                    district: '',
                    placeOfOrigin: ''
                });
            }
        }
        return students;
    };

    const nextStep = () => {
        if (validateStep(step)) setStep(step + 1);
    };
    const prevStep = () => setStep(step - 1);

    const handleEnroll = (student: RegistrarStudent) => {
        const params = new URLSearchParams({
            name: student.name,
            payCode: student.schoolPayCode || (student as any).payCode || '', // Handle legacy/new field
            course: student.programme || (student as any).course || '',
            entryLevel: student.entryClass || (student as any).entryLevel || '',
            marketingAgent: student.marketingAgent || '' // Pass Marketing Agent
        });
        router.push(`/bursar/enrollment?${params.toString()}`);
    };

    const handleBatchEnroll = () => {
        if (selectedIds.length === 0) return;

        if (!confirm(`Enroll ${selectedIds.length} students directly? This will add them to the Learners List with centralized fee logic.`)) return;

        const newEnrollments = selectedIds.map(id => {
            const student = registrarStudents.find(s => s.id === id);
            if (!student) return null;

            const progName = student.programme || student.course || '';
            const entryLvl = student.entryClass || student.entryLevel || '';

            // Find programme and fee structure
            const prog = programmes.find(p => p.name === progName || p.id === progName);
            const feeConfig = prog?.feeStructure?.find(f => f.level === entryLvl);

            // Calculate initial fees
            const tuitionFee = feeConfig?.tuitionFee || 0;
            const compulsoryServices = feeConfig?.compulsoryServices || [];
            const physicalReqs = (feeConfig?.requirements || []).map(r => ({
                name: r.name,
                required: r.quantity,
                brought: 0,
                color: '#3b82f6',
                entries: []
            }));

            // Create Enrolled Student Object
            const newStudent = {
                id: Date.now() + Math.random(),
                name: student.name,
                payCode: student.schoolPayCode || student.payCode,
                programme: progName,
                level: entryLvl,
                semester: entryLvl,
                totalFees: tuitionFee,
                balance: tuitionFee,
                services: compulsoryServices,
                bursary: 'none',
                previousBalance: 0,
                physicalRequirements: physicalReqs,
                status: 'active',
                promotionHistory: [],
                marketingAgent: student.marketingAgent,
                origin: 'bursar' as const
            };
            return newStudent;

        }).filter(Boolean) as any[];

        setStudents(prev => [...newEnrollments, ...prev]);

        setSelectedIds([]);
        alert(`Successfully enrolled ${newEnrollments.length} students! Check Learners Accounts.`);
    };

    const handleBatchUpload = () => {
        if (!batchFile) {
            alert("Please select a file to upload first.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const newStudents = processCSV(text);

            if (newStudents.length > 0) {
                // 1. Identify duplicates WITHIN the batch file
                const payCodeCounts = newStudents.reduce((acc: any, student) => {
                    const code = student.payCode || 'UNKNOWN';
                    acc[code] = (acc[code] || 0) + 1;
                    return acc;
                }, {});

                const duplicatesInBatchCodes = Object.keys(payCodeCounts).filter(code => payCodeCounts[code] > 1);

                // 2. Identify duplicates AGAINST the system
                const duplicatesInSystemCodes = newStudents
                    .map(s => s.payCode)
                    .filter((code): code is string => !!code && registrarStudents.some(existing => existing.payCode === code));

                // 3. Filter Students
                const validStudents = newStudents.filter(student => {
                    const code = student.payCode;
                    if (!code) return false; // Skip if no pay code
                    const isBatchDuplicate = duplicatesInBatchCodes.includes(code);
                    const isSystemDuplicate = duplicatesInSystemCodes.includes(code);
                    return !isBatchDuplicate && !isSystemDuplicate;
                });

                const skippedBatchCount = newStudents.filter(s => s.payCode && duplicatesInBatchCodes.includes(s.payCode)).length;
                const skippedSystemCount = newStudents.filter(s => s.payCode && !duplicatesInBatchCodes.includes(s.payCode) && duplicatesInSystemCodes.includes(s.payCode)).length;

                if (validStudents.length > 0) {
                    validStudents.forEach(s => addRegistrarStudent(s));

                    let message = `SUCCESS: Processed "${batchFile.name}".\n\n✅ ${validStudents.length} students added.`;

                    if (skippedBatchCount > 0) {
                        message += `\n\n⛔ ${skippedBatchCount} students skipped because their Pay Codes appear multiple times in this file (Ambiguous).`;
                    }
                    if (skippedSystemCount > 0) {
                        message += `\n\n⚠️ ${skippedSystemCount} students skipped because they are already enrolled.`;
                    }

                    alert(message);
                    setBatchFile(null);
                    setViewMode('list');
                } else {
                    alert(`UPLOAD FAILED: No students were added.\n\n⛔ ${skippedBatchCount} skipped due to duplicates in file.\n⚠️ ${skippedSystemCount} skipped because they already exist.`);
                }
            } else {
                alert("ERROR: Could not extract student data. Please check the CSV format.\n\nExpected Format:\nFirst Name, Last Name, Pay Code, Gender, Course, Entry Level, Admission Date, Agent");
            }
        };
        reader.readAsText(batchFile);
    };

    return (
        <div style={{ position: 'relative', minHeight: '80vh' }}>
            <style jsx>{`
                /* FIX FOR DARK MODE CALENDAR ICON */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
                
                /* Print Styles */
                .print-only { display: none; }
                @media print {
                    @page { size: auto; margin: 5mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 100vw; height: auto !important; overflow: visible !important; }
                    body * { visibility: hidden; }
                    
                    /* Visibility - Show Header, Table, and Cards */
                    .print-only, .print-only *, table, table *, .card, .card * { visibility: visible !important; }
                    
                    /* Layout Flow */
                    .print-only, table, .card { 
                        position: static !important; 
                        width: 100% !important; 
                        margin: 0 !important; padding: 0 !important; 
                        background: transparent !important; 
                        box-shadow: none !important; 
                        overflow: visible !important; 
                        color: black !important;
                    }

                    /* Hide non-print elements */
                    .no-print, header, .btn, input, select, .status-settings-toggle, .col-checkbox, .col-ring, .col-sync { display: none !important; }
                    
                    /* Table Styling - Clean Grid */
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important; 
                        border: 1px solid #000 !important; 
                        font-family: 'Arial', sans-serif !important; 
                        font-size: 9pt !important; 
                        margin-top: 10px !important; 
                    }
                    th, td { 
                        border: 1px solid #000 !important; 
                        padding: 4px 6px !important; 
                        color: black !important; 
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #f0f0f0 !important; 
                        font-weight: bold; 
                        text-transform: uppercase; 
                        font-size: 8pt !important; 
                        border-bottom: 2px solid #000 !important;
                    }
                    
                    /* Specific Column Alignments */
                    .text-right { text-align: right !important; }
                    .text-center { text-align: center !important; }
                    
                    /* Utilities */
                    .print-only { display: block !important; }
                    tr { page-break-inside: avoid; }
                    tr:nth-child(even) { background-color: #fafafa !important; }
                    
                    /* Cleanup */
                    .account-row { border: none !important; box-shadow: none !important; background: transparent !important; }
                    div, span { color: black !important; opacity: 1 !important; text-shadow: none !important; }
                }
            `}</style>

            {/* PRINT HEADER */}
            <div className="print-only" style={{ marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '20pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{schoolProfile?.name || 'VINE SCHOOLS'}</div>
                        <div style={{ fontSize: '12pt', marginTop: '5px' }}>Academics & Bursar Department</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>ADMISSION LIST</div>
                        <div style={{ fontSize: '10pt', marginTop: '5px' }}>Date: {new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '10pt' }}>
                    <strong>Count:</strong> {filteredStudents.length} Students
                </div>
            </div>

            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 no-print">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Admissions <span className="text-blue-500">& Registrar</span></h1>
                    <p className="text-slate-400 text-sm md:text-base">Manage new and pending admissions.</p>
                </div>

                <div className="flex flex-wrap items-center bg-slate-800/80 p-2 rounded-xl border border-slate-700 gap-2 w-full lg:w-auto">
                    {viewMode === 'list' && (
                        <>
                            <button
                                onClick={() => window.print()}
                                className="btn btn-outline"
                                title="Print List"
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <span>🖨️</span> Print List
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="btn btn-outline"
                                title="Export CSV"
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <span>📥</span> Export CSV
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => { setViewMode('list'); setSelectedIds([]); }}
                        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
                    >
                        Admitted List
                    </button>
                    <button
                        onClick={() => setViewMode('single')}
                        className={`btn ${viewMode === 'single' ? 'btn-primary' : 'btn-outline'}`}
                    >
                        New Admission
                    </button>
                    <button
                        onClick={() => setViewMode('batch')}
                        className={`btn ${viewMode === 'batch' ? 'btn-primary' : 'btn-outline'}`}
                    >
                        Batch Upload
                    </button>
                </div>
            </header>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="card animate-fade-in" style={{ paddingBottom: selectedIds.length > 0 ? '5rem' : '1rem' }}>

                    {/* FILTER SECTION */}
                    <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Search Name</label>
                            <input name="name" value={filters.name} onChange={handleFilterChange} placeholder="e.g. Sarah" list="adm-student-list" className="input" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }} />
                            <datalist id="adm-student-list">
                                {registrarStudents.slice(0, 50).map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Filter by Course</label>
                            <select name="course" value={filters.course} onChange={handleFilterChange} className="input" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}>
                                <option value="">All Courses</option>
                                {programmes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Entry Level</label>
                            <select name="entryLevel" value={filters.entryLevel} onChange={handleFilterChange} className="input" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}>
                                <option value="">All Levels</option>
                                {(() => {
                                    if (filters.course) {
                                        const prog = programmes.find(p => p.name === filters.course);
                                        const levels = prog?.levels?.length ? prog.levels : (prog?.feeStructure?.map(fs => fs.level) || []);
                                        return levels.map(l => <option key={l} value={l}>{l}</option>);
                                    }
                                    const allLevels = Array.from(new Set(programmes.flatMap(p => p.levels || p.feeStructure?.map(fs => fs.level) || [])));
                                    return allLevels.sort().map(l => <option key={l} value={l}>{l}</option>);
                                })()}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Admission Date</label>
                            <input type="date" name="admissionDate" value={filters.admissionDate} onChange={handleFilterChange} className="input" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Marketing Agent</label>
                            <input name="marketingAgent" value={filters.marketingAgent} onChange={handleFilterChange} placeholder="Agent Name" list="adm-agent-list" className="input" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }} />
                            <datalist id="adm-agent-list">
                                {Array.from(new Set(registrarStudents.map(s => s.marketingAgent).filter(Boolean))).map(a => <option key={a} value={a} />)}
                            </datalist>
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '1rem' }}>
                        Admitted Learners
                        <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))', marginLeft: '0.5rem' }}>
                            ({filteredStudents.length} records found)
                        </span>
                    </h3>

                    <div className="overflow-x-auto" style={{ width: '100%' }}>
                        <table style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ background: 'hsl(var(--muted))', textAlign: 'left' }}>
                                    <th style={{ padding: '0.8rem', width: '40px' }}>
                                        <input type="checkbox" checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleSelectAll} />
                                    </th>
                                    <th style={{ padding: '0.8rem' }}>Name</th>
                                    <th style={{ padding: '0.8rem' }}>Programme</th>
                                    <th style={{ padding: '0.8rem' }}>Entry Level</th>
                                    <th style={{ padding: '0.8rem' }}>Date</th>
                                    <th style={{ padding: '0.8rem' }}>Agent</th>
                                    <th style={{ padding: '0.8rem' }}>Payment Code</th>
                                    <th style={{ padding: '0.8rem', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid hsl(var(--border))', opacity: student.status === 'deactivated' ? 0.5 : 1 }}>
                                            <td style={{ padding: '0.8rem' }}>
                                                <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} />
                                            </td>
                                            <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{student.name}</td>
                                            <td style={{ padding: '0.8rem' }}>{student.programme || student.course}</td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{student.entryClass || student.entryLevel}</td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{student.admissionDate}</td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{student.marketingAgent || '-'}</td>
                                            <td style={{ padding: '0.8rem', fontFamily: 'monospace' }}>{student.schoolPayCode || student.payCode}</td>
                                            <td style={{ padding: '0.8rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button onClick={() => handlePrintAdmission(student)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <span>🖨️</span> Print Admission
                                                </button>
                                                <button onClick={() => handleEdit(student)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}>Edit</button>
                                                <button onClick={() => handleEnroll(student)} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#22c55e', borderColor: '#22c55e' }}>Enroll</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                            No students found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* BULK ACTION BAR */}
                    {selectedIds.length > 0 && (
                        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '1rem 2rem', borderRadius: '100px', display: 'flex', gap: '1.5rem', alignItems: 'center', zIndex: 100, animation: 'slideUp 0.3s ease' }}>
                            <div style={{ borderRight: '1px solid hsl(var(--border))', paddingRight: '1rem', fontWeight: 'bold' }}>
                                {selectedIds.length} Selected
                            </div>
                            <button onClick={handleBulkDeactivate} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>Toggle Status</button>
                            <button onClick={handleBatchEnroll} className="btn btn-primary" style={{ fontSize: '0.85rem', background: '#22c55e', borderColor: '#22c55e' }}>Batch Enroll Selected</button>
                            <button onClick={() => handleBulkTransition('programme')} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>Change Prog</button>
                            <button onClick={() => handleBulkTransition('entryClass')} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>Change Level</button>
                            <button onClick={handleBulkDelete} className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: '0.85rem' }}>Delete All</button>
                            <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>
                    )}
                </div>
            )}

            {/* BATCH UPLOAD VIEW */}
            {viewMode === 'batch' && (
                <div className="card animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                    <h3 style={{ marginBottom: '1rem' }}>Bulk Admission Upload</h3>
                    <p style={{ color: 'hsl(var(--muted-foreground))', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                        Upload a CSV or Excel file containing student records.
                        <br /><br />
                        <strong style={{ color: 'hsl(var(--accent))' }}>Required Columns:</strong>
                        <br />
                        First Name, Last Name, School Pay Code, Gender, Course, Entry Level, Admission Date, Marketing Agent.
                    </p>

                    <label style={{
                        display: 'inline-block',
                        padding: '1rem 2rem',
                        border: '2px dashed hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: 'hsl(var(--background))'
                    }}>
                        <input type="file" onChange={handleFileChange} accept=".csv, .xlsx" style={{ display: 'none' }} />
                        <span style={{ fontWeight: 'bold' }}>
                            {batchFile ? `Selected: ${batchFile.name}` : "Click to Select File"}
                        </span>
                    </label>

                    {batchFile && (
                        <p style={{ marginTop: '1rem', color: '#22c55e', fontSize: '0.9rem' }}>
                            Ready to upload. File size: {(batchFile.size / 1024).toFixed(2)} KB
                        </p>
                    )}

                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={handleBatchUpload}
                            className="btn btn-primary"
                            disabled={!batchFile}
                            style={{ opacity: batchFile ? 1 : 0.5, cursor: batchFile ? 'pointer' : 'not-allowed' }}
                        >
                            Process Batch
                        </button>
                    </div>
                </div>
            )}

            {/* FORM VIEW (SINGLE) */}
            {viewMode === 'single' && (
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 md:gap-12">

                    {/* Form Section */}
                    <div className="card animate-fade-in">
                        {/* Progress Indicator */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'hsl(var(--muted))', zIndex: 0 }}></div>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    background: step >= s ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', zIndex: 1, fontWeight: 'bold'
                                }}>
                                    {s}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            {step === 1 && (
                                <div className="animate-fade-in">
                                    <h3 style={{ marginBottom: '1.5rem' }}>Personal Information</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>First Name <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                name="firstName" value={localFormData.firstName} onChange={handleChange} onBlur={handleBlur} required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Last Name <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                name="lastName" value={localFormData.lastName} onChange={handleChange} onBlur={handleBlur} required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                        <div className="col-span-1 sm:col-span-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                Payment Information <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', fontWeight: 'normal' }}>(At least one required)</span>
                                            </h4>

                                            {(localFormData.paymentDetails || []).map((detail, index) => (
                                                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1.5fr_2fr_auto] gap-3 mb-4 items-end">
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem' }}>Method {index === 0 && <span style={{ color: 'red' }}>*</span>}</label>
                                                        <select
                                                            value={detail.method}
                                                            onChange={(e) => handlePaymentDetailChange(index, 'method', e.target.value)}
                                                            className="input"
                                                            style={{ width: '100%', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                                        >
                                                            <option value="">Select Method...</option>
                                                            <option>School Pay</option>
                                                            <option>Peg Pay</option>
                                                            <option>MTN MoMo</option>
                                                            <option>Airtel Money</option>
                                                            <option>Visa/Mastercard</option>
                                                            <option>Bank Deposit</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem' }}>Payment Code / Account No. {index === 0 && <span style={{ color: 'red' }}>*</span>}</label>
                                                        <input
                                                            value={detail.code}
                                                            onChange={(e) => handlePaymentDetailChange(index, 'code', e.target.value)}
                                                            placeholder={detail.method === 'School Pay' ? 'e.g. 8823-9912' : 'Enter Code/Number'}
                                                            className="input"
                                                            style={{ width: '100%', padding: '0.5rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePaymentRow(index)}
                                                            disabled={(localFormData.paymentDetails || []).length === 1}
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.5rem', opacity: (localFormData.paymentDetails || []).length === 1 ? 0.3 : 1, color: '#ef4444', borderColor: '#ef4444' }}
                                                            title="Remove"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={handleAddPaymentRow}
                                                className="btn btn-outline"
                                                style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                                            >
                                                + Add Another Payment Method
                                            </button>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Gender <span style={{ color: 'red' }}>*</span></label>
                                            <select
                                                name="gender" value={localFormData.gender} onChange={handleChange} required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            >
                                                <option>Male</option>
                                                <option>Female</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Date of Birth</label>
                                            <input
                                                type="date" name="dob" value={localFormData.dob} onChange={handleChange} onBlur={handleBlur}
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="animate-fade-in">
                                    <h3 style={{ marginBottom: '1.5rem' }}>Academic Details</h3>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Course / Programme <span style={{ color: 'red' }}>*</span></label>
                                        <select
                                            name="course" value={localFormData.course} onChange={handleChange} required
                                            className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                        >
                                            <option value="">Select Programme...</option>
                                            {programmes.map(p => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Entry Level <span style={{ color: 'red' }}>*</span></label>
                                            <select
                                                name="entryLevel" value={localFormData.entryLevel} onChange={handleChange} required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            >
                                                <option value="">Select Entry Level...</option>
                                                {availableLevels.length > 0 ? (
                                                    availableLevels.map(lvl => (
                                                        <option key={lvl} value={lvl}>{lvl}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option>Year 1, Semester 1</option>
                                                        <option>Year 1, Semester 2</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Admission Date <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                type="date" name="admissionDate" value={localFormData.admissionDate} onChange={handleChange} onBlur={handleBlur} required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Marketing Agent <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                name="marketingAgent" value={localFormData.marketingAgent} onChange={handleChange} onBlur={handleBlur} placeholder="Name or ID" required
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="animate-fade-in">
                                    <h3 style={{ marginBottom: '1.5rem' }}>Guardian & Contact</h3>
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Parent/Guardian Name</label>
                                            <input
                                                name="parentName" value={localFormData.parentName} onChange={handleChange} onBlur={handleBlur}
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Phone Number</label>
                                            <input
                                                name="parentContact" value={localFormData.parentContact} onChange={handleChange} onBlur={handleBlur}
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Student Email (Optional)</label>
                                            <input
                                                name="email" value={localFormData.email} onChange={handleChange} onBlur={handleBlur}
                                                className="input" style={{ width: '100%', padding: '0.8rem', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'white' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
                                {step > 1 ? (
                                    <button onClick={prevStep} className="btn btn-outline">Back</button>
                                ) : (
                                    editingId ? (
                                        <button type="button" onClick={() => handleDeleteAccount(editingId)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                                            Delete Account
                                        </button>
                                    ) : <div></div>
                                )}

                                {step < 3 ? (
                                    <button onClick={nextStep} className="btn btn-primary">Next Step</button>
                                ) : (
                                    <button type="button" onClick={handleRegistration} className="btn btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e' }}>
                                        {editingId ? "Update Student" : "Complete Registration"}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Summary / Preview */}
                    <div>
                        <div className="card" style={{ position: 'sticky', top: '2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'hsl(var(--muted-foreground))' }}>
                                {editingId ? "Editing Summary" : "Registration Summary"}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.7 }}>Name:</span>
                                    <span>{localFormData.firstName} {localFormData.lastName || '...'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.7 }}>Course:</span>
                                    <span style={{ textAlign: 'right', maxWidth: '150px' }}>{localFormData.course || 'Not Selected'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.7 }}>Entry:</span>
                                    <span>{localFormData.entryLevel}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.7 }}>Pay Code:</span>
                                    <span>{localFormData.schoolPayCode || '...'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.7 }}>Date:</span>
                                    <span>{localFormData.admissionDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
