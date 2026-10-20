import type { ImagePickerAsset } from 'expo-image-picker';
import { AppError } from './rpc';
import { supabase } from './supabase';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };

/** Upload a picked image to a bucket under `${folder}/${name}.${ext}`; returns the object path. */
export async function uploadAsset(bucket: string, folder: string, name: string, asset: ImagePickerAsset): Promise<string> {
  const contentType = asset.mimeType ?? 'image/jpeg';
  const path = `${folder}/${name}.${EXT[contentType] ?? 'jpg'}`;
  // fetch() works for both native file:// URIs and web blob: URLs.
  const body = await fetch(asset.uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) {
    console.warn('[hmj] upload failed', error);
    throw new AppError(/size/i.test(error.message) ? 'That file is too large (max 10 MB).' : 'Upload failed. Please try again.');
  }
  return path;
}
