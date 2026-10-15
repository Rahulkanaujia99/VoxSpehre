'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Check, Info, Cpu, Sparkles } from 'lucide-react';
import { AISettings } from '@/types/transcription';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (settings: AISettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [current, setCurrent] = useState<AISettings>(settings);
  const [prevSettings, setPrevSettings] = useState<AISettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (prevSettings !== settings) {
    setPrevSettings(settings);
    setCurrent(settings);
  }

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(current);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                AI Transcription Engine Settings
              </h3>
              <p className="text-xs text-slate-500">
                Choose your AI acoustic provider & secure credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Radio Group */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Active AI Engine
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                id: 'gemini',
                name: 'Google Gemini',
                desc: 'Free & high accuracy • Multilingual',
                badge: 'Recommended',
              },
              {
                id: 'groq',
                name: 'Groq Whisper',
                desc: 'Free & ultra-fast • Whisper v3 Turbo',
                badge: 'Fastest',
              },
              {
                id: 'openai',
                name: 'OpenAI Whisper',
                desc: 'Whisper-1 verbatim speech model',
              },
              {
                id: 'builtin',
                name: 'Demo Mode',
                desc: 'Explore sample audios only',
              },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setCurrent({
                    ...current,
                    provider: p.id as AISettings['provider'],
                  })
                }
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  current.provider === p.id
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                {p.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                    {p.badge}
                  </span>
                )}
                <div className="text-xs font-bold text-slate-900">{p.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* API Key Inputs (shown if provider requires it) */}
        {current.provider !== 'builtin' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {current.provider === 'gemini'
                    ? 'Google Gemini API Key'
                    : current.provider === 'groq'
                    ? 'Groq API Key'
                    : 'OpenAI API Key'}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <input
              type={showKey ? 'text' : 'password'}
              placeholder={
                current.provider === 'gemini'
                  ? 'AIzaSy...'
                  : current.provider === 'groq'
                  ? 'gsk_...'
                  : 'sk-...'
              }
              value={
                current.provider === 'gemini'
                  ? current.geminiKey || ''
                  : current.provider === 'groq'
                  ? current.groqKey || ''
                  : current.openaiKey || ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (current.provider === 'gemini') {
                  setCurrent({ ...current, geminiKey: val });
                } else if (current.provider === 'groq') {
                  setCurrent({ ...current, groqKey: val });
                } else {
                  setCurrent({ ...current, openaiKey: val });
                }
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-indigo-500"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
              {current.provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <span>Get a free Google Gemini key &rarr;</span>
                </a>
              )}
              {current.provider === 'groq' && (
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <span>Get a free Groq Whisper key &rarr;</span>
                </a>
              )}
              {current.provider === 'openai' && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <span>Get OpenAI API key &rarr;</span>
                </a>
              )}

              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Stored securely in local browser storage</span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Toggles */}
        <div className="space-y-2 pt-1 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800">
                Speaker Diarization
              </div>
              <div className="text-[11px] text-slate-500">
                Distinguish between Captain, Dispatcher, and Surveyor voices
              </div>
            </div>
            <input
              type="checkbox"
              checked={current.enableDiarization}
              onChange={(e) =>
                setCurrent({ ...current, enableDiarization: e.target.checked })
              }
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div>
              <div className="font-bold text-slate-800">
                Verbatim Timestamps
              </div>
              <div className="text-[11px] text-slate-500">
                Add synchronized second-by-second timestamps to transcripts
              </div>
            </div>
            <input
              type="checkbox"
              checked={current.enableTimestamps}
              onChange={(e) =>
                setCurrent({ ...current, enableTimestamps: e.target.checked })
              }
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
