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

      // Increment phase for smooth undulating motion
      phaseRef.current += 0.045;
      const phase = phaseRef.current;

      // Smoothly interpolate progress toward target
      const targetProgress = Math.max(8, Math.min(100, progress));
      if (currentProgressRef.current < targetProgress) {
        currentProgressRef.current += (targetProgress - currentProgressRef.current) * 0.08;
      } else if (currentProgressRef.current < 95) {
        // Subtle forward trickle so loading bar stays alive during network processing
        currentProgressRef.current += 0.025;
      }

      const activeProgressRatio = Math.max(0.08, Math.min(1, currentProgressRef.current / 100));
      const splitX = activeProgressRatio * width;
      const splitNormX = splitX / width;
      const splitEnv = Math.pow(Math.sin(splitNormX * Math.PI), 1.5);

      // Multi-ribbon wave layers configuration strictly matching Reference Image 3
      const waveLayers = [
        {
          // Layer 1: Hot Pink / Magenta Wave
          freq1: 15,
          freq2: 26,
          amp1: 13,
          amp2: 6.5,
          phaseOffset: 0,
          stroke: '#f43f5e',
          glow: 'rgba(244, 63, 94, 0.9)',
          lineWidth: 2.2,
          fillColor: 'rgba(236, 72, 153, 0.3)',
        },
        {
          // Layer 2: Electric Purple / Violet Wave
          freq1: 12,
          freq2: 22,
          amp1: 11,
          amp2: 5.5,
          phaseOffset: 1.3,
          stroke: '#c084fc',
          glow: 'rgba(192, 132, 252, 0.9)',
          lineWidth: 2.0,
          fillColor: 'rgba(168, 85, 247, 0.25)',
        },
        {
          // Layer 3: Electric Blue / Cyan Wave
          freq1: 18,
          freq2: 30,
          amp1: 9,
          amp2: 4.5,
          phaseOffset: 2.7,
          stroke: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.85)',
          lineWidth: 1.8,
          fillColor: 'rgba(59, 130, 246, 0.2)',
        },
      ];

      // =======================================================================
      // 1. DRAW LUMINOUS HORIZONTAL CENTRAL BEAM (Exact match to Reference Image 3)
      // =======================================================================
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, 0, width, 0);
      beamGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
      beamGrad.addColorStop(0.15, 'rgba(244, 63, 94, 0.35)');
      beamGrad.addColorStop(0.35, 'rgba(236, 72, 153, 0.7)');
      beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      beamGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.7)');
      beamGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.35)');
      beamGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0)');

      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ec4899';
      ctx.fillStyle = beamGrad;
      ctx.fillRect(width * 0.05, midY - 1.5, width * 0.9, 3);
      ctx.restore();

      // =======================================================================
      // 2. DRAW SYMMETRICAL FLUID WAVE RIBBONS WITH GLOWING EDGES
      // =======================================================================
      waveLayers.forEach((layer) => {
        const topPts: { x: number; y: number }[] = [];
        const botPts: { x: number; y: number }[] = [];

        for (let x = 0; x <= width; x += 3) {
          const normX = x / width;
          // Smooth bell envelope tapering to 0 at both edges
          const env = Math.pow(Math.sin(normX * Math.PI), 1.5);

          const waveVal =
            (Math.sin(normX * layer.freq1 + phase + layer.phaseOffset) * layer.amp1 +
              Math.sin(normX * layer.freq2 - phase * 0.75 + layer.phaseOffset) * layer.amp2) *
            env;

          topPts.push({ x, y: midY - Math.abs(waveVal) });
          botPts.push({ x, y: midY + Math.abs(waveVal) });
        }

        // Draw Completed Portion (0 to splitX) with Full Vibrant Glow
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topPts[0].x, topPts[0].y);
        for (let i = 1; i < topPts.length; i++) {
          if (topPts[i].x <= splitX) {
            ctx.lineTo(topPts[i].x, topPts[i].y);
          }
        }
        for (let i = botPts.length - 1; i >= 0; i--) {
          if (botPts[i].x <= splitX) {
            ctx.lineTo(botPts[i].x, botPts[i].y);
          }
        }
        ctx.closePath();

        // Fill fluid translucent body
        ctx.fillStyle = layer.fillColor;
        ctx.fill();

        // Stroke glowing edge for upper and lower crests
        ctx.shadowBlur = 14;
        ctx.shadowColor = layer.glow;
        ctx.lineWidth = layer.lineWidth;
        ctx.strokeStyle = layer.stroke;

        // Top edge stroke
        ctx.beginPath();
        ctx.moveTo(topPts[0].x, topPts[0].y);
        for (let i = 1; i < topPts.length && topPts[i].x <= splitX; i++) {
          ctx.lineTo(topPts[i].x, topPts[i].y);
        }
        ctx.stroke();

        // Bottom edge stroke
        ctx.beginPath();
        ctx.moveTo(botPts[0].x, botPts[0].y);
        for (let i = 1; i < botPts.length && botPts[i].x <= splitX; i++) {
          ctx.lineTo(botPts[i].x, botPts[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Draw Pending / Remaining Portion (splitX to width) with Soft Dimmed Violet
        if (splitX < width) {
          ctx.save();
          ctx.beginPath();
          let started = false;
          for (let i = 0; i < topPts.length; i++) {
            if (topPts[i].x >= splitX) {
              if (!started) {
                ctx.moveTo(topPts[i].x, topPts[i].y);
                started = true;
              } else {
                ctx.lineTo(topPts[i].x, topPts[i].y);
              }
            }
          }
          for (let i = botPts.length - 1; i >= 0; i--) {
            if (botPts[i].x >= splitX) {
              ctx.lineTo(botPts[i].x, botPts[i].y);
            }
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(192, 132, 252, 0.08)';
          ctx.fill();

          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(192, 132, 252, 0.3)';
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';

          ctx.beginPath();
          started = false;
          for (let i = 0; i < topPts.length; i++) {
            if (topPts[i].x >= splitX) {
              if (!started) {
                ctx.moveTo(topPts[i].x, topPts[i].y);
                started = true;
              } else {
                ctx.lineTo(topPts[i].x, topPts[i].y);
              }
            }
          }
          ctx.stroke();

          ctx.beginPath();
          started = false;
          for (let i = 0; i < botPts.length; i++) {
            if (botPts[i].x >= splitX) {
              if (!started) {
                ctx.moveTo(botPts[i].x, botPts[i].y);
                started = true;
              } else {
                ctx.lineTo(botPts[i].x, botPts[i].y);
              }
            }
          }
          ctx.stroke();
          ctx.restore();
        }
      });

      // =======================================================================
      // 3. GLOWING PROGRESS NEEDLE AT SPLIT POINT
      // =======================================================================
      if (splitX < width) {
        ctx.save();
        const needleHeight = Math.max(14, 24 * splitEnv);
        ctx.beginPath();
        ctx.moveTo(splitX, midY - needleHeight);
        ctx.lineTo(splitX, midY + needleHeight);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(splitX, midY - needleHeight * 0.6);
        ctx.lineTo(splitX, midY + needleHeight * 0.6);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 6;
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
      className={`relative w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-[#120f2d]/95 backdrop-blur-2xl border border-purple-500/25 shadow-[0_12px_45px_rgba(15,10,40,0.75)] space-y-4 animate-in fade-in duration-300 text-white ${className}`}
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-purple-600/18 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-56 h-56 bg-pink-600/15 rounded-full blur-3xl" />

      {/* Top Status Row: Circular Spinner Ring + Status Text */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Glowing Purple/Indigo Spinner Ring */}
        <div className="relative w-5 h-5 shrink-0">
          <div className="w-5 h-5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </div>

        {/* Status Text (e.g. Transcribing audio with OpenAI speech recognition...) */}
        <p className="text-xs sm:text-sm font-semibold text-purple-100 tracking-tight truncate flex-1" title={stageText}>
          {stageText}
        </p>

        {/* Percentage badge */}
        <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full shrink-0">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Synchronized Animated Fluid Waveform Canvas matching Reference Image 3 */}
      <div className="relative z-10 w-full flex items-center justify-center pt-1">
        <canvas
          ref={canvasRef}
          width={880}
          height={52}
          className="w-full h-11 sm:h-12 select-none"
        />
      </div>
    </div>
  );
};
