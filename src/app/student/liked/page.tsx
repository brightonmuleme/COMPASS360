"use client";

import { useSchoolData, TutorContent } from "@/lib/store";
import { useState, useRef, useEffect } from "react";
import { Play, FileText, Heart, X, Maximize2, Pause, Volume2, VolumeX } from "lucide-react";

import Link from "next/link";
import CustomVideoPlayer from "@/components/shared/CustomVideoPlayer";

export default function LikedContent() {
    const { studentProfile, tutorContents, toggleStudentLike, tutors } = useSchoolData();
    const [viewingContent, setViewingContent] = useState<TutorContent | null>(null);

    const likedItems = tutorContents
        .filter(c => studentProfile.likedContentIds.includes(c.id))
        .filter(c => c.status === 'Published');

    // Escape key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setViewingContent(null);
        };
        if (viewingContent) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [viewingContent]);

    const handleUnlike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        toggleStudentLike(id);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold mb-2">My List</h1>
            <p className="text-gray-500 mb-8">Content you have liked and saved.</p>

            {likedItems.length === 0 ? (
                <div className="text-center py-20 bg-[#181818] rounded-xl border border-dashed border-gray-800">
                    <Heart size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 text-lg mb-2">You haven't liked any content yet.</p>
                    <p className="text-sm text-gray-500 mb-6">Visit the Resource Center to find and like videos.</p>
                    <Link href="/student/resources" className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition inline-flex items-center gap-2">
                        Browse Resource Center
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {likedItems.map(content => {
                        const tutor = tutors.find(t => t.id === content.tutorId);
                        return (
                            <div
                                key={content.id}
                                className="bg-[#181818] border border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group relative text-gray-200"
                                onClick={() => setViewingContent(content)}
                            >
                                <div className="aspect-video bg-gray-900 relative">
                                    {content.type === 'Video' ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Play size={32} className="text-white opacity-80" />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FileText size={32} className="text-white opacity-80" />
                                        </div>
                                    )}
                                    {content.thumbnailUrl && <img src={content.thumbnailUrl} className="w-full h-full object-cover opacity-60" />}

                                    <button
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-red-500 rounded-full hover:bg-white transition-colors"
                                        onClick={(e) => handleUnlike(e, content.id)}
                                        title="Remove from Liked"
                                    >
                                        <Heart size={16} fill="currentColor" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-100 line-clamp-1 mb-1">{content.title}</h3>
                                    <p className="text-sm text-gray-400 mb-2">{tutor?.name || 'Independent Creator'}</p>
                                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{content.type}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewingContent && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                    <button
                        onClick={() => setViewingContent(null)}
                        className="absolute top-6 right-6 z-50 bg-white/10 p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800">
                        {viewingContent.type === 'Video' ? (
                            <div className="aspect-video">
                                <CustomVideoPlayer src={viewingContent.url || ''} className="w-full h-full" autoPlay />
                            </div>
                        ) : (
                            <div className="bg-gray-900 p-20 text-center text-white">
                                <FileText size={64} className="mx-auto mb-4 text-gray-600" />
                                <h2 className="text-2xl font-bold mb-4">{viewingContent.title}</h2>
                                {viewingContent.url && (
                                    <a href={viewingContent.url} target="_blank" className="text-blue-400 hover:underline">Download / View File</a>
                                )}
                            </div>
                        )}
                        <div className="p-6 bg-[#181818] border-t border-gray-800">
                            <h2 className="text-2xl font-bold text-white mb-2">{viewingContent.title}</h2>
                            <p className="text-gray-400">{viewingContent.description}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
