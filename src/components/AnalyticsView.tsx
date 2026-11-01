'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  FileAudio,
  CheckCircle2,
  XCircle,
  Calendar,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  PieChart,
  Layers,
} from 'lucide-react';
import { HistoryItem } from '@/types/transcription';
import { formatTime } from '@/lib/audioToneGenerator';

interface AnalyticsViewProps {
  recordings: HistoryItem[];
  onOpenRecording?: (recording: HistoryItem) => void;
  onNewTranscription?: () => void;
}

type DateRangeFilter = '7d' | '30d' | '90d' | 'all';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  recordings = [],
  onOpenRecording,
  onNewTranscription,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');

  // Filter recordings by selected date range
  const filteredRecordings = useMemo(() => {
    if (dateRange === 'all') return recordings;

    const now = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return recordings.filter((r) => {
      const recDate = new Date(r.date);
      return !isNaN(recDate.getTime()) ? recDate >= cutoff : true;
    });
  }, [recordings, dateRange]);

  // Aggregate Metrics computed strictly from actual user records
  const metrics = useMemo(() => {
    const totalRecordings = filteredRecordings.length;

    // Successfully transcribed = segments exist
    const totalTranscribed = filteredRecordings.filter(
      (r) => (r.result?.segments?.length || 0) > 0
    ).length;

    const failedCount = totalRecordings - totalTranscribed;

    const totalDuration = filteredRecordings.reduce((acc, r) => acc + (r.duration || 0), 0);
    const avgDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;
    const totalWords = filteredRecordings.reduce((acc, r) => acc + (r.wordCount || 0), 0);

    // Language Distribution
    const langMap: Record<string, number> = {};
    filteredRecordings.forEach((r) => {
      const lang = r.result?.metadata?.language || 'Auto';
      langMap[lang] = (langMap[lang] || 0) + 1;
    });

    const languages = Object.entries(langMap)
      .map(([lang, count]) => ({
        language: lang.toUpperCase(),
        count,
        percentage: totalRecordings > 0 ? Math.round((count / totalRecordings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly Activity Breakdown
    const monthMap: Record<string, { count: number; duration: number }> = {};
    filteredRecordings.forEach((r) => {
      const d = new Date(r.date);
      const key = !isNaN(d.getTime())
        ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        : 'Recent';
      if (!monthMap[key]) {
        monthMap[key] = { count: 0, duration: 0 };
      }
      monthMap[key].count += 1;
      monthMap[key].duration += r.duration || 0;
    });

    const monthlyActivity = Object.entries(monthMap).map(([month, data]) => ({
      month,
      count: data.count,
      duration: data.duration,
    }));

    // Status breakdown
    const transcribedPct =
      totalRecordings > 0 ? Math.round((totalTranscribed / totalRecordings) * 100) : 0;
    const failedPct = totalRecordings > 0 ? Math.round((failedCount / totalRecordings) * 100) : 0;

    return {
      totalRecordings,
      totalTranscribed,
      failedCount,
      totalDuration,
      avgDuration,
      totalWords,
      languages,
      monthlyActivity,
      transcribedPct,
      failedPct,
    };
  }, [filteredRecordings]);

  return (
    <div className="space-y-8 max-w-6xl animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Transcription Analytics
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Activity
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time insights and activity metrics calculated directly from your Supabase transcription records.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'all', label: 'All Time' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setDateRange(pill.id as DateRangeFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP 6 METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Uploads */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Uploads</span>
            <FileAudio className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.totalRecordings}</p>
          <span className="text-[10px] text-slate-400 font-medium">Recordings stored</span>
        </div>

        {/* Metric 2: Successfully Transcribed */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Transcribed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{metrics.totalTranscribed}</p>
          <span className="text-[10px] text-emerald-600 font-medium">
            {metrics.transcribedPct}% success rate
          </span>
        </div>

        {/* Metric 3: Total Duration */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Time</span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700">{formatTime(metrics.totalDuration)}</p>
          <span className="text-[10px] text-slate-400 font-medium">Transcribed audio</span>
        </div>

        {/* Metric 4: Average Duration */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Duration</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-teal-700">
            {formatTime(Math.round(metrics.avgDuration))}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Per recording</span>
        </div>

        {/* Metric 5: Total Words */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Words</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {metrics.totalWords > 999
              ? `${(metrics.totalWords / 1000).toFixed(1)}k`
              : metrics.totalWords}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Transcribed vocabulary</span>
        </div>

        {/* Metric 6: Failed Transcriptions */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Failed</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{metrics.failedCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">
            {metrics.failedPct}% error rate
          </span>
        </div>
      </div>

      {/* VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Transcription Activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Monthly Transcription Volume</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Number of audio files and duration processed over time
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              {metrics.monthlyActivity.length} Months Active
            </span>
          </div>

          {metrics.monthlyActivity.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs font-bold text-slate-600">No activity in this date range</p>
              <p className="text-[11px] text-slate-400">Upload audio to begin tracking analytics</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {metrics.monthlyActivity.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-bold text-slate-700">{item.month}</span>
                    <p className="text-lg font-extrabold text-indigo-700">{item.count} Files</p>
                    <span className="text-[10px] font-mono text-slate-400">
                      Duration: {formatTime(item.duration)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Responsive Progress Visualization */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900">Total Audio Time Processed</span>
                  <p className="text-[11px] text-indigo-700/80">Sum across all transcribed recordings</p>
                </div>
                <span className="text-lg font-mono font-extrabold text-indigo-700">
                  {formatTime(metrics.totalDuration)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Language Distribution & Status Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>Language Distribution</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Breakdown of speech recognition languages
              </p>
            </div>

            {metrics.languages.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No language data recorded</p>
            ) : (
              <div className="space-y-3">
                {metrics.languages.slice(0, 4).map((lang, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{lang.language}</span>
                      <span className="text-teal-700 font-mono">
                        {lang.count} ({lang.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Breakdown Bar */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Processing Status Ratio
            </span>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${metrics.transcribedPct}%` }}
                title={`Transcribed: ${metrics.transcribedPct}%`}
              />
              <div
                className="h-full bg-rose-400"
                style={{ width: `${metrics.failedPct}%` }}
                title={`Failed: ${metrics.failedPct}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Transcribed ({metrics.totalTranscribed})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Failed ({metrics.failedCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT TRANSCRIPTION ACTIVITY TABLE */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recent Transcription Activity
            </h3>
            <p className="text-[11px] text-slate-500">
              Detailed list of recordings from your account ({filteredRecordings.length} total)
            </p>
          </div>

          {onNewTranscription && (
            <button
              onClick={onNewTranscription}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              + New Transcription
            </button>
          )}
        </div>

        {filteredRecordings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileAudio className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No recordings found</p>
            <p className="text-[11px] text-slate-400">
              Start by uploading your first audio file in the Dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="pb-3 pl-2">Recording</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Words</th>
                  <th className="pb-3">Language</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecordings.slice(0, 10).map((rec) => {
                  const isSuccess = (rec.result?.segments?.length || 0) > 0;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-2 font-bold text-slate-800 flex items-center gap-2 max-w-[220px] truncate">
                        <FileAudio className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{rec.fileName}</span>
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">{rec.date}</td>
                      <td className="py-3 text-slate-700 font-mono">{formatTime(rec.duration)}</td>
                      <td className="py-3 text-slate-700 font-mono">{rec.wordCount}</td>
                      <td className="py-3 text-slate-500 uppercase font-mono text-[11px]">
                        {rec.result?.metadata?.language || 'EN'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isSuccess ? 'Transcribed' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {onOpenRecording && isSuccess && (
                          <button
                            onClick={() => onOpenRecording(rec)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                          >
                            Open →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
