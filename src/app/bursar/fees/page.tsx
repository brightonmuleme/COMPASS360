"use client";
import React, { useState } from 'react';
import { useSchoolData, Programme } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function FeesStructurePage() {
    const router = useRouter(); // Initialize router inside component
    const { filteredStudents: students, filteredProgrammes: programmes, addProgramme, updateProgramme, deleteProgramme } = useSchoolData();
    const [createModal, setCreateModal] = useState<{ open: boolean, isEdit: boolean, id: string, name: string, code: string, type: Programme['type'], duration: string }>({
        open: false, isEdit: false, id: '', name: '', code: '', type: 'Degree', duration: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);



    const handleEdit = (prog: Programme) => {
        // Debug
        // alert('Editing ' + prog.name); 

        setCreateModal({
            open: true,
            isEdit: true,
            id: prog.id,
            name: prog.name,
            code: prog.code,
            type: prog.type,
            duration: prog.duration
        });
        setActiveMenu(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const generatedId = createModal.name.toLowerCase().replace(/\s+/g, '-');
        const p: Programme = {
            id: createModal.isEdit ? createModal.id : `${generatedId}-bursar`,
            name: createModal.name,
            code: createModal.code,
            type: createModal.type,
            duration: createModal.duration,
            origin: 'bursar'
        };

        if (createModal.isEdit) {
            updateProgramme(p);
        } else {
            addProgramme(p);
        }
        setCreateModal({ open: false, isEdit: false, id: '', name: '', code: '', type: 'Degree', duration: '' });
    };

    const getProgrammeStats = (progName: string) => {
        const progStudents = students.filter(s => s.programme === progName);
        if (progStudents.length === 0) return { percentage: 0, paid: 0, total: 0, studentCount: 0 };

        const totalFees = progStudents.reduce((sum, s) => sum + s.totalFees, 0);
        const totalBalance = progStudents.reduce((sum, s) => sum + s.balance, 0);
        const paid = totalFees - totalBalance;
        const percentage = totalFees > 0 ? (paid / totalFees) * 100 : 0;

        return { percentage, paid, total: totalFees, studentCount: progStudents.length };
    };

    const filteredProgrammes = programmes.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 md:p-8 text-white min-h-screen">
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .search-input-wrapper { position: relative; width: 100%; max-width: 300px; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.5; font-size: 1.2rem; }
                .card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4) !important; }
                .card:active { transform: scale(0.98); }
            `}</style>

            <div className="animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4 mb-4 md:mb-8">
                    <div>
                        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            Fees Structures & Programmes
                        </h1>
                        <p className="text-xs md:text-base text-gray-400 mt-0.5 md:mt-1">Manage academic programmes & fee collection.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 md:gap-4 items-stretch sm:items-center">
                        <div className="search-input-wrapper w-full sm:w-auto">
                            <span className="search-icon text-sm md:text-base">🔍</span>
                            <input
                                type="text"
                                placeholder="Search Programs..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="input w-full touch-target text-sm"
                                style={{
                                    padding: '0.6rem 0.6rem 0.6rem 2.2rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => setCreateModal({ open: true, isEdit: false, id: '', name: '', code: '', type: 'Degree', duration: '' })}
                            className="btn touch-target w-full sm:w-auto text-sm"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                fontWeight: '600',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <span>+</span> Add Programme
                        </button>
                    </div>
                </div>

                {/* Quick Stats & Search */}
                {/* This section was removed as per instructions */}

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredProgrammes.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                            <h3>No programmes found</h3>
                            <p>Try adjusting your search terms.</p>
                        </div>
                    ) : filteredProgrammes.map((prog, index) => {
                        const stats = getProgrammeStats(prog.name);
                        const borderColor = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4];

                        return (
                            <div key={prog.id} className="card group" style={{
                                position: 'relative',
                                zIndex: activeMenu === prog.id ? 50 : 1,
                                background: 'linear-gradient(145deg, #1f2937, #111827)',
                                borderRadius: '12px',
                                borderTop: `4px solid ${borderColor}`,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>


                                <div
                                    className="p-2.5 md:p-6"
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>


                                        {/* Clickable Title Area */}
                                        <div
                                            onClick={() => router.push(`/bursar/fees/${prog.id}`)}
                                            style={{ cursor: 'pointer', flex: 1 }}
                                        >
                                            <h3 className="text-[13px] md:text-lg" style={{ margin: 0, fontWeight: 700, color: 'white', lineHeight: '1.4' }}>{prog.name}</h3>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.3rem' }}>
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}>{prog.code || 'N/A'}</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{prog.type} • {prog.duration}</span>
                                            </div>
                                        </div>

                                        {/* Action Menu - Isolated from Click */}
                                        <div style={{ position: 'relative', marginLeft: '0.8rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    e.nativeEvent.stopImmediatePropagation();
                                                    console.log('Menu toggled for', prog.id, 'Current:', activeMenu);
                                                    setActiveMenu(activeMenu === prog.id ? null : prog.id);
                                                }}
                                                className="hover:bg-white/10"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '0.35rem',
                                                    borderRadius: '6px',
                                                    color: '#9ca3af',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Actions"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                            </button>

                                            {activeMenu === prog.id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    right: 0,
                                                    marginTop: '0.4rem',
                                                    width: '160px',
                                                    background: '#1f2937',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                                                    zIndex: 100,
                                                    overflow: 'hidden',
                                                }}
                                                    onClick={e => e.stopPropagation()} // Prevent card click
                                                >
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(prog);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <span style={{ opacity: 0.7 }}>✏️</span> Edit Details
                                                    </button>
                                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this programme? All associated data will be lost.')) {
                                                                deleteProgramme(prog.id);
                                                            }
                                                            setActiveMenu(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <span style={{ opacity: 0.7 }}>🗑️</span> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => router.push(`/bursar/fees/${prog.id}`)}
                                        style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="text-[10px] md:text-[11px]" style={{ opacity: 0.6, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>Fee Clearance</span>
                                            <span className="text-[11px] md:text-xs font-bold" style={{ color: stats.percentage >= 100 ? '#10b981' : stats.percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                                                {stats.percentage.toFixed(0)}%
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${stats.percentage}%`,
                                                height: '100%',
                                                background: stats.percentage >= 100 ? '#10b981' : stats.percentage >= 50 ? 'linear-gradient(90deg, #f59e0b, #fcd34d)' : '#ef4444',
                                                borderRadius: '10px',
                                                transition: 'width 0.5s ease-out'
                                            }}></div>
                                        </div>

                                        <div className="text-[10px] md:text-[11px]" style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <span className="text-xs md:text-sm">👥</span> {stats.studentCount}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <span className="text-xs md:text-sm">💰</span> {(stats.paid / 1000000).toFixed(1)}M / {(stats.total / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {filteredProgrammes.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-xl">No programmes found matching "{searchTerm}"</p>
                    </div>
                )}

            </div>

            {/* Modern Modal */}
            {createModal.open && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
                    style={{ zIndex: 9999 }}
                >
                    <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800">
                            <h2 className="text-xl font-bold text-white">{createModal.isEdit ? 'Edit Programme' : 'New Programme'}</h2>
                            <p className="text-sm text-gray-400 mt-1">Configure academic programme details.</p>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Programme Name</label>
                                    <input
                                        className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="e.g. Bachelor of Medicine & Surgery"
                                        value={createModal.name}
                                        onChange={e => setCreateModal({ ...createModal, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Programme Code (Short)</label>
                                    <input
                                        className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="e.g. MBChB"
                                        value={createModal.code}
                                        onChange={e => setCreateModal({ ...createModal, code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
                                    <input
                                        className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="e.g. 3 Years"
                                        value={createModal.duration}
                                        onChange={e => setCreateModal({ ...createModal, duration: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Qualification Type</label>
                                    <select
                                        className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-all"
                                        value={createModal.type}
                                        onChange={e => setCreateModal({ ...createModal, type: e.target.value as Programme['type'] })}
                                    >
                                        <option value="Degree">Degree</option>
                                        <option value="Diploma">Diploma</option>
                                        <option value="Certificate">Certificate</option>
                                        <option value="Masters">Masters</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setCreateModal({ ...createModal, open: false })}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all font-medium"
                                >
                                    {createModal.isEdit ? 'Save Changes' : 'Create Programme'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


