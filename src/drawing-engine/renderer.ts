import { Page, PageBackground, Stroke, Shape, TextObject, ImageObject, SelectionBox } from '../types';
import { getResolvedImageUrl } from '../sync/imageStorage';

// In-memory cache for loaded HTMLImageElements
const imageCache = new Map<string, HTMLImageElement>();
let globalImageLoadCallback: (() => void) | null = null;

// Offscreen canvas cache for rendered paper backgrounds (grid, ruled, dots, paper color)
const bgCanvasCache = new Map<string, HTMLCanvasElement>();

export function setGlobalImageLoadCallback(callback: (() => void) | null) {
  globalImageLoadCallback = callback;
}

export function getCachedImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.onload = () => {
    if (globalImageLoadCallback) {
      globalImageLoadCallback();
    }
  };
  img.src = src;
  imageCache.set(src, img);
  return null;
}

/**
 * Helper to determine if a hex color is dark
 */
export function isColorDark(hex: string): boolean {
  if (!hex || hex === 'transparent') return false;
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  // Perceived brightness formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

/**
 * Draws the paper background and grid/ruled/dots patterns
 * Crisp, clearly visible white grid on dark/midnight paper; vivid blue or graphite on light paper.
 * Bound strictly within the sheet limits.
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: PageBackground,
  _bounds?: { minX: number; minY: number; maxX: number; maxY: number },
  pageOrderOrIndex: number = 0
) {
  // Use cached offscreen canvas when available for smooth 60fps/120fps hardware-accelerated rendering
  const cacheKey = `${width}_${height}_${bg.color}_${bg.type}_${bg.gridSize || 25}_${bg.gridColor || ''}_${pageOrderOrIndex % 2}`;
  const cached = bgCanvasCache.get(cacheKey);
  if (cached) {
    ctx.drawImage(cached, 0, 0);
    return;
  }

  // Create offscreen canvas to cache the background
  const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const targetCtx = offCanvas ? offCanvas.getContext('2d') : null;

  if (offCanvas && targetCtx) {
    offCanvas.width = width;
    offCanvas.height = height;
    drawBackgroundToContext(targetCtx, width, height, bg, pageOrderOrIndex);
    
    // Store in cache (limit cache to 20 entries to prevent memory buildup)
    if (bgCanvasCache.size > 20) {
      const firstKey = bgCanvasCache.keys().next().value;
      if (firstKey) bgCanvasCache.delete(firstKey);
    }
    bgCanvasCache.set(cacheKey, offCanvas);
    ctx.drawImage(offCanvas, 0, 0);
    return;
  }

  // Fallback to direct rendering if offscreen canvas cannot be created
  drawBackgroundToContext(ctx, width, height, bg, pageOrderOrIndex);
}

function drawBackgroundToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: PageBackground,
  pageOrderOrIndex: number
) {
  const x0 = 0;
  const y0 = 0;
  const x1 = width;
  const y1 = height;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, width, height);
  ctx.clip();

  // 1. Fill paper surface
  ctx.fillStyle = bg.color;
  ctx.fillRect(x0, y0, width, height);

  if (bg.type === 'blank') {
    ctx.restore();
    return;
  }

  const darkPaper = isColorDark(bg.color);

  // Soft, eye-friendly grid colors
  let lineColor: string;
  let lineAlpha: number;

  if (darkPaper) {
    lineColor = '#CBD5E1';
    lineAlpha = 0.22;
  } else {
    if (!bg.gridColor || bg.gridColor === '#E2E8F0' || bg.gridColor === '#CBD5E1' || bg.gridColor === '#FFFFFF') {
      lineColor = '#3B82F6'; // School notebook blue
    } else {
      lineColor = bg.gridColor;
    }
    lineAlpha = 0.35;
  }

  ctx.strokeStyle = lineColor;
  ctx.fillStyle = lineColor;
  ctx.globalAlpha = lineAlpha;
  ctx.lineWidth = 1;

  const size = Math.max(16, bg.gridSize || 25);
  const offset = 0.5;

  if (bg.type === 'grid') {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += size) {
      const coord = Math.round(x) + offset;
      ctx.moveTo(coord, y0);
      ctx.lineTo(coord, y1);
    }
    for (let y = y0; y <= y1; y += size) {
      const coord = Math.round(y) + offset;
      ctx.moveTo(x0, coord);
      ctx.lineTo(x1, coord);
    }
    ctx.stroke();
  } else if (bg.type === 'ruled' || (bg.type as string) === 'lines') {
    ctx.beginPath();
    for (let y = y0; y <= y1; y += size) {
      const coord = Math.round(y) + offset;
      ctx.moveTo(x0, coord);
      ctx.lineTo(x1, coord);
    }
    ctx.stroke();

    // Alternating red vertical margin line:
    const marginSpan = Math.min(110, Math.max(75, width * 0.12));
    const isOddPage = (pageOrderOrIndex % 2 === 0);
    const marginX = (isOddPage ? (width - marginSpan) : marginSpan) + offset;

    ctx.beginPath();
    ctx.strokeStyle = darkPaper ? '#F43F5E' : '#EF4444';
    ctx.globalAlpha = darkPaper ? 0.45 : 0.6;
    ctx.lineWidth = 1.5;
    ctx.moveTo(marginX, y0);
    ctx.lineTo(marginX, y1);
    ctx.stroke();
  } else if (bg.type === 'dots') {
    const dotRadius = 1.2;
    ctx.beginPath();
    for (let x = x0 + size; x < x1; x += size) {
      for (let y = y0 + size; y < y1; y += size) {
        ctx.moveTo(Math.round(x) + dotRadius, Math.round(y));
        ctx.arc(Math.round(x), Math.round(y), dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders a single stroke onto the canvas context with buttery-smooth curves
 * Uses continuous midpoint quadratic splines and smooth cap rendering to avoid bumpy ridges.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  pressureEnabled: boolean = true
) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'marker') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(stroke.opacity, 0.4);
  } else if (stroke.tool === 'pencil') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(stroke.opacity * 0.85, 0.85);
  } else {
    // pen
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity;
  }

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  if (points.length === 1) {
    const p = points[0];
    const r = (stroke.width * (pressureEnabled ? (p.pressure ?? 0.5) * 1.2 : 1)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (points.length === 2) {
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // High-performance, butter-smooth continuous midpoint quadratic Bézier path
  // Rendering in a single beginPath() -> stroke() call eliminates GPU pipeline stalls and drawing lag
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders a shape object
 */
export function renderShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.save();
  ctx.globalAlpha = shape.opacity ?? 1;
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.fillStyle = shape.fillColor || 'transparent';

  const isDashed = shape.type === 'dashed-line' || shape.type === 'dashed-arrow' || shape.dashed;
  if (isDashed) {
    ctx.setLineDash([8, 6]);
  }

  const x = shape.x;
  const y = shape.y;
  const w = shape.width;
  const h = shape.height;

  ctx.beginPath();

  switch (shape.type) {
    case 'line':
    case 'dashed-line': {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      break;
    }
    case 'arrow':
    case 'dashed-arrow': {
      // Line from (x, y) to (x + w, y + h)
      const toX = x + w;
      const toY = y + h;
      ctx.moveTo(x, y);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Arrowhead (always solid fill)
      ctx.setLineDash([]);
      const angle = Math.atan2(h, w);
      const headLength = Math.max(12, shape.strokeWidth * 3.5);
      ctx.beginPath();
      ctx.fillStyle = shape.strokeColor;
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rect': {
      const rx = Math.min(x, x + w);
      const ry = Math.min(y, y + h);
      const rw = Math.abs(w);
      const rh = Math.abs(h);
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fillRect(rx, ry, rw, rh);
      }
      ctx.strokeRect(rx, ry, rw, rh);
      break;
    }
    case 'circle':
    case 'ellipse': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w / 2);
      const ry = shape.type === 'circle' ? rx : Math.abs(h / 2);
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case 'triangle': {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case 'star': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(Math.abs(w), Math.abs(h)) / 2;
      const innerR = outerR * 0.45;
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders a text object
 */
export function renderText(ctx: CanvasRenderingContext2D, textObj: TextObject) {
  ctx.save();
  ctx.fillStyle = textObj.color;
  ctx.textAlign = textObj.align || 'left';
  ctx.textBaseline = 'top';

  const fontStyle = [
    textObj.italic ? 'italic' : '',
    textObj.bold ? 'bold' : '',
    `${textObj.fontSize || 16}px`,
    textObj.fontFamily || 'Inter, sans-serif',
  ]
    .filter(Boolean)
    .join(' ');

  ctx.font = fontStyle;

  const lines = textObj.text.split('\n');
  const lineHeight = (textObj.fontSize || 16) * 1.35;

  lines.forEach((line, index) => {
    let drawX = textObj.x;
    if (textObj.align === 'center') drawX += textObj.width / 2;
    else if (textObj.align === 'right') drawX += textObj.width;

    const drawY = textObj.y + index * lineHeight;
    ctx.fillText(line, drawX, drawY);

    if (textObj.underline) {
      const metrics = ctx.measureText(line);
      const textWidth = metrics.width;
      let startX = textObj.x;
      if (textObj.align === 'center') startX = textObj.x + (textObj.width - textWidth) / 2;
      else if (textObj.align === 'right') startX = textObj.x + textObj.width - textWidth;

      ctx.fillRect(startX, drawY + lineHeight - 2, textWidth, 1.5);
    }
  });

  ctx.restore();
}

/**
 * Renders an image object
 */
export function renderImage(ctx: CanvasRenderingContext2D, imgObj: ImageObject) {
  const effectiveSrc = getResolvedImageUrl(imgObj.src) || imgObj.src;
  const img = getCachedImage(effectiveSrc);
  if (!img) return;

  ctx.save();
  if (imgObj.rotation) {
    const cx = imgObj.x + imgObj.width / 2;
    const cy = imgObj.y + imgObj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(imgObj.rotation);
    ctx.drawImage(img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
  } else {
    ctx.drawImage(img, imgObj.x, imgObj.y, imgObj.width, imgObj.height);
  }
  ctx.restore();
}

/**
 * Renders selection bounding box and handles
 */
export function renderSelectionBox(ctx: CanvasRenderingContext2D, sel: SelectionBox) {
  if (!sel || sel.width <= 0 || sel.height <= 0) return;
  ctx.save();

  // Subtle translucent fill to show draggable area
  ctx.fillStyle = 'rgba(99, 85, 199, 0.06)';
  ctx.fillRect(sel.x, sel.y, sel.width, sel.height);

  // Dashed border
  ctx.strokeStyle = '#6355C7'; // Brand purple
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);

  // Solid corner handles
  ctx.setLineDash([]);
  const handleRadius = 5.5;

  const corners = [
    { x: sel.x, y: sel.y },
    { x: sel.x + sel.width, y: sel.y },
    { x: sel.x + sel.width, y: sel.y + sel.height },
    { x: sel.x, y: sel.y + sel.height },
  ];

  corners.forEach((c) => {
    // Outer white disc with shadow
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(c.x, c.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Purple border
    ctx.strokeStyle = '#6355C7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner purple point
    ctx.fillStyle = '#6355C7';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Master render function for an entire page
 */
/**
 * Fast viewport intersection checks for culling off-screen elements
 */
function isStrokeInViewport(
  s: Stroke,
  vb: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  if (!s.points || s.points.length === 0) return false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < s.points.length; i++) {
    const pt = s.points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  const halfW = (s.width || 3) / 2;
  return !(
    maxX + halfW < vb.minX ||
    minX - halfW > vb.maxX ||
    maxY + halfW < vb.minY ||
    minY - halfW > vb.maxY
  );
}

function isShapeInViewport(
  sh: Shape,
  vb: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const minX = Math.min(sh.x, sh.x + sh.width);
  const maxX = Math.max(sh.x, sh.x + sh.width);
  const minY = Math.min(sh.y, sh.y + sh.height);
  const maxY = Math.max(sh.y, sh.y + sh.height);
  return !(maxX < vb.minX || minX > vb.maxX || maxY < vb.minY || minY > vb.maxY);
}

function isTextInViewport(
  t: TextObject,
  vb: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const w = t.width || 250;
  const h = t.height || 50;
  return !(t.x + w < vb.minX || t.x > vb.maxX || t.y + h < vb.minY || t.y > vb.maxY);
}

function isImageInViewport(
  img: ImageObject,
  vb: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const minX = Math.min(img.x, img.x + img.width);
  const maxX = Math.max(img.x, img.x + img.width);
  const minY = Math.min(img.y, img.y + img.height);
  const maxY = Math.max(img.y, img.y + img.height);
  return !(maxX < vb.minX || minX > vb.maxX || maxY < vb.minY || minY > vb.maxY);
}

export function renderPage(
  ctx: CanvasRenderingContext2D,
  page: Page,
  options?: {
    selection?: SelectionBox | null;
    activeStroke?: Stroke | null;
    eraserPreview?: { x: number; y: number; radius: number } | null;
    pressureEnabled?: boolean;
    viewportBounds?: { minX: number; minY: number; maxX: number; maxY: number };
    excludeIds?: {
      strokeIds?: string[];
      shapeIds?: string[];
      textIds?: string[];
      imageIds?: string[];
    };
  }
) {
  const vb = options?.viewportBounds;
  const exclude = options?.excludeIds;

  // 1. Background (fills entire screen seamlessly if viewportBounds provided)
  renderBackground(ctx, page.width, page.height, page.background, options?.viewportBounds, page.order ?? 0);

  // 2. Images (rendered underneath annotations)
  if (page.images) {
    for (const img of page.images) {
      if (exclude?.imageIds?.includes(img.id)) continue;
      if (!img.deleted && (!vb || isImageInViewport(img, vb))) {
        renderImage(ctx, img);
      }
    }
  }

  // 3. Shapes
  if (page.shapes) {
    for (const shape of page.shapes) {
      if (exclude?.shapeIds?.includes(shape.id)) continue;
      if (!shape.deleted && (!vb || isShapeInViewport(shape, vb))) {
        renderShape(ctx, shape);
      }
    }
  }

  // 4. Texts
  if (page.texts) {
    for (const text of page.texts) {
      if (exclude?.textIds?.includes(text.id)) continue;
      if (!text.deleted && (!vb || isTextInViewport(text, vb))) {
        renderText(ctx, text);
      }
    }
  }

  // 5. Strokes (markers first, then pens/pencils for crisp layering with viewport culling)
  if (page.strokes) {
    const activeStrokes = page.strokes.filter(
      (s) => !s.deleted && (!exclude?.strokeIds?.includes(s.id)) && (!vb || isStrokeInViewport(s, vb))
    );
    const markers = activeStrokes.filter((s) => s.tool === 'marker');
    const others = activeStrokes.filter((s) => s.tool !== 'marker');

    for (const m of markers) {
      renderStroke(ctx, m, options?.pressureEnabled ?? true);
    }
    for (const s of others) {
      renderStroke(ctx, s, options?.pressureEnabled ?? true);
    }
  }

  // 6. Currently active in-progress stroke
  if (options?.activeStroke) {
    renderStroke(ctx, options.activeStroke, options?.pressureEnabled ?? true);
  }

  // 7. Active selection box
  if (options?.selection) {
    renderSelectionBox(ctx, options.selection);
  }

  // 8. Eraser circle indicator
  if (options?.eraserPreview) {
    const { x, y, radius } = options.eraserPreview;
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
