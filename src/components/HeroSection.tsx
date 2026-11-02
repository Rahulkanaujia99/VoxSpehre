'use client';

import React from 'react';
import { ArrowRight, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { VoxRobot } from './VoxRobot';

interface HeroSectionProps {
  onOpenStudio: (sampleId?: string) => void;
  onLoadSample: (sampleId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenStudio,
  onLoadSample,
}) => {
  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-sky-100/40 via-indigo-50/30 to-teal-50/25 rounded-full blur-3xl pointer-events-none -z-10 transform-gpu" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, Description, CTAs, Features */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-extrabold text-indigo-600 border-l-2 border-indigo-600 pl-2">
                VoxSphere
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-bold tracking-tight">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                AI-POWERED AUDIO INTELLIGENCE
              </span>
            </div>

            {/* Bold Headline with colorful highlighted text */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Transform critical conversations into{' '}
              <span className="text-indigo-600">clear</span>,{' '}
              <span className="text-teal-600">usable records</span>.
            </h1>

            {/* Subtext Paragraph */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
              VoxSphere transforms audio recordings into clear, editable transcripts using AI-powered speech recognition. Designed for executive meetings, expert consultations, business discussions, and qualitative research, it streamlines documentation and enables convenient export to Word, PDF, and TXT formats.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                id="cta"
                onClick={() => onOpenStudio('sample-pe-due-diligence')}
                onMouseEnter={() => {
                  if (typeof window !== 'undefined' && window.__voxRobot) {
                    window.__voxRobot.setMood('happy');
                    window.__voxRobot.gesture('yes');
                  }
                }}
                onMouseLeave={() => {
                  if (typeof window !== 'undefined' && window.__voxRobot) {
                    window.__voxRobot.setMood('curious');
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-lg shadow-indigo-200/80 transition-all cursor-pointer"
              >
                <span>Start Transcribing</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="sample"
                onClick={() => {
                  onLoadSample('sample-pe-due-diligence');
                }}
                onMouseEnter={() => {
                  if (typeof window !== 'undefined' && window.__voxRobot) {
                    window.__voxRobot.gesture('wink');
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-98 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-slate-500 fill-slate-500" />
                <span>Try Sample Audio</span>
              </button>
            </div>

            {/* Capability Highlights Checkmarks Row */}
            <div className="pt-3 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-[13px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Multilingual Audio Transcription</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Editable, Timestamped Transcripts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Flexible Document Export</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Mascot */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="mascot relative aspect-square w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[500px] transform-gpu">
              {/* Subtle Hexagonal Background Overlay */}
              <div
                className="hexes absolute inset-0 pointer-events-none opacity-60 sm:opacity-70 [mask-image:radial-gradient(circle,#000_25%,transparent_70%)] [-webkit-mask-image:radial-gradient(circle,#000_25%,transparent_70%)]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='104' viewBox='0 0 120 104'%3E%3Cpath d='M30 2h60l30 50-30 50H30L0 52z' fill='none' stroke='white' stroke-width='3'/%3E%3C/svg%3E\")",
                  backgroundSize: '120px 104px',
                }}
              />
              {/* Radial Lighting Glow (removed Tailwind .ring class which created the black outline circle) */}
              <div
                className="absolute inset-[8%] rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.98) 0, rgba(255,255,255,0) 70%)',
                }}
              />
              {/* Three.js Interactive Mascot */}
              <VoxRobot />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
