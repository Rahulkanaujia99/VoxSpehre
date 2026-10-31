import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  ArrowLeft,
  User,
  LogOut,
  Cloud,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  onOpenStudio: (sampleId?: string) => void;
  onOpenPenguinInfo: (section?: string) => void;
  isAppView?: boolean;
  onBackToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenStudio,
  onOpenPenguinInfo,
  isAppView = false,
  onBackToHome,
}) => {
  const { user, profile, signOut, isConfigured } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <>
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

              {user && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cloud Sync Active</span>
                </div>
              )}
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

          {/* Right CTA Area & Supabase Auth User State */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Supabase User Authentication Section */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 transition-all cursor-pointer border border-slate-200/80"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {userInitial}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight max-w-[120px] truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{userDisplayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Cloud className="w-3 h-3" />
                        <span>Supabase Sync Connected</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        signOut();
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setShowAuthModal(true);
                }}
                className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Sign In</span>
              </button>
            )}

            {isAppView ? (
              /* App View Mode: Back to Home Button */
              <button
                onClick={onBackToHome}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:text-indigo-600 active:scale-95 rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            ) : (
              /* Landing Page Mode: Start Transcribing */
              <button
                onClick={() => onOpenStudio('sample-pe-due-diligence')}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Start Transcribing</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
        onSuccess={() => onOpenStudio()}
      />
    </>
  );
};

