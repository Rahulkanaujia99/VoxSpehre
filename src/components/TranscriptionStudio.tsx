'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Mic,
  Sparkles,
  Loader2,
  Sliders,
  AlertCircle,
  ArrowLeft,
  FileAudio,
  Key,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { TranscriptionResult, AISettings } from '@/types/transcription';
import { DEMO_SAMPLES } from '@/lib/sampleAudios';
import { createSyntheticAudioBlob } from '@/lib/audioToneGenerator';
import { AudioUploader } from './AudioUploader';
import { AudioRecorder } from './AudioRecorder';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { TranscriptEditor } from './TranscriptEditor';

interface TranscriptionStudioProps {
  initialSampleId?: string;
  onOpenSettings: () => void;
  aiSettings: AISettings;
  onBackToHome?: () => void;
  onUpdateSettings?: (settings: AISettings) => void;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  initialSampleId = 'sample-pe-due-diligence',
  onOpenSettings,
  aiSettings,
  onBackToHome,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSampleId, setCurrentSampleId] = useState<string>(initialSampleId || 'sample-pe-due-diligence');

  // Pending file / audio state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; duration: number } | null>(null);

  // Inline Key Configuration
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);
  const [inlineProvider, setInlineProvider] = useState<'gemini' | 'groq'>('gemini');
  const [inlineApiKey, setInlineApiKey] = useState<string>('');

  // Loading & error states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSampleById = useCallback((sampleId: string) => {
    setCurrentSampleId(sampleId);
    setPendingFile(null);
    setPendingBlob(null);
    setShowKeyPrompt(false);
    setErrorMessage(null);

    const sample = DEMO_SAMPLES.find((s) => s.id === sampleId) || DEMO_SAMPLES[1] || DEMO_SAMPLES[0];
    setTranscriptionData(sample.data);
    setAudioDuration(sample.durationSeconds);
    setCurrentTime(0);
    setIsPlaying(false);

    // Create synthesized audio URL so waveform is playable immediately
    const synthUrl = createSyntheticAudioBlob(sample.durationSeconds);
    setAudioUrl(synthUrl);
  }, []);

  // Load sample on mount or when initialSampleId changes
  useEffect(() => {
    const targetId = initialSampleId || 'sample-pe-due-diligence';
    loadSampleById(targetId);
  }, [initialSampleId, loadSampleById]);

  const getEffectiveApiKey = (settings: AISettings) => {
    if (settings.provider === 'gemini' && settings.geminiKey) return settings.geminiKey;
    if (settings.provider === 'groq' && settings.groqKey) return settings.groqKey;
    if (settings.provider === 'openai' && settings.openaiKey) return settings.openaiKey;
    return settings.geminiKey || settings.groqKey || settings.openaiKey || '';
  };

  // Perform actual speech-to-text API call
  const executeTranscription = async (
    audioInput: File | Blob,
    settings: AISettings,
    customFileName?: string
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStage('Connecting to VoxSphere AI speech engine...');

    const resolvedFileName =
      customFileName ||
      (audioInput instanceof File ? audioInput.name : 'recorded_audio.wav');

    try {
      const stageTimer1 = setTimeout(() => {
        setProcessingStage('Uploading audio stream & acoustic decoding...');
      }, 1000);

      const stageTimer2 = setTimeout(() => {
        setProcessingStage('Transcribing speech verbatim with timestamps & speakers...');
      }, 2500);

      const formData = new FormData();
      formData.append('audio', audioInput);
      formData.append('fileName', resolvedFileName);
      formData.append('provider', settings.provider);

      if (settings.geminiKey) formData.append('geminiKey', settings.geminiKey);
      if (settings.openaiKey) formData.append('openaiKey', settings.openaiKey);
      if (settings.groqKey) formData.append('groqKey', settings.groqKey);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.requiresKey) {
          setShowKeyPrompt(true);
          throw new Error(data?.message || 'An AI API key is required to transcribe custom audio.');
        }
        throw new Error(data?.error || data?.message || `Transcription failed (${res.status})`);
      }

      const result: TranscriptionResult = data;
      setTranscriptionData(result);
      if (result.metadata?.duration) {
        setAudioDuration(result.metadata.duration);
      }
      setCurrentTime(0);
      setShowKeyPrompt(false);
      setPendingFile(null);
      setPendingBlob(null);
    } catch (err: unknown) {
      console.error('Transcription error:', err);
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle uploaded audio file
  const handleFileSelected = async (file: File) => {
    setPendingFile(file);
    setPendingBlob(null);
    setErrorMessage(null);
    setCurrentSampleId('custom-upload');

    // Create a local playback URL so user can listen to their uploaded audio
    const localUrl = URL.createObjectURL(file);
    setAudioUrl(localUrl);

    // Estimate duration or load audio metadata
    const tempAudio = new Audio();
    tempAudio.src = localUrl;
    tempAudio.onloadedmetadata = () => {
      if (tempAudio.duration && !isNaN(tempAudio.duration) && tempAudio.duration !== Infinity) {
        setAudioDuration(Math.round(tempAudio.duration));
      } else {
        setAudioDuration(30);
      }
    };

    const activeKey = getEffectiveApiKey(aiSettings);

    if (!activeKey) {
      // Prompt user to provide a free API key
      setShowKeyPrompt(true);
      return;
    }

    // Key exists, execute transcription immediately
    await executeTranscription(file, aiSettings, file.name);
  };

  // Handle mic recording completed
  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setPendingBlob({ blob: audioBlob, duration });
    setPendingFile(null);
    setErrorMessage(null);
    setCurrentSampleId('custom-recording');

    const localUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(localUrl);
    setAudioDuration(duration || 15);

    const activeKey = getEffectiveApiKey(aiSettings);

    if (!activeKey) {
      setShowKeyPrompt(true);
      return;
    }

    const recName = `Live_Microphone_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.wav`;
    await executeTranscription(audioBlob, aiSettings, recName);
  };

  // Handle inline key submission
  const handleInlineKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineApiKey.trim()) {
      setErrorMessage('Please enter a valid API key.');
      return;
    }

    const updatedSettings: AISettings = {
      ...aiSettings,
      provider: inlineProvider,
      geminiKey: inlineProvider === 'gemini' ? inlineApiKey.trim() : aiSettings.geminiKey,
      groqKey: inlineProvider === 'groq' ? inlineApiKey.trim() : aiSettings.groqKey,
    };

    onUpdateSettings?.(updatedSettings);

    if (pendingFile) {
      executeTranscription(pendingFile, updatedSettings, pendingFile.name);
    } else if (pendingBlob) {
      const recName = `Live_Microphone_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.wav`;
      executeTranscription(pendingBlob.blob, updatedSettings, recName);
    }
  };

  const activeFileName =
    pendingFile?.name ||
    (pendingBlob ? 'Live_Microphone_Capture.wav' : transcriptionData?.metadata.fileName) ||
    'Penguin_PE_DueDiligence_Review.m4a';

  return (
    <section id="studio" className="relative py-10 md:py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Back to Home Breadcrumb Bar */}
        {onBackToHome && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer w-fit"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600" />
              <span>← Back to Landing Page</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>VoxSphere AI</span>
              <span>•</span>
              <span className="text-teal-700 font-semibold">Speech Intelligence Studio</span>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VOXSPHERE INTELLIGENCE WORKBENCH</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              VoxSphere Speech Intelligence Studio
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              VoxSphere converts any audio or microphone recording into timestamped, speaker-identified verbatim text with precision.
            </p>

            {/* Currently Active Audio File Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="text-xs font-semibold text-slate-500">Active Audio File:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold font-mono">
                <FileAudio className="w-3.5 h-3.5 text-indigo-600" />
                {activeFileName}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>

          {/* AI Engine Status Pill & Quick Sample Switchers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <span className="text-[11px] text-slate-500 font-semibold px-2">Sample:</span>
              <button
                onClick={() => loadSampleById('sample-pe-due-diligence')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentSampleId === 'sample-pe-due-diligence'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Private Equity Due Diligence (.m4a)"
              >
                PE Due Diligence (.m4a)
              </button>
              <button
                onClick={() => loadSampleById('sample-strategic-intelligence')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentSampleId === 'sample-strategic-intelligence'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Strategic Intelligence Call (.wav)"
              >
                Strategic (.wav)
              </button>
            </div>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Engine:{' '}
                <span className="text-indigo-600 uppercase">
                  {aiSettings.geminiKey
                    ? 'GEMINI (ACTIVE)'
                    : aiSettings.groqKey
                    ? 'GROQ (ACTIVE)'
                    : aiSettings.openaiKey
                    ? 'OPENAI (ACTIVE)'
                    : 'KEY REQUIRED'}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Input Switcher (Upload vs Mic) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Audio File</span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Record Live Microphone</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'upload' ? (
            <AudioUploader
              onFileSelected={handleFileSelected}
              onSelectSample={loadSampleById}
              isTranscribing={isProcessing}
            />
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setActiveTab('upload')}
            />
          )}

          {/* AI Key Connection Banner for Uploaded Audio */}
          {showKeyPrompt && (pendingFile || pendingBlob) && (
            <div className="p-6 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-amber-50/60 border-2 border-indigo-200 rounded-3xl shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Connect Free AI Key to Transcribe &ldquo;{activeFileName}&rdquo;
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      To transcribe your spoken words with real speech recognition AI, VoxSphere connects to Google Gemini or Groq Whisper. Both offer <strong>100% free API keys</strong> with zero credit card required.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadSampleById('sample-pe-due-diligence')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline shrink-0 cursor-pointer"
                >
                  Or explore sample audio
                </button>
              </div>

              {/* Provider Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <button
                  type="button"
                  onClick={() => setInlineProvider('gemini')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    inlineProvider === 'gemini'
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-200 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white/70'
                  }`}
                >
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                  <div className="text-xs font-bold text-slate-900">Google Gemini 2.0 Flash</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Free • Multilingual • High accuracy</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInlineProvider('groq')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    inlineProvider === 'groq'
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-200 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white/70'
                  }`}
                >
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    Ultra-Fast
                  </span>
                  <div className="text-xs font-bold text-slate-900">Groq Whisper Turbo</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Free • Instant verbatim transcription</div>
                </button>
              </div>

              {/* Direct API Key Input Form */}
              <form onSubmit={handleInlineKeySubmit} className="space-y-3 max-w-xl">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      placeholder={
                        inlineProvider === 'gemini'
                          ? 'Paste Google Gemini API Key (AIzaSy...)'
                          : 'Paste Groq API Key (gsk_...)'
                      }
                      value={inlineApiKey}
                      onChange={(e) => setInlineApiKey(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-indigo-500 shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || !inlineApiKey.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 cursor-pointer shrink-0"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Transcribe Audio Now</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  {inlineProvider === 'gemini' ? (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                    >
                      <span>1. Click to get free Google Gemini Key at Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                    >
                      <span>1. Click to get free Groq Key at Groq Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Saved locally in your browser</span>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="p-6 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-indigo-950">
                  Transcribing Speech with AI Engine...
                </div>
                <div className="text-xs text-indigo-700 font-medium">
                  {processingStage || 'Processing audio stream...'}
                </div>
              </div>
            </div>
          )}

          {/* Real Error Message Alert */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-red-900">Transcription Error</div>
                <p>{errorMessage}</p>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={onOpenSettings}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Open AI Settings &rarr;
                  </button>
                  {pendingFile && (
                    <button
                      onClick={() => handleFileSelected(pendingFile)}
                      className="font-bold text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio Waveform Player */}
        {audioUrl && (
          <div className="space-y-6">
            <AudioWaveformPlayer
              audioUrl={audioUrl}
              duration={audioDuration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onPlayPause={(p) => setIsPlaying(p)}
              onSeek={(t) => setCurrentTime(t)}
            />

            {/* Transcript Editor & Export */}
            {transcriptionData && (
              <TranscriptEditor
                data={transcriptionData}
                currentTime={currentTime}
                onSeekAudio={(time) => {
                  setCurrentTime(time);
                  setIsPlaying(true);
                }}
                onUpdateResult={(updated) => setTranscriptionData(updated)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
