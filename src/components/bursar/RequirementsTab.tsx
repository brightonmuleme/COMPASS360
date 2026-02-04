import { useState, useMemo } from 'react';
import { EnrolledStudent, PhysicalRequirement, useSchoolData } from '@/lib/store';

interface RequirementsTabProps {
    students: EnrolledStudent[];
    updateStudent: (s: EnrolledStudent) => void;
}

// Derived dynamic levels from props in component
// const AVAILABLE_LEVELS = ... (moved inside)

export default function RequirementsTab({ students, updateStudent }: RequirementsTabProps) {
    const { schoolProfile, batchUpdateStudents, logGlobalAction } = useSchoolData();
    const AVAILABLE_LEVELS = useMemo(() => {
        const lvls = new Set<string>();
        students.forEach(s => {
            if (s.level) lvls.add(s.level);
        });
        return Array.from(lvls).sort();
    }, [students]);
    // --- STATE ---

    // Global Requirement Management
    const [editReqModal, setEditReqModal] = useState({ open: false, originalName: '', newName: '' });
    const [delReqModal, setDelReqModal] = useState({ open: false, reqName: '' });
    const [delReqReason, setDelReqReason] = useState('No longer required');

    // Create New Requirement Type (Already existing, but integrated)
    const [createModal, setCreateModal] = useState({ open: false, name: '', color: '#3b82f6' });

    // Subscribe (Add Compulsory/Optional)
    const [subModal, setSubModal] = useState({ open: false, reqName: '' });
    const [subStudentId, setSubStudentId] = useState('');
    const [subQty, setSubQty] = useState(1);
    const [subSearch, setSubSearch] = useState('');

    // History / View List
    const [historyModal, setHistoryModal] = useState<{ open: boolean, reqName: string }>({ open: false, reqName: '' });
    const [listFilterProg, setListFilterProg] = useState('All');
    const [listFilterLevel, setListFilterLevel] = useState('All');
    const [listFilterQty, setListFilterQty] = useState('All');
    const [listFilterDate, setListFilterDate] = useState('');
    const [listSearch, setListSearch] = useState('');
    const [visibleColumns, setVisibleColumns] = useState({ date: true, name: true, qty: true, action: true });

    // Delete Entry (Individual Result)
    const [delEntryModal, setDelEntryModal] = useState<{ open: boolean, reqName: string, studentId: number }>({ open: false, reqName: '', studentId: 0 });
    const [delEntryReason, setDelEntryReason] = useState('Mistake');


    // --- DERIVED DATA ---
    const programmes = useMemo(() => Array.from(new Set(students.map(s => s.programme))), [students]);

    // Aggregate all unique requirements from all students
    const consolidatedRequirements = useMemo(() => {
        const map = new Map<string, { name: string, totalBrought: number, totalRequired: number, color: string }>();

        students.forEach(s => {
            s.physicalRequirements?.forEach(req => {
                const existing = map.get(req.name) || { name: req.name, totalBrought: 0, totalRequired: 0, color: req.color };
                existing.totalBrought += req.brought;
                existing.totalRequired += req.required;
                map.set(req.name, existing);
            });
        });

        return Array.from(map.values());
    }, [students]);

    const activeReqName = historyModal.open ? historyModal.reqName : subModal.open ? subModal.reqName : '';

    // Search for Subscribe
    const subSearchResults = useMemo(() => {
        if (!subSearch) return [];
        return students.filter(s => s.name.toLowerCase().includes(subSearch.toLowerCase()) && !s.physicalRequirements?.some(r => r.name === subModal.reqName)).slice(0, 5);
    }, [students, subSearch, subModal.reqName]);

    // Search for History List (Autocomplete)
    const listSearchResults = useMemo(() => {
        if (!listSearch) return []; // Or maybe check length > 1?
        // Autocomplete
        return students.filter(s => s.name.toLowerCase().includes(listSearch.toLowerCase())).slice(0, 5);
    }, [students, listSearch]);

    // History List
    const historyList = useMemo(() => {
        if (!historyModal.open) return [];

        // Find all students who have this requirement
        let list = students.filter(s => s.physicalRequirements?.some(r => r.name === historyModal.reqName));



        // Apply Filters
        if (listFilterProg !== 'All') list = list.filter(s => s.programme === listFilterProg);
        if (listFilterLevel !== 'All') list = list.filter(s => s.level === listFilterLevel);

        if (listFilterQty !== 'All') {
            list = list.filter(s => {
                const r = s.physicalRequirements?.find(req => req.name === historyModal.reqName);
                if (!r) return false;
                if (listFilterQty === 'Fully Paid') return r.brought >= r.required;
                if (listFilterQty === 'Partially Paid') return r.brought > 0 && r.brought < r.required;
                if (listFilterQty === 'Not Paid') return r.brought === 0;
                return true;
            });
        }

        // Date Filter (Check if any entry matches the date?)
        if (listFilterDate) {
            list = list.filter(s => {
                const r = s.physicalRequirements?.find(req => req.name === historyModal.reqName);
                return r?.entries?.some(e => e.date === listFilterDate);
            });
        }

        if (listSearch) {
            const lower = listSearch.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
        }

        return list.map(s => {
            const req = s.physicalRequirements?.find(r => r.name === historyModal.reqName);
            // Get latest date or list dates?
            const latestDate = req?.entries && req.entries.length > 0 ? req.entries[req.entries.length - 1].date : 'N/A';
            return { student: s, req, latestDate };
        });
    }, [students, historyModal.open, historyModal.reqName, listFilterProg, listFilterLevel, listFilterQty, listFilterDate]);

    const handleExportCSV = () => {
        if (historyList.length === 0) return;

        const headers = ["Name", "Programme", "Level", "Brought", "Required", "Latest Date"];
        const rows = historyList.map(item => [
            item.student.name.replace(/,/g, ''),
            item.student.programme.replace(/,/g, ''),
            item.student.level || 'Year 1',
            item.req?.brought || 0,
            item.req?.required || 0,
            item.latestDate
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${historyModal.reqName}_List_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- ACTIONS ---

    // 1. Rename Requirement Globally
    const handleRenameRequirement = (e: React.FormEvent) => {
        e.preventDefault();
        const toUpdate = students
            .filter(s => s.physicalRequirements?.some(r => r.name === editReqModal.originalName))
            .map(s => ({
                ...s,
                physicalRequirements: s.physicalRequirements?.map(r =>
                    r.name === editReqModal.originalName ? { ...r, name: editReqModal.newName } : r
                )
            }));

        if (toUpdate.length > 0) {
            batchUpdateStudents(
                toUpdate,
                'Requirement Global Rename',
                `Renamed requirement "${editReqModal.originalName}" to "${editReqModal.newName}" for ${toUpdate.length} students`
            );
        }
        setEditReqModal({ open: false, originalName: '', newName: '' });
    };

    // 2. Delete Requirement Globally
    const handleDeleteRequirement = () => {
        const toUpdate = students
            .filter(s => s.physicalRequirements?.some(r => r.name === delReqModal.reqName))
            .map(s => ({
                ...s,
                physicalRequirements: s.physicalRequirements?.filter(r => r.name !== delReqModal.reqName)
            }));

        if (toUpdate.length > 0) {
            batchUpdateStudents(
                toUpdate,
                'Requirement Global Deletion',
                `Deleted requirement "${delReqModal.reqName}" from ${toUpdate.length} students (Reason: ${delReqReason})`
            );
        }
        setDelReqModal({ open: false, reqName: '' });
    };

    // 3. Create New Requirement Type (Assign to ALL students)
    const handleCreateRequirement = (e: React.FormEvent) => {
        e.preventDefault();
        const toUpdate = students
            .filter(s => !s.physicalRequirements?.some(r => r.name === createModal.name))
            .map(s => ({
                ...s,
                physicalRequirements: [...(s.physicalRequirements || []), {
                    name: createModal.name,
                    required: 1,
                    brought: 0,
                    color: createModal.color,
                    entries: []
                }]
            }));

        if (toUpdate.length > 0) {
            batchUpdateStudents(
                toUpdate,
                'Requirement Global Creation',
                `Added new requirement "${createModal.name}" to ${toUpdate.length} students`
            );
        }
        setCreateModal({ open: false, name: '', color: '#3b82f6' });
    };

    // 4. Subscribe Student (Add Optional Req)
    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id.toString() === subStudentId);
        if (student) {
            // Check if already exists
            if (student.physicalRequirements?.some(r => r.name === subModal.reqName)) {
                alert("Student is already subscribed to this requirement.");
                return;
            }

            const reqTemplate = consolidatedRequirements.find(r => r.name === subModal.reqName);
            const newReq: PhysicalRequirement = {
                name: subModal.reqName,
                required: subQty,
                brought: 0,
                color: reqTemplate?.color || '#3b82f6',
                entries: []
            };

            updateStudent({ ...student, physicalRequirements: [...(student.physicalRequirements || []), newReq] });
            logGlobalAction('Requirement Subscription', `Subscribed ${student.name} to ${subModal.reqName}`);
            setSubModal({ open: false, reqName: '' });
            setSubStudentId('');
            setSubQty(1);
            setSubSearch('');
        }
    };

    // 5. Delete Student Entry (Clear Brought)
    const handleDeleteEntry = () => {
        const student = students.find(s => s.id === delEntryModal.studentId);
        if (student && student.physicalRequirements) {
            const updatedReqs = student.physicalRequirements.map(r => {
                if (r.name === delEntryModal.reqName) {
                    // Logic: Reset brought to 0? Or reduce by specific amount?
                    // User said "delete button... requests reason".
                    // Usually means removing the contribution.
                    // For simplicity and safety, let's assume we are resetting/revoking the *brought status* if viewing aggregate,
                    // BUT since we track entries, maybe we should remove the LAST entry?
                    // Given the simple view "Qty Brought / Required", let's assuming resetting `brought` to 0 is too aggressive if they brought 5/10.
                    // Let's just deduct 1 or reset? 
                    // Better interaction: If viewing list of students, "Delete" usually implies "Remove this student from the 'brought' list", i.e. make brought = 0.

                    return {
                        ...r,
                        brought: 0,
                        entries: [] // Clear history
                    };
                }
                return r;
            });
            updateStudent({ ...student, physicalRequirements: updatedReqs });
            logGlobalAction('Requirement Entry Deletion', `Removed requirement entry for ${student.name} - ${delEntryModal.reqName} (Reason: ${delEntryReason})`);
        }
        setDelEntryModal({ open: false, reqName: '', studentId: 0 });
    };

    return (
        <div className="animate-fade-in">
            <style jsx global>{`
                /* Print Styles */
                .print-only { display: none; }
                
                /* Mobile Responsive - Disable sticky header on mobile */
                @media (max-width: 767px) {
                    thead {
                        position: relative !important;
                    }
                }
                
                @media print {
                    @page { size: auto; margin: 5mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 100vw; height: auto !important; overflow: visible !important; }
                    body * { visibility: hidden; }
                    
                    /* Modal Container - Strip Card Styling */
                    .printable-modal { 
                        visibility: visible !important;
                        position: absolute !important; left: 0 !important; top: 0 !important; 
                        width: 100% !important; max-width: none !important; 
                        height: auto !important; min-height: 0 !important; 
                        padding: 0 !important; margin: 0 !important; 
                        background: transparent !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        border-radius: 0 !important;
                        overflow: visible !important; 
                    }
                    .printable-modal * { visibility: visible !important; }

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
                    
                    /* Visibility Utilities */
                    .print-only { display: block !important; }
                    
                    /* Rows */
                    tr { page-break-inside: avoid; }
                    tr:nth-child(even) { background-color: #fafafa !important; }
                    
                    /* Cleanup */
                    div, span { color: black !important; opacity: 1 !important; text-shadow: none !important; }
                }
                .multi-select-box { border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.2); max-height: 200px; overflow-y: auto; padding: 0.5rem; border-radius: 8px; }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Physical Requirements</h2>
                <button onClick={() => setCreateModal({ open: true, name: '', color: '#3b82f6' })} className="btn btn-primary" style={{ background: '#f59e0b' }}>+ New Requirement</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {consolidatedRequirements.map(req => (
                    <div key={req.name} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: req.color }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.025em' }}>{req.name}</h3>
                            <button onClick={() => setEditReqModal({ open: true, originalName: req.name, newName: req.name })} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>✏️</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.5rem', background: `linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.5))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {req.totalBrought} <span style={{ fontSize: '1.25rem', fontWeight: 500, opacity: 0.4, WebkitTextFillColor: 'rgba(255,255,255,0.4)' }}>/ {req.totalRequired}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, fontWeight: 600 }}>Total Brought (Aggregate)</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <button onClick={() => setSubModal({ open: true, reqName: req.name })} className="premium-btn btn-primary-gradient" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>+ Add Subscriber</button>
                                <button onClick={() => setHistoryModal({ open: true, reqName: req.name })} className="premium-btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>View History</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODALS --- */}

            {/* Create New Type */}
            {createModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '450px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ✨ New Requirement
                        </h2>
                        <form onSubmit={handleCreateRequirement}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Requirement Name</label>
                                <input className="premium-input" value={createModal.name} onChange={e => setCreateModal({ ...createModal, name: e.target.value })} required placeholder="e.g. Ream of Paper" />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Color Tag</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input type="color" style={{ width: '60px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }} value={createModal.color} onChange={e => setCreateModal({ ...createModal, color: e.target.value })} />
                                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{createModal.color}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setCreateModal({ ...createModal, open: false })} className="premium-btn btn-secondary">Cancel</button>
                                <button type="submit" className="premium-btn btn-primary-gradient">Create Requirement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Requirement Name */}
            {editReqModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '450px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ✏️ Edit Requirement
                        </h2>
                        <form onSubmit={handleRenameRequirement}>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Requirement Name</label>
                                <input className="premium-input" value={editReqModal.newName} onChange={e => setEditReqModal({ ...editReqModal, newName: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button type="button" onClick={() => { setDelReqModal({ open: true, reqName: editReqModal.originalName }); setEditReqModal({ ...editReqModal, open: false }); }} className="premium-btn" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>Delete</button>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setEditReqModal({ ...editReqModal, open: false })} className="premium-btn btn-secondary">Cancel</button>
                                    <button type="submit" className="premium-btn btn-primary-gradient">Save Changes</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Requirement Global */}
            {delReqModal.open && (
                <div className="fixed-modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="premium-modal" style={{ width: '400px', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                        <h2 style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚠️ Delete Requirement?
                        </h2>
                        <p style={{ marginBottom: '1.5rem', opacity: 0.8, lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong style={{ color: '#fff' }}>{delReqModal.reqName}</strong>? <br />
                            This will remove this requirement from <strong style={{ color: '#ef4444' }}>ALL</strong> students permanently.
                        </p>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Reason for Deletion</label>
                            <select className="premium-input" value={delReqReason} onChange={e => setDelReqReason(e.target.value)}>
                                <option value="No longer required">No longer required</option>
                                <option value="Mistake">Mistake</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setDelReqModal({ open: false, reqName: '' })} className="premium-btn btn-secondary">Cancel</button>
                            <button onClick={handleDeleteRequirement} className="premium-btn" style={{ background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}>Delete Requirement</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscribe Modal */}
            {subModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '95%', maxWidth: '500px' }}>
                        <h2 className="text-xl md:text-2xl font-bold" style={{ marginBottom: '1.5rem' }}>Subscribe to {subModal.reqName}</h2>

                        <div style={{ marginBottom: '1rem' }}>
                            <input className="premium-input" placeholder="🔍 Search Student (Unsubscribed only)..." value={subSearch} onChange={e => setSubSearch(e.target.value)} autoFocus />
                        </div>

                        {subSearchResults.length > 0 && (
                            <div className="multi-select-box" style={{ marginBottom: '1.5rem', maxHeight: '150px' }}>
                                {subSearchResults.map(s => (
                                    <div key={s.id} onClick={() => { setSubStudentId(s.id.toString()); setSubSearch(s.name); }} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '6px', background: subStudentId === s.id.toString() ? 'rgba(245, 158, 11, 0.2)' : 'transparent', border: subStudentId === s.id.toString() ? '1px solid #f59e0b' : '1px solid transparent', transition: 'background 0.2s' }}>
                                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.programme} - {s.level}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Required Quantity</label>
                            <input type="number" min="1" className="premium-input" value={subQty} onChange={e => setSubQty(Number(e.target.value))} />
                            <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
                                This will add the requirement to the student's list with 0 brought.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setSubModal({ ...subModal, open: false })} className="premium-btn btn-secondary">Cancel</button>
                            <button onClick={handleSubscribe} className="premium-btn btn-primary-gradient" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} disabled={!subStudentId}>Add Student</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History List Modal */}
            {historyModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal printable-modal" style={{ width: '95%', maxWidth: '1100px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', flexShrink: 0, flexWrap: 'wrap', gap: '0.5rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <h2 className="text-xl md:text-2xl font-bold" style={{ margin: 0 }}>{historyModal.reqName} History</h2>
                                <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                    Overview
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleExportCSV} className="premium-btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>📄 CSV</button>
                                <button onClick={() => window.print()} className="premium-btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>🖨️ Print</button>
                                <button onClick={() => { setHistoryModal({ open: false, reqName: '' }); setListSearch(''); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: '1rem' }}>×</button>
                            </div>
                        </div>

                        {/* PRINT HEADER OVERLAY */}
                        <div className="print-only" style={{ marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '20pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{schoolProfile?.name || 'VINE SCHOOLS'}</div>
                                    <div style={{ fontSize: '12pt', marginTop: '5px' }}>Academics & Bursar Department</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>{historyModal.reqName} List</div>
                                    <div style={{ fontSize: '10pt', marginTop: '5px' }}>Date: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '9pt', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                                <div><strong>Programme:</strong> {listFilterProg || 'All'}</div>
                                <div><strong>Level:</strong> {listFilterLevel || 'All'}</div>
                                <div><strong>Status:</strong> {listFilterQty || 'All'}</div>
                                <div><strong>Count:</strong> {historyList.length} Students</div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', flexShrink: 0, alignItems: 'center' }}>
                            <div className="premium-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                                <input
                                    className="premium-input"
                                    placeholder="🔍 Search student name..."
                                    value={listSearch}
                                    onChange={e => setListSearch(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                                />
                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></span>

                                {listSearchResults.length > 0 && listSearch && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginTop: '0.25rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
                                        {listSearchResults.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => { setListSearch(s.name); }}
                                                style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{ fontWeight: 500 }}>{s.name}</span>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{s.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div>
                                    <select className="premium-input" style={{ width: '160px', cursor: 'pointer' }} value={listFilterProg} onChange={e => setListFilterProg(e.target.value)}>
                                        <option value="All">All Programmes</option>
                                        {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select className="premium-input" style={{ width: '130px', cursor: 'pointer' }} value={listFilterLevel} onChange={e => setListFilterLevel(e.target.value)}>
                                        <option value="All">All Levels</option>
                                        {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select className="premium-input" style={{ width: '130px', cursor: 'pointer' }} value={listFilterQty} onChange={e => setListFilterQty(e.target.value)}>
                                        <option value="All">All Status</option>
                                        <option value="Fully Paid">Fully Paid</option>
                                        <option value="Partially Paid">Partially Paid</option>
                                        <option value="Not Paid">Not Paid</option>
                                    </select>
                                </div>
                                <div>
                                    <input type="date" className="premium-input" style={{ width: '140px' }} value={listFilterDate} onChange={e => setListFilterDate(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', height: '42px' }}>
                                {Object.keys(visibleColumns).map(c => (
                                    <label key={c} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600, color: (visibleColumns as any)[c] ? '#f59e0b' : '#6b7280' }}>
                                        <input type="checkbox" checked={(visibleColumns as any)[c]} onChange={e => setVisibleColumns({ ...visibleColumns, [c]: e.target.checked })} style={{ display: 'none' }} />
                                        {(visibleColumns as any)[c] ? '✓' : '○'} {c}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Table Wrapper */}
                        <div className="custom-scrollbar" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flex: 1, overflow: 'auto' }}>
                            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', color: 'inherit' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#141414' }}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                                        {visibleColumns.date && <th style={{ padding: '1rem' }}>Date (Latest)</th>}
                                        {visibleColumns.name && <th style={{ padding: '1rem' }}>Student Name</th>}
                                        {visibleColumns.qty && <th style={{ padding: '1rem' }}>Progress (Brought / Req)</th>}
                                        {visibleColumns.action && <th className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyList.map(item => (
                                        <tr key={item.student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {visibleColumns.date && <td style={{ padding: '1rem', opacity: 0.7 }}>{item.latestDate}</td>}
                                            {visibleColumns.name && <td style={{ padding: '1rem', fontWeight: 500 }}>{item.student.name} <small style={{ opacity: 0.5 }}>({item.student.level})</small></td>}
                                            {visibleColumns.qty && (
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ color: item.req!.brought >= item.req!.required ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                                                        {item.req!.brought}
                                                    </span> <span style={{ opacity: 0.5 }}>/ {item.req!.required}</span>
                                                </td>
                                            )}
                                            {visibleColumns.action && (
                                                <td className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setDelEntryModal({ open: true, reqName: historyModal.reqName, studentId: item.student.id })}
                                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                                                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {historyList.length === 0 && <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>No records found matching criteria.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Entry Modal */}
            {delEntryModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '400px', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                        <h2 style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>Delete Entry?</h2>
                        <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                            This will reset the brought quantity to 0 for this student.
                        </p>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Reason</label>
                            <select className="premium-input" value={delEntryReason} onChange={e => setDelEntryReason(e.target.value)}>
                                <option value="Mistake">Mistake</option>
                                <option value="Returned">Item Returned</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setDelEntryModal({ open: false, reqName: '', studentId: 0 })} className="premium-btn btn-secondary">Cancel</button>
                            <button onClick={handleDeleteEntry} className="premium-btn" style={{ background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}>Confirm Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
