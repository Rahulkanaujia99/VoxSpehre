'use client';

import React from 'react';
import {
  Plus,
  LayoutDashboard,
  FileText,
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewTranscription,
  recordingsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { signOut } = useAuth();

  const handleSelectTab = (tab: SidebarTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navItems = [
    {
      id: 'dashboard' as SidebarTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'recordings' as SidebarTab,
      label: 'Recordings',
      icon: FileText,
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
    {
      id: 'settings' as SidebarTab,
      label: 'Settings',
      icon: Settings,
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
          <div className="space-y-1 relative">
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              STUDIO & TOOLS
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== null && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Minimal Status */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 px-2">
          <span className="font-semibold text-[11px] text-slate-400 tracking-wide">
            VoxSphere v2.0
          </span>
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
