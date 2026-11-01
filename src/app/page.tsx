'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { TranscriptionStudio } from '@/components/TranscriptionStudio';
import { FeaturesSection } from '@/components/FeaturesSection';
import { Footer } from '@/components/Footer';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';
import { AuthView } from '@/components/AuthView';
import { useAuth } from '@/context/AuthContext';
import { SidebarTab } from '@/components/Sidebar';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'app' | 'auth'>('home');
  const [dashboardTab, setDashboardTab] = useState<SidebarTab>('dashboard');
  const [isPenguinInfoOpen, setIsPenguinInfoOpen] = useState(false);
  const [penguinSection, setPenguinSection] = useState('about');
  const { user } = useAuth();

  // Sync with browser URL hash & history
  useEffect(() => {
    const handleUrlState = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (hash === '#login' || hash === '#signin' || search.get('auth') === 'true') {
        setCurrentView('auth');
      } else if (
        hash === '#studio' ||
        hash === '#app' ||
        search.get('app') === 'true' ||
        search.get('view') === 'studio'
      ) {
        if (!user) {
          setCurrentView('auth');
        } else {
          setCurrentView('app');
        }
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
  }, [user]);

  // Handle clicking "Start Transcribing" from Home page
  // Redirects to Sign In / Sign Up if not logged in, otherwise opens dashboard
  const handleStartTranscribing = () => {
    if (!user) {
      setCurrentView('auth');
      window.history.pushState(null, '', '#login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('app');
      window.history.pushState(null, '', '#studio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAuthSuccess = () => {
    setCurrentView('app');
    window.history.pushState(null, '', '#studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {/* Navigation Bar */}
      <Navbar
        isAppView={currentView === 'app'}
        onBackToHome={handleBackToHome}
        onOpenStudio={handleStartTranscribing}
        onOpenPenguinInfo={handleOpenPenguinInfo}
        activeTab={dashboardTab}
        onNavigate={(tab) => {
          setDashboardTab(tab);
          if (currentView !== 'app') setCurrentView('app');
        }}
      />

      {currentView === 'home' && (
        /* ======================================================== */
        /* LANDING PAGE (Home Page) - Public View with Footer       */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between animate-fadeIn">
          {/* Hero Section with Start Transcribing CTA */}
          <HeroSection
            onOpenStudio={handleStartTranscribing}
            onLoadSample={handleStartTranscribing}
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

      {currentView === 'auth' && (
        /* ======================================================== */
        /* SIGN IN / SIGN UP PAGE - Public View with Footer         */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between animate-fadeIn">
          <AuthView
            initialMode="signin"
            onSuccess={handleAuthSuccess}
            onBackToHome={handleBackToHome}
          />

          <Footer
            onOpenStudio={handleStartTranscribing}
            onOpenPenguinInfo={handleOpenPenguinInfo}
          />
        </div>
      )}

      {currentView === 'app' && (
        /* ======================================================== */
        /* AUDIO TRANSCRIPTION DASHBOARD (AUTHENTICATED)            */
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
