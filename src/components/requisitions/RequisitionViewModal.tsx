import React from 'react';
import { Requisition, useSchoolData } from '@/lib/store';
import { Printer, XCircle, Download } from 'lucide-react';

interface RequisitionViewModalProps {
    requisition: Requisition | null;
    onClose: () => void;
}

export const RequisitionViewModal: React.FC<RequisitionViewModalProps> = ({ requisition, onClose }) => {
    const { portalBranding } = useSchoolData();
    if (!requisition) return null;

    const handleExportCSV = () => {
        // --- CLEAN CSV GENERATION ---
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
            [""] // Spacer
        ];

        const total = requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0;

        const csvContent = [
            ...meta,
            headers,
            ...rows,
            [""],
            ["", "", "", "", "TOTAL SUM (UGX)", total]
        ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

        // --- DOWNLOAD TRIGGER ---
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-auto print:absolute print:inset-0 print:bg-white print:z-auto animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black print:overflow-visible overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start print:hidden bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{requisition.readableId || 'REQ-???'} — <span className="text-slate-600 font-bold uppercase text-xl">{requisition.title}</span></h2>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${requisition.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {requisition.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">Financial Document</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="p-2.5 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 group"
                            title="Direct Print to PDF"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Print / PDF</span>
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 flex items-center gap-2 transition-all active:scale-95 group"
                            title="Export Clean CSV"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Export CSV</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Modal Content (Printable) */}
                <div className="p-6 sm:p-10 overflow-y-auto bg-white text-slate-800 print:overflow-visible print:p-0">
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
                                padding: 0 !important;
                                font-size: 11pt !important;
                                overflow: visible !important;
                            }
                            @page { size: auto; margin: 15mm; }
                            tr { page-break-inside: avoid !important; }
                            thead { display: table-header-group !important; }
                            tfoot { display: table-footer-group !important; }
                            table { font-size: 9pt !important; table-layout: auto !important; width: 100% !important; border-collapse: collapse !important; }
                            th, td { padding: 6px 4px !important; }
                            .amount-col { text-align: right !important; white-space: nowrap !important; }
                        }
                    `}</style>
                    <div className="print-area">
                        {/* Print Header */}
                        <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-6">
                            {portalBranding.logo && (
                                <div className="flex justify-center mb-4">
                                    <img src={portalBranding.logo} alt="Logo" className="h-16 w-auto object-contain" />
                                </div>
                            )}
                            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{portalBranding.schoolName}</h1>
                            {portalBranding.tagline && (
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{portalBranding.tagline}</p>
                            )}
                            <p className="text-lg font-bold text-slate-700 underline decoration-slate-300 decoration-2 underline-offset-4">OFFICIAL REQUISITION FORM</p>
                            <p className="text-xs text-slate-400 font-mono mt-3">DOCUMENT ID • {requisition.readableId}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10 border-b border-slate-100 pb-10">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="block text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Date</label>
                                <p className="text-slate-900 font-bold text-lg">{requisition.date}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="block text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Source Account</label>
                                <p className="text-slate-900 font-bold text-lg">{requisition.account || "MAIN LEDGER"}</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <label className="block text-[10px] uppercase text-emerald-600 font-black tracking-widest mb-1">Total Allocated Sum</label>
                                <p className="text-emerald-700 font-black text-2xl">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                        requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Items Table (Read Only) */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-10">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Item Description</th>
                                        <th className="p-4 text-right">Qty</th>
                                        <th className="p-4 text-right">Unit Price</th>
                                        <th className="p-4 text-right">Amount (UGX)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(requisition.items || []).map((item, index) => {
                                        // Subtotal Logic - Match Editor Logic
                                        const getMain = (i: typeof item) => i.isPriority ? "PRIORITY / SPECIAL" : (i.category ? i.category.split('/')[0].trim() : "Uncategorized");

                                        const currentGroup = getMain(item);
                                        const prevGroup = index > 0 ? getMain((requisition.items || [])[index - 1]) : null;
                                        const isNewGroup = index > 0 && prevGroup !== currentGroup;

                                        // Helper for group sum within viewingReq (Read Only)
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
                                                    <tr className="bg-slate-50/80 font-bold">
                                                        <td colSpan={5} className="p-3 text-right text-[10px] uppercase text-slate-500 tracking-wider">
                                                            {prevGroup} Subtotal
                                                        </td>
                                                        <td className="p-3 text-right text-slate-900 font-extrabold border-l border-slate-100">
                                                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index - 1, prevGroup || ""))}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className={`hover:bg-slate-50 transition-colors ${item.isPriority ? 'bg-red-50' : ''}`}>
                                                    <td className="p-4 text-slate-400 text-center font-mono text-xs">{index + 1}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.isPriority ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {item.category || "General"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-900 font-bold uppercase text-xs">{item.name}</td>
                                                    <td className="p-4 text-right text-slate-600 font-bold">{item.quantity}</td>
                                                    <td className="p-4 text-right text-slate-600 font-mono">{Number(item.unitPrice).toLocaleString()}</td>
                                                    <td className={`p-4 text-right font-black border-l border-slate-50 ${requisition.status === 'Draft' && item.isManual ? 'text-yellow-600' : 'text-slate-900'}`}>
                                                        {Number(item.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                                {/* Final Total for Last Group */}
                                                {index === (requisition.items || []).length - 1 && (
                                                    <tr className="bg-slate-50/80 font-bold">
                                                        <td colSpan={5} className="p-3 text-right text-[10px] uppercase text-slate-500 tracking-wider">
                                                            {currentGroup} Subtotal
                                                        </td>
                                                        <td className="p-3 text-right text-slate-900 font-extrabold border-l border-slate-100">
                                                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index, currentGroup))}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-emerald-700 text-white font-black">
                                    <tr>
                                        <td colSpan={5} className="p-5 text-right uppercase tracking-[0.2em] text-xs">Final Requisition Total</td>
                                        <td className="p-5 text-right text-xl">
                                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                                requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Notes Section */}
                        {requisition.notes && (
                            <div className="mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100 border-l-4 border-l-slate-400">
                                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Justifications & Remarks</h3>
                                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{requisition.notes}</p>
                            </div>
                        )}

                        {/* Audit Snapshot Table (If Approved) */}
                        {requisition.queueSnapshot && requisition.queueSnapshot.length > 0 && (
                            <div className="mt-10 pt-10 border-t-2 border-slate-100 print:break-before-page">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Audit Trail: <span className="text-slate-300">Removed Items</span></h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-6 italic">
                                    The following items were documented but purposefully removed during the drafting cycle prior to final submission/approval.
                                </p>
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                                            <tr>
                                                <th className="p-3">Item Name</th>
                                                <th className="p-3">Category</th>
                                                <th className="p-3 text-right">Orig. Sum</th>
                                                <th className="p-3 text-right">Removal Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-500">
                                            {requisition.queueSnapshot.map((qItem: any, idx: number) => (
                                                <tr key={idx} className={`${qItem.itemData.isPriority ? 'bg-red-50/50' : ''}`}>
                                                    <td className="p-3">
                                                        <div className={`font-bold ${qItem.itemData.isPriority ? 'text-red-500' : 'text-slate-600'}`}>
                                                            {qItem.itemData.name}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">{qItem.itemData.category}</td>
                                                    <td className="p-3 text-right font-mono">{Number(qItem.itemData.amount).toLocaleString()}</td>
                                                    <td className="p-3 text-right font-mono text-[10px]">{new Date(qItem.dateRemoved).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Signatures (Print Only) */}
                        <div className="hidden print:flex justify-between mt-20 pt-10 border-t-2 border-slate-900">
                            <div className="text-center">
                                <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
                                <p className="text-xs uppercase font-black tracking-widest">Prepared / Bursar Signature</p>
                            </div>
                            <div className="text-center">
                                <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
                                <p className="text-xs uppercase font-black tracking-widest">Authorized / Director Approval</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

