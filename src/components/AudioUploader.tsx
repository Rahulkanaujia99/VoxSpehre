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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedNameInput, setEditedNameInput] = useState<string>('');

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [selectedStyle, setSelectedStyle] = useState<TranscriptionStyle>('standard');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);

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
      if (tempAudio.duration && isFinite(tempAudio.duration)) {
        setAudioDuration(tempAudio.duration);
      } else {
        // Fallback estimate based on file size (~128kbps)
        setAudioDuration(Math.max(10, Math.round(file.size / 16000)));
      }
    };
    tempAudio.onerror = () => {
      setAudioDuration(Math.max(10, Math.round(file.size / 16000)));
    };
  };

  const handleClearAll = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
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

  // Audio Playback Controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.9;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
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
        /* 1. INITIAL CLEAN AUDIO UPLOAD DROPZONE                   */
        /* ======================================================== */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01] shadow-lg shadow-indigo-100'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-100">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                Drag & Drop single or multiple audio files here, or{' '}
                <span className="text-indigo-600 underline decoration-indigo-300">browse files</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                Supports MP3, WAV, M4A, AAC, OGG, WebM, and FLAC (up to 100MB with automated audio splitting)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <FileAudio className="w-3.5 h-3.5 text-indigo-600" />
                Upload Audio File
              </span>
              <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Preconfigured Backend Security
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. FILE LOADED STATE WITH METADATA, PLAYER & CONTROLS    */
        /* ======================================================== */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6 animate-fade-in">
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

          {/* Embedded Audio Player */}
          {audioUrl && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner space-y-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
              />

              {/* Pseudo Waveform Scrubber Bars */}
              <div className="relative flex items-center justify-between gap-1 h-12 px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800">
                {Array.from({ length: 48 }).map((_, idx) => {
                  const progress = audioDuration > 0 ? currentTime / audioDuration : 0;
                  const barProgress = idx / 48;
                  const isPassed = barProgress <= progress;
                  const height = 20 + 70 * Math.abs(Math.sin((idx / 6) + (idx % 3) * 0.5));

                  return (
                    <div
                      key={idx}
                      style={{ height: `${height}%` }}
                      className={`w-1 rounded-full transition-colors ${
                        isPassed ? 'bg-teal-400' : 'bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Audio Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Play / Pause Button */}
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  {/* Rewind to Start */}
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        setCurrentTime(0);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Restart Audio"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Current / Duration Time */}
                  <div className="font-mono text-xs text-teal-300 tracking-wider">
                    {formatDuration(currentTime)} / {formatDuration(audioDuration)}
                  </div>
                </div>

                {/* Seek Bar Slider */}
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 1}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 max-w-xs accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                {/* Volume Control */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={toggleMute}
                    className="text-slate-400 hover:text-white p-1 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
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

          {/* Processing Status Banner */}
          {isTranscribing && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">{transcriptionStage || 'Transcribing audio with configured AI engine...'}</p>
                <div className="w-full bg-indigo-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, transcriptionProgress)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
