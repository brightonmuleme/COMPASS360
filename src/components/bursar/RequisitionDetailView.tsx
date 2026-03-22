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

    const totalCommitment = requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0;

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen animate-in fade-in duration-500">
            {/* Immersive Header (Matching Image 1 Style) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm md:shadow-none">
                <div className="container mx-auto px-4 sm:px-10 py-6 sm:py-10">
                    <div className="flex justify-between items-start mb-6 print:hidden">
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest">{requisition.readableId || 'REQ-INF'}</span>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border border-slate-200 uppercase tracking-widest ${requisition.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                    {requisition.status}
                                </span>
                             </div>
                             <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mt-2">{requisition.title}</h1>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => window.print()} className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl transition-all active:scale-95">
                                <Printer className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setIsMatrixView(!isMatrixView)} className="hidden md:flex p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest">
                                {isMatrixView ? 'Standard View' : 'Visual Matrix'}
                            </button>
                            <button onClick={onBack} className="p-3 bg-slate-100 text-slate-400 rounded-full active:scale-90 transition-all">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Request Origin:</span>
                            <span className="text-xs sm:text-lg font-black text-slate-900 uppercase tracking-tight">{requisition.account || "ADMINISTRATION LEDGER"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Allocated Impact:</span>
                            <span className="text-2xl sm:text-5xl font-black text-emerald-600 tracking-tighter tabular-nums leading-none">
                                {new Intl.NumberFormat('en-UG').format(totalCommitment)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto px-0 sm:px-10 py-6 sm:py-12">
                {isMatrixView ? (
                     <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 md:p-16 print:border-none print:shadow-none">
                         {/* Matrix Style Header from Previous Turn - Handled inside Detail View */}
                         <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-8 mb-8">
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">{portalBranding?.schoolName || "COMPASS 360"}</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-2">Voucher Approval Protocol</p>
                            </div>
                            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xl">{requisition.readableId}</div>
                         </div>
                         <table className="w-full text-left text-sm border-collapse border-[2px] border-slate-900">
                             <thead>
                                 <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                     <th className="p-4 border-r border-white/20 w-12">#</th>
                                     <th className="p-4 border-r border-white/20">Protocol / Detail</th>
                                     <th className="p-4 border-r border-white/20 text-center w-20">Qty</th>
                                     <th className="p-4 border-r border-white/20 text-right w-32">Rate</th>
                                     <th className="p-4 text-right w-40">Impact</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y-[2px] divide-slate-100">
                                 {(requisition.items || []).map((item: any, idx: number) => (
                                     <tr key={idx}>
                                         <td className="p-4 border-r border-slate-200 font-black text-slate-300">{idx + 1}</td>
                                         <td className="p-4 border-r border-slate-200">
                                             <div className="text-[8px] font-black text-slate-400 uppercase mb-1">{item.category}</div>
                                             <div className="text-base font-black text-slate-900 uppercase">{item.name}</div>
                                         </td>
                                         <td className="p-4 border-r border-slate-200 text-center font-black">{item.quantity}</td>
                                         <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-400">{Number(item.unitPrice).toLocaleString()}</td>
                                         <td className="p-4 text-right font-black text-slate-900 text-xl tabular-nums">{Number(item.amount).toLocaleString()}</td>
                                     </tr>
                                 ))}
                             </tbody>
                             <tfoot className="border-t-[3px] border-slate-900">
                                  <tr className="bg-slate-900 text-white font-black">
                                      <td colSpan={4} className="p-8 text-right text-xs uppercase tracking-widest">Aggregate Verification Sum</td>
                                      <td className="p-8 text-right text-3xl tabular-nums">{new Intl.NumberFormat('en-UG').format(totalCommitment)}</td>
                                  </tr>
                             </tfoot>
                         </table>
                     </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="hidden md:grid grid-cols-3 gap-6 mb-10">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Authored Date</span>
                                <span className="text-2xl font-black text-slate-900">{requisition.date}</span>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Itemized Count</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">{requisition.items?.length || 0} LEDGER ENTRIES</span>
                            </div>
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 relative z-10">Document Total</span>
                                <span className="text-4xl font-black text-emerald-400 tracking-tighter relative z-10 tabular-nums">{new Intl.NumberFormat('en-UG').format(totalCommitment)}</span>
                            </div>
                        </div>

                        {/* Items Table - Redesigned like Image 2 Reference */}
                        <div className="bg-white sm:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-12">
                             <table className="w-full text-left border-collapse table-fixed">
                                 <colgroup>
                                     <col className="w-[10%] sm:w-16" />
                                     <col className="w-[40%] sm:w-auto" />
                                     <col className="w-[10%] sm:w-24" />
                                     <col className="w-[15%] sm:w-32" />
                                     <col className="w-[25%] sm:w-44" />
                                 </colgroup>
                                 <thead className="bg-slate-900 border-b border-slate-800 text-[8px] sm:text-[10px] uppercase text-slate-400 font-black tracking-widest">
                                     <tr>
                                         <th className="p-2 sm:p-6 sm:px-10">#</th>
                                         <th className="p-2 sm:p-6 sm:px-4 text-left">Protocol Identity</th>
                                         <th className="p-2 sm:p-6 sm:px-4 text-right">Qty</th>
                                         <th className="p-2 sm:p-6 sm:px-4 text-right">Rate</th>
                                         <th className="p-2 sm:p-6 sm:px-10 text-right">Impact</th>
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
                                             const isLastItem = index === sortedItems.length - 1;

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
                                                         <tr className="bg-slate-50/50">
                                                             <td colSpan={5} className="py-2 sm:py-3 px-4 sm:px-10 text-right text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-y border-slate-50">
                                                                 {prevGroup} SUB-TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index - 1, prevGroup || ""))}</span>
                                                             </td>
                                                         </tr>
                                                     )}
                                                     <tr className={`hover:bg-slate-50 transition-colors ${item.isPriority ? 'bg-red-50/30' : 'bg-white'}`}>
                                                         <td className="py-2 pl-2 sm:pl-10 text-[8px] sm:text-xs text-slate-300 font-black tabular-nums">{index + 1}</td>
                                                         <td className="py-2 px-1 sm:px-4">
                                                             <div className="flex flex-col min-w-0">
                                                                 <div className={`text-[5px] sm:text-[8px] uppercase font-black tracking-widest mb-0.5 truncate ${item.isPriority ? 'text-red-500' : 'text-slate-400'}`}>
                                                                     {item.category || "General Ledger"}
                                                                 </div>
                                                                 <div className={`font-black tracking-tight text-[8px] sm:text-base leading-tight truncate uppercase ${item.isPriority ? 'text-red-700' : 'text-slate-900'}`}>{item.name}</div>
                                                             </div>
                                                         </td>
                                                         <td className="py-2 px-1 text-right text-[8px] sm:text-base font-black tabular-nums text-slate-900">{item.quantity}</td>
                                                         <td className="py-2 px-1 text-right text-[7px] sm:text-sm font-bold tabular-nums italic text-slate-400">{Number(item.unitPrice).toLocaleString()}</td>
                                                         <td className={`py-2 pr-2 sm:pr-10 text-right font-black text-[9px] sm:text-2xl tracking-tighter tabular-nums ${item.isPriority ? 'text-red-700' : 'text-slate-900'}`}>{Number(item.amount).toLocaleString()}</td>
                                                     </tr>
                                                     {isLastItem && (
                                                         <tr className="bg-slate-50/50">
                                                             <td colSpan={5} className="py-2 sm:py-3 px-4 sm:px-10 text-right text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-y border-slate-50">
                                                                 {currentGroup} SUB-TOTAL: <span className="text-slate-900 font-mono ml-3">{new Intl.NumberFormat('en-UG').format(getGroupSum(index, currentGroup))}</span>
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

                        {/* Notes Area */}
                        {requisition.notes && (
                            <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Official Justification</label>
                                <p className="text-slate-700 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">{requisition.notes}</p>
                            </div>
                        )}

                        {/* Approval Action (Slimmer matching Image 2 Reference) */}
                        {!isReadOnly && (
                            <div className="fixed sm:relative bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/80 backdrop-blur-xl sm:bg-transparent border-t sm:border-none border-slate-200 flex flex-col items-center gap-4 z-[90]">
                                <div className="hidden sm:flex items-center gap-3 text-slate-400 italic text-xs mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Initiate audit verification for this node?</span>
                                </div>
                                <button
                                    onClick={() => onApprove(requisition.id)}
                                    className="w-full sm:w-auto px-6 py-3 sm:px-10 sm:py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-sm font-black uppercase tracking-[2px] shadow-xl shadow-purple-900/10 active:scale-95 transition-all italic border border-purple-500"
                                >
                                    Verify Requisition
                                </button>
                                <div className="h-4 sm:hidden" /> {/* Mobile bottom spacer */}
                            </div>
                        )}
                        <div className="h-24 sm:hidden" />
                    </div>
                )}
            </div>
        </div>
    );
}
