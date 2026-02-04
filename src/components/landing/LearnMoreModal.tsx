import React from 'react';
import styles from '../../app/landing.module.css';

interface LearnMoreModalProps {
    role: string;
    imageSrc: string;
    description: string;
    features: string[];
    onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ role, imageSrc, description, features, onClose }) => {
    return (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modalContent} style={{ maxWidth: '800px' }}>
                <button className={styles.closeButton} onClick={onClose}>✕</button>

                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{role}</h2>
                <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '1.2rem' }}>{description}</p>

                <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
                    <img src={imageSrc} style={{ width: '100%', display: 'block' }} alt={role} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Key Features</h4>
                        <ul style={{ paddingLeft: '1.2rem', color: '#aaa', lineHeight: '1.6' }}>
                            {features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Why VINE?</h4>
                        <p style={{ color: '#aaa', lineHeight: '1.6' }}>
                            Experience the most intuitive education platform ever built.
                            Seamlessly integrated, beautifully designed, and powerful enough to run entire institutions.
                        </p>
                        <p style={{ color: '#aaa', marginTop: '1rem' }}>
                            Start your journey today.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearnMoreModal;
