"use client";
import React, { useState } from 'react';
import { TransactionCategoryItem, TransactionType, useSchoolData } from '@/lib/store';

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

    // EDIT FORM STATE
    const [editValue, setEditValue] = useState('');
    const [editLabel, setEditLabel] = useState('');

    const toggleDelete = (id: string) => {
        setIsDeleteMode(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- VIEW 1: MAIN LIST ---
    const renderList = () => (
        <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <button onClick={onClose} className="text-xl font-bold">❮ {type}</button>
                <span className="font-bold text-gray-500">{type === 'Expense' ? 'Exp.' : 'Inc.'}</span>
                <button
                    onClick={() => {
                        // Add new Category Mock Flow -> Usually would open input, simplifing to 'New Category' auto-add or prompt
                        const name = prompt("Enter new category name:");
                        if (name) addCategory(type, name);
                    }}
                    className="text-3xl font-light"
                >
                    +
                </button>
            </div>

            {/* TOGGLE SUB HEADER */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                <span className="font-bold text-gray-700">Category</span>
                {/* Toggle switch visual */}
                <div className="w-10 h-5 bg-red-400 rounded-full relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center border-b border-gray-100 py-4 px-4 transition-all">
                        {/* Minus / Delete Trigger */}
                        <button
                            onClick={() => toggleDelete(cat.id)}
                            className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center mr-4 shrink-0 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                            </svg>
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-gray-800 uppercase">{cat.name}</span>
                                {cat.subcategories.length > 0 && (
                                    <span className="text-gray-500 font-bold text-sm">({cat.subcategories.length})</span>
                                )}
                            </div>
                            {cat.subcategories.length > 0 && (
                                <div className="text-gray-400 text-xs truncate font-medium mt-0.5">
                                    {cat.subcategories.join(', ')}
                                </div>
                            )}
                        </div>

                        {isDeleteMode[cat.id] ? (
                            <button
                                onClick={() => deleteCategory(type, cat.id)}
                                className="bg-red-500 text-white px-4 py-1.5 rounded text-sm font-bold animate-fade-in shadow ml-2"
                            >
                                Delete
                            </button>
                        ) : (
                            <div className="flex gap-4 text-gray-400 items-center ml-2">
                                <button
                                    onClick={() => {
                                        setActiveCategory(cat);
                                        setView('SUBCATEGORIES');
                                        setIsDeleteMode({});
                                    }}
                                    className="hover:text-black transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                    </svg>
                                </button>
                                <button className="hover:text-black transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    // --- VIEW 2: SUB-CATEGORIES ---
    const renderSubcategories = () => {
        if (!activeCategory) return null;
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <button onClick={() => setView('LIST')} className="text-xl font-bold">❮ {type === 'Expense' ? 'Exp.' : 'Inc.'}</button>
                    <div className="flex items-center gap-2 font-bold text-gray-800 uppercase text-sm truncate max-w-[150px]">
                        {activeCategory.name}
                    </div>
                    {/* Header Pencil to Edit MAIN Category Name */}
                    <div className="flex gap-2">
                        <button onClick={() => {
                            setEditValue(activeCategory.name);
                            setEditLabel('Category');
                            setView('EDIT_NAME');
                        }} className="text-gray-400 text-xl">✎</button>
                        <button onClick={() => {
                            const name = prompt("Enter new subcategory name:");
                            if (name) addSubcategory(type, activeCategory.id, name);
                        }} className="text-3xl font-light">+</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeCategory.subcategories.map(sub => (
                        <div key={sub} className="flex items-center border-b border-gray-100 py-3 px-4">
                            <button
                                onClick={() => toggleDelete(sub)}
                                className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0"
                            >
                                -
                            </button>
                            <div className="flex-1 font-bold text-sm text-gray-800 uppercase">{sub}</div>

                            {isDeleteMode[sub] ? (
                                <button
                                    onClick={() => deleteSubcategory(type, activeCategory.id, sub)}
                                    className="bg-red-500 text-white px-4 py-1 rounded text-sm font-bold animate-fade-in"
                                >
                                    Delete
                                </button>
                            ) : (
                                <div className="flex gap-4 text-gray-400">
                                    <button onClick={() => {
                                        setActiveSubcategory(sub);
                                        setEditValue(sub);
                                        setEditLabel('Subcategory');
                                        setView('EDIT_NAME');
                                    }}>✎</button>
                                    <button>☰</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {activeCategory.subcategories.length === 0 && (
                        <div className="p-8 text-center text-gray-400 italic">No subcategories</div>
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
                <div className="flex items-center justify-between p-4">
                    <button onClick={() => setView(activeSubcategory ? 'SUBCATEGORIES' : 'SUBCATEGORIES')} className="text-lg font-bold">❮ Back</button>
                    <span className="font-bold">Edit</span>
                    <span className="text-xs border px-2 py-1 rounded bg-gray-50">{editLabel === 'Category' ? 'Main Category' : 'Sub Category'}</span>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-gray-500 text-xs uppercase font-bold">Category</label>
                        <div className="font-bold text-gray-800 border-b border-gray-200 pb-2">{activeCategory.name}</div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-gray-500 text-xs uppercase font-bold ${editLabel === 'Subcategory' ? 'text-black' : ''}`}>
                            {editLabel}
                        </label>
                        <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-full font-bold text-blue-600 text-xl border-b-2 border-blue-500 focus:outline-none pb-1 uppercase"
                            autoFocus
                        />
                    </div>

                    <button
                        onClick={() => {
                            if (editLabel === 'Category') {
                                updateCategory(type, activeCategory.id, editValue);
                                // Hacky update of local state to reflect change immediately in header if we go back
                                setActiveCategory(prev => prev ? ({ ...prev, name: editValue }) : null);
                            } else if (activeSubcategory) {
                                updateSubcategory(type, activeCategory.id, activeSubcategory, editValue);
                            }
                            setView('SUBCATEGORIES');
                            setActiveSubcategory(null);
                        }}
                        className="w-full bg-red-400 text-white rounded-lg py-3 font-bold shadow-lg hover:bg-red-500 mt-8"
                    >
                        Save
                    </button>
                </div>

                {/* Keyboard Placeholder (Visual only, usually handled by OS) */}
                <div className="mt-auto bg-gray-100 h-[250px] flex items-center justify-center text-gray-400 text-sm border-t">
                    [ Keyboard ]
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full max-w-sm mx-auto bg-white flex flex-col overflow-hidden text-black animate-slide-up">
            {view === 'LIST' && renderList()}
            {view === 'SUBCATEGORIES' && renderSubcategories()}
            {view === 'EDIT_NAME' && renderEditForm()}
        </div>
    );
}
