'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { Footer } from '@/components/Footer';

export default function SignUpPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/#studio');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <Navbar
        isAppView={false}
        onBackToHome={handleBackToHome}
        onOpenStudio={() => router.push('/login')}
        onOpenPenguinInfo={() => router.push('/')}
      />

      <AuthView
        initialMode="signup"
        onSuccess={handleSuccess}
        onBackToHome={handleBackToHome}
      />

      <Footer
        onOpenStudio={() => router.push('/login')}
        onOpenPenguinInfo={() => router.push('/')}
      />
    </main>
  );
}
