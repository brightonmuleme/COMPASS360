"use client";

import { useSchoolData, TutorContent, CourseUnit, Programme } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    Plus, Trash2, FileText, Video, HelpCircle, ArrowLeft, Play, Download, Eye,
    ChevronDown, ChevronRight, Check, Settings, BookOpen, MoreVertical, X,
    Save, ArrowRight, Upload, Pause, SkipBack, SkipForward, Monitor, Volume2,
    VolumeX, Image as ImageIcon, Camera, Heart, Pin
} from "lucide-react";

// --- CUSTOM VIDEO PLAYER (Reused) ---
const CustomVideoPlayer = ({ src, poster, className, autoPlay }: { src: string, poster?: string, className?: string, autoPlay?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay || false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (autoPlay) vid.play().catch(() => setIsPlaying(false));

        const updateProgress = () => {
            if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
        };
        const updateDuration = () => setDuration(vid.duration);
        const onEnd = () => setIsPlaying(false);

        vid.addEventListener('timeupdate', updateProgress);
        vid.addEventListener('loadedmetadata', updateDuration);
        vid.addEventListener('ended', onEnd);

        return () => {
            vid.removeEventListener('timeupdate', updateProgress);
            vid.removeEventListener('loadedmetadata', updateDuration);
            vid.removeEventListener('ended', onEnd);
        };
    }, [autoPlay]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
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
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:scale-110 transition-transform">
                        <Play size={32} className="text-white fill-white ml-2" />
                    </div>
                </div>
            )}
            {/* Simple Controls for Shared View */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 z-20">
                <button onClick={togglePlay} className="text-white hover:text-blue-400"><Play size={20} fill={isPlaying ? "none" : "currentColor"} className={isPlaying ? "hidden" : ""} /><Pause size={20} fill="currentColor" className={!isPlaying ? "hidden" : ""} /></button>
                <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                </div>
                <button onClick={toggleFullscreen} className="text-white hover:text-blue-400"><Monitor size={20} /></button>
            </div>
        </div>
    );
};

type ContentType = 'Home' | 'Note' | 'Video' | 'Question';

interface SharedContentLibraryProps {
    tutorId: string;
    readOnly?: boolean;
    className?: string; // Allow custom styling/height
}

