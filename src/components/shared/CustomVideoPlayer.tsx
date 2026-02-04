"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

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
        const onTimeUpdate = () => {
            if (vid.duration && Number.isFinite(vid.duration)) {
                setProgress((vid.currentTime / vid.duration) * 100);
            }
        };
        const onLoadedMetadata = () => setDuration(vid.duration);
        const onEnded = () => setIsPlaying(false);

        vid.addEventListener('timeupdate', onTimeUpdate);
        vid.addEventListener('loadedmetadata', onLoadedMetadata);
        vid.addEventListener('ended', onEnded);
        return () => {
            vid.removeEventListener('timeupdate', onTimeUpdate);
            vid.removeEventListener('loadedmetadata', onLoadedMetadata);
            vid.removeEventListener('ended', onEnded);
        };
    }, [autoPlay]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const vid = videoRef.current;
        if (!vid) return;
        if (isPlaying) { vid.pause(); setIsPlaying(false); }
        else { vid.play(); setIsPlaying(true); }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return "00:00";
        try {
            return new Date(seconds * 1000).toISOString().substr(14, 5);
        } catch (e) { return "00:00"; }
    };

    return (
        <div ref={containerRef} className={`relative group bg-black overflow-hidden ${className}`}>
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-contain"
                onClick={togglePlay}
            />
            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 pointer-events-none">
                <div className="flex justify-center items-center flex-1">
                    {!isPlaying && <div className="bg-black/50 rounded-full p-4 pointer-events-auto cursor-pointer backdrop-blur" onClick={togglePlay}><Play fill="white" size={32} /></div>}
                </div>
                <div className="space-y-2 pointer-events-auto">
                    <div className="h-1 bg-gray-600 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current) videoRef.current.currentTime = percent * duration;
                    }}>
                        <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay}>{isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}</button>
                            <button onClick={toggleMute}>{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                            <span className="text-xs font-mono">
                                {formatTime(duration ? (progress / 100) * duration : 0)} / {formatTime(duration)}
                            </span>
                        </div>
                        <button onClick={toggleFullscreen}><Maximize2 size={20} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer;
