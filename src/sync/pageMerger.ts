import { Page, Stroke, Shape, TextObject, ImageObject } from '../types';

/**
 * Merges a local page and a remote page using element-level CRDT Last-Write-Wins (LWW):
 * - For each element (strokes, shapes, texts, images) matched by `id`:
 *   the version with the higher `updatedAt` wins.
 * - Elements marked `deleted: true` are preserved with their deleted state according to the higher `updatedAt`.
 * - For page-level properties (title, order, background, etc.), the page with the higher `updatedAt` wins.
 */
export function mergePages(local: Page, remote: Page): Page {
  const remoteIsNewer = remote.updatedAt > local.updatedAt;
  const base = remoteIsNewer ? remote : local;

  function mergeElements<T extends { id: string; updatedAt: number; deleted?: boolean }>(
    localList: T[] = [],
    remoteList: T[] = []
  ): T[] {
    const map = new Map<string, T>();

    for (const item of localList) {
      map.set(item.id, { ...item });
    }

    for (const remoteItem of remoteList) {
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, { ...remoteItem });
      } else {
        if (remoteItem.updatedAt > localItem.updatedAt) {
          map.set(remoteItem.id, { ...remoteItem });
        } else {
          map.set(remoteItem.id, { ...localItem });
        }
      }
    }

    return Array.from(map.values());
  }

  return {
    ...base,
    title: remoteIsNewer ? remote.title : local.title,
    order: remoteIsNewer ? remote.order : local.order,
    width: remoteIsNewer ? remote.width : local.width,
    height: remoteIsNewer ? remote.height : local.height,
    background: remoteIsNewer ? remote.background : local.background,
    deleted: (remoteIsNewer ? remote.deleted : local.deleted) ?? false,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    strokes: mergeElements<Stroke>(local.strokes, remote.strokes),
    shapes: mergeElements<Shape>(local.shapes, remote.shapes),
    texts: mergeElements<TextObject>(local.texts, remote.texts),
    images: mergeElements<ImageObject>(local.images, remote.images),
  };
}
