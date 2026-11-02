'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthView } from '@/components/AuthView';

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/#studio');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-[#FAF8FF]">
      <AuthView
        initialMode="signin"
        onSuccess={handleSuccess}
        onBackToHome={handleBackToHome}
        onOpenPenguinInfo={() => router.push('/')}
      />
    </main>
  );
}
