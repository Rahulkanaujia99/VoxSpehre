'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  Clock,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  CornerDownLeft,
} from 'lucide-react';
import { HistoryItem } from '@/types/transcription';
import { formatTime } from '@/lib/audioToneGenerator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatViewProps {
  savedRecordings?: HistoryItem[];
  initialRecordingId?: string | null;
  activeTranscriptText?: string;
  activeRecordingTitle?: string;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  savedRecordings = [],
  initialRecordingId,
  activeTranscriptText,
  activeRecordingTitle,
}) => {
  // Active selected recording
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>(
    initialRecordingId || (savedRecordings[0]?.id ?? '')
  );

  // Derive active transcript and title
  const activeRecording = savedRecordings.find((r) => r.id === selectedRecordingId);
  const currentTitle =
    activeRecording?.fileName || activeRecordingTitle || 'Active Recording Transcript';

  const currentTranscript =
    activeRecording?.result?.segments?.map((s) => `${s.speaker}: ${s.text}`).join('\n') ||
    activeTranscriptText ||
    '';

  // Chat message history per recording
  const storageKey = `voxsphere_chat_${selectedRecordingId || 'active'}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history from localStorage when selected recording changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  // Persist chat history to localStorage
  const saveMessages = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMsgs));
    } catch {}
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    if (!currentTranscript.trim()) {
      alert('No transcript available for this recording. Please transcribe audio first.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentTranscript,
          question: textToSend,
          history: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer from AI');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'This information is not mentioned in the transcript.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      saveMessages([...updated, botMsg]);
    } catch (err: unknown) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : '⚠️ Could not generate an answer. Please check network connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      saveMessages([...updated, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear chat history for this recording?')) {
      saveMessages([]);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5 w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AI Chat with Transcript
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Grounded AI
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Query your transcript in natural language. Answers are strictly grounded in what was said.
          </p>
        </div>

        {/* Recording Selector & Clear Chat */}
        <div className="flex flex-wrap items-center gap-2">
          {savedRecordings.length > 0 && (
            <div className="relative">
              <select
                value={selectedRecordingId}
                onChange={(e) => setSelectedRecordingId(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-slate-700 hover:border-purple-300 focus:outline-purple-500 shadow-2xs cursor-pointer max-w-[220px] truncate"
              >
                {savedRecordings.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.fileName} ({formatTime(rec.duration)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="clay-card-surface rounded-clay-3xl overflow-hidden flex flex-col h-[520px] sm:h-[550px] lg:h-[560px]">
        {/* Active Recording Banner */}
        <div className="p-3.5 px-5 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white border-b border-purple-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800 truncate">
              Context: {currentTitle}
            </span>
          </div>
          <span className="text-[11px] font-mono text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full shrink-0">
            {activeRecording?.result?.segments?.length || 0} transcript segments loaded
          </span>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3.5 max-w-lg mx-auto animate-fade-in my-auto">
              <div className="w-14 h-14 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Ask anything about this recording
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md">
                  The AI only references words spoken in this audio file. If a question isn&apos;t covered in the conversation, it will explicitly let you know.
                </p>
              </div>
            </div>
          ) : (
            /* Active Message Stream */
            messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs ${
                      isBot ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`group relative max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isBot
                        ? 'bg-slate-50 border border-slate-200/90 text-slate-800'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Footer: Timestamp & Copy */}
                    <div
                      className={`mt-2 flex items-center justify-between text-[10px] ${
                        isBot ? 'text-slate-400' : 'text-indigo-200'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isBot && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-purple-700 cursor-pointer"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator Bubble */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                <span>Searching transcript and formulating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Ask a question about ${currentTitle}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-white border border-slate-300 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-purple-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Press Enter to send</span>
            <span>Grounded strictly in transcript</span>
          </div>
        </div>
      </div>
    </div>
  );
};
