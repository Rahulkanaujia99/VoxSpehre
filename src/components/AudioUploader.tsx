'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  FileAudio,
  Sparkles,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Check,
  ChevronDown,
  Loader2,
  ShieldCheck,
  Clock,
  HardDrive,
  Pencil,
  Trash2,
} from 'lucide-react';
import { TranscriptionStyle } from '@/types/transcription';
import { formatDuration } from '@/lib/audioToneGenerator';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { WaveformLoadingBar } from './WaveformLoadingBar';

export interface StyleOption {
  id: TranscriptionStyle;
  label: string;
}

export const TRANSCRIPTION_STYLES: StyleOption[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'verbatim', label: 'Verbatim' },
  { id: 'clean_readable', label: 'Clean & Readable (Remove Filler Words)' },
  { id: 'unclear_audio', label: 'Unclear Audio' },
  { id: 'interview_qa', label: 'Interview / Q&A' },
  { id: 'customer_support', label: 'Customer Support Call' },
  { id: 'technical', label: 'Technical' },
  { id: 'legal', label: 'Legal' },
  { id: 'medical', label: 'Medical' },
  { id: 'financial', label: 'Financial' },
  { id: 'bilingual', label: 'Bilingual' },
];

/**
 * Formats actual audio duration into human-readable text,
 * e.g. "58 seconds" or "12 min 35 sec"
 */
