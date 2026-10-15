'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Search,
  Replace,
  Plus,
  Trash2,
  Clock,
  User,
  Globe,
  Sparkles,
} from 'lucide-react';
import { TranscriptionResult, TranscriptSegment } from '@/types/transcription';
import { formatTime } from '@/lib/audioToneGenerator';
import {
  exportToTXT,
  exportToWord,
  exportToPDF,
  exportToSRT,
} from '@/lib/exportUtils';

interface TranscriptEditorProps {
  data: TranscriptionResult;
  currentTime: number;
  onSeekAudio: (time: number) => void;
  onUpdateResult: (updated: TranscriptionResult) => void;
}

const SUPPORTED_LANGUAGES = [
  'English (Maritime / Global)',
  'Mandarin (Maritime Offshore)',
  'Spanish (Castilian & Latin)',
  'Bahasa Indonesia / Malay',
  'French (Maritime Class)',
  'German (Marine Engineering)',
  'Japanese (Nippon Kaiji Kyokai)',
  'Arabic (Gulf Operations)',
];

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  data,
  currentTime,
  onSeekAudio,
  onUpdateResult,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(data.metadata.language);

  // Update a segment's text
  const handleTextChange = (id: string, newText: string) => {
    const updatedSegments = data.segments.map((seg) =>
      seg.id === id ? { ...seg, text: newText } : seg
    );
    onUpdateResult({
      ...data,
      segments: updatedSegments,
      metadata: {
        ...data.metadata,
        wordCount: updatedSegments.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0),
      },
    });
  };

  // Update a segment's speaker name
  const handleSpeakerChange = (id: string, newSpeaker: string) => {
    const updatedSegments = data.segments.map((seg) =>
      seg.id === id ? { ...seg, speaker: newSpeaker } : seg
    );
    const uniqueSpeakers = new Set(updatedSegments.map((s) => s.speaker)).size;
    onUpdateResult({
      ...data,
      segments: updatedSegments,
      metadata: {
        ...data.metadata,
        speakersCount: uniqueSpeakers,
      },
    });
  };

  // Delete a segment
  const handleDeleteSegment = (id: string) => {
    const updatedSegments = data.segments.filter((seg) => seg.id !== id);
    onUpdateResult({
      ...data,
      segments: updatedSegments,
    });
  };

  // Add a new segment
  const handleAddSegment = () => {
    const lastSeg = data.segments[data.segments.length - 1];
    const newStart = lastSeg ? lastSeg.endTime : 0;
    const newEnd = newStart + 10;
    const newSeg: TranscriptSegment = {
      id: `seg-custom-${Date.now()}`,
      speaker: `Speaker ${data.metadata.speakersCount + 1}`,
      startTime: newStart,
      endTime: newEnd,
      text: 'Enter transcribed speech here...',
      confidence: 1.0,
    };
    onUpdateResult({
      ...data,
      segments: [...data.segments, newSeg],
      metadata: {
        ...data.metadata,
        duration: Math.max(data.metadata.duration, newEnd),
      },
    });
  };

  // Perform replace all
  const handleReplaceAll = () => {
    if (!searchQuery.trim()) return;
    const regex = new RegExp(searchQuery, 'gi');
    const updatedSegments = data.segments.map((seg) => ({
      ...seg,
      text: seg.text.replace(regex, replaceQuery),
    }));
    onUpdateResult({
      ...data,
      segments: updatedSegments,
    });
  };

  // Copy full transcript text
  const handleCopy = () => {
    let fullText = `${data.metadata.fileName}\n\n`;
    fullText += `SUMMARY:\n${data.summary}\n\nTRANSCRIPT:\n`;
    data.segments.forEach((seg) => {
      fullText += `[${formatTime(seg.startTime)}] ${seg.speaker}: ${seg.text}\n\n`;
    });
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-100 p-6 sm:p-8 space-y-6">
      {/* Top Bar: Metadata & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {data.metadata.fileName}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified {data.metadata.detectedConfidence}%
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
            <span>Duration: {Math.round(data.metadata.duration)}s</span>
            <span>•</span>
            <span>Words: {data.metadata.wordCount}</span>
            <span>•</span>
            <span>Speakers: {data.metadata.speakersCount}</span>
            <span>•</span>
            <span>Format: {data.metadata.format}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearchReplace(!showSearchReplace)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showSearchReplace
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Search & Replace"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search & Replace</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Transcript"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearchReplace && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Find text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Replace className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-indigo-500"
            />
          </div>

          <button
            onClick={handleReplaceAll}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Replace All
          </button>
        </div>
      )}

      {/* Language Selector & Executive Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language & Sentiment Column */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              Detected Language
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              99.4%
            </span>
          </div>

          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              onUpdateResult({
                ...data,
                metadata: { ...data.metadata, language: e.target.value },
              });
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Sentiment:</span>
            <span className="uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              {data.sentiment}
            </span>
          </div>
        </div>

        {/* Executive Summary (2 columns) */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/60 to-teal-50/40 border border-indigo-100/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Executive Briefing & Key Takeaways</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              {data.summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {data.keyTopics.map((topic, i) => (
              <span
                key={i}
                className="text-[10px] font-bold text-indigo-700 bg-white/80 border border-indigo-200/60 px-2.5 py-0.5 rounded-full"
              >
                #{topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Segments Transcript Body */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Verbatim Timestamped Segments ({data.segments.length})</span>
          <button
            onClick={handleAddSegment}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Timestamp Segment</span>
          </button>
        </div>

        <div className="space-y-3.5">
          {data.segments.map((seg) => {
            const isCurrentlyPlaying =
              currentTime >= seg.startTime && currentTime <= seg.endTime;

            return (
              <div
                key={seg.id}
                className={`p-4 rounded-2xl border transition-all duration-200 ${
                  isCurrentlyPlaying
                    ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-100 shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Segment Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Clickable Timestamp Button */}
                    <button
                      onClick={() => onSeekAudio(seg.startTime)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        isCurrentlyPlaying
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-teal-500 hover:text-white'
                      }`}
                      title="Seek audio to this timestamp"
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                      </span>
                    </button>

                    {/* Editable Speaker Name */}
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={seg.speaker}
                        onChange={(e) =>
                          handleSpeakerChange(seg.id, e.target.value)
                        }
                        className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white border-b border-transparent focus:border-indigo-400 px-1 py-0.5 rounded outline-none w-48 sm:w-60"
                        title="Click to edit speaker name"
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove segment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline Editable Text Area */}
                <textarea
                  value={seg.text}
                  rows={2}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  className="w-full text-xs sm:text-sm text-slate-800 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded-lg p-1.5 leading-relaxed"
                  title="Click to edit transcript text"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Action Bar (Matches user request: TXT, Word, PDF formats) */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Export Transcript As:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* TXT */}
          <button
            onClick={() => exportToTXT(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-all border border-slate-200 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>TXT</span>
          </button>

          {/* Word (.doc) */}
          <button
            onClick={() => exportToWord(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Word (.doc)</span>
          </button>

          {/* PDF */}
          <button
            onClick={() => exportToPDF(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>PDF</span>
          </button>

          {/* SRT Subtitles */}
          <button
            onClick={() => exportToSRT(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>SRT Subtitles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
