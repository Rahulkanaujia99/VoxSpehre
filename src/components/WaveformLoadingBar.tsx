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

      // Active wave bounds - extended wide across canvas for long flowing animation
      const xMin = width * 0.02;
      const xMax = width * 0.98;
      const waveW = xMax - xMin;

      const activeProgressRatio = Math.max(0.08, Math.min(1, currentProgressRef.current / 100));
      const splitX = xMin + activeProgressRatio * waveW;
      const splitNormX = (splitX - xMin) / waveW;
      const splitEnv = Math.pow(Math.sin(splitNormX * Math.PI), 1.5);

      // Multi-ribbon wave layers configuration strictly matching Reference Image 2 & 3
      const waveLayers = [
        {
          // Layer 1: Hot Pink / Magenta Wave
          f1: 4.8,
          f2: 9.2,
          ampTop: 15,
          ampBot: 12,
          phaseOffset: 0,
          stroke: '#ff2a8d',
          glow: 'rgba(255, 42, 141, 0.9)',
          lineWidth: 2.2,
          fillColor: 'rgba(255, 42, 141, 0.3)',
        },
        {
          // Layer 2: Electric Purple / Violet Wave
          f1: 4.2,
          f2: 8.0,
          ampTop: 13.5,
          ampBot: 11,
          phaseOffset: 1.6,
          stroke: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.9)',
          lineWidth: 2.0,
          fillColor: 'rgba(168, 85, 247, 0.25)',
        },
        {
          // Layer 3: Electric Blue / Cyan Wave
          f1: 5.4,
          f2: 10.5,
          ampTop: 11,
          ampBot: 9.5,
          phaseOffset: 3.2,
          stroke: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.85)',
          lineWidth: 1.8,
          fillColor: 'rgba(56, 189, 248, 0.2)',
        },
      ];

      // =======================================================================
      // 1. DRAW LUMINOUS HORIZONTAL CENTRAL BEAM (Exact match to Reference Image 2 & 3)
      // Extended wide across canvas, fading softly to 0 at both ends
      // =======================================================================
      const beamStart = xMin + waveW * 0.02;
      const beamEnd = xMax - waveW * 0.02;

      ctx.save();
      const beamGrad = ctx.createLinearGradient(beamStart, 0, beamEnd, 0);
      beamGrad.addColorStop(0, 'rgba(255, 42, 141, 0)');
      beamGrad.addColorStop(0.15, 'rgba(255, 42, 141, 0.4)');
      beamGrad.addColorStop(0.35, 'rgba(236, 72, 153, 0.85)');
      beamGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.95)');
      beamGrad.addColorStop(0.52, 'rgba(255, 255, 255, 1.0)');
      beamGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.85)');
      beamGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.4)');
      beamGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0)');

      ctx.beginPath();
      ctx.moveTo(beamStart, midY);
      ctx.lineTo(beamEnd, midY);
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff2a8d';
      ctx.stroke();
      ctx.restore();

      // Specular hotspot lens flares in the center (visible in Reference Image 2 & 3)
      const flareX1 = beamStart + (beamEnd - beamStart) * 0.49;
      const flareX2 = beamStart + (beamEnd - beamStart) * 0.53;
      ctx.save();
      ctx.beginPath();
      ctx.arc(flareX1, midY, 2.2, 0, Math.PI * 2);
      ctx.arc(flareX2, midY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
      ctx.restore();

      // =======================================================================
      // 2. DRAW SYMMETRICAL FLUID WAVE MOUNDS WITH BLURRY FADE-OUT ENDS
      // =======================================================================
      waveLayers.forEach((layer) => {
        const topPts: { x: number; y: number }[] = [];
        const botPts: { x: number; y: number }[] = [];
        const step = 2.5;

        for (let x = xMin; x <= xMax; x += step) {
          const u = (x - xMin) / waveW; // 0.0 to 1.0
          // Smooth bell envelope strictly fading to 0 at ends
          const env = Math.pow(Math.sin(u * Math.PI), 1.8);

          const s1 = Math.sin(u * layer.f1 * Math.PI * 2 + phase + layer.phaseOffset);
          const s2 = Math.sin(u * layer.f2 * Math.PI * 2 - phase * 0.75 + layer.phaseOffset * 1.4);
          const combo = s1 * 0.65 + s2 * 0.35;

          // Organic rounded mounds above and below center line
          const topH = (Math.pow(Math.max(0, combo), 1.25) * layer.ampTop + Math.abs(combo) * 0.15 * layer.ampTop) * env;
          const botH = (Math.pow(Math.max(0, -combo), 1.25) * layer.ampBot + Math.abs(combo) * 0.15 * layer.ampBot) * env;

          topPts.push({ x, y: midY - topH });
          botPts.push({ x, y: midY + botH });
        }

        if (topPts.length < 2) return;

        // Draw Completed Active Portion (xMin to splitX) with Full Vibrant Glow
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xMin, midY);
        for (let i = 0; i < topPts.length; i++) {
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

        const activeFillGrad = ctx.createLinearGradient(xMin, 0, xMax, 0);
        activeFillGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        activeFillGrad.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
        activeFillGrad.addColorStop(0.25, layer.fillColor);
        activeFillGrad.addColorStop(1.0, layer.fillColor);

        ctx.fillStyle = activeFillGrad;
        ctx.fill();

        // Stroke glowing edge for upper and lower crests
        const strokeGrad = ctx.createLinearGradient(xMin, 0, xMax, 0);
        strokeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        strokeGrad.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
        strokeGrad.addColorStop(0.25, layer.stroke);
        strokeGrad.addColorStop(1.0, layer.stroke);

        ctx.shadowBlur = 14;
        ctx.shadowColor = layer.glow;
        ctx.lineWidth = layer.lineWidth;
        ctx.strokeStyle = strokeGrad;

        // Top edge stroke
        ctx.beginPath();
        for (let i = 0; i < topPts.length && topPts[i].x <= splitX; i++) {
          if (i === 0) ctx.moveTo(topPts[i].x, topPts[i].y);
          else ctx.lineTo(topPts[i].x, topPts[i].y);
        }
        ctx.stroke();

        // Bottom edge stroke
        ctx.beginPath();
        for (let i = 0; i < botPts.length && botPts[i].x <= splitX; i++) {
          if (i === 0) ctx.moveTo(botPts[i].x, botPts[i].y);
          else ctx.lineTo(botPts[i].x, botPts[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Draw Pending / Remaining Portion (splitX to xMax) with Soft Dimmed Violet
        if (splitX < xMax) {
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

          const pendingFillGrad = ctx.createLinearGradient(xMin, 0, xMax, 0);
          pendingFillGrad.addColorStop(0, 'rgba(192, 132, 252, 0.12)');
          pendingFillGrad.addColorStop(0.85, 'rgba(192, 132, 252, 0.08)');
          pendingFillGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
          pendingFillGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = pendingFillGrad;
          ctx.fill();

          const pendingStrokeGrad = ctx.createLinearGradient(xMin, 0, xMax, 0);
          pendingStrokeGrad.addColorStop(0, 'rgba(192, 132, 252, 0.35)');
          pendingStrokeGrad.addColorStop(0.85, 'rgba(192, 132, 252, 0.25)');
          pendingStrokeGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
          pendingStrokeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(192, 132, 252, 0.3)';
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = pendingStrokeGrad;

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
          width={1000}
          height={52}
          className="w-full h-11 sm:h-12 select-none"
        />
      </div>
    </div>
  );
};
