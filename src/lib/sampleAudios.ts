import { TranscriptionResult } from '@/types/transcription';

export interface DemoSample {
  id: string;
  title: string;
  category: string;
  durationSeconds: number;
  data: TranscriptionResult;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'sample-strategic-intelligence',
    title: 'Strategic Market Intelligence & Expert Interview',
    category: 'Strategic Intelligence',
    durationSeconds: 58,
    data: {
      metadata: {
        fileName: 'Penguin_Strategic_Intelligence_Expert_Call.wav',
        fileSize: '4.8 MB',
        duration: 58,
        format: 'WAV 48kHz Stereo',
        language: 'English (Executive Business)',
        detectedConfidence: 99.6,
        wordCount: 164,
        speakersCount: 3,
      },
      summary: 'Executive expert consultation synthesized by Penguin International. Discussion explores Global Capability Center expansion, contextual research frameworks, and AI-assisted data pipeline optimization.',
      keyTopics: ['Strategic Intelligence', 'AI × Human Research', 'GCC Acceleration', 'Data to Dashboards'],
      sentiment: 'positive',
      segments: [
        {
          id: 'seg-1',
          speaker: 'Lead Strategic Analyst (Penguin International)',
          startTime: 0,
          endTime: 12,
          text: 'Welcome to this strategic intelligence briefing. Today we are synthesizing industry feedback on enterprise AI adoption across global capability centers.',
          confidence: 0.99
        },
        {
          id: 'seg-2',
          speaker: 'Managing Partner (Consulting Firm)',
          startTime: 13,
          endTime: 28,
          text: 'Our clients are demanding rapid turnaround on expert interviews. Combining Penguin International’s automated transcription with deep human research analysts has delivered a massive advantage.',
          confidence: 0.99
        },
        {
          id: 'seg-3',
          speaker: 'VP of Knowledge Services',
          startTime: 29,
          endTime: 44,
          text: 'Exactly. Raw speech is converted into structured intelligence, verified for technical nuances, and fed directly into our Data to Dashboards executive portals.',
          confidence: 0.98
        },
        {
          id: 'seg-4',
          speaker: 'Lead Strategic Analyst (Penguin International)',
          startTime: 45,
          endTime: 58,
          text: 'Understood. All findings are categorized with verbatim timestamps, ready for corporate board distribution and stakeholder sign-off.',
          confidence: 0.99
        }
      ]
    }
  },
  {
    id: 'sample-pe-due-diligence',
    title: 'Private Equity & Boardroom Due Diligence Brief',
    category: 'M&A & Private Equity',
    durationSeconds: 74,
    data: {
      metadata: {
        fileName: 'Penguin_PE_DueDiligence_Review.m4a',
        fileSize: '6.2 MB',
        duration: 74,
        format: 'M4A 128kbps AAC',
        language: 'English (Financial Intelligence)',
        detectedConfidence: 99.8,
        wordCount: 208,
        speakersCount: 3,
      },
      summary: 'Strategic evaluation of target market positioning for a Fortune 500 client. Verbatim transcript aligned with qualitative survey portal metrics and benchmark reporting.',
      keyTopics: ['Market Research', 'Fortune 500 Strategy', 'Survey Portal', 'Investment Intelligence'],
      sentiment: 'positive',
      segments: [
        {
          id: 'seg-pe-1',
          speaker: 'Investment Director',
          startTime: 0,
          endTime: 18,
          text: 'Good morning committee. Penguin International has finalized the comprehensive primary research and expert voice transcripts for the Q3 target review.',
          confidence: 0.99
        },
        {
          id: 'seg-pe-2',
          speaker: 'Head of Strategic Intelligence',
          startTime: 19,
          endTime: 38,
          text: 'We transcribed fifty-two hours of industry leadership interviews with zero transcription errors, highlighting key competitive threats and organic market headroom.',
          confidence: 0.99
        },
        {
          id: 'seg-pe-3',
          speaker: 'Senior Portfolio Analyst',
          startTime: 39,
          endTime: 56,
          text: 'The automated executive takeaways enabled our investment partners to review key market signals in minutes rather than days.',
          confidence: 0.98
        },
        {
          id: 'seg-pe-4',
          speaker: 'Investment Director',
          startTime: 57,
          endTime: 74,
          text: 'Outstanding precision. Let us export the certified briefing package to Word and PDF for the final investment committee presentation.',
          confidence: 0.99
        }
      ]
    }
  },
  {
    id: 'sample-gcc-operations',
    title: 'Global Capability Center (GCC) Knowledge Operations',
    category: 'GCC Solutions',
    durationSeconds: 52,
    data: {
      metadata: {
        fileName: 'Penguin_GCC_Knowledge_Sync_Session.mp3',
        fileSize: '3.9 MB',
        duration: 52,
        format: 'MP3 320kbps',
        language: 'English (Enterprise Research)',
        detectedConfidence: 99.2,
        wordCount: 152,
        speakersCount: 2,
      },
      summary: 'Operational sync on establishing dedicated research capability pods in Gurugram, India, supporting US and European Fortune 500 decision-making.',
      keyTopics: ['GCC Setup Services', 'Knowledge Operations', 'Data to Dashboards', 'Global Delivery'],
      sentiment: 'analytical',
      segments: [
        {
          id: 'seg-gcc-1',
          speaker: 'Global Operations Lead',
          startTime: 0,
          endTime: 16,
          text: 'Session recording started. Reviewing the knowledge transfer workflows for our enterprise capability center in Gurugram.',
          confidence: 0.99
        },
        {
          id: 'seg-gcc-2',
          speaker: 'Enterprise Solutions Architect',
          startTime: 17,
          endTime: 34,
          text: 'All audio streams, survey inputs, and analyst briefings are centralized through Penguin International’s secure intelligence hub with full data privacy compliance.',
          confidence: 0.98
        },
        {
          id: 'seg-gcc-3',
          speaker: 'Global Operations Lead',
          startTime: 35,
          endTime: 52,
          text: 'Confirmed. The strategic output is seamless across time zones, enabling 24/7 decision support for our global advisory partners.',
          confidence: 0.99
        }
      ]
    }
  }
];
