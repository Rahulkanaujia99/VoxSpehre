import { TranscriptionResult } from '@/types/transcription';
import { formatTime } from './audioToneGenerator';

/**
 * Downloads a text-based blob to the user's browser
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export as Plain Text (.txt)
 */
export function exportToTXT(result: TranscriptionResult) {
  let content = `====================================================\n`;
  content += `VOXSPHERE • PENGUIN INTERNATIONAL - SPEECH INTELLIGENCE TRANSCRIPT\n`;
  content += `====================================================\n\n`;
  content += `FILE: ${result.metadata.fileName}\n`;
  content += `DURATION: ${Math.round(result.metadata.duration)}s | FORMAT: ${result.metadata.format}\n`;
  content += `LANGUAGE: ${result.metadata.language} (Confidence: ${result.metadata.detectedConfidence}%)\n`;
  content += `SPEAKERS: ${result.metadata.speakersCount} | WORD COUNT: ${result.metadata.wordCount}\n`;
  content += `DATE GENERATED: ${new Date().toLocaleString()}\n\n`;

  content += `EXECUTIVE SUMMARY:\n${result.summary}\n\n`;
  content += `KEY TOPICS: ${result.keyTopics.join(', ')}\n\n`;
  content += `----------------------------------------------------\n`;
  content += `VERBATIM TRANSCRIPT WITH TIMESTAMPS\n`;
  content += `----------------------------------------------------\n\n`;

  result.segments.forEach((seg) => {
    content += `[${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}] ${seg.speaker.toUpperCase()}:\n`;
    content += `${seg.text}\n\n`;
  });

  content += `\n-- End of VoxSphere Official Transcript --\n`;

  const safeName = result.metadata.fileName.replace(/\.[^/.]+$/, '');
  downloadFile(content, `${safeName}_transcript.txt`, 'text/plain;charset=utf-8');
}

/**
 * Export as Word (.doc)
 * Formatted with corporate HTML compliant with Microsoft Word / Office 365
 */
