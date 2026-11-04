'use client';

import React from 'react';
import {
  Plus,
  FileAudio,
  Scissors,
  MessageSquareText,
  BarChart3,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type SidebarTab =
  | 'dashboard'
  | 'recordings'
  | 'trimmer'
  | 'chat'
  | 'analytics'
  | 'profile'
  | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onNewTranscription: () => void;
  recordingsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onBackToHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewTranscription,
  recordingsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  onBackToHome,
}) => {
  const { signOut } = useAuth();

  const handleSelectTab = (tab: SidebarTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navItems = [
    {
      id: 'recordings' as SidebarTab,
      label: 'Recordings',
      icon: FileAudio,
      badge: recordingsCount > 0 ? recordingsCount : null,
    },
    {
      id: 'trimmer' as SidebarTab,
      label: 'Audio Trimmer',
      icon: Scissors,
      badge: null,
    },
    {
      id: 'chat' as SidebarTab,
      label: 'AI Chat',
      icon: MessageSquareText,
      badge: null,
    },
    {
      id: 'analytics' as SidebarTab,
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'profile' as SidebarTab,
      label: 'User Profile',
      icon: User,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Left Sidebar (MedSync Minimalist Vertical Nav matching Image 2) */}
      <aside
        className={`w-full lg:w-56 shrink-0 space-y-4 transition-transform duration-300 ${
          isOpenMobile ? 'block' : 'hidden lg:block'
        }`}
      >
        {/* Primary Action Pill: "+ New Transcription" (Teal to Iris Gradient CTA) */}
        <button
          type="button"
          onClick={() => {
            onNewTranscription();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-white font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all hover:opacity-95 cursor-pointer"
          style={{
            background: 'linear-gradient(90deg, #23ac98 0%, #3a8cbe 35%, #457bd0 68%, #595df2 100%)',
            boxShadow: '0 8px 20px -4px rgba(69, 123, 208, 0.4), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
          }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Transcription</span>
        </button>

        {/* Navigation Ceramic Clay Card (matching Employee Portal in Image 2) */}
        <div className="clay-card-surface rounded-clay-3xl p-4 space-y-6">
          <div>
            <div className="px-3 mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                Studio & Tools
              </span>
            </div>

            <nav className="space-y-1.5">
            {/* Active or Inactive Dashboard */}
            {activeTab === 'dashboard' ? (
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-[14px] font-extrabold text-white transition-all shadow-md group hover:opacity-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(90deg, #026488 0%, #088b93 35%, #1cb97e 75%, #30ca6f 100%)',
                  boxShadow: '0 8px 20px -4px rgba(8, 139, 147, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
                }}
              >
                {/* Rounded 4-square Grid Icon exactly matching Image 2 */}
                <svg
                  className="w-5 h-5 text-white shrink-0 stroke-[2.4]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7.2" height="7.2" rx="2" />
                  <rect x="13.8" y="3" width="7.2" height="7.2" rx="2" />
                  <rect x="13.8" y="13.8" width="7.2" height="7.2" rx="2" />
                  <rect x="3" y="13.8" width="7.2" height="7.2" rx="2" />
                </svg>
                <span className="flex-1 font-extrabold tracking-tight text-white leading-none text-left">
                  Dashboard
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold transition-all cursor-pointer"
              >
                <svg
                  className="w-4 h-4 text-stone-400 shrink-0 stroke-[2]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7.2" height="7.2" rx="2" />
                  <rect x="13.8" y="3" width="7.2" height="7.2" rx="2" />
                  <rect x="13.8" y="13.8" width="7.2" height="7.2" rx="2" />
                  <rect x="3" y="13.8" width="7.2" height="7.2" rx="2" />
                </svg>
                <span className="flex-1 text-left">Dashboard</span>
              </button>
            )}

            {/* Other Navigation Tabs */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isActive) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full font-bold text-xs text-white transition-all shadow-sm cursor-pointer"
                    style={{
                      background: 'linear-gradient(90deg, #026488 0%, #088b93 45%, #1cb97e 100%)',
                    }}
                  >
                    <Icon className="w-4 h-4 text-white shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white shrink-0">
                        {item.badge}
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-white shadow-sm shrink-0" />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Settings & Back to Home */}
        <div className="pt-3 border-t border-stone-100 space-y-1.5">
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <Settings className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                } else {
                  window.location.href = '/';
                }
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-50 text-xs font-medium transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
