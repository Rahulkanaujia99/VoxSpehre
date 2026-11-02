'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { Footer } from '@/components/Footer';
import { PenguinInfoModal } from '@/components/PenguinInfoModal';

export default function SignUpPage() {
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
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      {/* Retain the exact original website header (Image 3) */}
      <Navbar
        isAppView={false}
        onBackToHome={handleBackToHome}
        onOpenStudio={() => router.push('/#studio')}
        onOpenSignIn={() => router.push('/login')}
        onOpenPenguinInfo={handleOpenPenguinInfo}
      />

      {/* Sign Up UI (Image 2) */}
      <div className="flex-1 flex flex-col justify-between animate-fadeIn">
        <AuthView
          initialMode="signup"
          onSuccess={handleSuccess}
          onBackToHome={handleBackToHome}
          onOpenPenguinInfo={handleOpenPenguinInfo}
        />
        {/* Retain exact original website footer */}
        <Footer
          onOpenStudio={() => router.push('/#studio')}
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