export default function SharedContentLibrary({ tutorId, readOnly = true, className }: SharedContentLibraryProps) {
    const {
        programmes,
        courseUnits,
        tutorContents,
        studentProfile, // For Like status
        tutorProfile,
        developerProfile,
        toggleStudentLike
    } = useSchoolData();

    // --- STATES ---
    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);
    const [activeTab, setActiveTab] = useState<ContentType>('Home');
    const [selectedProg, setSelectedProg] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
    const [selectedCU, setSelectedCU] = useState<string | null>(null);

    // Filter contents for THIS tutor
    const myContents = useMemo(() => tutorContents.filter(c => c.tutorId === tutorId), [tutorContents, tutorId]);

    const repoLevels = useMemo(() => {
        const levels = new Set<string>();
        // Only consider levels present in this tutor's content OR programmes
        // Simplified: use all levels from all programmes
        programmes.forEach(p => {
            if (p.levels) p.levels.forEach(l => levels.add(l));
            else['Year 1', 'Year 2', 'Year 3'].forEach(l => levels.add(l));
        });
        return Array.from(levels).sort();
    }, [programmes]);

    const availableCourseUnits = useMemo(() => {
        let filtered = courseUnits; // Globally available CUs (assuming standardized)
        if (selectedProg) filtered = filtered.filter(cu => cu.programmeId === selectedProg);
        return filtered;
    }, [courseUnits, selectedProg]);

    const displayedContent = useMemo(() => {
        let content = myContents;

        // Draft visibility check: Hide from others unless developer/owner
        content = content.filter(c => {
            if (c.status === 'Draft') {
                return !!developerProfile || (tutorProfile?.id === tutorId);
            }
            return true;
        });

        if (activeTab === 'Home') return content;

        // 1. Filter by Type
        content = content.filter(c => c.type === activeTab);

        // 2. Filter by Course Unit 
        if (selectedCU) {
            content = content.filter(c => c.courseUnitIds?.includes(selectedCU) || c.courseUnitId === selectedCU);
        } else {
            // 3. Filter by Programme
            if (selectedProg) {
                const progCUs = courseUnits.filter(cu => cu.programmeId === selectedProg).map(cu => cu.id);
                content = content.filter(c => {
                    const isTaggedWithProg = c.programmeIds?.includes(selectedProg) || c.programmeId === selectedProg;
                    const hasProgCU = c.courseUnitIds?.some(id => progCUs.includes(id)) || progCUs.includes(c.courseUnitId || '');
                    return isTaggedWithProg || hasProgCU;
                });
            }
            // 4. Filter by Level
            if (selectedLevel && selectedLevel !== 'All Levels') {
                content = content.filter(c => {
                    const isTaggedLevel = c.levels?.includes(selectedLevel) || c.level === selectedLevel;
                    // Weak check for CU level
                    return isTaggedLevel;
                });
            }
        }
        return content;
    }, [myContents, activeTab, selectedCU, selectedProg, selectedLevel, courseUnits]);

    const homeContent = useMemo(() => {
        return [...myContents].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    }, [myContents]);

    const featuredContent = useMemo(() => {
        const featured = myContents.find(c => c.isFeatured);
        if (featured) return featured;
        // Fallback: Most recent upload
        return homeContent[0];
    }, [homeContent, myContents]);

    const handleViewContent = (c: TutorContent) => {
        setViewingContent(c);
    };

    const handleLike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (readOnly && toggleStudentLike) {
            toggleStudentLike(id);
        }
    };

    return (
        <div className={`text-gray-100 ${className || ''}`}>

            {/* Filters & Search (Only visible on non-Home tabs) */}
            <div className={`transition-all duration-300 ${activeTab === 'Home' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto mb-6'}`}>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group">
                        <select
                            className="appearance-none bg-gray-900 border border-gray-700 text-gray-200 pl-4 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-medium min-w-[200px] hover:border-gray-600 transition-colors cursor-pointer"
                            value={selectedProg}
                            onChange={e => { setSelectedProg(e.target.value); setSelectedLevel('All Levels'); setSelectedCU(null); }}
                        >
                            <option value="">All Programmes</option>
                            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-200" />
                    </div>

                    <div className="h-8 w-px bg-gray-700 hidden md:block" />

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        <button
                            onClick={() => { setSelectedLevel('All Levels'); setSelectedCU(null); }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${selectedLevel === 'All Levels' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                        >
                            All Levels
                        </button>
                        {repoLevels.map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => { setSelectedLevel(lvl); setSelectedCU(null); }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${selectedLevel === lvl ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-800 pb-1 overflow-x-auto scrollbar-hide">
                {(['Home', 'Note', 'Video', 'Question'] as ContentType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => { setActiveTab(type); setSelectedCU(null); }}
                        className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === type
                            ? 'text-blue-400 border-b-2 border-blue-500 bg-gradient-to-t from-blue-500/10 to-transparent'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        {type === 'Home' && <div className="mr-1">🏠</div>}
                        {type === 'Note' && <FileText size={16} />}
                        {type === 'Video' && <Play size={16} />}
                        {type === 'Question' && <HelpCircle size={16} />}
                        {type === 'Home' && 'HOME'}
                        {type === 'Note' && 'NOTES'}
                        {type === 'Video' && 'VIDEOS'}
                        {type === 'Question' && 'QUESTIONS'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'Home' ? (
                <div className="animate-fade-in space-y-8">
                    {/* Featured / Home Logic */}
                    {featuredContent && (
                        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="grid md:grid-cols-2 gap-0">
                                <div className="aspect-video bg-black relative group overflow-hidden">
                                    {featuredContent.type === 'Video' ? (
                                        <CustomVideoPlayer
                                            src={featuredContent.url || ''}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                            <div className="text-center">
                                                <FileText size={64} className="text-gray-700 mb-4 mx-auto" />
                                                <span className="text-xl font-bold text-gray-400 block max-w-xs truncate px-4">{featuredContent.title}</span>
                                            </div>
                                        </div>
                                    )}
                                    {featuredContent.isFeatured && <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow">FEATURED</div>}
                                </div>
                                <div className="p-8 flex flex-col justify-center">
                                    <div className="flex gap-2 mb-4">
                                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded uppercase tracking-wider">{featuredContent.type}</span>
                                        <span className="px-2 py-0.5 text-xs font-bold bg-gray-800 text-gray-400 rounded border border-gray-700">{new Date(featuredContent.uploadDate).toLocaleDateString()}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2">{featuredContent.title}</h2>
                                    <p className="text-gray-400 mb-6 line-clamp-3">{featuredContent.description}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleViewContent(featuredContent)}
                                            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            View Content
                                        </button>
                                        {!readOnly && (
                                            <button className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
                                                Unpin
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Grid */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-blue-500 rounded-full" />
                            Recent Uploads
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {homeContent.slice(0, 8).map(c => {
                                const isLiked = studentProfile?.likedContentIds?.includes(c.id);
                                return (
                                    <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all group relative cursor-pointer" onClick={() => handleViewContent(c)}>
                                        <div className="aspect-video bg-gray-950 relative">
                                            {c.type === 'Video' ? (
                                                <div onClick={e => e.stopPropagation()} className="w-full h-full">
                                                    <CustomVideoPlayer src={c.url || ''} className="w-full h-full" />
                                                </div>
                                            ) : c.thumbnailUrl ? (
                                                <div className="w-full h-full relative group">
                                                    <img src={c.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                                    {c.type === 'Note' ? <FileText size={32} className="text-gray-700 group-hover:text-blue-500 transition-colors" /> : <HelpCircle size={32} className="text-gray-700 group-hover:text-blue-500 transition-colors" />}
                                                </div>
                                            )}
                                            {readOnly && (
                                                <div className="absolute top-2 right-2 flex gap-1 z-10">
                                                    <button
                                                        onClick={(e) => handleLike(e, c.id)}
                                                        className="flex items-center gap-1 p-1.5 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500/80 transition-colors group/like"
                                                    >
                                                        <Heart size={12} className={`fill-current text-white/80 group-hover/like:text-white ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                                                        <span className="text-[10px] font-bold">{c.likes || 0}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {c.isFeatured && (
                                                <div className="absolute top-2 left-2 z-10">
                                                    <div className="p-1 rounded bg-amber-500 text-black">
                                                        <Pin size={12} className="fill-current" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-gray-200 mb-1 line-clamp-1">{c.title}</h4>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                                            <div className="flex justify-between items-center text-xs text-gray-600 font-mono">
                                                <span>{c.type}</span>
                                                <span>{new Date(c.uploadDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                // LIST VIEW (With Filter Logic)
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-64 shrink-0 space-y-2">
                        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl sticky top-4">
                            <h3 className="font-bold text-gray-300 mb-4 px-2">Course Units</h3>
                            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <button
                                    onClick={() => setSelectedCU(null)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCU ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    All Units
                                </button>
                                {availableCourseUnits.map(cu => (
                                    <button
                                        key={cu.id}
                                        onClick={() => setSelectedCU(cu.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors line-clamp-1 ${selectedCU === cu.id ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:bg-white/5'}`}
                                        title={cu.name}
                                    >
                                        {cu.code} - {cu.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {/* Content Grid */}
                        <div className="flex flex-col gap-4">
                            {displayedContent.length > 0 ? displayedContent.map(c => {
                                const isLiked = studentProfile?.likedContentIds?.includes(c.id);
                                return (
                                    <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all group flex flex-col sm:flex-row h-auto sm:h-48 cursor-pointer" onClick={() => handleViewContent(c)}>
                                        {/* Thumbnail Section */}
                                        <div className="w-full sm:w-72 bg-gray-950 relative shrink-0">
                                            {c.type === 'Video' ? (
                                                <div onClick={e => e.stopPropagation()} className="w-full h-full">
                                                    <CustomVideoPlayer src={c.url || ''} className="w-full h-full" />
                                                </div>
                                            ) : c.thumbnailUrl ? (
                                                <img src={c.thumbnailUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-950">
                                                    {c.type === 'Question' ? <HelpCircle size={40} className="text-gray-700" /> : <FileText size={40} className="text-gray-700" />}
                                                </div>
                                            )}
                                            {readOnly && (
                                                <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleLike(e, c.id)}
                                                        className="flex items-center gap-1 p-1.5 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500/80 transition-colors"
                                                    >
                                                        <Heart size={14} className={`fill-current text-white/80 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                                                        <span className="text-xs font-bold">{c.likes || 0}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Details Section */}
                                        <div className="p-5 flex flex-col flex-1 min-w-0">
                                            <h4 className="text-lg font-bold text-gray-200 mb-1 leading-tight group-hover:text-blue-400 transition-colors">{c.title}</h4>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {c.levels?.map(lvl => <span key={lvl} className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">{lvl}</span>)}
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-auto">{c.description}</p>
                                            <div className="flex justify-between items-center mt-4 border-t border-gray-800 pt-3">
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${c.type === 'Video' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{c.type}</span>
                                                <span className="text-xs text-gray-600">{new Date(c.uploadDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="col-span-full py-20 text-center text-gray-500">No content found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewingContent && (
                <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewingContent(null)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">{viewingContent.title}</h2>
                                <span className="text-xs text-gray-500">{viewingContent.type} • {new Date(viewingContent.uploadDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-black flex items-center justify-center relative">
                        {viewingContent.type === 'Video' ? (
                            <div className="w-full h-full max-w-6xl mx-auto flex items-center">
                                <CustomVideoPlayer src={viewingContent.url || ''} className="w-full aspect-video" />
                            </div>
                        ) : viewingContent.type === 'Note' || viewingContent.type === 'Question' ? (
                            (viewingContent.url?.endsWith('.pdf') || viewingContent.type === 'Note') ? (
                                <iframe src={viewingContent.url} className="w-full h-full" title="Document Viewer" />
                            ) : (
                                <img src={viewingContent.url || ''} className="max-w-full max-h-full object-contain" />
                            )
                        ) : (
                            <div className="text-center text-gray-500">
                                <FileText size={64} className="mx-auto mb-4 opacity-50" />
                                <p>Preview not available</p>
                                <a href={viewingContent.url} target="_blank" rel="noreferrer" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">Download</a>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
