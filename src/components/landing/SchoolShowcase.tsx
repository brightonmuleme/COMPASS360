"use client";
import React, { useState, useEffect } from 'react';
import styles from '../../app/landing.module.css';
import { useSchoolData, FeaturedSchool } from '@/lib/store';
import Link from 'next/link';
import { Share2, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SchoolShowcase = () => {
    const { featuredSchools } = useSchoolData(); 
    const [mounted, setMounted] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [liveSchools, setLiveSchools] = useState<FeaturedSchool[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);

    // SYNC: Fetch exactly what the Developer Portal sees
    useEffect(() => {
        setMounted(true);
        const fetchLiveSchools = async () => {
            try {
                // We fetch from the cloud table 'featured_schools'
                const { data, error } = await supabase.from('featured_schools').select('*');
                if (data && !error) {
                    const mappedSchools: FeaturedSchool[] = data.map(row => ({
                        id: row.id,
                        name: row.name,
                        category: row.category || 'Academy',
                        logo: row.logo_url || '',
                        image: row.cover_url || '',
                        tagline: row.tagline || '',
                        description: row.description || '',
                        location: row.location || '',
                        contact: row.contact_phone || '',
                        email: row.contact_email || '',
                        enrollmentStatus: row.enrollment_status || 'Enrolling now',
                        feesStructure: row.fees_url || '',
                        gallery: row.gallery || [],
                        status: 'Active'
                    }));
                    setLiveSchools(mappedSchools);
                }
            } catch (err) {
                console.error("Landing Page Sync Error:", err);
            } finally {
                setIsRefreshing(false);
            }
        };
        fetchLiveSchools();
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
            try { await navigator.share(shareData); } catch (err) { }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopiedId(schoolId);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (err) { }
        }
    };

    if (!mounted) return null;

    // Show only live schools. No dummies.
    const finalSchools = liveSchools.filter(s => s.status === 'Active');

    return (
        <section className={styles.schoolSection}>
            <div className={styles.schoolHeader}>
                <h2 className={styles.sectionTitle}>Discover Top Schools</h2>
                <p className={styles.sectionSubtitle}>Find the perfect environment for your child's growth.</p>
            </div>

            {isRefreshing ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500/50" size={40} />
                </div>
            ) : finalSchools.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 mx-6">
                    <p className="text-gray-500">No schools currently listed on the landing page.</p>
                </div>
            ) : (
                <div className={styles.horizontalScrollContainer}>
                    {finalSchools.map(school => (
                        <div key={school.id} className={styles.schoolCard}>
                            <Link href={`/apply/${school.id}`} className="block w-full overflow-hidden shrink-0">
                                <div className={styles.schoolCardImage} style={{ backgroundImage: `url(${school.image})` }}>
                                    <div className={styles.schoolCardOverlay}></div>
                                </div>
                            </Link>
                            <div className={styles.schoolCardContent}>
                                <div className="flex flex-col h-full justify-between">
                                    <div className="relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={styles.schoolCategory}>{school.category}</span>
                                            {school.logo && (
                                                <div className={styles.schoolLogoTag}>
                                                    <img src={school.logo} alt={school.name} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className={styles.schoolName}>{school.name}</h3>
                                        <p className={styles.schoolTagline}>{school.tagline}</p>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <Link href={`/apply/${school.id}`} className="flex-1">
                                            <button className={styles.btnSecondary} style={{
                                                width: '100%',
                                                background: 'white',
                                                color: 'black',
                                                border: 'none',
                                                padding: '0.8rem 1.2rem',
                                                fontSize: '14px',
                                                fontWeight: '800',
                                                boxShadow: '0 4px 15px rgba(255,255,255,0.15)',
                                                borderRadius: '12px'
                                            }}>
                                                Visit School
                                            </button>
                                        </Link>
                                        <button
                                            onClick={(e) => handleShare(e, school.id, school.name)}
                                            className="p-3 bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-xl transition-all group flex items-center justify-center min-w-[54px] shadow-lg"
                                            title="Share Application Form"
                                        >
                                            {copiedId === school.id ? (
                                                <Check className="w-5 h-5 text-emerald-400 animate-in zoom-in duration-300" />
                                            ) : (
                                                <Share2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default SchoolShowcase;
