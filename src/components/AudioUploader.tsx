'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileAudio, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEMO_SAMPLES } from '@/lib/sampleAudios';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  onSelectSample: (sampleId: string) => void;
  isTranscribing: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelected,
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
      validateAndProcessFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const validExtensions = /\.(mp3|wav|m4a|ogg|webm|flac|aac|wma)$/i;
    const isAudioType = file.type.startsWith('audio/') || validExtensions.test(file.name);

    if (!isAudioType) {
      setErrorMsg('Please upload a valid audio file (MP3, WAV, M4A, OGG, WebM, FLAC, AAC).');
      return;
    }

    // Limit to 50MB for smooth web processing
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File size exceeds 50MB. Please upload a smaller clip.');
      return;
    }

    onFileSelected(file);
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
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
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-800">
              Drag & Drop your audio file here, or{' '}
              <span className="text-indigo-600 underline decoration-indigo-300">browse files</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Supports MP3, WAV, M4A, AAC, OGG, WebM, FLAC up to 50MB
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] font-medium text-slate-400">
            <span>Enterprise 256-bit encryption</span>
            <span>•</span>
            <span>Zero audio data training</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Sample Selector Chips */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Or Try Pre-Loaded Penguin Audio Samples:
          </span>
          <span className="text-[11px] text-slate-400">Instant 1-Click Test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.id)}
              disabled={isTranscribing}
              className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                <span className="text-indigo-600 group-hover:text-indigo-700">{sample.category}</span>
                <span>{sample.durationSeconds}s</span>
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
