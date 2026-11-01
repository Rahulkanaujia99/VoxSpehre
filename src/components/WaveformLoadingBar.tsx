'use client';

import React, { useEffect, useRef } from 'react';

interface WaveformLoadingBarProps {
  progress?: number;
  stageText?: string;
  className?: string;
}

export const WaveformLoadingBar: React.FC<WaveformLoadingBarProps> = ({
  progress = 45,
  stageText = 'Transcribing audio with OpenAI speech recognition and applying standard style...',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(Math.max(8, progress));

  // Keep target progress smoothly interpolated
  useEffect(() => {
    currentProgressRef.current = Math.max(currentProgressRef.current, Math.max(8, progress));
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Increment phase for smooth fluid undulating motion
      phaseRef.current += 0.045;
      const phase = phaseRef.current;

      // Smoothly interpolate progress toward target
      const targetProgress = Math.max(8, Math.min(100, progress));
      if (currentProgressRef.current < targetProgress) {
        currentProgressRef.current += (targetProgress - currentProgressRef.current) * 0.08;
      } else if (currentProgressRef.current < 94) {
        // Subtle forward trickle so loading bar stays alive
        currentProgressRef.current += 0.02;
      }

      const activeProgressRatio = Math.max(0.08, Math.min(1, currentProgressRef.current / 100));
      const splitX = activeProgressRatio * width;

      // Calculate acoustic wave geometry for each x
      const topPoints: { x: number; y: number }[] = [];
      const bottomPoints: { x: number; y: number }[] = [];

      const step = 2;
      for (let x = 0; x <= width; x += step) {
        const normX = x / width;
        // Bell-curve envelope: 0 at edges, smooth body
        const env = Math.pow(Math.sin(normX * Math.PI), 1.15) * (1 - 0.12 * normX);

        // Multi-frequency harmonic acoustic waveform
        const w1 = Math.sin(normX * 20 + phase);
        const w2 = Math.sin(normX * 11 - phase * 0.75 + 0.6);
        const w3 = Math.cos(normX * 32 + phase * 1.1);

        const baseThickness = 2.5;
        const amp = baseThickness + (w1 * 7.5 + w2 * 5.5 + w3 * 2.5 + 9.5) * env;

        topPoints.push({ x, y: midY - amp });
        bottomPoints.push({ x, y: midY + amp });
      }

      // Find indices for split point
      let splitIdx = 0;
      for (let i = 0; i < topPoints.length; i++) {
        if (topPoints[i].x >= splitX) {
          splitIdx = i;
          break;
        }
      }
      if (splitIdx === 0) splitIdx = topPoints.length - 1;

      // =======================================================================
      // 1. DRAW COMPLETED PORTION (LEFT: Pink -> Fuchsia -> Purple -> Blue)
      // =======================================================================
      if (splitIdx > 0) {
        ctx.save();

        // Path for completed wave
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 1; i <= splitIdx; i++) {
          ctx.lineTo(topPoints[i].x, topPoints[i].y);
        }
        for (let i = splitIdx; i >= 0; i--) {
          ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
        ctx.closePath();

        // Multi-stop horizontal gradient matching Reference Image 1
        const leftGrad = ctx.createLinearGradient(0, 0, splitX, 0);
        leftGrad.addColorStop(0, '#f43f5e'); // Vibrant Rose/Pink
        leftGrad.addColorStop(0.28, '#d946ef'); // Fuchsia
        leftGrad.addColorStop(0.62, '#8b5cf6'); // Royal Purple
        leftGrad.addColorStop(1.0, '#3b82f6'); // Electric Blue

        // Ambient glow around the completed wave
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(217, 70, 239, 0.45)';
        ctx.fillStyle = leftGrad;
        ctx.fill();

        ctx.restore();
      }

      // =======================================================================
      // 2. DRAW UNCOMPLETED / PENDING PORTION (RIGHT: Soft Pale Lavender)
      // =======================================================================
      if (splitIdx < topPoints.length - 1) {
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(topPoints[splitIdx].x, topPoints[splitIdx].y);
        for (let i = splitIdx + 1; i < topPoints.length; i++) {
          ctx.lineTo(topPoints[i].x, topPoints[i].y);
        }
        for (let i = bottomPoints.length - 1; i >= splitIdx; i--) {
          ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
        ctx.closePath();

        const rightGrad = ctx.createLinearGradient(splitX, 0, width, 0);
        rightGrad.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
        rightGrad.addColorStop(0.45, 'rgba(216, 180, 254, 0.22)');
        rightGrad.addColorStop(1.0, 'rgba(238, 242, 255, 0.04)');

        ctx.fillStyle = rightGrad;
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
      }

      // =======================================================================
      // 3. DRAW GLOWING CYAN VERTICAL NEEDLE (Progress separator line)
      // =======================================================================
      if (splitIdx < topPoints.length) {
        const topY = topPoints[splitIdx].y;
        const bottomY = bottomPoints[splitIdx].y;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(splitX, topY - 1);
        ctx.lineTo(splitX, bottomY + 1);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.stroke();

        // Extra subtle core white glint
        ctx.beginPath();
        ctx.moveTo(splitX, topY + 2);
        ctx.lineTo(splitX, bottomY - 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [progress]);

  return (
    <div
      className={`relative w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-purple-50/80 via-indigo-50/60 to-blue-50/40 border border-purple-100/90 shadow-sm backdrop-blur-sm space-y-4 animate-in fade-in duration-300 ${className}`}
    >
      {/* Top Status Row: Circular Spinner Ring + Status Text */}
      <div className="flex items-center gap-3">
        {/* Glowing Purple/Indigo Spinner Ring matching Image 1 */}
        <div className="relative w-5 h-5 shrink-0">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>

        {/* Status Text (e.g. Transcribing audio with OpenAI speech recognition...) */}
        <p className="text-xs sm:text-sm font-semibold text-[#1e1b4b] tracking-tight truncate flex-1" title={stageText}>
          {stageText}
        </p>

        {/* Percentage badge */}
        <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full shrink-0">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Synchronized Animated Waveform Loading Bar Canvas */}
      <div className="w-full flex items-center justify-center pt-1">
        <canvas
          ref={canvasRef}
          width={880}
          height={48}
          className="w-full h-10 sm:h-12 select-none"
        />
      </div>
    </div>
  );
};

