import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ExternalLink,
  ArrowLeft,
  User,
  Settings,
  LogOut,
  Cloud,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { SidebarTab } from './Sidebar';

interface NavbarProps {
  onOpenStudio: (sampleId?: string) => void;
  onOpenSignIn?: () => void;
  onOpenPenguinInfo: (section?: string) => void;
  isAppView?: boolean;
  onBackToHome?: () => void;
  activeTab?: SidebarTab;
  onNavigate?: (tab: SidebarTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenStudio,
  onOpenSignIn,
  onOpenPenguinInfo,
  isAppView = false,
  onBackToHome,
  activeTab = 'dashboard',
  onNavigate,
}) => {
  const { user, profile, signOut, isConfigured } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Rahul Kanaujia';

  const userEmail = user?.email || profile?.email || 'rahul@penguin-international.com';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserDropdown]);

  const handleSelectTab = (tab: SidebarTab) => {
    setShowUserDropdown(false);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-50 w-full ${isAppView ? 'bg-white/95 border-slate-200/80 shadow-2xs' : 'bg-white/30 border-slate-200/30'} backdrop-blur-md border-b transition-all`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-[4.25rem] flex items-center justify-between">
          {/* Brand Logo - Using Official Penguin International Logo & VoxSphere */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer transition-opacity hover:opacity-90 py-1"
            onClick={() => {
              if (onBackToHome) {
                onBackToHome();
              } else {
                window.location.href = '/';
              }
            }}
            title="VoxSphere • Penguin International"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/penguin-international-logo.png"
              alt="Penguin International — Strategic Intelligence | AI × Human"
              className="h-8 sm:h-9 md:h-10 w-auto max-w-[170px] sm:max-w-[200px] object-contain shrink-0"
            />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-sm sm:text-base md:text-lg font-black tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 bg-clip-text text-transparent leading-none">
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
            <nav className="hidden sm:flex items-center bg-white/80 backdrop-blur-md border border-slate-200/70 rounded-full px-5 py-2 shadow-xs space-x-5 text-[13px] font-semibold text-slate-700">
              <button
                id="nav-about"
                onClick={() => onOpenPenguinInfo('about')}
                onMouseEnter={() => {
                  if (typeof window !== 'undefined' && (window as any).__voxRobot) {
                    (window as any).__voxRobot.trick();
                  }
                }}
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
              <div className="h-4 w-px bg-slate-200" />
              <a
                href="https://www.penguin-international.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition-colors"
              >
                <span>Penguin International</span>
                <ExternalLink className="w-3 h-3 text-teal-600" />
              </a>
            </nav>
          )}

          {/* Right CTA Area & Supabase Auth User State */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Supabase User Authentication Section */}
            {user ? (
              <div className="relative shrink-0" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white/95 hover:bg-white text-slate-800 transition-all cursor-pointer border border-slate-300/80 shadow-xs hover:shadow-sm"
                  title="Click to view profile & settings"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex items-center gap-1.5 text-left text-xs sm:text-[13px]">
                    <span className="font-bold text-slate-900 leading-tight whitespace-nowrap">
                      {userDisplayName}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-500 font-mono hidden sm:inline whitespace-nowrap">
                      ({userEmail})
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* User Profile Popover Dropdown matching Reference Image 1 & 2 */}
                {showUserDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 bg-white rounded-2xl p-2.5 shadow-2xl border border-slate-200/90 z-[100] animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header info: Name & Email */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{userDisplayName}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-mono truncate">{userEmail}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 w-fit">
                        <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cloud Sync Active</span>
                      </div>
                    </div>

                    <div className="p-1 space-y-1">
                      {/* Option 1: My Profile */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('profile')}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                          activeTab === 'profile' ? 'bg-indigo-50/80 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            activeTab === 'profile'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                          }`}
                        >
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-snug">
                            My Profile
                          </span>
                          <span className="block text-xs text-slate-500">
                            View & edit profile
                          </span>
                        </div>
                      </button>

                      {/* Option 2: My Settings */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('settings')}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                          activeTab === 'settings' ? 'bg-indigo-50/80 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            activeTab === 'settings'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                          }`}
                        >
                          <Settings className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-snug">
                            My Settings
                          </span>
                          <span className="block text-xs text-slate-500">
                            Preferences & security
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Sign out */}
                    <div className="pt-1 mt-1 border-t border-slate-100 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                          if (onBackToHome) {
                            onBackToHome();
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onOpenSignIn) {
                    onOpenSignIn();
                  } else {
                    onOpenStudio();
                  }
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
                id="cta-header"
                onClick={() => onOpenStudio('sample-pe-due-diligence')}
                onMouseEnter={() => {
                  if (typeof window !== 'undefined' && (window as any).__voxRobot) {
                    (window as any).__voxRobot.setMood('happy');
                    (window as any).__voxRobot.gesture('yes');
                  }
                }}
                onMouseLeave={() => {
                  if (typeof window !== 'undefined' && (window as any).__voxRobot) {
                    (window as any).__voxRobot.setMood('curious');
                  }
                }}
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

