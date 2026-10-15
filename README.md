# Penguin Transcription Studio 🐧🎙️

A modern, high-accuracy AI speech-to-text transcription studio built with Next.js 16, React 19, and Tailwind CSS. Supports real-time microphone recording, multi-format audio uploads, audio playback with waveforms, speaker diarization, interactive transcript editing, and exports to TXT, SRT, VTT, and JSON.

---

## 🚀 Features

- **Multi-Engine AI Transcription**:
  - **Google Gemini 2.0 Flash**: Multimodal speech recognition and intelligence.
  - **Groq Whisper**: Blazing fast `whisper-large-v3-turbo` inference.
  - **OpenAI Whisper**: Industry-standard `whisper-1` model.
- **Interactive Transcript Editor**:
  - Real-time timestamp syncing with audio player.
  - Editable text segments and speaker tags.
  - Copy to clipboard & one-click export (TXT, SRT, VTT, JSON).
- **Audio Studio**:
  - Live microphone recording with level meter.
  - Drag-and-drop file upload (MP3, WAV, M4A, FLAC, OGG, WebM).
  - Built-in audio samples and synthetic tone generation for instant testing.

---

## 🌐 Deploy to Vercel

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Enter a repository name (e.g., `penguin-transcription`).
3. Keep it **Public** or **Private**, do **NOT** check "Initialize with README".
4. Click **Create repository**.

### Step 2: Link and Push to GitHub
From your terminal inside the `Transcription/Transcription` folder, run:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/penguin-transcription.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Under **Import Git Repository**, find your `penguin-transcription` repository and click **Import**.
4. The framework will automatically be detected as **Next.js**.
5. *(Optional)* Expand **Environment Variables** and add any keys you'd like to provide globally:
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `GROQ_API_KEY`: Your Groq Console API key
   - `OPENAI_API_KEY`: Your OpenAI API key
6. Click **Deploy**.

Vercel will build and launch your application on a live HTTPS domain (e.g. `https://penguin-transcription.vercel.app`).

---

## 💻 Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠️ Production Build

```bash
npm run build
npm run start
```
