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
  Edit3,
  Bot,
  Languages,
  Info,
  Target,
  ListChecks,
  CheckCircle2,
  ArrowRightCircle,
  CheckSquare,
  BookOpen,
  MessageSquareText,
} from 'lucide-react';
import {
  TranscriptionResult,
  TranscriptSegment,
  ResearchEnrichment,
  SummarizationMode,
  StructuredAISummary,
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
  onPlaySegment?: (startTime: number, endTime: number, segmentId: string) => void;
  activePlayingSegmentId?: string | null;
  onUpdateResult: (updated: TranscriptionResult) => void;
  onOpenChat?: () => void;
}

const TRANSLATION_LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Mandarin Chinese',
  'Arabic',
  'Hindi',
  'Portuguese',
  'Italian',
  'Russian',
  'Korean',
  'Dutch',
];

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
  onPlaySegment,
  activePlayingSegmentId,
  onUpdateResult,
  onOpenChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedAISummary, setCopiedAISummary] = useState(false);
  const [copiedParagraph, setCopiedParagraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(data.metadata.language);

  // Original Transcript preservation toggle
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);

  // 5 AI Summarization Options State
  const [activeSummaryTab, setActiveSummaryTab] = useState<SummarizationMode>('summary');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // New Tab Sub-states
  const [paragraphViewMode, setParagraphViewMode] = useState<'paragraphs' | 'speaker_turns'>('paragraphs');
  const [targetTranslateLanguage, setTargetTranslateLanguage] = useState<string>('Spanish');
  const [translatedContent, setTranslatedContent] = useState<string>(data.comprehensiveSummaries?.translatedText || '');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [copiedTranslation, setCopiedTranslation] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState<boolean>(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<boolean>(false);

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

  // Clean transcript paragraphs for Summary tab (no timestamps, no speaker names, no play option)
  const cleanSummaryParagraphs = React.useMemo(() => {
    return currentSegments
      .map((seg) => seg.text.trim())
      .filter(Boolean);
  }, [currentSegments]);

  const cleanSummaryText = React.useMemo(() => {
    return cleanSummaryParagraphs.join('\n\n');
  }, [cleanSummaryParagraphs]);

  // Copy Summary text (Clean transcript without timestamps or speakers)
  const handleCopySummary = () => {
    navigator.clipboard.writeText(cleanSummaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Generate / Regenerate all Summaries with OpenAI
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

      const csNew = json.comprehensiveSummaries || {};
      const structuredSummary = csNew.summary || json.summary || data.summary;
      const paragraphSummary = csNew.paragraph || json.paragraph || csNew.detailed || data.summary;
      const aiSummaryText = csNew.aiSummary || json.aiSummary || json.summary;

      onUpdateResult({
        ...data,
        summary: structuredSummary,
        keyTopics: json.keyTopics || data.keyTopics,
        sentiment: json.sentiment || data.sentiment,
        comprehensiveSummaries: {
          ...data.comprehensiveSummaries,
          ...csNew,
          summary: structuredSummary,
          paragraph: paragraphSummary,
          aiSummary: aiSummaryText,
          executive: structuredSummary,
          detailed: paragraphSummary,
        },
      });
    } catch (e: unknown) {
      console.error('Summarize error:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Generate / Regenerate AI Summary with actual AI
  const handleGenerateAISummary = async () => {
    setIsAiSummarizing(true);
    try {
      const fullTranscript = currentSegments.map((s) => `${s.speaker}: ${s.text}`).join('\n');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullTranscript,
          engine: 'auto',
          mode: 'ai_summary',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate AI summary');

      const csNew = json.comprehensiveSummaries || {};
      const aiSummary = csNew.aiSummary || json.aiSummary || json.summary;
      const structuredAISummary = csNew.structuredAISummary || json.structuredAISummary;

      onUpdateResult({
        ...data,
        comprehensiveSummaries: {
          ...data.comprehensiveSummaries,
          ...csNew,
          aiSummary,
          structuredAISummary,
        },
      });
    } catch (err) {
      console.error('AI Summary error:', err);
    } finally {
      setIsAiSummarizing(false);
    }
  };

  const handleCopyAISummary = () => {
    const textToCopy =
      cs?.aiSummary ||
      (structuredSummaryData
        ? `• What the transcript is about: ${structuredSummaryData.about}\n` +
          (structuredSummaryData.objective ? `• Main Objective: ${structuredSummaryData.objective}\n` : '') +
          `• Key Discussion Areas:\n  - ${structuredSummaryData.keyDiscussionAreas?.join('\n  - ')}\n` +
          `• Important Insights:\n  - ${structuredSummaryData.insights?.join('\n  - ')}\n` +
          `• Key Decisions:\n  - ${structuredSummaryData.decisions?.length ? structuredSummaryData.decisions.join('\n  - ') : 'None discussed'}\n` +
          `• Action Items:\n  - ${structuredSummaryData.actionItems?.length ? structuredSummaryData.actionItems.join('\n  - ') : 'None mentioned'}\n` +
          `• Overall Conclusion: ${structuredSummaryData.conclusion}`
        : data.summary);

    navigator.clipboard.writeText(textToCopy);
    setCopiedAISummary(true);
    setTimeout(() => setCopiedAISummary(false), 2000);
  };

  // Translate Transcript with AI
  const handleTranslateTranscript = async () => {
    setIsTranslating(true);
    try {
      const fullTranscript = currentSegments
        .map((s) => `[${formatTime(s.startTime)}] ${s.speaker}: ${s.text}`)
        .join('\n');
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullTranscript,
          targetLanguage: targetTranslateLanguage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Translation failed');

      setTranslatedContent(json.translatedText);
      onUpdateResult({
        ...data,
        comprehensiveSummaries: {
          ...data.comprehensiveSummaries,
          translatedText: json.translatedText,
        },
      });
    } catch (err: unknown) {
      console.error('Translation error:', err);
      alert('Translation service temporarily unavailable. Please verify API key.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (!translatedContent) return;
    navigator.clipboard.writeText(translatedContent);
    setCopiedTranslation(true);
    setTimeout(() => setCopiedTranslation(false), 2000);
  };

  const handleDownloadTranslation = () => {
    if (!translatedContent) return;
    const blob = new Blob([translatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.metadata.fileName.replace(/\.[^/.]+$/, '')}_translated_${targetTranslateLanguage.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save Direct Transcript Edits
  const handleSaveTranscriptEdits = () => {
    onUpdateResult({
      ...data,
      segments: data.segments,
      metadata: {
        ...data.metadata,
        wordCount: data.segments.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0),
        speakersCount: new Set(data.segments.map((s) => s.speaker)).size,
      },
    });
    setSaveSuccessBanner(true);
    setTimeout(() => setSaveSuccessBanner(false), 3000);
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

  // Complete Original Transcript: Group consecutive segments by speaker for natural paragraphs
  const speakerGroupedParagraphs = React.useMemo(() => {
    const groups: { speaker: string; text: string; startTime: number; endTime: number }[] = [];
    currentSegments.forEach((seg) => {
      const last = groups[groups.length - 1];
      if (last && last.speaker === seg.speaker) {
        last.text = `${last.text} ${seg.text}`.trim();
        last.endTime = seg.endTime;
      } else {
        groups.push({
          speaker: seg.speaker,
          text: seg.text.trim(),
          startTime: seg.startTime,
          endTime: seg.endTime,
        });
      }
    });
    return groups;
  }, [currentSegments]);

  // Complete, unabridged original transcript text preserving every single word
  const fullOriginalTranscriptText = React.useMemo(() => {
    return speakerGroupedParagraphs.map((g) => g.text).join('\n\n');
  }, [speakerGroupedParagraphs]);

  const handleCopyParagraph = () => {
    navigator.clipboard.writeText(fullOriginalTranscriptText);
    setCopiedParagraph(true);
    setTimeout(() => setCopiedParagraph(false), 2000);
  };

  // Structured AI Summary Data across all 7 dimensions
  const structuredSummaryData: StructuredAISummary = React.useMemo(() => {
    if (cs?.structuredAISummary) return cs.structuredAISummary;

    const sentences = currentSegments
      .map((s) => s.text)
      .join(' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const fullClean = currentSegments.map((s) => s.text).join(' ');

    const about =
      sentences.slice(0, 2).join(' ') ||
      data.summary ||
      fullClean.slice(0, 250);

    let objective: string | null = null;
    const objMatch = sentences.find((s) =>
      /\b(objective|goal|purpose|aim|target|plan to|aiming to|intending to)\b/i.test(s)
    );
    if (objMatch) objective = objMatch;

    const keyAreas: string[] = [];
    sentences.forEach((s) => {
      if (
        s.length > 25 &&
        /\b(milestone|investment|capacity|installed|solar|market|growth|energy|strategy|revenue|customer|project|technology|development)\b/i.test(s)
      ) {
        if (keyAreas.length < 5 && !keyAreas.includes(s)) keyAreas.push(s);
      }
    });
    if (keyAreas.length === 0 && sentences.length > 0) {
      keyAreas.push(...sentences.slice(0, Math.min(3, sentences.length)));
    }

    const insights: string[] = [];
    sentences.forEach((s) => {
      if (
        /\b(\d+|billion|million|percent|%|milestone|reached|created|unlocked|first|highest|growth)\b/i.test(s)
      ) {
        if (insights.length < 4 && !insights.includes(s)) insights.push(s);
      }
    });
    if (insights.length === 0 && sentences.length > 1) {
      insights.push(sentences[1]);
    }

    const decisions: string[] = [];
    sentences.forEach((s) => {
      if (/\b(decided to|agreed to|approved|resolved to|concluded that|settled on)\b/i.test(s)) {
        if (decisions.length < 3 && !decisions.includes(s)) decisions.push(s);
      }
    });

    const actionItems: string[] = [];
    sentences.forEach((s) => {
      if (/\b(action item|next step|responsible for|follow up|assigned to|deadline|must submit|will deliver)\b/i.test(s)) {
        if (actionItems.length < 3 && !actionItems.includes(s)) actionItems.push(s);
      }
    });

    const conclusion =
      sentences[sentences.length - 1] ||
      data.summary ||
      'Discussion concluded with core subject milestones recorded.';

    return {
      about,
      objective,
      keyDiscussionAreas: keyAreas,
      insights,
      decisions,
      actionItems,
      conclusion,
    };
  }, [cs, currentSegments, data.summary]);

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

          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Chat with AI about this transcript"
            >
              <MessageSquareText className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">AI Chat</span>
            </button>
          )}

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

      {/* AI Summarization & Strategic Intelligence Section */}
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
                Powered by OpenAI • Tailored Executive Intelligence & Localization
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

        {/* 5 Updated Tab Selectors matching Reference Image 1 */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'summary', label: 'Summary', icon: Sparkles },
            { id: 'paragraph', label: 'Paragraph', icon: FileText },
            { id: 'ai_summary', label: 'AI Summary', icon: Bot },
            { id: 'translate', label: 'Translate', icon: Globe },
            { id: 'edit', label: 'Edit', icon: Edit3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeSummaryTab === tab.id ||
              (tab.id === 'summary' && activeSummaryTab === 'executive') ||
              (tab.id === 'paragraph' && activeSummaryTab === 'detailed');
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSummaryTab(tab.id as SummarizationMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full sm:rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/80 scale-[1.02]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-100/90 shadow-2xs">
          {/* TAB 1: SUMMARY (Clean Transcript Text - No Timestamps, No Speaker Names, No Play Button) */}
          {(activeSummaryTab === 'summary' || activeSummaryTab === 'executive') && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Summary
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete transcript text displayed cleanly at one place
                  </p>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="Copy transcript text"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium px-1">
                <span className="font-semibold text-slate-700">{data.metadata.wordCount} words</span>
                <span>•</span>
                <span>{currentSegments.length} paragraphs</span>
                <span>•</span>
                <span>~{Math.max(1, Math.round(data.metadata.wordCount / 140))} min read</span>
              </div>

              {/* Clean Readable Transcript Paragraphs (No Timestamps, No Speaker Names, No Play Option) */}
              <div className="space-y-4 p-5 bg-slate-50/70 rounded-2xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal max-h-[520px] overflow-y-auto">
                {cleanSummaryParagraphs.map((paragraph, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PARAGRAPH (Complete Original Transcript - Unabridged & Formatted) */}
          {(activeSummaryTab === 'paragraph' || activeSummaryTab === 'detailed') && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Complete Original Transcript (Unabridged)
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Preserves entire transcript without summarising, shortening, or omitting content
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* View Mode Toggle: Continuous vs Speaker Turns */}
                  <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setParagraphViewMode('paragraphs')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        paragraphViewMode === 'paragraphs'
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Continuous
                    </button>
                    <button
                      type="button"
                      onClick={() => setParagraphViewMode('speaker_turns')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        paragraphViewMode === 'speaker_turns'
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      By Speaker
                    </button>
                  </div>

                  {/* Copy Full Paragraph Transcript */}
                  <button
                    type="button"
                    onClick={handleCopyParagraph}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                    title="Copy complete original transcript"
                  >
                    {copiedParagraph ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Full Transcript</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium px-1">
                <span>{data.metadata.wordCount} total words</span>
                <span>•</span>
                <span>{currentSegments.length} verbatim segments</span>
                <span>•</span>
                <span>~{Math.max(1, Math.round(data.metadata.wordCount / 140))} min estimated read</span>
              </div>

              {/* Paragraph Content Display */}
              {paragraphViewMode === 'paragraphs' ? (
                /* 1. Continuous Natural Paragraphs */
                <div className="space-y-4 p-5 bg-slate-50/70 rounded-2xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal max-h-[500px] overflow-y-auto">
                  {speakerGroupedParagraphs.map((group, idx) => (
                    <p key={idx} className="leading-relaxed text-justify">
                      {group.text}
                    </p>
                  ))}
                </div>
              ) : (
                /* 2. Speaker Turn Formatted Paragraphs */
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {speakerGroupedParagraphs.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1 border-b border-slate-200/60">
                        <span className="text-indigo-700 font-bold">{group.speaker}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {formatTime(group.startTime)} – {formatTime(group.endTime)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                        {group.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI SUMMARY (Meaningful 7-Dimension Structured Conversation Intelligence) */}
          {activeSummaryTab === 'ai_summary' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    Structured AI Conversation Intelligence
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Meaningful 7-dimension analysis grounded strictly in the full transcript
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAISummary}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedAISummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAISummary ? 'Copied' : 'Copy AI Summary'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAISummary}
                    disabled={isAiSummarizing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAiSummarizing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Analyzing with AI...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate Summary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* The 7 Structured Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* 1. What the transcript is about */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-purple-50/80 to-indigo-50/60 border border-purple-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    What the Transcript is About
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {structuredSummaryData.about}
                  </p>
                </div>

                {/* 2. Main Objective */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Main Objective
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {structuredSummaryData.objective || 'Primary discussion context established across recorded speech turns.'}
                  </p>
                </div>

                {/* 3. Key Discussion Areas */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Key Discussion Areas
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {structuredSummaryData.keyDiscussionAreas && structuredSummaryData.keyDiscussionAreas.length > 0 ? (
                      structuredSummaryData.keyDiscussionAreas.map((area, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{area}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">Core conversation points documented.</li>
                    )}
                  </ul>
                </div>

                {/* 4. Important Insights */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Important Insights
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {structuredSummaryData.insights && structuredSummaryData.insights.length > 0 ? (
                      structuredSummaryData.insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{insight}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">Discussion observations recorded.</li>
                    )}
                  </ul>
                </div>

                {/* 5. Key Decisions */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Key Decisions
                  </span>
                  {structuredSummaryData.decisions && structuredSummaryData.decisions.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {structuredSummaryData.decisions.map((dec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{dec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No formal decisions were finalized during this conversation.
                    </p>
                  )}
                </div>

                {/* 6. Action Items */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    Action Items
                  </span>
                  {structuredSummaryData.actionItems && structuredSummaryData.actionItems.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {structuredSummaryData.actionItems.map((act, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{act}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No action items or follow-up tasks were assigned in this discussion.
                    </p>
                  )}
                </div>

                {/* 7. Overall Conclusion */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Overall Conclusion
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {structuredSummaryData.conclusion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSLATE (AI Localization Engine) */}
          {activeSummaryTab === 'translate' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700">Target Language:</span>
                  <select
                    value={targetTranslateLanguage}
                    onChange={(e) => setTargetTranslateLanguage(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-indigo-500 shadow-2xs cursor-pointer"
                  >
                    {TRANSLATION_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTranslateTranscript}
                  disabled={isTranslating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Translating Full Transcript...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="w-3.5 h-3.5" />
                      <span>Translate Transcript</span>
                    </>
                  )}
                </button>
              </div>

              {translatedContent ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Translated to {targetTranslateLanguage}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyTranslation}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                      >
                        {copiedTranslation ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTranslation ? 'Copied' : 'Copy Translation'}</span>
                      </button>
                      <button
                        onClick={handleDownloadTranslation}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download TXT</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                    {translatedContent}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Languages className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="text-xs sm:text-sm font-bold text-slate-700">
                    Translate entire transcript into {targetTranslateLanguage}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Select your target language above and click Translate Transcript to perform AI-powered translation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EDIT (Direct Transcript Editor & Save Changes) */}
          {activeSummaryTab === 'edit' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    Direct Transcript Editor ({currentSegments.length} Segments)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {data.originalSegments && (
                    <button
                      type="button"
                      onClick={handleRestoreOriginal}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      title="Revert back to verbatim transcription"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Revert</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Segment</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTranscriptEdits}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>

              {saveSuccessBanner && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Changes saved successfully to active transcript and session!</span>
                </div>
              )}

              {/* Editable Segments Stream */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {currentSegments.map((seg) => (
                  <div key={seg.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={seg.speaker}
                          onChange={(e) => handleSpeakerChange(seg.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-indigo-500"
                          title="Edit Speaker Name"
                        />
                        <span className="text-[11px] font-mono text-slate-400">
                          [{formatTime(seg.startTime)} - {formatTime(seg.endTime)}]
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Segment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={seg.text}
                      onChange={(e) => handleTextChange(seg.id, e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 focus:outline-indigo-500 resize-y"
                    />
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
            const isPlayingThisExactSegment = activePlayingSegmentId === seg.id;
            const isCurrentlyPlaying =
              isPlayingThisExactSegment || (currentTime >= seg.startTime && currentTime <= seg.endTime);

            return (
              <div
                key={seg.id}
                className={`p-4 rounded-2xl border transition-all duration-200 ${
                  isPlayingThisExactSegment
                    ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-200 shadow-md'
                    : isCurrentlyPlaying
                    ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-100 shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Segment Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Clickable Timestamp Button */}
                    <button
                      onClick={() => {
                        if (onPlaySegment) {
                          onPlaySegment(seg.startTime, seg.endTime, seg.id);
                        } else {
                          onSeekAudio(seg.startTime);
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        isPlayingThisExactSegment
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isCurrentlyPlaying
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white'
                      }`}
                      title={`Play audio segment: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`}
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
                    onClick={() => {
                      if (onPlaySegment) {
                        onPlaySegment(seg.startTime, seg.endTime, seg.id);
                      } else {
                        onSeekAudio(seg.startTime);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer group select-none"
                    title={`Play only segment ${formatTime(seg.startTime)} – ${formatTime(seg.endTime)}`}
                  >
                    <span className="text-[10px] leading-none text-blue-600 group-hover:scale-110 transition-transform">
                      {isPlayingThisExactSegment ? '⏹' : '▷'}
                    </span>
                    <span className={isPlayingThisExactSegment ? 'font-bold text-indigo-700 underline decoration-indigo-300' : ''}>
                      {isPlayingThisExactSegment ? 'Playing this segment (Click to stop)' : 'Click to play from here'}
                    </span>
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
