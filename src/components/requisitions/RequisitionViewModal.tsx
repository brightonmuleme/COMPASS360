import React from 'react';
import { Requisition, useSchoolData } from '@/lib/store';
import { Printer, XCircle, Download, FileText, Clock, CheckCircle } from 'lucide-react';

interface RequisitionViewModalProps {
    requisition: Requisition | null;
    onClose: () => void;
}

export const RequisitionViewModal: React.FC<RequisitionViewModalProps> = ({ requisition, onClose }) => {
    const { portalBranding } = useSchoolData();
    if (!requisition) return null;

    const totalCommitment = requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0;

    const handleExportCSV = () => {
        const headers = ["#", "Category", "Item Description", "Qty", "Unit Price", "Amount"];
        const rows = (requisition.items || []).map((item, index) => [
            index + 1,
            item.category || "Uncategorized",
            item.name,
            item.quantity,
            item.unitPrice,
            item.amount
        ]);

        const meta = [
            [`SCHOOL: ${portalBranding.schoolName}`],
            [`IDENTIFIER: ${requisition.readableId || 'REQ-???'}`],
            [`TITLE: ${requisition.title}`],
            [`DATE: ${requisition.date}`],
            [`LEDGER ACCOUNT: ${requisition.account}`],
            [`STATUS: ${requisition.status}`],
            [""]
        ];

        const csvContent = [
            ...meta,
            headers,
            ...rows,
            [""],
            ["", "", "", "", "TOTAL SUM (UGX)", totalCommitment]
        ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${requisition.readableId || 'REQ'}_Financial_Export.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-3xl p-4 overflow-auto animate-in fade-in duration-300 print:bg-white print:p-0 print:absolute print:inset-0">
            <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none overflow-hidden relative">
                
                {/* Modal Header */}
                <div className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-start print:hidden bg-white sticky top-0 z-50">
                    <div className="flex items-start gap-6">
                        <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest leading-none">{requisition.readableId || 'REQ-???' }</span>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest leading-none ${requisition.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {requisition.status}
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter truncate max-w-md">{requisition.title}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => window.print()} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                            <Printer className="w-5 h-5" />
                        </button>
                        <button onClick={handleExportCSV} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-3 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all active:scale-95">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-4 sm:p-12 overflow-y-auto bg-white text-slate-900 print:p-0 print:overflow-visible no-scrollbar">
                    <div className="print-area space-y-10">
                        {/* Summary Block */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Authored Date</span>
                                <span className="text-xl font-black text-slate-900 tracking-tight">{requisition.date}</span>
                            </div>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Source Origin</span>
                                <span className="text-xl font-black text-slate-900 tracking-tight uppercase">{requisition.account || "MAIN LEDGER"}</span>
                            </div>
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Impact Sum</span>
                                <span className="text-3xl font-black text-emerald-700 tracking-tighter tabular-nums leading-none">
                                    {new Intl.NumberFormat('en-UG').format(totalCommitment)}
                                </span>
                            </div>
                        </div>

                        {/* Items Table - Optimized for Mobile */}
                        <div className="border border-slate-100 sm:rounded-[2.5rem] overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse table-fixed">
                                <colgroup>
                                    <col className="w-[10%] sm:w-16" />
                                    <col className="w-[40%] sm:w-auto" />
                                    <col className="w-[10%] sm:w-20" />
                                    <col className="w-[15%] sm:w-32" />
                                    <col className="w-[25%] sm:w-44" />
                                </colgroup>
                                <thead className="bg-slate-900 text-white text-[8px] sm:text-[10px] uppercase font-black tracking-[3px]">
                                    <tr>
                                        <th className="p-2 sm:p-6 sm:px-10">#</th>
                                        <th className="p-2 sm:p-6 text-left">Protocol Identity</th>
                                        <th className="p-2 sm:p-6 text-right">Qty</th>
                                        <th className="p-2 sm:p-6 text-right">Rate</th>
                                        <th className="p-2 sm:p-6 sm:px-10 text-right">Impact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(requisition.items || []).map((item, index) => {
                                        const getMain = (i: any) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");
                                        const currentGroup = getMain(item);
                                        const prevGroup = index > 0 ? getMain((requisition.items || [])[index - 1]) : null;
                                        const isNewGroup = index > 0 && prevGroup !== currentGroup;
                                        const isLastItem = index === (requisition.items || []).length - 1;

                                        const getGroupSum = (endIndex: number, groupName: string) => {
                                            let sum = 0;
                                            const items = requisition.items || [];
                                            for (let i = endIndex; i >= 0; i--) {
                                                if (getMain(items[i]) !== groupName) break;
                                                sum += Number(items[i].amount);
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
                                                <tr className={`transition-colors hover:bg-slate-50/30 ${item.isPriority ? 'bg-red-50/30' : 'bg-white'}`}>
                                                    <td className="py-2 pl-2 sm:pl-10 text-[8px] sm:text-xs text-slate-300 font-black tabular-nums">{index + 1}</td>
                                                    <td className="py-2 px-1 sm:px-4">
                                                        <div className="flex flex-col min-w-0">
                                                            <div className={`text-[5px] sm:text-[8px] uppercase font-black tracking-widest mb-0.5 truncate ${item.isPriority ? 'text-red-500' : 'text-slate-400'}`}>{item.category}</div>
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
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Notes Justification */}
                        {requisition.notes && (
                            <div className="p-8 sm:p-12 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Official Document Justification</h3>
                                <p className="text-slate-700 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">{requisition.notes}</p>
                            </div>
                        )}
                        
                        {/* Audit Trail Snapshot Logic If Approved already exists but handled simply for preview */}
                        <div className="hidden print:flex justify-between mt-20 pt-10 border-t-4 border-slate-900">
                             <div className="text-center w-64 border-t-2 border-slate-900 pt-4">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparer Entity</p>
                             </div>
                             <div className="text-center w-64 border-t-2 border-slate-900 pt-4">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approver Node</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
