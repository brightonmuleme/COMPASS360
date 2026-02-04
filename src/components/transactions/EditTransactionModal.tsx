import React, { useState, useEffect, useRef } from 'react';
import { GeneralTransaction, useSchoolData } from '@/lib/store';
import Calculator from '@/components/ui/Calculator';

interface EditTransactionModalProps {
    transaction: GeneralTransaction;
    onClose: () => void;
    onSave: (updatedTransaction: GeneralTransaction) => void;
    onDelete: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, onSave, onDelete }) => {
    const { generalTransactions, accounts } = useSchoolData();
    const [formData, setFormData] = useState<GeneralTransaction>({ ...transaction });
    const [isDirty, setIsDirty] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track changes to enable "Save" button
    useEffect(() => {
        const hasChanged = JSON.stringify(formData) !== JSON.stringify(transaction);
        setIsDirty(hasChanged);
    }, [formData, transaction]);

    const handleChange = (field: keyof GeneralTransaction | 'longDescription', value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (isDirty) {
            onSave(formData);
        }
    };

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newAttachment = event.target.result as string; // Base64
                    setFormData(prev => ({
                        ...prev,
                        attachments: [...(prev.attachments || []), newAttachment]
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAttachment = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter((_, i) => i !== indexToRemove)
        }));
    };

    // Parse category for display
    const [mainCat, subCat] = (formData.category || '').split('/');
    const displayTitle = subCat || mainCat || 'Transaction Details';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up relative border border-slate-700">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-lg font-bold text-white max-w-[200px] truncate">{displayTitle}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Type Toggle */}
                    <div className="flex p-1 bg-slate-800 rounded-xl">
                        {['Income', 'Expense'].map(type => (
                            <button
                                key={type}
                                onClick={() => handleChange('type', type)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === type ?
                                    (type === 'Expense' ? 'bg-slate-700 text-orange-400 shadow-sm border border-slate-600' : 'bg-slate-700 text-green-400 shadow-sm border border-slate-600')
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            value={formData.date?.split('T')[0]}
                            onChange={e => handleChange('date', e.target.value)}
                            className="w-full font-bold text-white bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none py-2 [color-scheme:dark]"
                        />
                    </div>

                    {/* Amount - CLICK TO OPEN CALCULATOR */}
                    <div className="space-y-1" onClick={() => setShowCalculator(true)}>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</label>
                        <div className="flex items-center gap-2 border-b border-slate-700 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors rounded px-1 -mx-1">
                            <span className="text-sm font-bold text-gray-500">USh</span>
                            <div className="w-full font-bold text-white text-xl">
                                {Number(formData.amount).toLocaleString()}
                            </div>
                        </div>
                    </div>


                    {/* Category */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</label>
                        <div className="py-2 border-b border-slate-700 font-bold text-white">
                            {mainCat}
                        </div>
                    </div>

                    {/* Account */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account</label>
                        <select
                            value={formData.method || 'Cash'}
                            onChange={e => handleChange('method', e.target.value)}
                            className="w-full py-2 bg-transparent border-b border-slate-700 font-bold text-white outline-none focus:border-blue-500"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.name} className="bg-slate-800 text-white font-medium">
                                    {acc.name} ({acc.group})
                                </option>
                            ))}
                            {/* Fallback if list is empty or for legacy support */}
                            {!accounts.length && <option value="Cash" className="bg-slate-800">Cash</option>}
                        </select>
                    </div>

                    {/* Note (Short Description) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                            Note <span className="text-xs text-slate-600">!</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.description || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    handleChange('description', val);
                                    if (val.length > 0) {
                                        const allNotes = generalTransactions.map(t => t.description).filter(Boolean);
                                        const unique = Array.from(new Set(allNotes));
                                        const matches = unique.filter(n => n.toLowerCase().includes(val.toLowerCase()) && n !== val).slice(0, 5);
                                        setSuggestions(matches);
                                    } else {
                                        setSuggestions([]);
                                    }
                                }}
                                onFocus={() => {
                                    if (formData.description) {
                                        const allNotes = generalTransactions.map(t => t.description).filter(Boolean);
                                        const unique = Array.from(new Set(allNotes));
                                        const matches = unique.filter(n => n.toLowerCase().includes(formData.description.toLowerCase()) && n !== formData.description).slice(0, 5);
                                        setSuggestions(matches);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setSuggestions([]), 200)} // Delay to allow click
                                className="w-full font-bold text-white bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none py-2 placeholder-slate-600"
                                placeholder="Reason for payment"
                            />
                            {suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-gray-300 font-medium border-b border-slate-700/50 last:border-0"
                                            onClick={() => {
                                                handleChange('description', s);
                                                setSuggestions([]);
                                            }}
                                        >
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Description */}
                    <div className="space-y-1 pt-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Description</span>
                            <div className="flex items-center gap-3">
                                <button onClick={handleCameraClick} className="text-gray-500 hover:text-blue-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                        <textarea
                            value={formData.longDescription || ''}
                            onChange={e => handleChange('longDescription', e.target.value)}
                            className="w-full text-sm font-medium text-gray-300 bg-slate-800 border border-slate-700 focus:bg-slate-700 focus:border-blue-500 rounded-lg p-3 outline-none min-h-[80px] placeholder-slate-500"
                            placeholder="Add more details..."
                        />
                    </div>

                    {/* Attachments Preview */}
                    {formData.attachments && formData.attachments.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {formData.attachments.map((src, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-700">
                                    <img src={src} alt="Attachment" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 border-t border-slate-800">
                    {isDirty ? (
                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 text-sm"
                        >
                            Save
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            <button
                                onClick={() => onDelete(transaction.id)}
                                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-400 font-bold text-sm bg-slate-800 hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                {/* CALCULATOR OVERLAY */}
                {showCalculator && (
                    <div className="absolute inset-0 bg-black/50 z-[60] flex items-end animate-fade-in">
                        <Calculator
                            initialValue={formData.amount}
                            onOk={(val) => {
                                handleChange('amount', val);
                                setShowCalculator(false);
                            }}
                            onClose={() => setShowCalculator(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
