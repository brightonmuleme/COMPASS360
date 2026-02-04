"use client";
import React, { useState } from 'react';
import { useSchoolData, SchoolApplication } from '@/lib/store';

export default function ApplicationsManager() {
    const { schoolApplications, updateSchoolApplicationStatus } = useSchoolData();
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'viewed' | 'contacted'>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

    const filteredApps = schoolApplications.filter(app => {
        const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;
        const matchesSchool = schoolFilter === 'all' ? true : app.schoolName === schoolFilter;

        let matchesDate = true;
        if (dateRange.start || dateRange.end) {
            const appDate = new Date(app.submittedAt).getTime();
            if (dateRange.start) {
                const start = new Date(dateRange.start).getTime();
                if (appDate < start) matchesDate = false;
            }
            if (dateRange.end) {
                const end = new Date(dateRange.end).getTime() + 86400000;
                if (appDate > end) matchesDate = false;
            }
        }
        return matchesStatus && matchesSchool && matchesDate;
    });

    const selectedApp = schoolApplications.find(a => a.id === selectedAppId);
    const schoolNames = Array.from(new Set(schoolApplications.map(app => app.schoolName)));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'viewed': return '#3b82f6';
            case 'contacted': return '#10b981';
            default: return '#64748b';
        }
    };

    const LabelValue = ({ label, value }: { label: string, value?: string | number }) => (
        <div style={{ marginBottom: '0.8rem' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.2rem' }}>{label}</span>
            <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: '500' }}>{value || 'N/A'}</span>
        </div>
    );

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Applications Hub</h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>Reviewing {schoolApplications.length} total admissions across institutions.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        {(['all', 'pending', 'viewed', 'contacted'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                style={{
                                    padding: '0.7rem 1.4rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: statusFilter === f ? '#0f172a' : 'transparent',
                                    color: statusFilter === f ? 'white' : '#64748b',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Filter by Institution</span>
                        <select
                            value={schoolFilter}
                            onChange={(e) => setSchoolFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                        >
                            <option value="all">All Schools</option>
                            {schoolNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '350px', display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Start Date</span>
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>End Date</span>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
                {/* Applications List */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredApps.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '8rem 2rem', background: 'white', borderRadius: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📥</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>No applications match your filter</h3>
                            <p style={{ color: '#64748b' }}>Try changing the status filter or wait for new submissions.</p>
                        </div>
                    ) : (
                        filteredApps.map(app => (
                            <div
                                key={app.id}
                                onClick={() => setSelectedAppId(app.id)}
                                style={{
                                    background: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '24px',
                                    boxShadow: selectedAppId === app.id ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 4px 6px -1px rgba(0,0,0,0.02)',
                                    border: selectedAppId === app.id ? '2px solid #0f172a' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5rem'
                                }}
                            >
                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f1f5f9', flexShrink: 0, overflow: 'hidden' }}>
                                    {app.profilePhoto ? (
                                        <img src={app.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🧑</div>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{app.applicantName}</h3>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '8px',
                                                fontSize: '0.65rem',
                                                fontWeight: '800',
                                                background: '#f1f5f9',
                                                color: '#64748b',
                                                textTransform: 'uppercase'
                                            }}>ADMISSION</span>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '8px',
                                                fontSize: '0.65rem',
                                                fontWeight: '800',
                                                background: `${getStatusColor(app.status)}15`,
                                                color: getStatusColor(app.status),
                                                textTransform: 'uppercase'
                                            }}>{app.status}</span>
                                        </div>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                                        Applying to <strong>{app.schoolName}</strong> • {new Date(app.submittedAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {app.academicResults && (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                        <img src={app.academicResults} alt="Doc preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                                    </div>
                                )}

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>{app.programmes || 'General'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{app.entryLevel || 'Lvl 1'}</div>
                                </div>

                                <div style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>→</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detailed Sidebar */}
                <div style={{ position: 'sticky', top: '2rem' }}>
                    {selectedApp ? (
                        <div style={{ background: 'white', borderRadius: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                            <div style={{ background: '#0f172a', padding: '2.5rem 2rem', color: 'white', textAlign: 'center' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 1.5rem', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)' }}>
                                    {selectedApp.profilePhoto ? (
                                        <img src={selectedApp.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>👤</div>
                                    )}
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{selectedApp.applicantName}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>{selectedApp.applicantEmail}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                                    <select
                                        value={selectedApp.status}
                                        onChange={(e) => updateSchoolApplicationStatus(selectedApp.id, e.target.value as any)}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option value="pending" style={{ color: 'black' }}>Pending</option>
                                        <option value="viewed" style={{ color: 'black' }}>Viewed</option>
                                        <option value="contacted" style={{ color: 'black' }}>Contacted</option>
                                    </select>
                                    <button
                                        onClick={() => window.open(`mailto:${selectedApp.applicantEmail}`)}
                                        style={{ background: 'white', color: 'black', border: 'none', padding: '0.8rem', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
                                    >
                                        Contact
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '2rem', maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
                                <section style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Personal Info</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <LabelValue label="Gender" value={selectedApp.gender} />
                                        <LabelValue label="Nationality" value={selectedApp.nationality} />
                                        <LabelValue label="Phone" value={selectedApp.applicantPhone} />
                                        <LabelValue label="DOB" value={selectedApp.dob} />
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <LabelValue label="Address" value={selectedApp.address} />
                                        </div>
                                    </div>
                                </section>

                                <section style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Academic Choice</h4>
                                    <LabelValue label="Target School" value={selectedApp.schoolName} />
                                    <LabelValue label="Programme(s)" value={selectedApp.programmes} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <LabelValue label="Level" value={selectedApp.entryLevel} />
                                        <LabelValue label="Mode" value={selectedApp.modeOfStudy} />
                                    </div>
                                </section>

                                <section style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Background</h4>
                                    <LabelValue label="Last Institution" value={selectedApp.lastInstitution} />
                                    <LabelValue label="Highest Qual." value={selectedApp.highestQualification} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <LabelValue label="Year" value={selectedApp.completionYear} />
                                        <LabelValue label="Exam Body" value={selectedApp.examBody} />
                                    </div>
                                </section>

                                {selectedApp.academicResults && (
                                    <section style={{ marginBottom: '2.5rem' }}>
                                        <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Academic Results</h4>
                                        <div
                                            style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                                            onClick={() => window.open(selectedApp.academicResults)}
                                        >
                                            <img src={selectedApp.academicResults} alt="Results" style={{ width: '100%', display: 'block' }} />
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.5rem' }}>Click image to view full size</p>
                                    </section>
                                )}

                                <section style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Emergency Contact</h4>
                                    <LabelValue label="Kin Name" value={selectedApp.nokName} />
                                    <LabelValue label="Relationship" value={selectedApp.nokRelationship} />
                                    <LabelValue label="Kin Phone" value={selectedApp.nokPhone} />
                                </section>

                                <section>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>Legacy Info</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                                        {selectedApp.message ? `"${selectedApp.message}"` : 'No additional message provided.'}
                                    </p>
                                    <div style={{ marginTop: '1rem' }}>
                                        <LabelValue label="Source" value={selectedApp.sourceOfInfo} />
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'white', padding: '4rem 2rem', borderRadius: '32px', textAlign: 'center', border: '2px dashed #cbd5e1', color: '#94a3b8' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👉</div>
                            <p style={{ fontWeight: '600' }}>Select an application from the list to view full details</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
