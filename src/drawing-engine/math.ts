import { Point, Stroke, Shape } from '../types';

/**
 * Calculates distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates distance from point P to line segment AB
 */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  });
}

/**
 * Checks if a circle (center, radius) intersects any segment of a stroke
 */
export function strokeIntersectsCircle(stroke: Stroke, center: Point, radius: number): boolean {
  if (stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    return distance(stroke.points[0], center) <= radius + stroke.width / 2;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    if (distToSegment(center, p1, p2) <= radius + stroke.width / 2) {
      return true;
    }
  }
  return false;
}

/**
 * Slices a stroke by removing points within eraser radius.
 * Splits into multiple continuous strokes if cut in the middle.
 */
export function sliceStrokeByEraser(stroke: Stroke, center: Point, eraserRadius: number): Stroke[] {
  const effectiveRadius = eraserRadius + stroke.width * 0.4;
  const result: Stroke[] = [];
  let currentSegment: Point[] = [];

  for (let i = 0; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    const isErased = distance(pt, center) <= effectiveRadius;

    if (!isErased) {
      currentSegment.push(pt);
    } else {
      if (currentSegment.length >= 2) {
        result.push({
          ...stroke,
          id: `${stroke.id}_part_${result.length}_${Date.now()}`,
          points: [...currentSegment],
          updatedAt: Date.now(),
        });
      }
      currentSegment = [];
    }
  }

  if (currentSegment.length >= 2) {
    result.push({
      ...stroke,
      id: `${stroke.id}_part_${result.length}_${Date.now()}`,
      points: currentSegment,
      updatedAt: Date.now(),
    });
  }

  return result;
}

/**
 * Computes bounding box for a list of points
 */
export function getPointsBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Computes bounding box for a stroke including line width
 */
export function getStrokeBounds(stroke: Stroke): { x: number; y: number; width: number; height: number } {
  const b = getPointsBounds(stroke.points);
  const pad = stroke.width / 2 + 4;
  return {
    x: b.minX - pad,
    y: b.minY - pad,
    width: b.maxX - b.minX + pad * 2,
    height: b.maxY - b.minY + pad * 2,
  };
}

/**
 * Computes bounding box for a shape
 */
export function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  const pad = shape.strokeWidth / 2 + 2;
  const x = Math.min(shape.x, shape.x + shape.width) - pad;
  const y = Math.min(shape.y, shape.y + shape.height) - pad;
  const width = Math.abs(shape.width) + pad * 2;
  const height = Math.abs(shape.height) + pad * 2;
  return { x, y, width, height };
}

/**
 * Checks if a point is inside a rectangle
 */
export function pointInRect(p: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  const minX = Math.min(rect.x, rect.x + rect.width);
  const maxX = Math.max(rect.x, rect.x + rect.width);
  const minY = Math.min(rect.y, rect.y + rect.height);
  const maxY = Math.max(rect.y, rect.y + rect.height);
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

/**
 * Checks if two axis-aligned rectangles intersect or touch
 */
export function rectIntersectsRect(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  const r1Right = r1.x + r1.width;
  const r1Bottom = r1.y + r1.height;
  const r2Right = r2.x + r2.width;
  const r2Bottom = r2.y + r2.height;

  const minX1 = Math.min(r1.x, r1Right);
  const maxX1 = Math.max(r1.x, r1Right);
  const minY1 = Math.min(r1.y, r1Bottom);
  const maxY1 = Math.max(r1.y, r1Bottom);

  const minX2 = Math.min(r2.x, r2Right);
  const maxX2 = Math.max(r2.x, r2Right);
  const minY2 = Math.min(r2.y, r2Bottom);
  const maxY2 = Math.max(r2.y, r2Bottom);
  return minX1 <= maxX2 && maxX1 >= minX2 && minY1 <= maxY2 && maxY1 >= minY2;
}

export function isPointInImage(
  p: Point,
  img: { x: number; y: number; width: number; height: number },
  tolerance = 12
): boolean {
  const minX = Math.min(img.x, img.x + img.width) - tolerance;
  const maxX = Math.max(img.x, img.x + img.width) + tolerance;
  const minY = Math.min(img.y, img.y + img.height) - tolerance;
  const maxY = Math.max(img.y, img.y + img.height) + tolerance;
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

export function getImageBounds(
  img: { x: number; y: number; width: number; height: number },
  pad = 0
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(img.x, img.x + img.width) - pad;
  const y = Math.min(img.y, img.y + img.height) - pad;
  const width = Math.abs(img.width) + pad * 2;
  const height = Math.abs(img.height) + pad * 2;
  return { x, y, width, height };
}

/**
 * Smooths stroke points using Chaikin corner-cutting algorithm for natural, silky handwriting
 */
export function smoothPoints(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Single in-place lightweight smoothing without inflating point count
  const smoothed: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    smoothed.push({
      x: 0.25 * prev.x + 0.5 * curr.x + 0.25 * next.x,
      y: 0.25 * prev.y + 0.5 * curr.y + 0.25 * next.y,
      pressure: curr.pressure,
      time: curr.time,
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}
