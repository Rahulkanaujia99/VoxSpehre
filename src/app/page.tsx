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
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      {/* Navigation Bar - Preserved exact website header (Image 3) */}
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

      {currentView === 'home' && (
        /* ======================================================== */
        /* LANDING PAGE (Home Page) - Image 1 Home Page UI          */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between animate-fadeIn">
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
        <div className="flex-1 flex flex-col animate-fadeIn">
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
