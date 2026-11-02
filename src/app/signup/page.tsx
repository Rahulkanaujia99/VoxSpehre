'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthView } from '@/components/AuthView';

export default function SignUpPage() {
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
        initialMode="signup"
        onSuccess={handleSuccess}
        onBackToHome={handleBackToHome}
        onOpenPenguinInfo={() => router.push('/')}
      />
    </main>
  );
}
