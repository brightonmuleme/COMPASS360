"use client";
import React from 'react';

interface ProgressBarProps {
    value: number; // Current value (e.g. Spent)
    max: number;   // Max value (e.g. Budget)
    color?: string; // Color of the progress bar
    height?: number;
    showLabel?: boolean;
    className?: string;
}

export default function ProgressBar({ value, max, color = '', height = 8, showLabel = false, className = '' }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
    const width = `${percentage}%`;

    // Premium Smooth Gradient
    const barClass = color || "bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/20";

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{Math.round(percentage)}%</span>
                </div>
            )}
            {/* Track: Subtle & Fully Rounded */}
            <div className={`w-full rounded-full overflow-hidden ${className || 'bg-slate-100'}`} style={{ height }}>
                <div
                    className={`h-full rounded-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${barClass}`}
                    style={{ width }}
                />
            </div>
        </div>
    );
}
