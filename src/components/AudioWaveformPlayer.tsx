'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, FastForward } from 'lucide-react';
import { formatDuration } from '@/lib/audioToneGenerator';

interface AudioWaveformPlayerProps {
  audioUrl: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  onSeek: (time: number) => void;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  audioUrl,
  duration,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onSeek,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  // Generate pseudo-waveform bars based on duration seed
  useEffect(() => {
    const barsCount = 64;
    const bars: number[] = [];
    for (let i = 0; i < barsCount; i++) {
      // undulating acoustic profile
      const val = 0.25 + 0.65 * Math.abs(Math.sin((i / 8) + (i % 3) * 0.4));
      bars.push(val);
    }
    setWaveformBars(bars);
  }, [audioUrl, duration]);

  // Sync audio element with playback state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Autoplay may be restricted
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync audio source
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    audioRef.current.src = audioUrl;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [audioUrl]);

  // Time update handler
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    onPlayPause(false);
    onSeek(0);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onSeek(newTime);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    onSeek(targetTime);
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Top Waveform Visualizer */}
      <div
        onClick={handleWaveformClick}
        className="relative h-16 w-full cursor-pointer bg-slate-950/60 rounded-xl px-3 py-2 flex items-center justify-between gap-1 overflow-hidden group select-none border border-slate-800/80"
        title="Click to seek anywhere in the audio"
      >
        {/* Playhead Progress Overlay */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-teal-500/10 pointer-events-none transition-all duration-75 border-r-2 border-teal-400"
          style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
        />

        {waveformBars.map((heightPercent, idx) => {
          const barRatio = idx / waveformBars.length;
          const isPassed = barRatio <= progressRatio;
          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div
                style={{ height: `${Math.max(15, heightPercent * 100)}%` }}
                className={`w-full max-w-[3px] rounded-full transition-colors duration-150 ${
                  isPassed
                    ? 'bg-teal-400'
                    : 'bg-slate-700 group-hover:bg-slate-600'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Player Controls Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Playback buttons & Time */}
        <div className="flex items-center gap-3">
          {/* Skip Back 5s */}
          <button
            onClick={() => handleSkip(-5)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Rewind 5s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            onClick={() => onPlayPause(!isPlaying)}
            className="w-12 h-12 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            title={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Forward 5s */}
          <button
            onClick={() => handleSkip(5)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fast forward 5s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time Display */}
          <div className="font-mono text-xs sm:text-sm text-slate-300 ml-2">
            <span className="text-teal-400 font-bold">{formatDuration(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: Playback Speed & Volume */}
        <div className="flex items-center gap-3">
          {/* Playback Speed Pill */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <button
              onClick={toggleMute}
              className="p-1 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
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
              className="w-16 h-1.5 accent-teal-400 cursor-pointer bg-slate-700 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
