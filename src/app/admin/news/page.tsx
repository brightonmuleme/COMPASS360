"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSchoolData, NewsItem, Suggestion } from '@/lib/store';
import {
    Plus,
    Search,
    Calendar,
    ImageIcon,
    Film,
    Trash2,
    Edit2,
    CheckCircle2,
    Newspaper,
    MessageSquare,
    Send,
    Eye,
    Globe,
    School,
    Clock,
    User,
    ChevronRight,
    SearchX,
    ThumbsUp,
    MoreVertical,
    Check,
    Upload,
    AlertTriangle
} from 'lucide-react';

export default function NewsCoordinatorPage() {
    const {
        news, addNews, updateNews, deleteNews,
        suggestions, updateSuggestionStatus,
        schoolProfile
    } = useSchoolData();

    const [activeTab, setActiveTab] = useState<'feed' | 'suggestions'>('feed');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
    const selectedSuggestion = useMemo(() =>
        suggestions.find(s => s.id === selectedSuggestionId) || null,
        [suggestions, selectedSuggestionId]
    );
    const [feedbackText, setFeedbackText] = useState("");

    // Form State
    const [formData, setFormData] = useState<Partial<NewsItem>>({
        title: "",
        content: "",
        category: "General",
        date: new Date().toISOString().split('T')[0],
        mediaType: 'image',
        mediaUrl: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const categories = ["All", "General", "Academic", "Sports", "Events"];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError(null);

        if (file) {
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                setFileError("File size exceeds 50MB limit.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');

            if (!isImage && !isVideo) {
                setFileError("Please select an image or video file.");
                return;
            }

            // Create a preview URL (Note: blob URLs don't persist in localStorage)
            // For a real app, you'd upload this to a server/storage bucket
            const previewUrl = URL.createObjectURL(file);
            setFormData({
                ...formData,
                mediaUrl: previewUrl,
                mediaType: isVideo ? 'video' : 'image'
            });
        }
    };

    const filteredNews = useMemo(() => {
        return news.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
            const matchesSchool = !item.schoolId || item.schoolId === schoolProfile?.id;
            return matchesSearch && matchesCategory && matchesSchool;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [news, searchQuery, selectedCategory]);

    const filteredSuggestions = useMemo(() => {
        return suggestions.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.content.toLowerCase().includes(searchQuery.toLowerCase());
            // Filter by school if profile exists
            const matchesSchool = !s.schoolId || s.schoolId === schoolProfile?.id;
            return matchesSearch && matchesSchool;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [suggestions, searchQuery, schoolProfile]);

    // Memory cleanup for local file previews
    useEffect(() => {
        const url = formData.mediaUrl;
        return () => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        };
    }, [formData.mediaUrl]);

    const handlePostSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) return;

        if (editingItem) {
            updateNews({ ...editingItem, ...formData } as NewsItem);
            setEditingItem(null);
        } else {
            addNews({
                ...formData,
                id: crypto.randomUUID(),
                author: schoolProfile?.principal || "School Admin",
                schoolId: schoolProfile?.id,
                date: formData.date || new Date().toISOString().split('T')[0]
            } as NewsItem);
        }
        setIsPostModalOpen(false);
        setFormData({ title: "", content: "", category: "General", date: new Date().toISOString().split('T')[0], mediaType: 'image', mediaUrl: '' });
    };

    const handleFeedbackSubmit = () => {
        if (!selectedSuggestion || !feedbackText) return;
        updateSuggestionStatus(selectedSuggestion.id, 'Resolved', feedbackText);
        setFeedbackText("");
        setSelectedSuggestionId(null);
        // Alert/Toast could go here
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                                <Newspaper size={28} />
                            </div>
                            School News Feed
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Manage announcements and view student suggestions</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setEditingItem(null); setFormData({ title: "", content: "", category: "General", date: new Date().toISOString().split('T')[0], mediaType: 'image', mediaUrl: '' }); setIsPostModalOpen(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            Post News
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto mt-8 flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`px-8 py-4 font-bold text-sm transition-all relative ${activeTab === 'feed' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        News Feed
                        {activeTab === 'feed' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`px-8 py-4 font-bold text-sm transition-all relative flex items-center gap-2 ${activeTab === 'suggestions' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Suggestions
                        {suggestions.filter(s => s.status === 'Pending').length > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                                {suggestions.filter(s => s.status === 'Pending').length}
                            </span>
                        )}
                        {activeTab === 'suggestions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-8 mt-8">
                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder={activeTab === 'feed' ? "Search news articles..." : "Search student suggestions..."}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {activeTab === 'feed' && (
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${selectedCategory === cat
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {activeTab === 'feed' ? (
                    /* FEED VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredNews.map(item => (
                            <div key={item.id} className="group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                {item.mediaUrl && (
                                    <div className="h-56 w-full bg-slate-100 relative overflow-hidden">
                                        {item.mediaType === 'video' ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 group-hover:scale-110 transition-transform duration-500">
                                                <Film className="text-white/40" size={48} />
                                                <div className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">VIDEO</div>
                                            </div>
                                        ) : (
                                            <img src={item.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-blue-600 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="p-6 flex-1 flex flex-col">
                                    {!item.mediaUrl && (
                                        <div className="mb-4">
                                            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                                                {item.category}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            <School size={12} /> Campus Official
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-800 leading-tight mb-3 group-hover:text-blue-600 transition-colors uppercase">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 flex-1 mb-6 font-medium italic">
                                        "{item.content}"
                                    </p>

                                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{item.author}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setEditingItem(item); setFormData(item); setIsPostModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteNews(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredNews.length === 0 && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-slate-200 shadow-sm">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                                    <SearchX size={64} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">No news found</h3>
                                <p className="text-slate-500 mt-2 font-medium">Try broadening your search or change categories.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* SUGGESTIONS VIEW */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {filteredSuggestions.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedSuggestionId(s.id)}
                                    className={`p-6 bg-white rounded-3xl border transition-all cursor-pointer group flex items-start gap-4 ${selectedSuggestionId === s.id
                                        ? 'border-blue-400 ring-4 ring-blue-500/5 shadow-lg'
                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className={`p-4 rounded-full flex-shrink-0 ${s.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' :
                                        s.status === 'Reviewing' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        <MessageSquare size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-extrabold text-slate-900 truncate pr-4 uppercase">{s.title}</h4>
                                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{s.date}</span>
                                        </div>
                                        <p className="text-slate-500 text-sm line-clamp-2 mb-3 font-medium">"{s.content}"</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                                <User size={14} /> {s.studentName || 'Independent Learner'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                                <ThumbsUp size={14} /> {s.likes || 0}
                                            </div>
                                            <div className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                                                s.status === 'Reviewing' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                                                }`}>
                                                {s.status}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={`text-slate-300 transition-transform ${selectedSuggestionId === s.id ? 'translate-x-1 text-blue-400' : ''}`} />
                                </div>
                            ))}

                            {filteredSuggestions.length === 0 && (
                                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                    <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                                    <h3 className="font-bold text-slate-900">No suggestions yet</h3>
                                    <p className="text-slate-500 text-sm mt-1">Student voices will appear here once submitted.</p>
                                </div>
                            )}
                        </div>

                        {/* Suggestion Detail & Feedback */}
                        <div className="lg:sticky lg:top-[180px] self-start h-fit">
                            {selectedSuggestion ? (
                                <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="p-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{selectedSuggestion.studentName || 'Student'}</h3>
                                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Submitted on {selectedSuggestion.date}</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-3xl p-8 mb-10 border border-slate-100">
                                            <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase leading-none">{selectedSuggestion.title}</h2>
                                            <p className="text-slate-600 leading-relaxed text-lg font-medium italic">
                                                "{selectedSuggestion.content}"
                                            </p>
                                        </div>

                                        {selectedSuggestion.status === 'Resolved' ? (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8">
                                                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                                                    <CheckCircle2 size={24} />
                                                    <span className="font-black text-sm uppercase tracking-widest">Administrator's Response</span>
                                                </div>
                                                <p className="text-emerald-800 font-bold italic leading-relaxed">
                                                    "{selectedSuggestion.feedback || "Thank you for the suggestion! We have reviewed and addressed this."}"
                                                </p>
                                                <div className="mt-6 flex justify-between items-center">
                                                    <button
                                                        onClick={() => updateSuggestionStatus(selectedSuggestion.id, 'Reviewing')}
                                                        className="text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1"
                                                    >
                                                        <Edit2 size={12} /> Change Feedback
                                                    </button>
                                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{selectedSuggestion.feedbackDate?.split('T')[0]}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                <div>
                                                    <label className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-1 block mb-4">Quick Feedback</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { label: 'Acknowledged', full: 'Thank you for sharing. We have received your suggestion.' },
                                                            { label: 'Great Idea', full: 'This is an excellent suggestion! We appreciate your input.' },
                                                            { label: 'Under Review', full: 'Our team is currently reviewing the feasibility of this suggestion.' },
                                                            { label: 'Keep it up', full: 'We love the initiative! Keep sharing your ideas with us.' },
                                                            { label: 'Visit Admin', full: 'For more details on this specific issue, please visit the administration office.' },
                                                            { label: 'Thank You', full: 'Thank you for your feedback. We have noted this for future planning.' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.label}
                                                                onClick={() => updateSuggestionStatus(selectedSuggestion.id, 'Resolved', opt.full)}
                                                                className="px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600 hover:shadow-lg transition-all active:scale-95"
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-slate-100">
                                                    <button
                                                        onClick={() => updateSuggestionStatus(selectedSuggestion.id, 'Reviewing')}
                                                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Clock size={16} /> Mark as Under Review
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[40px] border border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
                                    <div className="p-6 bg-slate-50 rounded-full text-slate-200 mb-6">
                                        <Eye size={48} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Select a suggestion</h3>
                                    <p className="text-slate-400 mt-2 font-medium">Click on a suggestion on the left to review its content and provide feedback.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Post/Edit News Modal */}
            {isPostModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {editingItem ? 'Edit Announcement' : 'Post New Content'}
                                </h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Speak to your students</p>
                            </div>
                            <button
                                onClick={() => setIsPostModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:shadow-md transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePostSubmit} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-[0.2em] px-1">Headline</label>
                                <input
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-slate-900 text-lg uppercase placeholder:font-medium placeholder:text-slate-300 shadow-inner"
                                    placeholder="e.g. EXCITING SCHOOL TRIP TO KALANGALA"
                                    value={formData.title}
                                    required
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-[0.2em] px-1">Category</label>
                                    <select
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 bg-white"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-[0.2em] px-1">Publish Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-[0.2em] px-1">Content Body</label>
                                <textarea
                                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 min-h-[120px] resize-none italic shadow-inner"
                                    placeholder="Describe the news in detail..."
                                    value={formData.content}
                                    required
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-slate-400 font-extrabold text-[10px] uppercase tracking-[0.2em] px-1">Media & Evidence</h4>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 text-xs shadow-inner"
                                                placeholder="Paste image/video direct link here..."
                                                value={formData.mediaUrl}
                                                onChange={e => {
                                                    setFormData({ ...formData, mediaUrl: e.target.value });
                                                    setFileError(null);
                                                }}
                                            />
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*,video/*"
                                                onChange={handleFileChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <Upload size={14} /> Upload File
                                            </button>
                                            <select
                                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none"
                                                value={formData.mediaType}
                                                onChange={e => setFormData({ ...formData, mediaType: e.target.value as any })}
                                            >
                                                <option value="image">Image</option>
                                                <option value="video">Video</option>
                                            </select>
                                        </div>
                                        {fileError && (
                                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold px-2 animate-pulse">
                                                <AlertTriangle size={12} /> {fileError}
                                            </div>
                                        )}
                                        <div className="px-2 text-[9px] text-slate-400 font-medium">
                                            Max file size: 50MB. Video or Image only.
                                        </div>
                                    </div>

                                    {/* Real-time Preview */}
                                    {formData.mediaUrl && (
                                        <div className="w-full md:w-32 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative shadow-md group">
                                            {formData.mediaType === 'image' ? (
                                                <img src={formData.mediaUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900 font-bold text-[8px]">
                                                    <Film size={16} /> VIDEO
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <Eye size={12} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPostModalOpen(false)}
                                    className="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-3 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {editingItem ? <><Check size={20} /> Update Content</> : <><Send size={20} /> Post Now</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
