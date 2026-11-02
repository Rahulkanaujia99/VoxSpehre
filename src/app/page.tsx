'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { TranscriptionStudio } from '@/components/TranscriptionStudio';
import { FeaturesSection } from '@/components/FeaturesSection';
import { Footer } from '@/components/Footer';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';
import { SidebarTab } from '@/components/Sidebar';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { navigate: transitionNavigate } = usePageTransition();
  const [currentView, setCurrentView] = useState<'home' | 'app'>('home');
  const [dashboardTab, setDashboardTab] = useState<SidebarTab>('dashboard');
  const [isPenguinInfoOpen, setIsPenguinInfoOpen] = useState(false);
  const [penguinSection, setPenguinSection] = useState('about');

  // Sync with browser URL hash & history
  useEffect(() => {
    const handleUrlState = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (
        hash === '#studio' ||
        hash === '#app' ||
        search.get('app') === 'true' ||
        search.get('view') === 'studio'
      ) {
        setCurrentView('app');
      } else if (hash === '#login' || hash === '#signin') {
        transitionNavigate('/login');
      } else {
        setCurrentView('home');
      }
    };

    handleUrlState();
    window.addEventListener('popstate', handleUrlState);
    window.addEventListener('hashchange', handleUrlState);
    return () => {
      window.removeEventListener('popstate', handleUrlState);
      window.removeEventListener('hashchange', handleUrlState);
    };
  }, [transitionNavigate]);

  // Handle clicking "Start Transcribing" from Home page:
  // Smoothly transitions to login page if unauthenticated, or opens studio dashboard
  const handleStartTranscribing = (sampleId?: string) => {
    if (user) {
      setCurrentView('app');
      window.history.pushState(null, '', '#studio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      transitionNavigate('/login');
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    window.history.pushState(null, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPenguinInfo = (section: string = 'about') => {
    setPenguinSection(section);
    setIsPenguinInfoOpen(true);
  };

  return (
    <main className="min-h-screen home-premium-bg text-slate-900 selection:bg-indigo-500 selection:text-white flex flex-col justify-between relative overflow-x-hidden">
      {/* Full Viewport Ambient Gradient Glow Layer (matching Image 2) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu" style={{ contain: 'strict' }}>
        {/* Upper-Left Light Blue & Soft Teal Glow */}
        <div className="absolute -top-32 -left-28 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#EAF4FF] via-[#E8FAF7]/80 to-transparent blur-[90px] opacity-85 transform-gpu" />
        {/* Upper-Right Pale Purple & Soft Lavender Glow */}
        <div className="absolute -top-36 -right-28 w-[750px] h-[750px] rounded-full bg-gradient-to-bl from-[#F8F2FF] via-[#F1EEFF]/85 to-transparent blur-[90px] opacity-90 transform-gpu" />
        {/* Subtle Central Teal Mist */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-b from-[#E8FAF7]/30 via-[#EAF4FF]/40 to-transparent blur-[100px] opacity-75 transform-gpu" />
      </div>

      {/* Navigation Bar - Preserved exact website header (Image 1 & 2) */}
      <div className="relative z-10 w-full">
        <Navbar
          isAppView={currentView === 'app'}
          onBackToHome={handleBackToHome}
          onOpenStudio={handleStartTranscribing}
          onOpenSignIn={() => transitionNavigate('/login')}
          onOpenPenguinInfo={handleOpenPenguinInfo}
          activeTab={dashboardTab}
          onNavigate={(tab) => {
            setDashboardTab(tab);
            if (currentView !== 'app') setCurrentView('app');
          }}
        />
      </div>

      {currentView === 'home' && (
        /* ======================================================== */
        /* LANDING PAGE (Home Page) - Image 1 & 2 Home Page UI      */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between relative z-10">
          {/* Hero Section with Start Transcribing & Try Sample Audio CTAs */}
          <HeroSection
            onOpenStudio={handleStartTranscribing}
            onLoadSample={(sampleId) => {
              setCurrentView('app');
              window.history.pushState(null, '', '#studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Pipeline & Intelligence Features Section */}
          <FeaturesSection />

          {/* Landing Page Footer */}
          <Footer
            onOpenStudio={handleStartTranscribing}
            onOpenPenguinInfo={handleOpenPenguinInfo}
          />
        </div>
      )}

      {currentView === 'app' && (
        /* ======================================================== */
        /* AUDIO TRANSCRIPTION DASHBOARD (AUTHENTICATED / ACTIVE)   */
        /* Footer is hidden on authenticated dashboard pages        */
        /* ======================================================== */
        <div className="flex-1 flex flex-col relative z-10">
          <TranscriptionStudio
            onBackToHome={handleBackToHome}
            activeTab={dashboardTab}
            onTabChange={setDashboardTab}
          />
        </div>
      )}

      {/* Penguin International Information Modal */}
      <PenguinInfoModal
        isOpen={isPenguinInfoOpen}
        onClose={() => setIsPenguinInfoOpen(false)}
        activeSection={penguinSection}
      />
    </main>
  );
}
