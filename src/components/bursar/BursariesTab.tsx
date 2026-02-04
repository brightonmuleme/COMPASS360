import { useState, useMemo } from 'react';
import { EnrolledStudent, Bursary, useSchoolData } from '@/lib/store';

interface BursariesTabProps {
    bursaries: Bursary[];
    students: EnrolledStudent[];
    updateBursary: (b: Bursary) => void;
    addBursary: (b: Bursary) => void;
    updateStudent: (s: EnrolledStudent) => void;
    deleteBursary: (id: string) => void;
}

const AVAILABLE_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Certificate', 'Diploma'];

export default function BursariesTab({ bursaries, students, updateBursary, addBursary, updateStudent, deleteBursary }: BursariesTabProps) {
    const { schoolProfile, batchUpdateStudents, logGlobalAction } = useSchoolData();
    // --- STATE ---
    // Schemes Management
    const [createModalParams, setCreateModalParams] = useState({ open: false, name: '', value: 0, isEdit: false, id: '' });
    const [schemeDeleteModal, setSchemeDeleteModal] = useState<{ open: boolean, id: string, name: string }>({ open: false, id: '', name: '' });
    const [schemeDeleteReason, setSchemeDeleteReason] = useState('Discontinued');

    // Add One (Single Beneficiary)
    const [addOneModal, setAddOneModal] = useState({ open: false, schemeId: '', schemeName: '' });
    const [addOneStudentId, setAddOneStudentId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // View List
    const [viewListModal, setViewListModal] = useState<{ open: boolean, schemeId: string, schemeName: string }>({ open: false, schemeId: '', schemeName: '' });
    const [listFilterProg, setListFilterProg] = useState('All');
    const [listFilterLevel, setListFilterLevel] = useState('All');
    const [listSearch, setListSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [visibleColumns, setVisibleColumns] = useState({ name: true, class: true, value: true, action: true });

    // ADVANCED BATCH
    const [batchModal, setBatchModal] = useState<{ open: boolean, schemeId: string, schemeName: string }>({ open: false, schemeId: '', schemeName: '' });
    const [batchTab, setBatchTab] = useState<'group' | 'select'>('group');
    const [batchProgs, setBatchProgs] = useState<string[]>([]);
    const [batchLevels, setBatchLevels] = useState<string[]>([]);
    const [batchSearch, setBatchSearch] = useState('');
    const [batchQueue, setBatchQueue] = useState<EnrolledStudent[]>([]);

    // Batch Preview
    const [batchPreview, setBatchPreview] = useState<{ open: boolean, toAdd: EnrolledStudent[], replaced: EnrolledStudent[] } | null>(null);

    // Remove Beneficiary Modal
    const [removeModal, setRemoveModal] = useState<{ open: boolean, studentIds: number[] }>({ open: false, studentIds: [] });
    const [removeReason, setRemoveReason] = useState('Revoked');

    // --- DERIVED DATA ---
    const programmes = useMemo(() => Array.from(new Set(students.map(s => s.programme))), [students]);

    // Filter out 'none' scheme for display purposes (usually standard payers)
    const activeSchemes = useMemo(() => bursaries.filter(b => b.id !== 'none'), [bursaries]);

    // Dashboard Stats
    const grandTotals = useMemo(() => {
        let totalValue = 0;
        let totalBen = 0;
        students.forEach(s => {
            if (s.bursary && s.bursary !== 'none') {
                const scheme = bursaries.find(b => b.id === s.bursary);
                if (scheme) {
                    totalValue += scheme.value;
                    totalBen++;
                }
            }
        });
        return { totalValue, totalBen };
    }, [students, bursaries]);

    // Single Search
    const filteredSearchStudents = useMemo(() => {
        if (!searchTerm) return [];
        return students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
    }, [students, searchTerm]);

    // Batch Search
    const batchSearchResults = useMemo(() => {
        if (!batchSearch) return [];
        return students
            .filter(s => s.name.toLowerCase().includes(batchSearch.toLowerCase()) || s.programme.toLowerCase().includes(batchSearch.toLowerCase()))
            .filter(s => !batchQueue.find(q => q.id === s.id))
            .slice(0, 10);
    }, [students, batchSearch, batchQueue]);


    // --- ACTIONS ---

    // Scheme CRUD
    const handleCreateOrEdit = (e: React.FormEvent) => {
        e.preventDefault();
        const newScheme: Bursary = {
            id: createModalParams.isEdit ? createModalParams.id : createModalParams.name.toLowerCase().replace(/\s+/g, '-'),
            name: createModalParams.name,
            value: createModalParams.value
        };
        if (createModalParams.isEdit) updateBursary(newScheme);
        else addBursary(newScheme);
        setCreateModalParams({ open: false, name: '', value: 0, isEdit: false, id: '' });
    };

    const confirmSchemeDelete = () => {
        if (schemeDeleteModal.id) {
            deleteBursary(schemeDeleteModal.id);
            // Reset students on this scheme to 'none'
            const toUpdate = students
                .filter(s => s.bursary === schemeDeleteModal.id)
                .map(s => ({ ...s, bursary: 'none' }));

            if (toUpdate.length > 0) {
                batchUpdateStudents(
                    toUpdate,
                    'Bursary Scheme Deletion',
                    `Reset ${toUpdate.length} students to 'none' after deleting scheme ${schemeDeleteModal.name}`
                );
            }
            setSchemeDeleteModal({ open: false, id: '', name: '' });
            setCreateModalParams({ open: false, name: '', value: 0, isEdit: false, id: '' });
        }
    };

    // Single Add
    const handleAddSingle = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id.toString() === addOneStudentId);
        if (student) {
            updateStudent({ ...student, bursary: addOneModal.schemeId });
            setAddOneModal({ open: false, schemeId: '', schemeName: '' });
            setAddOneStudentId('');
            setSearchTerm('');
        }
    };

    // --- BATCH FLOW ---
    const handlePreviewBatch = () => {
        let candidates: EnrolledStudent[] = [];

        if (batchTab === 'group') {
            if (batchProgs.length === 0 && batchLevels.length === 0) {
                alert("Please select at least one Programme or Level.");
                return;
            }
            candidates = students.filter(s => {
                const progMatch = batchProgs.length === 0 || batchProgs.includes(s.programme);
                const levelMatch = batchLevels.length === 0 || (s.level && batchLevels.includes(s.level));
                return progMatch && levelMatch;
            });
        } else {
            candidates = [...batchQueue];
        }

        if (candidates.length === 0) {
            alert("No students selected.");
            return;
        }

        // Split: To Add (Currently None or Different) vs Replaced (Currently on another scheme)
        // Actually, for Bursaries, it's always a replacement if they have one.
        // We just list them all as "Ready to Assign". 
        // We can highlight if they are already on THIS scheme (Skipped) vs Switching.

        const toAdd = candidates.filter(s => s.bursary !== batchModal.schemeId);
        const skipped = candidates.filter(s => s.bursary === batchModal.schemeId);

        setBatchPreview({ open: true, toAdd, replaced: skipped }); // Reusing 'replaced' for 'skipped' logic in UI for consistency with Services
    };

    const handleConfirmBatch = () => {
        if (!batchPreview) return;
        if (batchPreview.toAdd.length > 0) {
            batchUpdateStudents(
                batchPreview.toAdd.map(s => ({ ...s, bursary: batchModal.schemeId })),
                'Bursary Batch Assignment',
                `Assigned bursary ${batchModal.schemeName} to ${batchPreview.toAdd.length} students`
            );
        }
        setBatchPreview(null);
        setBatchModal({ open: false, schemeId: '', schemeName: '' });
        setBatchQueue([]);
        setBatchProgs([]);
        setBatchLevels([]);
    };

    const addToQueue = (student: EnrolledStudent) => {
        setBatchQueue([...batchQueue, student]);
        setBatchSearch('');
    };

    const removeFromQueue = (id: number) => {
        setBatchQueue(batchQueue.filter(s => s.id !== id));
    };

    // --- REMOVE BENEFICIARY ---
    const confirmRemoveBeneficiary = () => {
        const toUpdate = removeModal.studentIds
            .map(id => students.find(s => s.id === id))
            .filter((s): s is EnrolledStudent => !!s)
            .map(s => ({ ...s, bursary: 'none' }));

        if (toUpdate.length > 0) {
            batchUpdateStudents(
                toUpdate,
                'Bursary Removal',
                `Removed bursary from ${toUpdate.length} students (Reason: ${removeReason})`
            );
        }
        setRemoveModal({ open: false, studentIds: [] });
        setSelectedStudentIds([]);
    };

    const handleExportCSV = () => {
        const { list } = getStats(viewListModal.schemeId);
        if (list.length === 0) return;

        const val = bursaries.find(b => b.id === viewListModal.schemeId)?.value || 0;
        const headers = ["Name", "Programme", "Level", "Semester", "Bursary Value"];
        const rows = list.map(s => [
            s.name.replace(/,/g, ''),
            s.programme.replace(/,/g, ''),
            s.level || 'Year 1',
            s.semester || 'Semester 1',
            val
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${viewListModal.schemeName}_Beneficiaries_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStats = (schemeId: string) => {
        let subs = students.filter(s => s.bursary === schemeId);
        if (viewListModal.open && viewListModal.schemeId === schemeId) {
            if (listFilterProg !== 'All') subs = subs.filter(s => s.programme === listFilterProg);
            if (listFilterLevel !== 'All') subs = subs.filter(s => s.level === listFilterLevel);
            if (listSearch) {
                const lower = listSearch.toLowerCase();
                subs = subs.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
            }
        }
        const val = bursaries.find(b => b.id === schemeId)?.value || 0;
        return { count: subs.length, total: subs.length * val, list: subs };
    };

    return (
        <div className="animate-fade-in">
            <style jsx global>{`
                /* Print Styles */
                .print-only { display: none; }
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
                .multi-select-box { border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); max-height: 200px; overflow-y: auto; padding: 0.5rem; border-radius: 8px; }
                .multi-select-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.6rem; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
                .multi-select-item:hover { background: rgba(255,255,255,0.05); }
                .queue-item { display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(255,255,255,0.05); margin-bottom: 0.2rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); }
            `}</style>

            {/* DASHBOARD */}
            <div className="card" style={{ background: 'linear-gradient(to right, #10b981, #3b82f6)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '1.5rem', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Value Awarded</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>UGX {grandTotals.totalValue.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '2rem' }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Beneficiaries</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{grandTotals.totalBen.toLocaleString()}</div>
                </div>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Active Bursary Schemes</h2>
                <button onClick={() => setCreateModalParams({ open: true, name: '', value: 0, isEdit: false, id: '' })} className="btn btn-primary" style={{ background: '#10b981' }}>+ Create New Scheme</button>
            </div>

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {activeSchemes.map(scheme => {
                    const stats = getStats(scheme.id);
                    return (
                        <div key={scheme.id} className="card" style={{ borderTop: '4px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{scheme.name}</h3>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>UGX {scheme.value.toLocaleString()}</div>
                                    <button onClick={() => setCreateModalParams({ open: true, name: scheme.name, value: scheme.value, isEdit: true, id: scheme.id })} className="touch-target" style={{ float: 'right', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer' }}>Edit</button>
                                </div>
                            </div>
                            <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.count}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Beneficiaries</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button onClick={() => setAddOneModal({ open: true, schemeId: scheme.id, schemeName: scheme.name })} className="btn btn-primary touch-target" style={{ fontSize: '0.8rem', padding: '0.3rem 1rem' }}>+ Add</button>
                                    <button onClick={() => setViewListModal({ open: true, schemeId: scheme.id, schemeName: scheme.name })} className="btn btn-outline touch-target" style={{ fontSize: '0.8rem' }}>View List</button>
                                    <button onClick={() => setBatchModal({ open: true, schemeId: scheme.id, schemeName: scheme.name })} className="btn btn-outline touch-target" style={{ fontSize: '0.8rem', borderColor: '#8b5cf6', color: '#8b5cf6' }}>Batch Add</button>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', color: '#10b981', fontSize: '0.8rem' }}>
                                Total Impact: UGX {stats.total.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- MODALS --- */}

            {/* Create/Edit */}
            {createModalParams.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '95%', maxWidth: '450px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {createModalParams.isEdit ? '✏️ Edit Scheme' : '✨ Create Scheme'}
                        </h2>
                        <form onSubmit={handleCreateOrEdit}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Scheme Name</label>
                                <input className="premium-input" value={createModalParams.name} onChange={e => setCreateModalParams({ ...createModalParams, name: e.target.value })} required placeholder="e.g. Presidential Bursary" />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Value (Fixed Amount)</label>
                                <input type="number" className="premium-input" value={createModalParams.value} onChange={e => setCreateModalParams({ ...createModalParams, value: Number(e.target.value) })} required />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                {createModalParams.isEdit ? (
                                    <button type="button" onClick={() => setSchemeDeleteModal({ open: true, id: createModalParams.id, name: createModalParams.name })} className="premium-btn touch-target" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem 1rem' }}>Delete</button>
                                ) : <span></span>}
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setCreateModalParams({ ...createModalParams, open: false })} className="premium-btn btn-secondary touch-target">Cancel</button>
                                    <button type="submit" className="premium-btn btn-primary-gradient touch-target">Save Scheme</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Scheme */}
            {schemeDeleteModal.open && (
                <div className="fixed-modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="card" style={{ width: '400px', border: '1px solid #ef4444' }}>
                        <h2 style={{ color: '#ef4444' }}>Delete {schemeDeleteModal.name}?</h2>
                        <p>This will remove the scheme and revoke it from all beneficiaries.</p>
                        <select className="input" style={{ width: '100%', margin: '1rem 0' }} value={schemeDeleteReason} onChange={e => setSchemeDeleteReason(e.target.value)}>
                            <option value="Discontinued">Discontinued</option>
                            <option value="Mistake">Created by Mistake</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setSchemeDeleteModal({ open: false, id: '', name: '' })} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmSchemeDelete} className="btn btn-primary" style={{ background: '#ef4444' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Single */}
            {addOneModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '95%', maxWidth: '450px' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Assign to <span style={{ color: '#10b981' }}>{addOneModal.schemeName}</span></h2>

                        <div style={{ marginBottom: '1rem' }}>
                            <input className="premium-input" placeholder="🔍 Search Student to Assign..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                        </div>

                        {filteredSearchStudents.length > 0 && (
                            <div className="multi-select-box" style={{ marginBottom: '1.5rem' }}>
                                {filteredSearchStudents.map(s => (
                                    <div key={s.id} onClick={() => { setAddOneStudentId(s.id.toString()); setSearchTerm(s.name); }} className="multi-select-item" style={{ background: addOneStudentId === s.id.toString() ? 'rgba(16, 185, 129, 0.2)' : 'transparent', border: addOneStudentId === s.id.toString() ? '1px solid #10b981' : '1px solid transparent' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                                            <small style={{ opacity: 0.7 }}>{s.level} - {s.programme}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setAddOneModal({ ...addOneModal, open: false })} className="premium-btn btn-secondary touch-target">Cancel</button>
                            <button onClick={handleAddSingle} className="premium-btn btn-primary-gradient touch-target" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.5rem 1.5rem' }} disabled={!addOneStudentId}>Assign Beneficiary</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Modal */}
            {batchModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        {!batchPreview ? (
                            <>
                                <h2>Batch Award - {batchModal.schemeName}</h2>
                                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #444', marginBottom: '1rem' }}>
                                    <button onClick={() => setBatchTab('group')} style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'white', borderBottom: batchTab === 'group' ? '2px solid #8b5cf6' : 'none', fontWeight: batchTab === 'group' ? 'bold' : 'normal', cursor: 'pointer' }}>By Criteria</button>
                                    <button onClick={() => setBatchTab('select')} style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'white', borderBottom: batchTab === 'select' ? '2px solid #8b5cf6' : 'none', fontWeight: batchTab === 'select' ? 'bold' : 'normal', cursor: 'pointer' }}>Select Students</button>
                                </div>

                                {batchTab === 'group' && (
                                    <div className="animate-fade-in">
                                        <p style={{ opacity: 0.7 }}>Select criteria to award multiple students.</p>
                                        <label style={{ display: 'block', marginTop: '1rem' }}>Programmes</label>
                                        <div className="multi-select-box">
                                            {programmes.map(p => (
                                                <label key={p} className="multi-select-item">
                                                    <input type="checkbox" checked={batchProgs.includes(p)} onChange={e => e.target.checked ? setBatchProgs([...batchProgs, p]) : setBatchProgs(batchProgs.filter(x => x !== p))} />
                                                    {p}
                                                </label>
                                            ))}
                                        </div>
                                        <label style={{ display: 'block', marginTop: '1rem' }}>Levels</label>
                                        <div className="multi-select-box">
                                            {AVAILABLE_LEVELS.map(l => (
                                                <label key={l} className="multi-select-item">
                                                    <input type="checkbox" checked={batchLevels.includes(l)} onChange={e => e.target.checked ? setBatchLevels([...batchLevels, l]) : setBatchLevels(batchLevels.filter(x => x !== l))} />
                                                    {l}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {batchTab === 'select' && (
                                    <div className="animate-fade-in">
                                        <input className="input" placeholder="Search to add to queue..." style={{ width: '100%', marginBottom: '1rem' }} value={batchSearch} onChange={e => setBatchSearch(e.target.value)} />

                                        {batchSearchResults.length > 0 && (
                                            <div className="multi-select-box" style={{ marginBottom: '1rem', border: '1px solid #3b82f6' }}>
                                                {batchSearchResults.map(s => (
                                                    <div key={s.id} onClick={() => addToQueue(s)} className="multi-select-item" style={{ padding: '0.4rem', borderBottom: '1px solid #333' }}>
                                                        <span>+</span>
                                                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}> - {s.programme} ({s.level || 'N/A'})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <label style={{ display: 'block', marginTop: '1rem' }}>Selected Queue ({batchQueue.length})</label>
                                        <div className="multi-select-box" style={{ minHeight: '100px', background: 'rgba(59, 130, 246, 0.05)' }}>
                                            {batchQueue.map(s => (
                                                <div key={s.id} className="queue-item">
                                                    <span>{s.name} <small>({s.level})</small></span>
                                                    <button onClick={() => removeFromQueue(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => setBatchModal({ ...batchModal, open: false })} className="btn btn-outline">Cancel</button>
                                    <button onClick={handlePreviewBatch} className="btn btn-primary" style={{ background: '#8b5cf6' }}>Preview Award</button>
                                </div>
                            </>
                        ) : (
                            <div className="animate-fade-in">
                                <h2>Confirm Awards</h2>
                                <p style={{ marginBottom: '1rem' }}>Review changes.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <h4 style={{ color: '#10b981' }}>Assigning ({batchPreview.toAdd.length})</h4>
                                        <div className="multi-select-box" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                                            {batchPreview.toAdd.map(s => <div key={s.id} style={{ padding: '0.2rem' }}>• {s.name}</div>)}
                                            {batchPreview.toAdd.length === 0 && <div style={{ opacity: 0.5 }}>None</div>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ color: '#f59e0b' }}>Already Assigned ({batchPreview.replaced.length})</h4>
                                        <div className="multi-select-box" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                                            {batchPreview.replaced.map(s => <div key={s.id} style={{ padding: '0.2rem', opacity: 0.7 }}>• {s.name}</div>)}
                                            {batchPreview.replaced.length === 0 && <div style={{ opacity: 0.5 }}>None</div>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => setBatchPreview(null)} className="btn btn-outline">Back</button>
                                    <button onClick={handleConfirmBatch} className="btn btn-primary" style={{ background: '#10b981' }} disabled={batchPreview.toAdd.length === 0}>Confirm</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Remove Beneficiary */}
            {removeModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="card" style={{ width: '350px', border: '1px solid #ef4444' }}>
                        <h2 style={{ color: '#ef4444' }}>Revoke Bursary?</h2>
                        <p>Removing {removeModal.studentIds.length} beneficiary(s).</p>
                        <select className="input" style={{ width: '100%', margin: '1rem 0' }} value={removeReason} onChange={e => setRemoveReason(e.target.value)}>
                            <option value="Revoked">Revoked</option>
                            <option value="Expired">Expired</option>
                            <option value="Mistake">Mistake</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setRemoveModal({ open: false, studentIds: [] })} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmRemoveBeneficiary} className="btn btn-primary" style={{ background: '#ef4444' }}>Revoke</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View List */}
            {viewListModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal printable-modal" style={{ width: '95%', maxWidth: '1000px', maxHeight: '95vh', overflowY: 'auto' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <h2 className="text-xl md:text-2xl font-bold" style={{ margin: 0 }}>{viewListModal.schemeName} List</h2>
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {getStats(viewListModal.schemeId).count} Beneficiaries
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {selectedStudentIds.length > 0 && (
                                    <button
                                        onClick={() => setRemoveModal({ open: true, studentIds: selectedStudentIds })}
                                        className="premium-btn text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 touch-target"
                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                    >
                                        Revoke ({selectedStudentIds.length})
                                    </button>
                                )}
                                <button onClick={handleExportCSV} className="premium-btn btn-secondary touch-target" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>📄 CSV</button>
                                <button onClick={() => window.print()} className="premium-btn btn-secondary touch-target" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>🖨️ Print</button>
                                <button onClick={() => { setViewListModal({ ...viewListModal, open: false }); setListSearch(''); }} className="touch-target" style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>×</button>
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
                                    <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>{viewListModal.schemeName} List</div>
                                    <div style={{ fontSize: '10pt', marginTop: '5px' }}>Date: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '9pt', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                                <div><strong>Programme:</strong> {listFilterProg || 'All'}</div>
                                <div><strong>Level:</strong> {listFilterLevel || 'All'}</div>
                                <div><strong>Count:</strong> {getStats(viewListModal.schemeId).count} Beneficiaries</div>
                            </div>
                        </div>

                        {/* Filters & Search */}
                        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="premium-input-wrapper" style={{ position: 'relative' }}>
                                    <input
                                        className="premium-input"
                                        placeholder="🔍 Search name or code..."
                                        value={listSearch}
                                        onChange={e => setListSearch(e.target.value)}
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select className="premium-input" style={{ flex: 1, minWidth: '120px', cursor: 'pointer' }} value={listFilterProg} onChange={e => setListFilterProg(e.target.value)}>
                                        <option value="All">All Programmes</option>
                                        {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <select className="premium-input" style={{ flex: 1, minWidth: '100px', cursor: 'pointer' }} value={listFilterLevel} onChange={e => setListFilterLevel(e.target.value)}>
                                        <option value="All">All Levels</option>
                                        {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', whiteSpace: 'nowrap' }} className="custom-scrollbar">
                                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 'bold' }}>COLUMNS:</span>
                                {Object.keys(visibleColumns).map(c => (
                                    <label key={c} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600, color: (visibleColumns as any)[c] ? '#10b981' : '#6b7280' }}>
                                        <input type="checkbox" checked={(visibleColumns as any)[c]} onChange={e => setVisibleColumns({ ...visibleColumns, [c]: e.target.checked })} style={{ display: 'none' }} />
                                        {(visibleColumns as any)[c] ? '✓' : '○'} {c}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', color: 'inherit' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                                            <th className="no-print" style={{ padding: '1rem', width: '40px' }}><input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} onChange={e => setSelectedStudentIds(e.target.checked ? getStats(viewListModal.schemeId).list.map(s => s.id) : [])} /></th>
                                            {visibleColumns.name && <th style={{ padding: '1rem' }}>Name</th>}
                                            {visibleColumns.class && <th style={{ padding: '1rem' }}>Class</th>}
                                            {visibleColumns.value && <th style={{ padding: '1rem' }}>Value</th>}
                                            {visibleColumns.action && <th className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getStats(viewListModal.schemeId).list.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                                                    <div>No beneficiaries found matching your search.</div>
                                                </td>
                                            </tr>
                                        ) : (
                                            getStats(viewListModal.schemeId).list.map(s => (
                                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td className="no-print" style={{ padding: '1rem' }}><input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} checked={selectedStudentIds.includes(s.id)} onChange={e => {
                                                        if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                                                        else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                                    }} /></td>
                                                    {visibleColumns.name && <td style={{ padding: '1rem', fontWeight: 500 }}>{s.name}</td>}
                                                    {visibleColumns.class && <td style={{ padding: '1rem', opacity: 0.8 }}>{s.programme} - {s.level}</td>}
                                                    {visibleColumns.value && <td style={{ padding: '1rem', color: '#10b981', fontWeight: 600 }}>UGX {bursaries.find(b => b.id === s.bursary)?.value.toLocaleString()}</td>}
                                                    {visibleColumns.action && <td className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => setRemoveModal({ open: true, studentIds: [s.id] })}
                                                            className="touch-target"
                                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                                                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                                        >
                                                            Revoke
                                                        </button>
                                                    </td>}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    );
}
