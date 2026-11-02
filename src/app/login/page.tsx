'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';

export default function LoginPage() {
  const router = useRouter();
  const [isPenguinInfoOpen, setIsPenguinInfoOpen] = useState(false);
  const [penguinSection, setPenguinSection] = useState('about');

  const handleSuccess = () => {
    router.push('/#studio');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleOpenPenguinInfo = (section: string = 'about') => {
    setPenguinSection(section);
    setIsPenguinInfoOpen(true);
  };

  return (
    <main className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white flex flex-col overflow-y-auto lg:overflow-hidden">
      {/* Retain the exact original website header (Image 3) */}
      <Navbar
        isAppView={false}
        onBackToHome={handleBackToHome}
        onOpenStudio={() => router.push('/#studio')}
        onOpenSignIn={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenPenguinInfo={handleOpenPenguinInfo}
      />

      {/* Login UI (Image 2) fitted on one screen without vertical scrolling */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto">
        <AuthView
          initialMode="signin"
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
