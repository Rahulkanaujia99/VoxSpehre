import { createClient, isSupabaseConfigured } from './client';
import { TranscriptionResult, HistoryItem } from '@/types/transcription';
import { TranscriptionRecord, recordToTranscriptionResult } from './types';

export const uploadAudioToStorage = async (
  userId: string,
  fileOrBlob: Blob | File,
  fileName: string
): Promise<{ audioUrl: string | null; storagePath: string | null }> => {
  if (!isSupabaseConfigured()) return { audioUrl: null, storagePath: null };
  const supabase = createClient();

  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('voxsphere-audio')
      .upload(storagePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError.message);
      return { audioUrl: null, storagePath: null };
    }

    const { data: publicData } = supabase.storage
      .from('voxsphere-audio')
      .getPublicUrl(storagePath);

    return {
      audioUrl: publicData?.publicUrl || null,
      storagePath,
    };
  } catch (err) {
    console.error('Failed to upload audio to Supabase Storage:', err);
    return { audioUrl: null, storagePath: null };
  }
};

export const fetchCloudTranscriptions = async (): Promise<HistoryItem[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching cloud transcriptions:', error.message);
    return [];
  }

  return (data as TranscriptionRecord[]).map((record) => ({
    id: record.id,
    fileName: record.file_name,
    date: new Date(record.created_at).toLocaleString(),
    duration: record.duration,
    wordCount: record.word_count,
    speakersCount: record.speakers_count,
    result: recordToTranscriptionResult(record),
  }));
};

export const saveCloudTranscription = async (
  result: TranscriptionResult,
  audioBlobOrFile?: Blob | File | null,
  existingId?: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let audioUrl: string | null = null;
  let storagePath: string | null = null;

  if (audioBlobOrFile) {
    const uploadResult = await uploadAudioToStorage(
      user.id,
      audioBlobOrFile,
      result.metadata.fileName
    );
    audioUrl = uploadResult.audioUrl;
    storagePath = uploadResult.storagePath;
  }

  const payload = {
    user_id: user.id,
    file_name: result.metadata.fileName,
    file_size: result.metadata.fileSize,
    duration: result.metadata.duration,
    audio_url: audioUrl,
    storage_path: storagePath,
    format: result.metadata.format,
    language: result.metadata.language,
    detected_confidence: result.metadata.detectedConfidence,
    word_count: result.metadata.wordCount,
    speakers_count: result.metadata.speakersCount,
    sentiment: result.sentiment,
    summary: result.summary,
    key_topics: result.keyTopics,
    segments: result.segments,
    original_segments: result.originalSegments || result.segments,
    comprehensive_summaries: result.comprehensiveSummaries || {},
    updated_at: new Date().toISOString(),
  };

  if (existingId && existingId.startsWith('doc-') === false) {
    // Update existing record
    const { error } = await supabase
      .from('transcriptions')
      .update(payload)
      .eq('id', existingId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update cloud transcription:', error.message);
      return null;
    }
    return existingId;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save cloud transcription:', error.message);
      return null;
    }
    return data?.id || null;
  }
};

export const updateCloudTranscription = async (
  id: string,
  updates: Partial<TranscriptionResult>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.segments) payload.segments = updates.segments;
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.keyTopics) payload.key_topics = updates.keyTopics;
  if (updates.sentiment) payload.sentiment = updates.sentiment;
  if (updates.comprehensiveSummaries) payload.comprehensive_summaries = updates.comprehensiveSummaries;

  const { error } = await supabase
    .from('transcriptions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating cloud transcription:', error.message);
    return false;
  }
  return true;
};

export const deleteCloudTranscription = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // First fetch storage path if any
  const { data: record } = await supabase
    .from('transcriptions')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (record?.storage_path) {
    await supabase.storage
      .from('voxsphere-audio')
      .remove([record.storage_path])
      .catch((e) => console.warn('Could not remove audio file from storage:', e));
  }

  const { error } = await supabase
    .from('transcriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete cloud transcription:', error.message);
    return false;
  }
  return true;
};
