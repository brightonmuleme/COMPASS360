import React, { useState, useEffect, useRef } from 'react';
import { parseLevelString, ParsedLevel } from '@/lib/levelParser';

interface SmartLevelInputProps {
    onCommit: (canonicalLabel: string) => void;
    onCancel: () => void;
    existingLevels?: string[];
    initialValue?: string;
}

export default function SmartLevelInput({ onCommit, onCancel, existingLevels = [], initialValue = '' }: SmartLevelInputProps) {
    const [input, setInput] = useState(initialValue);
    const [parsed, setParsed] = useState<ParsedLevel | null>(null);
    const [shake, setShake] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!input.trim()) {
            setParsed(null);
            return;
        }
        const result = parseLevelString(input);
        setParsed(result);
    }, [input]);

    const isDuplicate = parsed?.isValid && existingLevels.includes(parsed.canonicalLabel);

    const handleCommit = () => {
        if (parsed && parsed.isValid && !isDuplicate) {
            onCommit(parsed.canonicalLabel);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCommit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 50 }} className={shake ? 'animate-shake' : ''}>

            {/* Input Container */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '4px 4px 4px 12px',
                borderRadius: '9999px',
                border: parsed?.isValid ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: parsed?.isValid ? '0 0 15px rgba(34, 197, 94, 0.2)' : '0 4px 6px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s ease'
            }}>
                <span style={{
                    color: '#9ca3af',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap'
                }}>
                    {parsed?.levelType || 'LEVEL'}
                </span>

                <input
                    ref={inputRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. yr 2 sem 1"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '140px',
                        minWidth: '100px'
                    }}
                    spellCheck={false}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Confirm Button */}
                    {parsed?.isValid && (
                        <button
                            onClick={handleCommit}
                            disabled={!!isDuplicate}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: isDuplicate ? 'not-allowed' : 'pointer',
                                background: isDuplicate ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                color: isDuplicate ? '#eab308' : '#4ade80',
                                transition: 'all 0.2s'
                            }}
                            title={isDuplicate ? "Level already exists" : "Add Level"}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                        </button>
                    )}

                    <button
                        onClick={onCancel}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Cancel"
                    >
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>×</span>
                    </button>
                </div>
            </div>

            {/* Smart Preview Badge */}
            {parsed?.isValid && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '8px',
                    zIndex: 60,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600' }}>INTERPRETED:</span>
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid rgba(34, 197, 94, 0.5)' }}>
                            {parsed.canonicalLabel}
                        </span>
                        {isDuplicate && (
                            <span style={{ color: '#eab308', fontSize: '11px', fontWeight: 'bold', marginLeft: '4px' }}>(Exists)</span>
                        )}
                    </div>
                </div>
            )}

            {/* Suggestions / Hints */}
            {!input && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '8px',
                    zIndex: 40,
                    width: '300px',
                    background: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.4)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}>Quick Suggestions</div>

                    <div className="space-y-3">
                        {/* Primary */}
                        <div>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Primary</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                    <button
                                        key={`p${n}`}
                                        onClick={() => onCommit(`Primary ${n}`)}
                                        style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer' }}
                                    >P{n}</button>
                                ))}
                            </div>
                        </div>

                        {/* Secondary/Senior */}
                        <div>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Secondary</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                    <button
                                        key={`s${n}`}
                                        onClick={() => onCommit(`Senior ${n}`)}
                                        style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)', cursor: 'pointer' }}
                                    >S{n}</button>
                                ))}
                            </div>
                        </div>

                        {/* Retakers */}
                        <div>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Special</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                <button onClick={() => onCommit('Retakers 1')} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}>Retakers</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </div>
    );
}
