import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VoxSphere | AI Audio Transcription & Speech-to-Text',
  description:
    'VoxSphere is an AI audio transcription tool and speech-to-text software. Convert audio to text with multilingual transcription, timestamped meeting transcripts, and export to Word, PDF, and TXT.',
  keywords: [
    'AI audio transcription tool',
    'speech-to-text software',
    'audio-to-text converter',
    'multilingual transcription',
    'meeting transcription',
    'audio transcription to Word',
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
