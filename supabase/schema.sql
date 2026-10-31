-- ==============================================================================
-- VoxSphere AI Transcription Studio — Supabase Database & Storage Schema
-- ==============================================================================
-- Run this script in your Supabase Project: Dashboard > SQL Editor > New Query
--
-- Features configured:
-- 1. User Profiles table (synced automatically with Supabase Auth)
-- 2. Transcriptions table (stores transcripts, segments, summaries, sentiment, audio URLs)
-- 3. Row Level Security (RLS) policies (ensures private per-user history)
-- 4. Storage Bucket configuration for audio recordings
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE (Auto-synced with Supabase Auth users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 2. TRANSCRIPTIONS TABLE (Stores all transcription documents per user)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size TEXT,
  duration NUMERIC DEFAULT 0,
  audio_url TEXT,
  storage_path TEXT,
  format TEXT DEFAULT 'mp3',
  language TEXT DEFAULT 'en',
  detected_confidence NUMERIC DEFAULT 0.95,
  word_count INT DEFAULT 0,
  speakers_count INT DEFAULT 1,
  sentiment TEXT DEFAULT 'neutral',
  summary TEXT DEFAULT '',
  key_topics TEXT[] DEFAULT '{}',
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_segments JSONB DEFAULT '[]'::jsonb,
  comprehensive_summaries JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create performance indexes for user queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON public.transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON public.transcriptions(created_at DESC);

-- Enable RLS on transcriptions
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Transcriptions RLS Policies: Private per-user access
CREATE POLICY "Users can view their own transcriptions"
  ON public.transcriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcriptions"
  ON public.transcriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcriptions"
  ON public.transcriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcriptions"
  ON public.transcriptions FOR DELETE
  USING (auth.uid() = user_id);


-- ==============================================================================
-- 3. STORAGE BUCKET FOR AUDIO FILES (voxsphere-audio)
-- ==============================================================================
-- Create the audio storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voxsphere-audio',
  'voxsphere-audio',
  true,
  104857600, -- 100 MB max size
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 104857600;

-- Storage RLS Policies: Users can upload/read their own files in `voxsphere-audio/{user_id}/*`
CREATE POLICY "Users can upload their own audio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voxsphere-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view and download audio files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voxsphere-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read for public audio files in voxsphere-audio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'voxsphere-audio');

CREATE POLICY "Users can delete their own audio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voxsphere-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
