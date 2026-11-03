'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  FileAudio,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { HistoryItem } from '@/types/transcription';
import { formatTime, createSyntheticAudioBlob } from '@/lib/audioToneGenerator';
import {
  decodeAudioSource,
  encodeAudioBufferToWav,
  downloadAudioBlob,
} from '@/lib/audioTrimmerUtils';

interface AudioTrimmerProps {
  savedRecordings?: HistoryItem[];
  initialRecordingId?: string | null;
  onSelectRecordingForTranscribe?: (recording: HistoryItem) => void;
}

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({
  savedRecordings = [],
  initialRecordingId,
}) => {
  // Source audio state
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>(
    initialRecordingId || (savedRecordings[0]?.id ?? '')
  );
  const [activeFileName, setActiveFileName] = useState<string>('Select or upload an audio file');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Trim range state (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Canvas waveform ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

  // Load recording when selectedRecordingId changes
  useEffect(() => {
    if (!selectedRecordingId) return;
    const rec = savedRecordings.find((r) => r.id === selectedRecordingId);
    if (!rec) return;

    const audioSource = (rec.result.metadata as any).audioUrl || createSyntheticAudioBlob(rec.duration || 45);
    loadAudio(audioSource, rec.fileName);
  }, [selectedRecordingId, savedRecordings]);

  // Load initial sample if no recordings exist
  useEffect(() => {
    if (savedRecordings.length === 0 && !audioBuffer && !isLoadingAudio) {
      if (typeof window !== 'undefined') {
        const synthetic = createSyntheticAudioBlob(45);
        loadAudio(synthetic, 'Executive_Consultation_Sample.wav');
      }
    }
  }, [savedRecordings.length]);

  const loadAudio = async (source: File | Blob | string, name: string) => {
    setIsLoadingAudio(true);
    setErrorMessage(null);
    stopPlayback();

    try {
      setActiveFileName(name);
      const decoded = await decodeAudioSource(source);
      setAudioBuffer(decoded.audioBuffer);
      setWaveformPeaks(decoded.peaks);
      setTotalDuration(decoded.duration);

      // Default trim selection: 10% to 90% or first 30 seconds
      const defaultStart = 0;
      const defaultEnd = Math.min(decoded.duration, Math.max(5, decoded.duration * 0.8));
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setCurrentTime(defaultStart);
    } catch (err: unknown) {
      console.error('Audio loading error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not decode audio. Please check file format.'
      );
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAudio(file, file.name);
    }
  };

  // Playback control using Web Audio API AudioBufferSourceNode
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playRange = useCallback(
    (offsetSec: number = startTime) => {
      if (!audioBuffer) return;
      stopPlayback();

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const playOffset = Math.max(startTime, Math.min(endTime, offsetSec));
      const durationToPlay = Math.max(0.1, endTime - playOffset);

      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = playOffset;

      source.start(0, playOffset, durationToPlay);
      sourceNodeRef.current = source;
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(startTime);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      // Animation frame to update playhead position
      const updatePosition = () => {
        if (!sourceNodeRef.current || ctx.state !== 'running') return;
        const elapsed = ctx.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackStartOffsetRef.current + elapsed;

        if (currentPos >= endTime) {
          stopPlayback();
          setCurrentTime(startTime);
        } else {
          setCurrentTime(currentPos);
          animFrameRef.current = requestAnimationFrame(updatePosition);
        }
      };

      animFrameRef.current = requestAnimationFrame(updatePosition);
    },
    [audioBuffer, startTime, endTime, stopPlayback]
  );

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      const resumeFrom = currentTime >= endTime ? startTime : currentTime;
      playRange(resumeFrom);
    }
  };

  const handleReset = () => {
    stopPlayback();
    setStartTime(0);
    setEndTime(totalDuration);
    setCurrentTime(0);
  };

  // Perform Trim & Download
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleTrimAndDownload = () => {
    if (!audioBuffer) return;
    if (endTime <= startTime) {
      setErrorMessage('End time must be greater than start time.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const trimmedBlob = encodeAudioBufferToWav(audioBuffer, startTime, endTime);
      const cleanBaseName = activeFileName.replace(/\.[^/.]+$/, '');
      const exportName = `${cleanBaseName}_trimmed_${formatTime(startTime).replace(':', 'm')}s-${formatTime(endTime).replace(':', 'm')}s.wav`;

      downloadAudioBlob(trimmedBlob, exportName);

      setSuccessToast(`Trimmed audio "${exportName}" downloaded successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: unknown) {
      console.error('Trim export error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to export trimmed audio.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Waveform Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformPeaks.length === 0 || totalDuration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const midY = height / 2;
    const barCount = waveformPeaks.length;
    const barWidth = width / barCount;

    const startX = (startTime / totalDuration) * width;
    const endX = (endTime / totalDuration) * width;
    const playheadX = (currentTime / totalDuration) * width;

    // 1. Draw Inactive / Outer Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Waveform Bars
    waveformPeaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barH = peak * (height * 0.75);
      const isSelected = x >= startX && x <= endX;

      // Color styling
      if (isSelected) {
        const grad = ctx.createLinearGradient(0, midY - barH / 2, 0, midY + barH / 2);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(0.5, '#6366f1');
        grad.addColorStop(1, '#4f46e5');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#cbd5e1';
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, midY - barH / 2, Math.max(1.5, barWidth - 1.5), Math.max(3, barH), 2);
      ctx.fill();
    });

    // 3. Highlight Selected Region Overlay
    ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
    ctx.fillRect(startX, 0, Math.max(0, endX - startX), height);

    // 4. Shaded Dimmed Region Outside Selection
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    // 5. Draw Left Handle (Start Time)
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(startX - 2, 0, 4, height);
    ctx.beginPath();
    ctx.arc(startX, 10, 8, 0, Math.PI * 2);
    ctx.arc(startX, height - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Draw Right Handle (End Time)
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(endX - 2, 0, 4, height);
    ctx.beginPath();
    ctx.arc(endX, 10, 8, 0, Math.PI * 2);
    ctx.arc(endX, height - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 7. Draw Live Playhead
    if (currentTime >= 0 && currentTime <= totalDuration) {
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(playheadX - 1.5, 0, 3, height);
      ctx.beginPath();
      ctx.arc(playheadX, midY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [waveformPeaks, totalDuration, startTime, endTime, currentTime]);

  // Dragging interaction for handles
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const clickTime = ratio * totalDuration;

    const startX = (startTime / totalDuration) * rect.width;
    const endX = (endTime / totalDuration) * rect.width;

    // Detect which handle is closer
    const distToStart = Math.abs(x - startX);
    const distToEnd = Math.abs(x - endX);

    if (distToStart < 20) {
      setIsDragging('start');
    } else if (distToEnd < 20) {
      setIsDragging('end');
    } else if (clickTime >= startTime && clickTime <= endTime) {
      setIsDragging('playhead');
      setCurrentTime(clickTime);
      if (isPlaying) {
        playRange(clickTime);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetSec = ratio * totalDuration;

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(endTime - 0.5, targetSec));
      setStartTime(Number(newStart.toFixed(2)));
      setCurrentTime(newStart);
    } else if (isDragging === 'end') {
      const newEnd = Math.min(totalDuration, Math.max(startTime + 0.5, targetSec));
      setEndTime(Number(newEnd.toFixed(2)));
    } else if (isDragging === 'playhead') {
      const newPos = Math.max(startTime, Math.min(endTime, targetSec));
      setCurrentTime(newPos);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(null);
  };

  const selectedClipDuration = Math.max(0, endTime - startTime);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Audio Trimmer & Clipper
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Lossless
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Precisely select, preview, cut and export audio segments. Original recordings are never modified.
          </p>
        </div>

        {/* Source Chooser & Upload Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pick Saved Recording */}
          {savedRecordings.length > 0 && (
            <div className="relative">
              <select
                value={selectedRecordingId}
                onChange={(e) => setSelectedRecordingId(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-slate-700 hover:border-indigo-300 focus:outline-indigo-500 shadow-2xs cursor-pointer max-w-[200px] truncate"
              >
                {savedRecordings.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.fileName} ({formatTime(rec.duration)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          {/* Upload New File */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Upload New Audio</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Trimmer Workbench Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        {/* Active Audio File Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileAudio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {activeFileName}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Total duration: {formatTime(totalDuration)} • Sample Rate:{' '}
                {audioBuffer?.sampleRate || 44100} Hz
              </p>
            </div>
          </div>

          {/* Selected Duration Pill */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Clip:
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-mono font-extrabold text-xs shadow-xs">
              {formatTime(selectedClipDuration)} ({selectedClipDuration.toFixed(2)}s)
            </span>
          </div>
        </div>

        {/* Loading State or Waveform Canvas */}
        {isLoadingAudio ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-slate-600">
              Decoding audio and building visual waveform timeline...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Timeline Ruler */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 px-1">
              <span>0:00</span>
              <span>{formatTime(totalDuration * 0.25)}</span>
              <span>{formatTime(totalDuration * 0.5)}</span>
              <span>{formatTime(totalDuration * 0.75)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>

            {/* Interactive Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner select-none cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={1000}
                height={130}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-full h-32 sm:h-36 block touch-none"
              />
            </div>

            {/* Instruction tooltip */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>💡 Drag the purple handles left and right to adjust selection</span>
              <span>Click anywhere inside selection to reposition playhead</span>
            </div>
          </div>
        )}

        {/* Precise Timestamp Number Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Selection Start Timestamp (seconds)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max={endTime - 0.1}
                value={startTime}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(endTime - 0.2, parseFloat(e.target.value) || 0));
                  setStartTime(Number(val.toFixed(2)));
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
              />
              <span className="text-xs font-mono font-bold text-indigo-700 shrink-0">
                [{formatTime(startTime)}]
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Selection End Timestamp (seconds)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min={startTime + 0.1}
                max={totalDuration}
                value={endTime}
                onChange={(e) => {
                  const val = Math.min(
                    totalDuration,
                    Math.max(startTime + 0.2, parseFloat(e.target.value) || totalDuration)
                  );
                  setEndTime(Number(val.toFixed(2)));
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs"
              />
              <span className="text-xs font-mono font-bold text-indigo-700 shrink-0">
                [{formatTime(endTime)}]
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              disabled={!audioBuffer || isLoadingAudio}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Selection</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                  <span>Play Selection</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={!audioBuffer || isLoadingAudio}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Reset selection to full duration"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Trim & Download Button */}
          <button
            onClick={handleTrimAndDownload}
            disabled={!audioBuffer || isLoadingAudio || isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting WAV...</span>
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                <span>Trim & Download Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
