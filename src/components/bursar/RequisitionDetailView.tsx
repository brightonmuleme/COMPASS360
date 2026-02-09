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
    const [isMatrixView, setIsMatrixView] = useState(false);

    if (!requisition) return null;

    return (
        <div className="flex flex-col bg-[#020617]">
            {/* Header */}
            <div className="p-1 md:p-10 border-b border-white/5 flex flex-col md:flex-row md:justify-between md:items-center bg-white/5 backdrop-blur-md sticky top-0 z-50 px-2 md:px-10">
                <div className="flex justify-between items-center w-full md:w-auto">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0 md:mb-2">
                            <span className="text-[7px] md:text-[10px] font-black text-purple-400 bg-purple-500/10 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border border-purple-500/20 uppercase tracking-widest">{requisition.readableId || 'REQ'}</span>
                            <span className={`text-[7px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border uppercase tracking-widest ${requisition.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>
                                {requisition.status}
                            </span>
                        </div>
                        <h2 className="text-[12px] md:text-3xl font-black text-white leading-tight truncate uppercase tracking-tighter">{requisition.title}</h2>
                    </div>

                    <div className="flex items-center gap-1 md:gap-4 ml-2">
                        <button
                            onClick={() => setIsMatrixView(!isMatrixView)}
                            className={`p-1.5 md:p-3 rounded-xl border transition-all flex items-center gap-1.5 font-black text-[8px] md:text-[10px] uppercase tracking-widest ${isMatrixView
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">{isMatrixView ? 'Standard' : 'Matrix'}</span>
                        </button>
                        {!isReadOnly && (
                            <button onClick={() => onApprove(requisition.id)} className="hidden md:block px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] shadow-2xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95">
                                Verify Funds
                            </button>
                        )}
                        <button onClick={onBack} className="p-1.5 md:p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all active:scale-90">
                            <XCircle className="w-5 h-5 md:w-8 md:h-8" />
                        </button>
                    </div>
                </div>

                {/* Mobile Direct Audit Info - Integrated into Header */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5 md:hidden">
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] text-slate-500 uppercase font-black tracking-tight">Origin:</span>
                        <span className="text-[8px] text-slate-300 font-bold truncate max-w-[80px]">{requisition.account}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] text-slate-500 uppercase font-black tracking-tight">Total:</span>
                        <span className="text-[9px] text-emerald-400 font-black">
                            {new Intl.NumberFormat('en-UG').format(requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-950/20 relative">
                {isMatrixView ? (
                    <div className="p-4 md:p-12 flex flex-col items-center bg-slate-200 overflow-x-hidden min-h-full print:bg-white print:p-0">
                        <style>{`
                            @media (max-width: 850px) {
                                .matrix-scaler {
                                    transform: scale(calc((100vw - 40px) / 850));
                                    transform-origin: top center;
                                }
                                .matrix-wrapper {
                                    height: calc(1150px * ((100vw - 40px) / 850));
                                }
                            }
                            @media print {
                                .no-print { display: none !important; }
                                .matrix-scaler { transform: none !important; }
                                .matrix-wrapper { height: auto !important; }
                            }
                        `}</style>
                        <div className="matrix-wrapper w-full flex justify-center">
                            {/* MATRIX FORM LAYOUT */}
                            <div className="matrix-scaler bg-white text-slate-900 p-8 md:p-16 shadow-2xl w-[850px] border-[3px] border-slate-900 relative print:shadow-none print:border-none">
                                {/* Form Header */}
                                <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-8 mb-8">
                                    <div>
                                        <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-2">Purchase Requisition</h1>
                                        <div className="flex items-center gap-12 text-sm font-black uppercase italic text-slate-500">
                                            <span>Compass 360 Education Platform</span>
                                            <span>Verified Logistics</span>
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
                                <div className="grid grid-cols-2 gap-px bg-slate-900 border-[2px] border-slate-900 mb-8">
                                    <div className="bg-white p-6">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Request Origin (Account)</div>
                                        <div className="text-xl font-black text-slate-900">{requisition.account}</div>
                                    </div>
                                    <div className="bg-white p-6 border-l-[2px] border-slate-900">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Authorized Date</div>
                                        <div className="text-xl font-black text-slate-900">{requisition.date}</div>
                                    </div>
                                    <div className="bg-white p-6 border-t-[2px] border-slate-900 col-span-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Requisition Title / Project</div>
                                        <div className="text-2xl font-black text-slate-900 uppercase tracking-tight">{requisition.title}</div>
                                        <div className="mt-2 text-xs font-bold text-slate-500">Status: {requisition.status || 'Active Audit'}</div>
                                    </div>
                                </div>

                                {/* The Matrix Table */}
                                <div className="border-[2px] border-slate-900 mb-8 overflow-hidden rounded-sm">
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
                                        <tbody className="divide-y-[1.5px] divide-slate-200">
                                            {(requisition.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className={`${item.isPriority ? 'bg-red-50' : 'bg-white'} hover:bg-slate-50 transition-colors`}>
                                                    <td className="p-4 border-r border-slate-200 text-center font-black text-slate-300">{idx + 1}</td>
                                                    <td className="p-4 border-r border-slate-200">
                                                        <div className={`text-[10px] font-black uppercase ${item.isPriority ? 'text-red-600' : 'text-slate-500'}`}>{item.category}</div>
                                                    </td>
                                                    <td className="p-4 border-r border-slate-200 font-extrabold text-slate-900">{item.name}</td>
                                                    <td className="p-4 border-r border-slate-200 text-center font-black">{item.quantity}</td>
                                                    <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-500">{Number(item.unitPrice).toLocaleString()}</td>
                                                    <td className="p-4 text-right font-black text-slate-900">
                                                        {Number(item.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Filler Rows like paper form */}
                                            {Array.from({ length: Math.max(0, 8 - (requisition.items?.length || 0)) }).map((_, i) => (
                                                <tr key={`filler-${i}`} className="h-12">
                                                    <td className="p-4 border-r border-slate-100 italic text-slate-100">.</td>
                                                    <td className="p-4 border-r border-slate-100"></td>
                                                    <td className="p-4 border-r border-slate-100"></td>
                                                    <td className="p-4 border-r border-slate-100"></td>
                                                    <td className="p-4 border-r border-slate-100"></td>
                                                    <td className="p-4"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-[3px] border-slate-900">
                                                <td colSpan={4} className="p-4 bg-slate-50 border-r-[2px] border-slate-900 text-[10px] font-black uppercase text-slate-400">Notes & Instructions: <span className="text-slate-900 lowercase font-bold ml-2">Verified by finance for procurement.</span></td>
                                                <td className="p-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-right">Aggregate Total</td>
                                                <td className="p-6 bg-slate-900 text-white text-2xl font-black text-right underline decoration-[3px] decoration-emerald-500 underline-offset-8">
                                                    {new Intl.NumberFormat('en-UG').format(requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Signatures Area */}
                                <div className="grid grid-cols-2 gap-16 mt-16 pb-8">
                                    <div className="border-t-[2px] border-slate-900 pt-4">
                                        <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8">Authorized Signature</div>
                                        <div className="h-12 flex items-center justify-center opacity-20">
                                            <FileText className="w-8 h-8 rotate-12" />
                                        </div>
                                    </div>
                                    <div className="border-t-[2px] border-slate-900 pt-4">
                                        <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-8">Management Verification</div>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 italic font-black text-slate-400 text-xs">
                                            <span>Audit Clear</span>
                                            <span>{new Date().toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-0.5 md:p-12 overflow-x-hidden">
                        {/* Desktop Details Grid */}
                        <div className="hidden md:grid grid-cols-3 gap-6 mb-12">
                            <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5 backdrop-blur-sm">
                                <label className="block text-[10px] uppercase text-slate-500 font-black mb-3 tracking-[2px]">Dispatch Date</label>
                                <p className="text-slate-100 text-xl font-black">{requisition.date}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5 backdrop-blur-sm">
                                <label className="block text-[10px] uppercase text-slate-500 font-black mb-3 tracking-[2px]">Source Account</label>
                                <p className="text-slate-100 text-xl font-black">{requisition.account}</p>
                            </div>
                            <div className="bg-purple-600/10 p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border border-purple-500/20 backdrop-blur-sm md:shadow-2xl md:shadow-purple-900/10">
                                <label className="block text-[8px] md:text-[10px] uppercase text-purple-400 font-black mb-1 md:mb-3 tracking-[2px]">Forensic Total</label>
                                <p className="text-emerald-400 font-black text-2xl md:text-3xl tracking-tighter">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
                                        requisition.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0
                                    ).replace('UGX', 'USh')}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-hidden mb-12 px-1 md:px-0">
                            <table className="w-full text-left text-[10px] md:text-sm border-collapse">
                                <thead className="hidden md:table-header-group">
                                    <tr className="border-b border-white/5 text-slate-600 text-[10px] uppercase tracking-widest font-black">
                                        <th className="py-4 w-12 px-4">#</th>
                                        <th className="py-4 px-4 text-center">Identity</th>
                                        <th className="py-4 px-4">Description</th>
                                        <th className="py-4 px-4 text-right">Qty</th>
                                        <th className="py-4 px-4 text-right">Rate</th>
                                        <th className="py-4 px-4 text-right">Impact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(() => {
                                        const getMain = (i: any) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");

                                        // SORT ITEMS TO ENSURE GROUPING WORKS
                                        const sortedItems = [...(requisition.items || [])].sort((a, b) => {
                                            const groupA = getMain(a);
                                            const groupB = getMain(b);
                                            return groupA.localeCompare(groupB);
                                        });

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
                                                        <tr className="bg-white/5 backdrop-blur-sm">
                                                            <td colSpan={6} className="py-1.5 px-2 text-right text-[7px] md:text-[10px] uppercase font-black text-slate-500 tracking-[1px]">
                                                                {prevGroup} SUB-TOTAL: <span className="text-slate-300 font-mono ml-1">{new Intl.NumberFormat('en-UG').format(getGroupSum(index - 1, prevGroup || ""))}</span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02] ${item.isPriority ? 'bg-red-500/10' : ''}`}>
                                                        <td className="py-1.5 md:py-5 pr-1 md:px-4 text-slate-600 text-[8px] md:text-[10px] font-black w-2 md:w-12">{index + 1}</td>
                                                        <td className="py-1.5 md:py-5 px-1 md:px-4 hidden md:table-cell">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${item.isPriority ? 'bg-red-900/40 text-red-100 border-red-500/20' : 'bg-slate-900 text-slate-400 border-white/5'}`}>
                                                                {item.category}
                                                            </span>
                                                        </td>
                                                        <td className="py-1.5 md:py-5 px-1 md:px-4">
                                                            <div className="flex flex-col">
                                                                <div className={`md:hidden text-[7px] uppercase font-black tracking-tighter leading-none mb-0.5 ${item.isPriority ? 'text-red-400' : 'text-slate-500'}`}>{item.category}</div>
                                                                <div className={`font-extrabold tracking-tight md:text-[12px] leading-tight ${item.isPriority ? 'text-red-100' : 'text-slate-100'}`}>
                                                                    {item.description || item.name}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-1.5 md:py-5 px-1 md:px-4 text-right text-slate-500 font-black w-4 md:w-auto">{item.quantity}</td>
                                                        <td className="py-1.5 md:py-5 px-1 md:px-4 text-right text-slate-500 font-mono italic text-[8px] md:text-sm min-w-[30px] md:min-w-0 md:table-cell">{Number(item.unitPrice).toLocaleString()}</td>
                                                        <td className={`py-1.5 md:py-5 pl-1 md:px-4 text-right font-black text-[10px] md:text-lg tracking-tighter font-mono min-w-[60px] md:w-auto ${item.isManual ? 'text-yellow-400' : 'text-slate-100'}`}>
                                                            {Number(item.amount).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                    {index === requisition.items.length - 1 && (
                                                        <tr className="bg-white/5 backdrop-blur-sm">
                                                            <td colSpan={6} className="py-1.5 px-2 text-right text-[7px] md:text-[10px] uppercase font-black text-slate-500 tracking-[1px]">
                                                                {currentGroup} SUB-TOTAL: <span className="text-slate-100 font-mono ml-1">{new Intl.NumberFormat('en-UG').format(getGroupSum(index, currentGroup))}</span>
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

                        {/* Notes */}
                        {requisition.notes && (
                            <div className="mb-8 border-t border-slate-700 pt-4">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Notes</h3>
                                <p className="text-slate-300 text-sm italic whitespace-pre-wrap">{requisition.notes}</p>
                            </div>
                        )}

                        {/* Queue Snapshot */}
                        {requisition.queueSnapshot && requisition.queueSnapshot.length > 0 && (
                            <div className="mt-8 pt-8 border-t-2 border-slate-700">
                                <h3 className="text-lg font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Audit Snapshot: Deleted Items
                                </h3>
                                <table className="w-full text-left text-xs border border-slate-700">
                                    <thead className="bg-slate-800 text-slate-400 font-bold uppercase">
                                        <tr>
                                            <th className="p-2">Item Name</th>
                                            <th className="p-2">Category</th>
                                            <th className="p-2 text-right">Orig. Amount</th>
                                            <th className="p-2 text-right">Date Removed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {requisition.queueSnapshot.map((qItem: any, idx: number) => (
                                            <tr key={idx} className={`${qItem.itemData.isPriority ? 'bg-red-500/10' : ''}`}>
                                                <td className="p-2"><div className={`font-semibold ${qItem.itemData.isPriority ? 'text-red-400' : 'text-slate-300'}`}>{qItem.itemData.name}</div></td>
                                                <td className="p-2 text-slate-400">{qItem.itemData.category}</td>
                                                <td className="p-2 text-right text-slate-400">{Number(qItem.itemData.amount).toLocaleString()}</td>
                                                <td className="p-2 text-right text-slate-500">{new Date(qItem.dateRemoved).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!isReadOnly && (
                            <div className="md:hidden pt-4 pb-12">
                                <button
                                    onClick={() => onApprove(requisition.id)}
                                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-[2px] shadow-2xl shadow-purple-900/40 transition-all active:scale-95"
                                >
                                    Verify Requisition
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
