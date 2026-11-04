'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Palette,
  Sliders,
  Shield,
  Key,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Volume2,
  Maximize2,
  FileText,
  Globe,
  Users,
  Clock,
  Sparkles,
  LogOut,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlayerSettings, PlayerDesign } from '@/context/PlayerSettingsContext';
import { TranscriptionStyle } from '@/types/transcription';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const TRANSCRIPTION_STYLES: { id: TranscriptionStyle; label: string; desc: string }[] = [
  { id: 'standard', label: 'Standard', desc: 'Balanced readability with full sentence structure.' },
  { id: 'verbatim', label: 'Verbatim', desc: 'Exact transcription including pauses and filler words.' },
  { id: 'clean_readable', label: 'Clean Readable', desc: 'Polished text optimized for professional reading.' },
  { id: 'interview_qa', label: 'Interview Q&A', desc: 'Clear dialogue formatting with speaker question turns.' },
  { id: 'technical', label: 'Technical & Engineering', desc: 'Preserves terminology, jargon, and code names.' },
  { id: 'legal', label: 'Legal & Deposition', desc: 'Strict formal legal formatting.' },
  { id: 'financial', label: 'Financial & Earnings', desc: 'Optimized for numbers, percentages, and metrics.' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect (Default)' },
  { code: 'en', label: 'English (US & Global)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'zh', label: 'Chinese (中文)' },
];

export const SettingsView: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { playerDesign, setPlayerDesign } = usePlayerSettings();

  // Settings State
  const [defaultStyle, setDefaultStyle] = useState<TranscriptionStyle>('standard');
  const [defaultLanguage, setDefaultLanguage] = useState<string>('auto');
  const [enableDiarization, setEnableDiarization] = useState<boolean>(true);
  const [enableTimestamps, setEnableTimestamps] = useState<boolean>(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'docx' | 'pdf' | 'txt'>('docx');

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Status feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved preferences from localStorage & Supabase
  useEffect(() => {
    try {
      const stored = localStorage.getItem('voxsphere_transcription_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.defaultStyle) setDefaultStyle(parsed.defaultStyle);
        if (parsed.defaultLanguage) setDefaultLanguage(parsed.defaultLanguage);
        if (parsed.enableDiarization !== undefined) setEnableDiarization(parsed.enableDiarization);
        if (parsed.enableTimestamps !== undefined) setEnableTimestamps(parsed.enableTimestamps);
        if (parsed.defaultExportFormat) setDefaultExportFormat(parsed.defaultExportFormat);
      }
    } catch {}
  }, []);

  const handleSelectPlayerDesign = async (design: PlayerDesign) => {
    await setPlayerDesign(design);
    setToastMessage(`Player Design "${design === 'purple-glass' ? 'Purple Glass' : 'Teal Glass'}" applied!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveTranscriptionPrefs = async () => {
    const prefs = {
      defaultStyle,
      defaultLanguage,
      enableDiarization,
      enableTimestamps,
      defaultExportFormat,
    };

    try {
      localStorage.setItem('voxsphere_transcription_preferences', JSON.stringify(prefs));

      if (isSupabaseConfigured() && user && user.id !== 'demo-user-id') {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { transcription_preferences: prefs },
        });
        await supabase
          .from('profiles')
          .update({ preferences: prefs } as any)
          .eq('id', user.id);
      }

      setToastMessage('Transcription preferences saved successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn('Could not save prefs to Supabase:', err);
      setToastMessage('Preferences saved locally!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured() && user && user.id !== 'demo-user-id') {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      setToastMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-5 w-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Settings & Preferences
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            System Configuration
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Customize your audio player interface, transcription parameters, and account security.
        </p>
      </div>

      {/* Notifications */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION A: AUDIO PLAYER PREFERENCES */}
      <div className="clay-card-surface rounded-clay-3xl p-5 sm:p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-2xs">
              <Palette className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Section A: Audio Player Preferences
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Choose your active player theme. Both designs feature responsive glassmorphism, glowing audio waveforms, and full playback controls.
          </p>
        </div>

        {/* Dual Player Preview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Player Design 1 – Purple Glass */}
          <div
            onClick={() => handleSelectPlayerDesign('purple-glass')}
            className={`relative rounded-2xl p-4.5 border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              playerDesign === 'purple-glass'
                ? 'border-purple-600 bg-purple-50/25 shadow-md shadow-purple-500/10 ring-2 ring-purple-500/20'
                : 'border-slate-200 hover:border-purple-300 bg-white hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 tracking-wide uppercase">
                      Purple Glass
                    </span>
                    {playerDesign === 'purple-glass' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Active Theme
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1.5">
                    Player Design 1 – Purple Glass
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dark navy/blue glass background with magenta, violet, and electric cyan glowing waveform.
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                    playerDesign === 'purple-glass'
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-slate-300'
                  }`}
                >
                  {playerDesign === 'purple-glass' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Visual Thumbnail */}
              <div className="rounded-2xl overflow-hidden border border-purple-500/30 bg-[#120f2d] p-4 text-white shadow-inner space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold truncate">Meeting_Recording.mp3</div>
                      <div className="text-[10px] text-purple-300/70">0:57</div>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Animated gradient wave representation */}
                <div className="h-6 relative flex items-center justify-center">
                  <div className="w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 rounded-full blur-[1px]" />
                </div>

                <div className="flex items-center gap-2 text-[9px] font-mono text-purple-300/70">
                  <span>0:23</span>
                  <div className="flex-1 h-1 bg-purple-950 rounded-full overflow-hidden">
                    <div className="w-[45%] h-full bg-gradient-to-r from-pink-500 to-purple-500" />
                  </div>
                  <span>0:57</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Player Design 2 – Teal Glass */}
          <div
            onClick={() => handleSelectPlayerDesign('teal-glass')}
            className={`relative rounded-2xl p-4.5 border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              playerDesign === 'teal-glass'
                ? 'border-teal-600 bg-teal-50/25 shadow-md shadow-teal-500/10 ring-2 ring-teal-500/20'
                : 'border-slate-200 hover:border-teal-300 bg-white hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 tracking-wide uppercase">
                      Teal Glass
                    </span>
                    {playerDesign === 'teal-glass' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Active Theme
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1.5">
                    Player Design 2 – Teal Glass
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dark teal/emerald glass with luminous cyan/green audio ribbons and fullscreen toggle.
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                    playerDesign === 'teal-glass'
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-slate-300'
                  }`}
                >
                  {playerDesign === 'teal-glass' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Visual Thumbnail */}
              <div className="rounded-2xl overflow-hidden border border-teal-500/30 bg-[#0d2222] p-4 text-white shadow-inner space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-700 text-teal-200 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold truncate">Demo.mp3</div>
                      <div className="text-[10px] text-teal-300/70">0:57</div>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-xs">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Animated teal wave representation */}
                <div className="h-6 relative flex items-center justify-center">
                  <div className="w-full h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 rounded-full blur-[1px]" />
                </div>

                <div className="flex items-center gap-2 text-[9px] font-mono text-teal-300/70">
                  <span>0:00</span>
                  <div className="flex-1 h-1 bg-teal-950 rounded-full overflow-hidden">
                    <div className="w-[30%] h-full bg-gradient-to-r from-teal-400 to-cyan-400" />
                  </div>
                  <span>0:57</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout for Sections B, C, D */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {/* SECTION B: TRANSCRIPTION PREFERENCES */}
        <div className="clay-card-surface rounded-clay-3xl p-5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-2xs">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Section B: Transcription Preferences
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure your default transcription model style, primary language, diarization settings, and export format.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Default Transcription Style
              </label>
              <select
                value={defaultStyle}
                onChange={(e) => setDefaultStyle(e.target.value as TranscriptionStyle)}
                className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
              >
                {TRANSCRIPTION_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} – {s.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Default Recognition Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs cursor-pointer">
              <input
                type="checkbox"
                checked={enableDiarization}
                onChange={(e) => setEnableDiarization(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Speaker Diarization</p>
                <p className="text-[10px] text-slate-500">Detect & label speakers</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs cursor-pointer">
              <input
                type="checkbox"
                checked={enableTimestamps}
                onChange={(e) => setEnableTimestamps(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Verbatim Timestamps</p>
                <p className="text-[10px] text-slate-500">Millisecond accuracy</p>
              </div>
            </label>

            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-xs font-bold text-slate-800">Preferred Export</p>
              <select
                value={defaultExportFormat}
                onChange={(e) => setDefaultExportFormat(e.target.value as 'docx' | 'pdf' | 'txt')}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-indigo-500"
              >
                <option value="docx">Word (.docx)</option>
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="txt">Plain Text (.txt)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveTranscriptionPrefs}
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Save Transcription Preferences
            </button>
          </div>
        </div>

        {/* Column 2: SECTION C & D */}
        <div className="space-y-5">
          {/* SECTION C: ACCOUNT & SECURITY */}
          <div className="clay-card-surface rounded-clay-3xl p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Section C: Account & Security
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Update your authentication password and manage active session security.
              </p>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword || !newPassword}
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Update Password</span>
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Sign Out of VoxSphere</p>
                <p className="text-[10px] text-slate-400">Ends your active session on this device</p>
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-clay-pill"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
