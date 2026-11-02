'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';

export default function SignUpPage() {
  const router = useRouter();
  const { navigate: transitionNavigate } = usePageTransition();
  const [isPenguinInfoOpen, setIsPenguinInfoOpen] = useState(false);
  const [penguinSection, setPenguinSection] = useState('about');

  const handleSuccess = () => {
    transitionNavigate('/#studio');
  };

  const handleBackToHome = () => {
    transitionNavigate('/');
  };

  const handleOpenPenguinInfo = (section: string = 'about') => {
    setPenguinSection(section);
    setIsPenguinInfoOpen(true);
  };

  return (
    <main className="min-h-screen lg:h-screen lg:max-h-screen scout-premium-bg text-slate-900 selection:bg-indigo-500 selection:text-white flex flex-col overflow-y-auto lg:overflow-hidden relative">
      {/* Full Viewport Edge-to-Edge Ambient Gradient Layer (Upper, Middle, Lower) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Upper-Left Light Blue & Soft Teal Ambient Radial Glow */}
        <div className="absolute -top-32 -left-28 w-[750px] h-[750px] rounded-full bg-gradient-to-br from-[#EAF4FF] via-[#E8FAF7]/85 to-transparent blur-[140px] opacity-90"></div>

        {/* Upper-Right Soft Purple & Lavender Ambient Radial Glow */}
        <div className="absolute -top-36 -right-28 w-[800px] h-[800px] rounded-full bg-gradient-to-bl from-[#F8F2FF] via-[#F1EEFF]/90 to-transparent blur-[150px] opacity-95"></div>

        {/* Bottom-Right Subtle Teal Gradient Glow */}
        <div className="absolute -bottom-36 -right-20 w-[750px] h-[750px] rounded-full bg-gradient-to-tl from-[#E8FAF7] via-[#EAF4FF]/70 to-transparent blur-[140px] opacity-85"></div>

        {/* Bottom-Left Soft Lavender Mist */}
        <div className="absolute -bottom-28 -left-20 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-[#F1EEFF] via-[#F8F2FF]/70 to-transparent blur-[130px] opacity-80"></div>

        {/* Subtle Decorative Constellation Lines in Viewport Corners */}
        <svg className="absolute top-20 left-6 w-96 h-96 opacity-[0.16] text-indigo-400 pointer-events-none" viewBox="0 0 300 300" fill="none">
          <circle cx="40" cy="40" r="3.5" fill="currentColor" />
          <circle cx="160" cy="70" r="3.5" fill="currentColor" />
          <circle cx="90" cy="180" r="3.5" fill="currentColor" />
          <circle cx="240" cy="120" r="3" fill="currentColor" />
          <line x1="40" y1="40" x2="160" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="40" x2="90" y2="180" stroke="currentColor" strokeWidth="1" />
          <line x1="160" y1="70" x2="240" y2="120" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="90" y1="180" x2="240" y2="120" stroke="currentColor" strokeWidth="0.8" />
        </svg>

        <svg className="absolute top-20 right-6 w-96 h-96 opacity-[0.16] text-purple-400 pointer-events-none" viewBox="0 0 300 300" fill="none">
          <circle cx="260" cy="50" r="3.5" fill="currentColor" />
          <circle cx="140" cy="80" r="3.5" fill="currentColor" />
          <circle cx="210" cy="190" r="3.5" fill="currentColor" />
          <circle cx="70" cy="140" r="3" fill="currentColor" />
          <line x1="260" y1="50" x2="140" y2="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="260" y1="50" x2="210" y2="190" stroke="currentColor" strokeWidth="1" />
          <line x1="140" y1="80" x2="70" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="210" y1="190" x2="70" y2="140" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Retain the exact original website header (Image 3) */}
      <div className="relative z-10 w-full">
        <Navbar
          isAppView={false}
          onBackToHome={handleBackToHome}
          onOpenStudio={() => transitionNavigate('/#studio')}
          onOpenSignIn={() => transitionNavigate('/login')}
          onOpenPenguinInfo={handleOpenPenguinInfo}
        />
      </div>

      {/* Sign Up UI (Image 2) fitted on one screen without vertical scrolling */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto relative z-10">
        <AuthView
          initialMode="signup"
          onSuccess={handleSuccess}
          onBackToHome={handleBackToHome}
          onOpenPenguinInfo={handleOpenPenguinInfo}
        />
      </div>

      <PenguinInfoModal
        isOpen={isPenguinInfoOpen}
        onClose={() => setIsPenguinInfoOpen(false)}
        activeSection={penguinSection}
      />
    </main>
  );
}
