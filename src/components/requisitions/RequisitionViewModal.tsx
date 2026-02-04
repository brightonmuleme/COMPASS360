import React from 'react';
import { Requisition } from '@/lib/store';
import { Printer, XCircle } from 'lucide-react';

interface RequisitionViewModalProps {
    requisition: Requisition | null;
    onClose: () => void;
}

export const RequisitionViewModal: React.FC<RequisitionViewModalProps> = ({ requisition, onClose }) => {
    if (!requisition) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-auto print:absolute print:inset-0 print:bg-white print:z-auto">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start print:hidden">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{requisition.readableId || 'REQ-???'} - {requisition.title}</h2>
                        <p className={`text-sm font-medium px-2 py-0.5 rounded w-fit ${requisition.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                            {requisition.status}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700">
                            <Printer className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Modal Content (Printable) */}
                <div className="p-8 overflow-y-auto">
                    {/* Print Header */}
                    <div className="hidden print:block mb-8 text-center border-b border-black pb-4">
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Requisition Form</h1>
                        <p className="text-sm">VINE INTERNATIONAL SCHOOL</p>
                        <p className="text-xs text-gray-500">Official Document • {requisition.readableId}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 print:text-gray-600 font-bold mb-1">Date</label>
                            <p className="text-slate-200 print:text-black text-lg">{requisition.date}</p>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-500 print:text-gray-600 font-bold mb-1">Account</label>
                            <p className="text-slate-200 print:text-black text-lg">{requisition.account}</p>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-500 print:text-gray-600 font-bold mb-1">Total Amount</label>
                            <p className="text-emerald-400 print:text-black font-bold text-xl">
                                {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(
                                    requisition.items?.reduce((s, i) => s + Number(i.amount), 0) || 0
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Items Table (Read Only) */}
                    <table className="w-full text-left text-sm border-collapse mb-8">
                        <thead>
                            <tr className="border-b border-slate-700 print:border-black text-slate-500 print:text-gray-600 text-xs uppercase">
                                <th className="py-2 w-10">#</th>
                                <th className="py-2">Category</th>
                                <th className="py-2">Item Description</th>
                                <th className="py-2 text-right">Qty</th>
                                <th className="py-2 text-right">Unit Price</th>
                                <th className="py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 print:divide-gray-300">
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
                                            <tr className="bg-slate-800/30 print:bg-gray-100 font-bold">
                                                <td colSpan={5} className="p-2 text-right text-xs uppercase text-slate-500 print:text-black">
                                                    {prevGroup} Subtotal
                                                </td>
                                                <td className="p-2 text-right text-slate-300 print:text-black">
                                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index - 1, prevGroup || ""))}
                                                </td>
                                            </tr>
                                        )}
                                        <tr className={`border-b border-slate-700/50 last:border-0 print:border-gray-200 ${item.isPriority ? 'bg-red-500/5 print:bg-transparent' : ''}`}>
                                            <td className="py-2 text-slate-500 print:text-black text-xs">{index + 1}</td>
                                            <td className={`py-2 ${item.isPriority ? 'text-red-400 font-bold' : 'text-slate-400'} print:text-black`}>{item.category}</td>
                                            <td className="py-2 text-slate-200 print:text-black font-medium">{item.name}</td>
                                            <td className="py-2 text-right text-slate-400 print:text-black">{item.quantity}</td>
                                            <td className="py-2 text-right text-slate-400 print:text-black">{Number(item.unitPrice).toLocaleString()}</td>
                                            <td className={`py-2 text-right font-mono ${requisition.status === 'Draft' && item.isManual ? 'text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded' : 'text-slate-200'} print:text-black`}>
                                                {Number(item.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                        {/* Final Total for Last Group */}
                                        {index === requisition.items.length - 1 && (
                                            <tr className="bg-slate-800/30 print:bg-gray-100 font-bold">
                                                <td colSpan={5} className="p-2 text-right text-xs uppercase text-slate-500 print:text-black">
                                                    {currentGroup} Subtotal
                                                </td>
                                                <td className="p-2 text-right text-slate-300 print:text-black">
                                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(getGroupSum(index, currentGroup))}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Notes Section */}
                    {requisition.notes && (
                        <div className="mb-8 border-t border-slate-700 pt-4 print:border-black">
                            <h3 className="text-xs uppercase font-bold text-slate-500 print:text-gray-600 mb-2">Notes</h3>
                            <p className="text-slate-300 print:text-black text-sm italic whitespace-pre-wrap">{requisition.notes}</p>
                        </div>
                    )}

                    {/* Audit Snapshot Table (If Approved) */}
                    {requisition.queueSnapshot && requisition.queueSnapshot.length > 0 && (
                        <div className="mt-8 pt-8 border-t-2 border-slate-700 print:border-black print:break-before-page">
                            <h3 className="text-lg font-bold text-slate-400 print:text-black mb-4 uppercase tracking-wider">Audit Snapshot: Deleted Items</h3>
                            <p className="text-xs text-slate-500 print:text-gray-600 mb-4">
                                The following items were removed from the requisition during the drafting process before approval.
                                This snapshot is preserved for audit purposes.
                            </p>
                            <table className="w-full text-left text-xs border border-slate-700 print:border-gray-400">
                                <thead className="bg-slate-800 print:bg-gray-200 text-slate-400 print:text-black font-bold uppercase">
                                    <tr>
                                        <th className="p-2">Item Name</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2 text-right">Orig. Amount</th>
                                        <th className="p-2 text-right">Date Removed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 print:divide-gray-400">
                                    {requisition.queueSnapshot.map((qItem, idx) => (
                                        <tr key={idx} className={`print:text-black ${qItem.itemData.isPriority ? 'bg-red-500/10 print:bg-transparent' : ''}`}>
                                            <td className="p-2">
                                                <div className={`font-semibold ${qItem.itemData.isPriority ? 'text-red-400 print:text-black' : ''}`}>
                                                    {qItem.itemData.name}
                                                    {qItem.itemData.isPriority && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-1 rounded border border-red-500/30 uppercase tracking-tighter print:border-black print:text-black">Priority</span>}
                                                </div>
                                            </td>
                                            <td className={`p-2 ${qItem.itemData.isPriority ? 'text-red-400/70 print:text-black' : ''}`}>{qItem.itemData.category}</td>
                                            <td className="p-2 text-right">{Number(qItem.itemData.amount).toLocaleString()}</td>
                                            <td className="p-2 text-right">{new Date(qItem.dateRemoved).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Signatures (Print Only) */}
                    <div className="hidden print:flex justify-between mt-20 pt-8 border-t border-black">
                        <div className="text-center">
                            <div className="w-48 border-b border-black mb-2"></div>
                            <p className="text-xs uppercase font-bold">Prepared By</p>
                        </div>
                        <div className="text-center">
                            <div className="w-48 border-b border-black mb-2"></div>
                            <p className="text-xs uppercase font-bold">Authorized By</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
