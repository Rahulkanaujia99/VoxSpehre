'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  LayoutDashboard,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type SidebarTab = 'dashboard' | 'recordings' | 'profile' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onNewTranscription: () => void;
  recordingsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewTranscription,
  recordingsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user, profile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Rahul';

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleSelectTab = (tab: SidebarTab) => {
    onTabChange(tab);
    setShowProfileMenu(false);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-20 h-screen lg:h-[calc(100vh-5rem)] w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between p-4 z-50 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Top: + New Transcription Button */}
          <button
            onClick={() => {
              onNewTranscription();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-200/80 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Transcription</span>
          </button>

          {/* Primary Navigation Menu */}
          <div className="space-y-1.5 relative">
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              TRANSCRIBE
            </div>

            {/* 1. Dashboard */}
            <button
              onClick={() => handleSelectTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard
                className={`w-4 h-4 ${
                  activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span className="flex-1 text-left">Dashboard</span>
              {activeTab === 'dashboard' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>

            {/* 2. Recordings */}
            <button
              onClick={() => handleSelectTab('recordings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'recordings'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText
                className={`w-4 h-4 ${
                  activeTab === 'recordings' ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span className="flex-1 text-left">Recordings</span>
              {recordingsCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {recordingsCount}
                </span>
              )}
              {activeTab === 'recordings' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>

            {/* 3. User Profile Button with Dropdown Trigger */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'profile' || activeTab === 'settings'
                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <User
                  className={`w-4 h-4 ${
                    activeTab === 'profile' || activeTab === 'settings'
                      ? 'text-indigo-600'
                      : 'text-slate-400'
                  }`}
                />
                <span className="flex-1 text-left">User Profile</span>
                {(activeTab === 'profile' || activeTab === 'settings') && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1" />
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    showProfileMenu ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* ======================================================== */}
              {/* DROPDOWN MENU (Exact Match to Reference Image 1)         */}
              {/* ======================================================== */}
              {showProfileMenu && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl p-2 shadow-2xl border border-slate-200/90 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Option 1: My Profile */}
                  <div
                    onClick={() => handleSelectTab('profile')}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${
                      activeTab === 'profile' ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        activeTab === 'profile'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-[#f1f5f9] text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#1e293b] group-hover:text-indigo-900 leading-snug">
                        My Profile
                      </span>
                      <span className="block text-xs text-[#94a3b8]">
                        View & edit profile
                      </span>
                    </div>
                  </div>

                  {/* Option 2: My Settings */}
                  <div
                    onClick={() => handleSelectTab('settings')}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group mt-1 ${
                      activeTab === 'settings' ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        activeTab === 'settings'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-[#f1f5f9] text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <Settings className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#1e293b] group-hover:text-indigo-900 leading-snug">
                        My Settings
                      </span>
                      <span className="block text-xs text-[#94a3b8]">
                        Preferences & security
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Settings Navigation Item */}
            <button
              onClick={() => handleSelectTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings
                className={`w-4 h-4 ${
                  activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span className="flex-1 text-left">Settings</span>
              {activeTab === 'settings' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Section: User Profile Pill with quick click to toggle dropdown */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
              title="Click to open Profile & Settings"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {userInitial}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                  {userDisplayName}
                </span>
                <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.2 w-fit font-semibold mt-0.5 flex items-center gap-1">
                  <span className="text-amber-500 text-[9px]">★</span> Free
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
