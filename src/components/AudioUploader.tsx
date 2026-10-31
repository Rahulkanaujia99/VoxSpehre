'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileAudio, Sparkles, AlertCircle, Files, ShieldCheck } from 'lucide-react';
import { DEMO_SAMPLES } from '@/lib/sampleAudios';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onSelectSample: (sampleId: string) => void;
  isTranscribing: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelected,
  onFilesSelected,
  onSelectSample,
  isTranscribing,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      processFiles(Array.from(files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (fileList: File[]) => {
    const validExtensions = /\.(mp3|wav|m4a|ogg|webm|flac|aac|wma)$/i;
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileList.forEach((file) => {
      const isAudioType = file.type.startsWith('audio/') || validExtensions.test(file.name);
      if (!isAudioType) {
        errors.push(`"${file.name}" is not a recognized audio format.`);
      } else if (file.size > 100 * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds maximum 100MB file limit.`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setErrorMsg(errors.join(' '));
    }

    if (validFiles.length > 0) {
      if (onFilesSelected) {
        onFilesSelected(validFiles);
      } else {
        onFileSelected(validFiles[0]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Multi-File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01] shadow-lg shadow-indigo-100'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50 shadow-2xs'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3.5">
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
            <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              <Files className="w-3.5 h-3.5 text-indigo-600" />
              Batch Multi-File Upload Queue
            </span>
            <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Preconfigured Backend Security
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Sample Selector Chips (Demo Mode) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Demo Mode — Instant Pre-Loaded Audio Samples:
          </span>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            Instant Pre-Loaded Sample
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.id)}
              disabled={isTranscribing}
              className="text-left p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                <span className="text-indigo-600 group-hover:text-indigo-700 font-bold">{sample.category}</span>
                <span className="font-mono text-slate-500">{sample.durationSeconds}s</span>
              </div>
              <div className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-slate-900">
                {sample.title}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
