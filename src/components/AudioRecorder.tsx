'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Sparkles, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/lib/audioToneGenerator';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording automatically on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setIsPaused(false);
      setSecondsElapsed(0);

      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Microphone access denied. Please grant microphone permission to record.');
    }
  };

  const pauseResumeRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const stopAndSubmit = () => {
    if (!mediaRecorderRef.current) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      onRecordingComplete(audioBlob, secondsElapsed);
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 text-center space-y-5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-white uppercase tracking-wider">
            {isPaused ? 'Recording Paused' : 'Live Audio Capture'}
          </span>
        </div>
        <span className="font-mono text-teal-400 text-sm">
          {formatDuration(secondsElapsed)}
        </span>
      </div>

      {/* Visual Equalizer Animation */}
      <div className="h-16 flex items-center justify-center gap-1.5 px-4 bg-slate-950/60 rounded-xl border border-slate-800">
        {[20, 45, 75, 90, 60, 30, 80, 95, 40, 65, 85, 30, 70, 50, 90, 40].map((h, idx) => (
          <div
            key={idx}
            style={{
              height: isPaused ? '15%' : `${Math.max(15, (h * (Math.sin(secondsElapsed + idx) + 1.2)) / 2)}%`,
            }}
            className={`w-1.5 rounded-full transition-all duration-150 ${
              isPaused ? 'bg-slate-600' : 'bg-gradient-to-t from-teal-500 to-indigo-400'
            }`}
          />
        ))}
      </div>

      {errorMessage ? (
        <div className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-950/50 p-3 rounded-xl border border-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Speak clearly into your microphone. Acoustic engine will remove background noise and diarize speakers automatically.
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={pauseResumeRecording}
          disabled={!isRecording}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={stopAndSubmit}
          disabled={secondsElapsed === 0}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop & Transcribe</span>
        </button>

        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
