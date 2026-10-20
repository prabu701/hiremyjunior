'use client';
import { AppError } from './rpc';
import { getSupabase } from './supabase/client';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };

/** Upload a File to `${folder}/${name}.${ext}` in a bucket; returns the object path. */
export async function uploadFile(bucket: string, folder: string, name: string, file: File): Promise<string> {
  const contentType = file.type || 'image/jpeg';
  const path = `${folder}/${name}.${EXT[contentType] ?? 'jpg'}`;
  const { error } = await getSupabase().storage.from(bucket).upload(path, file, { contentType, upsert: false });
  if (error) {
    console.warn('[hmj] upload failed', error);
    throw new AppError(/size|large/i.test(error.message) ? 'That file is too large.' : 'Upload failed. Please try again.');
  }
  return path;
}
