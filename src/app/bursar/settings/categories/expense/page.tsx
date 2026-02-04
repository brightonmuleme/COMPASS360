"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useSchoolData, TransactionCategoryItem } from '@/lib/store';
import { EditCategoryModal } from '@/components/settings/EditCategoryModal';

export default function ExpensesCategoryPage() {
    const { expenseCategories, updateExpenseCategory, addExpenseCategory, deleteExpenseCategory } = useSchoolData();
    const [showSubcategories, setShowSubcategories] = useState(true);

    // Edit Modal State
    const [editingCategory, setEditingCategory] = useState<TransactionCategoryItem | null>(null);

    // Simple Add Modal State
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const handleAdd = () => {
        if (!newCategoryName.trim()) return;
        if (addExpenseCategory) {
            addExpenseCategory({ name: newCategoryName, subcategories: [] } as any);
        }
        setNewCategoryName("");
        setIsAdding(false);
    };

    const handleSaveEdit = (updated: TransactionCategoryItem) => {
        if (updateExpenseCategory) {
            updateExpenseCategory(updated);
        }
        setEditingCategory(null);
    };

    const handleDelete = (id: string) => {
        if (deleteExpenseCategory) {
            deleteExpenseCategory(id);
        }
        setEditingCategory(null);
    };

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans text-slate-800">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Link href="/bursar/settings" className="text-slate-800 font-bold flex items-center gap-1 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        Settings
                    </Link>
                </div>
                <div className="font-bold text-lg text-slate-800">Exp.</div>
                <button onClick={() => setIsAdding(true)} className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
            </div>

            {/* Subheader / Toggle */}
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">Subcategory</span>

                {/* Custom Toggle Switch */}
                <button
                    onClick={() => setShowSubcategories(!showSubcategories)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${showSubcategories ? 'bg-red-400' : 'bg-slate-300'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${showSubcategories ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-white pb-20">
                <div className="divide-y divide-slate-100">
                    {expenseCategories.map((cat, idx) => (
                        <div key={cat.id || idx} className="flex flex-col relative group">
                            {/* Main Row */}
                            <div className="flex items-center p-3 gap-3 hover:bg-slate-50 transition-colors">
                                {/* Delete Icon */}
                                <button onClick={() => deleteExpenseCategory && deleteExpenseCategory(cat.id)} className="text-red-500 hover:text-red-700 transition-colors p-1">
                                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-600">
                                        <div className="w-2.5 h-0.5 bg-white rounded-full"></div>
                                    </div>
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                        {cat.name}
                                        {showSubcategories && cat.subcategories && cat.subcategories.length > 0 && (
                                            <span className="text-slate-500 font-normal text-xs">({cat.subcategories.length})</span>
                                        )}
                                    </div>
                                    {showSubcategories && cat.subcategories && cat.subcategories.length > 0 && (
                                        <div className="text-[10px] text-slate-400 truncate mt-0.5 font-medium leading-tight">
                                            {cat.subcategories.join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 pl-2">
                                    {/* Mocking Transaction Page (Edit Modal) */}
                                    <button
                                        onClick={() => setEditingCategory(cat)}
                                        className="text-slate-300 hover:text-blue-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button className="text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center animate-fade-in p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl p-4 shadow-2xl animate-slide-up">
                        <h3 className="font-bold text-lg mb-4">Add Expense Category</h3>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Category Name"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleAdd} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT CATEGORY MODAL (Mocks Transaction Page UI) */}
            {editingCategory && (
                <EditCategoryModal
                    category={editingCategory}
                    onClose={() => setEditingCategory(null)}
                    onSave={handleSaveEdit}
                    onDelete={handleDelete}
                    title="Edit Expense Category"
                />
            )}
        </div>
    );
}
