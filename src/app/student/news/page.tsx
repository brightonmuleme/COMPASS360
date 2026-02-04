"use client";

import { useSchoolData } from "@/lib/store";
import { useState, useEffect, useRef } from "react";
import {
    Calendar,
    ChevronRight,
    X,
    MessageSquare,
    Send,
    CheckCircle,
    Clock,
    AlertCircle,
    Newspaper,
    Lightbulb
} from "lucide-react";
import Link from 'next/link';

export default function NewsAndSuggestions() {
    const { news, suggestions, addSuggestion, studentProfile, students } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'news' | 'suggestions'>('news');

    // --- NEWS LOGIC ---
    const [selectedNews, setSelectedNews] = useState<string | null>(null);
    const activeNews = selectedNews ? news.find(n => n.id === selectedNews) : null;

    // --- SUGGESTIONS LOGIC ---
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("General");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // --- LINKED STUDENT AUTH ---
    const linkedStudent = studentProfile.linkedStudentCode
        ? (students.find(s => s.payCode === studentProfile.linkedStudentCode && s.origin === 'registrar') ||
            students.find(s => s.payCode === studentProfile.linkedStudentCode))
        : null;

    // Escape key handler for modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedNews(null);
        };
        if (selectedNews) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [selectedNews]);

    // Auto-focus close button when modal opens
    useEffect(() => {
        if (selectedNews) closeButtonRef.current?.focus();
    }, [selectedNews]);

    // Cooldown timer
    useEffect(() => {
        if (cooldownRemaining > 0) {
            const timer = setInterval(() => {
                setCooldownRemaining(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldownRemaining]);

    const handleSuggestionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        // Rate limiting check
        const now = Date.now();
        if (now - lastSubmitTime < 60000) {
            alert('Please wait before submitting another suggestion.');
            return;
        }

        // Resolve real name if linked
        const posterName = linkedStudent ? linkedStudent.name : studentProfile.name;

        const newSuggestion = {
            id: `sugg_${Date.now()}`,
            studentId: studentProfile.id,
            studentName: posterName,
            title,
            content: content, // Clean content without category prefix
            category: category, // NEW: Separate field
            date: new Date().toISOString(),
            status: 'Pending' as const,
            likes: 0
        };

        addSuggestion(newSuggestion);
        setTitle("");
        setContent("");
        setIsSubmitted(true);
        setLastSubmitTime(now);
        setCooldownRemaining(60); // 60 second cooldown
        setTimeout(() => setIsSubmitted(false), 3000);
    };

    const filteredNews = news
        .filter((n: any) => n.isGlobal || n.schoolId === studentProfile.schoolId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mySuggestions = suggestions
        .filter((s: any) => s.studentId === studentProfile.id && (!s.schoolId || s.schoolId === studentProfile.schoolId))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- CONDITIONAL VIEW ---
    if (!linkedStudent) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <Newspaper size={48} className="text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">News & Suggestions Locked</h1>
                <p className="text-gray-400 mb-8 max-w-md text-lg">
                    School news and the suggestion box are private to enrolled students. Please link your official school record in your profile to gain access.
                </p>
                <Link
                    href="/student/profile"
                    className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-700 transition flex items-center gap-2"
                >
                    <Newspaper size={18} /> Link School Record
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen animate-fade-in text-gray-100">
            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        {activeTab === 'news' ? (
                            <><Newspaper className="text-blue-500" size={32} /> School News</>
                        ) : (
                            <><Lightbulb className="text-yellow-500" size={32} /> Suggestion Box</>
                        )}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        {activeTab === 'news'
                            ? `Stay updated with announcements from your school.`
                            : "Share your ideas to help us improve the school environment."}
                    </p>
                </div>

                <div className="bg-[#181818] p-1.5 rounded-xl flex w-full md:w-auto shrink-0 border border-gray-800 shadow-inner">
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex flex-1 md:flex-none justify-center items-center gap-2 ${activeTab === 'news' ? 'bg-[#2a2a2a] text-blue-400 shadow-sm border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <Newspaper size={16} /> News Board
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex flex-1 md:flex-none justify-center items-center gap-2 ${activeTab === 'suggestions' ? 'bg-[#2a2a2a] text-yellow-500 shadow-sm border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <MessageSquare size={16} /> Suggestions
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[400px]">
                {activeTab === 'news' ? (
                    // === NEWS VIEW ===
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {filteredNews.map((item: any) => {
                                const daysSincePost = (new Date().getTime() - new Date(item.date).getTime()) / (24 * 60 * 60 * 1000);
                                const isNew = daysSincePost < 7;
                                const isVeryRecent = daysSincePost < 3;

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-[#181818] border ${isVeryRecent ? 'border-blue-600/50' : 'border-gray-800'} rounded-xl shadow-sm hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group flex flex-col h-full hover:border-gray-700`}
                                        onClick={() => setSelectedNews(item.id)}
                                    >
                                        {item.mediaUrl && item.mediaType === 'image' ? (
                                            <div className="h-64 md:h-48 overflow-hidden relative">
                                                <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            </div>
                                        ) : (
                                            <div className="h-64 md:h-48 bg-[#202020] flex items-center justify-center relative">
                                                <Newspaper className="text-gray-600" size={48} />
                                            </div>
                                        )}
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider flex-wrap">
                                                <Calendar size={12} />
                                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                <span>{item.category}</span>
                                                {item.isGlobal && (
                                                    <>
                                                        <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                                                        <span className="text-purple-400 text-[10px] font-bold">🌍 Platform-Wide</span>
                                                    </>
                                                )}
                                                {isNew && (
                                                    <>
                                                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                            NEW
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <h2 className="text-xl font-bold mb-3 text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2">{item.title}</h2>
                                            <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-grow">{item.content}</p>
                                            <div className="mt-auto pt-4 border-t border-dashed border-gray-800 flex items-center text-blue-500 text-sm font-bold group-hover:gap-2 transition-all">
                                                Read More <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredNews.length === 0 && (
                            <div className="text-center py-20 bg-[#181818] rounded-xl border border-dashed border-gray-800">
                                <Newspaper className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                                <p className="text-gray-400 text-lg">No news posted yet.</p>
                            </div>
                        )}

                        {/* NEWS DETAILS MODAL */}
                        {activeNews && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in mobile-modal-fix overflow-y-auto" onClick={() => setSelectedNews(null)}>
                                <div className="bg-[#1e1e1e] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative animate-slide-up border border-gray-700" onClick={e => e.stopPropagation()}>
                                    <button
                                        ref={closeButtonRef}
                                        onClick={() => setSelectedNews(null)}
                                        className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black/70 text-white transition-colors z-20 backdrop-blur-md"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="overflow-y-auto">
                                        {activeNews.mediaUrl && activeNews.mediaType === 'image' && (
                                            <div className="h-72 w-full bg-[#202020] relative">
                                                <img src={activeNews.mediaUrl} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent" />
                                                <div className="absolute bottom-6 left-8 text-white">
                                                    <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded mb-2 inline-block shadow text-white">{activeNews.category}</span>
                                                    <h2 className="text-4xl font-bold leading-tight drop-shadow-md">{activeNews.title}</h2>
                                                </div>
                                            </div>
                                        )}

                                        {(!activeNews.mediaUrl || activeNews.mediaType !== 'image') && (
                                            <div className="p-8 pb-0">
                                                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded mb-2 inline-block border border-blue-500/30">{activeNews.category}</span>
                                                <h2 className="text-3xl font-bold text-white mb-2">{activeNews.title}</h2>
                                            </div>
                                        )}

                                        <div className="p-8">
                                            <div className="flex items-center gap-3 mb-6 text-gray-400 text-sm border-b border-gray-700 pb-4">
                                                <Calendar size={16} />
                                                <span>{new Date(activeNews.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </div>

                                            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                                                {activeNews.content.split('\n').map((para, i) => (
                                                    <p key={i} className="mb-4">{para}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // === SUGGESTIONS VIEW ===
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* FORM COLUMN */}
                            <div className="lg:col-span-1">
                                <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 shadow-lg sticky top-6">
                                    <div className="bg-blue-500/10 p-4 -m-6 mb-6 border-b border-blue-500/20 rounded-t-xl">
                                        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                                            <Send size={18} /> Submit Suggestion
                                        </h2>
                                        <p className="text-blue-300/70 text-xs mt-1">Help us improve your campus life.</p>
                                    </div>

                                    {isSubmitted ? (
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-8 text-center animate-fade-in flex flex-col items-center justify-center h-64">
                                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircle size={32} className="text-green-500" />
                                            </div>
                                            <h3 className="font-bold text-green-400 text-lg mb-1">Received!</h3>
                                            <p className="text-green-300/80 text-sm">Thank you for your feedback.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Category</label>
                                                <select
                                                    className="w-full p-2.5 bg-[#202020] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-white"
                                                    value={category}
                                                    onChange={e => setCategory(e.target.value)}
                                                >
                                                    <option className="bg-[#202020]">General</option>
                                                    <option className="bg-[#202020]">Facilities</option>
                                                    <option className="bg-[#202020]">Academics</option>
                                                    <option className="bg-[#202020]">Welfare</option>
                                                    <option className="bg-[#202020]">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Subject</label>
                                                <input
                                                    className="w-full p-2.5 bg-[#202020] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-white placeholder-gray-600"
                                                    placeholder="Brief summary..."
                                                    value={title}
                                                    onChange={e => setTitle(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Description</label>
                                                <textarea
                                                    className="w-full p-3 bg-[#202020] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none text-sm transition-all text-white placeholder-gray-600"
                                                    placeholder="Describe your suggestion in detail..."
                                                    value={content}
                                                    onChange={e => setContent(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={cooldownRemaining > 0}
                                                className={`w-full py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 border ${cooldownRemaining > 0
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed border-gray-600'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                                                    }`}
                                            >
                                                <Send size={18} />
                                                {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Submit Now'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>

                            {/* HISTORY COLUMN */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-200">
                                        <MessageSquare size={20} className="text-gray-500" />
                                        My Suggestions History
                                    </h2>
                                    <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-700">{mySuggestions.length} Total</span>
                                </div>

                                {mySuggestions.length === 0 ? (
                                    <div className="text-center py-16 bg-[#181818] border border-dashed border-gray-800 rounded-xl">
                                        <div className="w-16 h-16 bg-[#202020] rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Lightbulb size={24} className="text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 font-medium">You haven't submitted any suggestions yet.</p>
                                        <p className="text-gray-600 text-sm mt-1">Found a bug? Have an idea? Fill out the form!</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {mySuggestions.map((s: any) => (
                                            <div key={s.id} className="bg-[#181818] p-5 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-all hover:border-gray-600 group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            {new Date(s.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600 italic">
                                                            Posted as: {s.studentName}
                                                        </span>
                                                    </div>
                                                    <StatusBadge status={s.status} />
                                                </div>
                                                {s.category && (
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase font-bold inline-block mb-2">
                                                        {s.category}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-gray-200 mb-2 group-hover:text-blue-400 transition-colors">{s.title}</h3>
                                                <p className="text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed bg-[#121212]/50 p-2 rounded">{s.content}</p>
                                                {s.adminResponse && (
                                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <MessageSquare size={12} className="text-blue-400" />
                                                            <span className="text-[10px] font-bold text-blue-400 uppercase">Admin Response</span>
                                                        </div>
                                                        <p className="text-sm text-blue-300/90">{s.adminResponse}</p>
                                                        {s.respondedAt && (
                                                            <span className="text-[9px] text-blue-400/60 mt-1 block">
                                                                {new Date(s.respondedAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-600 flex justify-end font-medium">
                                                    Ref: {s.id}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'Resolved':
            return <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"><CheckCircle size={10} /> Resolved</span>;
        case 'Reviewing':
            return <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"><Clock size={10} /> Reviewing</span>;
        default:
            return <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"><AlertCircle size={10} /> Pending</span>;
    }
}
