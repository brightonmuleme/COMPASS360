"use client";
import React, { useState } from 'react';
import { TransactionCategoryItem, TransactionType, useSchoolData, generateId } from '@/lib/store';
import { X, ChevronLeft, Plus, Edit2, Trash2, Check, Menu, AlertCircle } from 'lucide-react';

interface CategoryManagerProps {
    type: TransactionType;
    onClose: () => void;
}

type ViewMode = 'LIST' | 'SUBCATEGORIES' | 'EDIT_NAME';

export default function CategoryManager({ type, onClose }: CategoryManagerProps) {
    const {
        expenseCategories, incomeCategories,
        addCategory, updateCategory, deleteCategory,
        addSubcategory, updateSubcategory, deleteSubcategory
    } = useSchoolData();

    const categories = type === 'Expense' ? expenseCategories : incomeCategories;

    // NAVIGATION STATE
    const [view, setView] = useState<ViewMode>('LIST');
    const [activeCategory, setActiveCategory] = useState<TransactionCategoryItem | null>(null);
    const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

    // ACTION STATE
    const [isDeleteMode, setIsDeleteMode] = useState<Record<string, boolean>>({}); // Map of ID -> showing delete button
    const [isAdding, setIsAdding] = useState(false);
    const [newValue, setNewValue] = useState('');

    // EDIT FORM STATE
    const [editValue, setEditValue] = useState('');
    const [editLabel, setEditLabel] = useState('');

    const toggleDelete = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsDeleteMode(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAdd = () => {
        if (!newValue.trim()) return;
        if (view === 'LIST') {
            addCategory(type, newValue.trim());
        } else if (activeCategory) {
            addSubcategory(type, activeCategory.id, newValue.trim());
        }
        setNewValue('');
        setIsAdding(false);
    };

    // --- VIEW 1: MAIN LIST ---
    const renderList = () => (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="flex items-center justify-between p-5 bg-white border-b border-slate-100 sticky top-0 z-10">
                <button onClick={onClose} className="flex items-center gap-2 text-slate-800 font-black tracking-tight">
                    <ChevronLeft className="w-5 h-5" />
                    <span>{type.toUpperCase()}S</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type === 'Expense' ? 'Expenses' : 'Income'}</span>
                    <button
                        onClick={() => {
                            setIsAdding(!isAdding);
                            setNewValue('');
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAdding ? 'bg-slate-100 text-slate-400 rotate-45' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'}`}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="p-4 bg-white border-b border-slate-100 animate-in slide-in-from-top duration-300">
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            placeholder={`New ${type} Category...`}
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleAdd}
                            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
                        >Add</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                {categories.map(cat => (
                    <div
                        key={cat.id}
                        onClick={() => {
                            setActiveCategory(cat);
                            setView('SUBCATEGORIES');
                            setIsDeleteMode({});
                            setIsAdding(false);
                        }}
                        className="flex items-center bg-white border-b border-slate-100 py-4 px-5 active:bg-slate-50 transition-colors group cursor-pointer"
                    >
                        <button
                            onClick={(e) => toggleDelete(cat.id, e)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDeleteMode[cat.id] ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-red-50 group-hover:text-red-400'}`}
                        >
                            {isDeleteMode[cat.id] ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>

                        <div className="flex-1 min-w-0 ml-4">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">{cat.name}</span>
                                {cat.subcategories.length > 0 && (
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                        {cat.subcategories.length}
                                    </span>
                                )}
                            </div>
                            {cat.subcategories.length > 0 && (
                                <div className="text-slate-400 text-[10px] truncate font-bold mt-1 uppercase tracking-tighter italic">
                                    {cat.subcategories.join(' • ')}
                                </div>
                            )}
                        </div>

                        {isDeleteMode[cat.id] ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCategory(type, cat.id);
                                }}
                                className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in zoom-in shadow-lg shadow-red-500/20 ml-2"
                            >
                                DELETE
                            </button>
                        ) : (
                            <div className="text-slate-300">
                                <ChevronLeft className="w-5 h-5 rotate-180" />
                            </div>
                        )}
                    </div>
                ))}

                {categories.length === 0 && !isAdding && (
                    <div className="p-12 text-center text-slate-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">No Categories Found</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="mt-4 text-blue-600 font-bold text-xs underline"
                        >Create your first category</button>
                    </div>
                )}
            </div>
        </div>
    );

    // --- VIEW 2: SUB-CATEGORIES ---
    const renderSubcategories = () => {
        if (!activeCategory) return null;
        return (
            <div className="flex flex-col h-full bg-slate-50 text-slate-800">
                <div className="flex items-center justify-between p-5 bg-white border-b border-slate-100 sticky top-0 z-10">
                    <button onClick={() => setView('LIST')} className="flex items-center gap-2 font-black tracking-tight text-slate-800">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="truncate max-w-[120px] uppercase text-xs">{activeCategory.name}</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={() => {
                            setEditValue(activeCategory.name);
                            setEditLabel('Category');
                            setView('EDIT_NAME');
                        }} className="p-2 text-slate-400 hover:text-blue-500">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setIsAdding(!isAdding);
                                setNewValue('');
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAdding ? 'bg-slate-100 text-slate-400 rotate-45' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'}`}
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {isAdding && (
                    <div className="p-4 bg-white border-b border-slate-100 animate-in slide-in-from-top duration-300">
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                placeholder="Subcategory name..."
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                            />
                            <button
                                onClick={handleAdd}
                                className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
                            >Add</button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {activeCategory.subcategories.map((sub, idx) => (
                        <div key={`${sub}-${idx}`} className="flex items-center bg-white border-b border-slate-100 py-4 px-5 group">
                            <button
                                onClick={() => toggleDelete(sub)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDeleteMode[sub] ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 opacity-50'}`}
                            >
                                {isDeleteMode[sub] ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                            <div className="flex-1 ml-4 font-bold text-sm text-slate-700 uppercase tracking-tight">{sub}</div>

                            {isDeleteMode[sub] ? (
                                <button
                                    onClick={() => deleteSubcategory(type, activeCategory.id, sub)}
                                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest animate-in zoom-in"
                                >
                                    DELETE
                                </button>
                            ) : (
                                <div className="flex gap-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {
                                        setActiveSubcategory(sub);
                                        setEditValue(sub);
                                        setEditLabel('Subcategory');
                                        setView('EDIT_NAME');
                                    }} className="p-2 hover:text-blue-500">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {activeCategory.subcategories.length === 0 && !isAdding && (
                        <div className="p-12 text-center text-slate-400">
                            <AlertCircle className="w-10 h-10 mx-auto mb-4 opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-50">No subcategories defined for this group</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- VIEW 3: EDIT FORM ---
    const renderEditForm = () => {
        if (!activeCategory) return null;
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <button onClick={() => {
                        setView('SUBCATEGORIES');
                        setActiveSubcategory(null);
                    }} className="flex items-center gap-1 font-black text-slate-800 tracking-tight">
                        <ChevronLeft className="w-5 h-5" />
                        <span>BACK</span>
                    </button>
                    <span className="font-black text-xs uppercase tracking-widest text-slate-400">Renaming...</span>
                    <div className="w-10" />
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-slate-400 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                            <Edit2 className="w-3 h-3" />
                            Rename {editLabel}
                        </label>
                        <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (editLabel === 'Category') {
                                        updateCategory(type, activeCategory.id, editValue.trim());
                                        setActiveCategory(prev => prev ? ({ ...prev, name: editValue.trim() }) : null);
                                    } else if (activeSubcategory) {
                                        updateSubcategory(type, activeCategory.id, activeSubcategory, editValue.trim());
                                    }
                                    setView('SUBCATEGORIES');
                                    setActiveSubcategory(null);
                                }
                            }}
                            className="w-full font-black text-blue-600 text-2xl border-b-2 border-blue-500 focus:outline-none pb-2 uppercase tracking-tight"
                            autoFocus
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-2">Old name was: {editLabel === 'Category' ? activeCategory.name : activeSubcategory}</p>
                    </div>

                    <div className="flex gap-3 pt-10">
                        <button
                            onClick={() => {
                                if (editLabel === 'Category') {
                                    updateCategory(type, activeCategory.id, editValue.trim());
                                    setActiveCategory(prev => prev ? ({ ...prev, name: editValue.trim() }) : null);
                                } else if (activeSubcategory) {
                                    updateSubcategory(type, activeCategory.id, activeSubcategory, editValue.trim());
                                }
                                setView('SUBCATEGORIES');
                                setActiveSubcategory(null);
                            }}
                            className="flex-1 bg-blue-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            Save Changes
                        </button>
                        <button
                            onClick={() => {
                                setView('SUBCATEGORIES');
                                setActiveSubcategory(null);
                            }}
                            className="px-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full max-w-sm mx-auto bg-white flex flex-col overflow-hidden text-slate-800 animate-in slide-in-from-bottom-5 duration-500">
            {view === 'LIST' && renderList()}
            {view === 'SUBCATEGORIES' && renderSubcategories()}
            {view === 'EDIT_NAME' && renderEditForm()}
        </div>
    );
}
