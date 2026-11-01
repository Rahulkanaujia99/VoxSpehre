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
  Settings,
  Palette,
  Check,
  CheckCircle,
  Play,
  Mic,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Globe,
  MoreHorizontal,
  Copy,
  ArrowUpToLine,
} from 'lucide-react';
import {
  TranscriptionResult,
  TranscriptSegment,
  HistoryItem,
  TranscriptionStyle,
} from '@/types/transcription';
import { exportToDOCX, exportToPDF, exportToTXT, exportToSRT, exportCombined } from '@/lib/exportUtils';
import { formatDuration, formatTime, createSyntheticAudioBlob } from '@/lib/audioToneGenerator';
import { useAuth } from '@/context/AuthContext';
import { usePlayerSettings, PlayerDesign } from '@/context/PlayerSettingsContext';
import {
  fetchCloudTranscriptions,
  saveCloudTranscription,
  updateCloudTranscription,
  deleteCloudTranscription,
} from '@/lib/supabase/transcriptionService';
import { Sidebar, SidebarTab } from './Sidebar';
import { AudioUploader, formatReadableDuration } from './AudioUploader';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { TranscriptEditor } from './TranscriptEditor';
import { AuthModal } from './AuthModal';

interface TranscriptionStudioProps {
  initialSampleId?: string;
  onBackToHome?: () => void;
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  onBackToHome,
  activeTab: controlledTab,
  onTabChange: onControlledTabChange,
}) => {
  // Navigation & Layout
  const [internalSidebarTab, setInternalSidebarTab] = useState<SidebarTab>('dashboard');
  const sidebarTab = controlledTab || internalSidebarTab;

  const setSidebarTab = (tab: SidebarTab) => {
    setInternalSidebarTab(tab);
    if (onControlledTabChange) {
      onControlledTabChange(tab);
    }
  };

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

  // Recordings Page State (Filtering, Sorting, Selection, Pagination)
  const [recordingsStatusFilter, setRecordingsStatusFilter] = useState<'all' | 'processing' | 'transcribed' | 'failed'>('all');
  const [recordingsSort, setRecordingsSort] = useState<'newest' | 'oldest' | 'duration_desc' | 'duration_asc' | 'alphabetical'>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<Set<string>>(new Set());
  const [activeExportDropdownId, setActiveExportDropdownId] = useState<string | null>(null);
  const [activeMoreMenuId, setActiveMoreMenuId] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Exact segment playback state for "▶ Click to play from here"
  const [activePlaySegment, setActivePlaySegment] = useState<{
    startTime: number;
    endTime: number;
    id: string;
  } | null>(null);

  // Audio Player Theme Settings & Interactive Live Preview State
  const { playerDesign, setPlayerDesign } = usePlayerSettings();
  const [settingsAudioUrl, setSettingsAudioUrl] = useState<string | null>(null);
  const [settingsAudioDuration, setSettingsAudioDuration] = useState<number>(57);
  const [settingsCurrentTime, setSettingsCurrentTime] = useState<number>(23);
  const [settingsIsPlaying, setSettingsIsPlaying] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Initialize synthetic audio tone for live preview
  useEffect(() => {
    if (typeof window !== 'undefined' && !settingsAudioUrl) {
      const synthetic = createSyntheticAudioBlob(57);
      setSettingsAudioUrl(synthetic);
    }
  }, [settingsAudioUrl]);

  const handleSelectPlayerDesign = async (design: PlayerDesign) => {
    await setPlayerDesign(design);
    setSaveToast(`Player Design "${design === 'purple-glass' ? 'Purple Glass' : 'Teal Glass'}" applied & saved!`);
    setTimeout(() => {
      setSaveToast(null);
    }, 3500);
  };

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

  // Filtered and sorted recordings for the Recordings tab
  const filteredAndSortedRecordings = useMemo(() => {
    let result = [...history];

    // 1. Text Search: matches fileName, summary, speaker, or segment content
    if (searchRecordingsQuery.trim()) {
      const q = searchRecordingsQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.fileName.toLowerCase().includes(q) ||
          item.result.summary.toLowerCase().includes(q) ||
          item.result.segments.some(
            (s) => s.text.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q)
          )
      );
    }

    // 2. Status Filter
    if (recordingsStatusFilter !== 'all') {
      if (recordingsStatusFilter === 'transcribed') {
        // All completed recordings in history are transcribed
      } else {
        result = []; // none processing or failed in completed history
      }
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (recordingsSort === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (recordingsSort === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (recordingsSort === 'duration_desc') {
        return b.duration - a.duration;
      } else if (recordingsSort === 'duration_asc') {
        return a.duration - b.duration;
      } else if (recordingsSort === 'alphabetical') {
        return a.fileName.localeCompare(b.fileName);
      }
      return 0;
    });

    return result;
  }, [history, searchRecordingsQuery, recordingsStatusFilter, recordingsSort]);

  // Paginated recordings
  const totalRecordings = filteredAndSortedRecordings.length;
  const totalPages = Math.max(1, Math.ceil(totalRecordings / rowsPerPage));
  const paginatedRecordings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedRecordings.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRecordings, currentPage, rowsPerPage]);

  const startIndex = totalRecordings === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalRecordings);

  // Formatter for recording timestamp matching reference image
  const formatRecordingDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      if (isToday) return `Today, ${hours}:${mins}`;
      if (isYesterday) return `Yesterday, ${hours}:${mins}`;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]}, ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedRecordingIds.size === paginatedRecordings.length && paginatedRecordings.length > 0) {
      setSelectedRecordingIds(new Set());
    } else {
      setSelectedRecordingIds(new Set(paginatedRecordings.map((r) => r.id)));
    }
  };

  const handleToggleSelectRecording = (id: string) => {
    const next = new Set(selectedRecordingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecordingIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedRecordingIds.size === 0) return;
    if (confirm(`Delete ${selectedRecordingIds.size} selected recording(s)?`)) {
      for (const id of Array.from(selectedRecordingIds)) {
        await handleDeleteHistoryItem(id);
      }
      setSelectedRecordingIds(new Set());
    }
  };

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
      <div className="flex-1 min-w-0 flex flex-col">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:px-12 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full space-y-6">
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
                          <span>{formatReadableDuration(transcriptionData.metadata.duration)}</span>
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

                  {/* Audio Waveform Player with Segment Boundary Enforcement */}
                  {audioUrl && (
                    <AudioWaveformPlayer
                      audioUrl={audioUrl}
                      duration={audioDuration}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      title={transcriptionData.metadata.fileName}
                      onTimeUpdate={(t) => setCurrentTime(t)}
                      onPlayPause={(p) => setIsPlaying(p)}
                      onSeek={(t) => {
                        setActivePlaySegment(null);
                        setCurrentTime(t);
                      }}
                      segmentPlayback={activePlaySegment}
                      onSegmentComplete={() => setActivePlaySegment(null)}
                    />
                  )}

                  {/* Complete Transcript + 7-Dimension AI Summarization + 9 Export Formats */}
                  <TranscriptEditor
                    data={transcriptionData}
                    currentTime={currentTime}
                    activeEngine="openai"
                    activePlayingSegmentId={activePlaySegment?.id.split('___')[0] || null}
                    onPlaySegment={(startTime, endTime, segmentId) => {
                      if (activePlaySegment && activePlaySegment.id.startsWith(segmentId) && isPlaying) {
                        setIsPlaying(false);
                        setActivePlaySegment(null);
                        return;
                      }
                      setCurrentTime(startTime);
                      setActivePlaySegment({
                        startTime,
                        endTime,
                        id: `${segmentId}___${Date.now()}`,
                      });
                      setIsPlaying(true);
                    }}
                    onSeekAudio={(time) => {
                      setActivePlaySegment(null);
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
          {/* (Exact match to Reference Screenshot media_1793561467272) */}
          {/* ======================================================== */}
          {sidebarTab === 'recordings' && (
            <div className="space-y-4 animate-fade-in pb-12">
              {/* 1. Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Recordings
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {totalRecordings} {totalRecordings === 1 ? 'recording' : 'recordings'}
                  </p>
                </div>

                {selectedRecordingIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete selected ({selectedRecordingIds.size})</span>
                  </button>
                )}
              </div>

              {/* 2. Search & Filters Bar matching screenshot */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                {/* Search transcripts, titles, speakers input */}
                <div className="relative flex-1 max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search transcripts, titles, speakers"
                    value={searchRecordingsQuery}
                    onChange={(e) => {
                      setSearchRecordingsQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded">
                    Ctrl K
                  </span>
                </div>

                {/* Status Filter Pills + Filter Button + Sort Dropdown */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  {/* Status Pills Group */}
                  <div className="inline-flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 text-xs font-semibold">
                    {(['all', 'processing', 'transcribed', 'failed'] as const).map((status) => {
                      const isActive = recordingsStatusFilter === status;
                      const label =
                        status === 'all'
                          ? 'All'
                          : status === 'processing'
                          ? 'Processing'
                          : status === 'transcribed'
                          ? 'Transcribed'
                          : 'Failed';
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setRecordingsStatusFilter(status);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer capitalize ${
                            isActive
                              ? 'bg-[#0f172a] text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Button */}
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors"
                    >
                      <span>
                        {recordingsSort === 'newest'
                          ? 'Newest first'
                          : recordingsSort === 'oldest'
                          ? 'Oldest first'
                          : recordingsSort === 'duration_desc'
                          ? 'Longest first'
                          : recordingsSort === 'duration_asc'
                          ? 'Shortest first'
                          : 'Alphabetical'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showSortDropdown && (
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-30 text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setRecordingsSort('newest');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                            recordingsSort === 'newest'
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Newest first
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecordingsSort('oldest');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                            recordingsSort === 'oldest'
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Oldest first
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecordingsSort('duration_desc');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                            recordingsSort === 'duration_desc'
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Duration (Longest)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecordingsSort('duration_asc');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                            recordingsSort === 'duration_asc'
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Duration (Shortest)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecordingsSort('alphabetical');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                            recordingsSort === 'alphabetical'
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Alphabetical (A-Z)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Recording Cards List */}
              <div className="space-y-3 pt-1">
                {paginatedRecordings.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
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
                  paginatedRecordings.map((doc) => {
                    const isSelected = selectedRecordingIds.has(doc.id);
                    const previewText =
                      doc.result.segments?.map((s) => s.text).join(' ') ||
                      doc.result.summary ||
                      'No transcript text preview available.';

                    return (
                      <div
                        key={doc.id}
                        className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs space-y-3 ${
                          isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {/* Top Row: Details (Left) & Action Buttons (Right) */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Left: Checkbox + Filename + Metadata Badges */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRecording(doc.id)}
                              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />

                            <div className="min-w-0 space-y-1.5 flex-1">
                              {/* Filename */}
                              <h4
                                onClick={() => {
                                  setTranscriptionData(doc.result);
                                  setAudioDuration(doc.result.metadata.duration);
                                  setCurrentTime(0);
                                  setIsPlaying(false);
                                  setSidebarTab('dashboard');
                                }}
                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate tracking-tight transition-colors"
                                title={doc.fileName}
                              >
                                {doc.fileName.replace(/\.[^/.]+$/, '')}
                              </h4>

                              {/* Badges Row matching screenshot */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                                {/* • Transcribed status badge */}
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Transcribed</span>
                                </span>

                                {/* ↑ File upload source badge */}
                                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                                  <ArrowUpToLine className="w-3 h-3 text-slate-500" />
                                  <span>File upload</span>
                                </span>

                                {/* 📅 Date & Time */}
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{formatRecordingDate(doc.date)}</span>
                                </span>

                                {/* ⏱ Duration */}
                                <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{formatTime(doc.duration)}</span>
                                </span>

                                {/* 🌐 Language */}
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Globe className="w-3 h-3 text-slate-400" />
                                  <span>{doc.result.metadata?.language || 'Auto'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Action Buttons Group matching screenshot */}
                          <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                            {/* [ Open transcript ] Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTranscriptionData(doc.result);
                                setAudioDuration(doc.result.metadata.duration);
                                setCurrentTime(0);
                                setIsPlaying(false);
                                setSidebarTab('dashboard');
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] shadow-xs transition-all cursor-pointer"
                            >
                              Open transcript
                            </button>

                            {/* [ Export ∨ ] Dropdown Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveExportDropdownId(
                                    activeExportDropdownId === doc.id ? null : doc.id
                                  )
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                              >
                                <span>Export</span>
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              </button>

                              {activeExportDropdownId === doc.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      exportCombined(doc.result, 'docx');
                                      setActiveExportDropdownId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Word (DOCX)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      exportToPDF(doc.result);
                                      setActiveExportDropdownId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                                    <span>PDF Document</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      exportToTXT(doc.result);
                                      setActiveExportDropdownId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Plain Text (TXT)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      exportToSRT(doc.result);
                                      setActiveExportDropdownId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Subtitles (SRT)</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Play Audio Button (▷) */}
                            <button
                              type="button"
                              onClick={() => {
                                setTranscriptionData(doc.result);
                                setAudioDuration(doc.result.metadata.duration);
                                setCurrentTime(0);
                                setIsPlaying(true);
                                setSidebarTab('dashboard');
                              }}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                              title="Play Audio"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-slate-600" />
                            </button>

                            {/* Delete Button (🗑) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryItem(doc.id)}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                              title="Delete Recording"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Three-dot More Actions Menu (•••) */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMoreMenuId(activeMoreMenuId === doc.id ? null : doc.id)
                                }
                                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                                title="More actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {activeMoreMenuId === doc.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(previewText);
                                      setActiveMoreMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Copy Transcript</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTranscriptionData(doc.result);
                                      setSidebarTab('dashboard');
                                      setActiveMoreMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Open in Studio</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Transcript Preview Paragraph */}
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal pt-1 line-clamp-2">
                          {previewText}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 4. Pagination Bottom Bar matching screenshot */}
              {totalRecordings > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-xs text-slate-600 mt-2">
                  <div className="font-medium text-slate-500">
                    Showing {startIndex}–{endIndex} of {totalRecordings}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Rows per page</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-indigo-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    {/* Previous and Next Navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

                {/* Audio Player Preferences Quick Link */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Palette className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Audio Player Preference</h4>
                      <p className="text-[11px] text-indigo-700/80">
                        Current theme: <span className="font-bold">{playerDesign === 'purple-glass' ? 'Player Design 1 (Purple Glass)' : 'Player Design 2 (Teal Glass)'}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarTab('settings')}
                    className="px-3 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    Change Theme →
                  </button>
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

          {/* ======================================================== */}
          {/* TAB 4: MY SETTINGS (AUDIO PLAYER PREFERENCES)            */}
          {/* ======================================================== */}
          {sidebarTab === 'settings' && (
            <div className="space-y-8 max-w-5xl animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      My Settings
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Preferences
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage your application preferences, audio player interface, and studio settings.
                  </p>
                </div>

                {/* Sub-nav quick link to My Profile */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSidebarTab('profile')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>View My Profile</span>
                  </button>
                </div>
              </div>

              {/* Toast / Notification when preference is updated */}
              {saveToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveToast}</span>
                </div>
              )}

              {/* SECTION: AUDIO PLAYER PREFERENCES */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Audio Player Preferences
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                    Select your preferred audio player design. Your selection applies automatically across all uploaded recordings, studio transcriptions, and persists across reloads and logins.
                  </p>
                </div>

                {/* TWO SELECTABLE CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CARD 1: Player Design 1 – Purple Glass */}
                  <div
                    onClick={() => handleSelectPlayerDesign('purple-glass')}
                    className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                      playerDesign === 'purple-glass'
                        ? 'border-purple-600 bg-purple-50/20 shadow-md shadow-purple-500/10 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-purple-300 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header & Radio */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 tracking-wide uppercase">
                              Default • Ref Image 2
                            </span>
                            {playerDesign === 'purple-glass' && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> Active Theme
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-purple-900 transition-colors">
                            Player Design 1 – Purple Glass
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Premium purple/blue glassmorphism player with glowing fluid waveform, rounded corners, and vibrant gradients.
                          </p>
                        </div>

                        {/* Radio circle */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                            playerDesign === 'purple-glass'
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-slate-300 group-hover:border-purple-400'
                          }`}
                        >
                          {playerDesign === 'purple-glass' && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>

                      {/* Visual Thumbnail / Preview of Purple Glass */}
                      <div className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-[#120f2d] p-4 text-white shadow-inner">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xs shrink-0">
                              <div className="flex items-center gap-0.5 h-4">
                                <div className="w-0.5 h-2 bg-white rounded-full" />
                                <div className="w-0.5 h-3.5 bg-white rounded-full" />
                                <div className="w-0.5 h-4 bg-white rounded-full" />
                                <div className="w-0.5 h-2.5 bg-white rounded-full" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">Meeting_Recording.mp3</div>
                              <div className="text-[10px] text-purple-300/70">Total duration: 0:57</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#9055ff] to-[#6725ea] flex items-center justify-center shadow-[0_0_12px_rgba(144,85,255,0.7)] text-white">
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Fluid Wave Thumbnail Mock */}
                        <div className="my-2.5 h-7 relative flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-3 bg-gradient-to-r from-pink-500/40 via-purple-400/80 to-blue-400/40 rounded-full blur-[2px]" />
                          </div>
                          <div className="w-full h-0.5 bg-gradient-to-r from-pink-500 via-purple-300 to-blue-400 relative z-10" />
                        </div>

                        {/* Scrubber Mock */}
                        <div className="flex items-center gap-2 text-[9px] font-mono text-purple-200/70">
                          <span>0:23</span>
                          <div className="flex-1 h-1 bg-purple-950 rounded-full overflow-hidden">
                            <div className="w-[40%] h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                          </div>
                          <span>0:57</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {playerDesign === 'purple-glass' ? 'Active application theme' : 'Click to select theme'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlayerDesign('purple-glass');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          playerDesign === 'purple-glass'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        {playerDesign === 'purple-glass' ? 'Selected' : 'Use Purple Glass'}
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: Player Design 2 – Teal Glass */}
                  <div
                    onClick={() => handleSelectPlayerDesign('teal-glass')}
                    className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                      playerDesign === 'teal-glass'
                        ? 'border-teal-600 bg-teal-50/20 shadow-md shadow-teal-500/10 ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-teal-300 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header & Radio */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 tracking-wide uppercase">
                              Acoustic • Ref Image 3
                            </span>
                            {playerDesign === 'teal-glass' && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> Active Theme
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-teal-900 transition-colors">
                            Player Design 2 – Teal Glass
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Dark teal/green glassmorphism player with glowing animated acoustic waveform, mic emblem, and emerald ring controls.
                          </p>
                        </div>

                        {/* Radio circle */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                            playerDesign === 'teal-glass'
                              ? 'border-teal-600 bg-teal-600'
                              : 'border-slate-300 group-hover:border-teal-400'
                          }`}
                        >
                          {playerDesign === 'teal-glass' && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>

                      {/* Visual Thumbnail / Preview of Teal Glass */}
                      <div className="relative rounded-2xl overflow-hidden border border-teal-500/30 bg-[#061e1b] p-4 text-white shadow-inner">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-xs shrink-0">
                              <Mic className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">Demo.mp3</div>
                              <div className="text-[10px] text-teal-300/70">Total duration: 0:57</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-7 h-7 rounded-full border border-emerald-400 bg-emerald-950/40 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.6)] text-emerald-300">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Fluid Wave Thumbnail Mock */}
                        <div className="my-2.5 h-7 relative flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-3 bg-gradient-to-r from-teal-500/40 via-emerald-400/80 to-cyan-400/40 rounded-full blur-[2px]" />
                          </div>
                          <div className="w-full h-0.5 bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-300 relative z-10" />
                        </div>

                        {/* Scrubber Mock */}
                        <div className="flex items-center gap-2 text-[9px] font-mono text-teal-200/70">
                          <span>0:00</span>
                          <div className="flex-1 h-1 bg-teal-950 rounded-full overflow-hidden">
                            <div className="w-[30%] h-full bg-gradient-to-r from-teal-400 to-cyan-300 rounded-full" />
                          </div>
                          <span>0:57</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {playerDesign === 'teal-glass' ? 'Active application theme' : 'Click to select theme'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlayerDesign('teal-glass');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          playerDesign === 'teal-glass'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                        }`}
                      >
                        {playerDesign === 'teal-glass' ? 'Selected' : 'Use Teal Glass'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIVE INTERACTIVE PLAYER PREVIEW */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Live Interactive Player Preview</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          REAL-TIME AUDIO & WAVEFORM
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Test the live player with audio playback, synchronized undulating waveform animations, and seekbar controls. Switching themes while playing continues seamlessly without audio pause.
                      </p>
                    </div>
                  </div>

                  {/* Render Live AudioWaveformPlayer with the currently active playerDesign */}
                  {settingsAudioUrl && (
                    <AudioWaveformPlayer
                      audioUrl={settingsAudioUrl}
                      duration={settingsAudioDuration}
                      currentTime={settingsCurrentTime}
                      isPlaying={settingsIsPlaying}
                      title={playerDesign === 'purple-glass' ? 'Meeting_Recording.mp3' : 'Demo.mp3'}
                      onTimeUpdate={(t) => setSettingsCurrentTime(t)}
                      onPlayPause={(p) => setSettingsIsPlaying(p)}
                      onSeek={(t) => setSettingsCurrentTime(t)}
                    />
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
