"use client";
import React, { useState, useEffect, useRef } from 'react';
import { DocumentTemplate, DocumentSection } from '@/lib/store';

interface EditorProps {
    template: DocumentTemplate;
    onSave: (template: DocumentTemplate) => void;
    onCancel: () => void;
}

// Aligned with placeholders used in PaymentModesPage and AdmissionsPage
const DYNAMIC_FIELDS = [
    { category: 'Institution', fields: ['{{institution_name}}', '{{institution_address}}', '{{institution_email}}', '{{institution_contact}}', '{{programme_logo}}'] },
    { category: 'Student', fields: ['{{student_name}}', '{{student_code}}', '{{programme_name}}', '{{current_level}}', '{{pay_code}}', '{{clearance_percentage}}'] },
    { category: 'Receipt / Finance', fields: ['{{receipt_number}}', '{{transaction_id}}', '{{date}}', '{{payment_particulars}}', '{{payment_description}}', '{{payment_method}}', '{{amount}}', '{{amount_words}}', '{{currency}}', '{{balance}}'] },
    { category: 'Admission', fields: ['{{reporting_date}}', '{{admission_date}}', '{{year}}'] },
    { category: 'System', fields: ['{{current_date}}', '{{bursar_name}}', '{{user_name}}'] },
];

const RichTextToolbar = ({ onCommand }: { onCommand: (cmd: string, val?: string) => void }) => {
    return (
        <div className="flex flex-wrap gap-1 p-1 bg-gray-50 border-b border-gray-200 rounded-t-lg items-center">
            <button onClick={() => onCommand('bold')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold" title="Bold">B</button>
            <button onClick={() => onCommand('italic')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic" title="Italic">I</button>
            <button onClick={() => onCommand('underline')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 underline" title="Underline">U</button>
            <div className="w-px bg-gray-300 mx-1 h-6 self-center" />
            <button onClick={() => onCommand('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Bullet List">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16M8 6h.01M8 12h.01M8 18h.01" /></svg>
            </button>
            <button onClick={() => onCommand('insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Numbered List">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h12M7 13h12M7 19h12M4 7h.01M4 13h.01M4 19h.01" /></svg>
            </button>
            <div className="w-px bg-gray-300 mx-1 h-6 self-center" />
            <button onClick={() => onCommand('justifyLeft')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Align Left">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16" /></svg>
            </button>
            <button onClick={() => onCommand('justifyCenter')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Align Center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M4 18h16" /></svg>
            </button>
            <button onClick={() => onCommand('justifyRight')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Align Right">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M4 18h16" /></svg>
            </button>
            <div className="w-px bg-gray-300 mx-1 h-6 self-center" />
            <div className="flex items-center gap-1">
                <input
                    type="color"
                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                    title="Text Color"
                    onChange={(e) => onCommand('foreColor', e.target.value)}
                />
            </div>
            <div className="w-px bg-gray-300 mx-1 h-6 self-center" />
            <button onClick={() => onCommand('formatBlock', 'H1')} className="px-2 py-1 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm" title="Heading 1">H1</button>
            <button onClick={() => onCommand('formatBlock', 'H2')} className="px-2 py-1 hover:bg-gray-200 rounded text-gray-700 font-bold text-xs" title="Heading 2">H2</button>
            <button onClick={() => onCommand('formatBlock', 'P')} className="px-2 py-1 hover:bg-gray-200 rounded text-gray-700 text-xs" title="Paragraph">P</button>
            <div className="w-px bg-gray-300 mx-1 h-6 self-center" />
            <button onClick={() => onCommand('insertHorizontalRule')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Horizontal Line">
                <span className="font-bold text-xs">HR</span>
            </button>
        </div>
    );
};

export default function DocumentTemplateEditor({ template, onSave, onCancel }: EditorProps) {
    const [sections, setSections] = useState<DocumentSection[]>(template.sections);
    const [templateName, setTemplateName] = useState(template.name);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [logo, setLogo] = useState<string>('');

    // For syncing contentEditable
    const editorRef = useRef<HTMLDivElement>(null);
    const prevActiveSection = useRef<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageKey = `logo_${template.id}`;
            const specificLogo = localStorage.getItem(storageKey);
            const globalLogo = localStorage.getItem('school_logo');

            console.log(`[DocumentTemplateEditor] Loading logo for ${template.id}. Specific found: ${!!specificLogo}, Global found: ${!!globalLogo}`);

            if (specificLogo) {
                setLogo(specificLogo);
            } else if (globalLogo) {
                setLogo(globalLogo);
            }
        }

        // AUTO-FIX: Inject {{programme_logo}} into header if missing
        setSections(prev => prev.map(s => {
            if (s.type === 'header' && !s.content.includes('{{programme_logo}}') && !s.content.includes('{{institution_logo}}')) {
                const newContent = s.content.replace(/(<h[1-6]>)/i, '{{programme_logo}}$1');
                return {
                    ...s,
                    content: newContent !== s.content ? newContent : `{{programme_logo}}${s.content}`
                };
            }
            return s;
        }));
    }, [template.id]);

    // Update editor content ONLY when active section changes to a NEW section
    useEffect(() => {
        if (activeSection !== prevActiveSection.current) {
            if (activeSection && editorRef.current) {
                const section = sections.find(s => s.id === activeSection);
                if (section && section.isEditable) {
                    editorRef.current.innerHTML = section.content;
                }
            }
            prevActiveSection.current = activeSection;
        }
    }, [activeSection, sections]);
    // Note: Depends on sections, but we only want to set HTML when SWITCHING sections, not when editing.
    // The onInput handler updates state. This effect should only run if activeSection ID changes.
    // We'll refine this logic.

    const handleContentChange = (id: string, newContent: string) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
    };

    // Exec command for Rich Text
    const execCmd = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current && activeSection) {
            handleContentChange(activeSection, editorRef.current.innerHTML);
        }
    };

    const handleSave = () => {
        onSave({ ...template, name: templateName, sections, updatedAt: new Date().toISOString() });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const storageKey = `logo_${template.id}`;

                try {
                    // 1. Update State
                    setLogo(base64);

                    // 2. Save to LocalStorage
                    localStorage.setItem(storageKey, base64);

                    // 3. Verify Persistence
                    const saved = localStorage.getItem(storageKey);
                    if (saved !== base64) {
                        throw new Error("Verification failed: Saved logo does not match.");
                    }
                    console.log(`[DocumentTemplateEditor] Logo saved successfully for template ${template.id} (${base64.length} chars)`);
                } catch (err: any) {
                    console.error("[DocumentTemplateEditor] Failed to save logo:", err);
                    alert("Failed to save logo! Storage might be full.\n\nError: " + (err.message || err));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newSections = [...sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }
        setSections(newSections);
    };

    // Mock resolve for preview
    const resolveContent = (content: string) => {
        let resolved = content;
        // Basic placeholder if no logo
        const logoHtml = logo
            ? `<img src="${logo}" style="max-height: 80px; width: auto; display: block; margin: 0 auto 10px auto;" alt="Institution Logo" />`
            : '';

        const MOCK_DATA: Record<string, string> = {
            '{{institution_name}}': 'VINE International School',
            '{{institution_address}}': 'P.O. Box 123, Kampala',
            '{{institution_contact}}': '+256 700 000 000',
            '{{institution_email}}': 'info@vineoschool.com',
            '{{programme_logo}}': logoHtml,
            '{{institution_logo}}': logoHtml,
            '{{student_name}}': 'John Doe',
            '{{student_code}}': 'STU-001',
            '{{pay_code}}': '99001122',
            '{{receipt_number}}': 'RCP-2024-001',
            '{{payment_description}}': 'Tuition Fees Payment',
            '{{amount}}': '500,000',
            '{{currency}}': 'UGX',
            '{{amount_words}}': 'Five Hundred Thousand Shillings Only',
            '{{balance}}': 'UGX 100,000',
            '{{date}}': new Date().toLocaleDateString(),
            '{{current_date}}': new Date().toLocaleDateString(),
            '{{admission_date}}': '01/02/2024',
            '{{reporting_date}}': '15/02/2024',
            '{{programme_name}}': 'Bachelor of Medicine',
            '{{year}}': '2024',
            '{{current_level}}': 'Year 1',
            '{{bursar_name}}': 'Jane Smith',
            '{{user_name}}': 'Admin User'
        };

        Object.entries(MOCK_DATA).forEach(([key, val]) => {
            resolved = resolved.replace(new RegExp(key, 'g'), val);
        });
        return resolved;
    };

    const [showSidebar, setShowSidebar] = useState(true);

    // Auto-hide sidebar on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setShowSidebar(false);
        }
    }, [template.id]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
            <div className="bg-gray-900 w-full max-w-7xl h-full md:max-h-[90vh] rounded-none md:rounded-2xl flex flex-col lg:flex-row border border-gray-800 overflow-hidden shadow-2xl animate-fade-in ring-1 ring-white/10 relative">

                {/* MOBILE HEADER TOGGLE */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 z-50">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{template.type}</span>
                        <h2 className="text-sm font-bold text-white truncate max-w-[200px]">{templateName}</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-2 bg-gray-800 rounded-lg text-white"
                        >
                            {showSidebar ? '👁️ View Canvas' : '⚙️ Editor Tools'}
                        </button>
                    </div>
                </div>

                {/* SIDEBAR - Controls */}
                <div className={`
                    ${showSidebar ? 'flex' : 'hidden lg:flex'}
                    w-full lg:w-80 bg-gray-900/95 border-r border-gray-800 flex-col gap-6 overflow-y-auto
                    absolute inset-0 top-[60px] lg:relative lg:top-0 z-40
                `}>
                    {/* Header Section (Hidden on mobile as it's in the mobile header) */}
                    <div className="hidden lg:block p-6 border-b border-gray-800 bg-gray-800/20">
                        <label className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="bg-transparent text-2xl font-bold text-white tracking-tight w-full border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:ring-0 px-0 py-1 transition-all focus:outline-none placeholder-gray-600"
                            placeholder="Untitled Template"
                        />
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type:</span>
                            <span className="text-[10px] font-mono text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-800/50">{template.type}</span>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="p-6 border-b border-gray-800 bg-gray-800/20">
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            Programme Logo
                        </label>
                        <div className="flex items-center gap-4">
                            {logo ? (
                                <img src={logo} alt="School Logo" className="w-12 h-12 object-contain bg-white rounded p-1 border border-gray-700" />
                            ) : (
                                <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center text-gray-600 text-[10px] border border-gray-700 border-dashed">No Logo</div>
                            )}
                            <label className="flex-1 cursor-pointer touch-target">
                                <span className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-center text-xs text-gray-300 transition-colors">
                                    {logo ? 'Change' : 'Upload'}
                                </span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="px-6 flex flex-col gap-2">
                        <div className="flex gap-1 p-1 bg-gray-800 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setPreviewMode(false)}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!previewMode ? 'bg-[#2563eb] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => { setPreviewMode(true); if (window.innerWidth < 1024) setShowSidebar(false); }}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${previewMode ? 'bg-[#16a34a] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>

                    {!previewMode && (
                        <div className="px-6 space-y-6 pb-6 lg:pb-0">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Dynamic Fields</h3>
                                <div className="space-y-5">
                                    {DYNAMIC_FIELDS.map(cat => (
                                        <div key={cat.category}>
                                            <h4 className="text-xs text-gray-400 mb-2 font-medium flex items-center gap-2">
                                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                {cat.category}
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {cat.fields.map(field => (
                                                    <button
                                                        key={field}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(field);
                                                            if (activeSection && editorRef.current) {
                                                                document.execCommand('insertText', false, field);
                                                            }
                                                            if (window.innerWidth < 1024) setShowSidebar(false);
                                                        }}
                                                        className="px-2.5 py-1.5 text-[11px] font-mono bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition-all cursor-copy active:scale-95 touch-target"
                                                        title="Click to Copy (or Insert if Active)"
                                                    >
                                                        {field}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto flex flex-col gap-3 p-6 border-t border-gray-800 bg-gray-900 sticky bottom-0">
                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
                        >
                            <span>💾</span> Save
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800/50 rounded-xl transition-all active:scale-[0.98] touch-target"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* MAIN - A4 Canvas */}
                <div className="flex-1 bg-[#0f1115] overflow-auto p-4 md:p-8 lg:p-12 flex justify-start lg:justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
                    <div
                        className="bg-white text-black shadow-2xl transition-all relative z-10 mx-auto origin-top lg:origin-center scale-[0.6] sm:scale-[0.8] md:scale-100"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '20mm',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 0 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        {/* Force print styles to override global dark mode values */}
                        <style jsx global>{`
                            .document-canvas h1, .document-canvas h2, .document-canvas h3, .document-canvas h4, .document-canvas h5, .document-canvas h6, .document-canvas p, .document-canvas span, .document-canvas td, .document-canvas th {
                                color: #000000 !important;
                            }
                            @media (max-width: 640px) {
                                .document-canvas-container { padding: 10px !important; }
                            }
                        `}</style>
                        {sections.map((section, idx) => (
                            <div
                                key={section.id}
                                className={`document-canvas relative group border-2 border-transparent transition-all rounded-sm ${!previewMode && 'hover:border-dashed hover:border-blue-300/50 hover:bg-blue-50/10 p-2'}`}
                                onClick={() => !previewMode && setActiveSection(section.id)}
                            >
                                {/* Section Controls */}
                                {!previewMode && (
                                    <div className="absolute top-0 right-0 transform lg:translate-x-full opacity-0 group-hover:opacity-100 pl-2 flex flex-row lg:flex-col gap-1 transition-opacity z-30">
                                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-blue-100 hover:text-blue-600 shadow-sm disabled:opacity-30 touch-target">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === sections.length - 1} className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-blue-100 hover:text-blue-600 shadow-sm disabled:opacity-30 touch-target">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                    </div>
                                )}

                                {/* Content */}
                                {previewMode ? (
                                    <div dangerouslySetInnerHTML={{ __html: resolveContent(section.content) }} />
                                ) : (
                                    section.isEditable ? (
                                        <div className={`relative ${activeSection === section.id ? 'ring-2 ring-blue-100 rounded' : ''}`}>
                                            {activeSection === section.id && (
                                                <div className="absolute -top-12 lg:-top-10 left-0 right-0 z-20 shadow-lg">
                                                    <RichTextToolbar onCommand={execCmd} />
                                                </div>
                                            )}
                                            <div
                                                ref={activeSection === section.id ? editorRef : null}
                                                className="w-full min-h-[100px] p-2 outline-none font-serif text-sm bg-transparent"
                                                contentEditable
                                                suppressContentEditableWarning
                                                dangerouslySetInnerHTML={activeSection === section.id ? undefined : { __html: section.content }}
                                                onInput={(e) => handleContentChange(section.id, e.currentTarget.innerHTML)}
                                                onFocus={() => setActiveSection(section.id)}
                                            />
                                            {activeSection === section.id && (
                                                <span className="absolute bottom-1 right-2 text-[9px] text-blue-300 bg-blue-50 px-1.5 py-0.5 rounded pointer-events-none">Editing</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative group/locked">
                                            <div
                                                dangerouslySetInnerHTML={{ __html: section.content }}
                                                className="opacity-70 cursor-not-allowed bg-gray-50 border border-gray-200 p-2 grayscale-[0.5]"
                                            />
                                            <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-gray-900/80 opacity-0 group-hover/locked:opacity-100 transition-opacity backdrop-blur-sm">
                                                <span className="text-xs font-semibold text-gray-300">Locked Section</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSections(sections.map(s => s.id === section.id ? { ...s, isEditable: true } : s));
                                                    }}
                                                    className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded shadow-sm font-medium transition-colors flex items-center gap-1 touch-target"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                    Unlock
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
