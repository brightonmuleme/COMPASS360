"use client";

import { useSchoolData, TutorContent, CourseUnit, Programme } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    Plus, Trash2, FileText, Video, HelpCircle, ArrowLeft, Play, Download, Eye,
    ChevronDown, ChevronRight, Check, Settings, BookOpen, MoreVertical, X,
    Save, ArrowRight, Upload, Pause, SkipBack, SkipForward, Monitor, Volume2,
    VolumeX, Image as ImageIcon, Camera, Heart, Pin, SlidersHorizontal, Filter,
    Layers, GraduationCap, ChevronLeft as ChevronLeftIcon, Maximize2, Minimize2
} from "lucide-react";

// --- CUSTOM VIDEO PLAYER ---
const CustomVideoPlayer = ({ src, poster, className, autoPlay }: { src: string, poster?: string, className?: string, autoPlay?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay || false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (autoPlay) vid.play().catch(() => setIsPlaying(false));

        const updateProgress = () => {
            if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
        };
        vid.addEventListener('timeupdate', updateProgress);
        return () => vid.removeEventListener('timeupdate', updateProgress);
    }, [autoPlay]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div ref={containerRef} className={`relative group bg-black overflow-hidden ${className || ''}`}>
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                poster={poster}
                onClick={togglePlay}
            />
            {(!isPlaying) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer z-10" onClick={togglePlay}>
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                        <Play size={24} className="text-white fill-white ml-1" />
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-20">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
};

type ContentType = 'Home' | 'Note' | 'Video' | 'Question';

interface SharedContentLibraryProps {
    tutorId: string;
    readOnly?: boolean;
    className?: string;
}

export default function SharedContentLibrary({ tutorId, readOnly = true, className }: SharedContentLibraryProps) {
    const {
        programmes,
        courseUnits,
        tutorContents,
        studentProfile,
        tutorProfile,
        developerProfile,
        toggleStudentLike,
        tutors
    } = useSchoolData();

    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);
    const [activeTab, setActiveTab] = useState<ContentType>('Home');
    const [selectedProg, setSelectedProg] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
    const [selectedCU, setSelectedCU] = useState<string | null>(null);
    const [theaterMode, setTheaterMode] = useState(false);

    const tutor = useMemo(() => tutors.find(t => t.id === tutorId), [tutors, tutorId]);

    const myContents = useMemo(() => tutorContents.filter(c => c.tutorId === tutorId), [tutorContents, tutorId]);

    // SHOW ALL PROGRAMMES CONFIGURATED BY THE TUTOR
    const availableProgrammes = useMemo(() => {
        if (!tutor?.programmeIds) return [];
        return programmes.filter(p => tutor.programmeIds.includes(p.id));
    }, [programmes, tutor]);

    const repoLevels = useMemo(() => {
        if (!selectedProg) {
            const levels = new Set<string>();
            availableProgrammes.forEach(p => {
                if (p.levels) p.levels.forEach(l => levels.add(l));
            });
            return Array.from(levels).sort();
        } else {
            const prog = programmes.find(p => p.id === selectedProg);
            return prog?.levels || [];
        }
    }, [availableProgrammes, selectedProg, programmes]);

    const availableCourseUnits = useMemo(() => {
        let filtered = courseUnits;
        if (selectedProg) filtered = filtered.filter(cu => cu.programmeId === selectedProg);
        else if (tutor?.programmeIds) filtered = filtered.filter(cu => tutor.programmeIds.includes(cu.programmeId));

        if (selectedLevel && selectedLevel !== 'All Levels') {
            filtered = filtered.filter(cu => cu.level === selectedLevel);
        }
        return filtered;
    }, [courseUnits, selectedProg, selectedLevel, tutor]);

    const groupedCourseUnits = useMemo(() => {
        const groups: Record<string, CourseUnit[]> = {};
        availableCourseUnits.forEach(cu => {
            const level = cu.level || 'Uncategorized';
            if (!groups[level]) groups[level] = [];
            groups[level].push(cu);
        });
        return groups;
    }, [availableCourseUnits]);

    const displayedContent = useMemo(() => {
        let content = myContents.filter(c => {
            if (c.status === 'Draft') return !!developerProfile || (tutorProfile?.id === tutorId);
            return true;
        });

        // Apply Programme Filter (Global) - IRRESPECTIVE of entry levels and course units
        if (selectedProg) {
            const progCUs = courseUnits.filter(cu => cu.programmeId === selectedProg).map(cu => cu.id);
            content = content.filter(c => (c.programmeIds?.includes(selectedProg) || c.programmeId === selectedProg) || c.courseUnitIds?.some(id => progCUs.includes(id)));
        }

        // Apply Level Filter (Global) - IRRESPECTIVE of specific course units
        if (selectedLevel && selectedLevel !== 'All Levels') {
            content = content.filter(c => c.levels?.includes(selectedLevel) || c.level === selectedLevel);
        }

        if (activeTab === 'Home') return content;
        content = content.filter(c => c.type === activeTab);

        // Finally, filter by Course Unit
        if (selectedCU) {
            content = content.filter(c => c.courseUnitIds?.includes(selectedCU) || c.courseUnitId === selectedCU);
        }

        return content;
    }, [myContents, activeTab, selectedCU, selectedProg, selectedLevel, courseUnits, developerProfile, tutorProfile, tutorId]);

    const homeContent = useMemo(() => {
        return [...displayedContent].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    }, [displayedContent]);

    const featuredContent = useMemo(() => homeContent.find(c => c.isFeatured) || homeContent[0], [homeContent]);

    const handleViewContent = (c: TutorContent) => setViewingContent(c);

    return (
        <div className={`text-gray-100 ${className || ''}`}>
            {/* Horizontal Tabs & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {(['Home', 'Note', 'Video', 'Question'] as ContentType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => { setActiveTab(type); setSelectedCU(null); }}
                            className={`px-6 py-3 rounded-full text-[10px] font-black tracking-widest transition-all whitespace-nowrap border ${activeTab === type
                                ? 'bg-white text-black border-white shadow-xl'
                                : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {type.toUpperCase()}S
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                        onClick={() => setTheaterMode(!theaterMode)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black tracking-widest border transition-all ${theaterMode ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-indigo-600 border-indigo-600 text-white shadow-lg'}`}
                        title={theaterMode ? 'Exit Theater Mode (Show Academic Controls)' : 'Enter Theater Mode (Hide All Controls)'}
                    >
                        {theaterMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span className="md:inline">{theaterMode ? 'EXIT FOCUS' : 'FOCUS MODE'}</span>
                    </button>
                </div>
            </div>

            {/* HIERARCHICAL DRILL-DOWN PANEL (HIDDEN IN THEATER MODE) */}
            {!theaterMode && (
                <div className="mb-8 p-6 md:p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] animate-slide-down space-y-10 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

                    <div className="grid grid-cols-1 gap-10">
                        {/* 1. SELECT PROGRAMME */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-white/40">
                                    <GraduationCap size={20} className="text-blue-500" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Step 1: Choose Programme</span>
                                </div>
                                {selectedProg && (
                                    <button
                                        onClick={() => { setSelectedProg(''); setSelectedLevel('All Levels'); setSelectedCU(null); }}
                                        className="text-[9px] font-black text-white/20 hover:text-red-500 uppercase transition-colors"
                                    >
                                        Clear Path
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                                <button
                                    onClick={() => { setSelectedProg(''); setSelectedLevel('All Levels'); setSelectedCU(null); }}
                                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${!selectedProg ? 'bg-white text-black border-white shadow-2xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                >
                                    All Courses
                                </button>
                                {availableProgrammes.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setSelectedProg(p.id); setSelectedLevel('All Levels'); setSelectedCU(null); }}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedProg === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. SELECT LEVEL (Revealed after programme or always shown for master list) */}
                        <div className={`space-y-6 transition-all duration-500 ${selectedProg ? 'opacity-100' : 'opacity-40'}`}>
                            <div className="flex items-center gap-4 text-white/40">
                                <Layers size={20} className={`${selectedProg ? 'text-blue-500' : ''}`} />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Step 2: Specification Level</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                                <button
                                    onClick={() => { setSelectedLevel('All Levels'); setSelectedCU(null); }}
                                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedLevel === 'All Levels' ? 'bg-white text-black border-white shadow-2xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                >
                                    Entire Year
                                </button>
                                {repoLevels.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => { setSelectedLevel(level); setSelectedCU(null); }}
                                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${selectedLevel === level ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'text-gray-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content & Sidebar Layout */}
            <div className="flex flex-col md:flex-row gap-8 animate-fade-in relative">

                {/* Channels Sidebar (Visible in Standard Mode, intelligently filtered) */}
                {!theaterMode && (
                    <div className="w-full md:w-72 shrink-0 animate-slide-right">
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[3rem] md:sticky md:top-4 max-h-[85vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Step 3</h3>
                                    <h4 className="text-sm font-black text-white uppercase tracking-tighter">Units</h4>
                                </div>
                                <div className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">{availableCourseUnits.length}</div>
                            </div>

                            <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-6">
                                <button
                                    onClick={() => setSelectedCU(null)}
                                    className={`w-full text-center py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${!selectedCU ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'text-gray-500 border-white/5 hover:text-white hover:bg-white/5'}`}
                                >
                                    FULL ARCHIVE
                                </button>

                                {Object.entries(groupedCourseUnits).sort().map(([level, units]) => (
                                    <div key={level} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] whitespace-nowrap">{level} Units</span>
                                            <div className="h-px w-full bg-white/5" />
                                        </div>
                                        <div className="space-y-2">
                                            {units.map(cu => (
                                                <button
                                                    key={cu.id}
                                                    onClick={() => setSelectedCU(cu.id)}
                                                    className={`w-full text-left py-4 px-6 rounded-2xl text-[10px] font-black tracking-widest transition-all border truncate ${selectedCU === cu.id ? 'bg-white text-black border-white shadow-2xl scale-[1.03]' : 'text-gray-500 border-white/5 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <BookOpen size={14} className={selectedCU === cu.id ? 'text-blue-600' : 'text-gray-800'} />
                                                        {cu.code}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Grid */}
                <div className="flex-1">
                    {activeTab === 'Home' ? (
                        <div className="animate-fade-in space-y-16">
                            {/* Featured Billboard */}
                            {featuredContent && !selectedCU && !selectedProg && (
                                <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-[3rem] md:rounded-[4rem] overflow-hidden group cursor-pointer border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]" onClick={() => handleViewContent(featuredContent)}>
                                    <img src={featuredContent.thumbnailUrl || '/api/placeholder/1200/600'} className="w-full h-full object-cover opacity-60 transition-transform duration-[4000ms] group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 p-8 md:p-16 space-y-6">
                                        <span className="bg-red-600 px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[0.4em] shadow-xl">Top Recommendation</span>
                                        <h2 className="text-3xl md:text-7xl font-black text-white tracking-tighter leading-none max-w-4xl drop-shadow-2xl">{featuredContent.title}</h2>
                                    </div>
                                </div>
                            )}

                            {/* High-Density Discovery Grid */}
                            <div className="space-y-10">
                                <div className="flex items-center justify-between px-2">
                                    <div className="space-y-1">
                                        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Curated Content</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                            <h4 className="text-xl font-black text-white uppercase tracking-tight">Recent Resources</h4>
                                        </div>
                                    </div>
                                    <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-1">View Full Collection</button>
                                </div>
                                <div className={`grid gap-6 md:gap-8 ${theaterMode ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
                                    {(homeContent.length > 0 ? homeContent.slice(0, 12) : []).map(c => (
                                        <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden hover:scale-[1.05] transition-all cursor-pointer group shadow-2xl flex flex-col" onClick={() => handleViewContent(c)}>
                                            <div className="aspect-[4/5] sm:aspect-video relative overflow-hidden bg-black">
                                                <img src={c.thumbnailUrl || '/api/placeholder/400/225'} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-[0.2em] border border-white/5">
                                                    {c.type}
                                                </div>
                                            </div>
                                            <div className="p-6 md:p-8 space-y-4 flex-1 flex flex-col justify-between">
                                                <h4 className="text-[12px] md:text-lg font-black text-white line-clamp-2 uppercase tracking-tight leading-[1.1] group-hover:text-blue-400 transition-colors">{c.title}</h4>
                                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{new Date(c.uploadDate).getFullYear()}</span>
                                                    <Heart size={14} className="text-white/10 group-hover:text-red-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`grid gap-6 md:gap-8 ${theaterMode ? 'grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                            {displayedContent.length > 0 ? displayedContent.map(c => (
                                <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden hover:scale-[1.02] transition-all group flex flex-col lg:flex-row h-auto lg:min-h-[14rem] cursor-pointer shadow-2xl" onClick={() => handleViewContent(c)}>
                                    <div className="w-full lg:w-80 aspect-video lg:aspect-auto bg-black relative shrink-0 overflow-hidden">
                                        <img src={c.thumbnailUrl || '/api/placeholder/400/225'} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />
                                    </div>
                                    <div className="p-6 lg:p-10 flex flex-col justify-between flex-1 min-w-0">
                                        <div className="space-y-4">
                                            <h4 className="text-base lg:text-3xl font-black text-white uppercase tracking-tight leading-none group-hover:text-blue-400 transition-colors line-clamp-2">{c.title}</h4>
                                            <p className="hidden lg:block text-sm text-gray-500 line-clamp-2 font-medium leading-relaxed">{c.description}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-8 pt-8 border-t border-white/5">
                                            <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] ${c.type === 'Video' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'bg-blue-600/10 text-blue-500 border border-blue-500/20'}`}>{c.type}</span>
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{new Date(c.uploadDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-40 text-center border border-dashed border-white/10 rounded-[4rem] bg-white/[0.01]">
                                    <Monitor size={60} className="mx-auto text-white/5 mb-8" />
                                    <h4 className="text-xl font-black text-white/40 uppercase tracking-[0.5em]">Nothing Found</h4>
                                    <p className="text-gray-600 text-[11px] font-black uppercase mt-6 tracking-[0.3em]">No materials match this specific academic path</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* VIEWER MODAL */}
            {viewingContent && (
                <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
                    <div className="flex items-center justify-between px-8 py-6 bg-[#0a0a0a] border-b border-white/5 shadow-2xl">
                        <button onClick={() => setViewingContent(null)} className="flex items-center gap-6 text-gray-400 hover:text-white transition-all group">
                            <ArrowLeft size={28} className="group-hover:-translate-x-2 transition-transform" />
                            <div className="space-y-1">
                                <h2 className="text-sm md:text-xl font-black text-white uppercase tracking-tight leading-none">{viewingContent.title}</h2>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{tutor?.name} • Official Resource</p>
                            </div>
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-black relative">
                        {viewingContent.type === 'Video' ? (
                            <div className="w-full h-full max-w-7xl mx-auto flex items-center p-4">
                                <CustomVideoPlayer src={viewingContent.url || ''} className="w-full aspect-video rounded-3xl shadow-[0_0_100px_rgba(37,99,235,0.2)]" />
                            </div>
                        ) : (
                            <iframe src={viewingContent.url} className="w-full h-full" title="Document Viewer" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
