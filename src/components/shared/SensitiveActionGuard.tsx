"use client";
import React, { useState } from 'react';
import { useSchoolData } from '@/lib/store';

interface SensitiveActionGuardProps {
    onSuccess: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
}

export function SensitiveActionGuard({ onSuccess, onCancel, title = "Sensitive Action Verification", description = "Please enter your Transaction PIN or Account Password to proceed." }: SensitiveActionGuardProps) {
    const { verifySensitiveAction } = useSchoolData();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (verifySensitiveAction(pin)) {
            onSuccess();
        } else {
            setError(true);
            setPin('');
        }
    };

    return (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1f2937] border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            autoFocus
                            type="password"
                            placeholder="Enter PIN or Password"
                            className={`w-full bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-700'} text-white text-center text-xl tracking-widest rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all`}
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError(false);
                            }}
                        />
                        {error && (
                            <p className="text-red-500 text-xs text-center mt-2 font-bold animate-shake">Invalid credentials. Please try again.</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl font-bold transition-all uppercase tracking-wider text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 uppercase tracking-wider text-xs"
                        >
                            Verify & Proceed
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Helper hook for functional usage
export function useSensitiveAction() {
    const [isGuarded, setIsGuarded] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const runGuardedAction = (action: () => void) => {
        setPendingAction(() => action);
        setIsGuarded(true);
    };

    const GuardComponent = isGuarded ? (
        <SensitiveActionGuard
            onSuccess={() => {
                pendingAction?.();
                setIsGuarded(false);
                setPendingAction(null);
            }}
            onCancel={() => {
                setIsGuarded(false);
                setPendingAction(null);
            }}
        />
    ) : null;

    return { runGuardedAction, GuardComponent };
}
