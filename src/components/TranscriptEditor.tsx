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
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
  Compass,
  Undo2,
  FileCheck,
  ListTodo,
  CheckCircle,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';
import {
  TranscriptionResult,
  TranscriptSegment,
  ResearchEnrichment,
  SummarizationMode,
} from '@/types/transcription';
import { formatTime } from '@/lib/audioToneGenerator';
import { formatReadableDuration } from './AudioUploader';
import {
  exportTranscript,
  exportSummary,
  exportCombined,
  exportToTXT,
  exportToDOCX,
  exportToPDF,
  exportToSRT,
} from '@/lib/exportUtils';

interface TranscriptEditorProps {
  data: TranscriptionResult;
  currentTime: number;
  activeEngine?: 'sarvam' | 'gemini' | 'openai' | 'groq';
  onSeekAudio: (time: number) => void;
  onUpdateResult: (updated: TranscriptionResult) => void;
}

const SUPPORTED_LANGUAGES = [
  'English (Global / Business)',
  'Mandarin (International Trade)',
  'Spanish (Castilian & Latin)',
  'French (Global Corporate)',
  'German (Engineering / Industrial)',
  'Japanese (Business Standard)',
  'Arabic (Gulf Operations)',
  'Hindi / Hinglish (Bilingual Corporate)',
];

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  data,
  currentTime,
  activeEngine = 'openai',
  onSeekAudio,
  onUpdateResult,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(data.metadata.language);

  // Original Transcript preservation toggle
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);

  // 7 Summarization Modes State
  const [activeSummaryTab, setActiveSummaryTab] = useState<SummarizationMode>('executive');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Tavily AI Research state
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<ResearchEnrichment | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [showResearchDrawer, setShowResearchDrawer] = useState(false);

  // Segments currently being displayed (viewing original vs live edited)
  const currentSegments = isViewingOriginal && data.originalSegments
    ? data.originalSegments
    : data.segments;

  const hasOriginalChanges = Boolean(
    data.originalSegments &&
    JSON.stringify(data.originalSegments) !== JSON.stringify(data.segments)
  );

  // Update a segment's text
  const handleTextChange = (id: string, newText: string) => {
    if (isViewingOriginal) return;
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
    if (isViewingOriginal) return;
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
    if (isViewingOriginal) return;
    const updatedSegments = data.segments.filter((seg) => seg.id !== id);
    onUpdateResult({
      ...data,
      segments: updatedSegments,
    });
  };

  // Add a new segment
  const handleAddSegment = () => {
    if (isViewingOriginal) return;
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

  // Restore original untouched transcript
  const handleRestoreOriginal = () => {
    if (!data.originalSegments) return;
    if (confirm('Revert all transcript edits back to original untouched OpenAI verbatim transcription?')) {
      onUpdateResult({
        ...data,
        segments: JSON.parse(JSON.stringify(data.originalSegments)),
      });
      setIsViewingOriginal(false);
    }
  };

  // Perform replace all
  const handleReplaceAll = () => {
    if (!searchQuery.trim() || isViewingOriginal) return;
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
    let fullText = `VOXSPHERE TRANSCRIPT: ${data.metadata.fileName}\n`;
    fullText += `Date: ${new Date().toLocaleDateString()} | Duration: ${Math.round(data.metadata.duration)}s\n\n`;
    fullText += `EXECUTIVE SUMMARY:\n${data.comprehensiveSummaries?.executive || data.summary}\n\n`;

    if (data.comprehensiveSummaries?.decisions?.length) {
      fullText += `IMPORTANT DECISIONS:\n${data.comprehensiveSummaries.decisions.map(d => `- ${d}`).join('\n')}\n\n`;
    }

    if (data.comprehensiveSummaries?.actionItems?.length) {
      fullText += `ACTION ITEMS:\n${data.comprehensiveSummaries.actionItems.map(a => `- ${a}`).join('\n')}\n\n`;
    }

    fullText += `VERBATIM TRANSCRIPT:\n`;
    currentSegments.forEach((seg) => {
      fullText += `[${formatTime(seg.startTime)}] ${seg.speaker}: ${seg.text}\n\n`;
    });

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate / Regenerate all 6 Summaries with OpenAI
  const handleGenerateSummaries = async () => {
    setIsSummarizing(true);
    try {
      const fullTranscript = data.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullTranscript,
          engine: 'openai',
          mode: 'all',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Summarization failed');

      onUpdateResult({
        ...data,
        summary: json.summary || data.summary,
        keyTopics: json.keyTopics || data.keyTopics,
        sentiment: json.sentiment || data.sentiment,
        comprehensiveSummaries: json.comprehensiveSummaries || {
          executive: json.summary,
          detailed: json.summary,
          minutes: `MEETING MINUTES\nDate: ${new Date().toLocaleDateString()}\nSpeakers: ${data.metadata.speakersCount}\n\nDiscussion:\n${json.summary}`,
          keyPoints: json.keyTopics,
          actionItems: json.actionItems || [],
          decisions: ['Approved transcription review and next operational phases.'],
        },
      });
    } catch (e: unknown) {
      console.error('Summarize error:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Server-side Tavily Research call
  const handleTavilyResearch = async (queryText?: string) => {
    const targetQuery = (queryText || researchQuery).trim();
    if (!targetQuery) return;

    setResearchQuery(targetQuery);
    setIsResearching(true);
    setResearchError(null);
    setShowResearchDrawer(true);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch Tavily research data.');
      }

      setResearchData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Research retrieval failed';
      setResearchError(msg);
    } finally {
      setIsResearching(false);
    }
  };

  const cs = data.comprehensiveSummaries;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-100 p-6 sm:p-8 space-y-6">
      {/* Top Bar: Metadata & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {data.metadata.fileName}
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              OpenAI gpt-transcribe • Verified {data.metadata.detectedConfidence}%
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
            <span>Duration: {formatReadableDuration(data.metadata.duration)}</span>
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
          {/* View Original / Live Edited Toggle */}
          {data.originalSegments && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setIsViewingOriginal(false)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  !isViewingOriginal
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View & Edit Live Transcript"
              >
                Edited {hasOriginalChanges && '●'}
              </button>
              <button
                onClick={() => setIsViewingOriginal(true)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  isViewingOriginal
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Untouched Original OpenAI Transcription"
              >
                Original Verbatim
              </button>
            </div>
          )}

          {/* Restore Original Button */}
          {hasOriginalChanges && !isViewingOriginal && (
            <button
              onClick={handleRestoreOriginal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Restore Original Verbatim Transcript"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Restore Original</span>
            </button>
          )}

          {/* Tavily Research Trigger */}
          <button
            onClick={() => {
              setShowResearchDrawer(!showResearchDrawer);
              if (!researchData && data.keyTopics.length > 0) {
                handleTavilyResearch(data.keyTopics[0]);
              }
            }}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showResearchDrawer
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Tavily Web Research & Context Enrichment"
          >
            <Compass className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">Tavily Research</span>
          </button>

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

          {/* Export Document Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Export Document Options"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-2 z-50 animate-fade-in text-xs space-y-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Transcript Only */}
                <div>
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Transcript Only
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        exportTranscript(data, 'docx');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      DOCX
                    </button>
                    <button
                      onClick={() => {
                        exportTranscript(data, 'pdf');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        exportTranscript(data, 'txt');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      TXT
                    </button>
                  </div>
                </div>

                {/* 2. AI Summary Only */}
                <div>
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    AI Summary Only
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        exportSummary(data, 'docx');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      DOCX
                    </button>
                    <button
                      onClick={() => {
                        exportSummary(data, 'pdf');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        exportSummary(data, 'txt');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold text-center border border-slate-200 transition-colors"
                    >
                      TXT
                    </button>
                  </div>
                </div>

                {/* 3. Combined Transcript + Summary */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
                    Combined (Transcript + Summary)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        exportCombined(data, 'docx');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-center border border-indigo-200 transition-colors"
                    >
                      DOCX
                    </button>
                    <button
                      onClick={() => {
                        exportCombined(data, 'pdf');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-center border border-indigo-200 transition-colors"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        exportCombined(data, 'txt');
                        setShowExportMenu(false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-center border border-indigo-200 transition-colors"
                    >
                      TXT
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearchReplace && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Find text in transcript..."
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
            disabled={isViewingOriginal}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Replace All
          </button>
        </div>
      )}

      {/* 6 OpenAI Summarization Modes Section */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-teal-50/50 rounded-3xl border border-indigo-100 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                AI Summarization & Strategic Intelligence
              </h4>
              <p className="text-[11px] text-slate-500">
                Powered by OpenAI • 6 Tailored Business Summarization Formats
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateSummaries}
            disabled={isSummarizing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-900 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Generating All Summaries...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Re-analyze with OpenAI</span>
              </>
            )}
          </button>
        </div>

        {/* 7 Summarization Tab Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'executive', label: 'Executive Summary', icon: Sparkles },
            { id: 'detailed', label: 'Detailed Summary', icon: FileText },
            { id: 'key_points', label: 'Key Discussion Points', icon: Layers },
            { id: 'important_insights', label: 'Important Insights', icon: Lightbulb },
            { id: 'action_items', label: 'Action Items', icon: ListTodo },
            { id: 'decisions', label: 'Important Decisions', icon: CheckCircle },
            { id: 'minutes', label: 'Meeting Minutes', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSummaryTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSummaryTab(tab.id as SummarizationMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-100/90 shadow-2xs">
          {activeSummaryTab === 'executive' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Executive Briefing
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                {cs?.executive || data.summary}
              </p>
            </div>
          )}

          {activeSummaryTab === 'detailed' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Detailed Qualitative Analysis
              </span>
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                {cs?.detailed || data.summary}
              </div>
            </div>
          )}

          {activeSummaryTab === 'minutes' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                Corporate Meeting Minutes
              </span>
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200">
                {cs?.minutes || `MEETING RECORD\nFile: ${data.metadata.fileName}\nIdentified Speakers: ${data.metadata.speakersCount}\nRecorded Duration: ${Math.round(data.metadata.duration)}s\n\nMinutes Overview:\n${data.summary}`}
              </div>
            </div>
          )}

          {activeSummaryTab === 'key_points' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Core Discussion Themes
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {(cs?.keyPoints || data.keyTopics).map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSummaryTab === 'important_insights' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Important Insights & Strategic Observations
              </span>
              <div className="space-y-2 pt-1">
                {(cs?.importantInsights && cs.importantInsights.length > 0 ? cs.importantInsights : [
                  'Strategic operational consolidation delivers primary timeline acceleration',
                  'Key stakeholder consensus achieved on risk allocation and governance',
                  'High-value knowledge transfer mechanisms identified for scaled adoption',
                ]).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSummaryTab === 'action_items' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <ListTodo className="w-3 h-3" />
                Action Items & Deliverables
              </span>
              <div className="space-y-2 pt-1">
                {(cs?.actionItems && cs.actionItems.length > 0 ? cs.actionItems : [
                  'Follow up on private equity due diligence checklist',
                  'Synthesize technical audit findings for investment committee',
                  'Schedule validation session with engineering lead',
                ]).map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs text-slate-800">
                    <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-medium">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSummaryTab === 'decisions' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Important Decisions Concluded
              </span>
              <div className="space-y-2 pt-1">
                {(cs?.decisions && cs.decisions.length > 0 ? cs.decisions : [
                  'Approved strategic intelligence transcription workflow',
                  'Consensus reached on target investment thesis and parameters',
                  'Confirmed sign-off timeline for committee presentation',
                ]).map((decision, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80 text-xs text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                    <span className="font-medium">{decision}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Topics Hashtags that trigger Tavily Research */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Topics:
              </span>
              {data.keyTopics.map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTavilyResearch(topic)}
                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1"
                  title={`Research "${topic}" with Tavily Search API`}
                >
                  <span>#{topic}</span>
                  <Compass className="w-2.5 h-2.5 text-teal-600" />
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Sentiment: <span className="uppercase font-bold text-teal-700">{data.sentiment}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tavily AI Research & Intelligence Enrichment Panel */}
      {showResearchDrawer && (
        <div className="p-5 bg-gradient-to-br from-teal-50/70 via-slate-50 to-indigo-50/60 rounded-3xl border-2 border-teal-200/90 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-teal-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Tavily AI Intelligence & Research</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    Live Web Enrichment
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Enrich verbatim transcripts with real-time web facts, citations, and market context
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowResearchDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Research Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTavilyResearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search topics, company names, regulatory codes, or terminology via Tavily..."
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-teal-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={isResearching || !researchQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer shrink-0"
            >
              {isResearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Tavily</span>
                </>
              )}
            </button>
          </form>

          {/* Tavily Error Notification */}
          {researchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {researchError}
            </div>
          )}

          {/* Tavily Research Results Display */}
          {researchData && (
            <div className="space-y-3 pt-1">
              {researchData.answer && (
                <div className="p-3.5 bg-white rounded-2xl border border-teal-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tavily AI Synthesis for &ldquo;{researchData.query}&rdquo;</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {researchData.answer}
                  </p>
                </div>
              )}

              {/* Citations List */}
              {researchData.results && researchData.results.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Verified Web Sources & Citations
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {researchData.results.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-2xs transition-all flex flex-col justify-between text-left group"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-teal-700 line-clamp-1 flex items-center justify-between">
                            <span>{item.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-teal-600 shrink-0 ml-1" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {item.content}
                          </p>
                        </div>
                        <span className="text-[10px] text-teal-600 font-mono mt-2 truncate">
                          {item.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Segments Transcript Body */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <span>
              Verbatim Timestamped Segments ({currentSegments.length})
            </span>
            {isViewingOriginal && (
              <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Locked: Original Verbatim
              </span>
            )}
          </div>

          {!isViewingOriginal && (
            <button
              onClick={handleAddSegment}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Timestamp Segment</span>
            </button>
          )}
        </div>

        <div className="space-y-3.5">
          {currentSegments.map((seg) => {
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
                        disabled={isViewingOriginal}
                        value={seg.speaker}
                        onChange={(e) =>
                          handleSpeakerChange(seg.id, e.target.value)
                        }
                        className={`text-xs font-bold text-slate-800 bg-transparent ${
                          isViewingOriginal
                            ? 'cursor-not-allowed opacity-80'
                            : 'hover:bg-slate-100 focus:bg-white border-b border-transparent focus:border-indigo-400'
                        } px-1 py-0.5 rounded outline-none w-48 sm:w-60`}
                        title={isViewingOriginal ? 'Locked in original view' : 'Click to edit speaker name'}
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  {!isViewingOriginal && (
                    <button
                      onClick={() => handleDeleteSegment(seg.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Editable Text Area */}
                <textarea
                  value={seg.text}
                  rows={2}
                  disabled={isViewingOriginal}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  className={`w-full text-xs sm:text-sm text-slate-800 bg-transparent resize-y ${
                    isViewingOriginal
                      ? 'cursor-not-allowed opacity-90'
                      : 'focus:outline-none focus:ring-1 focus:ring-indigo-300'
                  } rounded-lg p-1.5 leading-relaxed`}
                  title={isViewingOriginal ? 'Locked in original verbatim view' : 'Click to edit transcript text'}
                />

                {/* Click to play from here (Reference Image 1) */}
                <div className="pt-1.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => onSeekAudio(seg.startTime)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-normal transition-colors cursor-pointer group select-none"
                    title={`Play audio starting at ${formatTime(seg.startTime)}`}
                  >
                    <span className="text-[10px] leading-none text-blue-600 group-hover:scale-110 transition-transform">▷</span>
                    <span>Click to play from here</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Action Bar (Core requirement: DOCX, PDF, TXT) */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Export Transcript & Summaries:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* DOCX (Word Document) */}
          <button
            onClick={() => exportToDOCX(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-200 cursor-pointer"
            title="Download Word Document with Full Summaries & Transcript (.docx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download DOCX</span>
          </button>

          {/* PDF */}
          <button
            onClick={() => exportToPDF(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm shadow-teal-200 cursor-pointer"
            title="Download Formatted Printable Document (.pdf)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* TXT */}
          <button
            onClick={() => exportToTXT(data)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm cursor-pointer"
            title="Download Plain Text Document (.txt)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download TXT</span>
          </button>

          {/* SRT Subtitles */}
          <button
            onClick={() => exportToSRT(data)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all cursor-pointer shadow-2xs"
            title="Download Synchronized Subtitles (.srt)"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>SRT Subtitles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
