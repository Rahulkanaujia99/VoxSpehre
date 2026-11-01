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

      // Multi-ribbon wave layers configuration: thin, smooth, luminous, layered
      const waveLayers = [
        {
          // Layer 1: Hot Pink / Magenta Wave
          f1: 4.8,
          f2: 9.2,
          ampTop: 14,
          ampBot: 11,
          phaseOffset: 0,
          stroke: '#ec4899',
          glow: 'rgba(236, 72, 153, 0.75)',
          lineWidth: 1.8,
          fillColor: 'rgba(236, 72, 153, 0.14)',
        },
        {
          // Layer 2: Electric Purple / Violet Wave
          f1: 4.2,
          f2: 8.0,
          ampTop: 12.5,
          ampBot: 10,
          phaseOffset: 1.6,
          stroke: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.75)',
          lineWidth: 1.6,
          fillColor: 'rgba(139, 92, 246, 0.12)',
        },
        {
          // Layer 3: Electric Blue / Cyan Wave
          f1: 5.4,
          f2: 10.5,
          ampTop: 10.5,
          ampBot: 9,
          phaseOffset: 3.2,
          stroke: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.75)',
          lineWidth: 1.5,
          fillColor: 'rgba(6, 182, 212, 0.1)',
        },
      ];

      // =======================================================================
      // 1. DRAW LUMINOUS HORIZONTAL CENTRAL BEAM
      // Active portion is vibrant and luminous; pending portion is soft and muted
      // =======================================================================
      const beamStart = xMin + waveW * 0.02;
      const beamEnd = xMax - waveW * 0.02;

      // Active vibrant beam (from beamStart up to splitX)
      if (splitX > beamStart) {
        ctx.save();
        const activeBeamGrad = ctx.createLinearGradient(beamStart, 0, splitX, 0);
        activeBeamGrad.addColorStop(0, 'rgba(236, 72, 153, 0)');
        activeBeamGrad.addColorStop(0.2, 'rgba(236, 72, 153, 0.45)');
        activeBeamGrad.addColorStop(0.55, 'rgba(168, 85, 247, 0.9)');
        activeBeamGrad.addColorStop(0.85, 'rgba(6, 182, 212, 0.95)');
        activeBeamGrad.addColorStop(1.0, '#38bdf8');

        ctx.beginPath();
        ctx.moveTo(beamStart, midY);
        ctx.lineTo(splitX, midY);
        ctx.strokeStyle = activeBeamGrad;
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.stroke();

        // Subtle specular flare along the active beam
        if (splitX - beamStart > 60) {
          const flareX = beamStart + (splitX - beamStart) * 0.6;
          ctx.beginPath();
          ctx.arc(flareX, midY, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#ffffff';
          ctx.fill();
        }
        ctx.restore();
      }

      // Pending muted beam (from splitX to beamEnd)
      if (splitX < beamEnd) {
        ctx.save();
        const pendingBeamGrad = ctx.createLinearGradient(splitX, 0, beamEnd, 0);
        pendingBeamGrad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        pendingBeamGrad.addColorStop(0.75, 'rgba(168, 85, 247, 0.15)');
        pendingBeamGrad.addColorStop(0.92, 'rgba(168, 85, 247, 0.05)');
        pendingBeamGrad.addColorStop(1.0, 'rgba(168, 85, 247, 0)');

        ctx.beginPath();
        ctx.moveTo(splitX, midY);
        ctx.lineTo(beamEnd, midY);
        ctx.strokeStyle = pendingBeamGrad;
        ctx.lineWidth = 1.1;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.2)';
        ctx.stroke();
        ctx.restore();
      }

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

        ctx.shadowBlur = 12;
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
          pendingFillGrad.addColorStop(0, 'rgba(147, 51, 234, 0.08)');
          pendingFillGrad.addColorStop(0.85, 'rgba(147, 51, 234, 0.05)');
          pendingFillGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
          pendingFillGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = pendingFillGrad;
          ctx.fill();

          const pendingStrokeGrad = ctx.createLinearGradient(xMin, 0, xMax, 0);
          pendingStrokeGrad.addColorStop(0, 'rgba(147, 51, 234, 0.32)');
          pendingStrokeGrad.addColorStop(0.85, 'rgba(147, 51, 234, 0.2)');
          pendingStrokeGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
          pendingStrokeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(147, 51, 234, 0.25)';
          ctx.lineWidth = 1.1;
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
      // 3. CIRCULAR GLOWING PROGRESS POINT AT SPLIT POINT (Matching Image 2)
      // Replaced vertical bar with a clean, luminous, glowing circular orb
      // =======================================================================
      if (splitX <= xMax) {
        ctx.save();

        // Subtle organic pulse
        const pulse = Math.sin(phase * 2.2) * 1.2;
        const outerHaloRadius = Math.max(9, 12 + pulse * 0.8);
        const ringRadius = Math.max(5, 6.5 + pulse * 0.3);

        // 1. Soft Ambient Outer Cyan Halo
        ctx.beginPath();
        ctx.arc(splitX, midY, outerHaloRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fill();

        // 2. Glowing Colored Outer Ring
        ctx.beginPath();
        ctx.arc(splitX, midY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4';
        ctx.fill();

        // 3. Solid Vibrant Cyan Circular Bead
        ctx.beginPath();
        ctx.arc(splitX, midY, 5.0, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fill();

        // 4. Pure White Luminous Core Dot
        ctx.beginPath();
        ctx.arc(splitX, midY, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffffff';
        ctx.fill();

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
      className={`relative w-full rounded-2xl py-3 sm:py-4 px-2 sm:px-3 bg-transparent space-y-3.5 animate-in fade-in duration-300 ${className}`}
    >
      {/* Top Status Row: Circular Spinner Ring + Status Text + Percentage */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Indigo/Purple Spinner Ring */}
        <div className="relative w-5 h-5 shrink-0">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>

        {/* Status Text (e.g. Transcribing audio with OpenAI speech recognition...) */}
        <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate flex-1" title={stageText}>
          {stageText}
        </p>

        {/* Percentage badge */}
        <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Synchronized Animated Fluid Waveform Canvas with Circular Loading Point */}
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
