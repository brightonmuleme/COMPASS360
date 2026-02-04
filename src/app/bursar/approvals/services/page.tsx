"use client";
import React, { useState, useMemo } from 'react';
import { useSchoolData, Service, Bursary, EnrolledStudent, PhysicalRequirement } from '@/lib/store';

const AVAILABLE_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Certificate', 'Diploma'];

export default function DirectorServicesViewPage() {
    const { students, services, bursaries, hydrated } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'services' | 'bursaries' | 'requirements'>('services');

    // View List State for Services
    const [viewServiceModal, setViewServiceModal] = useState<{ open: boolean, itemId: string, itemName: string }>({ open: false, itemId: '', itemName: '' });
    const [serviceListFilterProg, setServiceListFilterProg] = useState('All');
    const [serviceListFilterLevel, setServiceListFilterLevel] = useState('All');
    const [serviceListSearch, setServiceListSearch] = useState('');

    // View List State for Bursaries
    const [viewBursaryModal, setViewBursaryModal] = useState<{ open: boolean, schemeId: string, schemeName: string }>({ open: false, schemeId: '', schemeName: '' });
    const [bursaryListFilterProg, setBursaryListFilterProg] = useState('All');
    const [bursaryListFilterLevel, setBursaryListFilterLevel] = useState('All');
    const [bursaryListSearch, setBursaryListSearch] = useState('');

    // View History State for Requirements
    const [viewReqHistoryModal, setViewReqHistoryModal] = useState<{ open: boolean, reqName: string }>({ open: false, reqName: '' });
    const [reqListFilterProg, setReqListFilterProg] = useState('All');
    const [reqListFilterLevel, setReqListFilterLevel] = useState('All');
    const [reqListFilterQty, setReqListFilterQty] = useState('All');
    const [reqListSearch, setReqListSearch] = useState('');

    if (!hydrated) return <div style={{ padding: '2rem', color: 'white' }}>Loading System Data...</div>;
    if (!students || !Array.isArray(students)) return <div style={{ padding: '2rem', color: 'red' }}>Error: Student data corrupted.</div>;

    const programmes = useMemo(() => Array.from(new Set(students.map(s => s.programme))), [students]);

    // Service Stats
    const getServiceStats = (serviceId: string) => {
        let subs = students.filter(s => s.services.includes(serviceId));
        if (viewServiceModal.open && viewServiceModal.itemId === serviceId) {
            if (serviceListFilterProg !== 'All') subs = subs.filter(s => s.programme === serviceListFilterProg);
            if (serviceListFilterLevel !== 'All') subs = subs.filter(s => s.level === serviceListFilterLevel);
            if (serviceListSearch) {
                const lower = serviceListSearch.toLowerCase();
                subs = subs.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
            }
        }
        const revenue = subs.reduce((sum, s) => sum + ((s.serviceMetadata?.[serviceId]?.quantity || 1) * (services.find(svc => svc.id === serviceId)?.cost || 0)), 0);
        return { count: subs.length, revenue, list: subs };
    };

    // Bursary Stats
    const getBursaryStats = (schemeId: string) => {
        let subs = students.filter(s => s.bursary === schemeId);
        if (viewBursaryModal.open && viewBursaryModal.schemeId === schemeId) {
            if (bursaryListFilterProg !== 'All') subs = subs.filter(s => s.programme === bursaryListFilterProg);
            if (bursaryListFilterLevel !== 'All') subs = subs.filter(s => s.level === bursaryListFilterLevel);
            if (bursaryListSearch) {
                const lower = bursaryListSearch.toLowerCase();
                subs = subs.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
            }
        }
        const val = bursaries.find(b => b.id === schemeId)?.value || 0;
        return { count: subs.length, total: subs.length * val, list: subs };
    };

    // Grand Totals for Services
    const serviceGrandTotals = useMemo(() => {
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

    // Grand Totals for Bursaries
    const bursaryGrandTotals = useMemo(() => {
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

    // Active Bursary Schemes (filter out 'none')
    const activeSchemes = useMemo(() => bursaries.filter(b => b.id !== 'none'), [bursaries]);

    // Consolidated Requirements
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

    // Requirements History List
    const reqHistoryList = useMemo(() => {
        if (!viewReqHistoryModal.open) return [];
        let list = students.filter(s => s.physicalRequirements?.some(r => r.name === viewReqHistoryModal.reqName));

        if (reqListFilterProg !== 'All') list = list.filter(s => s.programme === reqListFilterProg);
        if (reqListFilterLevel !== 'All') list = list.filter(s => s.level === reqListFilterLevel);

        if (reqListFilterQty !== 'All') {
            list = list.filter(s => {
                const r = s.physicalRequirements?.find(req => req.name === viewReqHistoryModal.reqName);
                if (!r) return false;
                if (reqListFilterQty === 'Fully Paid') return r.brought >= r.required;
                if (reqListFilterQty === 'Partially Paid') return r.brought > 0 && r.brought < r.required;
                if (reqListFilterQty === 'Not Paid') return r.brought === 0;
                return true;
            });
        }

        if (reqListSearch) {
            const lower = reqListSearch.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(lower) || s.payCode.toLowerCase().includes(lower));
        }

        return list.map(s => {
            const req = s.physicalRequirements?.find(r => r.name === viewReqHistoryModal.reqName);
            const latestDate = req?.entries && req.entries.length > 0 ? req.entries[req.entries.length - 1].date : 'N/A';
            return { student: s, req, latestDate };
        });
    }, [students, viewReqHistoryModal.open, viewReqHistoryModal.reqName, reqListFilterProg, reqListFilterLevel, reqListFilterQty, reqListSearch]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Services, Bursaries & Requirements</h1>
                    <div className="mt-2 text-sm text-gray-400 bg-blue-900/30 border border-blue-700/30 rounded-lg px-3 py-2 inline-block">
                        <span className="font-semibold text-blue-400">View Only Mode</span> - No editing capabilities
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-700 pb-2">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`text-lg px-4 py-2 font-semibold transition ${activeTab === 'services' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setActiveTab('bursaries')}
                        className={`text-lg px-4 py-2 font-semibold transition ${activeTab === 'bursaries' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Bursary Schemes
                    </button>
                    <button
                        onClick={() => setActiveTab('requirements')}
                        className={`text-lg px-4 py-2 font-semibold transition ${activeTab === 'requirements' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Physical Requirements
                    </button>
                </div>

                {/* Services Tab */}
                {activeTab === 'services' && (
                    <div>
                        {/* Grand Total */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 flex justify-around">
                            <div className="text-center">
                                <div className="text-sm opacity-90">Total Projected Revenue</div>
                                <div className="text-3xl font-bold">UGX {serviceGrandTotals.totalRev.toLocaleString()}</div>
                            </div>
                            <div className="text-center border-l border-white/30 pl-8">
                                <div className="text-sm opacity-90">Active Subscriptions</div>
                                <div className="text-3xl font-bold">{serviceGrandTotals.totalSubs.toLocaleString()}</div>
                            </div>
                        </div>

                        <h2 className="text-xl font-semibold mb-4">Available Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map(service => {
                                const stats = getServiceStats(service.id);
                                return (
                                    <div key={service.id} className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold">{service.name}</h3>
                                            <div className="text-blue-400 font-bold">UGX {service.cost.toLocaleString()}</div>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <div className="text-3xl font-bold">{stats.count}</div>
                                                <div className="text-sm text-gray-400">Subscribers</div>
                                            </div>
                                            <button
                                                onClick={() => setViewServiceModal({ open: true, itemId: service.id, itemName: service.name })}
                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
                                            >
                                                View List
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-700 pt-3 text-green-400 text-sm">
                                            Proj. Revenue: UGX {stats.revenue.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bursaries Tab */}
                {activeTab === 'bursaries' && (
                    <div>
                        {/* Grand Total */}
                        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 mb-8 flex justify-around">
                            <div className="text-center">
                                <div className="text-sm opacity-90">Total Value Awarded</div>
                                <div className="text-3xl font-bold">UGX {bursaryGrandTotals.totalValue.toLocaleString()}</div>
                            </div>
                            <div className="text-center border-l border-white/30 pl-8">
                                <div className="text-sm opacity-90">Total Beneficiaries</div>
                                <div className="text-3xl font-bold">{bursaryGrandTotals.totalBen.toLocaleString()}</div>
                            </div>
                        </div>

                        <h2 className="text-xl font-semibold mb-4">Active Bursary Schemes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeSchemes.map(scheme => {
                                const stats = getBursaryStats(scheme.id);
                                return (
                                    <div key={scheme.id} className="bg-gray-800 rounded-xl p-6 border-t-4 border-green-500">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold">{scheme.name}</h3>
                                            <div className="text-green-400 font-bold">UGX {scheme.value.toLocaleString()}</div>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <div className="text-3xl font-bold">{stats.count}</div>
                                                <div className="text-sm text-gray-400">Beneficiaries</div>
                                            </div>
                                            <button
                                                onClick={() => setViewBursaryModal({ open: true, schemeId: scheme.id, schemeName: scheme.name })}
                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
                                            >
                                                View List
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-700 pt-3 text-green-400 text-sm">
                                            Total Impact: UGX {stats.total.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Physical Requirements</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {consolidatedRequirements.map(req => (
                                <div key={req.name} className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 relative overflow-hidden shadow-xl">
                                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: req.color }}></div>

                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold">{req.name}</h3>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-4xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                                {req.totalBrought} <span className="text-xl text-gray-500">/ {req.totalRequired}</span>
                                            </div>
                                            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mt-1">Total Brought (Aggregate)</div>
                                        </div>

                                        <button
                                            onClick={() => setViewReqHistoryModal({ open: true, reqName: req.name })}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
                                        >
                                            View History
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {consolidatedRequirements.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-400">
                                    No physical requirements recorded yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Service List Modal */}
                {viewServiceModal.open && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setViewServiceModal({ ...viewServiceModal, open: false })}>
                        <div className="bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold">{viewServiceModal.itemName} List</h2>
                                    <span className="bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold">
                                        {getServiceStats(viewServiceModal.itemId).count} Subscribers
                                    </span>
                                </div>
                                <button onClick={() => setViewServiceModal({ ...viewServiceModal, open: false })} className="text-gray-400 hover:text-white text-3xl leading-none">×</button>
                            </div>

                            <div className="p-6 border-b border-gray-700 flex gap-4">
                                <input
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    placeholder="🔍 Search name or code..."
                                    value={serviceListSearch}
                                    onChange={e => setServiceListSearch(e.target.value)}
                                />
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={serviceListFilterProg}
                                    onChange={e => setServiceListFilterProg(e.target.value)}
                                >
                                    <option value="All">All Programmes</option>
                                    {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={serviceListFilterLevel}
                                    onChange={e => setServiceListFilterLevel(e.target.value)}
                                >
                                    <option value="All">All Levels</option>
                                    {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <table className="w-full">
                                    <thead className="bg-gray-700/50 sticky top-0">
                                        <tr className="text-left text-sm text-gray-400 uppercase">
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Class</th>
                                            <th className="p-4">Qty</th>
                                            <th className="p-4">Date Added</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getServiceStats(viewServiceModal.itemId).list.map(s => (
                                            <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                                                <td className="p-4 font-medium">{s.name}</td>
                                                <td className="p-4 text-gray-400">{s.programme} - {s.level}</td>
                                                <td className="p-4">
                                                    <span className="bg-gray-700 px-3 py-1 rounded-lg text-sm">
                                                        {s.serviceMetadata?.[viewServiceModal.itemId]?.quantity || 1}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">
                                                    {s.serviceMetadata?.[viewServiceModal.itemId]?.date || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                        {getServiceStats(viewServiceModal.itemId).list.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-gray-400">
                                                    No subscribers found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bursary List Modal */}
                {viewBursaryModal.open && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setViewBursaryModal({ ...viewBursaryModal, open: false })}>
                        <div className="bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold">{viewBursaryModal.schemeName} List</h2>
                                    <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                                        {getBursaryStats(viewBursaryModal.schemeId).count} Beneficiaries
                                    </span>
                                </div>
                                <button onClick={() => setViewBursaryModal({ ...viewBursaryModal, open: false })} className="text-gray-400 hover:text-white text-3xl leading-none">×</button>
                            </div>

                            <div className="p-6 border-b border-gray-700 flex gap-4">
                                <input
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                    placeholder="🔍 Search name or code..."
                                    value={bursaryListSearch}
                                    onChange={e => setBursaryListSearch(e.target.value)}
                                />
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                    value={bursaryListFilterProg}
                                    onChange={e => setBursaryListFilterProg(e.target.value)}
                                >
                                    <option value="All">All Programmes</option>
                                    {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                    value={bursaryListFilterLevel}
                                    onChange={e => setBursaryListFilterLevel(e.target.value)}
                                >
                                    <option value="All">All Levels</option>
                                    {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <table className="w-full">
                                    <thead className="bg-gray-700/50 sticky top-0">
                                        <tr className="text-left text-sm text-gray-400 uppercase">
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Class</th>
                                            <th className="p-4">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getBursaryStats(viewBursaryModal.schemeId).list.map(s => (
                                            <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                                                <td className="p-4 font-medium">{s.name}</td>
                                                <td className="p-4 text-gray-400">{s.programme} - {s.level}</td>
                                                <td className="p-4 text-green-400 font-semibold">
                                                    UGX {bursaries.find(b => b.id === s.bursary)?.value.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {getBursaryStats(viewBursaryModal.schemeId).list.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-12 text-center text-gray-400">
                                                    No beneficiaries found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Requirements History Modal */}
                {viewReqHistoryModal.open && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setViewReqHistoryModal({ ...viewReqHistoryModal, open: false })}>
                        <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold">{viewReqHistoryModal.reqName} History</h2>
                                    <span className="bg-amber-900/50 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold">
                                        Overview
                                    </span>
                                </div>
                                <button onClick={() => setViewReqHistoryModal({ ...viewReqHistoryModal, open: false })} className="text-gray-400 hover:text-white text-3xl leading-none">×</button>
                            </div>

                            <div className="p-6 border-b border-gray-700 flex flex-wrap gap-4 flex-shrink-0">
                                <input
                                    className="flex-1 min-w-[300px] bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                                    placeholder="🔍 Search student name..."
                                    value={reqListSearch}
                                    onChange={e => setReqListSearch(e.target.value)}
                                />
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                                    value={reqListFilterProg}
                                    onChange={e => setReqListFilterProg(e.target.value)}
                                >
                                    <option value="All">All Programmes</option>
                                    {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                                    value={reqListFilterLevel}
                                    onChange={e => setReqListFilterLevel(e.target.value)}
                                >
                                    <option value="All">All Levels</option>
                                    {AVAILABLE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                                    value={reqListFilterQty}
                                    onChange={e => setReqListFilterQty(e.target.value)}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Fully Paid">Fully Paid</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                    <option value="Not Paid">Not Paid</option>
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <table className="w-full">
                                    <thead className="bg-gray-700/50 sticky top-0">
                                        <tr className="text-left text-sm text-gray-400 uppercase">
                                            <th className="p-4">Date (Latest)</th>
                                            <th className="p-4">Student Name</th>
                                            <th className="p-4">Progress (Brought / Req)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reqHistoryList.map(item => (
                                            <tr key={item.student.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                                                <td className="p-4 text-gray-400">{item.latestDate}</td>
                                                <td className="p-4 font-medium">
                                                    {item.student.name} <span className="text-gray-500 text-sm">({item.student.level})</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`font-bold ${item.req!.brought >= item.req!.required ? 'text-green-400' : 'text-amber-400'}`}>
                                                        {item.req!.brought}
                                                    </span>
                                                    <span className="text-gray-500"> / {item.req!.required}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {reqHistoryList.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-12 text-center text-gray-400">
                                                    No records found matching criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
