import { Notebook, Page, Stroke, Shape, TextObject, ImageObject } from '../types';

export function normalizeStroke(s: Stroke): Stroke {
  return {
    ...s,
    deleted: s.deleted ?? false,
    updatedAt: s.updatedAt || s.createdAt || Date.now(),
  };
}

export function normalizeShape(sh: Shape): Shape {
  return {
    ...sh,
    deleted: sh.deleted ?? false,
    updatedAt: sh.updatedAt || sh.createdAt || Date.now(),
  };
}

export function normalizeText(t: TextObject): TextObject {
  return {
    ...t,
    deleted: t.deleted ?? false,
    updatedAt: t.updatedAt || t.createdAt || Date.now(),
  };
}

export function normalizeImage(img: ImageObject): ImageObject {
  return {
    ...img,
    deleted: img.deleted ?? false,
    updatedAt: img.updatedAt || img.createdAt || Date.now(),
  };
}

export function normalizePage(p: Page): Page {
  return {
    ...p,
    height: p.height > 1200 ? 1150 : (p.height || 1150),
    deleted: p.deleted ?? false,
    updatedAt: p.updatedAt || p.createdAt || Date.now(),
    strokes: (p.strokes || []).map(normalizeStroke),
    shapes: (p.shapes || []).map(normalizeShape),
    texts: (p.texts || []).map(normalizeText),
    images: (p.images || []).map(normalizeImage),
  };
}

export function normalizeNotebook(nb: Notebook): Notebook {
  return {
    ...nb,
    updatedAt: nb.updatedAt || nb.createdAt || Date.now(),
    pages: (nb.pages || []).map(normalizePage),
  };
}
