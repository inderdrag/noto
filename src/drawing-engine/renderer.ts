import { Page, PageBackground, Stroke, Shape, TextObject, ImageObject, SelectionBox } from '../types';

// In-memory cache for loaded HTMLImageElements
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
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
  _bounds?: { minX: number; minY: number; maxX: number; maxY: number }
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

  // Soft, eye-friendly grid colors:
  // On dark/midnight paper: soft, pleasant, non-glaring muted light tone (calm slate-white)
  // that is clearly visible but DOES NOT cut the eyes!
  // On light paper: soft notebook blue or graphite.
  let lineColor: string;
  let lineAlpha: number;

  if (darkPaper) {
    lineColor = '#CBD5E1';
    lineAlpha = 0.22; // Soft, calm, comfortable on dark paper — does NOT glare or cut the eyes!
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
  } else if (bg.type === 'ruled') {
    ctx.beginPath();
    for (let y = y0; y <= y1; y += size) {
      const coord = Math.round(y) + offset;
      ctx.moveTo(x0, coord);
      ctx.lineTo(x1, coord);
    }
    ctx.stroke();

    // Red vertical margin line
    const marginX = Math.min(100, Math.max(70, width * 0.1)) + offset;
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

  // Butter-smooth handwriting rendering with zero stray lines
  // When pen pressure variation is present, stroke connected quadratic Bézier segments with variable width
  // Otherwise, stroke single continuous midpoint quadratic Bézier path
  if (stroke.tool === 'pen' && pressureEnabled && points.length > 2) {
    let p0 = points[0];
    let p1 = points[1];
    let midX = (p0.x + p1.x) / 2;
    let midY = (p0.y + p1.y) / 2;

    const baseW = stroke.width;
    // Initial segment
    const pr0 = p0.pressure ?? 0.5;
    ctx.lineWidth = Math.max(0.75, baseW * (0.65 + pr0 * 0.7));
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const nextMidX = (curr.x + next.x) / 2;
      const nextMidY = (curr.y + next.y) / 2;
      const pr = curr.pressure ?? 0.5;

      ctx.lineWidth = Math.max(0.75, baseW * (0.65 + pr * 0.7));
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.quadraticCurveTo(curr.x, curr.y, nextMidX, nextMidY);
      ctx.stroke();

      midX = nextMidX;
      midY = nextMidY;
    }

    const last = points[points.length - 1];
    const prLast = last.pressure ?? 0.5;
    ctx.lineWidth = Math.max(0.75, baseW * (0.65 + prLast * 0.7));
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  } else {
    // Butter-smooth continuous midpoint quadratic Bézier path
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
  }

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
  const img = getCachedImage(imgObj.src);
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
  ctx.save();
  ctx.strokeStyle = '#2563EB'; // Blue accent
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);

  ctx.setLineDash([]);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 2;

  const handleSize = 8;
  const half = handleSize / 2;

  // 4 corners
  const corners = [
    { x: sel.x, y: sel.y },
    { x: sel.x + sel.width, y: sel.y },
    { x: sel.x + sel.width, y: sel.y + sel.height },
    { x: sel.x, y: sel.y + sel.height },
  ];

  corners.forEach((c) => {
    ctx.fillRect(c.x - half, c.y - half, handleSize, handleSize);
    ctx.strokeRect(c.x - half, c.y - half, handleSize, handleSize);
  });

  ctx.restore();
}

/**
 * Master render function for an entire page
 */
export function renderPage(
  ctx: CanvasRenderingContext2D,
  page: Page,
  options?: {
    selection?: SelectionBox | null;
    activeStroke?: Stroke | null;
    eraserPreview?: { x: number; y: number; radius: number } | null;
    pressureEnabled?: boolean;
    viewportBounds?: { minX: number; minY: number; maxX: number; maxY: number };
  }
) {
  // 1. Background (fills entire screen seamlessly if viewportBounds provided)
  renderBackground(ctx, page.width, page.height, page.background, options?.viewportBounds);

  // 2. Images (rendered underneath annotations)
  if (page.images) {
    for (const img of page.images) {
      renderImage(ctx, img);
    }
  }

  // 3. Shapes
  if (page.shapes) {
    for (const shape of page.shapes) {
      renderShape(ctx, shape);
    }
  }

  // 4. Texts
  if (page.texts) {
    for (const text of page.texts) {
      renderText(ctx, text);
    }
  }

  // 5. Strokes (markers first, then pens/pencils for crisp layering)
  if (page.strokes) {
    const markers = page.strokes.filter((s) => s.tool === 'marker');
    const others = page.strokes.filter((s) => s.tool !== 'marker');

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