export function exportToWord(result: TranscriptionResult) {
  const safeName = result.metadata.fileName.replace(/\.[^/.]+$/, '');
  
  let html = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Penguin International Transcript - ${result.metadata.fileName}</title>
    <style>
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 40px; color: #1e293b; }
      .header { border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
      .title { font-size: 24pt; font-weight: bold; color: #0f172a; margin: 0; }
      .brand { font-size: 11pt; color: #0284c7; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
      .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; }
      .meta-table { width: 100%; border-collapse: collapse; }
      .meta-table td { padding: 6px 10px; font-size: 10pt; }
      .meta-label { font-weight: bold; color: #64748b; width: 25%; }
      .summary-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; font-size: 11pt; color: #1e3a8a; }
      .segment { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
      .segment-meta { font-size: 9pt; color: #0284c7; font-weight: bold; margin-bottom: 4px; }
      .speaker { font-weight: bold; color: #0f172a; font-size: 11pt; }
      .text { font-size: 11pt; line-height: 1.6; color: #334155; margin-top: 4px; }
      .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 9pt; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">VoxSphere • Penguin International Speech Intelligence Engine</div>
      <h1 class="title">Official Audio Transcription</h1>
      <div style="font-size: 10pt; color: #64748b;">Acoustic verification score: ${result.metadata.detectedConfidence}% • Zero-loss fidelity</div>
    </div>

    <div class="meta-box">
      <table class="meta-table">
        <tr>
          <td class="meta-label">Original Audio:</td>
          <td><b>${result.metadata.fileName}</b></td>
          <td class="meta-label">Total Duration:</td>
          <td>${Math.round(result.metadata.duration)} seconds</td>
        </tr>
        <tr>
          <td class="meta-label">Language:</td>
          <td>${result.metadata.language}</td>
          <td class="meta-label">Speaker Count:</td>
          <td>${result.metadata.speakersCount} Identified</td>
        </tr>
        <tr>
          <td class="meta-label">Export Timestamp:</td>
          <td>${new Date().toLocaleString()}</td>
          <td class="meta-label">Key Topics:</td>
          <td>${result.keyTopics.join(', ')}</td>
        </tr>
      </table>
    </div>

    <div class="summary-box">
      <b>Executive Summary:</b><br/>
      ${result.summary}
    </div>

    <h2 style="font-size: 14pt; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Verbatim Transcript</h2>
  `;

  result.segments.forEach(seg => {
    html += `
    <div class="segment">
      <div class="segment-meta">TIMESTAMP: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}</div>
      <div class="speaker">${seg.speaker}</div>
      <div class="text">${seg.text}</div>
    </div>
    `;
  });

  html += `
    <div class="footer">
      Generated securely via VoxSphere by Penguin International • www.penguin-international.com
    </div>
  </body>
  </html>
  `;

  downloadFile(html, `${safeName}_transcript.doc`, 'application/msword;charset=utf-8');
}

/**
 * Export as SubRip (.srt)
 */
export function exportToSRT(result: TranscriptionResult) {
  const safeName = result.metadata.fileName.replace(/\.[^/.]+$/, '');
  
  function formatSRTTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    const millis = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${hrs}:${mins}:${secs},${millis}`;
  }

  let srt = '';
  result.segments.forEach((seg, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatSRTTime(seg.startTime)} --> ${formatSRTTime(seg.endTime)}\n`;
    srt += `[${seg.speaker}]: ${seg.text}\n\n`;
  });

  downloadFile(srt, `${safeName}.srt`, 'text/plain;charset=utf-8');
}

/**
 * Export as PDF via Clean Formatted Printable Window / Blob
 */
export function exportToPDF(result: TranscriptionResult) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the printable PDF document.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>VoxSphere Transcript - ${result.metadata.fileName}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 20mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.5;
          margin: 0;
          padding: 24px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .logo-text {
          font-size: 20px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: -0.5px;
        }
        .logo-sub {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid #bae6fd;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          font-size: 13px;
        }
        .meta-item b {
          color: #475569;
          display: inline-block;
          width: 130px;
        }
        .summary-card {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-left: 4px solid #16a34a;
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }
        .summary-title {
          font-size: 13px;
          font-weight: 700;
          color: #15803d;
          margin-bottom: 4px;
        }
        .segment {
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          page-break-inside: avoid;
        }
        .seg-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .seg-speaker {
          font-weight: 700;
          color: #0369a1;
        }
        .seg-time {
          color: #94a3b8;
          font-family: monospace;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .seg-text {
          font-size: 14px;
          color: #334155;
          line-height: 1.6;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; background: #3b82f6; color: white; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span>Click <b>Print</b> or press <b>Ctrl+P</b> to save as PDF.</span>
        <button onclick="window.print()" style="background: white; color: #1d4ed8; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
          Print / Save PDF
        </button>
      </div>

      <div class="header">
        <div>
          <div class="logo-text">VOXSPHERE</div>
          <div class="logo-sub">Enterprise Speech Intelligence • Penguin International</div>
        </div>
        <div class="badge">
          Accuracy: ${result.metadata.detectedConfidence}% • Verified
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><b>Audio File:</b> ${result.metadata.fileName}</div>
        <div class="meta-item"><b>Total Duration:</b> ${Math.round(result.metadata.duration)}s</div>
        <div class="meta-item"><b>Language:</b> ${result.metadata.language}</div>
        <div class="meta-item"><b>Speakers:</b> ${result.metadata.speakersCount} detected</div>
        <div class="meta-item"><b>Word Count:</b> ${result.metadata.wordCount} words</div>
        <div class="meta-item"><b>Generated:</b> ${new Date().toLocaleDateString()}</div>
      </div>

      <div class="summary-card">
        <div class="summary-title">Executive Summary</div>
        <div style="font-size: 13px; color: #166534;">${result.summary}</div>
      </div>

      <h3 style="margin-top: 24px; font-size: 16px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
        Verbatim Transcript Segments
      </h3>

      ${result.segments.map(seg => `
        <div class="segment">
          <div class="seg-header">
            <span class="seg-speaker">${seg.speaker}</span>
            <span class="seg-time">${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}</span>
          </div>
          <div class="seg-text">${seg.text}</div>
        </div>
      `).join('')}

      <div class="footer">
        Confidential Transcript Document • VoxSphere by Penguin International • Strategic Intelligence
      </div>

      <script>
        // Trigger print dialog automatically after document render
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 400);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
