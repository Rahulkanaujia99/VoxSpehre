'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface TranscribeHeroCardProps {
  onTranscribeClick: () => void;
  onLoadSample?: (sampleId: string) => void;
}

export const TranscribeHeroCard: React.FC<TranscribeHeroCardProps> = ({
  onTranscribeClick,
  onLoadSample,
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);

  const snippets = [
    {
      bold: "We merge AI precision with human strategic intelligence",
      text: "and we give enterprise leaders absolute clarity on expert calls, boardroom strategy, and market research. In this project, our specialized analysts synthesize every nuance...",
    },
    {
      bold: "From raw executive interviews to board-ready intelligence,",
      text: "our voice transcription engine strips noise and captures technical domain vocabulary with 99.6% verbatim accuracy for Fortune 500 decision-makers.",
    },
    {
      bold: "Data to Dashboards and qualitative expert insights,",
      text: "transcribed, diarized, and synchronized with second-by-second timestamps for global capability centers and top management consulting firms.",
    },
  ];

  const handleTranscribeClick = () => {
    setIsTranscribing(true);
    setTimeout(() => {
      setIsTranscribing(false);
      setActiveSnippetIndex((prev) => (prev + 1) % snippets.length);
      if (onLoadSample) {
        onLoadSample('sample-strategic-intelligence');
      }
      onTranscribeClick();
    }, 450);
  };

  const currentSnippet = snippets[activeSnippetIndex];

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none group">
      {/* Decorative Subtle Ambient Glow */}
      <div className="absolute -inset-2 bg-gradient-to-tr from-teal-500/20 via-indigo-500/15 to-lime-400/20 rounded-[3rem] blur-2xl opacity-70 group-hover:opacity-100 transition duration-700 pointer-events-none" />

      {/* Main Container - Matches Image 2 layout, radius, and proportions */}
      <div className="relative aspect-[4/4.4] sm:aspect-[4/4.2] w-full bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/90 flex flex-col justify-end">
        {/* Background Image of Speaker with Mic (Exact match to Image 2 visual) */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/images/transcribe-portrait.png"
            alt="Penguin International Audio Speech Intelligence"
            fill
            priority
            className="object-cover object-center transform scale-102 group-hover:scale-104 transition-transform duration-700"
          />
          {/* Subtle gradient vignette at bottom for seamless card blending */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Floating Translucent Card (Matches Image 2's floating box at bottom) */}
        <div className="relative m-4 sm:m-6 p-5 sm:p-6 bg-[#e6e9ecd9] backdrop-blur-md rounded-3xl border border-white/60 shadow-xl space-y-3.5 transition-all">
          {/* Lime Green Transcribe Pill Button */}
          <div className="relative">
            <button
              onClick={handleTranscribeClick}
              className="w-full bg-[#d2f86f] hover:bg-[#c2ed57] active:scale-[0.99] text-slate-900 font-bold text-sm sm:text-base py-3 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer border border-[#bfe94f]/50"
              title="Click to transcribe speech"
            >
              {/* Audio/Text Captions Icon */}
              <div className="w-5 h-4 border-2 border-slate-900 rounded-[4px] flex flex-col justify-center items-center gap-[2px] px-[2px]">
                <div className="w-full h-[1.5px] bg-slate-900 rounded-full" />
                <div className="w-full h-[1.5px] bg-slate-900 rounded-full" />
              </div>
              <span className="tracking-tight text-slate-950 font-bold">
                {isTranscribing ? 'Transcribing...' : 'Transcribe'}
              </span>
            </button>

            {/* Stylized Click Pointer Hand (Directly matching Image 2's cursor detail) */}
            <div className="absolute -bottom-3 right-10 sm:right-16 pointer-events-none drop-shadow-md select-none transform hover:scale-110 transition-transform">
              <svg
                width="28"
                height="32"
                viewBox="0 0 24 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.5 13V4.5C8.5 3.67 9.17 3 10 3C10.83 3 11.5 3.67 11.5 4.5V11.5H12.5C12.5 10.95 12.95 10.5 13.5 10.5C14.05 10.5 14.5 10.95 14.5 11.5V12.5H15.5C15.5 11.95 15.95 11.5 16.5 11.5C17.05 11.5 17.5 11.95 17.5 12.5V14C17.5 18.14 14.14 21.5 10 21.5C7.24 21.5 4.87 19.99 3.65 17.74L2.5 15.5L3.6 14.5C4.05 14.09 4.7 13.98 5.25 14.24L7.5 15.35V13H8.5Z"
                  fill="white"
                  stroke="#0f172a"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Transcript Quote (Matches Image 2 text typography & hierarchy) */}
          <div className="pt-1 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
            <span className="font-bold text-slate-950">
              {currentSnippet.bold}{' '}
            </span>
            <span className="text-slate-600 font-normal">
              {currentSnippet.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
