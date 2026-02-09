
import React from 'react';
import styles from '../../app/landing.module.css';
import { useSchoolData, FeaturedSchool, INITIAL_FEATURED_SCHOOLS } from '@/lib/store';

import Link from 'next/link';
import { Share2, Check } from 'lucide-react';

const SchoolShowcase = () => {
    const { featuredSchools } = useSchoolData();
    const [mounted, setMounted] = React.useState(false);
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleShare = async (e: React.MouseEvent, schoolId: string, schoolName: string) => {
        e.preventDefault();
        e.stopPropagation();

        const shareUrl = `${window.location.origin}/apply/${schoolId}`;
        const shareData = {
            title: `${schoolName} - Admission Form`,
            text: `Apply now to ${schoolName} through the Compass 360 portal.`,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopiedId(schoolId);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    // Use content from store, fallback to default if empty or none are active
    let schools = (featuredSchools && featuredSchools.length > 0) ? featuredSchools : INITIAL_FEATURED_SCHOOLS;

    // Final check: if the list exists but has no active items, force use of initials for demo purposes
    const activeSchools = schools.filter(s => s.status === 'Active');
    const finalSchools = activeSchools.length > 0 ? activeSchools : INITIAL_FEATURED_SCHOOLS.filter(s => s.status === 'Active');

    if (!mounted) return null;

    return (
        <section className={styles.schoolSection}>
            <div className={styles.schoolHeader}>
                <h2 className={styles.sectionTitle}>Discover Top Schools</h2>
                <p className={styles.sectionSubtitle}>Find the perfect environment for your child's growth.</p>
            </div>

            <div className={styles.horizontalScrollContainer}>
                {finalSchools.map(school => (
                    <div key={school.id} className={styles.schoolCard}>
                        <div className={styles.schoolCardImage} style={{ backgroundImage: `url(${school.image})` }}>
                            <div className={styles.schoolCardOverlay}></div>
                        </div>
                        <div className={styles.schoolCardContent}>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <span className={styles.schoolCategory}>{school.category}</span>
                                    <h3 className={styles.schoolName}>{school.name}</h3>
                                    <p className={styles.schoolTagline}>{school.tagline}</p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Link href={`/apply/${school.id}`} className="flex-1">
                                        <button className={styles.btnSecondary} style={{ width: '100%', background: 'white', color: 'black', border: 'none', padding: '0.6rem 1rem', fontSize: '13px', fontWeight: '800' }}>
                                            Visit School
                                        </button>
                                    </Link>
                                    <button
                                        onClick={(e) => handleShare(e, school.id, school.name)}
                                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group flex items-center justify-center min-w-[48px]"
                                        title="Share Application Form"
                                    >
                                        {copiedId === school.id ? (
                                            <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in duration-300" />
                                        ) : (
                                            <Share2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SchoolShowcase;
