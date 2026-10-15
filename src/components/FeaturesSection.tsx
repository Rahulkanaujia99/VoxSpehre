'use client';

import React from 'react';
import {
  Mic2,
  Cpu,
  Layers,
  FileCheck2,
  ShieldCheck,
  Globe2,
  Zap,
  Brain,
  BarChart3,
  Search,
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <div className="py-20 bg-slate-50/60 border-t border-slate-200/80 space-y-24">
      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>THE VOXSPHERE WORKFLOW</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How to Convert Audio to Text in 4 Steps
          </h2>
          <p className="text-base text-slate-600">
            From audio upload to an editable transcript, streamline your transcription workflow in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Upload & Prepare Audio',
              desc: 'Upload supported audio files, including MP3, WAV, and M4A. Validate recordings and prepare audio for transcription.',
              icon: Mic2,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            },
            {
              step: '02',
              title: 'AI Speech Recognition',
              desc: 'Convert spoken words into text using an integrated AI transcription engine. Support automatic language detection and user-selected languages where available.',
              icon: Cpu,
              color: 'text-teal-600 bg-teal-50 border-teal-100',
            },
            {
              step: '03',
              title: 'Review & Refine Transcript',
              desc: 'Review generated text, correct recognition errors, edit paragraphs, and search for specific terms. Display timestamps and speaker labels when supported.',
              icon: Layers,
              color: 'text-purple-600 bg-purple-50 border-purple-100',
            },
            {
              step: '04',
              title: 'Export & Download',
              desc: 'Download finalized transcripts in supported formats, including TXT, DOCX, and PDF. Generate SRT or VTT subtitles when timestamped segments are available.',
              icon: FileCheck2,
              color: 'text-blue-600 bg-blue-50 border-blue-100',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-600 transition-colors">
                    {item.step}
                  </span>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Column Capabilities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left Card: PRIVATE & CONTROLLED PROCESSING */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0b1329] text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-6 shadow-xl border border-slate-800">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>PRIVATE & CONTROLLED PROCESSING</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Your Audio, Your Control
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Process business recordings and research interviews through a clearly defined transcription workflow. Protect API credentials, restrict access to uploaded files, and manage temporary audio and transcript storage according to the application&apos;s configured retention policy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-slate-200 font-semibold">Secure API Credential Handling</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-slate-200 font-semibold">Controlled File Access</span>
              </div>
            </div>
          </div>

          {/* Right Card: MULTILINGUAL SPEECH-TO-TEXT */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl shadow-slate-100 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>MULTILINGUAL SPEECH-TO-TEXT</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Transcribe Across Languages
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Convert supported languages into editable transcripts while preserving the original spoken language. Use language selection, transcript editing, and optional translation to support multilingual meetings, interviews, and research recordings.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Automatic Language Detection</span>
                <span className="text-indigo-600 font-medium text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">When supported</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Speaker Identification</span>
                <span className="text-indigo-600 font-medium text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">When supported</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Transcript Summaries</span>
                <span className="text-teal-700 font-medium text-[11px] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Optional enhancement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exports Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-sky-500/10 border border-slate-200 rounded-3xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-black text-slate-900">
            Export Audio Transcriptions to Word, PDF, and TXT
          </h3>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            From business meetings to research interviews, export finalized transcripts and subtitles in flexible corporate formats: Word (.docx/.doc), printable PDF, plain text (.txt), and SubRip (.srt).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-bold">
            <span className="px-4 py-2 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-2xs">
              Plain Text (.TXT)
            </span>
            <span className="px-4 py-2 rounded-xl bg-white text-blue-700 border border-blue-200 shadow-2xs">
              Microsoft Word (.DOCX / .DOC)
            </span>
            <span className="px-4 py-2 rounded-xl bg-white text-teal-700 border border-teal-200 shadow-2xs">
              Printable PDF Document
            </span>
            <span className="px-4 py-2 rounded-xl bg-white text-purple-700 border border-purple-200 shadow-2xs">
              SubRip Subtitles (.SRT)
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