export function formatReadableDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '0 seconds';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    if (mins === 0 && secs === 0) return `${hrs} hr`;
    if (secs === 0) return `${hrs} hr ${mins} min`;
    return `${hrs} hr ${mins} min ${secs} sec`;
  }
  if (mins === 0) {
    return `${secs} seconds`;
  }
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins} min ${secs} sec`;
}

interface AudioUploaderProps {
  onStartTranscription: (file: File, style: TranscriptionStyle) => void;
  isTranscribing: boolean;
  transcriptionProgress?: number;
  transcriptionStage?: string;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onStartTranscription,
  isTranscribing,
  transcriptionProgress = 0,
  transcriptionStage = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedNameInput, setEditedNameInput] = useState<string>('');

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [selectedStyle, setSelectedStyle] = useState<TranscriptionStyle>('standard');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);

  // Uploading file state for Image 1 waveform loading animation
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageText, setUploadStageText] = useState<string>('');

  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const validExtensions = /\.(mp3|wav|m4a|ogg|webm|flac|aac|wma)$/i;
    const isAudio = file.type.startsWith('audio/') || validExtensions.test(file.name);

    if (!isAudio) {
      setErrorMsg(`"${file.name}" is not a recognized audio format. Please upload MP3, WAV, M4A, etc.`);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg(`"${file.name}" exceeds the maximum 100MB file limit.`);
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setIsUploadingFile(true);
    setUploadProgress(35);
    setUploadStageText(`Uploading and preparing "${file.name}"...`);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setCustomFileName(file.name);
    setEditedNameInput(file.name);
    setIsEditingName(false);
    setAudioUrl(url);
    setCurrentTime(0);
    setIsPlaying(false);

    // Read audio duration from metadata
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setUploadProgress(100);
      if (tempAudio.duration && isFinite(tempAudio.duration)) {
        setAudioDuration(tempAudio.duration);
      } else {
        // Fallback estimate based on file size (~128kbps)
        setAudioDuration(Math.max(10, Math.round(file.size / 16000)));
      }
      setIsUploadingFile(false);
    };
    tempAudio.onerror = () => {
      setAudioDuration(Math.max(10, Math.round(file.size / 16000)));
      setIsUploadingFile(false);
    };
  };

  const handleClearAll = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedFile(null);
    setCustomFileName('');
    setEditedNameInput('');
    setIsEditingName(false);
    setAudioUrl(null);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveName = () => {
    const trimmed = editedNameInput.trim();
    if (trimmed) {
      setCustomFileName(trimmed);
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedNameInput(customFileName || selectedFile?.name || '');
    setIsEditingName(false);
  };

  const handleStart = () => {
    if (!selectedFile) return;
    const finalName = (customFileName || selectedFile.name).trim();
    const fileToTranscribe =
      finalName && finalName !== selectedFile.name
        ? new File([selectedFile], finalName, { type: selectedFile.type })
        : selectedFile;
    onStartTranscription(fileToTranscribe, selectedStyle);
  };

  const currentStyleLabel =
    TRANSCRIPTION_STYLES.find((s) => s.id === selectedStyle)?.label || 'Standard';

  const displayFileName = customFileName || selectedFile?.name || '';

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
        onChange={handleInputChange}
        className="hidden"
      />

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3.5 rounded-2xl border border-red-200 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!selectedFile ? (
        /* ======================================================== */
        /* 1. INITIAL CLEAN AUDIO UPLOAD DROPZONE (MedSync Frosted) */
        /* ======================================================== */
        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="clay-card-surface rounded-clay-3xl p-6 sm:p-8 relative overflow-hidden text-center cursor-pointer transition-all hover:scale-[1.002]"
        >
          {/* Dashed Inner Drop Field with Frosted Glass Fill */}
          <div
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 backdrop-blur-md transition-all flex flex-col items-center justify-center space-y-4 ${
              isDragOver
                ? 'border-teal-500 bg-white/70 scale-[1.01]'
                : 'border-sky-300/40 hover:bg-white/50'
            }`}
            style={{ background: 'rgba(240, 249, 255, 0.45)' }}
          >
            {/* Central Upload Pill Icon from Image 2 / MedSync Style */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 shadow-clay-pill border border-white/80 backdrop-blur-sm flex items-center justify-center text-teal-600 hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>

            {/* Upload Main Heading & Action Link */}
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-stone-900">
                Drag &amp; Drop single or multiple audio files here, or{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-teal-600 hover:text-teal-700 underline font-extrabold cursor-pointer"
                >
                  browse files
                </button>
              </h2>
              <p className="text-xs text-stone-500 max-w-lg mx-auto">
                Supports MP3, WAV, M4A, AAC, OGG, WebM, and FLAC (up to 100MB with automated audio splitting)
              </p>
            </div>

            {/* Bottom Badges: Upload Audio File + Preconfigured Backend Security */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/85 backdrop-blur-md shadow-clay-pill border border-white/90 text-stone-800 text-xs font-bold hover:bg-white transition-all cursor-pointer"
              >
                <FileAudio className="w-4 h-4 text-teal-600" />
                <span>Upload Audio File</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-500/10 backdrop-blur-md border border-emerald-400/25 text-emerald-800 text-xs font-semibold shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Preconfigured Backend Security</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ======================================================== */
        /* 2. FILE LOADED STATE WITH METADATA, PLAYER & CONTROLS    */
        /* ======================================================== */
        <div className="clay-card-surface rounded-clay-3xl p-6 sm:p-8 space-y-5 animate-fade-in">
          {/* Normal File Preparation Loading State (Standard Spinner & Progress Bar) */}
          {isUploadingFile && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 truncate">{uploadStageText || 'Preparing audio file...'}</p>
                <div className="w-full bg-indigo-200/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, uploadProgress)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* File Metadata Header */}
          <div className="pb-5 border-b border-slate-100 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                  <FileAudio className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  {/* Filename with Edit Option */}
                  {isEditingName ? (
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={editedNameInput}
                        onChange={(e) => setEditedNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        className="text-sm sm:text-base font-bold text-slate-900 bg-slate-50 border border-indigo-300 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        title="Save Filename"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        title="Cancel"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-base font-bold text-slate-900 truncate" title={displayFileName}>
                        {displayFileName}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedNameInput(displayFileName);
                          setIsEditingName(true);
                        }}
                        disabled={isTranscribing}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Edit Filename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  {/* Total Duration & Size */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1 font-medium">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Total Duration: <span className="text-slate-900 font-bold">{formatReadableDuration(audioDuration)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear option with dustbin icon below the file details */}
            <div className="pt-0.5 flex items-center">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isTranscribing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50 shadow-2xs group"
                title="Clear uploaded audio and reset"
              >
                <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Selectable Glassmorphism Audio Waveform Player */}
          {audioUrl && (
            <AudioWaveformPlayer
              audioUrl={audioUrl}
              duration={audioDuration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              title={displayFileName}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onPlayPause={(p) => setIsPlaying(p)}
              onSeek={(t) => setCurrentTime(t)}
            />
          )}

          {/* Transcription Style Dropdown & Start Transcription Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Style Selector Dropdown */}
            <div className="relative w-full sm:w-80">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transcription Style
              </label>

              <button
                type="button"
                onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                disabled={isTranscribing}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition-all cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-2 truncate">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{currentStyleLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              </button>

              {/* Style Dropdown Options Menu */}
              {isStyleDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-full sm:w-84 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in max-h-72 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {TRANSCRIPTION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(style.id);
                        setIsStyleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left transition-colors cursor-pointer ${
                        selectedStyle === style.id
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{style.label}</span>
                      {selectedStyle === style.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Start Transcription Action Button */}
            <div className="self-end sm:self-auto w-full sm:w-auto">
              <label className="hidden sm:block text-xs font-bold text-transparent mb-1.5 select-none">
                Action
              </label>
              <button
                onClick={handleStart}
                disabled={isTranscribing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing ({transcriptionProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Start Transcription</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Animated Waveform Loading Bar strictly matching Image 1 */}
          {isTranscribing && (
            <div className="pt-2">
              <WaveformLoadingBar
                progress={transcriptionProgress}
                stageText={
                  transcriptionStage ||
                  `Transcribing audio with OpenAI speech recognition and applying ${selectedStyle.replace(/_/g, ' ')} style...`
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
