'use client';

import React, { useState } from 'react';
import { Play, Pause, FileText, CheckCircle2, Volume2, Sparkles, Download } from 'lucide-react';

interface DashboardPreviewCardProps {
  onLoadSample: (sampleId: string) => void;
  onOpenStudio: (sampleId?: string) => void;
}

export const DashboardPreviewCard: React.FC<DashboardPreviewCardProps> = ({
  onLoadSample,
  onOpenStudio,
}) => {
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);

  const toggleDemoPlay = () => {
    setIsPlayingDemo(!isPlayingDemo);
    if (!isPlayingDemo) {
      const interval = setInterval(() => {
        setActiveSpeakerIndex((prev) => (prev + 1) % 3);
      }, 3000);
      return () => clearInterval(interval);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Decorative Glow Backdrop */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-sky-500/20 rounded-[2.5rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

      <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-200/90 overflow-hidden transition-all duration-300 hover:shadow-indigo-100">
        {/* Dark Top Header Bar (matches Image 1) */}
        <div className="bg-[#0b1329] px-6 py-3.5 flex items-center justify-between text-white text-xs font-semibold tracking-wider">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-100 uppercase tracking-wider text-[11px] font-bold">
              VOXSPHERE LIVE ACOUSTIC & BATCH ENGINE
            </span>
          </div>

          <div className="bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-mono border border-slate-700/60 flex items-center gap-1.5">
            <span>AI SPEECH RECOGNITION</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Executive Meetings & Consultations
              </h3>
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase mt-0.5">
                AUDIO RECORDING • TIMESTAMPED SEGMENTS • CLEAR USABLE RECORDS
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-tight shrink-0 shadow-2xs">
              <span>EXPORT TO WORD & PDF</span>
              <span className="text-emerald-600 font-extrabold">✓</span>
            </div>
          </div>

          {/* Stat Boxes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Accuracy Score Card */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Speech-to-Text Precision
              </span>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  High Fidelity
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Multi-speaker conversations converted to text
              </span>
            </div>

            {/* Yield & Audio Waveform Card */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Processing Speed
                </span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  FAST AUTOMATION
                </span>
              </div>

              {/* Dynamic Waveform Bars */}
              <div className="flex items-end justify-between h-9 px-1 my-1 gap-1">
                {[30, 45, 60, 85, 40, 95, 70, 50, 90, 100, 65, 80, 55, 90].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      i >= 8
                        ? 'bg-emerald-500'
                        : i >= 4
                        ? 'bg-indigo-600'
                        : 'bg-teal-500'
                    } ${isPlayingDemo ? 'animate-pulse' : ''}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Multi-speaker diarization</span>
                <span>Editable audio</span>
              </div>
            </div>
          </div>

          {/* 3 Strategic Speaker Audio Segments (Replaced maritime operations / shipbuilding persona) */}
          <div className="space-y-3">
            {/* Segment 1: Strategic Intelligence */}
            <div
              onClick={() => {
                setActiveSpeakerIndex(0);
                onLoadSample('sample-strategic-intelligence');
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeSpeakerIndex === 0
                  ? 'bg-indigo-50/60 border-indigo-200 shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    STRATEGIC INTELLIGENCE
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    Verified ✓
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  00:00 - 00:18 <span className="text-slate-400 text-[10px]">Direct Stream</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900">
                Gautam Jain • <span className="text-slate-500 font-medium">Founder & CEO, Penguin International</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                “Synthesizing primary research and qualitative expert calls. Real-time speech transcription mapped to directional intelligence.”
              </p>
            </div>

            {/* Segment 2: Global Management Consulting */}
            <div
              onClick={() => {
                setActiveSpeakerIndex(1);
                onLoadSample('sample-pe-due-diligence');
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeSpeakerIndex === 1
                  ? 'bg-teal-50/60 border-teal-200 shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                    GLOBAL ADVISORY
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    Verified ✓
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  00:19 - 00:44 <span className="text-slate-400 text-[10px]">Direct Stream</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900">
                Principal Partner • <span className="text-slate-500 font-medium">Top Management Consulting Firm</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                “Penguin International’s AI transcription and analyst verification delivered rapid qualitative turnaround for our client briefing.”
              </p>
            </div>

            {/* Segment 3: Private Equity Due Diligence */}
            <div
              onClick={() => {
                setActiveSpeakerIndex(2);
                onLoadSample('sample-gcc-operations');
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeSpeakerIndex === 2
                  ? 'bg-purple-50/60 border-purple-200 shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-100">
                    PRIVATE EQUITY & M&A
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    Verified ✓
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  00:45 - 01:14 <span className="text-slate-400 text-[10px]">Direct Stream</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900">
                Investment Partner • <span className="text-slate-500 font-medium">Global Private Equity Fund</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                “Fifty-two hours of target leadership interviews transcribed with zero domain terminology distortion. Ready for investment committee.”
              </p>
            </div>
          </div>

          {/* Bottom Pills (Matches Image 1 tags row) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              SPEAKER TIMESTAMPS ATTACHED
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              MULTI-FORMAT EXPORTS READY
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              WORD, PDF & TXT EXPORTS
            </span>
          </div>

          {/* Alert Callout Box */}
          <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-sky-900 font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <span>
                Transcripts ready for convenient Word, PDF, and TXT export
              </span>
            </div>
            
            <button
              onClick={() => onOpenStudio('sample-pe-due-diligence')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline shrink-0 cursor-pointer"
            >
              Launch Editor →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
