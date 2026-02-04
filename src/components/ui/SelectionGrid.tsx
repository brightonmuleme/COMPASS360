"use client";
import React from 'react';

interface SelectionGridProps {
    title: string;
    items: any[];
    onSelect: (item: string) => void;
    onClose: () => void;
    onEdit?: () => void;
}

export default function SelectionGrid({ title, items, onSelect, onClose, onEdit }: SelectionGridProps) {
    // State for tracking expanded category if items are objects
    const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

    // Helper: Checks if item is a simple string or a helper object
    const isComplex = items.length > 0 && typeof items[0] !== 'string';

    const handleMainClick = (item: any) => {
        if (!isComplex) {
            onSelect(item);
            return;
        }

        // Check if item has subcategories
        const hasSubs = item.subcategories && item.subcategories.length > 0;

        if (hasSubs) {
            if (expandedCategory === item.name) {
                // If clicking ALREADY expanded item, select it (allow choosing the main category itself)
                onSelect(item.name);
            } else {
                // Expand it (Don't close/select yet)
                setExpandedCategory(item.name);
            }
        } else {
            // No subcategories? Just select it.
            onSelect(item.name);
        }
    };

    return (
        <div className="bg-white text-black rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden w-full max-w-sm mx-auto flex flex-col max-h-[60vh]">
            {/* Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
                <span className="font-bold text-sm">{title}</span>
                <div className="flex gap-4 items-center">
                    {onEdit && (
                        <button onClick={onEdit} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-h-[200px]">
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <p className="text-sm">No items available.</p>
                        {onEdit && (
                            <p className="text-xs mt-2">Click the edit icon above to manage categories.</p>
                        )}
                    </div>
                ) : (
                    /* Main Grid */
                    <div className="grid grid-cols-3 gap-px bg-gray-200">
                        {items.map((item: any, index: number) => {
                            const name = isComplex ? item.name : item;
                            const hasSubs = isComplex ? (item.subcategories && item.subcategories.length > 0) : false;
                            const isExpanded = isComplex && expandedCategory === name;

                            // Calculation to determine if we should render the panel after this item
                            const isLastInRow = (index % 3 === 2) || (index === items.length - 1);

                            // Find which row the expanded category is in
                            const expandedIndex = items.findIndex((i: any) => i.name === expandedCategory);
                            const expandedRow = Math.floor(expandedIndex / 3);
                            const currentRow = Math.floor(index / 3);

                            // Only show panel if we have a selection, it's complex, and this is the end of the row containing the selection
                            const showPanelHere = isComplex && expandedCategory && isLastInRow && (currentRow === expandedRow);

                            return (
                                <React.Fragment key={name}>
                                    <button
                                        onClick={() => handleMainClick(item)}
                                        className={`
                                            relative p-2 text-[10px] font-bold uppercase flex flex-col items-center justify-center text-center min-h-[80px] break-words leading-tight transition-all
                                            ${isExpanded ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-white hover:bg-gray-50 text-black'}
                                        `}
                                    >
                                        <span className="z-10">{name}</span>
                                        {hasSubs && (
                                            <span className={`text-[8px] mt-1 ${isExpanded ? 'text-red-400' : 'text-gray-400'}`}>
                                                {isExpanded ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </button>

                                    {showPanelHere && (
                                        <div className="col-span-3 bg-gray-100 border-y border-gray-200 animate-slide-down">
                                            <div className="grid grid-cols-2 gap-px p-1">
                                                {(() => {
                                                    const catItem = items.find((i: any) => i.name === expandedCategory);
                                                    const subs = catItem?.subcategories || [];

                                                    if (subs.length === 0) return (
                                                        <div className="col-span-2 text-center py-2 text-gray-400 italic text-xs">No subcategories</div>
                                                    );

                                                    return subs.map((sub: string) => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => onSelect(`${expandedCategory}/${sub}`)}
                                                            className="bg-gray-50 hover:bg-white p-3 text-[10px] font-bold text-gray-600 hover:text-red-500 text-center uppercase tracking-wide transition-colors"
                                                        >
                                                            {sub}
                                                        </button>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
