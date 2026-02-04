"use client";
import React, { useState, useEffect } from 'react';
import { useSchoolData, Programme, FeeStructureItem, DocumentTemplate } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import SmartLevelInput from '@/components/SmartLevelInput';
import DocumentTemplateEditor from '@/components/DocumentTemplateEditor';
import PromotionStudio from '@/components/bursar/PromotionStudio';

export default function ProgrammeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { programmes, updateProgramme, services, students, updateStudent, documentTemplates, updateTemplate, batchUpdateData, billings, payments, bursaries } = useSchoolData();
    const [programme, setProgramme] = useState<Programme | null>(null);
    const [activeTab, setActiveTab] = useState<'fees' | 'docs' | 'promotion'>('fees');
    const [editorTemplate, setEditorTemplate] = useState<DocumentTemplate | null>(null);

    // --- DEFAULT TEMPLATES INJECTION ---
    useEffect(() => {
        if (programme && activeTab === 'docs') {
            const myTemplates = documentTemplates.filter(t => t.programmeId === programme.id);
            if (myTemplates.length === 0) {
                // Inject Defaults
                const admission: DocumentTemplate = {
                    id: crypto.randomUUID(),
                    name: 'Official Admission Letter',
                    type: 'ADMISSION_LETTER',
                    programmeId: programme.id,
                    updatedAt: new Date().toISOString(),
                    sections: [
                        { id: 'h1', type: 'header', order: 0, content: '<div style="text-align:center; padding-bottom: 20px; border-bottom: 2px solid #ccc;"><h1 style="margin:0; font-size: 24px;">VINE INTERNATIONAL INSTITUTE</h1><p style="margin:5px 0; color: #666;">Excellence in Health Science Education</p><p style="font-size:12px;">P.O. Box 123, Kampala, Uganda • Tel: +256 700 000000</p></div>', isEditable: true },
                        { id: 'b1', type: 'body', order: 1, content: '<p><strong>Date:</strong> {{current_date}}</p><p><strong>To:</strong> {{student_name}}</p><p><strong>Ref:</strong> Admission to {{programme_name}}</p><br/><p>Dear Student,</p><p>We are pleased to inform you that you have been successfully admitted to the <strong>{{programme_name}}</strong> programme at Vine International Institute for the Academic Year {{year}}.</p><p>This offer is subject to your acceptance and payment of the necessary commitment fees.</p>', isEditable: true },
                        { id: 't1', type: 'table', order: 2, content: 'Fees Structure breakdown will appear here automatically.', isEditable: false },
                        { id: 'f1', type: 'footer', order: 3, content: '<div style="margin-top: 40px;"><div style="float:right; text-align:center; width: 200px; border-top: 1px solid #000; padding-top: 10px;">Academic Registrar</div><p style="font-size: 10px; color: #999;">This document is computer generated.</p></div>', isEditable: true }
                    ]
                };

                const receipt: DocumentTemplate = {
                    id: crypto.randomUUID(),
                    name: 'Official Receipt',
                    type: 'RECEIPT',
                    programmeId: programme.id,
                    updatedAt: new Date().toISOString(),
                    sections: [
                        { id: 'h1', type: 'header', order: 0, content: '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px dashed #000; padding-bottom: 10px;"><div><h2 style="margin:0;">OFFICIAL RECEIPT</h2><p style="margin:0;">Vine International Institute</p></div><div style="text-align:right;"><h4>No. {{receipt_number}}</h4><p>Date: {{date}}</p></div></div>', isEditable: true },
                        { id: 'b1', type: 'body', order: 1, content: '<div style="margin: 20px 0;"><p><strong>Received From:</strong> {{student_name}}</p><p><strong>The Sum of:</strong> {{amount_words}}</p><p><strong>Being Payment For:</strong> {{payment_description}}</p></div>', isEditable: true },
                        { id: 'b2', type: 'body', order: 2, content: '<div style="background: #f0f0f0; padding: 15px; font-size: 18px; font-weight: bold; text-align: right; border: 1px solid #ccc;">AMOUNT: {{currency}} {{amount}}</div>', isEditable: true },
                        { id: 'f1', type: 'footer', order: 3, content: '<div style="margin-top: 30px; border-top: 1px dotted #000; padding-top: 5px; font-size: 11px;">Thank you for your payment. Balance: {{balance}}</div>', isEditable: true }
                    ]
                };

                updateTemplate(admission);
                updateTemplate(receipt);
            }
        }
    }, [programme, activeTab, documentTemplates, updateTemplate]); // Depend on activeTab to load on view logic if preferred, or just programme load. Use activeTab to avoid immediate unnecessary writes.

    // Fee Structure State
    const [availableLevels, setAvailableLevels] = useState<string[]>(['Year 1', 'Year 2', 'Year 3']);
    const [selectedLevel, setSelectedLevel] = useState<string>('Year 1');
    const [feeConfig, setFeeConfig] = useState<FeeStructureItem>({ level: 'Year 1', tuitionFee: 0, compulsoryServices: [], requirements: [] });

    const [addingLevel, setAddingLevel] = useState(false);
    const [newLevelName, setNewLevelName] = useState('');

    // Initial Load & Level Sync
    useEffect(() => {
        if (programmes.length > 0 && params.id) {
            const p = programmes.find(prog => prog.id === params.id);
            if (p) {
                setProgramme(p);

                // Use Persisted Levels or Fallback
                // Note: We avoid re-merging defaults every time to prevent "ghost" defaults appearing after rename.
                const levels = p.levels && p.levels.length > 0
                    ? p.levels
                    : ['Year 1', 'Year 2', 'Year 3'];

                setAvailableLevels(levels);

                // Sync Selected Level
                let currentLevel = selectedLevel;
                if (!levels.includes(currentLevel)) {
                    currentLevel = levels[0];
                    setSelectedLevel(currentLevel);
                }

                // Load Config for Current Level
                const existingConfig = p.feeStructure?.find(f => f.level === currentLevel);
                if (existingConfig) {
                    setFeeConfig(existingConfig);
                } else {
                    setFeeConfig({ level: currentLevel, tuitionFee: 0, compulsoryServices: [], requirements: [] });
                }
            } else {
                router.push('/bursar/fees');
            }
        }
    }, [programmes, params.id, router]);

    const [editingLevel, setEditingLevel] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const handleRenameLevel = (oldName: string, newName: string) => {
        // ... (existing logic)
        if (!newName.trim() || newName === oldName || !programme) {
            setEditingLevel(null);
            return;
        }

        // 1. Update availableLevels list
        const newLevels = availableLevels.map(l => l === oldName ? newName : l);
        setAvailableLevels(newLevels);

        // 2. Persist to Programme
        const updatedStructure = programme.feeStructure?.map(f =>
            f.level === oldName ? { ...f, level: newName } : f
        ) || [];

        const updatedProg: Programme = {
            ...programme,
            levels: newLevels,
            feeStructure: updatedStructure
        };

        updateProgramme(updatedProg);
        setProgramme(updatedProg);

        // 3. Update enrolled students (Fix for 0 students issue)
        const affectedStudents = students.filter(s => s.programme === programme.id && s.level === oldName);
        affectedStudents.forEach(s => {
            updateStudent({ ...s, level: newName });
        });

        // 4. Update current selection if needed
        if (selectedLevel === oldName) {
            setSelectedLevel(newName);
            setFeeConfig(prev => ({ ...prev, level: newName }));
        }

        setEditingLevel(null);
    };

    const handleMoveLevel = (index: number, direction: 'left' | 'right') => {
        if (!programme) return;
        const newLevels = [...availableLevels];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newLevels.length) return;

        // Swap
        [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];

        setAvailableLevels(newLevels);

        // Persist
        const updatedProg = { ...programme, levels: newLevels };
        updateProgramme(updatedProg);
        setProgramme(updatedProg);
    };

    const handleLevelChange = (level: string) => {
        setSelectedLevel(level);
        if (programme) {
            const existing = programme.feeStructure?.find(f => f.level === level);
            if (existing) {
                setFeeConfig(existing);
            } else {
                setFeeConfig({ level: level, tuitionFee: 0, compulsoryServices: [], requirements: [] });
            }
        }
    };

    const handleAddLevel = (committedName?: string) => {
        // Use the passed name (from SmartLevelInput) or fallback to state (if any)
        const nameToAdd = typeof committedName === 'string' ? committedName : newLevelName;

        if (!nameToAdd.trim() || !programme) return;

        if (!availableLevels.includes(nameToAdd)) {
            const newLevels = [...availableLevels, nameToAdd];
            setAvailableLevels(newLevels);

            // Persist immediately so it isn't lost on refresh
            const updatedProg = { ...programme, levels: newLevels };
            updateProgramme(updatedProg);
            setProgramme(updatedProg);

            handleLevelChange(nameToAdd); // Switch to new level
        }
        setNewLevelName('');
        setAddingLevel(false);
    };

    const [newReq, setNewReq] = useState({ name: '', quantity: 1 });
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allSuggestions, setAllSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (!students || !programmes) return;
        const set = new Set<string>();
        // 1. From Students
        students.forEach(s => s.physicalRequirements?.forEach(r => set.add(r.name)));
        // 2. From Programmes
        programmes.forEach(p => p.feeStructure?.forEach(fs => fs.requirements?.forEach(r => set.add(r.name))));


        setAllSuggestions(Array.from(set));
    }, [students, programmes]);

    useEffect(() => {
        if (newReq.name.trim()) {
            const matches = allSuggestions.filter(s => s.toLowerCase().includes(newReq.name.toLowerCase()) && !feeConfig.requirements?.find(r => r.name === s));
            setFilteredSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [newReq.name, allSuggestions, feeConfig.requirements]);

    const handleAddRequirement = () => {
        if (!newReq.name) return;

        // Strict Validation: Must be in dropdown
        if (!allSuggestions.some(s => s.toLowerCase() === newReq.name.toLowerCase())) {
            alert('Please select a valid physical requirement from the list.');
            return;
        }

        // Correct case if user typed it manually but valid
        const canonicalName = allSuggestions.find(s => s.toLowerCase() === newReq.name.toLowerCase()) || newReq.name;

        const finalReq = { ...newReq, name: canonicalName, quantity: Math.max(1, newReq.quantity) };

        setFeeConfig({
            ...feeConfig,
            requirements: [...(feeConfig.requirements || []), finalReq]
        });
        setNewReq({ name: '', quantity: 1 });
        setFilteredSuggestions([]);
    };

    const handleRemoveRequirement = (idx: number) => {
        const updated = [...(feeConfig.requirements || [])];
        updated.splice(idx, 1);
        setFeeConfig({ ...feeConfig, requirements: updated });
    };

    const handleSaveFeeStructure = (target: 'all' | 'new') => {
        if (!programme) return;

        // 1. Update Programme Data
        const currentStructure = programme.feeStructure || [];
        const otherLevels = currentStructure.filter(f => f.level !== feeConfig.level);
        const updatedStructure = [...otherLevels, feeConfig];
        const updatedProgramme = { ...programme, feeStructure: updatedStructure };

        updateProgramme(updatedProgramme);

        // FORCE PERSISTENCE (Backup)
        try {
            const newProgs = programmes.map(p => p.id === updatedProgramme.id ? updatedProgramme : p);
            localStorage.setItem('school_programmes_v1', JSON.stringify(newProgs));
        } catch (e) {
            console.error("Manual Save Failed:", e);
            alert("Warning: Could not save to disk. Storage might be full.");
        }

        if (target === 'all') {
            const affectedStudents = students.filter(s => s.programme === programme.id && s.level === feeConfig.level);

            const updatedStudents = affectedStudents.map(student => {
                // A. Update Services & Tuition
                const currentServices = new Set(student.services);
                feeConfig.compulsoryServices.forEach(sid => currentServices.add(sid));

                // B. Explicit Financial Balancing (Anti-Corruption)
                // New Total Fees = (New Tuition + Sum of New Compulsory Services)
                let newTotalFees = feeConfig.tuitionFee;
                Array.from(currentServices).forEach(sid => {
                    const svc = services.find(s => s.id === sid);
                    if (svc) newTotalFees += svc.cost;
                });

                // C. Requirement Pruning (Zombie Requirement Fix)
                const currentReqs = student.physicalRequirements || [];
                const configReqNames = new Set(feeConfig.requirements?.map(r => r.name) || []);

                // Keep requirements that are in config OR have brought > 0
                let prunedReqs = currentReqs.filter(r => {
                    const isInConfig = configReqNames.has(r.name);
                    const hasItems = (r.brought || 0) > 0;
                    return isInConfig || hasItems;
                }).map(r => {
                    const isInConfig = configReqNames.has(r.name);
                    if (!isInConfig) {
                        // Mark as Legacy if it was kept because of items
                        return { ...r, name: r.name.includes('(Legacy)') ? r.name : `${r.name} (Legacy)` };
                    }
                    // Update quantity from config
                    const cfg = feeConfig.requirements?.find(cr => cr.name === r.name);
                    return { ...r, required: cfg?.quantity || r.required };
                });

                // Add new requirements from config
                feeConfig.requirements?.forEach(cfgReq => {
                    if (!prunedReqs.find(r => r.name === cfgReq.name)) {
                        prunedReqs.push({
                            name: cfgReq.name,
                            required: cfgReq.quantity,
                            brought: 0,
                            color: '#3b82f6',
                            entries: []
                        });
                    }
                });

                // D. Explicit Calculation Engine
                // New Total Fees = (New Tuition + Sum of New Compulsory Services) - ALREADY CALCULATED AS newTotalFees

                // Payments & Credits = (All Ledger Payments + Current Bursary Value)
                const totalLedgerPayments = payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0);
                const bursaryVal = student.bursary && student.bursary !== 'none'
                    ? (bursaries.find(b => b.id === student.bursary)?.value || 0) : 0;
                const totalCredits = totalLedgerPayments + bursaryVal;

                // New Balance = (New Total Fees + Previous Term Arrears) - Payments & Credits
                // Important: Previous Term Arrears should exclude current term billings.
                // For this calculation, we look at the legacy previousBalance + anything billed in OTHER terms.
                const otherTermsBillings = billings.filter(b => b.studentId === student.id && b.term !== student.semester)
                    .reduce((sum, b) => sum + b.amount, 0);
                const arrears = (student.previousBalance || 0) + otherTermsBillings;

                const newBalance = (newTotalFees + arrears) - totalCredits;

                return {
                    ...student,
                    services: Array.from(currentServices),
                    totalFees: newTotalFees,
                    balance: newBalance,
                    physicalRequirements: prunedReqs
                };
            });

            // Use Atomic Batch Update
            batchUpdateData({
                students: updatedStudents,
                logAction: "Fee Update",
                logDetails: `Updated fees and balanced ${updatedStudents.length} students in ${feeConfig.level}`
            });

            alert(`Saved! Updated ${updatedStudents.length} students in ${feeConfig.level}.`);
        } else {
            alert('Saved! Future students enrolled in this level will inherit these fees & requirements.');
        }
    };

    // Debug Loading State
    if (!programme) {
        return (
            <div className="p-8 text-white">
                <h2 className="text-xl font-bold">Loading...</h2>
                <pre className="mt-4 p-4 bg-gray-800 rounded text-xs opacity-50">
                    DEBUG INFO:
                    ID: {params.id}
                    Programmes Loaded: {programmes.length}
                    Found: {programmes.find(p => p.id === params.id) ? 'Yes' : 'No'}
                </pre>
                <button
                    onClick={() => router.push('/bursar/fees')}
                    className="mt-4 px-4 py-2 bg-blue-600 rounded"
                >
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 animate-fade-in text-white min-h-screen">
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .tab-btn { padding: 1rem 2rem; background: none; border: none; color: #aaa; border-bottom: 2px solid transparent; cursor: pointer; font-size: 1rem; font-weight: 500; transition: all 0.2s; }
                .tab-btn:hover { color: white; }
                .tab-btn.active { color: white; border-bottom-color: #3b82f6; }
                
                .modern-card {
                    background: #1f2937;
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: transform 0.2s;
                }
                .modern-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }

                .input-modern {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 0.75rem 1rem;
                    color: white;
                    width: 100%;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .input-modern:focus { border-color: #3b82f6; }

                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                    transition: all 0.2s;
                }
                .btn-primary:hover { box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3); transform: translateY(-1px); }

                .btn-secondary {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #d1d5db;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px; /* Critical for horizontal scroll */
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .level-btn {
                    text-align: left;
                    padding: 0.5rem 0.75rem; 
                    font-size: 0.9rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                    display: inline-flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid transparent;
                    min-width: 80px;
                    gap: 8px;
                    position: relative;
                    group: hover; /* For showing edit icon */
                }
                .level-btn.active {
                    background: linear-gradient(to right, #2563eb, #1d4ed8);
                    color: white;
                    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
                }
                .level-btn.inactive {
                    background: rgba(255,255,255,0.03);
                    color: #9ca3af;
                    border-color: rgba(255,255,255,0.05);
                }
                .level-btn.inactive:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                }
                .activeRing {
                    position: relative;
                    z-index: 10;
                }
                .edit-icon {
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .level-btn:hover .edit-icon { opacity: 1; }
            `}</style>

            {/* Premium Back Button Style */}
            <style jsx>{`
                .premium-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 20px;
                    border-radius: 9999px;
                    background: linear-gradient(90deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.8));
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .premium-back-btn:hover {
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
                    transform: translateY(-1px);
                }
                .premium-back-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                }
                .premium-back-btn:hover .premium-back-icon {
                    background: #2563eb;
                    border-color: #3b82f6;
                    color: white;
                }
                .premium-text-label {
                    font-size: 10px;
                    color: #9ca3af;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    line-height: 1;
                    margin-bottom: 2px;
                }
                .premium-text-main {
                    font-size: 14px;
                    font-weight: 700;
                    color: #d1d5db;
                    letter-spacing: 0.01em;
                }
                .premium-back-btn:hover .premium-text-main {
                    color: white;
                }
                .premium-back-btn:hover .premium-text-label {
                    color: #bfdbfe;
                }

                /* Add Level Button Premium Style */
                .premium-add-btn {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(147, 51, 234, 0.1));
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    backdrop-filter: blur(8px);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                .premium-add-btn:hover {
                    background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(147, 51, 234, 0.2));
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
                    transform: translateY(-1px);
                }
                .premium-add-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: rgba(59, 130, 246, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #60a5fa;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .premium-add-btn:hover .premium-add-icon {
                    background: #3b82f6;
                    color: white;
                    transform: rotate(90deg);
                }
                .premium-add-text {
                    font-size: 13px;
                    font-weight: 700;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: color 0.3s ease;
                }
                .premium-add-btn:hover .premium-add-text {
                    color: white;
                }

                /* Premium Cards & Inputs */
                .premium-card {
                    background: rgba(31, 41, 55, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(16px);
                    transition: transform 0.3s ease, border-color 0.3s ease;
                }
                .premium-card:hover {
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }
                
                .premium-section-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    letter-spacing: 0.02em;
                }
                
                .premium-input-wrapper {
                    position: relative;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }
                .premium-input-wrapper:focus-within {
                    border-color: #3b82f6;
                    background: rgba(0, 0, 0, 0.3);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                
                .premium-list-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .premium-list-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.05);
                }
                .premium-list-item.selected {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.3);
                }
                
                /* Inline Action Inputs */
                .premium-input-simple {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 9999px;
                    color: white;
                    padding: 6px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.2s ease;
                }
                .premium-input-simple:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    background: rgba(0, 0, 0, 0.5);
                }
                
                .premium-action-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    border: 1px solid transparent;
                }
                .premium-action-btn.save {
                    background: rgba(37, 99, 235, 0.2);
                    color: #60a5fa;
                }
                .premium-action-btn.save:hover {
                    background: #2563eb;
                    color: white;
                }
                .premium-action-btn.cancel {
                    background: rgba(255, 255, 255, 0.05);
                    color: #9ca3af;
                }
                .premium-action-btn.cancel:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }
            `}</style>

            <div className="mb-8 pt-4">
                <button
                    onClick={() => router.push('/bursar/fees')}
                    className="premium-back-btn group"
                >
                    <div className="premium-back-icon">
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>←</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="premium-text-label">Navigation</span>
                        <span className="premium-text-main">Return to List</span>
                    </div>
                </button>
            </div>

            <div className="mb-8 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-white/5">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    {programme.name}
                    <span className="text-sm font-bold bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">{programme.code}</span>
                </h1>
                <p className="text-gray-400 flex items-center gap-4 text-sm mt-3">
                    <span className="flex items-center gap-1">🎓 {programme.type}</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span className="flex items-center gap-1">⏱️ {programme.duration}</span>
                </p>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-700 mb-8 sticky top-0 z-10 bg-[#111827] pt-2">
                <button onClick={() => setActiveTab('fees')} className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`}>Fees Structure</button>
                <button onClick={() => setActiveTab('promotion')} className={`tab-btn ${activeTab === 'promotion' ? 'active' : ''}`}>Promotion Studio</button>
                <button onClick={() => setActiveTab('docs')} className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}>Programme Documents</button>
            </div>

            {/* CONTENT */}
            {activeTab === 'fees' ? (
                <div className="flex flex-col gap-6">
                    {/* TOP: Level Selector (Horizontal Scroll) */}
                    <div className="bg-[#1f2937] border-b border-gray-700/50 p-4 -mx-8 mb-4 sticky top-[73px] z-20 shadow-xl backdrop-blur-md bg-opacity-95">
                        <div
                            className="px-8 custom-scrollbar no-scrollbar-desktop w-full pt-1"
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', overflowX: 'auto', paddingBottom: '3.5rem' }}
                        >
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap mr-2 border-r border-gray-700 pr-4">Select Level</span>

                            {availableLevels.map((lvl, index) => (
                                <div key={lvl} className={`relative flex-shrink-0 group/pill ${selectedLevel === lvl ? 'z-10' : 'z-0'}`}>
                                    {editingLevel === lvl ? (
                                        <div className="flex items-center bg-[#2d3748] rounded px-2 py-1">
                                            <input
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={() => handleRenameLevel(lvl, renameValue)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameLevel(lvl, renameValue);
                                                    if (e.key === 'Escape') setEditingLevel(null);
                                                }}
                                                className="bg-transparent border-none text-white text-sm outline-none w-32"
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <button
                                                onClick={() => handleLevelChange(lvl)}
                                                className={`
                                                    relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 border backdrop-blur-sm
                                                    ${selectedLevel === lvl
                                                        ? 'bg-blue-600/90 text-white border-blue-500 shadow-[0_4px_20px_-2px_rgba(59,130,246,0.6)]'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200 hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{lvl}</span>
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingLevel(lvl);
                                                            setRenameValue(lvl);
                                                        }}
                                                        className={`text-[10px] opacity-0 group-hover/pill:opacity-100 hover:text-blue-300 transition-opacity p-1 rounded hover:bg-white/10 ${selectedLevel === lvl ? 'text-blue-200' : 'text-gray-500'}`}
                                                        title="Rename Level"
                                                    >
                                                        ✏️
                                                    </span>
                                                </div>
                                                {programme.feeStructure?.find(f => f.level === lvl) && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] absolute top-2 right-2"></span>
                                                )}
                                            </button>

                                            {/* Reorder Arrows (Visible on Hover of Pill) */}
                                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity bg-black/80 rounded-full px-2 py-1 pointer-events-none group-hover/pill:pointer-events-auto z-20">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMoveLevel(index, 'left'); }}
                                                    className={`text-gray-400 hover:text-white text-xs px-1 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    disabled={index === 0}
                                                >
                                                    ←
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMoveLevel(index, 'right'); }}
                                                    className={`text-gray-400 hover:text-white text-xs px-1 ${index === availableLevels.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    disabled={index === availableLevels.length - 1}
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add Level Button - Stylish Pill */}
                            <div className="flex-shrink-0 ml-4 pl-4 border-l border-gray-700/50 h-8 flex items-center">
                                {!addingLevel ? (
                                    <button
                                        onClick={() => setAddingLevel(true)}
                                        className="premium-add-btn group"
                                    >
                                        <div className="premium-add-icon">
                                            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
                                        </div>
                                        <span className="premium-add-text">Add Level</span>
                                    </button>
                                ) : (
                                    <SmartLevelInput
                                        onCommit={handleAddLevel}
                                        onCancel={() => setAddingLevel(false)}
                                        existingLevels={availableLevels}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MAIN EDITOR FULL WIDTH */}
                    <div className="max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
                        <div className="flex justify-between items-end mb-2 px-1">
                            <h2 className="text-2xl font-bold">
                                {selectedLevel} <span className="text-gray-500 font-normal">Configuration</span>
                            </h2>
                            <span className={`text-xs px-3 py-1 rounded-full border ${programme.feeStructure?.find(f => f.level === selectedLevel) ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-gray-600 text-gray-500'}`}>
                                {programme.feeStructure?.find(f => f.level === selectedLevel) ? '• Configured' : '• Pending Setup'}
                            </span>
                        </div>

                        {/* 1. Tuition */}
                        <div className="premium-card relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-500"></div>

                            <h3 className="premium-section-title text-blue-200">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">💰</span>
                                Tuition Fees
                            </h3>

                            <div className="premium-input-wrapper p-4 flex items-center">
                                <span className="text-gray-400 font-medium mr-4 border-r border-gray-700 pr-4">UGX</span>
                                <input
                                    type="number"
                                    style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', width: '100%', fontSize: '1.875rem', fontWeight: 'bold' }}
                                    value={feeConfig.tuitionFee || ''}
                                    placeholder="0"
                                    onChange={e => setFeeConfig({ ...feeConfig, tuitionFee: Number(e.target.value) })}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 pl-1">Enter the base tuition fee for this level per term/semester.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 2. Services */}
                            <div className="premium-card">
                                <h3 className="premium-section-title text-purple-200">
                                    <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">🚌</span>
                                    Compulsory Services
                                </h3>

                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    {services.map(svc => (
                                        <div
                                            key={svc.id}
                                            onClick={() => {
                                                if (feeConfig.compulsoryServices.includes(svc.id)) {
                                                    setFeeConfig({ ...feeConfig, compulsoryServices: feeConfig.compulsoryServices.filter(id => id !== svc.id) });
                                                } else {
                                                    setFeeConfig({ ...feeConfig, compulsoryServices: [...feeConfig.compulsoryServices, svc.id] });
                                                }
                                            }}
                                            className={`premium-list-item group ${feeConfig.compulsoryServices.includes(svc.id) ? 'selected' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${feeConfig.compulsoryServices.includes(svc.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-600 group-hover:border-gray-500'}`}>
                                                    {feeConfig.compulsoryServices.includes(svc.id) && <span className="text-xs text-white">✓</span>}
                                                </div>
                                                <div>
                                                    <div className={`font-medium transition-colors ${feeConfig.compulsoryServices.includes(svc.id) ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{svc.name}</div>
                                                    <div className="text-xs text-gray-500">UGX {svc.cost.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Requirements */}
                            <div className="premium-card">
                                <h3 className="premium-section-title text-orange-200">
                                    <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400">📦</span>
                                    Physical Requirements
                                </h3>

                                {/* Add New */}
                                {/* Add New */}
                                {/* Add New Requirement UI */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'relative', zIndex: 50 }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {/* Name Input */}
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input
                                                    style={{
                                                        background: 'rgba(0,0,0,0.3)',
                                                        color: 'white',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '12px',
                                                        outline: 'none',
                                                        width: '100%',
                                                        fontSize: '0.9rem',
                                                        padding: '10px 16px'
                                                    }}
                                                    placeholder="Select Item..."
                                                    value={newReq.name}
                                                    onChange={e => setNewReq({ ...newReq, name: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddRequirement();
                                                        if (e.key === 'Escape') setShowSuggestions(false);
                                                    }}
                                                    onFocus={() => {
                                                        if (newReq.name) setShowSuggestions(true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                />

                                                {/* Autocomplete Dropdown */}
                                                {/* Autocomplete Dropdown */}
                                                {showSuggestions && newReq.name && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '4px',
                                                        background: '#1f2937', border: '1px solid #374151', borderRadius: '8px',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                        overflow: 'hidden', zIndex: 50, maxHeight: '12rem', overflowY: 'auto'
                                                    }}>
                                                        {filteredSuggestions.length > 0 ? (
                                                            filteredSuggestions.map((suggestion, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.875rem', color: '#e5e7eb', borderBottom: '1px solid #1f2937' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault(); // Prevent blur
                                                                        setNewReq({ ...newReq, name: suggestion });
                                                                        setShowSuggestions(false);
                                                                    }}
                                                                >
                                                                    {suggestion}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div style={{ padding: '8px 16px', fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                                No matching items found.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Step Quantity */}
                                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0 4px' }}>
                                                <button
                                                    onClick={() => setNewReq(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                                                    style={{ width: '2rem', height: '100%', color: '#9ca3af', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                                >
                                                    -
                                                </button>
                                                <span style={{ width: '2rem', textAlign: 'center', color: 'white', fontWeight: 'bold' }}>{newReq.quantity}</span>
                                                <button
                                                    onClick={() => setNewReq(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                                                    style={{ width: '2rem', height: '100%', color: '#9ca3af', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Add Button */}
                                        <button
                                            onClick={handleAddRequirement}
                                            style={{
                                                width: '100%', marginTop: '0.75rem',
                                                background: 'rgba(37,99,235,0.8)',
                                                color: 'white',
                                                padding: '0.75rem',
                                                borderRadius: '12px',
                                                fontWeight: '500',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                cursor: 'pointer', border: 'none',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37,99,235,1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(37,99,235,0.8)'}
                                        >
                                            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span> Add Requirement
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '16rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {(feeConfig.requirements || []).map((req, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                                    📦
                                                </div>
                                                <span style={{ color: '#e5e7eb', fontWeight: '500' }}>{req.name}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                    Qty: {req.quantity}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveRequirement(idx)}
                                                    style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!feeConfig.requirements || feeConfig.requirements.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.5 }}>
                                            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>No requirements added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary & Save */}
                        <div className="modern-card bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="text-sm uppercase text-blue-400 font-bold tracking-wider">Estimated Total per Student</h4>
                                    <p className="text-xs text-gray-500 mt-1">Tuition + {feeConfig.compulsoryServices.length} Services</p>
                                </div>
                                <span className="text-4xl font-bold text-white tracking-tight">
                                    <span className="text-lg text-gray-500 font-normal mr-1">UGX</span>
                                    {(feeConfig.tuitionFee + services.filter(s => feeConfig.compulsoryServices.includes(s.id)).reduce((a, b) => a + b.cost, 0)).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button className="btn-primary" onClick={() => handleSaveFeeStructure('new')}>
                                    Save (New Students)
                                </button>
                                <button className="btn-secondary" onClick={() => handleSaveFeeStructure('all')}>
                                    Save & Update Existing Students
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'promotion' ? (
                <PromotionStudio programme={programme} />
            ) : (
                <div className="max-w-6xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold">Programme Documents</h2>
                            <p className="text-gray-400">Manage admission letters, receipts, and forms.</p>
                        </div>
                        <button
                            className="btn-primary flex items-center gap-2"
                            onClick={() => {
                                const newTemplate: DocumentTemplate = {
                                    id: crypto.randomUUID(),
                                    name: 'Untitled Template',
                                    type: 'OTHER',
                                    sections: [
                                        { id: '1', type: 'body', order: 0, content: '<h1>New Document</h1><p>Start editing...</p>', isEditable: true }
                                    ],
                                    updatedAt: new Date().toISOString(),
                                    programmeId: programme.id // Link to this programme
                                };
                                updateTemplate(newTemplate);
                                setEditorTemplate(newTemplate);
                            }}
                        >
                            <span>+</span> New Template
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documentTemplates.filter(t => t.programmeId === programme.id).map(tmpl => (
                            <div key={tmpl.id} className="premium-card group cursor-pointer hover:border-blue-500/50" onClick={() => setEditorTemplate(tmpl)}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl">
                                        {tmpl.type === 'RECEIPT' ? '🧾' : tmpl.type === 'ADMISSION_LETTER' ? '🎓' : '📄'}
                                    </div>
                                    <span className="text-xs font-mono text-gray-500">{tmpl.type}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{tmpl.name}</h3>
                                <p className="text-xs text-gray-500">Last updated: {new Date(tmpl.updatedAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                        {documentTemplates.filter(t => t.programmeId === programme.id).length === 0 && (
                            <div className="col-span-full text-center py-12 opacity-50">
                                <p>No documents configured for this programme yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Editor Modal */}
                    {editorTemplate && (
                        <DocumentTemplateEditor
                            template={editorTemplate}
                            onSave={(updated) => {
                                updateTemplate(updated);
                                setEditorTemplate(null);
                            }}
                            onCancel={() => setEditorTemplate(null)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
