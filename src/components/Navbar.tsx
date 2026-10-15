'use client';

import React from 'react';
import Image from 'next/image';
import { Settings, Sparkles, ExternalLink, ArrowLeft, Radio } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenStudio: (sampleId?: string) => void;
  onOpenPenguinInfo: (section?: string) => void;
  isAppView?: boolean;
  onBackToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenStudio,
  onOpenPenguinInfo,
  isAppView = false,
  onBackToHome,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - Using Official Penguin International Logo & VoxSphere */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-opacity hover:opacity-90 py-1"
          onClick={isAppView && onBackToHome ? onBackToHome : () => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="VoxSphere • Penguin International"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/penguin-international-logo.png"
            alt="Penguin International — Strategic Intelligence | AI × Human"
            className="h-9 sm:h-11 w-auto max-w-[190px] sm:max-w-[220px] object-contain shrink-0"
          />
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 bg-clip-text text-transparent leading-none">
              VoxSphere
            </span>
            <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5 hidden sm:inline">
              AI Speech Suite
            </span>
          </div>
        </div>

        {/* Center Section: Differ depending on whether in App Mode or Landing Page */}
        {isAppView ? (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs font-bold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>VoxSphere Studio</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <span className="font-semibold text-slate-900 font-mono text-[11px]">Penguin_PE_DueDiligence_Review.m4a</span>
              <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">READY</span>
            </div>
          </div>
        ) : (
          <nav className="hidden md:flex items-center bg-slate-50/90 border border-slate-200/80 rounded-full px-5 py-2 shadow-xs space-x-6 text-[13px] font-semibold text-slate-700">
            <button
              onClick={() => onOpenPenguinInfo('about')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              About us
            </button>
            <button
              onClick={() => onOpenPenguinInfo('contact')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Contact us
            </button>
            <a
              href="https://www.penguin-international.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition-colors pl-1 border-l border-slate-200"
            >
              <span>Penguin International</span>
              <ExternalLink className="w-3 h-3 text-teal-600" />
            </a>
          </nav>
        )}

        {/* Right CTA Area */}
        <div className="flex items-center gap-3">
          {/* API Key / Engine Settings button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200 cursor-pointer"
            title="Configure AI Models & Keys"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">AI Keys</span>
          </button>

          {isAppView ? (
            /* App View Mode: Back to Home Button */
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:text-indigo-600 active:scale-95 rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600" />
              <span>Back to Home</span>
            </button>
          ) : (
            /* Landing Page Mode: Sign in & Open the app */
            <>
              <button
                onClick={() => onOpenPenguinInfo('contact')}
                className="hidden sm:inline text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors cursor-pointer"
              >
                Sign in
              </button>

              <button
                onClick={() => onOpenStudio('sample-pe-due-diligence')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Start Transcribing</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
