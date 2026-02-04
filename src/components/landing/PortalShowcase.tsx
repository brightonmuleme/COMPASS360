import React from 'react';
import styles from '../../app/landing.module.css';

interface PortalShowcaseProps {
    title: string;
    tagline: string;
    imageSrc: string;
    onSignUp: () => void;
    onLearnMore: () => void;
    onSignIn: () => void;
    themeColor?: string; // Optional accent color override
    index?: number; // Used for alternating layout
}

const PortalShowcase: React.FC<PortalShowcaseProps> = ({ title, tagline, imageSrc, onSignUp, onLearnMore, onSignIn, themeColor, index = 0 }) => {
    const isReversed = index % 2 !== 0;

    return (
        <section className={styles.section} style={{ background: '#000', overflow: 'hidden' }}>
            <div className={`${styles.portalContentWrapper} ${isReversed ? styles.reversed : ''}`}>

                {/* Text Side */}
                <div className={styles.portalTextContent}>
                    <h2 className={styles.roleTitle}
                        style={themeColor ? {
                            backgroundImage: `linear-gradient(180deg, ${themeColor} 0%, rgba(255, 255, 255, 0.7) 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: '5rem', // Make it really pop
                            lineHeight: 1.1
                        } : {}}
                    >
                        {title}
                    </h2>
                    <p className={styles.roleTagline} style={{ fontSize: '1.5rem', maxWidth: '500px' }}>{tagline}</p>
                    <div className={styles.buttonGroup}>
                        <button className={styles.btnPrimary} style={themeColor ? { background: themeColor } : {}} onClick={onSignUp}>
                            Sign Up
                        </button>
                        <button
                            className={styles.btnSecondary}
                            style={themeColor ? { color: themeColor, borderColor: themeColor } : {}}
                            onClick={onLearnMore}
                        >
                            Learn more
                        </button>
                        <button
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: themeColor || '#fff',
                                padding: '10px 20px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                textDecoration: 'underline'
                            }}
                            onClick={onSignIn}
                        >
                            Sign In
                        </button>
                    </div>
                </div>

                {/* Visual Side */}
                <div className={styles.portalVisualContent}>
                    {/* Ambient Glow */}
                    <div className={styles.glow} style={{ background: themeColor || '#fff' }}></div>

                    {/* Floating Image */}
                    <img
                        src={imageSrc}
                        alt={title}
                        className={styles.portalImageLarge}
                    />
                </div>

            </div>
        </section>
    );
};

export default PortalShowcase;
