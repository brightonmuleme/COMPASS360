"use client";
import React, { useState, useEffect } from 'react';
import { TransactionCategoryItem } from '@/lib/store';

interface EditCategoryModalProps {
    category: TransactionCategoryItem;
    onClose: () => void;
    onSave: (updatedCategory: TransactionCategoryItem) => void;
    onDelete: (id: string) => void;
    title?: string;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ category, onClose, onSave, onDelete, title = "Edit Category" }) => {
    const [formData, setFormData] = useState<TransactionCategoryItem>({ ...category });
    const [isDirty, setIsDirty] = useState(false);
    const [newSub, setNewSub] = useState("");

    // Track changes
    useEffect(() => {
        const hasChanged = JSON.stringify(formData) !== JSON.stringify(category);
        setIsDirty(hasChanged);
    }, [formData, category]);

    const handleSave = () => {
        if (isDirty) {
            onSave(formData);
        }
    };

    const addSubcategory = () => {
        if (newSub.trim()) {
            setFormData(prev => ({
                ...prev,
                subcategories: [...(prev.subcategories || []), newSub.trim()]
            }));
            setNewSub("");
        }
    };

    const removeSubcategory = (index: number) => {
        setFormData(prev => ({
            ...prev,
            subcategories: (prev.subcategories || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up relative border border-slate-700">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-lg font-bold text-white max-w-[200px] truncate">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Category Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full font-bold text-white bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none py-2 text-xl placeholder-slate-600"
                            placeholder="Category Name"
                        />
                    </div>

                    {/* Subcategories */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center">
                            Subcategories
                            <span className="text-xs font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">{formData.subcategories?.length || 0}</span>
                        </label>

                        {/* List */}
                        <div className="space-y-2">
                            {formData.subcategories?.map((sub, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 group">
                                    <span className="text-sm font-medium text-gray-300">{sub}</span>
                                    <button onClick={() => removeSubcategory(i)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Subcategory Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSub}
                                onChange={e => setNewSub(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addSubcategory()}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                                placeholder="Add new subcategory..."
                            />
                            <button
                                onClick={addSubcategory}
                                disabled={!newSub.trim()}
                                className="px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Alert for empty state */}
                    {(!formData.subcategories || formData.subcategories.length === 0) && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                            <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div className="text-xs text-yellow-200/80 leading-relaxed">
                                Without subcategories, transactions will be categorized only under <b>{formData.name}</b>.
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 border-t border-slate-800">
                    {isDirty ? (
                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-sm"
                        >
                            Save Changes
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            <button
                                onClick={() => onDelete(category.id)}
                                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-400 font-bold text-sm bg-slate-800 hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-600 w-full justify-center"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Category
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
