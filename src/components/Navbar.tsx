'use client';

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
  Search,
  Bell,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { SidebarTab } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onOpenStudio: (sampleId?: string) => void;
  onOpenSignIn?: () => void;
  onOpenPenguinInfo: (section?: string) => void;
  isAppView?: boolean;
  onBackToHome?: () => void;
  activeTab?: SidebarTab;
  onNavigate?: (tab: SidebarTab) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenStudio,
  onOpenSignIn,
  onOpenPenguinInfo,
  isAppView = false,
  onBackToHome,
  activeTab = 'dashboard',
  onNavigate,
  searchQuery = '',
  onSearchChange,
}) => {
  const { user, profile, signOut } = useAuth();
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

  // ========================================================
  // 1. APP VIEW / DASHBOARD HEADER (Ceramic Clay Style matching Image 2 & HTML reference)
  // ========================================================
  if (isAppView) {
    return (
      <>
        <header className="clay-card-surface rounded-[24px] sm:rounded-clay-3xl px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 transition-all w-full">
          {/* Brand Logo & Menu Drawer Toggle (Left) */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Circular menu button */}
            <button
              type="button"
              aria-label="Toggle navigation drawer"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-clay-pill border border-white dark:border-slate-700 transition-all cursor-pointer shrink-0"
              title="Toggle Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" />
            </button>

            {/* Official Penguin International + VoxSphere logo branding */}
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer group"
              title="Return to Home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/penguin-international-logo.png"
                alt="Penguin International"
                className="h-7 sm:h-8 w-auto max-w-[125px] sm:max-w-[155px] object-contain shrink-0"
              />
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  VoxSphere
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-400 mt-0.5 hidden sm:inline">
                  AI SPEECH SUITE
                </span>
              </div>
            </button>
          </div>

          {/* Center Search Input Pill */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-2 lg:mx-4">
            <div className="w-full relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search audio files, transcripts, or summaries..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-50/90 hover:bg-white focus:bg-white dark:bg-slate-800 dark:hover:bg-slate-800/90 dark:focus:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-400 transition-all"
              />
            </div>
          </div>

          {/* Right Header Actions: Status Pill + Notification + User Avatar with Role */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Status Indicator Pill (matching Image 2 Encrypted Portal badge) */}
            <div className="hidden lg:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-slate-800 dark:text-emerald-300 text-xs shadow-clay-pill shrink-0 status-pill-active">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold tracking-tight text-slate-700 dark:text-emerald-300">Cloud Sync Active</span>
            </div>

            {/* Dark Mode / Light Mode Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell Circle Button with Pip */}
            <button
              type="button"
              aria-label="Notifications"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-white dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-clay-pill relative transition-all cursor-pointer shrink-0"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
            </button>

            {/* User Profile Pill */}
            <div className="relative shrink-0" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-white dark:bg-slate-800 shadow-clay-pill border border-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                aria-expanded={showUserDropdown}
                aria-haspopup="true"
                title="Account & Profile Settings"
              >
                <div
                  className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner shrink-0"
                  style={{ background: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)' }}
                >
                  {userInitial}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="font-bold text-xs text-slate-900 dark:text-white block leading-tight whitespace-nowrap">
                    {userDisplayName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight truncate max-w-[155px]">
                    {userEmail}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    showUserDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown */}
              {showUserDropdown && (
                <div
                  className="user-dropdown-surface absolute right-0 top-full mt-2.5 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl p-2.5 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-[100] animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header info */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{userDisplayName}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{userEmail}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 w-fit">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Cloud Sync Active</span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="p-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('profile')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                        activeTab === 'profile'
                          ? 'bg-teal-50/80 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-teal-50 dark:group-hover:bg-teal-950 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold leading-snug">My Profile</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">View & edit profile</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTab('settings')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                        activeTab === 'settings'
                          ? 'bg-teal-50/80 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-teal-50 dark:group-hover:bg-teal-950 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold leading-snug">My Settings</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Preferences & security</span>
                      </div>
                    </button>
                  </div>

                  {/* Sign out */}
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setShowUserDropdown(false);
                        onBackToHome?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authModalMode}
          onSuccess={() => onOpenStudio()}
        />
      </>
    );
  }

  // ========================================================
  // 2. LANDING PAGE NAVBAR (Exact Website Header)
  // ========================================================
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/30 border-slate-200/30 backdrop-blur-md border-b transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-[4.25rem] flex items-center justify-between">
          {/* Brand Logo */}
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

          {/* Navigation Links */}
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

          {/* Right CTA Area & User State */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
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
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      showUserDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 bg-white rounded-2xl p-2.5 shadow-2xl border border-slate-200/90 z-[100] animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{userDisplayName}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-mono truncate">{userEmail}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 w-fit">
                        <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cloud Sync Active</span>
                      </div>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectTab('profile')}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                          activeTab === 'profile'
                            ? 'bg-indigo-50/80 text-indigo-900'
                            : 'hover:bg-slate-50 text-slate-700'
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
                          <span className="block text-sm font-bold leading-snug">My Profile</span>
                          <span className="block text-xs text-slate-500">View & edit profile</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTab('settings')}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group text-left ${
                          activeTab === 'settings'
                            ? 'bg-indigo-50/80 text-indigo-900'
                            : 'hover:bg-slate-50 text-slate-700'
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
                          <span className="block text-sm font-bold leading-snug">My Settings</span>
                          <span className="block text-xs text-slate-500">Preferences & security</span>
                        </div>
                      </button>
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                          if (onBackToHome) onBackToHome();
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
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
        onSuccess={() => onOpenStudio()}
      />
    </>
  );
};
