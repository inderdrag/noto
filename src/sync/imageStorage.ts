import { getSupabase } from './supabaseClient';
import { ImageObject } from '../types';

/**
 * Uploads a base64 image data URL to Supabase Storage (bucket: page-images)
 * and returns the public CDN URL. If already a remote URL or not authenticated,
 * returns the original src unchanged.
 */
export async function uploadImageToStorage(
  img: ImageObject,
  userId: string,
  pageId: string
): Promise<string> {
  if (!img.src || !img.src.startsWith('data:')) {
    return img.src; // Already a remote URL
  }

  const supabase = getSupabase();
  if (!supabase || !userId) {
    return img.src;
  }

  try {
    // Extract mime type and base64 payload
    const matches = img.src.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) return img.src;

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType.split('/')[1] || 'png';

    // Convert base64 to binary ArrayBuffer
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mimeType });

    const filePath = `${userId}/${pageId}/${img.id}.${extension}`;

    const { error } = await supabase.storage
      .from('page-images')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.warn('[ImageStorage] Upload error:', error.message);
      return img.src;
    }

    const { data: publicUrlData } = supabase.storage
      .from('page-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || img.src;
  } catch (err) {
    console.warn('[ImageStorage] Failed to upload image:', err);
    return img.src;
  }
}
