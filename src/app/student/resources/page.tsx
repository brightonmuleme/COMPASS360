"use client";

import { useSchoolData, TutorContent, EnrolledStudent, Tutor } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    Search,
    Play,
    FileText,
    HelpCircle,
    Heart,
    Users,
    X,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Volume2,
    VolumeX,
    Pause,
    SkipBack,
    SkipForward,
    Download,
    Eye,
    CheckCircle
} from "lucide-react";
import styles from "../page.module.css";
import SharedContentLibrary from "@/components/shared/SharedContentLibrary";
import CustomVideoPlayer from "@/components/shared/CustomVideoPlayer";



// --- NEW LIST VIEW COMPONENT (TUTOR PORTAL STYLE) ---
const ResourceListView = ({
    activeTab,
    contents,
    tutors,
    programmes,
    searchQuery,
    onViewContent,
    studentProfile,
    onToggleLike
}: {
    activeTab: 'Videos' | 'Notes' | 'Questions',
    contents: TutorContent[],
    tutors: Tutor[],
    programmes: any[],
    searchQuery: string,
    onViewContent: (c: TutorContent) => void,
    studentProfile: any,
    onToggleLike: (id: string) => void
}) => {
    const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>('all');
    const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
    const [selectedCourseUnitId, setSelectedCourseUnitId] = useState<string>('all');

    // 1. Initial Filtering: Tab Type & Search
    const searchFiltered = useMemo(() => {
        const typeMap: Record<string, string> = { 'Videos': 'Video', 'Notes': 'Note', 'Questions': 'Question' };
        const requiredType = typeMap[activeTab];
        const lowerSearch = searchQuery.toLowerCase();

        return contents.filter(c => {
            const matchesType = c.type === requiredType;
            if (!matchesType) return false;

            const matchesSearch = !searchQuery ||
                c.title.toLowerCase().includes(lowerSearch) ||
                (tutors.find(t => t.id === c.tutorId)?.name || 'Independent Creator').toLowerCase().includes(lowerSearch);

            return matchesSearch;
        });
    }, [activeTab, contents, searchQuery, tutors]);

    // 2. Filter by Programme (Dropdown)
    const programmeFiltered = useMemo(() => {
        if (selectedProgrammeId === 'all') return searchFiltered;
        return searchFiltered.filter(c => c.programmeIds?.includes(selectedProgrammeId));
    }, [searchFiltered, selectedProgrammeId]);

    // 3. Filter by Level (Horizontal List)
    const levelFiltered = useMemo(() => {
        if (selectedLevel === 'All Levels') return programmeFiltered;
        return programmeFiltered.filter(c => c.levels?.includes(selectedLevel));
    }, [programmeFiltered, selectedLevel]);

    // 4. Extract Sidebar Items (Course Units) from the level-filtered content
    const sidebarItems = useMemo(() => {
        const cuMap = new Map<string, string>();
        let hasGeneral = false;

        levelFiltered.forEach(c => {
            if (c.courseUnitIds && c.courseUnitIds.length > 0) {
                c.courseUnitIds.forEach(cuId => {
                    cuMap.set(cuId, cuId);
                });
            } else {
                hasGeneral = true;
            }
        });

        const items = Array.from(cuMap.entries()).map(([id, _]) => ({ id, name: id }));
        items.sort((a, b) => a.name.localeCompare(b.name));

        if (hasGeneral) items.push({ id: 'general', name: 'General / No Unit' });

        return items;
    }, [levelFiltered]);

    // 5. Final Display filter by Sidebar (Course Unit)
    const finalDisplay = useMemo(() => {
        if (selectedCourseUnitId === 'all') return levelFiltered;
        if (selectedCourseUnitId === 'general') return levelFiltered.filter(c => !c.courseUnitIds || c.courseUnitIds.length === 0);
        return levelFiltered.filter(c => c.courseUnitIds?.includes(selectedCourseUnitId));
    }, [levelFiltered, selectedCourseUnitId]);

    // Helper: Available Levels
    const availableLevels = useMemo(() => {
        const levels = new Set<string>();
        searchFiltered.forEach(c => c.levels?.forEach(l => levels.add(l)));
        const sorted = Array.from(levels).sort();
        return ['All Levels', ...sorted];
    }, [searchFiltered]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* TOP FILTERS AREA */}
            <div className="flex flex-col gap-4">
                {/* 1. Programme Dropdown */}
                <div className="w-full md:w-64">
                    <select
                        value={selectedProgrammeId}
                        onChange={(e) => { setSelectedProgrammeId(e.target.value); setSelectedLevel('All Levels'); setSelectedCourseUnitId('all'); }}
                        className="bg-[#181818] border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                        <option value="all">All Programmes</option>
                        {programmes.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Levels Horizontal Scroll */}
                {/* Mobile Level Select */}
                <div className="md:hidden w-full mb-4">
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full bg-[#181818] border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        {availableLevels.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                </div>

                {/* Desktop Level Scroll */}
                <div className="hidden md:flex w-full bg-[#181818] border border-gray-800 rounded-lg p-1 overflow-x-auto scrollbar-hide items-center">
                    <div className="flex space-x-2 p-1">
                        {availableLevels.map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${selectedLevel === lvl ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                    {availableLevels.length === 1 && (
                        <span className="text-gray-600 text-xs px-4 py-2 italic w-full text-center">No specific levels found</span>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* SIDEBAR (COURSE UNITS) */}
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    <div className="bg-[#181818] rounded-xl p-4 border border-gray-800 sticky top-24 min-h-[300px]">
                        <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4 px-2 flex justify-between items-center">
                            Course Units
                            <span className="bg-gray-800 text-gray-400 rounded-full px-2 py-0.5 text-[10px]">{sidebarItems.length}</span>
                        </h3>
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                            <button
                                onClick={() => setSelectedCourseUnitId('all')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCourseUnitId === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                All Units
                            </button>
                            {sidebarItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedCourseUnitId(item.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${selectedCourseUnitId === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {item.name.startsWith('cu_') ? `Course Unit ${item.id.replace('cu_', '')}` : item.name}
                                </button>
                            ))}
                            {sidebarItems.length === 0 && (
                                <div className="text-center py-8 text-gray-600 text-xs">
                                    No units found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* LIST AREA */}
                <div className="flex-1 space-y-4">
                    {finalDisplay.length === 0 ? (
                        <div className="text-center py-20 bg-[#181818] rounded-xl border border-gray-800 border-dashed">
                            <p className="text-gray-500">No content found.</p>
                        </div>
                    ) : (
                        finalDisplay.map(content => {
                            const isLiked = studentProfile.likedContentIds.includes(content.id);
                            const tutor = tutors.find(t => t.id === content.tutorId);
                            const tutorName = tutor?.name || 'Independent Creator';

                            return (
                                <div
                                    key={content.id}
                                    className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-6 hover:border-gray-600 transition-colors group cursor-pointer"
                                    onClick={() => onViewContent(content)}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-full sm:w-48 aspect-video bg-gray-900 rounded-lg shrink-0 relative overflow-hidden">
                                        {content.type === 'Video' ? (
                                            <>
                                                {content.thumbnailUrl && <img src={content.thumbnailUrl} className="w-full h-full object-cover opacity-60" />}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Play size={20} fill="white" className="ml-1" />
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/80 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                                                    <Eye size={10} /> {content.views || 0}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center relative">
                                                {content.type === 'Question' ? <HelpCircle size={32} className="text-purple-600" /> : <FileText size={32} className="text-blue-500" />}
                                                <div className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/80 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                                                    <Eye size={10} /> {content.views || 0}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg text-gray-200 group-hover:text-white transition-colors line-clamp-1 mb-1">{content.title}</h3>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleLike(content.id); }}
                                                    className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : ""} />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {content.programmeIds?.slice(0, 1).map(pid => (
                                                    <span key={pid} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] uppercase font-bold rounded tracking-wider">
                                                        {programmes.find(p => p.id === pid)?.name || pid}
                                                    </span>
                                                ))}
                                                {content.levels?.slice(0, 1).map(lvl => (
                                                    <span key={lvl} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] uppercase font-bold rounded tracking-wider">
                                                        {lvl}
                                                    </span>
                                                ))}
                                            </div>

                                            <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                                                {content.description || 'No description provided.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded font-bold uppercase ${content.type === 'Video' ? 'text-red-400 bg-red-400/10' : content.type === 'Question' ? 'text-purple-400 bg-purple-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                                                    {content.type}
                                                </span>
                                                <span className="text-gray-500">{new Date(content.uploadDate).toLocaleDateString()}</span>
                                            </div>
                                            <span className="text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                View Source <ChevronRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ResourceCenter() {
    const {
        tutors,
        publishedTutorContents,
        programmes,
        studentProfile,
        toggleStudentLike,
        toggleTutorSubscription,
        students
    } = useSchoolData();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);
    const [activeTab, setActiveTab] = useState<'All' | 'Videos' | 'Notes' | 'Questions' | 'Tutors'>('All');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Find linked student for match calculation
    const linkedStudent = useMemo(() => {
        if (!studentProfile.linkedStudentCode) return null;
        return students.find(s => s.payCode === studentProfile.linkedStudentCode);
    }, [students, studentProfile.linkedStudentCode]);

    // Helper: Calculate match percentage
    const calculateMatch = (content: TutorContent): number => {
        let score = 50; // Base score
        if (linkedStudent && content.programmeIds?.includes(linkedStudent.programme)) score += 30;
        if (linkedStudent && content.levels?.includes(linkedStudent.level)) score += 20;
        if (studentProfile.subscribedTutorIds.includes(content.tutorId)) score += 15;
        if (studentProfile.likedContentIds.some(id => {
            const liked = publishedTutorContents.find(c => c.id === id);
            return liked?.programmeIds?.some(p => content.programmeIds?.includes(p));
        })) score += 10;
        return Math.min(score, 99); // Cap at 99%
    };

    // --- DERIVED STATE: GROUPED CONTENT ---
    const resourceRows = useMemo(() => {
        if (activeTab === 'Tutors') return [];

        const rows: { title: string; type: string; descriptor: string; content: TutorContent[] }[] = [];
        const searchLower = searchQuery.toLowerCase();

        // Filter valid content structure (using publishedTutorContents)
        let filtered = publishedTutorContents.filter(c => {
            // Search Logic
            const matchesSearch = !searchQuery ||
                c.title.toLowerCase().includes(searchLower) ||
                tutors.find(t => t.id === c.tutorId)?.name.toLowerCase().includes(searchLower) ||
                programmes.find(p => c.programmeIds?.includes(p.id))?.name.toLowerCase().includes(searchLower);

            // Tab Filter
            const matchesTab = activeTab === 'All' ||
                (activeTab === 'Videos' && c.type === 'Video') ||
                (activeTab === 'Notes' && c.type === 'Note') ||
                (activeTab === 'Questions' && c.type === 'Question'); // Strict type filtering

            return matchesSearch && matchesTab;
        });

        // Grouping: Programme + Type
        programmes.forEach(prog => {
            // Videos
            if (activeTab === 'All' || activeTab === 'Videos') {
                const videos = filtered.filter(c => c.programmeIds?.includes(prog.id) && c.type === 'Video');
                if (videos.length > 0) rows.push({ title: prog.name, descriptor: 'Videos', type: 'Video', content: videos });
            }

            // Notes
            if (activeTab === 'All' || activeTab === 'Notes') {
                const notes = filtered.filter(c => c.programmeIds?.includes(prog.id) && c.type === 'Note');
                if (notes.length > 0) rows.push({ title: prog.name, descriptor: 'Lecture Notes', type: 'Note', content: notes });
            }

            // Questions
            if (activeTab === 'All' || activeTab === 'Questions') {
                const questions = filtered.filter(c => c.programmeIds?.includes(prog.id) && c.type === 'Question');
                if (questions.length > 0) rows.push({ title: prog.name, descriptor: 'Question Bank', type: 'Question', content: questions });
            }
        });

        // Handle content without specific programme or "General"
        const generalContent = filtered.filter(c => !c.programmeIds || c.programmeIds.length === 0);
        if (generalContent.length > 0) {
            rows.push({ title: 'General', descriptor: 'Mixed Resources', type: 'Mixed', content: generalContent });
        }

        return rows;

    }, [publishedTutorContents, programmes, searchQuery, activeTab, tutors]);

    // Filtered Tutors for "Tutors" tab
    const filteredTutors = useMemo(() => {
        if (activeTab !== 'Tutors') return [];
        const searchLower = searchQuery.toLowerCase();
        return tutors.filter(t =>
            !searchQuery ||
            t.name.toLowerCase().includes(searchLower) ||
            (t.department && t.department.toLowerCase().includes(searchLower))
        );
    }, [tutors, activeTab, searchQuery]);

    const viewingTutor = useMemo(() => tutors.find(t => t.id === selectedTutorId), [tutors, selectedTutorId]);
    const tutorContent = useMemo(() => publishedTutorContents.filter(c => c.tutorId === selectedTutorId), [publishedTutorContents, selectedTutorId]);

    // Escape key handler for modals
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setViewingContent(null);
                setSelectedTutorId(null);
            }
        };
        if (viewingContent || selectedTutorId) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [viewingContent, selectedTutorId]);

    // Auto-focus close button when modal opens
    useEffect(() => {
        if (viewingContent) closeButtonRef.current?.focus();
    }, [viewingContent]);

    // --- ACTIONS ---
    const handleLike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        toggleStudentLike(id);
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white font-sans pb-20">
            {/* HERRO / HERO SEARCH */}
            <div className="sticky top-0 z-40 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm pt-6 pb-8 px-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-red-600 tracking-tighter cursor-pointer" onClick={() => setActiveTab('All')}>
                        VINE<span className="text-white font-light">FLIX</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors" size={20} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Titles, people, or genres"
                                className="bg-black/60 border border-gray-700 rounded-full pl-10 pr-4 py-2 w-64 md:w-80 focus:w-96 transition-all text-sm outline-none focus:border-white placeholder:text-gray-500"
                            />
                        </div>
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-sm cursor-pointer select-none">
                            {studentProfile.name.charAt(0)}
                        </div>
                    </div>
                </div>

                {/* Tags / Filters */}
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {['All', 'Videos', 'Notes', 'Questions', 'Tutors'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-1 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="space-y-12 px-8 min-h-[50vh]">
                {/* 1. TUTORS GRID VIEW */}
                {activeTab === 'Tutors' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredTutors.map(tutor => {
                                const isSubscribed = studentProfile.subscribedTutorIds.includes(tutor.id);
                                return (
                                    <div
                                        key={tutor.id}
                                        className="bg-[#181818] rounded-xl overflow-hidden hover:scale-105 transition-transform cursor-pointer group border border-gray-800 hover:border-gray-600"
                                        onClick={() => setSelectedTutorId(tutor.id)}
                                    >
                                        <div className="h-24 bg-gradient-to-r from-blue-900 to-purple-900 relative">
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-black p-1">
                                                <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold">
                                                    {tutor.name.charAt(0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-10 pb-6 px-4 text-center">
                                            <h3 className="font-bold text-lg mb-1 flex items-center justify-center gap-1">
                                                {tutor.name} <CheckCircle size={14} className="text-blue-500" />
                                            </h3>
                                            <p className="text-gray-400 text-sm mb-4">{tutor.department || 'Academic Department'}</p>

                                            <div className="flex justify-center gap-4 text-xs text-gray-500 mb-6">
                                                <div><strong className="text-white block">{tutor.stats?.uploads || 0}</strong> Uploads</div>
                                                <div><strong className="text-white block">{tutor.stats?.subscribers || 0}</strong> Subs</div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleTutorSubscription(tutor.id); }}
                                                className={`w-full py-2 rounded font-medium text-sm transition-colors ${isSubscribed
                                                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                                                    : 'bg-red-600 text-white hover:bg-red-700'
                                                    }`}
                                            >
                                                {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {filteredTutors.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <Users size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No tutors found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. SPECIFIC TAB VIEW (LIST + SIDEBAR) like Tutor Portal */}
                {(activeTab === 'Videos' || activeTab === 'Notes' || activeTab === 'Questions') && (
                    <ResourceListView
                        activeTab={activeTab}
                        contents={publishedTutorContents}
                        tutors={tutors}
                        programmes={programmes}
                        searchQuery={searchQuery}
                        onViewContent={setViewingContent}
                        studentProfile={studentProfile}
                        onToggleLike={toggleStudentLike}
                    />
                )}

                {/* 3. HOME / ALL VIEW (NETFLIX ROWS) */}
                {activeTab === 'All' && (
                    <>
                        {resourceRows.length === 0 ? (
                            <div className="bg-[#181818] rounded-xl border border-gray-800 p-12 text-center">
                                <Search size={48} className="mx-auto mb-4 opacity-30 text-gray-600" />
                                <h3 className="text-xl font-bold text-gray-300 mb-2">No matches found</h3>
                                <p className="text-gray-500 mb-6">We couldn't find any content matching "{searchQuery}"</p>

                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {activeTab !== 'All' && (
                                        <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                                            <p className="text-sm text-gray-400 mb-2">💡 Try searching in the <span className="text-blue-500 font-bold">All</span> tab</p>
                                        </div>
                                    )}

                                    <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-gray-300 mb-3">🔥 Popular Content</h4>
                                        <div className="space-y-2">
                                            {publishedTutorContents
                                                .sort((a, b) => (b.views || 0) - (a.views || 0))
                                                .slice(0, 5)
                                                .map(c => (
                                                    <div
                                                        key={c.id}
                                                        className="text-sm text-gray-400 hover:text-white cursor-pointer flex justify-between items-center"
                                                        onClick={() => setViewingContent(c)}
                                                    >
                                                        <span className="truncate">{c.title}</span>
                                                        <span className="text-xs text-gray-600 ml-2 flex items-center gap-1">
                                                            <Eye size={10} /> {c.views || 0}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            </div>
                        ) : (
                            resourceRows.map((row, idx) => {
                                const displayContent = expandedRows.has(idx) ? row.content : row.content.slice(0, 8);
                                const hasMore = row.content.length > 8;

                                return (
                                    <div key={idx} className="group/row">
                                        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-200 hover:text-white transition-colors cursor-pointer">
                                            {row.title} <span className="text-gray-500 text-sm font-normal">• {row.descriptor}</span>
                                            <ChevronRight size={16} className="opacity-0 group-hover/row:opacity-100 transition-opacity text-blue-500" />
                                        </h3>

                                        {/* Horizontal Scroll Container (Desktop) / Vertical Stack (Mobile) */}
                                        <div className="relative group/scroll">
                                            <div className="grid grid-cols-1 gap-8 md:flex md:gap-4 md:overflow-x-auto pb-6 scrollbar-hide scroll-smooth snap-x">
                                                {displayContent.map(content => {
                                                    const isLiked = studentProfile.likedContentIds.includes(content.id);
                                                    const tutor = tutors.find(t => t.id === content.tutorId);
                                                    const tutorName = tutor?.name || 'Independent Creator';
                                                    const matchScore = calculateMatch(content);

                                                    return (
                                                        <div
                                                            key={content.id}
                                                            className="w-full md:min-w-[320px] md:w-[320px] aspect-video relative rounded-md overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-600 hover:scale-105 hover:z-10 transition-all duration-300 cursor-pointer snap-start group/card shadow-lg"
                                                            onClick={() => setViewingContent(content)}
                                                        >
                                                            {/* Thumbnail */}
                                                            {content.type === 'Video' ? (
                                                                <div className="w-full h-full relative">
                                                                    <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
                                                                        {content.thumbnailUrl ? (
                                                                            <img src={content.thumbnailUrl} className="w-full h-full object-cover opacity-80" />
                                                                        ) : (
                                                                            <Play size={40} className="text-white opacity-80" />
                                                                        )}
                                                                    </div>
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-full relative bg-gray-800 flex items-center justify-center">
                                                                    {content.type === 'Question' ? (
                                                                        <HelpCircle size={48} className="text-purple-500" />
                                                                    ) : (
                                                                        <FileText size={48} className="text-gray-600" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                                                </div>
                                                            )}

                                                            {/* Content Overlay Info */}
                                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover/card:translate-y-0 transition-transform">
                                                                <div className="flex justify-between items-center mb-2 opacity-0 group-hover/card:opacity-100 transition-opacity delay-100">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            className="bg-white text-black p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                                                            onClick={(e) => { e.stopPropagation(); setViewingContent(content); }}
                                                                        >
                                                                            <Play size={16} fill="black" />
                                                                        </button>
                                                                        <button
                                                                            className="border-2 border-gray-500 text-white p-1.5 rounded-full hover:border-white hover:bg-white/10 transition-colors"
                                                                            onClick={(e) => handleLike(e, content.id)}
                                                                        >
                                                                            <Heart size={16} fill={isLiked ? "white" : "none"} className={isLiked ? "text-red-500" : ""} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {content.type === 'Question' && <span className="bg-purple-600 px-1.5 rounded text-[10px] font-bold uppercase">Quiz</span>}
                                                                        <div className="bg-gray-800/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                                                            {content.levels?.[0] || 'General'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <h4 className="font-bold text-white leading-tight drop-shadow-md mb-1 line-clamp-1">{content.title}</h4>

                                                                <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                                                                    {matchScore >= 70 && <span>{matchScore}% Match</span>}
                                                                    <span className="text-gray-400 px-1 border border-gray-600 rounded text-[10px]">HD</span>
                                                                    <span
                                                                        className={`flex items-center gap-1 ${!tutor ? 'text-gray-500 italic' : 'text-gray-300 hover:text-white hover:underline cursor-pointer'}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (tutor) setSelectedTutorId(content.tutorId);
                                                                        }}
                                                                    >
                                                                        {tutorName}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Show More Button */}
                                                {hasMore && !expandedRows.has(idx) && (
                                                    <div className="w-full md:min-w-[320px] aspect-video flex items-center justify-center">
                                                        <button
                                                            onClick={() => setExpandedRows(prev => new Set(prev).add(idx))}
                                                            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                                        >
                                                            Show {row.content.length - 8} More <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}
            </div>

            {/* VIDEO/CONTENT VIEWER MODAL */}
            {viewingContent && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
                    <button
                        ref={closeButtonRef}
                        onClick={() => setViewingContent(null)}
                        className="absolute top-6 right-6 z-50 bg-black/50 p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                        <X size={32} />
                    </button>

                    <div className="w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row">
                        {/* Player */}
                        <div className="flex-1 flex flex-col bg-black relative">
                            {viewingContent.type === 'Video' ? (
                                <CustomVideoPlayer
                                    src={viewingContent.url || ''}
                                    className="w-full h-full max-h-[80vh] m-auto"
                                    autoPlay
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white flex-col gap-6">
                                    {viewingContent.type === 'Question' ? (
                                        <HelpCircle size={80} className="text-purple-600" />
                                    ) : (
                                        <FileText size={80} className="text-gray-700" />
                                    )}
                                    <div className="text-center">
                                        <h2 className="text-3xl font-bold mb-2">{viewingContent.title}</h2>
                                        <p className="text-gray-400 mb-6">This resource is a {viewingContent.type}.</p>
                                        {viewingContent.url && (
                                            <a
                                                href={viewingContent.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                                            >
                                                <Download size={20} /> Open Resource
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Details Sidebar */}
                        <div className="hidden lg:flex w-96 flex-col bg-[#181818] border-l border-gray-800 overflow-y-auto p-6">
                            <h2 className="text-2xl font-bold mb-2">{viewingContent.title}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                                <span>{new Date(viewingContent.uploadDate).getFullYear()}</span>
                                <span>{viewingContent.type}</span>
                                <span className="flex items-center gap-1 text-gray-500"><Eye size={12} /> {viewingContent.views}</span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed mb-6">
                                {viewingContent.description}
                            </p>

                            <div className="mb-8">
                                <h4 className="text-gray-500 font-bold text-sm mb-2">Tutor</h4>
                                {(() => {
                                    const tutor = tutors.find(t => t.id === viewingContent.tutorId);
                                    const tutorName = tutor?.name || 'Independent Creator';
                                    return (
                                        <div
                                            className={`flex items-center gap-3 p-2 rounded transition-colors ${tutor ? 'cursor-pointer hover:bg-white/5' : 'opacity-60'}`}
                                            onClick={() => {
                                                if (tutor) {
                                                    setViewingContent(null);
                                                    setSelectedTutorId(viewingContent.tutorId);
                                                }
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center font-bold text-white">
                                                {tutorName.charAt(0)}
                                            </div>
                                            <span className={`font-medium ${tutor ? 'text-gray-200' : 'text-gray-500 italic'}`}>{tutorName}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div>
                                <h4 className="text-white font-bold text-lg mb-4">More from this Programme</h4>
                                <div className="space-y-3">
                                    {publishedTutorContents
                                        .filter((c: TutorContent) => c.id !== viewingContent.id && c.programmeIds?.some((p: string) => viewingContent.programmeIds?.includes(p)))
                                        .slice(0, 4)
                                        .map((c: TutorContent) => (
                                            <div key={c.id} className="flex gap-3 cursor-pointer group" onClick={() => setViewingContent(c)}>
                                                <div className="w-24 aspect-video bg-gray-800 rounded relative overflow-hidden flex-shrink-0">
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        {c.type === 'Video' ? <Play size={16} className="text-white/50" /> : <FileText size={16} className="text-white/50" />}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="text-sm font-medium text-gray-300 group-hover:text-white line-clamp-2">{c.title}</h5>
                                                    <p className="text-xs text-gray-500 mt-1">{c.type}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TUTOR PROFILE MODAL */}
            {selectedTutorId && viewingTutor && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-8 animate-fade-in backdrop-blur-sm">
                    <div className="bg-[#181818] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="relative h-48 bg-gradient-to-r from-blue-900 to-black shrink-0">
                            <button
                                onClick={() => setSelectedTutorId(null)}
                                className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6 translate-y-1/2">
                                <div className="w-32 h-32 rounded-full bg-gray-900 border-4 border-[#181818] overflow-hidden shadow-xl">
                                    <div className="w-full h-full flex items-center justify-center bg-blue-600 text-4xl font-bold">
                                        {viewingTutor.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                                        {viewingTutor.name}
                                        <div className="bg-blue-500 rounded-full p-0.5"><CheckCircle size={12} className="text-white" /></div>
                                    </h2>
                                    <p className="text-gray-400">Senior Lecturer • {viewingTutor.department}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-20 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-start mb-8">
                                <div className="max-w-xl text-gray-300">
                                    <p className="leading-relaxed mb-4">{viewingTutor.bio || 'Experienced educator passionate about teaching and research.'}</p>
                                    <div className="flex gap-6 text-sm text-gray-400">
                                        <div><strong className="text-white">{viewingTutor.stats?.subscribers || 0}</strong> Subscribers</div>
                                        <div><strong className="text-white">{viewingTutor.stats?.uploads || 0}</strong> Uploads</div>
                                        <div><strong className="text-white">{viewingTutor.stats?.views.toLocaleString() || 0}</strong> Views</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleTutorSubscription(viewingTutor.id)}
                                    className={`px-8 py-2 rounded font-bold transition-all ${studentProfile.subscribedTutorIds.includes(viewingTutor.id) ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                >
                                    {studentProfile.subscribedTutorIds.includes(viewingTutor.id) ? 'Subscribed' : 'Subscribe'}
                                </button>
                            </div>

                            <div className="mt-8">
                                <SharedContentLibrary tutorId={viewingTutor.id} readOnly={true} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
