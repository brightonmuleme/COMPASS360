"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

const CustomVideoPlayer = ({
    src,
    id,
    poster,
    className,
    autoPlay,
    onNext
}: {
    src: string,
    id?: string,
    poster?: string,
    className?: string,
    autoPlay?: boolean,
    onNext?: () => void
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay || false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    // Load saved progress
    useEffect(() => {
        if (id && videoRef.current) {
            const savedTime = localStorage.getItem(`video_progress_${id}`);
            if (savedTime) {
                videoRef.current.currentTime = parseFloat(savedTime);
            }
        }
    }, [id, src]);

    // Shortcuts and Persistence
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'k': case ' ': e.preventDefault(); togglePlay(); break;
                case 'f': e.preventDefault(); toggleFullscreen(); break;
                case 'j': vid.currentTime -= 10; break;
                case 'l': vid.currentTime += 10; break;
                case 'm': toggleMute(); break;
            }
        };

        const onTimeUpdate = () => {
            if (vid.duration && Number.isFinite(vid.duration)) {
                const currentProgress = (vid.currentTime / vid.duration) * 100;
                setProgress(currentProgress);
                // Save progress every 5 seconds or so (implicitly handled by timeupdate frequency)
                if (id && Math.floor(vid.currentTime) % 2 === 0) {
                    localStorage.setItem(`video_progress_${id}`, vid.currentTime.toString());
                }
            }
        };

        const onLoadedMetadata = () => setDuration(vid.duration);
        const onEnded = () => {
            setIsPlaying(false);
            if (onNext) onNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        vid.addEventListener('timeupdate', onTimeUpdate);
        vid.addEventListener('loadedmetadata', onLoadedMetadata);
        vid.addEventListener('ended', onEnded);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            vid.removeEventListener('timeupdate', onTimeUpdate);
            vid.removeEventListener('loadedmetadata', onLoadedMetadata);
            vid.removeEventListener('ended', onEnded);
        };
    }, [id, onNext]);

    const togglePlay = () => {
        const vid = videoRef.current;
        if (!vid) return;
        if (vid.paused) { vid.play(); setIsPlaying(true); }
        else { vid.pause(); setIsPlaying(false); }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
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

    const changeSpeed = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
            setShowSpeedMenu(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return "00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={containerRef} className={`relative group bg-black overflow-hidden flex flex-col justify-center ${className}`}>
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full max-h-full object-contain cursor-pointer"
                onClick={togglePlay}
                playsInline
            />

            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-widest pointer-events-auto">
                        HD 1080p
                    </div>
                </div>

                <div className="flex justify-center items-center flex-1">
                    {!isPlaying && (
                        <div className="bg-white/10 hover:bg-white/20 rounded-full p-6 pointer-events-auto cursor-pointer backdrop-blur-md transition-all scale-110 active:scale-95" onClick={togglePlay}>
                            <Play fill="white" size={48} className="text-white" />
                        </div>
                    )}
                </div>

                <div className="space-y-3 pointer-events-auto">
                    {/* Progress Bar */}
                    <div className="relative group/progress h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current) videoRef.current.currentTime = percent * duration;
                    }}>
                        <div className="h-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `${progress}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-white">
                        <div className="flex items-center gap-6">
                            <button onClick={togglePlay} className="hover:scale-110 transition-transform">
                                {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                            </button>

                            <div className="flex items-center gap-2">
                                <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                                    {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                                </button>
                                <span className="text-sm font-medium tracking-tight">
                                    {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 relative">
                            {/* Speed Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    className="text-xs font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                                >
                                    {playbackSpeed}x
                                </button>
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full mb-2 right-0 bg-[#181818] border border-gray-800 rounded-lg overflow-hidden shadow-2xl min-w-[80px]">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => changeSpeed(speed)}
                                                className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 transition-colors ${playbackSpeed === speed ? 'text-red-500' : 'text-gray-300'}`}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={toggleFullscreen} className="hover:scale-110 transition-transform"><Maximize2 size={22} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default CustomVideoPlayer;
