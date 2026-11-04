'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  Edit2,
  LogOut,
  Sparkles,
  Cloud,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HistoryItem } from '@/types/transcription';

interface UserProfileViewProps {
  historyCount?: number;
  totalDurationSeconds?: number;
  onNavigateToSettings?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  historyCount = 0,
  totalDurationSeconds = 0,
  onNavigateToSettings,
}) => {
  const { user, profile, updateUserProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState<string>(
    profile?.full_name || user?.user_metadata?.full_name || 'Rahul Kanaujia'
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url || user?.user_metadata?.avatar_url || null
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Authentication method detection
  const authProvider = user?.app_metadata?.provider || (user ? 'Email & Password' : 'Demo Session');
  const isGoogle = authProvider === 'google' || user?.identities?.some((id) => id.provider === 'google');

  // Account creation date
  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'October 31, 2024';

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setFeedback({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const { error } = await updateUserProfile(displayName.trim(), avatarUrl);
    setIsSaving(false);

    if (error) {
      setFeedback({ type: 'error', message: error.message });
    } else {
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="space-y-5 w-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Profile
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            Account Info
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal details, authentication credentials, and privacy configurations.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="clay-card-surface rounded-clay-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {/* Avatar with Upload Badge */}
            <div className="relative group">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-md">
                  {userInitial}
                </div>
              )}

              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors cursor-pointer border-2 border-white"
                title="Change Profile Picture"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Name & Basic Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900">{displayName}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {user?.email || profile?.email || 'rahul@penguin-international.com'}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Member since {createdDate}
                </span>
              </div>
            </div>
          </div>

          {/* Edit / Save Button */}
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-clay-pill cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Form (visible when isEditing is true) */}
        {isEditing && (
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Update Profile Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose from Preset Avatars
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={idx}
                      src={preset}
                      alt={`Avatar ${idx + 1}`}
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition-all ${
                        avatarUrl === preset
                          ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    />
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Account Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Email Address */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs space-y-1.5 transition-all">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </div>
            <p className="font-bold text-slate-800 font-mono text-xs truncate">
              {user?.email || profile?.email || 'rahul@penguin-international.com'}
            </p>
            <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shadow-2xs">
              Verified
            </span>
          </div>

          {/* Authentication Method */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs space-y-1.5 transition-all">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Key className="w-3.5 h-3.5" />
              <span>Authentication Method</span>
            </div>
            <p className="font-bold text-slate-800">
              {isGoogle ? 'Google OAuth 2.0' : 'Email & Encrypted Password'}
            </p>
            <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full shadow-2xs">
              Supabase Auth
            </span>
          </div>

          {/* Plan & Usage */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs space-y-1.5 transition-all">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Subscription Tier</span>
            </div>
            <p className="font-bold text-slate-800">Pro Studio Plan</p>
            <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full shadow-2xs">
              Unlimited Transcriptions
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              Configure Player & Transcription Settings →
            </button>
          )}

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer ml-auto shadow-clay-pill"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
