import { getSupabase } from './supabaseClient';
import { ImageObject, Page } from '../types';

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

// In-memory cache for signed URLs: storagePath -> { url, expiresAt }
const signedUrlCache = new Map<string, CachedSignedUrl>();

// Callbacks to notify canvas or editor when a signed URL has been resolved
const imageResolvedListeners = new Set<() => void>();

export function subscribeImageResolved(listener: () => void): () => void {
  imageResolvedListeners.add(listener);
  return () => {
    imageResolvedListeners.delete(listener);
  };
}

function notifyImageResolved() {
  imageResolvedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Extracts storage relative path (userId/pageId/imageId.png) if src is a storage path
 * or legacy public Supabase URL. Returns null for pure base64 or external URLs.
 */
export function extractStoragePath(src: string): string | null {
  if (!src) return null;
  if (src.startsWith('data:')) return null;

  // Legacy public Supabase Storage URL
  if (src.includes('/storage/v1/object/public/page-images/')) {
    const after = src.split('/storage/v1/object/public/page-images/')[1];
    return after ? after.split('?')[0] : null;
  }

  // Legacy signed Supabase Storage URL
  if (src.includes('/storage/v1/object/sign/page-images/')) {
    const after = src.split('/storage/v1/object/sign/page-images/')[1];
    return after ? after.split('?')[0] : null;
  }

  if (src.includes('/page-images/')) {
    const after = src.split('/page-images/')[1];
    return after ? after.split('?')[0] : null;
  }

  // Stored relative path: userId/pageId/imageId.ext
  if (!src.includes('://') && src.includes('/')) {
    return src;
  }

  return null;
}

/**
 * Uploads a base64 image to private Supabase Storage (bucket: page-images)
 * and returns the relative storage path (userId/pageId/imageId.png).
 * If already a remote URL/path or offline, returns the original src unchanged.
 */
export async function uploadImageToStorage(
  img: ImageObject,
  userId: string,
  pageId: string
): Promise<string> {
  if (!img.src || !img.src.startsWith('data:')) {
    return img.src; // Already a storage path or remote URL
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
    const rawExt = mimeType.split('/')[1] || 'png';
    const extension = rawExt === 'jpeg' ? 'jpg' : rawExt;

    // Convert base64 to binary ArrayBuffer
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mimeType });

    // Path format: userId/pageId/imageId.ext
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

    // Cache the original base64 temporarily so local rendering never flickers
    signedUrlCache.set(filePath, {
      url: img.src,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    // Return file path (userId/pageId/imageId.png) to be stored in the page record
    return filePath;
  } catch (err) {
    console.warn('[ImageStorage] Failed to upload image:', err);
    return img.src;
  }
}

/**
 * Obtains a 1-hour signed URL for a private storage image.
 * Uses cached signed URLs when valid. Leaves base64 and external URLs unchanged.
 */
export async function getSignedImageUrl(srcOrPath: string): Promise<string> {
  if (!srcOrPath) return '';
  if (srcOrPath.startsWith('data:')) return srcOrPath;

  const storagePath = extractStoragePath(srcOrPath);
  if (!storagePath) {
    return srcOrPath; // External HTTP URL
  }

  const cached = signedUrlCache.get(storagePath);
  // Re-use cache if at least 2 minutes remain before expiration
  if (cached && Date.now() < cached.expiresAt - 120000) {
    return cached.url;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return cached ? cached.url : srcOrPath;
  }

  try {
    // 3600 seconds = 1 hour validity
    const { data, error } = await supabase.storage
      .from('page-images')
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      console.warn('[ImageStorage] createSignedUrl error for', storagePath, error?.message);
      return cached ? cached.url : srcOrPath;
    }

    const signedUrl = data.signedUrl;
    signedUrlCache.set(storagePath, {
      url: signedUrl,
      expiresAt: Date.now() + 3600 * 1000,
    });

    notifyImageResolved();
    return signedUrl;
  } catch (err) {
    console.warn('[ImageStorage] Exception creating signed URL:', err);
    return cached ? cached.url : srcOrPath;
  }
}

/**
 * Synchronous URL resolver for canvas rendering.
 * Returns cached signed URL if available, or original src if base64/external.
 * Kicks off background fetch if not yet in cache.
 */
export function getResolvedImageUrl(srcOrPath: string): string {
  if (!srcOrPath) return '';
  if (srcOrPath.startsWith('data:')) return srcOrPath;

  const storagePath = extractStoragePath(srcOrPath);
  if (!storagePath) {
    return srcOrPath;
  }

  const cached = signedUrlCache.get(storagePath);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  // Trigger background fetch and notify canvas once ready
  getSignedImageUrl(srcOrPath).then(() => {
    notifyImageResolved();
  });

  return cached ? cached.url : '';
}

/**
 * Preloads signed URLs for all images on a page, and refreshes them before expiration.
 */
export async function preparePageImages(page: Page, onResolved?: () => void): Promise<void> {
  if (!page || !page.images || page.images.length === 0) return;

  const promises = page.images
    .filter((img) => !img.deleted && img.src)
    .map((img) => getSignedImageUrl(img.src));

  await Promise.all(promises);
  if (onResolved) {
    onResolved();
  }
}

