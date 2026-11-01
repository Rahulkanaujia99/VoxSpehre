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
        phaseRef.current += 0.006;
      }
      const phase = phaseRef.current;

      const isPurple = activeDesign === 'purple-glass';

      // Waveform configurations matching the exact screenshots
      const ribbons = isPurple
        ? [
            {
              freq1: 0.024,
              freq2: 0.042,
              amp: isPlaying ? 10 : 5.5,
              phaseOffset: 0,
              stroke: '#f43f5e',
              glow: 'rgba(244, 63, 94, 0.85)',
              lineWidth: 2.2,
              fillGradient: ['rgba(236, 72, 153, 0.28)', 'rgba(168, 85, 247, 0.02)'],
            },
            {
              freq1: 0.018,
              freq2: 0.032,
              amp: isPlaying ? 9 : 4.5,
              phaseOffset: 1.4,
              stroke: '#c084fc',
              glow: 'rgba(192, 132, 252, 0.85)',
              lineWidth: 2.0,
              fillGradient: ['rgba(168, 85, 247, 0.22)', 'rgba(99, 102, 241, 0.02)'],
            },
            {
              freq1: 0.028,
              freq2: 0.05,
              amp: isPlaying ? 7.5 : 3.5,
              phaseOffset: 2.8,
              stroke: '#60a5fa',
              glow: 'rgba(96, 165, 250, 0.75)',
              lineWidth: 1.6,
              fillGradient: ['rgba(96, 165, 250, 0.16)', 'rgba(59, 130, 246, 0.01)'],
            },
          ]
        : [
            {
              freq1: 0.022,
              freq2: 0.038,
              amp: isPlaying ? 10 : 5.5,
              phaseOffset: 0,
              stroke: '#22d3ee',
              glow: 'rgba(34, 211, 238, 0.85)',
              lineWidth: 2.2,
              fillGradient: ['rgba(34, 211, 238, 0.28)', 'rgba(20, 184, 166, 0.02)'],
            },
            {
              freq1: 0.016,
              freq2: 0.03,
              amp: isPlaying ? 9 : 4.5,
              phaseOffset: 1.5,
              stroke: '#34d399',
              glow: 'rgba(52, 211, 153, 0.85)',
              lineWidth: 2.0,
              fillGradient: ['rgba(52, 211, 153, 0.24)', 'rgba(16, 185, 129, 0.02)'],
            },
            {
              freq1: 0.026,
              freq2: 0.046,
              amp: isPlaying ? 7.5 : 3.5,
              phaseOffset: 3.1,
              stroke: '#06b6d4',
              glow: 'rgba(6, 182, 212, 0.7)',
              lineWidth: 1.6,
              fillGradient: ['rgba(13, 148, 136, 0.18)', 'rgba(15, 118, 110, 0.01)'],
            },
          ];

      // Draw horizontal core ambient light streak (visible in center of wave in screenshot)
      ctx.save();
      const coreGrad = ctx.createLinearGradient(0, 0, width, 0);
      if (isPurple) {
        coreGrad.addColorStop(0, 'rgba(236, 72, 153, 0)');
        coreGrad.addColorStop(0.35, 'rgba(236, 72, 153, 0.25)');
        coreGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.45)');
        coreGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.25)');
        coreGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else {
        coreGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        coreGrad.addColorStop(0.35, 'rgba(34, 211, 238, 0.25)');
        coreGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.45)');
        coreGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.25)');
        coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      }
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, midY - 2.5, width, 5);
      ctx.restore();

      // Draw Each Harmonic Ribbon
      ribbons.forEach((ribbon) => {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = ribbon.lineWidth;
        ctx.strokeStyle = ribbon.stroke;
        ctx.shadowBlur = isPlaying ? 10 : 6;
        ctx.shadowColor = ribbon.glow;

        const points: { x: number; y: number }[] = [];

        for (let x = 0; x <= width; x += 3) {
          const normX = x / width;
          // Smooth bell envelope: 0 at edges, peaks gracefully in center
          const envelope = Math.pow(Math.sin(normX * Math.PI), 1.6);

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
      {/* (Target height ~120-130px on desktop, matching Reference Image 2)    */}
      {/* ==================================================================== */}
      {activeDesign === 'purple-glass' && (
        <div
          className={`relative overflow-hidden rounded-[28px] border border-purple-500/20 bg-gradient-to-r from-[#110e28]/95 via-[#141130]/90 to-[#0e0c24]/95 backdrop-blur-2xl shadow-[0_12px_45px_rgba(20,15,45,0.7)] px-6 sm:px-7 py-3 sm:py-3.5 h-[124px] sm:h-[128px] flex flex-col justify-between text-white transition-all duration-300 select-none ${
            isCompactPreview ? 'scale-95' : ''
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-60 h-60 bg-purple-600/18 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-60 h-60 bg-pink-600/15 rounded-full blur-3xl" />

          {/* Row 1: Left Info & Centered Audio Controls */}
          <div className="relative z-10 flex items-center justify-between w-full h-11">
            {/* Left: Waveform Icon Squircle + File Info */}
            <div className="flex items-center gap-3 min-w-0 z-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#d946ef] flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0">
                {/* Stylized soundwave vertical bars */}
                <div className="flex items-center gap-0.5 h-5">
                  <div className="w-1 h-2.5 bg-white rounded-full animate-pulse" />
                  <div className="w-1 h-4.5 bg-white rounded-full" />
                  <div className="w-1 h-5 bg-white rounded-full" />
                  <div className="w-1 h-3.5 bg-white rounded-full animate-pulse" />
                  <div className="w-1 h-2 bg-white rounded-full" />
                </div>
              </div>

              <div className="min-w-0">
                <h4
                  className="text-sm font-bold text-white tracking-wide truncate max-w-[130px] sm:max-w-xs md:max-w-sm"
                  title={title}
                >
                  {title}
                </h4>
                <p className="text-[11px] text-purple-300/70 font-medium leading-tight mt-0.5">
                  Total duration: {formatDuration(duration)}
                </p>
              </div>
            </div>

            {/* Center Controls: Horizontally centered in player */}
            <div className="flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center gap-2 sm:gap-3 z-10 shrink-0">
              {/* Shuffle Button */}
              <button
                type="button"
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isShuffle
                    ? 'text-pink-400 bg-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Skip Back 5s (Previous) */}
              <button
                type="button"
                onClick={() => handleSkip(-5)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Skip back 5 seconds"
              >
                <SkipBack className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Glowing Purple Circular Play/Pause Button */}
              <button
                type="button"
                onClick={() => onPlayPause(!isPlaying)}
                className="w-11 h-11 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#6D28D9] text-white flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.65)] hover:shadow-[0_0_26px_rgba(139,92,246,0.85)] hover:scale-105 active:scale-95 transition-all cursor-pointer mx-1 shrink-0"
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
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Skip forward 5 seconds"
              >
                <SkipForward className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Repeat Button */}
              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isRepeat
                    ? 'text-pink-400 bg-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={isRepeat ? 'Repeat active' : 'Enable repeat'}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Right Spacer for balanced flex on desktop */}
            <div className="w-12 sm:w-20 hidden md:block" />
          </div>

          {/* Row 2: Centered Animated Glowing Waveform Canvas */}
          <div className="relative w-full h-7 flex items-center justify-center -my-0.5 z-0">
            <canvas
              ref={canvasRef}
              width={720}
              height={32}
              onClick={handleCanvasClick}
              className="w-full max-w-xl h-7 cursor-pointer select-none"
              title="Click anywhere on waveform to seek"
            />
          </div>

          {/* Row 3: Bottom Scrubber & Volume Row */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 text-xs font-mono h-5">
            {/* Current Timestamp */}
            <span className="text-slate-400 font-medium shrink-0 min-w-[32px] text-[11px]">
              {formatDuration(currentTime)}
            </span>

            {/* Glowing Interactive Seekbar Track */}
            <div
              onClick={handleScrubberClick}
              className="group relative flex-1 h-1.5 bg-purple-950/60 hover:bg-purple-950/80 rounded-full cursor-pointer flex items-center"
            >
              {/* Filled Track Gradient */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Circular White Glow Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] group-hover:scale-125 transition-transform" />
              </div>
            </div>

            {/* Total Duration */}
            <span className="text-slate-400 font-medium shrink-0 min-w-[32px] text-right text-[11px]">
              {formatDuration(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-14 sm:w-16 h-1 accent-purple-400 cursor-pointer bg-purple-950/70 rounded-lg appearance-none"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* 3-Dots More Options Menu (Speed dropdown) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
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
      {/* (Target height ~120-130px on desktop, matching Reference Image 1)    */}
      {/* ==================================================================== */}
      {activeDesign === 'teal-glass' && (
        <div
          className={`relative overflow-hidden rounded-[28px] border border-teal-500/20 bg-gradient-to-r from-[#072421]/95 via-[#092c28]/90 to-[#061d19]/95 backdrop-blur-2xl shadow-[0_12px_45px_rgba(10,45,40,0.7)] px-6 sm:px-7 py-3 sm:py-3.5 h-[124px] sm:h-[128px] flex flex-col justify-between text-white transition-all duration-300 select-none ${
            isCompactPreview ? 'scale-95' : ''
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-60 h-60 bg-teal-600/18 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-60 h-60 bg-emerald-600/15 rounded-full blur-3xl" />

          {/* Row 1: Left Info & Centered Audio Controls */}
          <div className="relative z-10 flex items-center justify-between w-full h-11">
            {/* Left: Microphone Squircle + File Info */}
            <div className="flex items-center gap-3 min-w-0 z-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#10b981] via-[#0d9488] to-[#042f2e] flex items-center justify-center shadow-md shadow-teal-500/25 shrink-0">
                <Mic className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0">
                <h4
                  className="text-sm font-bold text-white tracking-wide truncate max-w-[130px] sm:max-w-xs md:max-w-sm"
                  title={title}
                >
                  {title}
                </h4>
                <p className="text-[11px] text-teal-300/70 font-medium leading-tight mt-0.5">
                  Total duration: {formatDuration(duration)}
                </p>
              </div>
            </div>

            {/* Center Controls: Horizontally centered in player (SkipBack, Emerald Ring Play, SkipForward) */}
            <div className="flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center gap-2 sm:gap-3 z-10 shrink-0">
              {/* Skip Back 5s */}
              <button
                type="button"
                onClick={() => handleSkip(-5)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Skip back 5 seconds"
              >
                <SkipBack className="w-4.5 h-4.5 fill-current" />
              </button>

              {/* Glowing Emerald-Border Circular Play/Pause Button */}
              <button
                type="button"
                onClick={() => onPlayPause(!isPlaying)}
                className="w-11 h-11 rounded-full border-2 border-[#10b981] bg-[#072421]/60 text-[#10b981] hover:text-white hover:border-emerald-300 flex items-center justify-center shadow-[0_0_18px_rgba(16,185,129,0.55)] hover:shadow-[0_0_24px_rgba(16,185,129,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer mx-1 shrink-0"
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
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Skip forward 5 seconds"
              >
                <SkipForward className="w-4.5 h-4.5 fill-current" />
              </button>
            </div>

            {/* Right Spacer for balanced flex on desktop */}
            <div className="w-12 sm:w-20 hidden md:block" />
          </div>

          {/* Row 2: Centered Animated Waveform Canvas (Cyan / Emerald Acoustic Waves) */}
          <div className="relative w-full h-7 flex items-center justify-center -my-0.5 z-0">
            <canvas
              ref={canvasRef}
              width={720}
              height={32}
              onClick={handleCanvasClick}
              className="w-full max-w-xl h-7 cursor-pointer select-none"
              title="Click anywhere on acoustic wave to seek"
            />
          </div>

          {/* Row 3: Bottom Scrubber & Volume Row */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 text-xs font-mono h-5">
            {/* Current Timestamp */}
            <span className="text-slate-400 font-medium shrink-0 min-w-[32px] text-[11px]">
              {formatDuration(currentTime)}
            </span>

            {/* Glowing Interactive Seekbar Track */}
            <div
              onClick={handleScrubberClick}
              className="group relative flex-1 h-1.5 bg-teal-950/60 hover:bg-teal-950/80 rounded-full cursor-pointer flex items-center"
            >
              {/* Filled Track Gradient */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Circular White Glow Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] group-hover:scale-125 transition-transform" />
              </div>
            </div>

            {/* Total Duration */}
            <span className="text-slate-400 font-medium shrink-0 min-w-[32px] text-right text-[11px]">
              {formatDuration(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-14 sm:w-16 h-1 accent-teal-400 cursor-pointer bg-teal-950/70 rounded-lg appearance-none"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Expand / Fullscreen icon (Reference Image: Maximize2 icon) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
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
