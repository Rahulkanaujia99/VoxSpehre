'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileAudio,
  ShieldCheck,
  RefreshCw,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  ChevronRight,
  Search,
  User,
  LogOut,
  Cloud,
  Lock,
  Plus,
  Menu,
  X,
  FileText,
  Volume2,
} from 'lucide-react';
import {
  TranscriptionResult,
  TranscriptSegment,
  HistoryItem,
  TranscriptionStyle,
} from '@/types/transcription';
import { exportToDOCX, exportToPDF, exportToTXT, exportCombined } from '@/lib/exportUtils';
import { formatDuration } from '@/lib/audioToneGenerator';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCloudTranscriptions,
  saveCloudTranscription,
  updateCloudTranscription,
  deleteCloudTranscription,
} from '@/lib/supabase/transcriptionService';
import { Sidebar, SidebarTab } from './Sidebar';
import { AudioUploader } from './AudioUploader';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AuthModal } from './AuthModal';

interface TranscriptionStudioProps {
  initialSampleId?: string;
  onBackToHome?: () => void;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  onBackToHome,
}) => {
  // Navigation & Layout
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Active Transcription Result (Starts strictly as NULL for clean initial upload dashboard)
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Active status & errors
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document History State & Supabase Cloud Sync
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchRecordingsQuery, setSearchRecordingsQuery] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [showStudioAuthModal, setShowStudioAuthModal] = useState<boolean>(false);
  const { user, profile, signOut, isConfigured } = useAuth();

  // Load History from Supabase (or localStorage fallback when not logged in)
  const refreshHistory = useCallback(async () => {
    if (user && isConfigured) {
      setIsSyncingCloud(true);
      try {
        const cloudDocs = await fetchCloudTranscriptions();
        setHistory(cloudDocs);
      } catch (e) {
        console.warn('Could not read cloud history from Supabase:', e);
      } finally {
        setIsSyncingCloud(false);
      }
    } else {
      try {
        const savedHistory = localStorage.getItem('voxsphere_history');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (e) {
        console.warn('Could not read user history from localStorage:', e);
      }
    }
  }, [user, isConfigured]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Add Item to Document History (Auto-saves to Supabase when logged in)
  const addToHistory = useCallback(
    async (res: TranscriptionResult, audioBlobOrFile?: Blob | File | null) => {
      let cloudId: string | null = null;
      if (user && isConfigured) {
        try {
          setIsSyncingCloud(true);
          cloudId = await saveCloudTranscription(res, audioBlobOrFile);
        } catch (err) {
          console.warn('Failed to save to Supabase:', err);
        } finally {
          setIsSyncingCloud(false);
        }
      }

      const docId = cloudId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setActiveDocumentId(docId);

      const newItem: HistoryItem = {
        id: docId,
        fileName: res.metadata.fileName,
        date: new Date().toLocaleString(),
        duration: res.metadata.duration,
        wordCount: res.metadata.wordCount,
        speakersCount: res.metadata.speakersCount,
        result: res,
      };

      setHistory((prev) => {
        const updated = [newItem, ...prev.filter((h) => h.id !== docId && h.fileName !== res.metadata.fileName)].slice(0, 50);
        if (!user) {
          try {
            localStorage.setItem('voxsphere_history', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [user, isConfigured]
  );

  const handleDeleteHistoryItem = async (id: string) => {
    if (user && isConfigured && !id.startsWith('doc-')) {
      await deleteCloudTranscription(id);
    }
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (!user) {
        try {
          localStorage.setItem('voxsphere_history', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    if (confirm('Clear all transcribed document history?')) {
      setHistory([]);
      try {
        localStorage.removeItem('voxsphere_history');
      } catch {}
    }
  };

  // Start Transcription process triggered from AudioUploader
  const handleStartTranscription = async (file: File, style: TranscriptionStyle) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setTranscriptionProgress(15);
    setProcessingStage(`Validating and preparing "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('fileName', file.name);
      formData.append('style', style);
      formData.append('provider', 'openai');

      setTranscriptionProgress(35);
      setProcessingStage(`Transcribing audio with OpenAI speech recognition and applying ${style.replace(/_/g, ' ')} style...`);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Transcription failed with status ${res.status}`);
      }

      setTranscriptionProgress(75);
      setProcessingStage('Generating 7-dimension AI Summarization & Strategic Intelligence...');

      // Extract text for AI Summarization
      const fullTranscriptText = (data.segments || [])
        .map((s: TranscriptSegment) => `${s.speaker}: ${s.text}`)
        .join('\n');

      let finalResult: TranscriptionResult = data;

      try {
        const sumRes = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fullTranscriptText, engine: 'openai' }),
        });

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          finalResult = {
            ...data,
            summary: sumData.summary || data.summary,
            keyTopics: sumData.keyTopics || data.keyTopics,
            sentiment: sumData.sentiment || data.sentiment,
            actionItems: sumData.actionItems || data.actionItems,
            comprehensiveSummaries: sumData.comprehensiveSummaries || data.comprehensiveSummaries,
          };
        }
      } catch (sumErr) {
        console.warn('Summarization fallback notice:', sumErr);
      }

      setTranscriptionProgress(100);
      setProcessingStage('Transcription and Summarization Complete!');

      // Set active result and audio
      setTranscriptionData(finalResult);
      if (finalResult.metadata?.duration) {
        setAudioDuration(finalResult.metadata.duration);
      }
      const localAudioUrl = URL.createObjectURL(file);
      setAudioUrl(localAudioUrl);
      setCurrentTime(0);
      setIsPlaying(false);

      // Save to History & Supabase
      await addToHistory(finalResult, file);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed. Please check audio format and try again.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to initial clean upload state
  const handleNewTranscription = () => {
    setTranscriptionData(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setErrorMessage(null);
    setSidebarTab('dashboard');
  };

  // Filtered recordings for the Recordings tab
  const filteredRecordings = useMemo(() => {
    if (!searchRecordingsQuery.trim()) return history;
    const q = searchRecordingsQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.fileName.toLowerCase().includes(q) ||
        item.result.summary.toLowerCase().includes(q)
    );
  }, [history, searchRecordingsQuery]);

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Rahul';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Primary Sidebar (Accessible throughout authenticated application) */}
      <Sidebar
        activeTab={sidebarTab}
        onTabChange={(tab) => {
          setSidebarTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        onNewTranscription={handleNewTranscription}
        recordingsCount={history.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Open Navigation Menu"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">← Back to Landing Page</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium border-l border-slate-200 pl-3">
              <span>VoxSphere</span>
              <span>•</span>
              <span className="text-teal-700 font-semibold">OpenAI gpt-transcribe Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Active Document Indicator if Transcribed */}
            {transcriptionData && sidebarTab === 'dashboard' && (
              <button
                onClick={handleNewTranscription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Audio File</span>
              </button>
            )}

            {/* Supabase Cloud Sync Badge */}
            {user ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Connected</span>
              </div>
            ) : (
              <button
                onClick={() => setShowStudioAuthModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In / Sync</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport depending on sidebarTab */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD (AUDIO UPLOAD -> TRANSCRIPTION -> SUMMARY) */}
          {/* ======================================================== */}
          {sidebarTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* If transcriptionData is NULL: Show Section Header + Audio Upload Section ONLY */}
              {!transcriptionData ? (
                <>
                  {/* Dashboard Header (Matching Screenshot 1) */}
                  <div className="space-y-2 pb-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>VOXSPHERE AI AUDIO STUDIO</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      AI Audio Transcription & Intelligence
                    </h2>
                    <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                      Upload MP3, WAV, M4A or record live. Powered by OpenAI <code className="text-indigo-700 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">gpt-transcribe</code> with intelligent audio splitting and executive summaries.
                    </p>
                  </div>

                  {/* Clean Initial Audio Upload Section (No Demo samples, No AI Summary, No Segments) */}
                  <AudioUploader
                    onStartTranscription={handleStartTranscription}
                    isTranscribing={isProcessing}
                    transcriptionProgress={transcriptionProgress}
                    transcriptionStage={processingStage}
                  />

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-rose-900">Transcription Error</div>
                        <p>{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Once Transcribed: Display Audio Player + Transcript Editor + 7-Dimension AI Summarization */
                <div className="space-y-6 animate-fade-in">
                  {/* Active Document Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileAudio className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {transcriptionData.metadata.fileName}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            TRANSCRIBED
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{Math.round(transcriptionData.metadata.duration)}s</span>
                          <span>•</span>
                          <span>{transcriptionData.metadata.wordCount} words</span>
                          <span>•</span>
                          <span>{transcriptionData.metadata.speakersCount} speakers</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleNewTranscription}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Transcribe Another File</span>
                    </button>
                  </div>

                  {/* Audio Waveform Player */}
                  {audioUrl && (
                    <AudioWaveformPlayer
                      audioUrl={audioUrl}
                      duration={audioDuration}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onTimeUpdate={(t) => setCurrentTime(t)}
                      onPlayPause={(p) => setIsPlaying(p)}
                      onSeek={(t) => setCurrentTime(t)}
                    />
                  )}

                  {/* Complete Transcript + 7-Dimension AI Summarization + 9 Export Formats */}
                  <TranscriptEditor
                    data={transcriptionData}
                    currentTime={currentTime}
                    activeEngine="openai"
                    onSeekAudio={(time) => {
                      setCurrentTime(time);
                      setIsPlaying(true);
                    }}
                    onUpdateResult={(updated) => {
                      setTranscriptionData(updated);
                      if (activeDocumentId) {
                        setHistory((prev) =>
                          prev.map((item) =>
                            item.id === activeDocumentId
                              ? { ...item, result: updated, wordCount: updated.metadata.wordCount }
                              : item
                          )
                        );
                        if (user && isConfigured && !activeDocumentId.startsWith('doc-')) {
                          updateCloudTranscription(activeDocumentId, updated);
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: RECORDINGS (RECORDING HISTORY & EXPORTS)           */}
          {/* ======================================================== */}
          {sidebarTab === 'recordings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Transcribed Recordings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage, search, export and review all audio transcripts and strategic summaries.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {user && (
                    <button
                      onClick={refreshHistory}
                      disabled={isSyncingCloud}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Sync with Supabase"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={handleNewTranscription}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Transcription</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recordings by file name or key summary points..."
                  value={searchRecordingsQuery}
                  onChange={(e) => setSearchRecordingsQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Recordings List */}
              <div className="space-y-3">
                {filteredRecordings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                    <FileAudio className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">No recordings found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchRecordingsQuery
                        ? 'No transcripts matched your search terms.'
                        : 'Upload an audio file on the dashboard to transcribe and store recordings.'}
                    </p>
                    <button
                      onClick={handleNewTranscription}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start Your First Transcription</span>
                    </button>
                  </div>
                ) : (
                  filteredRecordings.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-5 bg-white hover:bg-indigo-50/30 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs group"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 font-mono">
                            {doc.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">({doc.date})</span>
                          {!doc.id.startsWith('doc-') && (
                            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              CLOUD
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                          <span>Duration: {Math.round(doc.duration)}s</span>
                          <span>•</span>
                          <span>{doc.wordCount} words</span>
                          <span>•</span>
                          <span>{doc.speakersCount} speakers</span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-1 italic max-w-2xl">
                          &ldquo;{doc.result.summary}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => {
                            setTranscriptionData(doc.result);
                            setAudioDuration(doc.result.metadata.duration);
                            setCurrentTime(0);
                            setSidebarTab('dashboard');
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer"
                        >
                          Open in Studio →
                        </button>

                        <button
                          onClick={() => exportCombined(doc.result, 'docx')}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Download DOCX"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteHistoryItem(doc.id)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: USER PROFILE (ACCOUNT, QUOTAS & SUPABASE SYNC)   */}
          {/* ======================================================== */}
          {sidebarTab === 'profile' && (
            <div className="space-y-6 max-w-3xl animate-fade-in">
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  User Profile & Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Manage your VoxSphere credentials, enterprise subscription, and Supabase cloud sync.
                </p>
              </div>

              {/* Profile Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{userDisplayName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{user?.email || 'Guest User'}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full mt-1.5">
                      <span className="text-amber-500 text-[10px]">★</span> Free Plan
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-medium">Account Status</span>
                    <p className="font-bold text-slate-800 mt-0.5">Active</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-medium">Cloud Storage</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {user ? 'Supabase Synchronized' : 'Local Browser Storage'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-medium">Free Quota Remaining</span>
                    <p className="font-bold text-indigo-700 mt-0.5">4 minutes left (1 of 5 used)</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-medium">Total Saved Transcripts</span>
                    <p className="font-bold text-slate-800 mt-0.5">{history.length} Documents</p>
                  </div>
                </div>

                {/* Cloud Sync Information */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p className="font-bold">Enterprise Cloud Privacy & RLS</p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      All audio files, verbatim transcripts, and AI summaries are encrypted with Supabase Row-Level Security. Only you can access your documents.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  {user ? (
                    <button
                      onClick={() => signOut()}
                      className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out from VoxSphere</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowStudioAuthModal(true)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In with Supabase</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={showStudioAuthModal}
        onClose={() => {
          setShowStudioAuthModal(false);
          refreshHistory();
        }}
      />
    </div>
  );
};
