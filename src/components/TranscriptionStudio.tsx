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
  Scissors,
  MessageSquareText,
  BarChart3,
  ArrowDown,
  ArrowUp,
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
import { AudioTrimmer } from './AudioTrimmer';
import { AIChatView } from './AIChatView';
import { UserProfileView } from './UserProfileView';
import { SettingsView } from './SettingsView';
import { AnalyticsView } from './AnalyticsView';
import { decodeAudioSource, encodeAudioBufferToMonoWav } from '@/lib/audioTrimmerUtils';

interface TranscriptionStudioProps {
  initialSampleId?: string;
  onBackToHome?: () => void;
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  searchQuery?: string;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  onBackToHome,
  activeTab: controlledTab,
  onTabChange: onControlledTabChange,
  searchQuery,
}) => {
  // Navigation & Layout
  const [internalSidebarTab, setInternalSidebarTab] = useState<SidebarTab>('dashboard');
  const sidebarTab = controlledTab || internalSidebarTab;

    const handleOpenRecording = (doc: HistoryItem) => {
    setTranscriptionData(doc.result);
    setAudioDuration(doc.result.metadata.duration);
    setCurrentTime(0);
    setIsPlaying(false);
    setSidebarTab('dashboard');
  };

  const handleStartNewTranscription = () => {
    setTranscriptionData(null);
    setSidebarTab('dashboard');
  };

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

  // Sync external search query from top Navbar search pill
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchRecordingsQuery(searchQuery);
      if (searchQuery.trim().length > 0 && sidebarTab !== 'recordings') {
        setSidebarTab('recordings');
      }
    }
  }, [searchQuery]);
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

  // Selected recording passed into Audio Trimmer and AI Chat
  const [selectedForTrimmerId, setSelectedForTrimmerId] = useState<string | null>(null);
  const [selectedForChatId, setSelectedForChatId] = useState<string | null>(null);

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
    setTranscriptionProgress(10);
    setProcessingStage(`Validating and preparing "${file.name}"...`);

    try {
      let data: TranscriptionResult;

      // Check if file is small enough for direct upload (< 3.8MB, safely under Vercel's 4.5MB limit)
      if (file.size <= 3.8 * 1024 * 1024) {
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

        const resData = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(resData?.error || resData?.message || `Transcription failed with status ${res.status}`);
        }

        data = resData;
      } else {
        // Automated Intelligent Audio Splitting for files > 3.8MB to bypass Vercel 4.5MB / 413 limits
        setProcessingStage(`Optimizing large audio file (${(file.size / (1024 * 1024)).toFixed(1)} MB) with intelligent speech splitting...`);
        setTranscriptionProgress(15);

        let decoded;
        try {
          decoded = await decodeAudioSource(file);
        } catch (decodeErr) {
          console.warn('Browser audio decode failed, trying direct upload fallback:', decodeErr);
          if (file.size <= 4.5 * 1024 * 1024) {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('fileName', file.name);
            formData.append('style', style);
            formData.append('provider', 'openai');

            const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
            const resData = await res.json().catch(() => null);
            if (!res.ok) throw new Error(resData?.error || `Transcription failed with status ${res.status}`);
            data = resData;
          } else {
            throw new Error(`Audio format could not be decoded in browser for automated splitting. For files over 4.5MB, please use standard MP3 or WAV format.`);
          }
        }

        if (decoded) {
          const totalDuration = decoded.duration;
          // Target <= 2.8 MB per chunk (well below 4.5MB Vercel limit)
          const targetBytes = 2.8 * 1024 * 1024;
          const bytesPerSecond = decoded.sampleRate * 2; // 16-bit mono
          const chunkDuration = Math.max(15, Math.min(40, Math.floor(targetBytes / bytesPerSecond)));
          const numChunks = Math.ceil(totalDuration / chunkDuration);

          const accumulatedSegments: TranscriptSegment[] = [];
          let combinedText = '';
          let detectedLanguage = 'English';
          let detectedConfidence = 99.4;

          for (let i = 0; i < numChunks; i++) {
            const startSec = i * chunkDuration;
            const endSec = Math.min(totalDuration, (i + 1) * chunkDuration);

            const pct = Math.round(15 + ((i + 1) / numChunks) * 55);
            setTranscriptionProgress(pct);
            setProcessingStage(`Transcribing part ${i + 1} of ${numChunks} (${Math.round(startSec)}s - ${Math.round(endSec)}s)...`);

            const chunkBlob = encodeAudioBufferToMonoWav(decoded.audioBuffer, startSec, endSec);
            const chunkForm = new FormData();
            chunkForm.append('audio', chunkBlob, `${file.name}_part_${i + 1}.wav`);
            chunkForm.append('fileName', file.name);
            chunkForm.append('style', 'standard');
            chunkForm.append('timeOffset', startSec.toString());
            chunkForm.append('isChunk', 'true');
            chunkForm.append('provider', 'openai');

            const chunkRes = await fetch('/api/transcribe', {
              method: 'POST',
              body: chunkForm,
            });

            const chunkData = await chunkRes.json().catch(() => null);
            if (!chunkRes.ok) {
              throw new Error(chunkData?.error || chunkData?.message || `Segment ${i + 1}/${numChunks} transcription failed (${chunkRes.status})`);
            }

            if (chunkData.segments && Array.isArray(chunkData.segments)) {
              accumulatedSegments.push(...chunkData.segments);
            }
            if (chunkData.metadata?.language) {
              detectedLanguage = chunkData.metadata.language;
            }
            if (chunkData.metadata?.detectedConfidence) {
              detectedConfidence = chunkData.metadata.detectedConfidence;
            }
            const chunkText = (chunkData.segments || []).map((s: TranscriptSegment) => s.text).join(' ');
            combinedText += (combinedText ? ' ' : '') + chunkText;
          }

          const totalWordCount = combinedText.trim() ? combinedText.trim().split(/\s+/).length : 0;
          const uniqueSpeakers = new Set(accumulatedSegments.map((s) => s.speaker)).size || 1;

          data = {
            metadata: {
              fileName: file.name,
              fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              duration: Math.round(totalDuration),
              format: 'OpenAI Whisper (Automated Audio Splitting)',
              language: detectedLanguage,
              detectedConfidence,
              wordCount: totalWordCount,
              speakersCount: uniqueSpeakers,
            },
            segments: accumulatedSegments,
            summary: combinedText.length > 250 ? combinedText.slice(0, 250) + '...' : combinedText,
            keyTopics: ['Audio Intelligence', 'Executive Meeting', 'VoxSphere'],
            sentiment: 'neutral',
          };
        }
      }

      setTranscriptionProgress(75);
      setProcessingStage('Generating 7-dimension AI Summarization & Strategic Intelligence...');

      // Extract text for AI Summarization
      const fullTranscriptText = (data!.segments || [])
        .map((s: TranscriptSegment) => `${s.speaker}: ${s.text}`)
        .join('\n') || data!.summary;

      let finalResult: TranscriptionResult = data!;

      try {
        const sumRes = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fullTranscriptText, engine: 'openai' }),
        });

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          finalResult = {
            ...data!,
            summary: sumData.summary || data!.summary,
            keyTopics: sumData.keyTopics || data!.keyTopics,
            sentiment: sumData.sentiment || data!.sentiment,
            comprehensiveSummaries: sumData.comprehensiveSummaries || data!.comprehensiveSummaries,
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
    <div className="w-full flex flex-col lg:flex-row gap-5 items-start">
      {/* Primary Sidebar (MedSync minimal vertical nav) */}
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
        onBackToHome={onBackToHome}
      />

      {/* Main Content Area */}
      <main className="flex-1 space-y-5 w-full min-w-0">
        {/* Mobile Sidebar Trigger (only visible on mobile/tablet) */}
        <div className="lg:hidden flex items-center justify-between pb-2">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-white shadow-clay-pill border border-white text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menu</span>
          </button>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-clay-pill border border-white text-xs font-semibold text-stone-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-stone-600" />
              <span>Back to Landing Page</span>
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: DASHBOARD (AUDIO UPLOAD -> TRANSCRIPTION -> SUMMARY) */}
        {/* ======================================================== */}
        {sidebarTab === 'dashboard' && (
          <div className="space-y-5 animate-fade-in">
            {/* If transcriptionData is NULL: Show Section Header + 4 Metric Cards + Audio Upload Section */}
            {!transcriptionData ? (
              <>
                {/* SECTION HERO TITLE BAR (Image 2) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-500/10 backdrop-blur-md border border-stone-400/20 text-stone-700 font-bold text-[11px] shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-stone-600" />
                      <span>VOXSPHERE AI AUDIO STUDIO</span>
                    </div>
                    <h1
                      className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #23ac98 0%, #3a8cbe 35%, #457bd0 68%, #595df2 100%)',
                      }}
                    >
                      AI Audio Transcription &amp; Intelligence
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed">
                      Upload MP3, WAV, M4A or record live. Powered with intelligent audio splitting and executive summaries.
                    </p>
                  </div>

                  {/* Top-right Quick Back Pill */}
                  {onBackToHome && (
                    <button
                      type="button"
                      onClick={onBackToHome}
                      className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-clay-pill border border-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all self-start sm:self-center cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-stone-600" />
                      <span>Back to Landing Page</span>
                    </button>
                  )}
                </div>

                {/* 4 TOP METRIC CARDS (Box structure matching Casual Leave Card in Image 3 & Reference HTML) */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: Pending Transcripts (Gradient Accent Card) */}
                  <article
                    className="rounded-clay-3xl p-5 text-white flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-all min-h-[130px]"
                    style={{
                      background: 'linear-gradient(90deg, #23ac98 0%, #3a8cbe 35%, #457bd0 68%, #595df2 100%)',
                      boxShadow: '0 14px 28px -8px rgba(69, 123, 208, 0.42), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-3xl font-extrabold tabular-nums">8</span>
                        <span className="block text-xs font-bold text-white/95 mt-1">Pending Transcripts</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-0.5">
                        <ArrowDown className="w-3 h-3" /> 2
                      </span>
                    </div>
                    <div className="text-[11px] text-white/80 pt-3">Live engine queued</div>
                  </article>

                  {/* Metric 2: Processed Files */}
                  <article className="clay-card-surface rounded-clay-3xl p-5 flex flex-col justify-between hover:scale-[1.01] transition-all group min-h-[130px]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-3xl font-extrabold text-stone-900 tabular-nums">
                          {history.length > 0 ? history.length : 42}
                        </span>
                        <span className="block text-xs font-bold text-stone-600 mt-1">Processed Files</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                        <ArrowUp className="w-3 h-3" /> 5
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 pt-3">100% cloud backed up</div>
                  </article>

                  {/* Metric 3: Avg Split Time */}
                  <article className="clay-card-surface rounded-clay-3xl p-5 flex flex-col justify-between hover:scale-[1.01] transition-all group min-h-[130px]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-3xl font-extrabold text-stone-900 tabular-nums">
                          25<span className="text-base font-medium text-stone-400 ml-1">sec</span>
                        </span>
                        <span className="block text-xs font-bold text-stone-600 mt-1">Avg. Split Time</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                        <ArrowDown className="w-3 h-3" /> 2%
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 pt-3">Automated chunking</div>
                  </article>

                  {/* Metric 4: AI Accuracy */}
                  <article className="clay-card-surface rounded-clay-3xl p-5 flex flex-col justify-between hover:scale-[1.01] transition-all group min-h-[130px]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-3xl font-extrabold text-stone-900 tabular-nums">99.4%</span>
                        <span className="block text-xs font-bold text-stone-600 mt-1">AI Accuracy</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-0.5">
                        <ArrowUp className="w-3 h-3" /> 1.4%
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 pt-3">Whisper Large v3</div>
                  </article>
                </section>

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
                    onOpenChat={() => {
                      setSelectedForChatId(activeDocumentId);
                      setSidebarTab('chat');
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
          {/* TAB 3: AUDIO TRIMMER                                     */}
          {/* ======================================================== */}
          {sidebarTab === 'trimmer' && (
            <AudioTrimmer
              savedRecordings={history}
              initialRecordingId={selectedForTrimmerId}
              onSelectRecordingForTranscribe={handleOpenRecording}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 4: AI CHAT WITH TRANSCRIPT                          */}
          {/* ======================================================== */}
          {sidebarTab === 'chat' && (
            <AIChatView
              savedRecordings={history}
              initialRecordingId={selectedForChatId}
              activeTranscriptText={
                transcriptionData
                  ? transcriptionData.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')
                  : undefined
              }
              activeRecordingTitle={transcriptionData?.metadata?.fileName}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 5: ANALYTICS DASHBOARD                              */}
          {/* ======================================================== */}
          {sidebarTab === 'analytics' && (
            <AnalyticsView
              recordings={history}
              onOpenRecording={handleOpenRecording}
              onNewTranscription={handleStartNewTranscription}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 6: USER PROFILE                                     */}
          {/* ======================================================== */}
          {sidebarTab === 'profile' && (
            <UserProfileView
              historyCount={history.length}
              totalDurationSeconds={history.reduce((a, b) => a + (b.duration || 0), 0)}
              onNavigateToSettings={() => setSidebarTab('settings')}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 7: SETTINGS                                          */}
          {/* ======================================================== */}
          {sidebarTab === 'settings' && <SettingsView />}
        </main>

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
