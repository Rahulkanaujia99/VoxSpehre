'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  MoreVertical,
  Maximize2,
  Minimize2,
  Mic,
  Check,
} from 'lucide-react';
import { formatDuration } from '@/lib/audioToneGenerator';
import { usePlayerSettings, PlayerDesign } from '@/context/PlayerSettingsContext';

interface AudioWaveformPlayerProps {
  audioUrl: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  onSeek: (time: number) => void;
  title?: string;
  forcedDesign?: PlayerDesign;
  className?: string;
  isCompactPreview?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  audioUrl,
  duration,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  title = 'Audio Recording',
  forcedDesign,
  className = '',
  isCompactPreview = false,
}) => {
  const { playerDesign: globalDesign } = usePlayerSettings();
  const activeDesign: PlayerDesign = forcedDesign || globalDesign || 'purple-glass';

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync audio element with playback state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync audio source and playback settings
  useEffect(() => {
    if (!audioRef.current) return;
    if (audioUrl && audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [audioUrl]);

  // Keep volume & playback rate synced
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [playbackRate, volume, isMuted]);

  // Handle Audio Time Updates
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!duration || duration <= 0)) {
      if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
        onTimeUpdate(audioRef.current.currentTime);
      }
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      onTimeUpdate(0);
    } else {
      onPlayPause(false);
      onSeek(0);
    }
  };

  // Skip backwards or forwards by seconds
  const handleSkip = (seconds: number) => {
    const target = Math.max(0, Math.min(duration || 100, currentTime + seconds));
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
    onSeek(target);
  };

  // Playback Rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  // Volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Progress Seek (Slider / Track)
  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onSeek(newTime);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (duration || 1);
    handleSeek(targetTime);
  };

  // Canvas Animated Waveform Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isSubscribed = true;

    const renderWaveform = () => {
      if (!isSubscribed) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Increment phase when playing or slow idle breathe when paused
      if (isPlaying) {
        phaseRef.current += 0.05 * playbackRate;
      } else {
        phaseRef.current += 0.005;
      }
      const phase = phaseRef.current;

      const isPurple = activeDesign === 'purple-glass';

      // Ribbons Configuration
      const ribbons = isPurple
        ? [
            {
              freq1: 0.022,
              freq2: 0.038,
              amp: isPlaying ? 16 : 8,
              phaseOffset: 0,
              stroke: '#f43f5e',
              glow: 'rgba(244, 63, 94, 0.75)',
              lineWidth: 2.5,
              fillGradient: ['rgba(236, 72, 153, 0.25)', 'rgba(168, 85, 247, 0.02)'],
            },
            {
              freq1: 0.016,
              freq2: 0.028,
              amp: isPlaying ? 14 : 7,
              phaseOffset: 1.4,
              stroke: '#c084fc',
              glow: 'rgba(192, 132, 252, 0.8)',
              lineWidth: 2.2,
              fillGradient: ['rgba(168, 85, 247, 0.2)', 'rgba(99, 102, 241, 0.02)'],
            },
            {
              freq1: 0.028,
              freq2: 0.045,
              amp: isPlaying ? 12 : 6,
              phaseOffset: 2.8,
              stroke: '#60a5fa',
              glow: 'rgba(96, 165, 250, 0.7)',
              lineWidth: 1.8,
              fillGradient: ['rgba(96, 165, 250, 0.15)', 'rgba(59, 130, 246, 0.01)'],
            },
          ]
        : [
            {
              freq1: 0.02,
              freq2: 0.035,
              amp: isPlaying ? 16 : 8,
              phaseOffset: 0,
              stroke: '#22d3ee',
              glow: 'rgba(34, 211, 238, 0.8)',
              lineWidth: 2.5,
              fillGradient: ['rgba(34, 211, 238, 0.25)', 'rgba(20, 184, 166, 0.02)'],
            },
            {
              freq1: 0.015,
              freq2: 0.026,
              amp: isPlaying ? 14 : 7,
              phaseOffset: 1.5,
              stroke: '#34d399',
              glow: 'rgba(52, 211, 153, 0.8)',
              lineWidth: 2.2,
              fillGradient: ['rgba(52, 211, 153, 0.22)', 'rgba(16, 185, 129, 0.02)'],
            },
            {
              freq1: 0.025,
              freq2: 0.042,
              amp: isPlaying ? 11 : 5.5,
              phaseOffset: 3.1,
              stroke: '#06b6d4',
              glow: 'rgba(6, 182, 212, 0.65)',
              lineWidth: 1.8,
              fillGradient: ['rgba(13, 148, 136, 0.18)', 'rgba(15, 118, 110, 0.01)'],
            },
          ];

      // Draw Each Harmonic Ribbon
      ribbons.forEach((ribbon) => {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = ribbon.lineWidth;
        ctx.strokeStyle = ribbon.stroke;
        ctx.shadowBlur = isPlaying ? 14 : 8;
        ctx.shadowColor = ribbon.glow;

        const points: { x: number; y: number }[] = [];

        for (let x = 0; x <= width; x += 3) {
          const normX = x / width;
          // Smooth bell envelope: 0 at edges, peaks in center
          const envelope = Math.pow(Math.sin(normX * Math.PI), 1.35);

          const y =
            midY +
            (Math.sin(x * ribbon.freq1 + phase + ribbon.phaseOffset) * ribbon.amp +
              Math.sin(x * ribbon.freq2 - phase * 0.75 + ribbon.phaseOffset) * (ribbon.amp * 0.55)) *
              envelope;

          points.push({ x, y });

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Fill Soft Ribbon Glow Below
        if (points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.lineTo(width, midY);
          ctx.lineTo(0, midY);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, midY - ribbon.amp, 0, midY + ribbon.amp);
          grad.addColorStop(0, ribbon.fillGradient[0]);
          grad.addColorStop(1, ribbon.fillGradient[1]);
          ctx.fillStyle = grad;
          ctx.shadowBlur = 0;
          ctx.fill();
        }

        ctx.restore();
      });

      // Synchronized Playhead Marker along the wave
      const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
      const playheadX = progress * width;

      ctx.save();
      ctx.beginPath();
      ctx.arc(playheadX, midY, isPlaying ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = isPurple ? '#f43f5e' : '#22d3ee';
      ctx.fill();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, activeDesign, duration, currentTime]);

  // Click on canvas to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (duration || 1);
    handleSeek(targetTime);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Toggle Fullscreen / Expand
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={playerContainerRef}
      className={`relative w-full transition-all duration-300 ${className}`}
    >
      {/* 
        CRITICAL: Persistent single HTML5 Audio element.
        Never conditional, never unmounted across theme switching.
      */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* ==================================================================== */}
      {/* PLAYER DESIGN 1: PREMIUM PURPLE GLASSMORPHISM                        */}
      {/* (Reference Image 2: Purple/blue glass, glowing waveform, rounded 28px) */}
      {/* ==================================================================== */}
      {activeDesign === 'purple-glass' && (
        <div
          className={`relative overflow-hidden rounded-[28px] border border-purple-500/25 bg-[#120f2d]/95 backdrop-blur-2xl shadow-[0_16px_50px_rgba(15,10,40,0.85)] p-5 sm:p-6 text-white transition-all duration-300 ${
            isCompactPreview ? 'scale-95' : ''
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl" />

          {/* Top Control Bar: [Square Icon Box] [Title & Subtitle] [Controls: Shuffle, SkipBack, Play, SkipForward, Repeat] */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Waveform Icon Squircle + File Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/35 shrink-0">
                {/* Stylized soundwave vertical bars */}
                <div className="flex items-center gap-1 h-6">
                  <div className="w-1 h-3.5 bg-white rounded-full animate-pulse" />
                  <div className="w-1 h-5 bg-white rounded-full" />
                  <div className="w-1 h-6 bg-white rounded-full" />
                  <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                  <div className="w-1 h-2.5 bg-white rounded-full" />
                </div>
              </div>

              <div className="min-w-0">
                <h4
                  className="text-sm sm:text-base font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                  title={title}
                >
                  {title}
                </h4>
                <p className="text-xs text-purple-300/70 font-medium mt-0.5">
                  Total duration: {formatDuration(duration)}
                </p>
              </div>
            </div>

            {/* Center / Right: Audio Control Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 self-center sm:self-auto">
              {/* Shuffle Button */}
              <button
                type="button"
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isShuffle
                    ? 'text-pink-400 bg-purple-500/20'
                    : 'text-purple-300/70 hover:text-white hover:bg-white/5'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Skip Back 5s (Previous) */}
              <button
                type="button"
                onClick={() => handleSkip(-5)}
                className="p-2 text-purple-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                title="Skip back 5 seconds"
              >
                <SkipBack className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Glowing Purple Circular Play/Pause Button */}
              <button
                type="button"
                onClick={() => onPlayPause(!isPlaying)}
                className="w-12 h-12 rounded-full bg-gradient-to-b from-[#9055ff] to-[#6725ea] text-white flex items-center justify-center shadow-[0_0_24px_rgba(144,85,255,0.7)] hover:shadow-[0_0_30px_rgba(144,85,255,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer mx-1 shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </button>

              {/* Skip Forward 5s (Next) */}
              <button
                type="button"
                onClick={() => handleSkip(5)}
                className="p-2 text-purple-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                title="Skip forward 5 seconds"
              >
                <SkipForward className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Repeat Button */}
              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isRepeat
                    ? 'text-pink-400 bg-purple-500/20'
                    : 'text-purple-300/70 hover:text-white hover:bg-white/5'
                }`}
                title={isRepeat ? 'Repeat active' : 'Enable repeat'}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Synchronized Animated Glowing Waveform Canvas */}
          <div className="relative z-10 my-3 sm:my-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={56}
              onClick={handleCanvasClick}
              className="w-full h-12 sm:h-14 cursor-pointer select-none rounded-xl"
              title="Click anywhere on waveform to seek"
            />
          </div>

          {/* Bottom Scrubber & Volume Row */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 text-xs font-mono">
            {/* Current Timestamp */}
            <span className="text-purple-200/80 font-medium shrink-0 min-w-[36px]">
              {formatDuration(currentTime)}
            </span>

            {/* Glowing Interactive Seekbar Track */}
            <div
              onClick={handleScrubberClick}
              className="group relative flex-1 h-2 bg-purple-950/70 hover:bg-purple-950 rounded-full cursor-pointer flex items-center"
            >
              {/* Filled Track Gradient */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Circular White Glow Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] group-hover:scale-125 transition-transform" />
              </div>
            </div>

            {/* Total Duration */}
            <span className="text-purple-300/60 font-medium shrink-0 min-w-[36px] text-right">
              {formatDuration(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-purple-300/70 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
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
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-18 h-1 accent-purple-400 cursor-pointer bg-purple-900/60 rounded-lg appearance-none"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* 3-Dots More Options Menu (Speed dropdown) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="p-1.5 text-purple-300/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Playback Speed"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 bg-[#1b173e] border border-purple-500/30 rounded-xl p-1.5 shadow-xl shadow-purple-950/80 z-30 min-w-[100px] space-y-0.5 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-purple-300/60 tracking-wider">
                    Speed
                  </div>
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleRateChange(rate)}
                      className={`w-full flex items-center justify-between px-2.5 py-1 text-xs rounded-lg cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-purple-200 hover:bg-purple-800/40'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PLAYER DESIGN 2: DARK TEAL / EMERALD GLASSMORPHISM                  */}
      {/* (Reference Image 3: Dark teal glass, mic emblem, ring play button)   */}
      {/* ==================================================================== */}
      {activeDesign === 'teal-glass' && (
        <div
          className={`relative overflow-hidden rounded-[28px] border border-teal-500/25 bg-[#061e1b]/95 backdrop-blur-2xl shadow-[0_16px_50px_rgba(2,25,22,0.85)] p-5 sm:p-6 text-white transition-all duration-300 ${
            isCompactPreview ? 'scale-95' : ''
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-teal-600/15 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl" />

          {/* Top Control Bar: [Square Mic Icon] [Title & Subtitle] [Controls: SkipBack, Emerald Ring Play, SkipForward] */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Microphone Squircle + File Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-800 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
                <Mic className="w-6 h-6 text-white" />
              </div>

              <div className="min-w-0">
                <h4
                  className="text-sm sm:text-base font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                  title={title}
                >
                  {title}
                </h4>
                <p className="text-xs text-teal-300/70 font-medium mt-0.5">
                  Total duration: {formatDuration(duration)}
                </p>
              </div>
            </div>

            {/* Center: Controls matching Reference Image 3 (SkipBack, Glowing Ring Play, SkipForward) */}
            <div className="flex items-center gap-3 self-center sm:self-auto">
              {/* Skip Back 5s */}
              <button
                type="button"
                onClick={() => handleSkip(-5)}
                className="p-2 text-teal-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                title="Skip back 5 seconds"
              >
                <SkipBack className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Glowing Emerald-Border Circular Play/Pause Button */}
              <button
                type="button"
                onClick={() => onPlayPause(!isPlaying)}
                className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:text-white hover:border-emerald-300 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.55)] hover:shadow-[0_0_28px_rgba(52,211,153,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer mx-1 shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Skip Forward 5s */}
              <button
                type="button"
                onClick={() => handleSkip(5)}
                className="p-2 text-teal-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                title="Skip forward 5 seconds"
              >
                <SkipForward className="w-4.5 h-4.5 fill-current" />
              </button>
            </div>
          </div>

          {/* Synchronized Animated Waveform Canvas (Cyan / Emerald Fluid Acoustic Waves) */}
          <div className="relative z-10 my-3 sm:my-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={56}
              onClick={handleCanvasClick}
              className="w-full h-12 sm:h-14 cursor-pointer select-none rounded-xl"
              title="Click anywhere on acoustic wave to seek"
            />
          </div>

          {/* Bottom Scrubber & Volume Row */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 text-xs font-mono">
            {/* Current Timestamp */}
            <span className="text-teal-200/80 font-medium shrink-0 min-w-[36px]">
              {formatDuration(currentTime)}
            </span>

            {/* Glowing Interactive Seekbar Track */}
            <div
              onClick={handleScrubberClick}
              className="group relative flex-1 h-2 bg-teal-950/70 hover:bg-teal-950 rounded-full cursor-pointer flex items-center"
            >
              {/* Filled Track Gradient */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Circular White Glow Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] group-hover:scale-125 transition-transform" />
              </div>
            </div>

            {/* Total Duration */}
            <span className="text-teal-300/60 font-medium shrink-0 min-w-[36px] text-right">
              {formatDuration(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-teal-300/70 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
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
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-18 h-1 accent-teal-400 cursor-pointer bg-teal-900/60 rounded-lg appearance-none"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Expand / Fullscreen icon (Reference Image 3: Maximize2 icon) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 text-teal-300/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Player'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
