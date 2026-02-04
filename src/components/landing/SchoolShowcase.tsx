
import React from 'react';
import styles from '../../app/landing.module.css';
import { useSchoolData, FeaturedSchool, INITIAL_FEATURED_SCHOOLS } from '@/lib/store';

import Link from 'next/link';

const SchoolShowcase = () => {
    const { featuredSchools } = useSchoolData();

    // Use content from store, fallback to default if empty
    const schools = (featuredSchools && featuredSchools.length > 0) ? featuredSchools : INITIAL_FEATURED_SCHOOLS;

    return (
        <section className={styles.schoolSection}>
            <div className={styles.schoolHeader}>
                <h2 className={styles.sectionTitle}>Discover Top Schools</h2>
                <p className={styles.sectionSubtitle}>Find the perfect environment for your child's growth.</p>
            </div>

            <div className={styles.horizontalScrollContainer}>
                {schools.map(school => (
                    <div key={school.id} className={styles.schoolCard}>
                        <div className={styles.schoolCardImage} style={{ backgroundImage: `url(${school.image})` }}>
                            <div className={styles.schoolCardOverlay}></div>
                        </div>
                        <div className={styles.schoolCardContent}>
                            <span className={styles.schoolCategory}>{school.category}</span>
                            <h3 className={styles.schoolName}>{school.name}</h3>
                            <p className={styles.schoolTagline}>{school.tagline}</p>
                            <Link href={`/apply/${school.id}`} style={{ display: 'block', marginTop: '0.5rem' }}>
                                <button className={styles.btnSecondary} style={{ width: '100%', background: 'white', color: 'black', border: 'none' }}>
                                    Visit School
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SchoolShowcase;
