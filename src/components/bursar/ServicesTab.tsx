import { useState, useMemo } from 'react';
import { EnrolledStudent, Service, useSchoolData } from '@/lib/store';

interface ServicesTabProps {
    services: Service[];
    students: EnrolledStudent[];
    updateService: (s: Service) => void;
    addService: (s: Service) => void;
    updateStudent: (s: EnrolledStudent) => void;
    deleteService: (id: string) => void;
}

const AVAILABLE_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Certificate', 'Diploma'];

export default function ServicesTab({ services, students, updateService, addService, updateStudent, deleteService }: ServicesTabProps) {
    const { billings, deleteBilling, schoolProfile, batchUpdateStudents, logGlobalAction } = useSchoolData();
    // --- STATE ---
    const [createModalParams, setCreateModalParams] = useState({ open: false, name: '', cost: 0, isEdit: false, id: '' });
    const [serviceDeleteModal, setServiceDeleteModal] = useState<{ open: boolean, serviceId: string, serviceName: string }>({ open: false, serviceId: '', serviceName: '' });
    const [serviceDeleteReason, setServiceDeleteReason] = useState('No longer offered');

    // Add One (Single)
    const [addOneModal, setAddOneModal] = useState({ open: false, serviceId: '', serviceName: '' });
    const [addOneStudentId, setAddOneStudentId] = useState('');
    const [addOneQty, setAddOneQty] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // View List
    const [viewListModal, setViewListModal] = useState<{ open: boolean, serviceId: string, serviceName: string }>({ open: false, serviceId: '', serviceName: '' });
    const [listFilterProg, setListFilterProg] = useState('All');
    const [listFilterLevel, setListFilterLevel] = useState('All');
    const [listSearch, setListSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [visibleColumns, setVisibleColumns] = useState({ name: true, class: true, qty: true, date: true, action: true });

    // ADVANCED BATCH
    const [batchModal, setBatchModal] = useState<{ open: boolean, serviceId: string, serviceName: string }>({ open: false, serviceId: '', serviceName: '' });
    const [batchTab, setBatchTab] = useState<'group' | 'select'>('group');
    const [batchProgs, setBatchProgs] = useState<string[]>([]);
    const [batchLevels, setBatchLevels] = useState<string[]>([]);
    const [batchSearch, setBatchSearch] = useState('');
    const [batchQueue, setBatchQueue] = useState<EnrolledStudent[]>([]); // "Queue" of selected students

    // Batch Preview State
    const [batchPreview, setBatchPreview] = useState<{ open: boolean, toAdd: EnrolledStudent[], skipped: EnrolledStudent[], mode: 'Skip' | 'Add To' | 'Overwrite' } | null>(null);

    // Subscriber Delete
    const [subDeleteModal, setSubDeleteModal] = useState<{ open: boolean, studentIds: number[], serviceId: string | null }>({ open: false, studentIds: [], serviceId: null });
    const [subDeleteReason, setSubDeleteReason] = useState('Mistake');

    // --- DERIVED DATA ---
    const programmes = useMemo(() => Array.from(new Set(students.map(s => s.programme))), [students]);

    // Grand Totals Calculation
    const grandTotals = useMemo(() => {
        let totalRev = 0;
        let totalSubs = 0;
        services.forEach(svc => {
            const subs = students.filter(s => s.services.includes(svc.id));
            const rev = subs.reduce((sum, s) => sum + ((s.serviceMetadata?.[svc.id]?.quantity || 1) * svc.cost), 0);
            totalRev += rev;
            totalSubs += subs.length;
        });
        return { totalRev, totalSubs };
    }, [services, students]);

    // Single Add Search
    const filteredSearchStudents = useMemo(() => {
        if (!searchTerm) return [];
        return students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
    }, [students, searchTerm]);

    // Batch Search (For manual selection)
    const batchSearchResults = useMemo(() => {
        if (!batchSearch) return [];
        return students
            .filter(s => s.name.toLowerCase().includes(batchSearch.toLowerCase()) || s.programme.toLowerCase().includes(batchSearch.toLowerCase()))
            .filter(s => !batchQueue.find(q => q.id === s.id)) // Exclude already queued
            .slice(0, 10);
    }, [students, batchSearch, batchQueue]);

    // --- ACTIONS ---

    // Service CRUD
    const handleCreateOrEditService = (e: React.FormEvent) => {
        e.preventDefault();
        const generatedId = createModalParams.name.trim().toLowerCase().replace(/\s+/g, '-');

        // Prevent Duplicates on Create
        if (!createModalParams.isEdit && services.some(s => s.id === generatedId || s.name.toLowerCase().trim() === createModalParams.name.toLowerCase().trim())) {
            alert("A service with this name already exists.");
            return;
        }

        const newService: Service = {
            id: createModalParams.isEdit ? createModalParams.id : generatedId,
            name: createModalParams.name,
            cost: createModalParams.cost
        };
        if (createModalParams.isEdit) updateService(newService);
        else addService(newService);
        setCreateModalParams({ open: false, name: '', cost: 0, isEdit: false, id: '' });
    };

    const confirmServiceDeletion = () => {
        if (serviceDeleteModal.serviceId) {
            deleteService(serviceDeleteModal.serviceId);
            setServiceDeleteModal({ open: false, serviceId: '', serviceName: '' });
            setCreateModalParams({ open: false, name: '', cost: 0, isEdit: false, id: '' });
        }
    };

    // Add One
    const handleAddSingleSubscriber = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id.toString() === addOneStudentId);
        if (student) {
            const updated = {
                ...student,
                services: Array.from(new Set([...student.services, addOneModal.serviceId])),
                serviceMetadata: { ...(student.serviceMetadata || {}), [addOneModal.serviceId]: { date: new Date().toISOString().split('T')[0], quantity: addOneQty } }
            };
            updateStudent(updated);
            setAddOneModal({ open: false, serviceId: '', serviceName: '' });
            setAddOneStudentId('');
            setAddOneQty(1);
            setSearchTerm('');
        }
    };

    // --- BATCH FLOW ---

    // 1. Calculate & Show Preview
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
            // Manual Queue
            candidates = [...batchQueue];
        }

        if (candidates.length === 0) {
            alert("No students selected.");
            return;
        }

        // Split into "To Add" (New) and "Skipped" (Already subscribed)
        const toAdd = candidates.filter(s => !s.services.includes(batchModal.serviceId));
        const skipped = candidates.filter(s => s.services.includes(batchModal.serviceId));

        setBatchPreview({ open: true, toAdd, skipped, mode: 'Skip' });
    };

    // 2. Confirm & Apply
    const handleConfirmBatch = () => {
        if (!batchPreview) return;

        const studentsToUpdate: EnrolledStudent[] = [];

        // Process New Subscriptions
        batchPreview.toAdd.forEach(s => {
            studentsToUpdate.push({
                ...s,
                services: Array.from(new Set([...s.services, batchModal.serviceId])),
                serviceMetadata: {
                    ...(s.serviceMetadata || {}),
                    [batchModal.serviceId]: {
                        date: new Date().toISOString().split('T')[0],
                        quantity: 1
                    }
                }
            });
        });

        // Process Existing Subscriptions based on mode
        if (batchPreview.mode !== 'Skip') {
            batchPreview.skipped.forEach(s => {
                const existingQty = s.serviceMetadata?.[batchModal.serviceId]?.quantity || 1;
                let newQty = existingQty;

                if (batchPreview.mode === 'Add To') newQty += 1;
                else if (batchPreview.mode === 'Overwrite') newQty = 1;

                if (newQty !== existingQty) {
                    studentsToUpdate.push({
                        ...s,
                        serviceMetadata: {
                            ...(s.serviceMetadata || {}),
                            [batchModal.serviceId]: {
                                ...(s.serviceMetadata?.[batchModal.serviceId] || {}),
                                quantity: newQty
                            }
                        }
                    });
                }
            });
        }

        if (studentsToUpdate.length > 0) {
            batchUpdateStudents(
                studentsToUpdate,
                'Service Batch Assignment',
                `Assigned service ${batchModal.serviceName} to ${studentsToUpdate.length} students (Mode: ${batchPreview.mode})`
            );
        }

        // Reset All
        setBatchPreview(null);
        setBatchModal({ open: false, serviceId: '', serviceName: '' });
        setBatchQueue([]);
        setBatchProgs([]);
        setBatchLevels([]);
    };

    const addToQueue = (student: EnrolledStudent) => {
        setBatchQueue([...batchQueue, student]);
        setBatchSearch(''); // Clear search for next entry
    };

    const removeFromQueue = (id: number) => {
        setBatchQueue(batchQueue.filter(s => s.id !== id));
    };

    // --- OTHER ACTIONS ---
    const confirmUnsubscribe = () => {
        const studentsToUpdate: EnrolledStudent[] = [];
        const service = services.find(s => s.id === subDeleteModal.serviceId);

        subDeleteModal.studentIds.forEach(id => {
            const student = students.find(s => s.id === id);
            if (student && service) {
                // Find associated service billings to trash
                const billingsToDelete = billings.filter(b =>
                    b.studentId === student.id &&
                    b.type === 'Service' &&
                    // Primary Match: serviceId in metadata, Fallback: Name in description
                    (b.metadata?.serviceId === service.id || b.description.includes(service.name)) &&
                    // Only delete for current semester context (active debt)
                    b.term === student.semester
                );
                billingsToDelete.forEach(b => deleteBilling(b.id, `Unsubscribed from Service: ${service.name} (${subDeleteReason})`));

                studentsToUpdate.push({
                    ...student,
                    services: student.services.filter(sid => sid !== subDeleteModal.serviceId)
                });
            }
        });

        if (studentsToUpdate.length > 0) {
            batchUpdateStudents(
                studentsToUpdate,
                'Service Removal',
                `Unsubscribed ${studentsToUpdate.length} students from ${service?.name || 'Unknown'} (Reason: ${subDeleteReason})`
            );
        }

        setSubDeleteModal({ open: false, studentIds: [], serviceId: null });
        setSelectedStudentIds([]);
    };

    const handleExportCSV = () => {
        const { list } = getStats(viewListModal.serviceId);
        if (list.length === 0) return;

        const headers = ["Name", "Programme", "Level", "Semester", "Qty", "Date Added"];
        const rows = list.map(s => [
            s.name.replace(/,/g, ''), // Basic CSV escaping
            s.programme.replace(/,/g, ''),
            s.level || 'Year 1',
            s.semester || 'Semester 1',
            s.serviceMetadata?.[viewListModal.serviceId]?.quantity || 1,
            s.serviceMetadata?.[viewListModal.serviceId]?.date || 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${viewListModal.serviceName}_Subscribers_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStats = (serviceId: string) => {
        let subs = students.filter(s => s.services.includes(serviceId));
        if (viewListModal.open && viewListModal.serviceId === serviceId) {
            if (listFilterProg !== 'All') subs = subs.filter(s => s.programme === listFilterProg);
            if (listFilterLevel !== 'All') subs = subs.filter(s => s.level === listFilterLevel);
            if (listSearch) {
                const lower = listSearch.toLowerCase();
                subs = subs.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
            }
        }
        const revenue = subs.reduce((sum, s) => sum + ((s.serviceMetadata?.[serviceId]?.quantity || 1) * (services.find(svc => svc.id === serviceId)?.cost || 0)), 0);
        return { count: subs.length, revenue, list: subs };
    };

    return (
        <div className="animate-fade-in">
            {/* Styles */}
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
                
                /* Premium Modal Styles */
                .premium-modal {
                    background: rgba(30, 30, 30, 0.95);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    border-radius: 16px;
                    padding: 2rem;
                    color: white;
                    animation: modalPop 0.3s ease-out;
                }
                @keyframes modalPop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .premium-input {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 0.75rem 1rem;
                    color: white;
                    width: 100%;
                    outline: none;
                    transition: all 0.2s;
                }
                .premium-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                    background: rgba(0,0,0,0.3);
                }
                .premium-btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                .btn-primary-gradient {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }
                .btn-primary-gradient:hover {
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
                    transform: translateY(-1px);
                }
                .btn-danger-gradient {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }
                .btn-danger-gradient:hover {
                    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
                    transform: translateY(-1px);
                }
                .btn-secondary {
                    background: rgba(255,255,255,0.05);
                    color: #d1d5db;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .btn-secondary:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
            `}</style>

            {/* GRAND TOTAL SUMMARY */}
            <div className="card flex flex-col sm:flex-row justify-around items-center gap-6 p-6 sm:p-8" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', marginBottom: '2rem', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Projected Revenue</div>
                    <div style={{ fontSize: '1.5rem', md: '2rem', fontWeight: 'bold' }}>UGX {grandTotals.totalRev.toLocaleString()}</div>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-white/30 pt-4 sm:pt-0 sm:pl-8 text-center w-full sm:w-auto">
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Active Subscriptions</div>
                    <div style={{ fontSize: '1.5rem', md: '2rem', fontWeight: 'bold' }}>{grandTotals.totalSubs.toLocaleString()}</div>
                </div>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Available Services</h2>
                <button onClick={() => setCreateModalParams({ open: true, name: '', cost: 0, isEdit: false, id: '' })} className="btn btn-primary" style={{ background: '#10b981' }}>+ Create New Service</button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {services.map((service, index) => {
                    const stats = getStats(service.id);
                    return (
                        <div key={`${service.id}-${index}`} className="card p-3 md:p-6" style={{ borderTop: '4px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 className="text-sm md:text-lg" style={{ margin: 0 }}>{service.name}</h3>
                                <div>
                                    <div style={{ color: '#3b82f6', fontWeight: 'bold', textAlign: 'right' }}>UGX {service.cost.toLocaleString()}</div>
                                    <button onClick={() => setCreateModalParams({ open: true, name: service.name, cost: service.cost, isEdit: true, id: service.id })} style={{ float: 'right', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer' }}>Edit</button>
                                </div>
                            </div>
                            <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.count}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Subscribers</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button onClick={() => setAddOneModal({ open: true, serviceId: service.id, serviceName: service.name })} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}>+ Add One</button>
                                    <button onClick={() => setViewListModal({ open: true, serviceId: service.id, serviceName: service.name })} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>View List</button>
                                    <button onClick={() => setBatchModal({ open: true, serviceId: service.id, serviceName: service.name })} className="btn btn-outline" style={{ fontSize: '0.8rem', borderColor: '#8b5cf6', color: '#8b5cf6' }}>Batch Add</button>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', color: '#10b981', fontSize: '0.9rem' }}>
                                Proj. Revenue: UGX {stats.revenue.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- MODALS --- */}
            {createModalParams.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '450px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {createModalParams.isEdit ? '✏️ Edit Service' : '✨ Create Service'}
                        </h2>
                        <form onSubmit={handleCreateOrEditService}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Service Name</label>
                                <input
                                    className="premium-input"
                                    value={createModalParams.name}
                                    onChange={e => setCreateModalParams({ ...createModalParams, name: e.target.value })}
                                    placeholder="e.g. School Bus, Swimming"
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Cost (UGX)</label>
                                <input
                                    type="number"
                                    className="premium-input"
                                    value={createModalParams.cost || ''}
                                    onChange={e => setCreateModalParams({ ...createModalParams, cost: Number(e.target.value) })}
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {createModalParams.isEdit ? (
                                    <button
                                        type="button"
                                        onClick={() => setServiceDeleteModal({ open: true, serviceId: createModalParams.id, serviceName: createModalParams.name })}
                                        className="premium-btn"
                                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                                    >
                                        Delete
                                    </button>
                                ) : <span></span>}
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setCreateModalParams({ ...createModalParams, open: false })} className="premium-btn btn-secondary">Cancel</button>
                                    <button type="submit" className="premium-btn btn-primary-gradient">Save Service</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {serviceDeleteModal.open && (
                <div className="fixed-modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="card" style={{ width: '400px', border: '1px solid #ef4444' }}>
                        <h2 style={{ color: '#ef4444' }}>Delete {serviceDeleteModal.serviceName}?</h2>
                        <p>This will completely remove the service and unsubscribe all students.</p>
                        <select className="input" style={{ width: '100%', margin: '1rem 0' }} value={serviceDeleteReason} onChange={e => setServiceDeleteReason(e.target.value)}>
                            <option value="No longer offered">No longer offered</option>
                            <option value="Duplicate">Duplicate Entry</option>
                            <option value="Mistake">Created by mistake</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setServiceDeleteModal({ open: false, serviceId: '', serviceName: '' })} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmServiceDeletion} className="btn btn-primary" style={{ background: '#ef4444' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {addOneModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal" style={{ width: '450px' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Add Subscriber to <span style={{ color: '#3b82f6' }}>{addOneModal.serviceName}</span></h2>

                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                className="premium-input"
                                placeholder="🔍 Search Student..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {filteredSearchStudents.length > 0 && (
                            <div className="multi-select-box" style={{ marginBottom: '1.5rem' }}>
                                {filteredSearchStudents.map(s => (
                                    <div key={s.id} onClick={() => { setAddOneStudentId(s.id.toString()); setSearchTerm(s.name); }} className="multi-select-item" style={{ background: addOneStudentId === s.id.toString() ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: addOneStudentId === s.id.toString() ? '1px solid #3b82f6' : '1px solid transparent' }}>
                                        <span style={{ fontWeight: 'bold' }}>{s.name}</span> <small style={{ opacity: 0.7 }}>({s.level})</small>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>Quantity</label>
                            <input type="number" min="1" className="premium-input" value={addOneQty} onChange={e => setAddOneQty(Number(e.target.value))} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setAddOneModal({ ...addOneModal, open: false })} className="premium-btn btn-secondary">Cancel</button>
                            <button onClick={handleAddSingleSubscriber} className="premium-btn btn-primary-gradient" disabled={!addOneStudentId}>
                                + Add Subscriber
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH MODAL */}
            {batchModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        {!batchPreview ? (
                            <>
                                <h2>Batch Add - {batchModal.serviceName}</h2>
                                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #444', marginBottom: '1rem' }}>
                                    <button onClick={() => setBatchTab('group')} style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'white', borderBottom: batchTab === 'group' ? '2px solid #8b5cf6' : 'none', fontWeight: batchTab === 'group' ? 'bold' : 'normal', cursor: 'pointer' }}>By Criteria</button>
                                    <button onClick={() => setBatchTab('select')} style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'white', borderBottom: batchTab === 'select' ? '2px solid #8b5cf6' : 'none', fontWeight: batchTab === 'select' ? 'bold' : 'normal', cursor: 'pointer' }}>Select Students</button>
                                </div>

                                {batchTab === 'group' && (
                                    <div className="animate-fade-in">
                                        <p style={{ opacity: 0.7 }}>Select criteria to add multiple students.</p>
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
                                        <input className="input" placeholder="Search name, programme (Type to add)" style={{ width: '100%', marginBottom: '1rem' }} value={batchSearch} onChange={e => setBatchSearch(e.target.value)} />

                                        {/* Dropdown Results */}
                                        {batchSearchResults.length > 0 && (
                                            <div className="multi-select-box" style={{ marginBottom: '1rem', border: '1px solid #3b82f6' }}>
                                                {batchSearchResults.map(s => (
                                                    <div key={s.id} onClick={() => addToQueue(s)} className="multi-select-item" style={{ padding: '0.4rem', borderBottom: '1px solid #333' }}>
                                                        <span>+</span>
                                                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}> - {s.programme} ({s.level})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Selected Queue */}
                                        <label style={{ display: 'block', marginTop: '1rem' }}>Selected Queue ({batchQueue.length})</label>
                                        <div className="multi-select-box" style={{ minHeight: '100px', background: 'rgba(59, 130, 246, 0.05)' }}>
                                            {batchQueue.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>No students selected yet.</div>}
                                            {batchQueue.map(s => (
                                                <div key={s.id} className="queue-item">
                                                    <span>{s.name} <small style={{ opacity: 0.6 }}>({s.level})</small></span>
                                                    <button onClick={() => removeFromQueue(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => setBatchModal({ ...batchModal, open: false })} className="btn btn-outline">Cancel</button>
                                    <button onClick={handlePreviewBatch} className="btn btn-primary" style={{ background: '#8b5cf6' }}>Apply Batch Add</button>
                                </div>
                            </>
                        ) : (
                            /* PREVIEW SCREEN */
                            <div className="animate-fade-in">
                                <h2>Confirm Batch Update</h2>
                                <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>Review and configure how existing subscriptions should be handled.</p>

                                {/* Quantity Preservation Modes */}
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Quantity Preservation
                                    </label>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        {['Skip', 'Add To', 'Overwrite'].map((m) => (
                                            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: batchPreview.mode === m ? '600' : '400', color: batchPreview.mode === m ? '#fff' : '#aaa' }}>
                                                <input
                                                    type="radio"
                                                    name="batchMode"
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                                    checked={batchPreview.mode === m}
                                                    onChange={() => setBatchPreview({ ...batchPreview, mode: m as any })}
                                                />
                                                {m}
                                            </label>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.8rem', color: '#888', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                                        {batchPreview.mode === 'Skip' && "💡 Students already subscribed to this service will be ignored."}
                                        {batchPreview.mode === 'Add To' && "💡 Already subscribed students will have their service quantity increased by 1."}
                                        {batchPreview.mode === 'Overwrite' && "💡 Already subscribed students will have their quantity reset to exactly 1."}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <h4 style={{ color: '#10b981' }}>Ready to Add ({batchPreview.toAdd.length})</h4>
                                        <div className="multi-select-box" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                                            {batchPreview.toAdd.map(s => (
                                                <div key={s.id} style={{ padding: '0.2rem' }}>• {s.name}</div>
                                            ))}
                                            {batchPreview.toAdd.length === 0 && <div style={{ opacity: 0.5 }}>None</div>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ color: '#f59e0b' }}>Skipped (Already Added) ({batchPreview.skipped.length})</h4>
                                        <div className="multi-select-box" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                                            {batchPreview.skipped.map(s => (
                                                <div key={s.id} style={{ padding: '0.2rem', opacity: 0.7 }}>• {s.name}</div>
                                            ))}
                                            {batchPreview.skipped.length === 0 && <div style={{ opacity: 0.5 }}>None</div>}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                    <button onClick={() => setBatchPreview(null)} className="btn btn-outline">Back</button>
                                    <button
                                        onClick={handleConfirmBatch}
                                        className="btn btn-primary"
                                        style={{ background: '#10b981' }}
                                        disabled={batchPreview.toAdd.length === 0 && (batchPreview.mode === 'Skip' || batchPreview.skipped.length === 0)}
                                    >
                                        Confirm & Process
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {subDeleteModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="card" style={{ width: '350px', border: '1px solid #ef4444' }}>
                        <h2 style={{ color: '#ef4444' }}>Confirm Removal</h2>
                        <p>Removing {subDeleteModal.studentIds.length} subscriber(s).</p>
                        <select className="input" style={{ width: '100%', margin: '1rem 0' }} value={subDeleteReason} onChange={e => setSubDeleteReason(e.target.value)}>
                            <option value="Mistake">Mistake</option>
                            <option value="NonPayment">Non-Payment</option>
                            <option value="OptOut">Opt-Out</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setSubDeleteModal({ open: false, studentIds: [], serviceId: null })} className="btn btn-outline">Cancel</button>
                            <button onClick={confirmUnsubscribe} className="btn btn-primary" style={{ background: '#ef4444' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {viewListModal.open && (
                <div className="fixed-modal-overlay">
                    <div className="premium-modal printable-modal" style={{ width: '900px', maxHeight: '95vh', overflowY: 'auto' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{viewListModal.serviceName} List</h2>
                                <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {getStats(viewListModal.serviceId).count} Subscribers
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {selectedStudentIds.length > 0 && (
                                    <button
                                        onClick={() => setSubDeleteModal({ open: true, studentIds: selectedStudentIds, serviceId: viewListModal.serviceId })}
                                        className="premium-btn"
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                    >
                                        Delete Selected ({selectedStudentIds.length})
                                    </button>
                                )}
                                <button onClick={handleExportCSV} className="premium-btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>📄 CSV</button>
                                <button onClick={() => window.print()} className="premium-btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>🖨️ Print</button>
                                <button onClick={() => { setViewListModal({ ...viewListModal, open: false }); setListSearch(''); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: '1rem' }}>×</button>
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
                                    <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>{viewListModal.serviceName} List</div>
                                    <div style={{ fontSize: '10pt', marginTop: '5px' }}>Date: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '9pt', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                                <div><strong>Programme:</strong> {listFilterProg || 'All'}</div>
                                <div><strong>Level:</strong> {listFilterLevel || 'All'}</div>
                                <div><strong>Count:</strong> {getStats(viewListModal.serviceId).count} Subscribers</div>
                            </div>
                        </div>

                        {/* Filters & Search */}
                        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto auto', gap: '1rem', marginBottom: '1.5rem' }}>
                            {/* Search */}
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

                            {/* Dropdowns */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div>
                                    <select className="premium-input" style={{ width: '180px', cursor: 'pointer' }} value={listFilterProg} onChange={e => setListFilterProg(e.target.value)}>
                                        <option value="All">All Programmes</option>
                                        {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select className="premium-input" style={{ width: '150px', cursor: 'pointer' }} value={listFilterLevel} onChange={e => setListFilterLevel(e.target.value)}>
                                        <option value="All">All Levels</option>
                                        {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Column Toggles */}
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {Object.keys(visibleColumns).map(c => (
                                    <label key={c} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600, color: (visibleColumns as any)[c] ? '#60a5fa' : '#6b7280' }}>
                                        <input type="checkbox" checked={(visibleColumns as any)[c]} onChange={e => setVisibleColumns({ ...visibleColumns, [c]: e.target.checked })} style={{ display: 'none' }} />
                                        {(visibleColumns as any)[c] ? '✓' : '○'} {c}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'inherit' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                                        <th className="no-print" style={{ padding: '1rem', width: '40px' }}><input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} onChange={e => setSelectedStudentIds(e.target.checked ? getStats(viewListModal.serviceId).list.map(s => s.id) : [])} /></th>
                                        {visibleColumns.name && <th style={{ padding: '1rem' }}>Name</th>}
                                        {visibleColumns.class && <th style={{ padding: '1rem' }}>Class</th>}
                                        {visibleColumns.qty && <th style={{ padding: '1rem' }}>Qty</th>}
                                        {visibleColumns.date && <th style={{ padding: '1rem' }}>Date Added</th>}
                                        {visibleColumns.action && <th className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getStats(viewListModal.serviceId).list.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                                                <div>No subscribers found matching your search.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        getStats(viewListModal.serviceId).list.map(s => (
                                            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td className="no-print" style={{ padding: '1rem' }}><input type="checkbox" style={{ transform: 'scale(1.2)', cursor: 'pointer' }} checked={selectedStudentIds.includes(s.id)} onChange={e => {
                                                    if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                                                    else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                                }} /></td>
                                                {visibleColumns.name && <td style={{ padding: '1rem', fontWeight: 500 }}>{s.name}</td>}
                                                {visibleColumns.class && <td style={{ padding: '1rem', opacity: 0.8 }}>{s.programme} - {s.level}</td>}
                                                {visibleColumns.qty && <td style={{ padding: '1rem' }}>
                                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem' }}>{s.serviceMetadata?.[viewListModal.serviceId]?.quantity || 1}</span>
                                                </td>}
                                                {visibleColumns.date && <td style={{ padding: '1rem', opacity: 0.6, fontSize: '0.9rem' }}>{s.serviceMetadata?.[viewListModal.serviceId]?.date}</td>}
                                                {visibleColumns.action && <td className="no-print" style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSubDeleteModal({ open: true, studentIds: [s.id], serviceId: viewListModal.serviceId })}
                                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                                                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                                    >
                                                        Unsubscribe
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
            )
            }
        </div >
    );
}
