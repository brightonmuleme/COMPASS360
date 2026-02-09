"use client";
import React, { useState, useEffect } from 'react';

interface BackgroundSlideshowProps {
    images: string[];
    interval?: number;
}

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = ({ images, interval = 6000 }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (!images || images.length <= 1) return;

        const timer = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
                setNextIndex((prev) => (prev + 1) % images.length);
                setIsTransitioning(false);
            }, 1000); // Cross-fade duration
        }, interval);

        return () => clearInterval(timer);
    }, [images, interval]);

    if (!images || images.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: -1,
            background: '#000'
        }}>
            {/* Current Image */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${images[currentIndex]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'opacity 1s ease-in-out, transform 10s ease-out',
                    opacity: isTransitioning ? 0 : 1,
                    transform: isTransitioning ? 'scale(1.1)' : 'scale(1.05)',
                }}
            />

            {/* Next Image (Pre-loading and transitioning in) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${images[(currentIndex + 1) % images.length]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'opacity 1s ease-in-out, transform 10s ease-out',
                    opacity: isTransitioning ? 1 : 0,
                    transform: isTransitioning ? 'scale(1.05)' : 'scale(1.15)',
                }}
            />

            {/* Dark Overlay for Legibility */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)',
                zIndex: 1
            }} />
        </div>
    );
};

export default BackgroundSlideshow;
