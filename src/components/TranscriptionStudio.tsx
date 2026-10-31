'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Mic,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileAudio,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Clock,
  History,
  ListOrdered,
  CheckCircle2,
  XCircle,
  Trash2,
  Play,
  RotateCcw,
  Download,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  TranscriptionResult,
  QueueItem,
  HistoryItem,
} from '@/types/transcription';
import { DEMO_SAMPLES } from '@/lib/sampleAudios';
import { createSyntheticAudioBlob } from '@/lib/audioToneGenerator';
import { exportToDOCX, exportToPDF, exportToTXT } from '@/lib/exportUtils';
import { AudioUploader } from './AudioUploader';
import { AudioRecorder } from './AudioRecorder';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { TranscriptEditor } from './TranscriptEditor';

interface TranscriptionStudioProps {
  initialSampleId?: string;
  onBackToHome?: () => void;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  initialSampleId = 'sample-pe-due-diligence',
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const activeEngine = 'sarvam'; // Sarvam AI Saaras Default Engine
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSampleId, setCurrentSampleId] = useState<string>(initialSampleId || 'sample-pe-due-diligence');

  // Processing Queue State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const isProcessingQueueRef = useRef(false);

  // Document History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Active status & errors
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load History from localStorage on client mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('voxsphere_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Could not read user history from localStorage:', e);
    }
  }, []);

  // Add Item to Document History
  const addToHistory = useCallback((res: TranscriptionResult) => {
    const newItem: HistoryItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName: res.metadata.fileName,
      date: new Date().toLocaleString(),
      duration: res.metadata.duration,
      wordCount: res.metadata.wordCount,
      speakersCount: res.metadata.speakersCount,
      result: res,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((h) => h.fileName !== res.metadata.fileName)].slice(0, 20);
      try {
        localStorage.setItem('voxsphere_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('voxsphere_history', JSON.stringify(updated));
      } catch {}
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

  // Load demo sample (Does not deduct trial minutes)
  const loadSampleById = useCallback((sampleId: string) => {
    setCurrentSampleId(sampleId);
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

  // Execute transcription API call for an individual file/blob
  const executeTranscription = async (
    audioInput: File | Blob,
    engine: 'sarvam' | 'gemini' | 'openai' | 'groq',
    customFileName?: string,
    onProgressUpdate?: (percent: number, stage: string) => void
  ): Promise<TranscriptionResult> => {
    const resolvedFileName =
      customFileName ||
      (audioInput instanceof File ? audioInput.name : 'recorded_audio.wav');

    onProgressUpdate?.(15, 'Preparing audio payload & acoustic headers...');

    const formData = new FormData();
    formData.append('audio', audioInput);
    formData.append('fileName', resolvedFileName);
    formData.append('provider', engine);

    onProgressUpdate?.(35, `Transcribing via ${engine === 'sarvam' ? 'Sarvam AI Saaras' : engine === 'openai' ? 'OpenAI gpt-transcribe' : engine === 'gemini' ? 'Google Gemini' : 'Groq Whisper Turbo'}...`);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    onProgressUpdate?.(75, 'Receiving verbatim timestamps & synthesizing initial briefing...');

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Transcription failed (${res.status})`);
    }

    onProgressUpdate?.(100, 'Completed');
    return data as TranscriptionResult;
  };

  // Process next item in the queue
  const processQueueNext = useCallback(async (currentQueue: QueueItem[]) => {
    if (isProcessingQueueRef.current) return;
    const nextItem = currentQueue.find((item) => item.status === 'queued');
    if (!nextItem || !nextItem.file) return;

    isProcessingQueueRef.current = true;
    setIsProcessingQueue(true);

    // Update status to uploading / transcribing
    setQueue((prev) =>
      prev.map((item) =>
        item.id === nextItem.id
          ? { ...item, status: 'transcribing', progress: 20 }
          : item
      )
    );

    try {
      const result = await executeTranscription(
        nextItem.file,
        activeEngine,
        nextItem.fileName,
        (percent) => {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === nextItem.id ? { ...item, progress: percent } : item
            )
          );
        }
      );

      // Add to Document History
      addToHistory(result);

      // Mark queue item as completed
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: 'completed', progress: 100, result }
            : item
        )
      );

      // Automatically display in editor if it's the active focus
      setTranscriptionData(result);
      if (result.metadata?.duration) {
        setAudioDuration(result.metadata.duration);
      }
      const localUrl = URL.createObjectURL(nextItem.file);
      setAudioUrl(localUrl);
      setCurrentTime(0);
      setCurrentSampleId(`queue-${nextItem.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: 'failed', error: msg, progress: 0 }
            : item
        )
      );
    } finally {
      isProcessingQueueRef.current = false;
      setIsProcessingQueue(false);
    }
  }, [activeEngine, addToHistory]);

  // Trigger next queue item whenever queue changes
  useEffect(() => {
    const hasQueued = queue.some((i) => i.status === 'queued');
    if (hasQueued && !isProcessingQueueRef.current) {
      processQueueNext(queue);
    }
  }, [queue, processQueueNext]);

  // Handle multiple files selected/dropped
  const handleFilesSelected = (files: File[]) => {
    setErrorMessage(null);

    const newQueueItems: QueueItem[] = files.map((file) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      durationEstimate: Math.round(file.size / (32 * 1024)), // rough initial estimate
      status: 'queued',
      progress: 0,
      addedAt: Date.now(),
    }));

    setQueue((prev) => [...prev, ...newQueueItems]);
  };

  // Retry a failed item in the queue
  const handleRetryQueueItem = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'queued', error: undefined, progress: 0 } : item
      )
    );
  };

  // Remove item from queue
  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Handle single file selected (backwards compatibility)
  const handleSingleFileSelected = (file: File) => {
    handleFilesSelected([file]);
  };

  // Handle mic recording completed
  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setErrorMessage(null);
    setCurrentSampleId('custom-recording');

    const localUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(localUrl);
    setAudioDuration(duration || 15);

    setIsProcessing(true);
    setProcessingStage('Transcribing live microphone audio with Sarvam AI...');

    try {
      const recName = `Live_Recording_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.wav`;
      const result = await executeTranscription(audioBlob, activeEngine, recName);

      // Add to history
      addToHistory(result);

      setTranscriptionData(result);
      if (result.metadata?.duration) {
        setAudioDuration(result.metadata.duration);
      }
      setCurrentTime(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load a historical transcript into the editor
  const handleLoadFromHistory = (item: HistoryItem) => {
    setTranscriptionData(item.result);
    setAudioDuration(item.result.metadata.duration);
    setCurrentTime(0);
    setCurrentSampleId(`history-${item.id}`);

    const synthUrl = createSyntheticAudioBlob(item.result.metadata.duration);
    setAudioUrl(synthUrl);
    setShowHistoryModal(false);
  };

  const activeFileName =
    transcriptionData?.metadata.fileName ||
    (queue.length > 0 ? queue[0].fileName : 'Penguin_PE_DueDiligence_Review.m4a');

  return (
    <section id="studio" className="relative py-8 md:py-14 scroll-mt-20">
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

            <div className="flex items-center gap-3">
              {/* Document History Trigger Button */}
              <button
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Transcribed History ({history.length})</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>VoxSphere</span>
                <span>•</span>
                <span className="text-teal-700 font-semibold">OpenAI gpt-transcribe Suite</span>
              </div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VOXSPHERE AI AUDIO STUDIO</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              AI Audio Transcription & Intelligence
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Upload MP3, WAV, M4A or record live. Powered by OpenAI <code className="text-indigo-700 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">gpt-transcribe</code> with intelligent audio splitting and executive summaries.
            </p>

            {/* Currently Active Audio File Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="text-xs font-semibold text-slate-500">Active Document:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold font-mono">
                <FileAudio className="w-3.5 h-3.5 text-indigo-600" />
                {activeFileName}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Quick Demo Sample Switchers */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <span className="text-[11px] text-slate-500 font-semibold px-2">Demo:</span>
              <button
                onClick={() => loadSampleById('sample-pe-due-diligence')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentSampleId === 'sample-pe-due-diligence'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Private Equity Due Diligence (.m4a)"
              >
                PE Review (.m4a)
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
              <span>Upload Audio Files</span>
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
              onFileSelected={handleSingleFileSelected}
              onFilesSelected={handleFilesSelected}
              onSelectSample={loadSampleById}
              isTranscribing={isProcessing || isProcessingQueue}
            />
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setActiveTab('upload')}
            />
          )}

          {/* Live Processing Queue Panel (Required Feature) */}
          {queue.length > 0 && (
            <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Audio Processing Queue ({queue.length} Files)
                  </span>
                </div>
                <button
                  onClick={() => setQueue([])}
                  className="text-[11px] font-semibold text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-2.5">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileAudio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span className="truncate max-w-[240px] sm:max-w-[340px]">{item.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({item.fileSize})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {item.status === 'queued' && (
                            <span className="text-slate-500 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> Queued in batch
                            </span>
                          )}
                          {item.status === 'transcribing' && (
                            <span className="text-indigo-600 font-semibold flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Transcribing with OpenAI... ({item.progress}%)
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Transcribed & Verified
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-red-600 font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {item.error || 'Transcription Failed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {item.status === 'completed' && item.result && (
                        <button
                          onClick={() => {
                            setTranscriptionData(item.result!);
                            setAudioDuration(item.result!.metadata.duration);
                            if (item.file) {
                              setAudioUrl(URL.createObjectURL(item.file));
                            }
                            setCurrentTime(0);
                          }}
                          className="px-3 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Open in Studio →
                        </button>
                      )}

                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetryQueueItem(item.id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveQueueItem(item.id)}
                        className="p-1 text-slate-300 hover:text-slate-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator for mic recording */}
          {isProcessing && (
            <div className="p-6 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-indigo-950">
                  Processing Audio Stream with OpenAI gpt-transcribe...
                </div>
                <div className="text-xs text-indigo-700 font-medium">
                  {processingStage || 'Decoding acoustic frames...'}
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-red-900">Transcription Notification</div>
                <p>{errorMessage}</p>
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

            {/* Transcript Editor, 6 Summarization Modes & Export */}
            {transcriptionData && (
              <TranscriptEditor
                data={transcriptionData}
                currentTime={currentTime}
                activeEngine={activeEngine}
                onSeekAudio={(time) => {
                  setCurrentTime(time);
                  setIsPlaying(true);
                }}
                onUpdateResult={(updated) => setTranscriptionData(updated)}
              />
            )}
          </div>
        )}

        {/* Document History Modal / Drawer */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Transcribed Documents History
                    </h3>
                    <p className="text-xs text-slate-500">
                      Re-open past transcripts, view summaries, or download DOCX/PDF/TXT
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* History Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {history.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <FileAudio className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs">No saved transcripts yet. Transcribe an audio file to save it to history.</p>
                  </div>
                ) : (
                  history.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 flex items-center gap-2">
                          <span>{doc.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({doc.date})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Duration: {Math.round(doc.duration)}s</span>
                          <span>•</span>
                          <span>{doc.wordCount} words</span>
                          <span>•</span>
                          <span>{doc.speakersCount} speakers</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                          &ldquo;{doc.result.summary}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => handleLoadFromHistory(doc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer"
                        >
                          Open in Editor
                        </button>
                        <button
                          onClick={() => exportToDOCX(doc.result)}
                          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 cursor-pointer"
                          title="Download DOCX"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHistoryItem(doc.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 cursor-pointer"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{history.length} documents stored locally</span>
                  <button
                    onClick={handleClearHistory}
                    className="font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
