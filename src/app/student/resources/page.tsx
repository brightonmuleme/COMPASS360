"use client";

import { useSchoolData, TutorContent, EnrolledStudent, Tutor, formatMoney, Programme, CourseUnit } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
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
    CheckCircle,
    Lock,
    ShieldCheck,
    Zap,
    AlertCircle,
    Star,
    ShoppingBag,
    Monitor,
    SlidersHorizontal,
    GraduationCap,
    Layers,
    Minimize2,
    Sparkles,
    ArrowRight
} from "lucide-react";
import SharedContentLibrary from "@/components/shared/SharedContentLibrary";
import CustomVideoPlayer from "@/components/shared/CustomVideoPlayer";

export default function ResourceCenter() {
    const router = useRouter();
    const {
        tutors,
        publishedTutorContents,
        programmes,
        courseUnits,
        studentProfile,
        developerProfile,
        toggleStudentLike,
        toggleTutorSubscription,
        subscribeToTutor,
        students,
        schoolProfile
    } = useSchoolData();

    const [searchQuery, setSearchQuery] = useState("");
    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | 'Videos' | 'Notes' | 'Questions' | 'Tutors'>('All');

    // HIERARCHICAL FILTERS (DEVELOPER CONFIGURED)
    const [selectedProg, setSelectedProg] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
    const [theaterMode, setTheaterMode] = useState(false);

    const SYSTEM_TUTOR_IDS = useMemo(() => ['system', 'admin_main', developerProfile?.id].filter(Boolean) as string[], [developerProfile]);

    const linkedStudent = useMemo(() => {
        if (!studentProfile.linkedStudentCode) return null;
        return students.find(s => s.payCode === studentProfile.linkedStudentCode);
    }, [students, studentProfile.linkedStudentCode]);

    const hasActivePass = useMemo(() => {
        return studentProfile.subscriptionStatus === 'active';
    }, [studentProfile.subscriptionStatus]);

    const repoLevels = useMemo(() => {
        if (!selectedProg) {
            const levels = new Set<string>();
            programmes.forEach(p => {
                if (p.levels) p.levels.forEach(l => levels.add(l));
            });
            return Array.from(levels).sort();
        } else {
            const prog = programmes.find(p => p.id === selectedProg);
            return prog?.levels || [];
        }
    }, [programmes, selectedProg]);

    // --- SEARCH LOGIC: OFFICIAL vs. MARKETPLACE ---
    const searchLower = searchQuery.toLowerCase();

    // Check if any official Course Units match the query
    const officialCourseUnitMatches = useMemo(() => {
        if (!searchQuery) return [];
        return courseUnits.filter(cu =>
            cu.name.toLowerCase().includes(searchLower) ||
            cu.code.toLowerCase().includes(searchLower)
        );
    }, [courseUnits, searchLower, searchQuery]);

    // Marketplace Fallback: If no official match, find tutors who have content matching the query
    const recommendedTutors = useMemo(() => {
        if (!searchQuery || officialCourseUnitMatches.length > 0) return [];

        // Find content that matches query (excluding system tutors - strictly marketplace)
        const matchingTutorContent = publishedTutorContents.filter(c =>
            !SYSTEM_TUTOR_IDS.includes(c.tutorId) && (
                c.title.toLowerCase().includes(searchLower) ||
                c.description?.toLowerCase().includes(searchLower)
            )
        );

        const uniqueTutorIds = Array.from(new Set(matchingTutorContent.map(c => c.tutorId)));
        return tutors.filter(t => uniqueTutorIds.includes(t.id));
    }, [searchQuery, officialCourseUnitMatches, publishedTutorContents, SYSTEM_TUTOR_IDS, searchLower, tutors]);

    // --- DERIVED STATE: GROUPED CONTENT ---
    const { resourceRows, featuredContent } = useMemo(() => {
        if (activeTab === 'Tutors') return { resourceRows: [], featuredContent: null };

        const rows: { title: string; type: string; descriptor: string; content: TutorContent[] }[] = [];

        let filtered = publishedTutorContents.filter(c => {
            // ONLY SHOW SYSTEM/OFFICIAL CONTENT IN THE MAIN GRID
            if (!SYSTEM_TUTOR_IDS.includes(c.tutorId)) return false;

            const matchesSearch = !searchQuery ||
                c.title.toLowerCase().includes(searchLower) ||
                tutors.find(t => t.id === c.tutorId)?.name.toLowerCase().includes(searchLower) ||
                programmes.find(p => c.programmeIds?.includes(p.id))?.name.toLowerCase().includes(searchLower) ||
                officialCourseUnitMatches.some(cu => c.courseUnitIds?.includes(cu.id) || c.courseUnitId === cu.id);

            const matchesTab = activeTab === 'All' ||
                (activeTab === 'Videos' && c.type === 'Video') ||
                (activeTab === 'Notes' && c.type === 'Note') ||
                (activeTab === 'Questions' && c.type === 'Question');

            const matchesProg = !selectedProg || c.programmeIds?.includes(selectedProg);
            const matchesLevel = selectedLevel === 'All Levels' || c.levels?.includes(selectedLevel);

            return matchesSearch && matchesTab && matchesProg && matchesLevel;
        });

        const featured = filtered.find(c => c.type === 'Video') || filtered[0] || null;

        programmes.forEach(prog => {
            if (selectedProg && prog.id !== selectedProg) return;

            const progContent = filtered.filter(c => c.programmeIds?.includes(prog.id));
            if (progContent.length === 0) return;

            if (activeTab === 'All' || activeTab === 'Videos') {
                const videos = progContent.filter(c => c.type === 'Video');
                if (videos.length > 0) rows.push({ title: prog.name, descriptor: 'Official Video Guides', type: 'Video', content: videos });
            }
            if (activeTab === 'All' || activeTab === 'Notes') {
                const notes = progContent.filter(c => c.type === 'Note');
                if (notes.length > 0) rows.push({ title: prog.name, descriptor: 'Faculty Lecture Notes', type: 'Note', content: notes });
            }
            if (activeTab === 'All' || activeTab === 'Questions') {
                const questions = progContent.filter(c => c.type === 'Question');
                if (questions.length > 0) rows.push({ title: prog.name, descriptor: 'Department Questions', type: 'Question', content: questions });
            }
        });

        return { resourceRows: rows, featuredContent: featured };
    }, [publishedTutorContents, programmes, searchQuery, activeTab, tutors, SYSTEM_TUTOR_IDS, selectedProg, selectedLevel, officialCourseUnitMatches, searchLower]);

    const filteredTutors = useMemo(() => {
        if (activeTab !== 'Tutors') return [];
        return tutors.filter(t =>
            !SYSTEM_TUTOR_IDS.includes(t.id) && (
                !searchQuery ||
                t.name.toLowerCase().includes(searchLower) ||
                (t.department && t.department.toLowerCase().includes(searchLower))
            )
        );
    }, [tutors, activeTab, searchQuery, SYSTEM_TUTOR_IDS, searchLower]);

    const checkTutorAccess = (tutorId: string) => {
        if (SYSTEM_TUTOR_IDS.includes(tutorId)) return true;
        if (!linkedStudent) return false;

        const hasFinancialSub = linkedStudent.tutorSubscriptions?.some(sub =>
            sub.tutorId === tutorId &&
            sub.status === 'Active' &&
            new Date(sub.expiryDate) > new Date()
        );
        return hasFinancialSub || studentProfile.subscribedTutorIds.includes(tutorId);
    };

    const handleViewContent = (content: TutorContent) => {
        if (!hasActivePass) return;
        if (!checkTutorAccess(content.tutorId)) {
            router.push(`/student/tutors/${content.tutorId}`);
        } else {
            setViewingContent(content);
        }
    };

    const handleNext = () => {
        if (!viewingContent) return;
        const nextContent = publishedTutorContents.find(c =>
            c.id !== viewingContent.id &&
            c.type === viewingContent.type &&
            c.programmeIds?.some(p => viewingContent.programmeIds?.includes(p))
        );
        if (nextContent) setViewingContent(nextContent);
    };

    return (
        <div className={`min-h-screen bg-[#141414] text-white font-sans ${viewingContent && !isMiniPlayer ? 'overflow-hidden' : 'pb-20'}`}>
            {/* STICKY NAV */}
            <div className="sticky top-0 z-40 bg-black/99 backdrop-blur-3xl pt-6 pb-6 px-4 md:px-8 flex flex-col gap-6 border-b border-white/5 shadow-2xl">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl md:text-3xl font-black text-red-600 tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => setActiveTab('All')}>
                        COMPASS <span className="text-white">TV</span>
                    </h1>
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search official units or tutors..."
                                className="bg-[#111] border border-white/5 rounded-full pl-10 pr-4 py-2 w-64 lg:w-80 transition-all text-xs font-bold uppercase tracking-widest outline-none focus:border-white/20 focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-600"
                            />
                        </div>

                        <button
                            onClick={() => setTheaterMode(!theaterMode)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest border transition-all ${theaterMode ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-indigo-600 border-indigo-600 text-white shadow-lg'}`}
                            title={theaterMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
                        >
                            {theaterMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            <span className="hidden md:inline">{theaterMode ? 'EXIT FOCUS' : 'FOCUS MODE'}</span>
                        </button>

                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-600 flex items-center justify-center font-black text-sm border-2 border-white/10 shadow-lg">
                            {studentProfile.name.charAt(0)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide items-center">
                    {['All', 'Videos', 'Notes', 'Questions', 'Tutors'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] border transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black border-white shadow-xl shadow-white/5' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* HIERARCHICAL DISCOVERY PANEL (HIDDEN IN THEATER MODE) */}
                {!theaterMode && activeTab !== 'Tutors' && (
                    <div className="animate-slide-down bg-[#111] border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

                        <div className="grid grid-cols-1 gap-8">
                            {/* Step 1: Programme (DEVELOPER SET) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                                        <GraduationCap size={16} className="text-red-600" /> Official Programme
                                    </label>
                                    {selectedProg && (
                                        <button
                                            onClick={() => { setSelectedProg(''); setSelectedLevel('All Levels'); }}
                                            className="text-[9px] font-black text-white/20 hover:text-red-500 uppercase transition-colors"
                                        >
                                            Reset Channel
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                    <button
                                        onClick={() => { setSelectedProg(''); setSelectedLevel('All Levels'); }}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${!selectedProg ? 'bg-white text-black border-white shadow-2xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        Global Archive
                                    </button>
                                    {programmes.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedProg(p.id); setSelectedLevel('All Levels'); }}
                                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedProg === p.id ? 'bg-red-600 text-white border-red-600 shadow-xl shadow-red-600/20' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Level (DEVELOPER SET) */}
                            <div className={`space-y-4 transition-all duration-500 ${selectedProg ? 'opacity-100' : 'opacity-40'}`}>
                                <label className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                                    <Layers size={16} className={selectedProg ? 'text-red-600' : ''} /> Official Year
                                </label>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                    <button
                                        onClick={() => setSelectedLevel('All Levels')}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedLevel === 'All Levels' ? 'bg-white text-black border-white shadow-2xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        Full Duration
                                    </button>
                                    {repoLevels.map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setSelectedLevel(level)}
                                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedLevel === level ? 'bg-red-600 text-white border-red-600 shadow-xl shadow-red-600/20' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT Area */}
            <div className="px-4 md:px-8 mt-8 space-y-16 md:space-y-24">

                {/* MARKETPLACE FALLBACK: SUGGESTED SPECIALISTS */}
                {recommendedTutors.length > 0 && (
                    <div className="animate-slide-down bg-blue-600/5 border border-blue-600/10 rounded-[3rem] p-8 md:p-12 space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full" />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-blue-500">
                                    <Sparkles size={20} />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em]">Marketplace Recommendation</h3>
                                </div>
                                <h4 className="text-xl md:text-3xl font-black text-white tracking-tighter">No official units for "{searchQuery}", but these Specialists can help:</h4>
                                <p className="text-xs text-gray-500 font-medium max-w-2xl">We found guides relevant to your search in these private channels. Subscribe to unlock their full academic records.</p>
                            </div>
                            <button onClick={() => { setSearchQuery(""); }} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all">Clear Search</button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {recommendedTutors.map(tutor => (
                                <div
                                    key={tutor.id}
                                    className="bg-black/40 rounded-[2.5rem] p-6 border border-white/5 hover:border-white/20 hover:scale-[1.05] transition-all cursor-pointer group flex flex-col items-center text-center space-y-4"
                                    onClick={() => router.push(`/student/tutors/${tutor.id}`)}
                                >
                                    <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-3xl font-black shadow-2xl border border-white/10">
                                        {tutor.name[0]}
                                    </div>
                                    <div className="space-y-1">
                                        <h5 className="font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">{tutor.name}</h5>
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{tutor.department?.split(' ')[0] || 'Elite Specialist'}</p>
                                    </div>
                                    <div className="pt-2">
                                        <div className="bg-white/5 px-4 py-2 rounded-xl text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center gap-2">
                                            Open Channel <ArrowRight size={12} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'Tutors' ? (
                    <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                        {filteredTutors.map(tutor => (
                            <div
                                key={tutor.id}
                                className="bg-[#181818] rounded-[2rem] md:rounded-[3rem] overflow-hidden hover:scale-[1.03] transition-all cursor-pointer group border border-white/5 shadow-2xl flex flex-col relative"
                                onClick={() => router.push(`/student/tutors/${tutor.id}`)}
                            >
                                <div className="h-28 md:h-36 bg-gradient-to-br from-blue-900 to-black relative">
                                    <div className="absolute -bottom-8 md:-bottom-12 left-1/2 -translate-x-1/2 w-16 h-16 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2.5rem] bg-[#181818] p-1 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                        <div className="w-full h-full rounded-[1.2rem] md:rounded-[2.2rem] bg-blue-600 flex items-center justify-center text-xl md:text-4xl font-black border border-white/5">
                                            {tutor.name.charAt(0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-12 md:pt-16 pb-8 md:pb-12 px-6 md:px-8 text-center space-y-4 md:space-y-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-1 md:space-y-2">
                                        <h3 className="font-black text-white text-sm md:text-xl group-hover:text-blue-400 transition-colors flex items-center justify-center gap-1 line-clamp-1 leading-tight uppercase tracking-tight">
                                            {tutor.name}
                                        </h3>
                                        <p className="text-[8px] md:text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] leading-tight">{tutor.department?.split(' ')[0] || 'Independent'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/student/tutors/${tutor.id}`); }}
                                        className={`w-full py-3 md:py-4 rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-[0.3em] transition-all ${checkTutorAccess(tutor.id) ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'bg-white text-black hover:scale-105 shadow-xl shadow-black/20'}`}
                                    >
                                        {checkTutorAccess(tutor.id) ? 'Channel Open' : 'Unlock Channel'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-16 md:space-y-24 pb-32 animate-fade-in">
                        {/* CINEMATIC HERO */}
                        {featuredContent && activeTab === 'All' && !searchQuery && !selectedProg && (
                            <div
                                className="relative w-full aspect-[16/9] md:aspect-[30/9] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden group cursor-pointer border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,1)]"
                                onClick={() => handleViewContent(featuredContent)}
                            >
                                <img src={featuredContent.thumbnailUrl || '/api/placeholder/1200/600'} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105 opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-8 md:p-20 space-y-6 md:space-y-10">
                                    <div className="bg-red-600 w-fit px-4 py-1.5 rounded-sm text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] shadow-xl">Global Archive</div>
                                    <h2 className="text-3xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] max-w-4xl drop-shadow-2xl uppercase">
                                        {featuredContent.title}
                                    </h2>
                                    <div className="flex gap-4 md:gap-6">
                                        <button className="bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                            <Play size={18} fill="black" /> Play Now
                                        </button>
                                        <button className="bg-white/10 backdrop-blur-md text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl border border-white/10 hover:bg-white/20 transition-all">
                                            More Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONTENT SHELVES (OFFICIAL CONTENT ONLY IN GLOBAL HUB) */}
                        {resourceRows.length > 0 ? (
                            resourceRows.map((row, idx) => (
                                <div key={idx} className="space-y-6 md:space-y-10 px-2 lg:px-4">
                                    <div className="flex items-end justify-between">
                                        <div className="space-y-1 md:space-y-2">
                                            <h3 className="text-[10px] md:text-[12px] font-black text-red-600 uppercase tracking-[0.5em]">{row.descriptor}</h3>
                                            <h2 className="text-2xl md:text-4xl font-black text-white leading-none tracking-tighter uppercase">{row.title}</h2>
                                        </div>
                                        <button className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors border-b border-white/10 pb-1">Browse All</button>
                                    </div>
                                    <div className="flex gap-5 md:gap-8 overflow-x-auto pb-8 scrollbar-hide snap-x">
                                        {row.content.map(content => (
                                            <div
                                                key={content.id}
                                                className={`w-[150px] sm:w-[320px] md:w-[420px] shrink-0 aspect-[2/3] sm:aspect-video relative rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#111] border border-white/5 hover:border-white/20 hover:scale-[1.05] hover:z-10 transition-all duration-700 cursor-pointer snap-start shadow-[0_20px_50px_rgba(0,0,0,1)] group`}
                                                onClick={() => handleViewContent(content)}
                                            >
                                                <div className={!hasActivePass ? "blur-[12px] opacity-30 h-full w-full" : "h-full w-full"}>
                                                    <img src={content.thumbnailUrl || '/api/placeholder/400/225'} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                                                </div>
                                                {!hasActivePass && (
                                                    <div className="absolute inset-0 flex items-center justify-center p-4">
                                                        <div className="bg-red-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                                                            <Lock size={12} /> Locked
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 bg-gradient-to-t from-black via-black/90 to-transparent">
                                                    <h4 className="font-black text-white text-[11px] md:text-lg line-clamp-2 group-hover:text-red-600 transition-colors leading-[1.1] uppercase tracking-tight">{content.title}</h4>
                                                    <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4">
                                                        <span className="text-[9px] md:text-[11px] text-green-500 font-black tracking-widest uppercase">Official Log</span>
                                                        <span className="text-[9px] md:text-[11px] text-white/30 font-black uppercase tracking-[0.2em]">{content.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Show empty state if no official content matches AND no marketplace suggestions
                            recommendedTutors.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-40 px-12 text-center animate-fade-in border border-white/5 bg-white/[0.02] rounded-[4rem] shadow-inner">
                                    <Monitor size={80} className="text-white/5 mb-10" />
                                    <h3 className="text-2xl md:text-3xl font-black text-white/30 uppercase tracking-[0.5em]">No Match Found</h3>
                                    <p className="text-gray-600 text-[10px] md:text-[12px] font-black uppercase mt-6 max-w-md tracking-[0.3em] leading-relaxed opacity-50">
                                        We couldn't find official or marketplace materials for this search. Try different keywords.
                                    </p>
                                    <button
                                        onClick={() => { setSelectedProg(''); setSelectedLevel('All Levels'); setSearchQuery(''); }}
                                        className="mt-12 px-10 py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                    >
                                        Reset Discovery Hub
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* CINEMATIC VIEWERS */}
            {viewingContent && (
                <div className={isMiniPlayer ? "fixed bottom-12 right-12 z-[100] w-[400px] aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/10 animate-scale-in" : "fixed inset-0 z-50 bg-black flex items-center justify-center p-0 md:p-16 animate-fade-in"}>
                    <div className="absolute top-10 right-10 z-[60] flex gap-5">
                        {viewingContent.type === 'Video' && (
                            <button onClick={() => setIsMiniPlayer(!isMiniPlayer)} className="bg-black/50 p-4 rounded-full hover:bg-white/10 text-white backdrop-blur-2xl transition-all border border-white/5">
                                <Maximize2 size={24} />
                            </button>
                        )}
                        <button onClick={() => { setViewingContent(null); setIsMiniPlayer(false); }} className="bg-black/50 p-4 rounded-full hover:bg-white/10 text-white backdrop-blur-2xl transition-all border border-white/5">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-12">
                        <div className="flex-1 bg-black rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(220,38,38,0.15)]">
                            {viewingContent.type === 'Video' ? (
                                <CustomVideoPlayer id={viewingContent.id} src={viewingContent.url || ''} className="w-full h-full" autoPlay onNext={handleNext} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#070707] flex-col gap-10 p-16">
                                    <div className="w-40 h-40 bg-red-600/10 rounded-full flex items-center justify-center">
                                        <FileText size={100} className="text-red-600" />
                                    </div>
                                    <div className="text-center space-y-6">
                                        <h3 className="font-black text-3xl md:text-5xl tracking-tighter uppercase leading-none">{viewingContent.title}</h3>
                                        <p className="text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed text-sm md:text-base">{viewingContent.description}</p>
                                        <a href={viewingContent.url} target="_blank" className="bg-white text-black px-16 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 transition-all inline-block">Direct Access Viewer</a>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isMiniPlayer && (
                            <div className="hidden lg:flex w-[480px] flex-col bg-[#070707] rounded-[4rem] border border-white/5 p-16 overflow-y-auto custom-scrollbar shadow-2xl">
                                <div className="space-y-6 mb-16 px-2">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9]">{viewingContent.title}</h2>
                                    <p className="text-gray-500 text-sm leading-relaxed font-medium">{viewingContent.description}</p>
                                </div>
                                <h4 className="text-[11px] font-black text-red-600 uppercase tracking-[0.5em] mb-12 underline underline-offset-8 decoration-red-600/20">Related Official Resource</h4>
                                <div className="space-y-12">
                                    {publishedTutorContents.filter(c => SYSTEM_TUTOR_IDS.includes(c.tutorId) && c.id !== viewingContent.id && c.type === viewingContent.type).slice(0, 5).map(c => (
                                        <div key={c.id} className="flex gap-8 group cursor-pointer" onClick={() => setViewingContent(c)}>
                                            <div className="w-36 aspect-video bg-gray-950 rounded-[1.5rem] overflow-hidden shrink-0 border border-white/5 shadow-xl">
                                                <img src={c.thumbnailUrl || '/api/placeholder/100/60'} className="w-full h-full object-cover group-hover:scale-110 transition-all opacity-60" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <h5 className="text-[14px] font-black line-clamp-2 leading-[1.2] group-hover:text-red-600 transition-colors uppercase tracking-tight">{c.title}</h5>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Faculty</p>
                                                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{c.type}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
