"use client";
import React, { useState } from 'react';
import { useSchoolData } from '@/lib/store';
import ServicesTab from '@/components/bursar/ServicesTab';
import BursariesTab from '@/components/bursar/BursariesTab';
import RequirementsTab from '@/components/bursar/RequirementsTab';
import AuditLogsTab from '@/components/bursar/AuditLogsTab';

export default function ServicesPage() {
    const { students, services, bursaries, setStudents, setServices, setBursaries, hydrated } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'services' | 'bursaries' | 'requirements' | 'logs'>('services');

    if (!hydrated) return <div style={{ padding: '2rem', color: 'white' }}>Loading System Data...</div>;
    // Safety check for bad data, though store.ts should handle it now
    if (!students || !Array.isArray(students)) return <div style={{ padding: '2rem', color: 'red' }}>Error: Student data corrupted (Not an Array). Check Console.</div>;

    // --- SHARED ACTIONS ---
    const updateStudent = (updated: any) => {
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    };

    return (
        <div className="p-3 md:p-8 h-full overflow-y-auto">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-8">Services & Bursaries</h1>

            {/* --- GLOBAL STYLES (for modal overlays) --- */}
            <style jsx global>{`
                .fixed-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                /* Premium Modal Styles Shared Across Tabs */
                .premium-modal {
                    background: rgba(30, 30, 30, 0.95);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    border-radius: 12px;
                    padding: 1.25rem md:padding: 2rem;
                    color: white;
                    animation: modalPop 0.3s ease-out;
                    width: 95%;
                    max-width: 500px;
                }
                @keyframes modalPop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .premium-input {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 0.6rem 0.8rem;
                    color: white;
                    width: 100%;
                    outline: none;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .premium-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                    background: rgba(0,0,0,0.3);
                }
                .premium-btn {
                    padding: 0.6rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    font-size: 0.85rem;
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

            {/* --- TABS --- */}
            <div className="flex flex-wrap gap-1.5 md:gap-4 mb-3 md:mb-8 border-b border-slate-700 pb-1">
                <button
                    onClick={() => setActiveTab('services')}
                    className="touch-target px-2.5 md:px-4 py-1.5 text-[11px] md:text-base font-medium transition-all"
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'services' ? '#3b82f6' : 'white',
                        borderBottom: activeTab === 'services' ? '2px solid #3b82f6' : 'none',
                        cursor: 'pointer', fontWeight: activeTab === 'services' ? 'bold' : 'normal', opacity: activeTab === 'services' ? 1 : 0.6
                    }}
                >
                    Services
                </button>
                <button
                    onClick={() => setActiveTab('bursaries')}
                    className="touch-target px-2.5 md:px-4 py-1.5 text-[11px] md:text-base font-medium transition-all"
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'bursaries' ? '#10b981' : 'white',
                        borderBottom: activeTab === 'bursaries' ? '2px solid #10b981' : 'none',
                        cursor: 'pointer', fontWeight: activeTab === 'bursaries' ? 'bold' : 'normal', opacity: activeTab === 'bursaries' ? 1 : 0.6
                    }}
                >
                    Bursaries
                </button>
                <button
                    onClick={() => setActiveTab('requirements')}
                    className="touch-target px-2.5 md:px-4 py-1.5 text-[11px] md:text-base font-medium transition-all"
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'requirements' ? '#f59e0b' : 'white',
                        borderBottom: activeTab === 'requirements' ? '2px solid #f59e0b' : 'none',
                        cursor: 'pointer', fontWeight: activeTab === 'requirements' ? 'bold' : 'normal', opacity: activeTab === 'requirements' ? 1 : 0.6
                    }}
                >
                    Requirements
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className="touch-target px-2.5 md:px-4 py-1.5 text-[11px] md:text-base font-medium transition-all"
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'logs' ? '#ef4444' : 'white',
                        borderBottom: activeTab === 'logs' ? '2px solid #ef4444' : 'none',
                        cursor: 'pointer', fontWeight: activeTab === 'logs' ? 'bold' : 'normal', opacity: activeTab === 'logs' ? 1 : 0.6
                    }}
                >
                    Logs
                </button>
            </div>

            {/* --- CONTENT --- */}
            {activeTab === 'services' && (
                <ServicesTab
                    services={services}
                    students={students}
                    updateService={(s) => setServices(prev => prev.map(old => old.id === s.id ? s : old))}
                    addService={(s) => setServices(prev => [...prev, s])}
                    deleteService={(id) => {
                        setServices(prev => prev.filter(s => s.id !== id));
                        // Clean up students who had this service
                        setStudents(prev => prev.map(s => ({
                            ...s,
                            services: s.services.filter(sid => sid !== id)
                        })));
                    }}
                    updateStudent={updateStudent}
                />
            )}

            {activeTab === 'bursaries' && (
                <BursariesTab
                    bursaries={bursaries}
                    students={students}
                    addBursary={(b) => setBursaries(prev => [...prev, b])}
                    updateBursary={(b) => setBursaries(prev => prev.map(p => p.id === b.id ? b : p))}
                    deleteBursary={(id) => setBursaries(prev => prev.filter(p => p.id !== id))}
                    updateStudent={updateStudent}
                />
            )}

            {activeTab === 'requirements' && (
                <RequirementsTab
                    students={students}
                    updateStudent={updateStudent}
                />
            )}
            {activeTab === 'logs' && (
                <AuditLogsTab />
            )}
        </div>
    );
}
