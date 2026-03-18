"use client";
import React, { useState } from 'react';
import { Requisition, useSchoolData } from '@/lib/store';
import { FileText, Printer, XCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RequisitionDetailViewProps {
    requisition: Requisition;
    onApprove: (id: string) => void;
    isReadOnly?: boolean;
    onBack: () => void;
}

export default function RequisitionDetailView({ requisition, onApprove, isReadOnly, onBack }: RequisitionDetailViewProps) {
    const { portalBranding } = useSchoolData();
    const [isMatrixView, setIsMatrixView] = useState(false);

    if (!requisition) return null;

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="p-1 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center bg-white/80 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-10 shadow-sm">
                <div className="flex justify-between items-center w-full md:w-auto">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 md:mb-2">
                            <span className="text-[7px] md:text-[10px] font-black text-purple-600 bg-purple-50 px-2 md:px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest">{requisition.readableId || 'REQ'}</span>
                            <span className={`text-[7px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full border uppercase tracking-widest ${requisition.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {requisition.status === 'Pending Approval' ? 'Awaiting Verification' : requisition.status}
                            </span>
                        </div>
                        <h2 className="text-sm md:text-3xl font-black text-slate-900 leading-tight truncate uppercase tracking-tighter">{requisition.title}</h2>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 ml-4">
                        <button
                            onClick={() => window.print()}
                            className="p-2 md:p-3 bg-slate-900 border border-slate-900 text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 group"
                            title="Print to PDF"
                        >
                            <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Print</span>
                        </button>
                        <button
                            onClick={() => setIsMatrixView(!isMatrixView)}
                            className={`p-2 md:p-3 rounded-xl border transition-all flex items-center gap-2 font-black text-[8px] md:text-[10px] uppercase tracking-widest ${isMatrixView
                                ? 'bg-white border-slate-200 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">{isMatrixView ? 'Standard View' : 'Visual Matrix'}</span>
                        </button>
                        {!isReadOnly && (
                            <button onClick={() => onApprove(requisition.id)} className="hidden md:block px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] shadow-xl shadow-purple-200 transition-all hover:scale-105 active:scale-95">
                                Verify Funds
                            </button>
                        )}
                        <button onClick={onBack} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all active:scale-90">
                            <XCircle className="w-5 h-5 md:w-8 md:h-8" />
                        </button>
                    </div>
                </div>

                {/* Mobile Direct Audit Info */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 md:hidden pb-2 px-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] text-slate-400 uppercase font-black tracking-tight">Source:</span>
                        <span className="text-[8px] text-slate-900 font-black truncate max-w-[100px] uppercase">{requisition.account}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] text-slate-400 uppercase font-black tracking-tight">Total:</span>
                        <span className="text-[9px] text-slate-900 font-black">
                            {new Intl.NumberFormat('en-UG').format(requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative print:overflow-visible">
                <style>{`
                    @media print {
                        body * { visibility: hidden !important; }
                        body { margin: 0; padding: 0; }
                        .print-area, .print-area * { visibility: visible !important; }
                        .print-area { 
                            position: absolute !important; 
                            left: 0 !important; 
                            top: 0 !important; 
                            width: 170mm !important; 
                            height: auto !important;
                            display: block !important;
                            background: white !important;
                        }
                        .matrix-scaler {
                            width: 170mm !important;
                            padding: 10mm !important;
                            border-width: 2px !important;
                            box-shadow: none !important;
                            margin: 0 !important;
                            transform: none !important;
                        }
                        @page { size: auto; margin: 15mm; }
                        tr { page-break-inside: avoid !important; }
                        .no-print { display: none !important; }
                        thead { display: table-header-group !important; }
                        table { font-size: 8pt !important; width: 100% !important; border-collapse: collapse !important; }
                        th, td { padding: 4px !important; }
                    }
                `}</style>
                <div className="print-area">
                    {isMatrixView ? (
                        <div className="p-4 md:p-12 flex flex-col items-center bg-slate-100 overflow-x-hidden min-h-screen print:bg-white print:p-0">
                            {/* Matrix styling same as before, already light-themed */}
                            <div className="matrix-wrapper w-full flex justify-center">
                                <div className="matrix-scaler bg-white text-slate-900 p-8 md:p-16 shadow-2xl w-[850px] border-[3px] border-slate-900 relative print:shadow-none print:border-none">
                                    {/* Form Header */}
                                    <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-8 mb-8">
                                        <div className="flex items-center gap-6">
                                            {portalBranding.logo && (
                                                <img src={portalBranding.logo} alt="Logo" className="h-20 w-auto object-contain" />
                                            )}
                                            <div>
                                                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-1">{portalBranding.schoolName}</h1>
                                                <div className="flex items-center gap-12 text-sm font-black uppercase italic text-slate-500">
                                                    <span>{portalBranding.tagline || 'OFFICIAL INSTITUTIONAL RECORD'}</span>
                                                    <span>Verified Logistics</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-slate-900 text-white px-6 py-4 rounded-xl inline-block -mr-4 -mt-4 shadow-xl">
                                                <div className="text-[10px] font-black uppercase tracking-[3px] opacity-70 mb-1">Serial ID</div>
                                                <div className="text-2xl font-black">{requisition.readableId || 'REQ-INF'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Meta Grid */}
                                    <div className="grid grid-cols-2 gap-px bg-slate-900 border-[2px] border-slate-900 mb-8 rounded-lg overflow-hidden">
                                        <div className="bg-white p-6 transition-colors">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Request Origin (Account)</div>
                                            <div className="text-xl font-black text-slate-900">{requisition.account}</div>
                                        </div>
                                        <div className="bg-white p-6 border-l-[2px] border-slate-900 transition-colors">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Authorized Date</div>
                                            <div className="text-xl font-black text-slate-900">{requisition.date}</div>
                                        </div>
                                        <div className="bg-white p-6 border-t-[2px] border-slate-900 col-span-2 transition-colors">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Requisition Title / Project</div>
                                            <div className="text-2xl font-black text-slate-900 uppercase tracking-tight">{requisition.title}</div>
                                            <div className="mt-2 text-xs font-bold text-slate-500">Document Status: <span className="text-purple-600">{requisition.status || 'Active Audit'}</span></div>
                                        </div>
                                    </div>

                                    {/* The Matrix Table */}
                                    <div className="border-[2px] border-slate-900 mb-8 overflow-hidden rounded-lg">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                                    <th className="p-4 border-r border-white/20 w-12 text-center">ID</th>
                                                    <th className="p-4 border-r border-white/20">Category/Identity</th>
                                                    <th className="p-4 border-r border-white/20">Item Description</th>
                                                    <th className="p-4 border-r border-white/20 text-center w-20">Qty</th>
                                                    <th className="p-4 border-r border-white/20 text-right w-32">Rate</th>
                                                    <th className="p-4 text-right w-40">Impact</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-[1.5px] divide-slate-100">
                                                {(requisition.items || []).map((item: any, idx: number) => (
                                                    <tr key={idx} className={`${item.isPriority ? 'bg-red-50/50' : 'bg-white'} hover:bg-slate-50 transition-colors even:bg-slate-50/20`}>
                                                        <td className="p-4 border-r border-slate-200 text-center font-black text-slate-300">{idx + 1}</td>
                                                        <td className="p-4 border-r border-slate-200">
                                                            <div className={`text-[10px] font-black uppercase ${item.isPriority ? 'text-red-600' : 'text-slate-400'}`}>{item.category}</div>
                                                        </td>
                                                        <td className="p-4 border-r border-slate-200 font-black text-slate-900 tracking-tight">{item.name}</td>
                                                        <td className="p-4 border-r border-slate-200 text-center font-extrabold text-slate-900">{item.quantity}</td>
                                                        <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-400">{Number(item.unitPrice).toLocaleString()}</td>
                                                        <td className="p-4 text-right font-black text-slate-900 text-lg tabular-nums">
                                                            {Number(item.amount).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {Array.from({ length: Math.max(0, 5 - (requisition.items?.length || 0)) }).map((_, i) => (
                                                    <tr key={`filler-${i}`} className="h-14">
                                                        <td className="p-4 border-r border-slate-50 italic text-slate-50">.</td>
                                                        <td className="p-4 border-r border-slate-50"></td>
                                                        <td className="p-4 border-r border-slate-50"></td>
                                                        <td className="p-4 border-r border-slate-50"></td>
                                                        <td className="p-4 border-r border-slate-50"></td>
                                                        <td className="p-4"></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-[3px] border-slate-900">
                                                    <td colSpan={4} className="p-8 bg-slate-50 border-r-[2px] border-slate-900 text-[11px] font-black uppercase text-slate-400 leading-relaxed">
                                                        Audit Trail: <span className="text-slate-900 ml-2">Digital verification of institutional requisition. All entries are legally binding under institute policy.</span>
                                                    </td>
                                                    <td className="p-8 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest text-right">Document Total</td>
                                                    <td className="p-8 bg-slate-900 text-white text-3xl font-black text-right underline decoration-[4px] decoration-emerald-500 underline-offset-8 tabular-nums">
                                                        {new Intl.NumberFormat('en-UG').format(requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Signatures Area */}
                                    <div className="grid grid-cols-2 gap-16 mt-16 pb-8">
                                        <div className="border-t-[2px] border-slate-900 pt-6">
                                            <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-10">Verification Signature</div>
                                            <div className="h-16 flex items-center justify-center opacity-10">
                                                <FileText className="w-10 h-10 -rotate-12" />
                                            </div>
                                        </div>
                                        <div className="border-t-[2px] border-slate-900 pt-6">
                                            <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-4">Institutional Stamp</div>
                                            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-200 italic font-black text-slate-400 text-sm">
                                                <span>SECURE RECORD</span>
                                                <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 md:p-12 overflow-x-hidden">
                            {/* Standard Details View */}
                            <div className="hidden md:grid grid-cols-3 gap-8 mb-12">
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-[10px] uppercase text-slate-400 font-black mb-3 tracking-[2px]">Filing Date</label>
                                    <p className="text-slate-900 text-2xl font-black tracking-tighter uppercase">{requisition.date}</p>
                                </div>
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                    <label className="block text-[10px] uppercase text-slate-400 font-black mb-3 tracking-[2px]">Originating Dept.</label>
                                    <p className="text-slate-900 text-2xl font-black tracking-tighter uppercase truncate">{requisition.account}</p>
                                </div>
                                <div className="bg-white p-8 rounded-3xl border-2 border-slate-900 shadow-xl shadow-slate-200 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                                    <label className="block text-[10px] uppercase text-slate-400 font-black mb-3 tracking-[2px] relative z-10">Total Commitment</label>
                                    <p className="text-slate-900 font-black text-4xl tracking-tighter relative z-10 tabular-nums">
                                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
                                            requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0
                                        ).replace('UGX', 'USh')}
                                    </p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-12">
                                <table className="w-full text-left text-[10px] md:text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-[2px] font-black">
                                            <th className="py-6 px-8 w-16">#</th>
                                            <th className="py-6 px-4 text-center">Identity</th>
                                            <th className="py-6 px-4">Description</th>
                                            <th className="py-6 px-4 text-right">Qty</th>
                                            <th className="py-6 px-4 text-right">Rate</th>
                                            <th className="py-6 px-8 text-right">Sub-Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(() => {
                                            const getMain = (i: any) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");
                                            const sortedItems = [...(requisition.items || [])].sort((a, b) => getMain(a).localeCompare(getMain(b)));

                                            return sortedItems.map((item: any, index: number) => {
                                                const currentGroup = getMain(item);
                                                const prevGroup = index > 0 ? getMain(sortedItems[index - 1]) : null;
                                                const isNewGroup = index > 0 && prevGroup !== currentGroup;
                                                const getGroupSum = (endIndex: number, groupName: string) => {
                                                    let sum = 0;
                                                    for (let i = endIndex; i >= 0; i--) {
                                                        if (getMain(sortedItems[i]) !== groupName) break;
                                                        sum += Number(sortedItems[i].amount);
                                                    }
                                                    return sum;
                                                };

                                                return (
                                                    <React.Fragment key={index}>
                                                        {isNewGroup && (
                                                            <tr className="bg-slate-50/30">
                                                                <td colSpan={6} className="py-3 px-8 text-right text-[10px] uppercase font-black text-slate-400 tracking-widest bg-slate-50/50 border-y border-slate-100">
                                                                    {prevGroup} GROUP TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index - 1, prevGroup || ""))}</span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className={`transition-colors hover:bg-slate-50/50 group ${item.isPriority ? 'bg-red-50/50' : ''}`}>
                                                            <td className="py-5 px-8 text-slate-300 font-black tabular-nums">{index + 1}</td>
                                                            <td className="py-5 px-4 hidden md:table-cell text-center">
                                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${item.isPriority ? 'bg-red-600 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                                                                    {item.category}
                                                                </span>
                                                            </td>
                                                            <td className="py-5 px-4">
                                                                <div className="flex flex-col">
                                                                    <div className={`md:hidden text-[7px] uppercase font-black tracking-widest mb-1 ${item.isPriority ? 'text-red-600' : 'text-slate-400'}`}>{item.category}</div>
                                                                    <div className={`font-black tracking-tight text-sm md:text-base leading-none ${item.isPriority ? 'text-red-700' : 'text-slate-900'}`}>
                                                                        {item.description || item.name}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-5 px-4 text-right text-slate-900 font-black tabular-nums">{item.quantity}</td>
                                                            <td className="py-5 px-4 text-right text-slate-400 font-bold tabular-nums italic">{Number(item.unitPrice).toLocaleString()}</td>
                                                            <td className={`py-5 px-8 text-right font-black text-base md:text-xl tracking-tighter tabular-nums ${item.isPriority ? 'text-red-700' : 'text-slate-900'}`}>
                                                                {Number(item.amount).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                        {index === requisition.items.length - 1 && (
                                                            <tr className="bg-slate-50/30">
                                                                <td colSpan={6} className="py-3 px-8 text-right text-[10px] uppercase font-black text-slate-400 tracking-widest bg-slate-50/50 border-t border-slate-100">
                                                                    {currentGroup} GROUP TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index, currentGroup))}</span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Bar for Mobile */}
                            {!isReadOnly && (
                                <div className="md:hidden pb-12">
                                    <button
                                        onClick={() => onApprove(requisition.id)}
                                        className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] shadow-xl shadow-purple-200"
                                    >
                                        Verify Fully
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
