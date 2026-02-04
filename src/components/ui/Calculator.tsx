"use client";
import React from 'react';

interface CalculatorProps {
    onOk: (value: number) => void;
    onClose: () => void;
    initialValue?: number;
}

export default function Calculator({ onOk, onClose, initialValue = 0 }: CalculatorProps) {
    const [display, setDisplay] = React.useState(initialValue > 0 ? initialValue.toString() : '0');

    // Simple state to separate "previous value" and "operator" for basic calculation
    const [prevVal, setPrevVal] = React.useState<string | null>(null);
    const [operator, setOperator] = React.useState<string | null>(null);
    const [newNumberStarted, setNewNumberStarted] = React.useState(false);

    const handlePress = (val: string) => {
        if (display === '0' && val !== '.') {
            setDisplay(val);
        } else if (newNumberStarted) {
            setDisplay(val);
            setNewNumberStarted(false);
        } else {
            setDisplay(prev => prev + val);
        }
    };

    const handleBackspace = () => {
        if (display.length === 1) setDisplay('0');
        else setDisplay(prev => prev.slice(0, -1));
    };

    const handleOperator = (op: string) => {
        // If we have a pending operation, calculate it first
        if (operator && prevVal && !newNumberStarted) {
            const result = calculate(Number(prevVal), Number(display), operator);
            setDisplay(String(result));
            setPrevVal(String(result));
        } else {
            setPrevVal(display);
        }
        setOperator(op);
        setNewNumberStarted(true);
    };

    const handleEqual = () => {
        if (operator && prevVal) {
            const result = calculate(Number(prevVal), Number(display), operator);
            setDisplay(String(result));
            setPrevVal(null);
            setOperator(null);
            setNewNumberStarted(true);
        }
    };

    const calculate = (a: number, b: number, op: string) => {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
            default: return b;
        }
    };

    // Keyboard Support
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key;

            // Numbers & Decimal
            if (/^[0-9.]$/.test(key)) {
                e.preventDefault();
                handlePress(key);
            }
            // Operators
            else if (['+', '-', '*', '/'].includes(key)) {
                e.preventDefault();
                handleOperator(key);
            }
            // Actions
            else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                handleEqual();
                // If it's Enter, also trigger OK if no operator pending? 
                // Standard calc behavior: Enter = Equal. 
                // But user might want "Enter" to submit form (OK).
                // Let's stick to Equal for now, or check generic calc behavior.
                // Actually, if just a number is there, Enter might mean OK.
                // Let's stick to Equal as primary calc function.
            }
            else if (key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            }
            else if (key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, operator, prevVal, newNumberStarted]); // Deps needed so closures capture latest state

    return (
        <div className="bg-slate-900 text-white rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden w-full max-w-sm mx-auto flex flex-col border border-slate-700">
            {/* Header/Display */}
            <div className="bg-slate-950 text-white p-4 border-b border-slate-800">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-gray-400">Amount</span>
                    <div className="flex gap-4">
                        <button className="text-gray-500 hover:text-white transition-colors">🌐</button>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
                    </div>
                </div>

                {/* Display */}
                <div className="flex flex-col justify-end items-end py-4 min-h-[100px] px-4">
                    {/* Pending Operation Display */}
                    {prevVal && operator && (
                        <div className="text-slate-400 text-lg mb-1 font-medium">
                            {Number(prevVal).toLocaleString()} {operator}
                        </div>
                    )}

                    {/* Main Display */}
                    <div className="text-4xl font-bold text-white break-all">
                        {(() => {
                            if (display === 'NaN' || display === 'Infinity') return 'Error';
                            if (display === '-') return '-';
                            if (display === '') return '0';

                            const parts = display.split('.');
                            const formattedInt = Number(parts[0]).toLocaleString();
                            return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
                        })()}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 bg-slate-700 gap-px">
                {/* Row 1: Operators */}
                <button onClick={() => handleOperator('+')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-blue-400 flex items-center justify-center transition-colors">+</button>
                <button onClick={() => handleOperator('-')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-blue-400 flex items-center justify-center transition-colors">-</button>
                <button onClick={() => handleOperator('*')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-blue-400 flex items-center justify-center transition-colors">×</button>
                <button onClick={() => handleOperator('/')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-blue-400 flex items-center justify-center transition-colors">÷</button>

                {/* Row 2 */}
                <button onClick={() => handlePress('7')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">7</button>
                <button onClick={() => handlePress('8')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">8</button>
                <button onClick={() => handlePress('9')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">9</button>
                <button onClick={handleEqual} className="bg-blue-900/50 py-6 font-bold text-xl hover:bg-blue-900/80 text-blue-400 flex items-center justify-center transition-colors">=</button>

                {/* Row 3 */}
                <button onClick={() => handlePress('4')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">4</button>
                <button onClick={() => handlePress('5')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">5</button>
                <button onClick={() => handlePress('6')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">6</button>
                <button onClick={() => handlePress('.')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white pb-8 transition-colors">.</button>

                {/* Row 4 */}
                <button onClick={() => handlePress('1')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">1</button>
                <button onClick={() => handlePress('2')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">2</button>
                <button onClick={() => handlePress('3')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-white transition-colors">3</button>
                <button onClick={handleBackspace} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 text-red-400 flex items-center justify-center transition-colors">⌫</button>

                {/* Row 5: 0, OK */}
                <button onClick={() => handlePress('0')} className="bg-slate-800 py-6 font-bold text-xl hover:bg-slate-700 col-span-2 text-white transition-colors">0</button>
                <button onClick={() => {
                    let finalValue = Number(display);
                    if (operator && prevVal) {
                        finalValue = calculate(Number(prevVal), Number(display), operator);
                    }
                    onOk(finalValue);
                }} className="col-span-2 bg-orange-600 py-6 font-bold text-white text-xl hover:bg-orange-700 flex items-center justify-center transition-colors shadow-inner">OK</button>
            </div>
        </div>
    );
}
