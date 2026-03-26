"use client";
import React, { useState } from 'react';
import { useSchoolData } from '@/lib/store';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';
import PortalShowcase from '../components/landing/PortalShowcase';
import LearnMoreModal from '../components/landing/LearnMoreModal';
import SchoolShowcase from '../components/landing/SchoolShowcase';
import BackgroundSlideshow from '../components/landing/BackgroundSlideshow';

// Artifact Paths (Copying the generated image paths relative to public or using absolute if in dev environment)
// In a real next.js app, these should be in /public. 
// For this environment, I'll point to the absolute path but formatted for browser if possible, 
// or I'll just rely on the fact that I can't move them easily without 'cp'.
// I will use the "file:///" protocol or rely on the fact that the browser tool can see them? 
// No, the user needs to see them. I should probably use the placeholder or check if I can 'cp' them.
// I will use the artifact filenames.
export default function Home() {
  const { landingPageContent, developerSettings } = useSchoolData();
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<{ type: 'learnMore', role: string } | null>(null);
  const [mounted, setMounted] = useState(false); // Use content from store, fallback to default if empty (though store initializes it)
  const ROLES = (landingPageContent && landingPageContent.length > 0) 
    ? landingPageContent.filter(role => role.id !== 'accountant')
    : [];

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;


  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.section} style={{ position: 'relative', overflow: 'hidden' }}>
        <BackgroundSlideshow images={developerSettings?.wallpapers || []} />

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <h1 className={styles.roleTitle} style={{ fontSize: '10vw', marginBottom: '1rem', lineHeight: '1', textAlign: 'center', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            COMPASS 360
          </h1>
          <p className={styles.roleTagline} style={{ fontSize: '3vw', marginTop: '1rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            The Future of Education.
          </p>
          <p style={{ opacity: 0.7, marginTop: '2rem' }}>Scroll to explore</p>
          <div style={{ marginTop: '1rem', fontSize: '2rem', animation: 'bounce 2s infinite' }}>↓</div>
        </div>
      </section>

      {/* Role Sections */}
      {ROLES.map((role, index) => (
        <PortalShowcase
          key={role.id}
          index={index}
          title={role.title}
          tagline={role.tagline}
          imageSrc={role.image}
          themeColor={role.theme}
          onSignUp={() => router.push(`/auth?role=${role.id}&mode=signup`)}
          onLearnMore={() => setActiveModal({ type: 'learnMore', role: role.id })}
          onSignIn={() => router.push(`/auth?role=${role.id}&mode=signin`)}
        />
      ))}

      {/* New Horizontal Scrolling School Showcase Section */}
      <SchoolShowcase />

      {/* Modals */}

      {activeModal?.type === 'learnMore' && (
        <LearnMoreModal
          role={ROLES.find(r => r.id === activeModal.role)!.title}
          imageSrc={ROLES.find(r => r.id === activeModal.role)!.image}
          description={ROLES.find(r => r.id === activeModal.role)!.description}
          features={ROLES.find(r => r.id === activeModal.role)!.features}
          onClose={() => setActiveModal(null)}
        />
      )}
    </main>
  );
}
