"use client";

import { useSchoolData, TutorContent, TutorSettings, Programme, CourseUnit } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, FileText, Video, HelpCircle, ArrowLeft, Play, Download, Eye, Pencil, ChevronDown, ChevronRight, Check, Settings, BookOpen, MoreVertical, X, Save, ArrowRight, Upload, Pause, SkipBack, SkipForward, Monitor, Volume2, VolumeX, Image as ImageIcon, Camera, Heart, Pin } from "lucide-react";
// Helper to generate PDF thumbnail
const generatePDFThumbnail = async (file: File): Promise<string | null> => {
    try {
        // Dynamic import to avoid SSR issues with canvas/DOMMatrix
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport: viewport } as any).promise;
            return canvas.toDataURL();
        }
    } catch (error) {
        console.error("Error generating PDF thumbnail:", error);
    }
    return null;
};

// --- CUSTOM VIDEO PLAYER COMPONENT ---
const CustomVideoPlayer = ({ src, poster, className }: { src: string, poster?: string, className?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const updateProgress = () => {
            if (vid.duration) {
                setProgress((vid.currentTime / vid.duration) * 100);
            }
        };

        const updateDuration = () => setDuration(vid.duration);
        const onEnd = () => setIsPlaying(false);
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        vid.addEventListener('timeupdate', updateProgress);
        vid.addEventListener('loadedmetadata', updateDuration);
        vid.addEventListener('ended', onEnd);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            vid.removeEventListener('timeupdate', updateProgress);
            vid.removeEventListener('loadedmetadata', updateDuration);
            vid.removeEventListener('ended', onEnd);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);

    const togglePlay = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current && containerRef.current) {
            if (!isFullscreen) {
                // If not fullscreen, request it then play
                try {
                    await containerRef.current.requestFullscreen();
                } catch (err) {
                    console.error("Fullscreen request failed", err);
                }
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                // Determine logic: toggle play/pause?
                if (isPlaying) videoRef.current.pause();
                else videoRef.current.play();
                setIsPlaying(!isPlaying);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current && videoRef.current.duration) {
            videoRef.current.currentTime = (val / 100) * videoRef.current.duration;
            setProgress(val);
        }
    };

    const skip = (seconds: number) => {
        if (videoRef.current) videoRef.current.currentTime += seconds;
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const formatTime = (seconds: number) => {
        if (!seconds) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleMouseEnter = () => {
        if (isFullscreen) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }
    };

    const handleMouseLeave = () => {
        if (isFullscreen && isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative group bg-black overflow-hidden ${className || ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                poster={poster}
            />

            {/* Play Overlay (Visible when NOT fullscreen OR when paused) */}
            {(!isFullscreen || !isPlaying) && (
                <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity z-20 cursor-pointer`}
                    onClick={togglePlay}
                >
                    <button
                        className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md transform hover:scale-110 transition-all border border-white/20 shadow-2xl"
                    >
                        <Play size={32} className="text-white fill-white ml-2" />
                    </button>
                    {!isFullscreen && (
                        <span className="absolute bottom-4 text-white text-xs font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">Click to Watch</span>
                    )}
                </div>
            )}

            {/* Custom Controls Bar - ONLY IN FULLSCREEN */}
            {isFullscreen && (
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-8 py-6 transition-transform duration-300 z-30 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Progress Bar */}
                    <div className="relative group/progress h-1.5 bg-gray-600 rounded-full mb-6 cursor-pointer">
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `${progress}%` }} />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <div className="flex justify-between items-center text-white">
                        <div className="flex items-center gap-6">
                            <button onClick={(e) => { e.stopPropagation(); togglePlay(e); }} className="hover:text-red-500 transition-colors">
                                {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current" />}
                            </button>

                            <div className="flex items-center gap-4">
                                <button onClick={() => skip(-10)} className="hover:text-gray-300 transition-colors"><SkipBack size={24} /></button>
                                <button onClick={() => skip(10)} className="hover:text-gray-300 transition-colors"><SkipForward size={24} /></button>
                            </div>

                            <div className="flex items-center gap-2 group/vol ml-4">
                                <button onClick={toggleMute} className="hover:text-gray-300 transition-colors">
                                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                </button>
                            </div>

                            <span className="text-sm font-medium text-gray-300 ml-4">
                                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold tracking-tight text-white/90">NETFLIX</span>
                            <button onClick={() => document.exitFullscreen()} className="hover:text-gray-300 transition-colors"><Monitor size={24} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

type ContentType = 'Home' | 'Note' | 'Video' | 'Question';

type ViewMode = 'courses' | 'content' | 'programme-config';

// --- CONTENT VIEWER COMPONENT ---
const ContentViewer = ({ content, onClose, onMinimize }: { content: TutorContent, onClose: () => void, onMinimize: () => void }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">{content.title}</h2>
                        <span className="text-xs text-gray-500">{content.type} • {new Date(content.uploadDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onMinimize} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">Minimize</button>
                </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center relative">
                {content.type === 'Video' ? (
                    <div className="w-full h-full max-w-6xl mx-auto flex items-center">
                        <CustomVideoPlayer src={content.url || ''} className="w-full aspect-video" />
                    </div>
                ) : content.type === 'Note' || content.type === 'Question' ? (
                    // For Images/PDFs
                    (content.url?.endsWith('.pdf') || content.type === 'Note') ? (
                        <iframe src={content.url} className="w-full h-full" title="Document Viewer" />
                    ) : (
                        <img src={content.url || ''} className="max-w-full max-h-full object-contain" />
                    )
                ) : (
                    <div className="text-center text-gray-500">
                        <FileText size={64} className="mx-auto mb-4 opacity-50" />
                        <p>Preview not available</p>
                        <a href={content.url} target="_blank" rel="noreferrer" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">Download</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function DeveloperLibrary() {
    const {
        programmes,
        courseUnits,
        tutorContents,
        addTutorContent,
        deleteTutorContent,
        updateTutorContent,
        tutorSettings,
        updateTutorSettings,
        addProgramme,
        updateProgramme,
        deleteProgramme,
        addCourseUnit,
        updateCourseUnit,
        deleteCourseUnit
    } = useSchoolData();

    // --- STATES ---
    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);
    const [minimizedContent, setMinimizedContent] = useState<TutorContent | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('content');
    const [activeTab, setActiveTab] = useState<ContentType>('Home');
    const [selectedProg, setSelectedProg] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
    const [selectedCU, setSelectedCU] = useState<string | null>(null);

    // Profile State
    const [tutorProfile, setTutorProfile] = useState<{
        name: string;
        bio: string;
        coverImage: string;
        profileImage: string;
        pinnedContentId: string | null;
    }>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('developer_profile_v1');
            return saved ? JSON.parse(saved) : {
                name: 'VINE Developer',
                bio: 'Official App Resources & Content',
                coverImage: '',
                profileImage: '',
                pinnedContentId: null
            };
        }
        return { name: 'VINE Developer', bio: 'Official App Resources & Content', coverImage: '', profileImage: '', pinnedContentId: null };
    });
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForm, setProfileForm] = useState(tutorProfile);

    // Persist Profile
    const updateProfile = (newProfile: typeof tutorProfile) => {
        setTutorProfile(newProfile);
        localStorage.setItem('developer_profile_v1', JSON.stringify(newProfile));
    };

    // --- STATES (Restored) ---
    // Configuration View State
    const [configProgId, setConfigProgId] = useState<string>(''); // For configuration view
    const [configLevel, setConfigLevel] = useState<string>(''); // Currently selected level tab
    const [configExpandedSection, setConfigExpandedSection] = useState<string | null>('course-units');

    // Level Renaming State
    const [renamingLevel, setRenamingLevel] = useState<string | null>(null);
    const [newLevelName, setNewLevelName] = useState<string>('');

    // CU Add/Edit State
    const [isCUModalOpen, setIsCUModalOpen] = useState(false);
    const [editingCUId, setEditingCUId] = useState<string | null>(null);
    const [cuForm, setCuForm] = useState({ name: '', code: '' });

    // Programme Add/Edit State
    const [isProgModalOpen, setIsProgModalOpen] = useState(false);
    const [editingProgId, setEditingProgId] = useState<string | null>(null);
    const [progForm, setProgForm] = useState<{ name: string, code: string, type: 'Degree' | 'Diploma' | 'Certificate', duration: string }>({ name: '', code: '', type: 'Degree', duration: '3 Years' });

    const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
    const drafts = tutorContents.filter(c => c.status === 'Draft');

    // Upload & Preview State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState<'file' | 'details'>('file');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<TutorContent | null>(null);

    // Local Mock for Tutor Assignments
    const [taughtCUs, setTaughtCUs] = useState<string[]>([]);

    // Complex Upload Form State
    const [uploadForm, setUploadForm] = useState<{
        title: string;
        description: string;
        url: string;
        courseUnitId?: string;
        status?: 'Published' | 'Draft';
        thumbnailUrl?: string; // Cover Image for Notes/Questions
        uploadDate: string;
        file?: File | null;
        thumbnailFile?: File | null; // New field for Cover Image
        fileType: 'Note' | 'Video' | 'Question';
        // Mapping: ProgrammeId -> Array of Level Names
        selectedProgrammes: Record<string, string[]>;
        selectedCUIds: string[];
    }>({
        title: '',
        description: '',
        url: '',
        file: null,
        fileType: 'Note',
        selectedProgrammes: {},
        selectedCUIds: [],
        status: 'Published',
        uploadDate: new Date().toISOString()
    });

    // Helper to reset upload form
    const resetUploadForm = () => {
        setUploadForm({
            title: '',
            description: '',
            url: '',
            file: null,
            fileType: 'Note',
            selectedProgrammes: {},
            selectedCUIds: [],
            status: 'Published',
            uploadDate: new Date().toISOString()
        });
        setUploadStep('file');
        setEditingId(null);
    };
    const currentTutorId = "admin_main";

    const configProgramme = useMemo(() => programmes.find(p => p.id === configProgId), [programmes, configProgId]);

    const activeLevels = useMemo(() => {
        if (!configProgramme) return [];
        return configProgramme.levels && configProgramme.levels.length > 0
            ? configProgramme.levels
            : ['Year 1', 'Year 2', 'Year 3'];
    }, [configProgramme]);

    if (viewMode === 'programme-config' && configProgramme && !configLevel && activeLevels.length > 0) {
        setConfigLevel(activeLevels[0]);
    }

    const configCourseUnits = useMemo(() => {
        if (!configProgId) return [];
        return courseUnits.filter(cu => cu.programmeId === configProgId && cu.level === configLevel);
    }, [courseUnits, configProgId, configLevel]);

    const repoLevels = useMemo(() => {
        if (selectedProg) {
            const p = programmes.find(prog => prog.id === selectedProg);
            return p?.levels && p.levels.length > 0 ? p.levels : ['Year 1', 'Year 2', 'Year 3'];
        }
        const allLevels = new Set<string>();
        programmes.forEach(p => {
            if (p.levels && p.levels.length > 0) p.levels.forEach(l => allLevels.add(l));
            else['Year 1', 'Year 2', 'Year 3'].forEach(l => allLevels.add(l));
        });
        if (allLevels.size === 0) return ['Year 1', 'Year 2', 'Year 3'];
        return Array.from(allLevels).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [programmes, selectedProg]);

    const availableCourseUnits = useMemo(() => {
        let filtered = courseUnits;
        if (selectedProg) filtered = filtered.filter(cu => cu.programmeId === selectedProg);
        // Level filtering is handled by map grouping
        return filtered;
    }, [courseUnits, selectedProg]);

    const displayedContent = useMemo(() => {
        let content = tutorContents;
        if (activeTab === 'Home') return content; // Home handles own filtering (Recent Uploads)

        // 1. Filter by Type (Video, Note, Question)
        content = content.filter(c => c.type === activeTab);

        // 2. Filter by Course Unit (Strongest Filter)
        if (selectedCU) {
            content = content.filter(c => c.courseUnitIds?.includes(selectedCU) || c.courseUnitId === selectedCU);
        }
        else {
            // 3. Filter by Programme (if no CU selected)
            if (selectedProg) {
                // Logic: Content must be tagged with this Programme ID OR have a CU belonging to this Programme
                const progCUs = courseUnits.filter(cu => cu.programmeId === selectedProg).map(cu => cu.id);

                content = content.filter(c => {
                    const isTaggedWithProg = c.programmeIds?.includes(selectedProg) || c.programmeId === selectedProg;
                    const hasProgCU = c.courseUnitIds?.some(id => progCUs.includes(id)) || progCUs.includes(c.courseUnitId || '');
                    return isTaggedWithProg || hasProgCU;
                });
            }

            // 4. Filter by Level (if no CU selected, but applies on top of Prog or Global)
            if (selectedLevel && selectedLevel !== 'All Levels') {
                content = content.filter(c => {
                    // Check direct level tag
                    const isTaggedLevel = c.levels?.includes(selectedLevel) || c.level === selectedLevel;
                    // Check CU level (if content has CUs, check if any of those CUs belong to this level)
                    // Note: CUs have a 'level' property.
                    // If content is linked to a CU, does that imply the content is for that level? Generally yes.
                    // But usually content tagged deeply with CU might not explicitly be tagged with Level.
                    // Let's assume explicit tagging for now or inferred from CUs.

                    const linkedCUs = courseUnits.filter(cu => c.courseUnitIds?.includes(cu.id) || c.courseUnitId === cu.id);
                    const hasCULevel = linkedCUs.some(cu => cu.level === selectedLevel);

                    return isTaggedLevel || hasCULevel;
                });
            }
        }

        return content;
    }, [tutorContents, activeTab, selectedCU, selectedProg, selectedLevel, courseUnits]);

    const homeContent = useMemo(() => {
        return [...tutorContents].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    }, [tutorContents]);

    // --- DERIVED STATE ---
    const featuredContent = useMemo(() => {
        // 1. Priority: Explicitly featured/pinned content via isFeatured flag
        const featured = tutorContents.find(c => c.isFeatured);
        if (featured) return featured;

        // 2. Legacy: content pinned via profile ID
        if (tutorProfile.pinnedContentId) return tutorContents.find(c => c.id === tutorProfile.pinnedContentId);

        // 3. Fallback: Most recent upload
        return homeContent[0];
    }, [homeContent, tutorProfile.pinnedContentId, tutorContents]);

    // --- FUNCTIONS ---

    const handleRenameStart = (lvl: string) => { setRenamingLevel(lvl); setNewLevelName(lvl); };
    const handleRenameSave = () => {
        if (!configProgramme || !renamingLevel || !newLevelName.trim()) { setRenamingLevel(null); return; }
        if (newLevelName === renamingLevel) { setRenamingLevel(null); return; }
        const updatedLevels = activeLevels.map(l => l === renamingLevel ? newLevelName : l);
        updateProgramme({ ...configProgramme, levels: updatedLevels });
        courseUnits.forEach(cu => {
            if (cu.programmeId === configProgramme.id && cu.level === renamingLevel) updateCourseUnit({ ...cu, level: newLevelName });
        });
        setConfigLevel(newLevelName);
        setRenamingLevel(null);
    };

    const openAddProgModal = () => { setEditingProgId(null); setProgForm({ name: '', code: '', type: 'Degree', duration: '3 Years' }); setIsProgModalOpen(true); };
    const openEditProgModal = (p: Programme) => { setEditingProgId(p.id); setProgForm({ name: p.name, code: p.code, type: p.type as any, duration: p.duration }); setIsProgModalOpen(true); };
    const handleSaveProgramme = () => {
        if (!progForm.name) return;
        if (editingProgId) {
            const existing = programmes.find(p => p.id === editingProgId);
            if (existing) updateProgramme({ ...existing, ...progForm });
        } else {
            addProgramme({ id: Date.now().toString(), ...progForm, levels: ['Year 1', 'Year 2', 'Year 3'], feeStructure: [], documents: {} });
        }
        setIsProgModalOpen(false);
    };
    const handleDeleteProgramme = () => { if (editingProgId) deleteProgramme(editingProgId); setIsProgModalOpen(false); };

    const openAddCUModal = () => { setEditingCUId(null); setCuForm({ name: '', code: '' }); setIsCUModalOpen(true); };
    const openEditCUModal = (cu: CourseUnit) => { setEditingCUId(cu.id); setCuForm({ name: cu.name, code: cu.code }); setIsCUModalOpen(true); };
    const handleSaveCU = () => {
        if (!configProgramme || !cuForm.name) return;
        if (editingCUId) {
            const existing = courseUnits.find(c => c.id === editingCUId);
            if (existing) updateCourseUnit({ ...existing, name: cuForm.name, code: cuForm.code });
        } else {
            addCourseUnit({ id: Date.now().toString(), programmeId: configProgramme.id, name: cuForm.name, code: cuForm.code || `${configProgramme.code}-CU-${Date.now()}`, level: configLevel, creditUnits: 3, type: 'Core', semester: 'I' });
        }
        setIsCUModalOpen(false);
    };

    const handleUpload = () => {
        if ((!uploadForm.file && !uploadForm.url) || !uploadForm.title) return;

        // Flatten Programme & Level Selection
        const programmeIds = Object.keys(uploadForm.selectedProgrammes);
        const levels = Object.values(uploadForm.selectedProgrammes).flat();

        const contentData: TutorContent = {
            id: editingId || `tc_${Date.now()}`,
            tutorId: currentTutorId,
            title: uploadForm.title,
            description: uploadForm.description,
            type: uploadForm.fileType,
            // Generate Blob URL if file exists, otherwise use provided URL
            url: uploadForm.file ? URL.createObjectURL(uploadForm.file) : uploadForm.url,
            // Use new array fields
            programmeIds: programmeIds,
            levels: levels,
            courseUnitIds: uploadForm.selectedCUIds,
            uploadDate: new Date().toISOString(),
            status: uploadForm.status,
            thumbnailUrl: uploadForm.thumbnailFile ? URL.createObjectURL(uploadForm.thumbnailFile) : uploadForm.thumbnailUrl,
            likes: editingId ? undefined : 0 // Initialize likes for new content
        };

        if (editingId) {
            updateTutorContent(contentData);
        } else {
            addTutorContent(contentData);
        }
        setIsUploadModalOpen(false);
        resetUploadForm();
    };

    const openUploadModal = () => {
        resetUploadForm();
        setIsUploadModalOpen(true);
    };

    const openEditModal = (content: TutorContent) => {
        setEditingId(content.id);

        // Reconstruct selectedProgrammes map (Simplified reconstruction)
        // In a real app, we'd need more logic to map levels back to specific programmes accurately 
        // if levels share names across programmes. For now, assuming uniqueness or simple mapping.
        const progMap: Record<string, string[]> = {};
        if (content.programmeIds) {
            content.programmeIds.forEach(pid => {
                // Try to guess which levels belong to this prog from the content.levels array
                // This is imperfect without storing the map structure directly, but sufficient for now.
                const prog = programmes.find(p => p.id === pid);
                if (prog && content.levels) {
                    const relevantLevels = content.levels.filter(lvl => prog.levels?.includes(lvl));
                    progMap[pid] = relevantLevels;
                } else {
                    progMap[pid] = [];
                }
            });
        }

        setUploadForm({
            title: content.title,
            description: content.description,
            url: content.url || '',
            file: null, // Reset file input on edit
            fileType: content.type,
            selectedProgrammes: progMap,
            selectedCUIds: content.courseUnitIds || [],
            status: content.status || 'Published',
            uploadDate: content.uploadDate || new Date().toISOString()
        });
        setUploadStep('details'); // Jump to details view
        setIsUploadModalOpen(true);
    };

    const deleteContent = (id: string) => {
        if (confirm("Are you sure you want to delete this content?")) {
            deleteTutorContent(id);
        }
    }

    const toggleLike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const content = tutorContents.find(c => c.id === id);
        if (content) {
            // Simple toggle mock: random increment or decrement to simulate user interaction
            // In real app, this would be an API call and check user's like status
            const newLikes = (content.likes || 0) + 1;
            updateTutorContent({ ...content, likes: newLikes });
        }
    };

    const togglePin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const content = tutorContents.find(c => c.id === id);
        if (content) {
            // Toggle isFeatured
            updateTutorContent({ ...content, isFeatured: !content.isFeatured });

            // Sync with profile pinned ID for legacy/compatibility if needed, 
            // but primarily rely on isFeatured flag now.
            // If we pin this, we can also set it as the profile pinned ID for immediate hero display
            if (!content.isFeatured) {
                setTutorProfile(prev => ({ ...prev, pinnedContentId: id }));
            } else if (tutorProfile.pinnedContentId === id) {
                setTutorProfile(prev => ({ ...prev, pinnedContentId: null }));
            }
        }
    };

    const handleViewContent = (content: TutorContent) => {
        // Increment view count
        const newViews = (content.views || 0) + 1;
        updateTutorContent({ ...content, views: newViews });
        setViewingContent(content);
    };

    const handleAddLevel = () => {
        const name = prompt("Enter new level name (e.g., 'Year 4'):");
        if (name && configProgramme) {
            const levels = configProgramme.levels || [];
            if (!levels.includes(name)) {
                updateProgramme({ ...configProgramme, levels: [...levels, name] });
                setConfigLevel(name);
            }
        }
    };

    const handleDeleteLevel = (level: string) => {
        if (confirm(`Are you sure you want to delete ${level}? Types associated with this level will need to be reassigned.`)) {
            if (configProgramme) {
                const newLevels = (configProgramme.levels || []).filter(l => l !== level);
                updateProgramme({ ...configProgramme, levels: newLevels });
                if (newLevels.length > 0) setConfigLevel(newLevels[0]);
                else setConfigLevel('');
            }
        }
    };

    const toggleTaughtCU = (id: string) => setTaughtCUs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const getCUName = (id: string | null) => {
        if (!id) return '';
        const cu = courseUnits.find(c => c.id === id);
        return cu ? cu.name : id;
    };




    return (
        <div className="min-h-screen pb-20 bg-[#050505] text-gray-100">
            {/* Header / Profile Section */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                {/* Cover Image */}
                <div className="absolute inset-0 bg-gray-900">
                    {tutorProfile.coverImage ? (
                        <img src={tutorProfile.coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-900/40 to-purple-900/40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-6">
                        {/* Profile Image */}
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#050505] overflow-hidden bg-gray-800 shadow-2xl relative z-10">
                                {tutorProfile.profileImage ? (
                                    <img src={tutorProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-600 bg-gray-900">
                                        {tutorProfile.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsProfileModalOpen(true)}
                                className="absolute bottom-2 right-2 z-20 bg-blue-600 p-2 rounded-full text-white shadow-lg hover:bg-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Edit Profile"
                            >
                                <Pencil size={16} />
                            </button>
                        </div>

                        <div className="flex-1 mb-2">
                            <h1 className="text-4xl font-bold text-white mb-2">{tutorProfile.name}</h1>
                            <p className="text-gray-400 max-w-2xl text-lg">{tutorProfile.bio}</p>
                        </div>

                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={() => setIsDraftsModalOpen(true)}
                                className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold border border-gray-700 transition-all flex items-center gap-2 hover:border-gray-500"
                            >
                                <FileText size={20} />
                                <span>Drafts {drafts.length > 0 && `(${drafts.length})`}</span>
                            </button>
                            <button
                                onClick={openUploadModal}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                <Plus size={20} />
                                <span>Upload Content</span>
                            </button>
                            <button
                                onClick={() => setViewMode(viewMode === 'content' ? 'programme-config' : 'content')}
                                className={`px-6 py-3 rounded-xl font-bold border transition-all flex items-center gap-2 ${viewMode === 'programme-config'
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-500'
                                    }`}
                            >
                                <Settings size={20} />
                                <span>{viewMode === 'content' ? 'Configure Programmes' : 'Back to Content'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto">
                {viewMode === 'programme-config' ? (
                    // PROGRAMME CONFIGURATION VIEW
                    <div className="animate-fade-in space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-100 mb-1">Programme Configuration</h2>
                                <p className="text-gray-400">Manage structure, levels, and course units for your programmes.</p>
                            </div>
                            <button onClick={openAddProgModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg border border-blue-500/20 transition-colors">
                                <Plus size={18} /> Add Programme
                            </button>
                        </div>

                        {/* Programme Selector Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {programmes.map(prog => (
                                <button
                                    key={prog.id}
                                    onClick={() => { setConfigProgId(prog.id); setConfigLevel(''); }}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${configProgId === prog.id
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 transform scale-105'
                                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200'
                                        }`}
                                >
                                    {prog.name}
                                </button>
                            ))}
                        </div>

                        {configProgramme ? (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 space-y-8">
                                {/* Programme Details Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2">{configProgramme.name}</h3>
                                        <div className="flex gap-4 text-sm text-gray-400 font-mono">
                                            <span className="bg-gray-800 px-2 py-1 rounded">{configProgramme.code}</span>
                                            <span className="bg-gray-800 px-2 py-1 rounded">{configProgramme.type}</span>
                                            <span className="bg-gray-800 px-2 py-1 rounded">{configProgramme.duration}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditProgModal(configProgramme)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil size={18} /></button>
                                        <button onClick={() => isProgModalOpen ? setIsProgModalOpen(false) : openEditProgModal(configProgramme)} className="hidden"></button>
                                        <button onClick={() => { setEditingProgId(configProgramme.id); setIsProgModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                </div>

                                {/* Levels & CUs */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-lg font-semibold text-gray-200">Course Units by Level</h4>
                                        <div className="flex gap-2">
                                            {configLevel && (
                                                <>
                                                    <button onClick={() => handleRenameStart(configLevel)} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-gray-700">
                                                        <Pencil size={14} /> Edit Level
                                                    </button>
                                                    <button onClick={() => handleDeleteLevel(configLevel)} className="text-sm bg-red-600/10 hover:bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-red-500/20">
                                                        <Trash2 size={14} /> Delete Level
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={openAddCUModal} className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md flex items-center gap-1">
                                                <Plus size={14} /> Add Unit
                                            </button>
                                        </div>
                                    </div>

                                    {/* Level Tabs */}
                                    <div className="flex border-b border-gray-700 mb-6 space-x-6 overflow-x-auto">
                                        {activeLevels.map(lvl => (
                                            <div key={lvl} className="relative group shrink-0">
                                                {renamingLevel === lvl ? (
                                                    <div className="flex items-center gap-1 py-2">
                                                        <input
                                                            autoFocus
                                                            value={newLevelName}
                                                            onChange={e => setNewLevelName(e.target.value)}
                                                            className="bg-gray-800 text-white px-2 py-0.5 rounded border border-blue-500 outline-none text-sm w-24"
                                                            onKeyDown={e => e.key === 'Enter' && handleRenameSave()}
                                                            onBlur={handleRenameSave}
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfigLevel(lvl)}
                                                        onDoubleClick={() => handleRenameStart(lvl)}
                                                        className={`py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${configLevel === lvl ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                                                    >
                                                        {lvl}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={handleAddLevel} className="flex items-center gap-1 py-3 text-sm text-gray-500 hover:text-blue-400 transition-colors shrink-0">
                                            <Plus size={16} /> <span className="hidden sm:inline">Add Level</span>
                                        </button>
                                    </div>

                                    {/* CU List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {configCourseUnits.length === 0 ? (
                                            <div className="col-span-full py-12 text-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                                                No course units in {configLevel}. Click "Add Unit" to start.
                                            </div>
                                        ) : (
                                            configCourseUnits.map(cu => (
                                                <div key={cu.id} className="group bg-gray-950 border border-gray-800 hover:border-gray-600 p-4 rounded-xl transition-all shadow-sm hover:shadow-md relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="text-xs font-mono text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">{cu.code}</div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEditCUModal(cu)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded"><Pencil size={14} /></button>
                                                            <button onClick={() => deleteCourseUnit(cu.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                    <h5 className="font-semibold text-gray-200 leading-snug">{cu.name}</h5>
                                                    <p className="text-xs text-gray-500 mt-2">{cu.creditUnits} CU • {cu.type || 'Core'} {cu.semester ? `• Sem ${cu.semester}` : ''}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">Select a programme above to configure.</div>
                        )}
                    </div>
                ) : (
                    // CONTENT VIEW
                    <div className="animate-fade-in space-y-6">
                        {/* Filters & Search */}
                        <div className={`transition-all duration-300 ${activeTab === 'Home' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
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

                                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
                        <div className="flex gap-1 mb-6 border-b border-gray-800 pb-1">
                            {(['Home', 'Note', 'Video', 'Question'] as ContentType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setActiveTab(type); setSelectedCU(null); }}
                                    className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === type
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
                        {
                            activeTab === 'Home' ? (
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
                                                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow">FEATURED</div>
                                                </div>
                                                <div className="p-8 flex flex-col justify-center">
                                                    <div className="flex gap-2 mb-4">
                                                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded uppercase tracking-wider">{featuredContent.type}</span>
                                                        <span className="px-2 py-0.5 text-xs font-bold bg-gray-800 text-gray-400 rounded border border-gray-700">{new Date(featuredContent.uploadDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2">{featuredContent.title}</h2>
                                                    <p className="text-gray-400 mb-6 line-clamp-3">{featuredContent.description}</p>
                                                    <div className="flex gap-3">
                                                        {featuredContent.url && (
                                                            <a href={featuredContent.url} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
                                                                View Content
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => setTutorProfile(prev => ({ ...prev, pinnedContentId: null }))}
                                                            className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors"
                                                            title="Unpin Content"
                                                        >
                                                            Unpin
                                                        </button>
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
                                            {homeContent.slice(0, 8).map(c => (
                                                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all group relative cursor-pointer" onClick={() => handleViewContent(c)}>
                                                    <div className="aspect-video bg-gray-950 relative">
                                                        {c.type === 'Video' ? (
                                                            <div onClick={e => e.stopPropagation()} className="w-full h-full">
                                                                <CustomVideoPlayer src={c.url || ''} className="w-full h-full" />
                                                            </div>
                                                        ) : c.thumbnailUrl ? (
                                                            <div className="w-full h-full relative group">
                                                                <img src={c.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                                                    <div className="bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur">
                                                                        <Eye size={20} className="text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                                                {c.type === 'Note' ? <FileText size={32} className="text-gray-700 group-hover:text-blue-500 transition-colors" /> : <HelpCircle size={32} className="text-gray-700 group-hover:text-blue-500 transition-colors" />}
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                                                            <button
                                                                onClick={(e) => toggleLike(e, c.id)}
                                                                className="flex items-center gap-1 p-1.5 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500/80 transition-colors group/like"
                                                            >
                                                                <Heart size={12} className={`fill-current text-white/80 group-hover/like:text-white ${c.likes ? 'text-red-500 fill-red-500' : ''}`} />
                                                                <span className="text-[10px] font-bold">{c.likes || 0}</span>
                                                            </button>
                                                        </div>
                                                        <div className="absolute top-2 left-2 flex gap-1 z-10">
                                                            <button onClick={(e) => togglePin(e, c.id)} className={`p-1.5 backdrop-blur rounded transition-all ${c.isFeatured ? 'bg-amber-500 text-black' : 'bg-gray-900/80 text-gray-400 hover:text-amber-400'}`}>
                                                                <Pin size={14} className={c.isFeatured ? 'fill-current' : ''} />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-2 right-2 flex gap-1 z-10 pointer-events-none">
                                                            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded-md flex items-center gap-1 text-white/90 text-xs font-medium">
                                                                <Eye size={12} /> {c.views || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-gray-200 mb-1 line-clamp-1">{c.title}</h4>
                                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                                            {c.programmeIds && c.programmeIds.map(pid => {
                                                                const prog = programmes.find(p => p.id === pid);
                                                                return prog ? <span key={pid} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{prog.name}</span> : null;
                                                            })}
                                                            {c.courseUnitIds && c.courseUnitIds.map(cid => {
                                                                const cu = courseUnits.find(u => u.id === cid);
                                                                return cu ? <span key={cid} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-900/50">{cu.name}</span> : null;
                                                            })}
                                                            {c.levels && c.levels.map(lvl => (
                                                                <span key={lvl} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 uppercase tracking-wider">{lvl}</span>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                                                        <div className="flex justify-between items-center text-xs text-gray-600 font-mono">
                                                            <span>{c.type}</span>
                                                            <span>{new Date(c.uploadDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // LIST VIEW (With Filter Logic)
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-64 shrink-0 space-y-2">
                                        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
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
                                            {displayedContent.length > 0 ? displayedContent.map(c => (
                                                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all group flex flex-col sm:flex-row h-auto sm:h-48">
                                                    {/* Thumbnail Section */}
                                                    <div className="w-full sm:w-72 bg-gray-950 relative shrink-0 cursor-pointer group" onClick={() => handleViewContent(c)}>
                                                        {c.type === 'Video' ? (
                                                            <div onClick={e => e.stopPropagation()} className="w-full h-full">
                                                                <CustomVideoPlayer src={c.url || ''} className="w-full h-full" />
                                                            </div>
                                                        ) : c.thumbnailUrl ? (
                                                            <div className="w-full h-full relative group">
                                                                <img src={c.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                                                    <div className="bg-black/50 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur">
                                                                        <Eye size={24} className="text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-950 hover:bg-gray-900 transition-colors">
                                                                {c.type === 'Question' ? <HelpCircle size={40} className="text-gray-700" /> : <FileText size={40} className="text-gray-700" />}
                                                            </div>
                                                        )}

                                                        <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => toggleLike(e, c.id)}
                                                                className="flex items-center gap-1 p-1.5 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500/80 transition-colors group/like"
                                                            >
                                                                <Heart size={14} className={`fill-current text-white/80 group-hover/like:text-white ${c.likes ? 'text-red-500 fill-red-500' : ''}`} />
                                                                <span className="text-xs font-bold">{c.likes || 0}</span>
                                                            </button>
                                                        </div>
                                                        <div className="absolute top-2 left-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => togglePin(e, c.id)} className={`p-1.5 backdrop-blur rounded transition-all ${c.isFeatured ? 'bg-amber-500 text-black' : 'bg-gray-900/80 text-gray-400 hover:text-amber-400'}`}>
                                                                <Pin size={14} className={c.isFeatured ? 'fill-current' : ''} />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-2 right-2 flex gap-1 z-10 pointer-events-none">
                                                            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded-md flex items-center gap-1 text-white/90 text-xs font-medium">
                                                                <Eye size={12} /> {c.views || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details Section */}
                                                    <div className="p-5 flex flex-col flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div className="cursor-pointer" onClick={() => handleViewContent(c)}>
                                                                <h4 className="text-lg font-bold text-gray-200 mb-1 leading-tight group-hover:text-blue-400 transition-colors">{c.title}</h4>
                                                                <div className="flex flex-wrap gap-2 mb-3">
                                                                    {c.programmeIds && c.programmeIds.map(pid => {
                                                                        const prog = programmes.find(p => p.id === pid);
                                                                        return prog ? <span key={pid} className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{prog.name}</span> : null;
                                                                    })}
                                                                    {c.courseUnitIds && c.courseUnitIds.map(cid => {
                                                                        const cu = courseUnits.find(u => u.id === cid);
                                                                        return cu ? <span key={cid} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-900/50">{cu.name}</span> : null;
                                                                    })}
                                                                    {c.levels && c.levels.map(lvl => (
                                                                        <span key={lvl} className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 uppercase tracking-wider">{lvl}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openEditModal(c)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400"><Pencil size={16} /></button>
                                                                <button onClick={() => deleteTutorContent(c.id)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-gray-500 line-clamp-2 mb-auto">{c.description}</p>

                                                        <div className="flex justify-between items-center mt-4 border-t border-gray-800 pt-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-xs px-2 py-1 rounded font-bold ${c.type === 'Video' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{c.type}</span>
                                                                <span className="text-xs text-gray-600">{new Date(c.uploadDate).toLocaleDateString()}</span>
                                                            </div>
                                                            {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">View Source <ArrowRight size={12} /></a>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-full py-20 text-center text-gray-500">No content found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                )}
            </div>

            {/* MODALS */}
            {isProgModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">{editingProgId ? 'Edit' : 'Add'} Programme</h2>
                        <input className="w-full p-2 bg-gray-950 border border-gray-700 rounded mb-3 text-white" placeholder="Name" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} />
                        <input className="w-full p-2 bg-gray-950 border border-gray-700 rounded mb-3 text-white" placeholder="Code" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsProgModalOpen(false)} className="px-4 py-2 text-gray-400">Cancel</button>
                            <button onClick={handleSaveProgramme} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {isCUModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">{editingCUId ? 'Edit' : 'Add'} Unit</h2>
                        <input className="w-full p-2 bg-gray-950 border border-gray-700 rounded mb-3 text-white" placeholder="Name" value={cuForm.name} onChange={e => setCuForm({ ...cuForm, name: e.target.value })} />
                        <input className="w-full p-2 bg-gray-950 border border-gray-700 rounded mb-3 text-white" placeholder="Code" value={cuForm.code} onChange={e => setCuForm({ ...cuForm, code: e.target.value })} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCUModalOpen(false)} className="px-4 py-2 text-gray-400">Cancel</button>
                            <button onClick={handleSaveCU} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0F0F0F]">
                            <div>
                                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                                    {uploadStep === 'file' ? 'Upload Content' : 'Content Details'}
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    {uploadStep === 'file' ? 'Select a file to begin' : 'Add metadata and target audience'}
                                </p>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800">
                            {uploadStep === 'file' ? (
                                <div className="space-y-8 max-w-2xl mx-auto py-8">
                                    {/* Drag & Drop Area */}
                                    <div className="border-2 border-dashed border-gray-700 bg-gray-900/50 rounded-3xl p-12 text-center group hover:border-blue-500 hover:bg-gray-900 transition-all cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={async e => {
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    const isVideo = file.type.startsWith('video/');
                                                    const isPDF = file.type === 'application/pdf';
                                                    const isImage = file.type.startsWith('image/');

                                                    let thumbUrl: string | undefined = undefined;
                                                    if (isPDF) {
                                                        const url = await generatePDFThumbnail(file);
                                                        if (url) thumbUrl = url;
                                                    } else if (isImage) {
                                                        thumbUrl = URL.createObjectURL(file);
                                                    }

                                                    setUploadForm({
                                                        ...uploadForm,
                                                        file: file,
                                                        title: file.name.split('.')[0],
                                                        fileType: isVideo ? 'Video' : 'Note',
                                                        thumbnailUrl: thumbUrl
                                                    });
                                                    setUploadStep('details');
                                                }
                                            }}
                                        />
                                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                            <Upload size={32} className="text-blue-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Drag & Drop file here</h3>
                                        <p className="text-gray-400 mb-6">or click to browse your computer</p>
                                        <div className="flex gap-4 justify-center text-sm text-gray-500 font-mono">
                                            <span>PDF</span>
                                            <span>MP4</span>
                                            <span>PNG</span>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                                        <div className="relative flex justify-center"><span className="bg-[#0A0A0A] px-4 text-gray-500 text-sm uppercase tracking-wider">Or via URL</span></div>
                                    </div>

                                    {/* URL Input */}
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                            placeholder="Paste YouTube or Resource URL..."
                                            value={uploadForm.url}
                                            onChange={e => setUploadForm({ ...uploadForm, url: e.target.value })}
                                        />
                                        <button
                                            disabled={!uploadForm.url}
                                            onClick={() => { if (uploadForm.url) setUploadStep('details'); }}
                                            className="px-6 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                    {/* Left Column: Metadata & Programmes */}
                                    <div className="space-y-6">
                                        {/* Basic Info */}
                                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800/50 space-y-4">
                                            {/* File Preview */}
                                            {uploadForm.file && (
                                                <div className="aspect-video w-full bg-black rounded-xl border border-gray-800 overflow-hidden relative mb-4 flex items-center justify-center group">
                                                    {uploadForm.file.type.startsWith('image/') ? (
                                                        <img src={URL.createObjectURL(uploadForm.file)} className="w-full h-full object-cover" alt="Preview" />
                                                    ) : uploadForm.file.type.startsWith('video/') ? (
                                                        <CustomVideoPlayer
                                                            src={URL.createObjectURL(uploadForm.file)}
                                                            className="w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                                            <FileText size={48} className="mb-2 opacity-50" />
                                                            <span className="text-xs font-mono max-w-[80%] text-center truncate">{uploadForm.file.name}</span>
                                                        </div>
                                                    )}
                                                    {/* Type Badge */}
                                                    {uploadForm.file.type.startsWith('image/') && (
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded backdrop-blur-md uppercase tracking-wider">{uploadForm.file.name.split('.').pop()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Cover Image Upload (Only for non-videos) */}
                                            {uploadForm.fileType !== 'Video' && (
                                                <div className="border border-dashed border-gray-700 bg-black/20 rounded-xl p-4 flex items-center gap-4 relative group hover:border-blue-500/50 transition-colors mb-4">
                                                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                                                        {uploadForm.thumbnailFile ? (
                                                            <img src={URL.createObjectURL(uploadForm.thumbnailFile)} className="w-full h-full object-cover" />
                                                        ) : uploadForm.thumbnailUrl ? (
                                                            <img src={uploadForm.thumbnailUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileText size={24} className="text-gray-600" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Upload size={16} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-300">Add Cover Image</p>
                                                        <p className="text-xs text-gray-500">Upload a custom thumbnail for this document.</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={e => {
                                                            if (e.target.files?.[0]) {
                                                                setUploadForm({ ...uploadForm, thumbnailFile: e.target.files[0] });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <input
                                                className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none border-b border-transparent focus:border-gray-700 pb-2 transition-colors"
                                                placeholder="Content Title"
                                                value={uploadForm.title}
                                                onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                                                autoFocus
                                            />
                                            <textarea
                                                className="w-full bg-transparent text-gray-300 placeholder-gray-600 outline-none resize-none h-20 text-sm"
                                                placeholder="Add a description/summary..."
                                                value={uploadForm.description}
                                                onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                                            />
                                            <div className="flex gap-2">
                                                {['Note', 'Video', 'Question'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setUploadForm({ ...uploadForm, fileType: type as any })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${uploadForm.fileType === type ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Programme Selection */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Programmes</h3>
                                                <span className="text-xs text-gray-600">{Object.keys(uploadForm.selectedProgrammes).length} selected</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {programmes.map(prog => {
                                                    const isSelected = !!uploadForm.selectedProgrammes[prog.id];
                                                    const selectedLevels = uploadForm.selectedProgrammes[prog.id] || [];
                                                    const progLevels = prog.levels && prog.levels.length ? prog.levels : ['Year 1', 'Year 2', 'Year 3'];

                                                    return (
                                                        <div
                                                            key={prog.id}
                                                            className={`border rounded-xl p-4 transition-all cursor-pointer ${isSelected ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-900'}`}
                                                            onClick={(e) => {
                                                                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                                                // Toggle Programme Selection (Default to all levels if selecting new)
                                                                const newMap = { ...uploadForm.selectedProgrammes };
                                                                if (isSelected) {
                                                                    delete newMap[prog.id];
                                                                } else {
                                                                    newMap[prog.id] = []; // Start empty, let them pick levels? Or auto-select first? Let's start empty but broaden the UI
                                                                }
                                                                setUploadForm({ ...uploadForm, selectedProgrammes: newMap });
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-bold text-gray-200 text-sm">{prog.name}</span>
                                                                {isSelected && <Check size={14} className="text-blue-400" />}
                                                            </div>

                                                            {/* Level Selection (Visible if Prog is Selected) */}
                                                            {isSelected && (
                                                                <div className="mt-3 space-y-2 animate-fade-in pl-1 border-l-2 border-blue-500/30">
                                                                    {progLevels.map(lvl => (
                                                                        <label
                                                                            key={lvl}
                                                                            className="flex items-center gap-2 cursor-pointer group"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedLevels.includes(lvl) ? 'bg-blue-500 border-blue-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                                                                {selectedLevels.includes(lvl) && <Check size={10} className="text-white" />}
                                                                            </div>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="hidden"
                                                                                checked={selectedLevels.includes(lvl)}
                                                                                onChange={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const newMap = { ...uploadForm.selectedProgrammes };
                                                                                    const current = newMap[prog.id] || [];
                                                                                    if (current.includes(lvl)) {
                                                                                        newMap[prog.id] = current.filter(l => l !== lvl);
                                                                                    } else {
                                                                                        newMap[prog.id] = [...current, lvl];
                                                                                    }
                                                                                    setUploadForm({ ...uploadForm, selectedProgrammes: newMap });
                                                                                }}
                                                                            />
                                                                            <span className={`text-xs ${selectedLevels.includes(lvl) ? 'text-blue-300' : 'text-gray-500 group-hover:text-gray-300'}`}>{lvl}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {!isSelected && <p className="text-xs text-gray-600 mt-1">Click to select levels</p>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Course Units */}
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Course Units</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setUploadForm({ ...uploadForm, selectedCUIds: [] })}
                                                    className="text-xs text-gray-500 hover:text-white"
                                                    disabled={uploadForm.selectedCUIds.length === 0}
                                                >
                                                    Clear ({uploadForm.selectedCUIds.length})
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                                            <div className="grid grid-cols-1 gap-2">
                                                {(() => {
                                                    // Filter Course Units Logic
                                                    let filteredCUs = courseUnits;
                                                    const selectedProgIds = Object.keys(uploadForm.selectedProgrammes);

                                                    // If specific programmes selected, filter by them
                                                    if (selectedProgIds.length > 0) {
                                                        filteredCUs = filteredCUs.filter(cu => {
                                                            const isProgMatch = selectedProgIds.includes(cu.programmeId);
                                                            if (!isProgMatch) return false;

                                                            // If levels selected for this prog, filter by level
                                                            const selectedLevels = uploadForm.selectedProgrammes[cu.programmeId];
                                                            if (selectedLevels && selectedLevels.length > 0) {
                                                                return selectedLevels.includes(cu.level);
                                                            }
                                                            return true; // If no levels explicitly checked (but prog checked), show all for prog? Or none? "Multi-level selection" suggests specificity.
                                                            // Let's say if levels are empty, user hasn't drilled down, so maybe show all for that prog.
                                                        });
                                                    }

                                                    if (filteredCUs.length === 0) {
                                                        return <div className="text-center py-10 text-gray-600 italic">No matching course units found. Select a programme and level.</div>;
                                                    }

                                                    return filteredCUs.map(cu => {
                                                        const isSelected = uploadForm.selectedCUIds.includes(cu.id);
                                                        return (
                                                            <div
                                                                key={cu.id}
                                                                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-900/30 border-gray-800 hover:bg-gray-900'}`}
                                                                onClick={() => {
                                                                    const newIds = isSelected
                                                                        ? uploadForm.selectedCUIds.filter(id => id !== cu.id)
                                                                        : [...uploadForm.selectedCUIds, cu.id];
                                                                    setUploadForm({ ...uploadForm, selectedCUIds: newIds });
                                                                }}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-mono text-gray-500 mb-0.5">{cu.code}</div>
                                                                    <div className={`text-sm font-medium leading-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>{cu.name}</div>
                                                                </div>
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-700'}`}>
                                                                    {isSelected && <Check size={12} className="text-white" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-800 bg-[#0F0F0F] flex justify-between items-center">
                            {uploadStep === 'details' && (
                                <button onClick={() => setUploadStep('file')} className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-2">
                                    <ArrowLeft size={16} /> Back to File
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                {uploadStep === 'details' && (
                                    <button
                                        onClick={() => {
                                            setUploadForm({ ...uploadForm, status: 'Draft' });
                                            handleUpload();
                                        }}
                                        className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2"
                                    >
                                        Save as Draft
                                    </button>
                                )}
                                <button
                                    onClick={uploadStep === 'file' ? (() => uploadForm.url && setUploadStep('details')) : handleUpload}
                                    className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                                    disabled={uploadStep === 'file' && !uploadForm.file && !uploadForm.url}
                                >
                                    <span>{uploadStep === 'file' ? 'Next' : 'Publish Content'}</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDraftsModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Your Drafts</h2>
                            <button onClick={() => setIsDraftsModalOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                            {drafts.length === 0 ? (
                                <div className="text-center py-12 text-gray-600">No drafts found.</div>
                            ) : (
                                drafts.map(draft => (
                                    <div key={draft.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex justify-between items-center group hover:bg-gray-900 transition-all">
                                        <div>
                                            <h3 className="font-bold text-gray-200 mb-1">{draft.title || 'Untitled Draft'}</h3>
                                            <p className="text-xs text-gray-500">Last edited: {new Date(draft.uploadDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    openEditModal(draft);
                                                    setIsDraftsModalOpen(false);
                                                }}
                                                className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-sm font-medium"
                                            >
                                                Resume
                                            </button>
                                            <button
                                                onClick={() => deleteContent(draft.id)}
                                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
                        <div className="space-y-4">
                            <input className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white" placeholder="Name" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                            <textarea className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white h-24" placeholder="Bio" value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} />

                            {/* Image Uploads */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center relative group hover:border-blue-500/50 transition-colors">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-2 overflow-hidden">
                                        {profileForm.profileImage ? <img src={profileForm.profileImage} className="w-full h-full object-cover" /> : <Settings size={20} className="text-gray-500" />}
                                    </div>
                                    <span className="text-xs text-gray-400">Profile Pic</span>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                                        if (e.target.files?.[0]) setProfileForm({ ...profileForm, profileImage: URL.createObjectURL(e.target.files[0]) });
                                    }} />
                                </div>
                                <div className="border border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center relative group hover:border-blue-500/50 transition-colors">
                                    <div className="w-20 h-10 bg-gray-800 rounded flex items-center justify-center mb-2 overflow-hidden">
                                        {profileForm.coverImage ? <img src={profileForm.coverImage} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-500" />}
                                    </div>
                                    <span className="text-xs text-gray-400">Cover Image</span>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                                        if (e.target.files?.[0]) setProfileForm({ ...profileForm, coverImage: URL.createObjectURL(e.target.files[0]) });
                                    }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setIsProfileModalOpen(false)} className="px-5 py-2.5 text-gray-400">Cancel</button>
                            <button onClick={() => { updateProfile(profileForm); setIsProfileModalOpen(false); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Viewer Overlay */}
            {viewingContent && (
                <ContentViewer
                    content={viewingContent}
                    onClose={() => setViewingContent(null)}
                    onMinimize={() => {
                        setMinimizedContent(viewingContent);
                        setViewingContent(null);
                    }}
                />
            )}

            {/* Minimized Content Indicator */}
            {minimizedContent && !viewingContent && (
                <div onClick={() => { setViewingContent(minimizedContent); setMinimizedContent(null); }} className="fixed bottom-6 right-6 z-[80] bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl cursor-pointer hover:border-blue-500 transition-colors animate-fade-in flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded overflow-hidden">
                        {minimizedContent.type === 'Video' ? <Video size={24} className="m-auto mt-3 text-gray-500" /> : minimizedContent.thumbnailUrl ? <img src={minimizedContent.thumbnailUrl} className="w-full h-full object-cover" /> : <FileText size={24} className="m-auto mt-3 text-gray-500" />}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Resuming...</p>
                        <p className="font-bold text-white max-w-[150px] truncate">{minimizedContent.title}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setMinimizedContent(null); }} className="p-1 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white"><X size={16} /></button>
                </div>
            )}
        </div>
    );
}
