'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { TranscriptionStudio } from '@/components/TranscriptionStudio';
import { FeaturesSection } from '@/components/FeaturesSection';
import { Footer } from '@/components/Footer';
import { SettingsModal } from '@/components/SettingsModal';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';
import { AISettings } from '@/types/transcription';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'builtin',
  enableDiarization: true,
  enableTimestamps: true,
};

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'app'>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPenguinInfoOpen, setIsPenguinInfoOpen] = useState(false);
  const [penguinSection, setPenguinSection] = useState('about');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('sample-pe-due-diligence');
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  // Sync with browser URL hash & history
  useEffect(() => {
    const handleUrlState = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (hash === '#studio' || hash === '#app' || search.get('app') === 'true' || search.get('view') === 'studio') {
        setCurrentView('app');
        setSelectedSampleId('sample-pe-due-diligence');
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
  }, []);

  // Load saved settings from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('penguin_ai_settings');
      if (saved) {
        setAiSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load settings from localStorage', e);
    }
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    try {
      localStorage.setItem('penguin_ai_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  };

  // Open Studio specifically with Penguin_PE_DueDiligence_Review.m4a by default
  const handleOpenStudio = (sampleId: string = 'sample-pe-due-diligence') => {
    setSelectedSampleId(sampleId);
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStudio={(sampleId) => handleOpenStudio(sampleId || 'sample-pe-due-diligence')}
        onOpenPenguinInfo={handleOpenPenguinInfo}
      />

      {currentView === 'home' ? (
        /* ======================================================== */
        /* LANDING PAGE (Only Home Page content rendered here)      */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between animate-fadeIn">
          {/* Hero Section with Open the app CTAs and Interactive Preview */}
          <HeroSection
            onOpenStudio={(sampleId) => handleOpenStudio(sampleId || 'sample-pe-due-diligence')}
            onLoadSample={(id) => {
              setSelectedSampleId(id);
              handleOpenStudio(id);
            }}
          />

          {/* Pipeline & Intelligence Features Section */}
          <FeaturesSection />

          {/* Landing Page Footer */}
          <Footer
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenStudio={(sampleId) => handleOpenStudio(sampleId || 'sample-pe-due-diligence')}
            onOpenPenguinInfo={handleOpenPenguinInfo}
          />
        </div>
      ) : (
        /* ======================================================== */
        /* AI SPEECH INTELLIGENCE STUDIO (Opens when clicking App)  */
        /* Pre-loaded with Penguin_PE_DueDiligence_Review.m4a       */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between animate-fadeIn">
          <TranscriptionStudio
            initialSampleId={selectedSampleId}
            onOpenSettings={() => setIsSettingsOpen(true)}
            aiSettings={aiSettings}
            onBackToHome={handleBackToHome}
            onUpdateSettings={handleSaveSettings}
          />

          {/* Studio Footer */}
          <Footer
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenStudio={(sampleId) => handleOpenStudio(sampleId || 'sample-pe-due-diligence')}
            onOpenPenguinInfo={handleOpenPenguinInfo}
          />
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={aiSettings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Penguin International Information Modal */}
      <PenguinInfoModal
        isOpen={isPenguinInfoOpen}
        onClose={() => setIsPenguinInfoOpen(false)}
        activeSection={penguinSection}
      />
    </main>
  );
}
