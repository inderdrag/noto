import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Layers, 
  Undo2, 
  Redo2, 
  Download, 
  PenTool, 
  Highlighter, 
  Eraser, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Minus, 
  ArrowRight, 
  MousePointer, 
  Hand, 
  Trash2, 
  Check, 
  Bookmark, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid, 
  FileText, 
  AlignLeft, 
  CircleDot,
  Sun,
  Moon,
  Copy,
  Palette,
  X
} from 'lucide-react';
import { 
  Notebook, 
  Page, 
  ToolType, 
  Stroke, 
  Shape, 
  TextObject, 
  ImageObject, 
  Point, 
  EraserMode, 
  GridType, 
  HistoryEntry, 
  SelectionBox 
} from '../types';
import { renderPage, isColorDark, renderShape, setGlobalImageLoadCallback } from '../drawing-engine/renderer';
import { preparePageImages, subscribeImageResolved } from '../sync/imageStorage';
import { strokeIntersectsCircle, sliceStrokeByEraser, pointInRect, smoothPoints, getStrokeBounds, getShapeBounds, distance } from '../drawing-engine/math';
import { exportNotebookToPdf, exportPageAsImage, exportToNotoFile } from '../export/exporter';
import { NotoIcon } from './NotoLogo';
import { EditorHeader } from './editor/EditorHeader';
import { PagesSidebar } from './editor/PagesSidebar';
import { ToolSidebar } from './editor/ToolSidebar';
import { FloatingToolbar } from './editor/FloatingToolbar';
import { MobileEditorView } from './editor/MobileEditorView';
import { getStandardPageDimensions } from '../storage/db';

interface EditorWorkspaceProps {
  notebook: Notebook;
  onBackToLibrary: () => void;
  onUpdateNotebook: (updated: Notebook) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  zoomAction?: { type: 'in' | 'out' | 'reset'; timestamp: number } | null;
  undoTrigger?: number;
  redoTrigger?: number;
  clearPageTrigger?: number;
  paperTypeTrigger?: { type: GridType; timestamp: number } | null;
}

const PRESET_STROKE_SIZES = [1, 2, 3, 5, 8, 12, 20, 30];

// High-contrast, eye-friendly ink colors
const PREMIUM_INKS = [
  { name: 'Чернила (Черный)', color: '#0F172A', border: false },
  { name: 'Светло-серый (Для темной бумаги)', color: '#F1F5F9', border: true },
  { name: 'Синий', color: '#2563EB', border: false },
  { name: 'Красный', color: '#DC2626', border: false },
  { name: 'Зеленый', color: '#16A34A', border: false },
  { name: 'Янтарный', color: '#D97706', border: false },
  { name: 'Фиолетовый', color: '#9333EA', border: false },
  { name: 'Голубой', color: '#0284C7', border: false },
  { name: 'Графит', color: '#64748B', border: false },
];

// Separated Ruling Options (Разлиновка листа)
const RULING_TYPES: { id: GridType; name: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'grid', name: 'Клетка', desc: 'Классическая тетрадная сетка', icon: Grid },
  { id: 'ruled', name: 'Линейка', desc: 'Горизонтальные строки с полями', icon: AlignLeft },
  { id: 'dots', name: 'Точки', desc: 'Сетка точек для схем и скетчей', icon: CircleDot },
  { id: 'blank', name: 'Чистый', desc: 'Гладкий лист без разлиновки', icon: FileText },
];

// Separated Paper Color Options (Цвет бумаги)
const LIGHT_PAPERS = [
  { name: 'Белоснежный', color: '#FFFFFF', desc: 'Чистый белый' },
  { name: 'Слоновая кость', color: '#FAF8F5', desc: 'Тёплый кремовый' },
  { name: 'Пергамент', color: '#F4EFEA', desc: 'Мягкий песочный' },
];

const DARK_PAPERS = [
  { name: 'Midnight', color: '#0D0E12', desc: 'Глубокий чёрный' },
  { name: 'Тёмный графит', color: '#181920', desc: 'Угольно-серый' },
  { name: 'Глубокий сланец', color: '#1E222A', desc: 'Тёмно-сизый' },
];

// 12 Distinct, High-Contrast Cover Colors
const COVER_PRESETS = [
  { name: 'Королевский синий', color: '#2563EB' },
  { name: 'Небесный лазурный', color: '#0284C7' },
  { name: 'Изумрудно-зелёный', color: '#059669' },
  { name: 'Свежая мята', color: '#10B981' },
  { name: 'Алый рубин', color: '#E11D48' },
  { name: 'Яркий коралл', color: '#EA580C' },
  { name: 'Золотой янтарь', color: '#D97706' },
  { name: 'Фиолетовый аметист', color: '#7C3AED' },
  { name: 'Малиновый пурпур', color: '#C026D3' },
  { name: 'Тёмный индиго', color: '#1E3A8A' },
  { name: 'Графитовый сланец', color: '#475569' },
  { name: 'Глубокий чёрный', color: '#0F172A' },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  notebook,
  onBackToLibrary,
  onUpdateNotebook,
  theme,
  onToggleTheme,
  zoomAction,
  undoTrigger,
  redoTrigger,
  clearPageTrigger,
  paperTypeTrigger,
}) => {
  const isDark = theme === 'dark';
  const activePages = notebook.pages.filter((p) => !p.deleted);
  const currentPageIndex = Math.max(
    0,
    activePages.findIndex((p) => p.id === notebook.currentPageId)
  );
  const currentPage = activePages[currentPageIndex] || activePages[0] || notebook.pages[0];

  // Tool states
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [showToolOptions, setShowToolOptions] = useState(false);
  const [strokeColor, setStrokeColor] = useState(
    isColorDark(currentPage.background.color) ? '#F1F5F9' : '#0F172A'
  );
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [eraserMode, setEraserMode] = useState<EraserMode>('partial');
  const [eraserRadius, setEraserRadius] = useState(16);
  const [shapeFillColor, setShapeFillColor] = useState<string>('transparent');

  // Text inline editing
  const [editingText, setEditingText] = useState<{
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
  } | null>(null);

  // Viewport transforms (Zoom & Pan) - 70% default zoom on entering sheet
  const [scale, setScale] = useState(0.70);
  const [pan, setPan] = useState({ x: 20, y: 30 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const touchMidpointRef = useRef<{ x: number; y: number } | null>(null);
  const touchInitialScaleRef = useRef<number>(1);
  const touchInitialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Palm rejection: track pen active state and timestamp of last pen interaction
  const isPenActiveRef = useRef(false);
  const lastPenTimeRef = useRef(0);

  // History Stack
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Clean Popovers: separate Ruling, Paper Color, and Cover Color
  const [isRulingPopoverOpen, setIsRulingPopoverOpen] = useState(false);
  const [isPaperColorPopoverOpen, setIsPaperColorPopoverOpen] = useState(false);
  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);

  // Responsive screen size detection
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const isMobile = windowSize.width < 768;
  const isLandscapeScreen = windowSize.width > windowSize.height;

  // Responsive 3-pane layout states matching the design mockup
  const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isSheetFullscreen, setIsSheetFullscreen] = useState(false);

  const [isPagesDrawerOpen, setIsPagesDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(notebook.title);
  const [saveSuccessFeedback, setSaveSuccessFeedback] = useState(false);

  // Canvas Refs & State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activeShapeRef = useRef<Shape | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const eraserPreviewRef = useRef<{ x: number; y: number; radius: number } | null>(null);

  // Selection Tool State & Interactive Dragging / Resizing
  type SelectionHandle = 'nw' | 'ne' | 'se' | 'sw' | 'inside' | null;

  interface SelectionTransformState {
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'inside';
    startPt: Point;
    initialBox: SelectionBox;
    initialStrokes: Stroke[];
    initialShapes: Shape[];
    initialTexts: TextObject[];
  }

  const [selectedIds, setSelectedIds] = useState<{
    strokeIds: string[];
    shapeIds: string[];
    textIds: string[];
  }>({ strokeIds: [], shapeIds: [], textIds: [] });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelectionColorPickerOpen, setIsSelectionColorPickerOpen] = useState(false);
  const [selectionCursor, setSelectionCursor] = useState<string>('crosshair');
  const selectionTransformRef = useRef<SelectionTransformState | null>(null);

  const getSelectionHitHandle = (pt: Point, sel: SelectionBox, tolerance: number = 14): SelectionHandle => {
    if (!sel || sel.width <= 0 || sel.height <= 0) return null;
    const nw = { x: sel.x, y: sel.y };
    const ne = { x: sel.x + sel.width, y: sel.y };
    const se = { x: sel.x + sel.width, y: sel.y + sel.height };
    const sw = { x: sel.x, y: sel.y + sel.height };

    if (distance(pt, nw) <= tolerance) return 'nw';
    if (distance(pt, ne) <= tolerance) return 'ne';
    if (distance(pt, se) <= tolerance) return 'se';
    if (distance(pt, sw) <= tolerance) return 'sw';

    if (pointInRect(pt, sel)) return 'inside';

    return null;
  };

  const computeBoundingBoxForItems = (
    sIds: string[],
    shIds: string[],
    tIds: string[],
    page: Page
  ): SelectionBox | null => {
    if (sIds.length === 0 && shIds.length === 0 && tIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const selStrokes = (page.strokes || []).filter((s) => !s.deleted && sIds.includes(s.id));
    selStrokes.forEach((s) => {
      s.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });

    const selShapes = (page.shapes || []).filter((sh) => !sh.deleted && shIds.includes(sh.id));
    selShapes.forEach((sh) => {
      const x2 = sh.x + sh.width;
      const y2 = sh.y + sh.height;
      minX = Math.min(minX, Math.min(sh.x, x2));
      minY = Math.min(minY, Math.min(sh.y, y2));
      maxX = Math.max(maxX, Math.max(sh.x, x2));
      maxY = Math.max(maxY, Math.max(sh.y, y2));
    });

    const selTexts = (page.texts || []).filter((t) => !t.deleted && tIds.includes(t.id));
    selTexts.forEach((t) => {
      const w = t.width || Math.max(80, t.text.length * (t.fontSize * 0.6));
      const h = t.height || t.fontSize * 1.5;
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + w);
      maxY = Math.max(maxY, t.y + h);
    });

    if (minX === Infinity || maxX === -Infinity) return null;

    const pad = 10;
    return {
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      width: Math.max(20, maxX - minX + pad * 2),
      height: Math.max(20, maxY - minY + pad * 2),
      strokeIds: sIds,
      shapeIds: shIds,
      textIds: tIds,
      imageIds: [],
    };
  };

  // Close all popovers helper
  const closeAllPopovers = useCallback(() => {
    setIsRulingPopoverOpen(false);
    setIsPaperColorPopoverOpen(false);
    setIsCoverPopoverOpen(false);
    setIsZoomMenuOpen(false);
    setShowToolOptions(false);
    setIsPagesDrawerOpen(false);
    setIsSelectionColorPickerOpen(false);
  }, []);

  // Global click outside popovers to close them automatically
  useEffect(() => {
    const handleGlobalPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-popover="true"]') &&
        !target.closest('[data-popover-trigger="true"]')
      ) {
        closeAllPopovers();
      }
    };
    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, [closeAllPopovers]);

  // Default zoom & centering when opening page
  useEffect(() => {
    const initPageZoom = () => {
      const canvas = canvasRef.current;
      const vWidth = canvas ? canvas.clientWidth : window.innerWidth - 380;
      const vHeight = canvas ? canvas.clientHeight : window.innerHeight - 160;
      const defaultScale = Math.min(0.75, Math.max(0.45, (vWidth - 60) / currentPage.width));
      setScale(defaultScale);

      const renderW = currentPage.width * defaultScale;
      const renderH = currentPage.height * defaultScale;
      setPan({
        x: Math.max(20, (vWidth - renderW) / 2),
        y: Math.max(20, (vHeight - renderH) / 2),
      });
    };

    initPageZoom();
  }, [currentPage.id, currentPage.width, currentPage.height]);

  // History recorder
  const pushHistory = useCallback(
    (desc: string, targetPage: Page = currentPage) => {
      const entry: HistoryEntry = {
        pageId: targetPage.id,
        description: desc,
        strokes: JSON.parse(JSON.stringify(targetPage.strokes || [])),
        shapes: JSON.parse(JSON.stringify(targetPage.shapes || [])),
        texts: JSON.parse(JSON.stringify(targetPage.texts || [])),
        images: JSON.parse(JSON.stringify(targetPage.images || [])),
      };

      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, entry];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [currentPage, historyIndex]
  );

  const updateCurrentPage = useCallback(
    (updater: (page: Page) => Page, recordHistoryDesc?: string) => {
      if (recordHistoryDesc) {
        pushHistory(recordHistoryDesc);
      }
      const updatedPages = notebook.pages.map((p) => {
        if (p.id === currentPage.id) {
          const res = updater(p);
          res.updatedAt = Date.now();
          return res;
        }
        return p;
      });

      onUpdateNotebook({
        ...notebook,
        pages: updatedPages,
        updatedAt: Date.now(),
      });
    },
    [currentPage.id, notebook, onUpdateNotebook, pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevEntry = history[historyIndex - 1];
    if (!prevEntry) return;

    updateCurrentPage((page) => ({
      ...page,
      strokes: prevEntry.strokes,
      shapes: prevEntry.shapes,
      texts: prevEntry.texts,
      images: prevEntry.images,
    }));
    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex, updateCurrentPage]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextEntry = history[historyIndex + 1];
    if (!nextEntry) return;

    updateCurrentPage((page) => ({
      ...page,
      strokes: nextEntry.strokes,
      shapes: nextEntry.shapes,
      texts: nextEntry.texts,
      images: nextEntry.images,
    }));
    setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex, updateCurrentPage]);

  useEffect(() => {
    if (history.length === 0) {
      pushHistory('Initial snapshot');
    }
  }, [history.length, pushHistory]);

  // Master Canvas Repainting (Broad notebook page with clear boundaries and studio desk contrast)
  const repaintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limit DPR to at most 2 to avoid memory bloat and performance drops on high-density mobile screens
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    const targetW = Math.round(displayWidth * dpr);
    const targetH = Math.round(displayHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Contrasting studio desk background
    ctx.fillStyle = theme === 'dark' ? '#0E0F17' : '#F7F8FC';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    const darkPaper = isColorDark(currentPage.background.color);
    const cornerRadius = 12;

    // 2. Physical paper sheet boundaries & drop-shadow with rounded corners
    ctx.save();
    ctx.shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(99, 85, 199, 0.08)';
    ctx.shadowBlur = 24 / scale;
    ctx.shadowOffsetY = 6 / scale;
    ctx.fillStyle = currentPage.background.color;
    ctx.beginPath();
    ctx.roundRect(0, 0, currentPage.width, currentPage.height, cornerRadius);
    ctx.fill();
    ctx.restore();

    // 3. Crisp sheet boundary outline
    ctx.save();
    ctx.strokeStyle = darkPaper ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = Math.max(1, 1 / scale);
    ctx.beginPath();
    ctx.roundRect(0, 0, currentPage.width, currentPage.height, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // 4. Clip to rounded sheet so grid & drawings stay cleanly within rounded paper
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, currentPage.width, currentPage.height, cornerRadius);
    ctx.clip();

    // 5. Calculate visible viewport bounds in page coordinates for culling
    const cullingPad = 80;
    const vpMinX = -pan.x / scale - cullingPad;
    const vpMinY = -pan.y / scale - cullingPad;
    const vpMaxX = (displayWidth - pan.x) / scale + cullingPad;
    const vpMaxY = (displayHeight - pan.y) / scale + cullingPad;

    // 6. Render page contents (strictly bounded within the sheet, with viewport culling)
    renderPage(ctx, currentPage, {
      activeStroke: activeStrokeRef.current,
      selection: selectionBox,
      eraserPreview: eraserPreviewRef.current,
      pressureEnabled: true,
      viewportBounds: { minX: vpMinX, minY: vpMinY, maxX: vpMaxX, maxY: vpMaxY },
    });

    // Active Shape in progress (with live outline for ALL shapes: triangle, star, lines, arrows, rect, circle)
    if (activeShapeRef.current) {
      const s = activeShapeRef.current;
      renderShape(ctx, {
        ...s,
        opacity: 0.9,
      });
    }

    ctx.restore(); // restore clip
    ctx.restore(); // restore pan/scale
  }, [currentPage, pan, scale, selectionBox, theme]);

  // Interactive Render Scheduler:
  // Runs smooth 60fps/120fps requestAnimationFrame loop ONLY during active drawing or pan/zoom.
  // When idle, loop stops completely so CPU/GPU usage is 0%, preventing thermal throttling, lag, and battery drain.
  const isInteractingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);

  const startInteractionLoop = useCallback(() => {
    isInteractingRef.current = true;
    if (animFrameIdRef.current !== null) return;
    const tick = () => {
      repaintCanvas();
      if (isInteractingRef.current) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        animFrameIdRef.current = null;
      }
    };
    animFrameIdRef.current = requestAnimationFrame(tick);
  }, [repaintCanvas]);

  const stopInteractionLoop = useCallback(() => {
    isInteractingRef.current = false;
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    // Final clean repaint
    repaintCanvas();
  }, [repaintCanvas]);

  // Immediate repaint on reactive state changes (page, pan, scale, selectionBox, theme)
  useEffect(() => {
    repaintCanvas();
  }, [repaintCanvas]);

  // Window resize listener to keep canvas sharp and viewport aligned
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      repaintCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [repaintCanvas]);

  // Preload and refresh private signed image URLs on page load and periodically before expiration (1 hr TTL)
  useEffect(() => {
    let isCancelled = false;
    let refreshInterval: any = null;

    const loadImages = async () => {
      if (currentPage.images && currentPage.images.length > 0) {
        await preparePageImages(currentPage);
        if (!isCancelled) {
          repaintCanvas();
        }
      }
    };

    loadImages();

    // Auto-refresh signed URLs every 45 minutes to prevent expiration
    refreshInterval = setInterval(() => {
      loadImages();
    }, 45 * 60 * 1000);

    return () => {
      isCancelled = true;
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [currentPage.id, currentPage.images, repaintCanvas]);

  // Repaint canvas when new images complete loading or signed URLs resolve
  useEffect(() => {
    setGlobalImageLoadCallback(() => {
      repaintCanvas();
    });
    const unsub = subscribeImageResolved(() => {
      repaintCanvas();
    });
    return () => {
      setGlobalImageLoadCallback(null);
      unsub();
    };
  }, [repaintCanvas]);

  const screenToPageCoord = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      return {
        x: (rawX - pan.x) / scale,
        y: (rawY - pan.y) / scale,
      };
    },
    [pan.x, pan.y, scale]
  );

  // Zoom handling
  const handleZoomDelta = (factor: number, centerX?: number, centerY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = centerX ?? canvas.clientWidth / 2;
    const cy = centerY ?? canvas.clientHeight / 2;

    const newScale = Math.min(3.5, Math.max(0.2, scale * factor));

    setPan((prev) => ({
      x: cx - (cx - prev.x) * (newScale / scale),
      y: cy - (cy - prev.y) * (newScale / scale),
    }));
    setScale(newScale);
  };

  const handleResetZoom = () => {
    const canvas = canvasRef.current;
    const vWidth = canvas ? canvas.clientWidth : window.innerWidth;
    const defaultScale = 0.70;
    setScale(defaultScale);
    setPan({
      x: Math.max(16, (vWidth - currentPage.width * defaultScale) / 2),
      y: 28,
    });
  };

  // Toggle between Fit to Screen Width (развернуть лист) and default 70% zoom
  const handleToggleFitToWidth = () => {
    const canvas = canvasRef.current;
    const vWidth = canvas ? canvas.clientWidth : window.innerWidth;
    const fitScale = Math.max(0.3, Math.min(2.5, (vWidth - 48) / currentPage.width));

    // If currently already near fitScale (within 5%), return to default 70% (0.70)
    if (Math.abs(scale - fitScale) < 0.05) {
      setScale(0.70);
      setPan({
        x: Math.max(16, (vWidth - currentPage.width * 0.70) / 2),
        y: 28,
      });
    } else {
      setScale(fitScale);
      setPan({
        x: Math.max(16, (vWidth - currentPage.width * fitScale) / 2),
        y: 28,
      });
    }
    setIsZoomMenuOpen(false);
  };

  const handleSetPresetZoom = (presetScale: number) => {
    const canvas = canvasRef.current;
    const vWidth = canvas ? canvas.clientWidth : window.innerWidth;
    setScale(presetScale);
    setPan({
      x: Math.max(16, (vWidth - currentPage.width * presetScale) / 2),
      y: 28,
    });
    setIsZoomMenuOpen(false);
  };

  // Fullscreen sheet mode toggle: collapses sidebars and fits sheet to screen width
  const toggleSheetFullscreen = () => {
    if (!isSheetFullscreen) {
      setIsSheetFullscreen(true);
      setIsPagesSidebarOpen(false);
      setIsToolSidebarOpen(false);
      const canvas = canvasRef.current;
      const vWidth = canvas ? canvas.clientWidth : window.innerWidth;
      const fitScale = Math.max(0.3, Math.min(2.5, (vWidth - 48) / currentPage.width));
      setScale(fitScale);
      setPan({
        x: Math.max(20, (vWidth - currentPage.width * fitScale) / 2),
        y: 28,
      });
    } else {
      setIsSheetFullscreen(false);
      setIsPagesSidebarOpen(true);
      setIsToolSidebarOpen(true);
      const canvas = canvasRef.current;
      const vWidth = canvas ? canvas.clientWidth : window.innerWidth - 380;
      const defaultScale = 0.70;
      setScale(defaultScale);
      setPan({
        x: Math.max(20, (vWidth - currentPage.width * defaultScale) / 2),
        y: 28,
      });
    }
  };

  const isLandscape = currentPage.width > currentPage.height;
  const togglePageOrientation = () => {
    const isLand = currentPage.width > currentPage.height;
    const nextLand = !isLand;
    const dim = getStandardPageDimensions(currentPage.background.type, nextLand);
    updateCurrentPage((page) => ({
      ...page,
      width: dim.width,
      height: dim.height,
    }), 'Смена ориентации листа');

    const canvas = canvasRef.current;
    const vWidth = canvas ? canvas.clientWidth : window.innerWidth - 380;
    setPan({
      x: Math.max(20, (vWidth - dim.width * scale) / 2),
      y: 28,
    });
  };

  // Clear entire canvas (with Undo support)
  const handleClearCanvas = () => {
    const hasActiveContent =
      (currentPage.strokes || []).some((s) => !s.deleted) ||
      (currentPage.shapes || []).some((sh) => !sh.deleted) ||
      (currentPage.texts || []).some((t) => !t.deleted) ||
      (currentPage.images || []).some((img) => !img.deleted);

    if (!hasActiveContent) {
      return;
    }
    const now = Date.now();
    updateCurrentPage((page) => ({
      ...page,
      strokes: (page.strokes || []).map((s) => ({ ...s, deleted: true, updatedAt: now })),
      shapes: (page.shapes || []).map((sh) => ({ ...sh, deleted: true, updatedAt: now })),
      texts: (page.texts || []).map((t) => ({ ...t, deleted: true, updatedAt: now })),
      images: (page.images || []).map((img) => ({ ...img, deleted: true, updatedAt: now })),
    }), 'Очистить лист');
    setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
    setSelectionBox(null);
  };

  const handleSetPaperType = (newType: GridType) => {
    const isLand = currentPage.width > currentPage.height;
    const dim = getStandardPageDimensions(newType, isLand);
    updateCurrentPage((page) => ({
      ...page,
      width: dim.width,
      height: dim.height,
      background: {
        ...page.background,
        type: newType,
      },
    }), 'Смена разлиновки листа');
  };

  // External MenuBar triggers
  useEffect(() => {
    if (!zoomAction) return;
    if (zoomAction.type === 'in') {
      handleZoomDelta(1.15);
    } else if (zoomAction.type === 'out') {
      handleZoomDelta(0.85);
    } else if (zoomAction.type === 'reset') {
      handleResetZoom();
    }
  }, [zoomAction]);

  useEffect(() => {
    if (undoTrigger) {
      handleUndo();
    }
  }, [undoTrigger, handleUndo]);

  useEffect(() => {
    if (redoTrigger) {
      handleRedo();
    }
  }, [redoTrigger, handleRedo]);

  useEffect(() => {
    if (clearPageTrigger) {
      handleClearCanvas();
    }
  }, [clearPageTrigger]);

  useEffect(() => {
    if (paperTypeTrigger) {
      handleSetPaperType(paperTypeTrigger.type);
    }
  }, [paperTypeTrigger]);

  // Selection actions: Delete, Duplicate, Recolor
  const handleDeleteSelected = () => {
    if (selectedIds.strokeIds.length === 0 && selectedIds.shapeIds.length === 0 && selectedIds.textIds.length === 0) return;
    const now = Date.now();
    updateCurrentPage((page) => ({
      ...page,
      strokes: (page.strokes || []).map((s) => selectedIds.strokeIds.includes(s.id) ? { ...s, deleted: true, updatedAt: now } : s),
      shapes: (page.shapes || []).map((sh) => selectedIds.shapeIds.includes(sh.id) ? { ...sh, deleted: true, updatedAt: now } : sh),
      texts: (page.texts || []).map((t) => selectedIds.textIds.includes(t.id) ? { ...t, deleted: true, updatedAt: now } : t),
    }), 'Удалить выделенное');
    setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
    setSelectionBox(null);
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.strokeIds.length === 0 && selectedIds.shapeIds.length === 0 && selectedIds.textIds.length === 0) return;
    const offset = 30;
    const now = Date.now();
    const newStrokes = (currentPage.strokes || [])
      .filter((s) => !s.deleted && selectedIds.strokeIds.includes(s.id))
      .map((s) => ({
        ...s,
        id: `stroke_${now}_${Math.random().toString(36).substr(2, 5)}`,
        points: s.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }));
    const newShapes = (currentPage.shapes || [])
      .filter((s) => !s.deleted && selectedIds.shapeIds.includes(s.id))
      .map((s) => ({
        ...s,
        id: `shape_${now}_${Math.random().toString(36).substr(2, 5)}`,
        x: s.x + offset,
        y: s.y + offset,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }));
    const newTexts = (currentPage.texts || [])
      .filter((t) => !t.deleted && selectedIds.textIds.includes(t.id))
      .map((t) => ({
        ...t,
        id: `txt_${now}_${Math.random().toString(36).substr(2, 5)}`,
        x: t.x + offset,
        y: t.y + offset,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }));

    updateCurrentPage((page) => ({
      ...page,
      strokes: [...(page.strokes || []), ...newStrokes],
      shapes: [...(page.shapes || []), ...newShapes],
      texts: [...(page.texts || []), ...newTexts],
    }), 'Дублировать выделенное');

    // Deselect after copying so the selection clears automatically
    setSelectionBox(null);
    setSelectedIds({
      strokeIds: [],
      shapeIds: [],
      textIds: [],
    });
    setIsSelectionColorPickerOpen(false);
  };

  const handleRecolorSelected = (colorToApply?: string) => {
    const c = colorToApply || strokeColor;
    let sIds = selectedIds.strokeIds;
    let shIds = selectedIds.shapeIds;
    let tIds = selectedIds.textIds;

    // Fallback if selectionBox exists but selectedIds was empty
    if (sIds.length === 0 && shIds.length === 0 && tIds.length === 0 && selectionBox) {
      sIds = (currentPage.strokes || [])
        .filter((s) => !s.deleted && s.points.some((p) => pointInRect(p, selectionBox)))
        .map((s) => s.id);
      shIds = (currentPage.shapes || [])
        .filter((sh) => !sh.deleted && pointInRect({ x: sh.x, y: sh.y }, selectionBox))
        .map((sh) => sh.id);
      tIds = (currentPage.texts || [])
        .filter((t) => !t.deleted && pointInRect({ x: t.x, y: t.y }, selectionBox))
        .map((t) => t.id);
    }

    if (sIds.length === 0 && shIds.length === 0 && tIds.length === 0) return;

    const now = Date.now();
    updateCurrentPage((page) => ({
      ...page,
      strokes: (page.strokes || []).map((s) => sIds.includes(s.id) ? { ...s, color: c, updatedAt: now } : s),
      shapes: (page.shapes || []).map((sh) => shIds.includes(sh.id) ? { ...sh, strokeColor: c, updatedAt: now } : sh),
      texts: (page.texts || []).map((t) => tIds.includes(t.id) ? { ...t, color: c, updatedAt: now } : t),
    }), 'Перекрасить выделенное');

    setSelectedIds({
      strokeIds: sIds,
      shapeIds: shIds,
      textIds: tIds,
    });
    setStrokeColor(c);
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Automatically close any open popover as requested!
    closeAllPopovers();

    // 1. Palm Rejection (защита от ладони):
    if (e.pointerType === 'pen') {
      isPenActiveRef.current = true;
      lastPenTimeRef.current = Date.now();
    } else if (e.pointerType === 'touch') {
      // If pen is currently active or was used recently, ignore touch (palm rejection)
      if (isPenActiveRef.current || (Date.now() - lastPenTimeRef.current < 800)) {
        return;
      }
      // If two fingers are pinching/panning, do not draw
      if (touchDistanceRef.current !== null) {
        return;
      }
    }

    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      startInteractionLoop();
      return;
    }

    if (e.button !== 0) return;

    isPointerDownRef.current = true;
    startInteractionLoop();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pt = screenToPageCoord(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    pt.pressure = pressure;
    pt.time = Date.now();

    startPointRef.current = pt;

    // Selection move or corner resize handling
    if (activeTool === 'select' && selectionBox && (selectedIds.strokeIds.length > 0 || selectedIds.shapeIds.length > 0 || selectedIds.textIds.length > 0)) {
      const hitTolerance = Math.max(12, 16 / scale);
      const handle = getSelectionHitHandle(pt, selectionBox, hitTolerance);

      if (handle) {
        // Create deep snapshot of selected items for smooth relative scaling / moving
        const initialStrokes = (currentPage.strokes || [])
          .filter((s) => !s.deleted && selectedIds.strokeIds.includes(s.id))
          .map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
        const initialShapes = (currentPage.shapes || [])
          .filter((sh) => !sh.deleted && selectedIds.shapeIds.includes(sh.id))
          .map((sh) => ({ ...sh }));
        const initialTexts = (currentPage.texts || [])
          .filter((t) => !t.deleted && selectedIds.textIds.includes(t.id))
          .map((t) => ({ ...t }));

        selectionTransformRef.current = {
          handle,
          startPt: pt,
          initialBox: { ...selectionBox },
          initialStrokes,
          initialShapes,
          initialTexts,
        };
        return;
      }
    }

    if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'marker') {
      activeStrokeRef.current = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        tool: activeTool,
        points: [pt],
        color: strokeColor,
        width: strokeWidth,
        opacity: activeTool === 'marker' ? 0.35 : strokeOpacity,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
      };
    } else if (activeTool === 'eraser') {
      eraserPreviewRef.current = { x: pt.x, y: pt.y, radius: eraserRadius };
      handleEraserAction(pt);
    } else if (['line', 'arrow', 'dashed-line', 'dashed-arrow', 'rect', 'circle', 'triangle', 'star'].includes(activeTool)) {
      activeShapeRef.current = {
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: activeTool as Shape['type'],
        x: pt.x,
        y: pt.y,
        width: 1,
        height: 1,
        strokeColor: strokeColor,
        strokeWidth: Math.max(1.5, strokeWidth),
        fillColor: shapeFillColor,
        opacity: strokeOpacity,
        dashed: activeTool === 'dashed-line' || activeTool === 'dashed-arrow',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
      };
    } else if (activeTool === 'text') {
      setEditingText({
        x: pt.x,
        y: pt.y,
        text: '',
        fontSize: Math.max(16, strokeWidth * 4),
        color: strokeColor,
        bold: false,
        italic: false,
      });
    } else if (activeTool === 'select') {
      setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
      setSelectionBox({
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        strokeIds: [],
        shapeIds: [],
        textIds: [],
        imageIds: [],
      });
    }
  };

  // Pointer Move with auto-snap to grid for horizontal/vertical lines and smooth interpolation
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Palm Rejection & Multi-touch Guard
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = Date.now();
    } else if (e.pointerType === 'touch') {
      if (isPenActiveRef.current || (Date.now() - lastPenTimeRef.current < 800) || touchDistanceRef.current !== null) {
        return;
      }
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    const pt = screenToPageCoord(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    pt.pressure = pressure;
    pt.time = Date.now();

    if (activeTool === 'eraser') {
      eraserPreviewRef.current = { x: pt.x, y: pt.y, radius: eraserRadius };
    } else {
      eraserPreviewRef.current = null;
    }

    if (!isPointerDownRef.current) return;

    // 1. Transforming selection (Moving via center or Resizing via corner handles)
    if (selectionTransformRef.current) {
      const { handle, startPt, initialBox, initialStrokes, initialShapes, initialTexts } = selectionTransformRef.current;

      if (handle === 'inside') {
        // Move / Перенос
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;
        const newBox = { ...initialBox, x: initialBox.x + dx, y: initialBox.y + dy };
        setSelectionBox(newBox);

        const selStrokeMap = new Map(initialStrokes.map((s) => [s.id, s]));
        const selShapeMap = new Map(initialShapes.map((sh) => [sh.id, sh]));
        const selTextMap = new Map(initialTexts.map((t) => [t.id, t]));

        updateCurrentPage((page) => ({
          ...page,
          strokes: (page.strokes || []).map((s) => {
            const orig = selStrokeMap.get(s.id);
            if (!orig) return s;
            return {
              ...s,
              points: orig.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
            };
          }),
          shapes: (page.shapes || []).map((sh) => {
            const orig = selShapeMap.get(sh.id);
            if (!orig) return sh;
            return { ...sh, x: orig.x + dx, y: orig.y + dy };
          }),
          texts: (page.texts || []).map((t) => {
            const orig = selTextMap.get(t.id);
            if (!orig) return t;
            return { ...t, x: orig.x + dx, y: orig.y + dy };
          }),
        }));
        return;
      } else {
        // Corner Resize / Масштабирование и увеличение
        let newX = initialBox.x;
        let newY = initialBox.y;
        let newW = initialBox.width;
        let newH = initialBox.height;

        if (handle === 'se') {
          newX = initialBox.x;
          newY = initialBox.y;
          newW = Math.max(20, pt.x - initialBox.x);
          newH = Math.max(20, pt.y - initialBox.y);
        } else if (handle === 'sw') {
          const right = initialBox.x + initialBox.width;
          newX = Math.min(right - 20, pt.x);
          newY = initialBox.y;
          newW = right - newX;
          newH = Math.max(20, pt.y - initialBox.y);
        } else if (handle === 'ne') {
          const bottom = initialBox.y + initialBox.height;
          newX = initialBox.x;
          newY = Math.min(bottom - 20, pt.y);
          newW = Math.max(20, pt.x - initialBox.x);
          newH = bottom - newY;
        } else if (handle === 'nw') {
          const right = initialBox.x + initialBox.width;
          const bottom = initialBox.y + initialBox.height;
          newX = Math.min(right - 20, pt.x);
          newY = Math.min(bottom - 20, pt.y);
          newW = right - newX;
          newH = bottom - newY;
        }

        const scaleX = initialBox.width > 0 ? newW / initialBox.width : 1;
        const scaleY = initialBox.height > 0 ? newH / initialBox.height : 1;
        const uniformScale = Math.sqrt(Math.abs(scaleX * scaleY));

        setSelectionBox({ ...initialBox, x: newX, y: newY, width: newW, height: newH });

        const selStrokeMap = new Map(initialStrokes.map((s) => [s.id, s]));
        const selShapeMap = new Map(initialShapes.map((sh) => [sh.id, sh]));
        const selTextMap = new Map(initialTexts.map((t) => [t.id, t]));

        updateCurrentPage((page) => ({
          ...page,
          strokes: (page.strokes || []).map((s) => {
            const orig = selStrokeMap.get(s.id);
            if (!orig) return s;
            return {
              ...s,
              width: Math.max(1, orig.width * uniformScale),
              points: orig.points.map((p) => ({
                ...p,
                x: newX + (p.x - initialBox.x) * scaleX,
                y: newY + (p.y - initialBox.y) * scaleY,
              })),
            };
          }),
          shapes: (page.shapes || []).map((sh) => {
            const orig = selShapeMap.get(sh.id);
            if (!orig) return sh;
            return {
              ...sh,
              x: newX + (orig.x - initialBox.x) * scaleX,
              y: newY + (orig.y - initialBox.y) * scaleY,
              width: orig.width * scaleX,
              height: orig.height * scaleY,
              strokeWidth: Math.max(1, orig.strokeWidth * uniformScale),
            };
          }),
          texts: (page.texts || []).map((t) => {
            const orig = selTextMap.get(t.id);
            if (!orig) return t;
            return {
              ...t,
              x: newX + (orig.x - initialBox.x) * scaleX,
              y: newY + (orig.y - initialBox.y) * scaleY,
              fontSize: Math.max(8, Math.round(orig.fontSize * uniformScale)),
              width: orig.width ? orig.width * scaleX : orig.width,
              height: orig.height ? orig.height * scaleY : orig.height,
            };
          }),
        }));
        return;
      }
    }

    // Update dynamic cursor when hovering over active selection box
    if (activeTool === 'select' && selectionBox && !isPointerDownRef.current) {
      const hitTolerance = Math.max(12, 16 / scale);
      const h = getSelectionHitHandle(pt, selectionBox, hitTolerance);
      if (h === 'nw' || h === 'se') {
        setSelectionCursor('nwse-resize');
      } else if (h === 'ne' || h === 'sw') {
        setSelectionCursor('nesw-resize');
      } else if (h === 'inside') {
        setSelectionCursor('move');
      } else {
        setSelectionCursor('crosshair');
      }
    } else if (selectionCursor !== 'crosshair' && !isPointerDownRef.current) {
      setSelectionCursor('crosshair');
    }

    if (activeStrokeRef.current) {
      const pts = activeStrokeRef.current.points;
      const lastPt = pts[pts.length - 1];
      const dx = pt.x - lastPt.x;
      const dy = pt.y - lastPt.y;
      const distSq = dx * dx + dy * dy;

      if (distSq >= 1.44) {
        const smoothPt: Point = {
          x: lastPt.x * 0.15 + pt.x * 0.85,
          y: lastPt.y * 0.15 + pt.y * 0.85,
          pressure: (lastPt.pressure ?? 0.5) * 0.5 + (pt.pressure ?? 0.5) * 0.5,
          time: pt.time,
        };
        pts.push(smoothPt);
      }
    } else if (activeTool === 'eraser') {
      handleEraserAction(pt);
    } else if (activeShapeRef.current && startPointRef.current) {
      const sp = startPointRef.current;
      const rawW = pt.x - sp.x;
      const rawH = pt.y - sp.y;

      const isLineLike = ['line', 'dashed-line', 'arrow', 'dashed-arrow'].includes(activeShapeRef.current.type);

      // Smart Snap to Grid for Horizontal & Vertical lines on Grid paper
      // Condition: within half a cell's span (в пределах полклетки: <= gridSize * 0.5), the line snaps cleanly to the cell outline.
      // If deviation exceeds half a cell, it allows freeform diagonal alignment at any angle.
      if (isLineLike && currentPage.background.type === 'grid') {
        const gridSize = currentPage.background.gridSize || 25;
        const halfGrid = gridSize * 0.5;
        const absDx = Math.abs(rawW);
        const absDy = Math.abs(rawH);

        const nearestGridY = Math.round(sp.y / gridSize) * gridSize;
        const nearestGridX = Math.round(sp.x / gridSize) * gridSize;

        const distToHGrid = Math.abs(pt.y - nearestGridY);
        const distToVGrid = Math.abs(pt.x - nearestGridX);

        // Leading horizontally (right or left): snaps along horizontal cell line within half a cell leeway (в пределах полклетки)
        if (absDx >= absDy && distToHGrid <= halfGrid && absDy <= halfGrid) {
          const snappedStartX = Math.abs(sp.x - nearestGridX) <= gridSize * 0.35 ? nearestGridX : sp.x;
          activeShapeRef.current.x = snappedStartX;
          activeShapeRef.current.y = nearestGridY;
          activeShapeRef.current.width = pt.x - snappedStartX;
          activeShapeRef.current.height = 0; // perfectly horizontal along grid line
        }
        // Leading vertically (down or up): snaps along vertical cell line within half a cell leeway (в пределах полклетки)
        else if (absDy > absDx && distToVGrid <= halfGrid && absDx <= halfGrid) {
          const snappedStartY = Math.abs(sp.y - nearestGridY) <= gridSize * 0.35 ? nearestGridY : sp.y;
          activeShapeRef.current.x = nearestGridX;
          activeShapeRef.current.y = snappedStartY;
          activeShapeRef.current.width = 0; // perfectly vertical along grid line
          activeShapeRef.current.height = pt.y - snappedStartY;
        }
        // Outside half-cell leeway: freeform alignment at any angle
        else {
          activeShapeRef.current.x = sp.x;
          activeShapeRef.current.y = sp.y;
          activeShapeRef.current.width = rawW;
          activeShapeRef.current.height = rawH;
        }
      } else {
        activeShapeRef.current.width = rawW;
        activeShapeRef.current.height = rawH;
      }
    } else if (activeTool === 'select' && startPointRef.current) {
      const sp = startPointRef.current;
      const minX = Math.min(sp.x, pt.x);
      const minY = Math.min(sp.y, pt.y);
      const w = Math.abs(pt.x - sp.x);
      const h = Math.abs(pt.y - sp.y);

      setSelectionBox({
        x: minX,
        y: minY,
        width: w,
        height: h,
        strokeIds: [],
        shapeIds: [],
        textIds: [],
        imageIds: [],
      });
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    stopInteractionLoop();

    if (e.pointerType === 'pen') {
      isPenActiveRef.current = false;
      lastPenTimeRef.current = Date.now();
    } else if (e.pointerType === 'touch') {
      if (isPenActiveRef.current || (Date.now() - lastPenTimeRef.current < 800) || touchDistanceRef.current !== null) {
        return;
      }
    }

    isPointerDownRef.current = false;
    startPointRef.current = null;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (selectionTransformRef.current) {
      const handle = selectionTransformRef.current.handle;
      selectionTransformRef.current = null;
      pushHistory(handle === 'inside' ? 'Переместить выделенное' : 'Масштабировать выделенное');

      // Update selection bounding box to snuggly fit transformed items
      if (selectedIds.strokeIds.length > 0 || selectedIds.shapeIds.length > 0 || selectedIds.textIds.length > 0) {
        const tightBox = computeBoundingBoxForItems(selectedIds.strokeIds, selectedIds.shapeIds, selectedIds.textIds, currentPage);
        if (tightBox) {
          setSelectionBox(tightBox);
        }
      }
      return;
    }

    if (activeStrokeRef.current) {
      const stroke = activeStrokeRef.current;
      if (stroke.points.length >= 3) {
        stroke.points = smoothPoints(stroke.points);
      }
      updateCurrentPage((page) => ({
        ...page,
        strokes: [...(page.strokes || []), stroke],
      }), 'Draw stroke');
      activeStrokeRef.current = null;
    }

    if (activeShapeRef.current) {
      const shape = activeShapeRef.current;
      if (Math.abs(shape.width) > 2 || Math.abs(shape.height) > 2) {
        updateCurrentPage((page) => ({
          ...page,
          shapes: [...(page.shapes || []), shape],
        }), 'Add shape');
      }
      activeShapeRef.current = null;
    }

    if (activeTool === 'select' && selectionBox) {
      if (selectionBox.width < 8 && selectionBox.height < 8) {
        setSelectionBox(null);
        setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
        setIsSelectionColorPickerOpen(false);
      } else {
        const selRect = selectionBox;
        const matchedStrokes = (currentPage.strokes || [])
          .filter((s) => !s.deleted && s.points.some((p) => pointInRect(p, selRect)))
          .map((s) => s.id);
        const matchedShapes = (currentPage.shapes || [])
          .filter((s) => !s.deleted && pointInRect({ x: s.x, y: s.y }, selRect))
          .map((s) => s.id);
        const matchedTexts = (currentPage.texts || [])
          .filter((t) => !t.deleted && pointInRect({ x: t.x, y: t.y }, selRect))
          .map((t) => t.id);

        if (matchedStrokes.length === 0 && matchedShapes.length === 0 && matchedTexts.length === 0) {
          setSelectionBox(null);
          setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
          setIsSelectionColorPickerOpen(false);
        } else {
          setSelectedIds({
            strokeIds: matchedStrokes,
            shapeIds: matchedShapes,
            textIds: matchedTexts,
          });
          const tightBox = computeBoundingBoxForItems(matchedStrokes, matchedShapes, matchedTexts, currentPage);
          if (tightBox) {
            setSelectionBox(tightBox);
          }
        }
      }
    }
  };

  // Eraser engine
  const handleEraserAction = (center: Point) => {
    const now = Date.now();
    if (eraserMode === 'object') {
      let hasErased = false;
      const updatedStrokes = (currentPage.strokes || []).map((s) => {
        if (!s.deleted && strokeIntersectsCircle(s, center, eraserRadius)) {
          hasErased = true;
          return { ...s, deleted: true, updatedAt: now };
        }
        return s;
      });

      const updatedShapes = (currentPage.shapes || []).map((sh) => {
        if (!sh.deleted) {
          const cx = sh.x + sh.width / 2;
          const cy = sh.y + sh.height / 2;
          const dist = Math.hypot(cx - center.x, cy - center.y);
          const intersects = dist < eraserRadius + Math.max(Math.abs(sh.width), Math.abs(sh.height)) / 2;
          if (intersects) {
            hasErased = true;
            return { ...sh, deleted: true, updatedAt: now };
          }
        }
        return sh;
      });

      const updatedTexts = (currentPage.texts || []).map((t) => {
        if (!t.deleted) {
          const w = t.width || 120;
          const h = t.height || 40;
          const cx = t.x + w / 2;
          const cy = t.y + h / 2;
          const dist = Math.hypot(cx - center.x, cy - center.y);
          const intersects = dist < eraserRadius + Math.max(w, h) / 2;
          if (intersects) {
            hasErased = true;
            return { ...t, deleted: true, updatedAt: now };
          }
        }
        return t;
      });

      const updatedImages = (currentPage.images || []).map((img) => {
        if (!img.deleted) {
          const cx = img.x + img.width / 2;
          const cy = img.y + img.height / 2;
          const dist = Math.hypot(cx - center.x, cy - center.y);
          const intersects = dist < eraserRadius + Math.max(img.width, img.height) / 2;
          if (intersects) {
            hasErased = true;
            return { ...img, deleted: true, updatedAt: now };
          }
        }
        return img;
      });

      if (hasErased) {
        updateCurrentPage((page) => ({
          ...page,
          strokes: updatedStrokes,
          shapes: updatedShapes,
          texts: updatedTexts,
          images: updatedImages,
        }));
      }
    } else {
      let hasErased = false;
      const newStrokes: Stroke[] = [];

      for (const stroke of currentPage.strokes || []) {
        if (!stroke.deleted && strokeIntersectsCircle(stroke, center, eraserRadius)) {
          hasErased = true;
          newStrokes.push({ ...stroke, deleted: true, updatedAt: now });
          const pieces = sliceStrokeByEraser(stroke, center, eraserRadius);
          newStrokes.push(...pieces.map((p) => ({ ...p, deleted: false, updatedAt: now })));
        } else {
          newStrokes.push(stroke);
        }
      }

      if (hasErased) {
        updateCurrentPage((page) => ({
          ...page,
          strokes: newStrokes,
        }));
      }
    }
  };

  // Wheel Zoom & Pan handling
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
      handleZoomDelta(zoomFactor, mouseX, mouseY);
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Touch Pinch-to-Zoom & Pan for mobile & tablet (Два пальца: масштабирование и перемещение)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    closeAllPopovers();

    // Palm rejection
    if (isPenActiveRef.current || (Date.now() - lastPenTimeRef.current < 800)) {
      return;
    }

    if (e.touches.length >= 2) {
      // Two fingers on the sheet: cancel any tentative single-finger drawing in progress
      activeStrokeRef.current = null;
      activeShapeRef.current = null;
      isPointerDownRef.current = false;
      startInteractionLoop();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchDistanceRef.current = Math.max(10, dist);
      touchMidpointRef.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchInitialScaleRef.current = scale;
      touchInitialPanRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Palm rejection
    if (isPenActiveRef.current || (Date.now() - lastPenTimeRef.current < 800)) {
      return;
    }

    if (e.touches.length >= 2 && touchDistanceRef.current !== null && touchMidpointRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      const factor = dist / touchDistanceRef.current;
      const newScale = Math.min(3.5, Math.max(0.2, touchInitialScaleRef.current * factor));

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const startMidCanvasX = touchMidpointRef.current.x - rect.left;
      const startMidCanvasY = touchMidpointRef.current.y - rect.top;
      const curMidCanvasX = currentMidX - rect.left;
      const curMidCanvasY = currentMidY - rect.top;

      const pageX = (startMidCanvasX - touchInitialPanRef.current.x) / touchInitialScaleRef.current;
      const pageY = (startMidCanvasY - touchInitialPanRef.current.y) / touchInitialScaleRef.current;

      const newPanX = curMidCanvasX - pageX * newScale;
      const newPanY = curMidCanvasY - pageY * newScale;

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      touchDistanceRef.current = null;
      touchMidpointRef.current = null;
    }
    if (e.touches.length === 0) {
      stopInteractionLoop();
    }
  };

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') setIsSpacePressed(true);
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === '1') setActiveTool('pen');
      else if (e.key === '2') setActiveTool('pencil');
      else if (e.key === '3') setActiveTool('marker');
      else if (e.key === '4') setActiveTool('eraser');
      else if (e.key === '5') setActiveTool('rect');
      else if (e.key.toLowerCase() === 't') setActiveTool('text');
      else if (e.key.toLowerCase() === 'v') setActiveTool('select');
      else if (e.key.toLowerCase() === 'h') setActiveTool('pan');
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomDelta(1.15);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomDelta(0.85);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDeleteSelected, handleRedo, handleUndo]);

  // Insert image
  const insertImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 600;
        const aspect = img.naturalHeight / img.naturalWidth;
        const width = Math.min(maxWidth, img.naturalWidth);
        const height = width * aspect;

        const newImage: ImageObject = {
          id: `img_${Date.now()}`,
          src: dataUrl,
          x: Math.max(50, (currentPage.width - width) / 2),
          y: Math.max(50, 150),
          width,
          height,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deleted: false,
        };

        updateCurrentPage((page) => ({
          ...page,
          images: [...(page.images || []), newImage],
        }), 'Add image');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleNextPage = () => {
    if (currentPageIndex < activePages.length - 1) {
      onUpdateNotebook({ ...notebook, currentPageId: activePages[currentPageIndex + 1].id });
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      onUpdateNotebook({ ...notebook, currentPageId: activePages[currentPageIndex - 1].id });
    }
  };

  const handleAddPage = () => {
    const isLand = currentPage.width > currentPage.height;
    const dim = getStandardPageDimensions(currentPage.background.type, isLand);
    const now = Date.now();
    const newPage: Page = {
      id: `page_${now}_${Math.random().toString(36).substr(2, 5)}`,
      title: `Страница ${activePages.length + 1}`,
      order: activePages.length,
      width: dim.width,
      height: dim.height,
      background: { ...currentPage.background },
      strokes: [],
      shapes: [],
      texts: [],
      images: [],
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    onUpdateNotebook({
      ...notebook,
      pages: [...notebook.pages, newPage],
      currentPageId: newPage.id,
      updatedAt: now,
    });
  };

  const handleManualSave = () => {
    onUpdateNotebook({ ...notebook, updatedAt: Date.now() });
    setSaveSuccessFeedback(true);
    setTimeout(() => setSaveSuccessFeedback(false), 2000);
  };

  const handleFinishEditingText = () => {
    if (editingText && editingText.text.trim()) {
      const newTextObj: TextObject = {
        id: `txt_${Date.now()}`,
        x: editingText.x,
        y: editingText.y,
        width: Math.max(160, editingText.text.length * 9),
        height: 50,
        text: editingText.text,
        fontSize: editingText.fontSize,
        fontFamily: 'Inter, sans-serif',
        color: editingText.color,
        bold: editingText.bold,
        italic: editingText.italic,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
      };
      updateCurrentPage((page) => ({
        ...page,
        texts: [...(page.texts || []).filter((t) => t.id !== newTextObj.id), newTextObj],
      }), 'Add text');
    }
    setEditingText(null);
  };

  const currentRulingName = RULING_TYPES.find((r) => r.id === currentPage.background.type)?.name || 'Клетка';
  const hasSelectedItems = selectedIds.strokeIds.length > 0 || selectedIds.shapeIds.length > 0 || selectedIds.textIds.length > 0;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans select-none relative w-full h-full transition-colors ${
      isDark ? 'bg-[#0E0F14]' : 'bg-[#F7F8FC]'
    }`}>
      {/* 1. Mobile Interface matching the 6 user design mockups */}
      {isMobile ? (
        <MobileEditorView
          notebook={notebook}
          currentPage={currentPage}
          currentPageIndex={currentPageIndex}
          totalPages={activePages.length}
          activePages={activePages}
          theme={theme}
          currentRulingName={currentRulingName}
          activeTool={activeTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          eraserMode={eraserMode}
          eraserRadius={eraserRadius}
          historyIndex={historyIndex}
          historyLength={history.length}
          scale={scale}
          isLandscapeScreen={isLandscapeScreen}
          editingText={editingText}
          onBackToLibrary={onBackToLibrary}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onAddPage={handleAddPage}
          onSelectPage={(pageId) => onUpdateNotebook({ ...notebook, currentPageId: pageId })}
          onDeletePage={(pageId) => {
            const now = Date.now();
            const updatedPages = notebook.pages.map((pg) =>
              pg.id === pageId ? { ...pg, deleted: true, updatedAt: now } : pg
            );
            const remaining = updatedPages.filter((pg) => !pg.deleted);
            onUpdateNotebook({
              ...notebook,
              pages: updatedPages,
              currentPageId: remaining[0]?.id || pageId,
              updatedAt: now,
            });
          }}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool !== 'select') {
              setSelectionBox(null);
              setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
              setIsSelectionColorPickerOpen(false);
            }
          }}
          onSetStrokeColor={setStrokeColor}
          onSetStrokeWidth={setStrokeWidth}
          onSetStrokeOpacity={setStrokeOpacity}
          onSetEraserMode={setEraserMode}
          onSetEraserRadius={setEraserRadius}
          onSetRulingType={(t) => {
            updateCurrentPage((page) => {
              const isLand = page.width > page.height;
              const dim = getStandardPageDimensions(t, isLand);
              return {
                ...page,
                width: dim.width,
                height: dim.height,
                background: { ...page.background, type: t },
              };
            }, 'Смена разлиновки листа');
          }}
          onSetPaperColor={(color) => {
            updateCurrentPage((page) => ({
              ...page,
              background: { ...page.background, color },
            }), 'Смена цвета бумаги');
          }}
          onSetGridSize={(size) => {
            updateCurrentPage((page) => ({
              ...page,
              background: { ...page.background, gridSize: size },
            }));
          }}
          onTogglePageOrientation={togglePageOrientation}
          onClearPage={handleClearCanvas}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onInsertImageClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) insertImageFile(f);
            };
            input.click();
          }}
          onFinishEditingText={handleFinishEditingText}
          onChangeEditingText={(updates) => {
            setEditingText((prev) => prev ? { ...prev, ...updates } : null);
          }}
          onToggleFitToWidth={handleToggleFitToWidth}
        />
      ) : (
        /* Desktop Studio Header */
        <EditorHeader
          notebook={notebook}
          currentPage={currentPage}
          currentPageIndex={currentPageIndex}
          totalPages={activePages.length}
          currentRulingName={currentRulingName}
          isSheetFullscreen={isSheetFullscreen}
          theme={theme}
          saveSuccessFeedback={saveSuccessFeedback}
          onBackToLibrary={onBackToLibrary}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onAddPage={handleAddPage}
          onClearPage={handleClearCanvas}
          onToggleSheetFullscreen={toggleSheetFullscreen}
          onToggleTheme={onToggleTheme}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenRulingPopover={() => {
            setIsRulingPopoverOpen(!isRulingPopoverOpen);
            setIsPaperColorPopoverOpen(false);
            setIsCoverPopoverOpen(false);
          }}
          onOpenPaperColorPopover={() => {
            setIsPaperColorPopoverOpen(!isPaperColorPopoverOpen);
            setIsRulingPopoverOpen(false);
            setIsCoverPopoverOpen(false);
          }}
          onOpenCoverPopover={() => {
            setIsCoverPopoverOpen(!isCoverPopoverOpen);
            setIsRulingPopoverOpen(false);
            setIsPaperColorPopoverOpen(false);
          }}
          isEditingTitle={isEditingTitle}
          titleInput={titleInput}
          onStartEditingTitle={() => setIsEditingTitle(true)}
          onChangeTitleInput={setTitleInput}
          onSubmitTitle={() => {
            if (titleInput.trim()) onUpdateNotebook({ ...notebook, title: titleInput.trim() });
            setIsEditingTitle(false);
          }}
        />
      )}

      {/* 2. Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        {/* Left: Pages Sidebar (Desktop only) */}
        {!isMobile && (
          <PagesSidebar
            notebook={notebook}
            currentPageId={currentPage.id}
            isOpen={isPagesSidebarOpen}
            theme={theme}
            onToggleOpen={() => {
              const next = !isPagesSidebarOpen;
              setIsPagesSidebarOpen(next);
              if (next && isSheetFullscreen) {
                setIsSheetFullscreen(false);
              }
              if (next && typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsToolSidebarOpen(false);
              }
            }}
            onSelectPage={(pageId) => onUpdateNotebook({ ...notebook, currentPageId: pageId })}
            onAddPage={handleAddPage}
            onDeletePage={(pageId) => {
              const now = Date.now();
              const updatedPages = notebook.pages.map((pg) =>
                pg.id === pageId ? { ...pg, deleted: true, updatedAt: now } : pg
              );
              const remaining = updatedPages.filter((pg) => !pg.deleted);
              onUpdateNotebook({
                ...notebook,
                pages: updatedPages,
                currentPageId: remaining[0]?.id || pageId,
                updatedAt: now,
              });
            }}
          />
        )}

        {/* Center: Main Canvas Sheet Viewport */}
        <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
          {/* Top Floating Pill Toolbar (Desktop only) */}
          {!isMobile && (
            <FloatingToolbar
              activeTool={activeTool}
              showToolOptions={showToolOptions}
              eraserMode={eraserMode}
              eraserRadius={eraserRadius}
              historyIndex={historyIndex}
              historyLength={history.length}
              theme={theme}
              onSelectTool={(tool) => {
                setActiveTool(tool);
                if (tool !== 'select') {
                  setSelectionBox(null);
                  setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
                  setIsSelectionColorPickerOpen(false);
                }
                if (!isToolSidebarOpen) {
                  setIsToolSidebarOpen(true);
                  if (isSheetFullscreen) {
                    setIsSheetFullscreen(false);
                  }
                }
              }}
              onToggleToolOptions={() => setShowToolOptions(!showToolOptions)}
              onSetEraserMode={setEraserMode}
              onSetEraserRadius={setEraserRadius}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onInsertImageClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) insertImageFile(f);
                };
                input.click();
              }}
            />
          )}

          {/* Interactive Canvas on Desk */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={`w-full h-full touch-none block absolute inset-0 ${
              isPanning
                ? 'cursor-grabbing'
                : isSpacePressed || activeTool === 'pan'
                ? 'cursor-grab active:cursor-grabbing'
                : activeTool === 'select'
                ? selectionTransformRef.current?.handle === 'inside'
                  ? 'cursor-grabbing'
                  : selectionTransformRef.current
                  ? selectionTransformRef.current.handle === 'nw' || selectionTransformRef.current.handle === 'se'
                    ? 'cursor-nwse-resize'
                    : 'cursor-nesw-resize'
                  : selectionCursor === 'move'
                  ? 'cursor-move'
                  : selectionCursor === 'nwse-resize'
                  ? 'cursor-nwse-resize'
                  : selectionCursor === 'nesw-resize'
                  ? 'cursor-nesw-resize'
                  : 'cursor-crosshair'
                : activeTool === 'eraser'
                ? 'cursor-crosshair'
                : 'cursor-crosshair'
            }`}
          />

          {/* Floating Selection Toolbar (when elements are selected) */}
          {selectionBox && hasSelectedItems && (
            <div
              data-popover="true"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute z-40 border rounded-2xl shadow-2xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold animate-in fade-in zoom-in-95 duration-100 ${
                isDark
                  ? 'bg-[#181922] border-neutral-700 text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
              style={{
                left: Math.max(16, Math.min(window.innerWidth - 300, pan.x + selectionBox.x * scale)),
                top: Math.max(70, pan.y + selectionBox.y * scale - 48),
              }}
            >
              <span className={`text-[11px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {selectedIds.strokeIds.length + selectedIds.shapeIds.length + selectedIds.textIds.length} выбр.
              </span>
              <div className={`w-px h-3.5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateSelected();
                }}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
                }`}
                title="Дублировать выделенные элементы"
              >
                <Copy className="w-3.5 h-3.5 text-[#6355C7]" />
                <span>Копия</span>
              </button>
              
              <div className="relative">
                <button
                  data-popover-trigger="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSelectionColorPickerOpen(!isSelectionColorPickerOpen);
                  }}
                  className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelectionColorPickerOpen
                      ? 'bg-[#6355C7] text-white'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
                  }`}
                  title="Выбрать цвет для выделения"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 inline-block shadow-2xs"
                    style={{ backgroundColor: strokeColor }}
                  />
                  <span>Цвет</span>
                </button>

                {isSelectionColorPickerOpen && (
                  <div
                    data-popover="true"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute bottom-full left-0 mb-2 p-2 rounded-2xl border shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDark ? 'bg-[#1C1D2C] border-neutral-700' : 'bg-white border-neutral-200 shadow-xl'
                    }`}
                  >
                    {[
                      '#0F172A',
                      '#2563EB',
                      '#7C3AED',
                      '#DC2626',
                      '#EA580C',
                      '#059669',
                      '#D97706',
                      '#EC4899',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecolorSelected(c);
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-115 cursor-pointer ${
                          strokeColor === c ? 'ring-2 ring-[#6355C7] ring-offset-1' : ''
                        }`}
                      />
                    ))}
                    <label
                      title="Свой цвет"
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded-full border border-dashed border-neutral-400 flex items-center justify-center cursor-pointer hover:border-[#6355C7]"
                    >
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRecolorSelected(e.target.value);
                        }}
                        className="opacity-0 w-0 h-0"
                      />
                      <Palette className="w-3 h-3 text-neutral-500" />
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSelected();
                }}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  isDark
                    ? 'bg-red-950/60 text-red-400 hover:bg-red-900/60'
                    : 'bg-white border border-red-200 hover:bg-red-50 text-red-600 shadow-2xs'
                }`}
                title="Удалить выделение"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectionBox(null);
                  setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
                  setIsSelectionColorPickerOpen(false);
                }}
                className={`p-1 rounded-lg cursor-pointer ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Снять выделение"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Inline Text Editor */}
          {editingText && (
            <div
              className={`absolute z-40 p-2.5 rounded-2xl shadow-2xl border-2 border-[#6355C7] max-w-[calc(100vw-32px)] ${
                isDark ? 'bg-neutral-900/90 text-white backdrop-blur-md' : 'bg-white/90 text-neutral-900 backdrop-blur-md'
              }`}
              style={{
                left: Math.max(16, Math.min(window.innerWidth - 270, pan.x + editingText.x * scale)),
                top: Math.max(64, Math.min(window.innerHeight - 170, pan.y + editingText.y * scale)),
              }}
            >
              <textarea
                autoFocus
                rows={2}
                placeholder="Введите текст..."
                value={editingText.text}
                onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                className={`w-60 p-2 text-sm bg-transparent border-none resize-none focus:outline-none ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
                style={{
                  fontSize: `${editingText.fontSize}px`,
                  fontWeight: editingText.bold ? 'bold' : 'normal',
                  fontStyle: editingText.italic ? 'italic' : 'normal',
                  color: editingText.color,
                }}
              />
              {!isMobile && (
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <button
                    onClick={() => setEditingText(null)}
                    className={`px-2.5 py-1 text-xs font-semibold ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-950'}`}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleFinishEditingText}
                    className="px-3.5 py-1 text-xs font-bold rounded-lg shadow-xs bg-[#6355C7] text-white hover:bg-[#5244B4]"
                  >
                    Вставить
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Floating Status Bar & Sheet Zoom Controls (Desktop only) */}
          {!isMobile && (
            <div className="absolute bottom-4 right-6 z-30 pointer-events-auto flex items-center gap-2">
              {/* Zoom Presets Popover */}
              {isZoomMenuOpen && (
                <div
                  data-popover="true"
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute bottom-full mb-2 right-0 w-52 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 text-xs font-semibold ${
                    isDark
                      ? 'bg-[#181928] border-neutral-700 text-neutral-200'
                      : 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
                  }`}
                >
                  <div className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Масштаб листа
                  </div>
                  {[
                    { label: '50%', value: 0.50 },
                    { label: '70% (По умолчанию)', value: 0.70 },
                    { label: '100% (1:1 Реальный)', value: 1.00 },
                    { label: '125%', value: 1.25 },
                    { label: '150%', value: 1.50 },
                    { label: '200%', value: 2.00 },
                    { label: '300%', value: 3.00 },
                  ].map((item) => {
                    const isSelected = Math.abs(scale - item.value) < 0.03;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleSetPresetZoom(item.value)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                          isSelected
                            ? isDark ? 'bg-[#252238] text-[#A79AF3] font-bold' : 'bg-[#EFEAFD] text-[#6355C7] font-bold'
                            : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6355C7]" />}
                      </button>
                    );
                  })}
                  <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />
                  <button
                    onClick={handleToggleFitToWidth}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-[#6355C7]" />
                      Вписать по ширине
                    </span>
                  </button>
                </div>
              )}

              {/* Bottom Dock Container */}
              <div className={`flex items-center gap-1.5 backdrop-blur-xl px-3 py-1.5 rounded-2xl border shadow-xl text-xs font-semibold ${
                isDark
                  ? 'bg-[#12131F]/95 border-neutral-700/80 text-white'
                  : 'bg-white/95 border-[#E2E4EC] text-neutral-800'
              }`}>
                {/* Page Navigator */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPageIndex <= 0}
                  className="p-1 rounded-lg disabled:opacity-20 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Предыдущая страница"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs px-1 text-neutral-500 dark:text-neutral-400">
                  {currentPageIndex + 1} / {activePages.length}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPageIndex >= activePages.length - 1}
                  className="p-1 rounded-lg disabled:opacity-20 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Следующая страница"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className={`w-px h-3.5 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

                {/* Zoom Out Button */}
                <button
                  onClick={() => handleZoomDelta(0.85)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Уменьшить масштаб (Ctrl -)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Zoom Percentage */}
                <button
                  data-popover-trigger="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomMenuOpen(!isZoomMenuOpen);
                  }}
                  className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Масштаб листа (клик для выбора)"
                >
                  {Math.round(scale * 100)}%
                </button>

                {/* Zoom In Button */}
                <button
                  onClick={() => handleZoomDelta(1.15)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Увеличить масштаб (Ctrl +)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className={`w-px h-3.5 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

                {/* Fit / Fullscreen Sheet Toggle */}
                <button
                  onClick={toggleSheetFullscreen}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSheetFullscreen
                      ? 'bg-[#6355C7] text-white shadow-xs font-semibold'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                  title={isSheetFullscreen ? 'Вернуть обычный вид' : 'Вписать лист по ширине экрана'}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#6355C7]" />
                  <span>{isSheetFullscreen ? 'Обычный вид' : 'Вписать по ширине'}</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right: Tool Sidebar (Desktop only) */}
        {!isMobile && (
          <ToolSidebar
            activeTool={activeTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            eraserMode={eraserMode}
            eraserRadius={eraserRadius}
            currentRulingType={currentPage.background.type}
            currentRulingName={currentRulingName}
            currentPaperColor={currentPage.background.color}
            currentGridSize={currentPage.background.gridSize || (currentPage.background.type === 'ruled' ? 32 : 24)}
            isLandscape={currentPage.width > currentPage.height}
            isOpen={isToolSidebarOpen}
            theme={theme}
            onToggleOpen={() => {
              const next = !isToolSidebarOpen;
              setIsToolSidebarOpen(next);
              if (next && isSheetFullscreen) {
                setIsSheetFullscreen(false);
              }
              if (next && typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsPagesSidebarOpen(false);
              }
            }}
            onSetStrokeColor={setStrokeColor}
            onSetStrokeWidth={setStrokeWidth}
            onSetStrokeOpacity={setStrokeOpacity}
            onSetEraserMode={setEraserMode}
            onSetEraserRadius={setEraserRadius}
            onSetRulingType={(t) => {
              updateCurrentPage((page) => {
                const isLand = page.width > page.height;
                const dim = getStandardPageDimensions(t, isLand);
                return {
                  ...page,
                  width: dim.width,
                  height: dim.height,
                  background: { ...page.background, type: t },
                };
              }, 'Смена разлиновки листа');
            }}
            onSetGridSize={(size) => {
              updateCurrentPage((page) => ({
                ...page,
                background: { ...page.background, gridSize: size },
              }));
            }}
            onSetPaperColor={(c) => {
              updateCurrentPage((page) => ({
                ...page,
                background: { ...page.background, color: c },
              }), 'Смена цвета листа');

              // Automatically switch pen color:
              // Dark paper (Midnight, Графит) -> White (#FFFFFF)
              // Light paper (Белая, Крем) -> Black (#0F172A)
              if (isColorDark(c)) {
                setStrokeColor('#FFFFFF');
              } else {
                setStrokeColor('#0F172A');
              }
            }}
            onToggleOrientation={togglePageOrientation}
          />
        )}
      </div>

      {/* Popover: Ruling Selector */}
      {isRulingPopoverOpen && (
        <div 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-8 top-24 p-4 rounded-2xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-150 border ${
            isDark 
              ? 'bg-[#181922] border-neutral-700 text-white' 
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          <span className={`text-xs font-bold block mb-2.5 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Разлиновка страницы:
          </span>

          <div className="grid grid-cols-2 gap-2 mb-3.5">
            {RULING_TYPES.map((r) => {
              const isSelected = currentPage.background.type === r.id;
              const IconComp = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    updateCurrentPage((page) => ({
                      ...page,
                      background: {
                        ...page.background,
                        type: r.id,
                      },
                    }));
                    setIsRulingPopoverOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    isSelected
                      ? isDark
                        ? 'border-[#6355C7] bg-[#252238] ring-2 ring-[#6355C7] text-[#A79AF3]'
                        : 'border-2 border-[#6355C7] bg-[#F7F6FC] ring-2 ring-[#EFEAFD] text-[#6355C7] font-bold shadow-xs'
                      : isDark
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <IconComp className="w-4 h-4 text-[#6355C7]" />
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#6355C7]" />}
                  </div>
                  <div className="text-xs font-bold">{r.name}</div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{r.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Grid Size Slider */}
          {currentPage.background.type !== 'blank' && (
            <div className={`pt-2.5 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>Шаг сетки:</span>
                <span className="font-mono text-[#6355C7] font-bold">
                  {currentPage.background.gridSize}px
                </span>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                {[18, 25, 34].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      updateCurrentPage((page) => ({
                        ...page,
                        background: { ...page.background, gridSize: sz },
                      }));
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      currentPage.background.gridSize === sz
                        ? 'bg-[#6355C7] text-white border-[#6355C7]'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                          : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50 shadow-2xs'
                    }`}
                  >
                    {sz === 18 ? 'Мелкая' : sz === 25 ? 'Обычная' : 'Крупная'}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="16"
                max="48"
                value={currentPage.background.gridSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateCurrentPage((page) => ({
                    ...page,
                    background: { ...page.background, gridSize: val },
                  }));
                }}
                className="w-full accent-[#6355C7] cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Popover: Paper Color Selector */}
      {isPaperColorPopoverOpen && (
        <div 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-8 top-24 p-4 rounded-2xl shadow-2xl z-50 w-76 animate-in fade-in slide-in-from-top-2 duration-150 border ${
            isDark
              ? 'bg-[#181922] border-neutral-700 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          <span className={`text-xs font-bold block mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Светлая бумага:
          </span>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {LIGHT_PAPERS.map((p) => {
              const isSelected = currentPage.background.color.toLowerCase() === p.color.toLowerCase();
              return (
                <button
                  key={p.color}
                  onClick={() => {
                    updateCurrentPage((page) => ({
                      ...page,
                      background: { ...page.background, color: p.color },
                    }));
                    if (strokeColor === '#F1F5F9' || strokeColor === '#FFFFFF') {
                      setStrokeColor('#0F172A');
                    }
                    setIsPaperColorPopoverOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? isDark
                        ? 'border-[#6355C7] bg-[#252238] ring-2 ring-[#6355C7]'
                        : 'border-2 border-[#6355C7] bg-white ring-2 ring-[#EFEAFD] shadow-xs'
                      : isDark
                        ? 'border-neutral-700 hover:bg-neutral-800'
                        : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white shadow-2xs'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full border border-black/20 shadow-xs"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className={`text-[11px] font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          <span className={`text-xs font-bold block mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Тёмная бумага:
          </span>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            {DARK_PAPERS.map((p) => {
              const isSelected = currentPage.background.color.toLowerCase() === p.color.toLowerCase();
              return (
                <button
                  key={p.color}
                  onClick={() => {
                    updateCurrentPage((page) => ({
                      ...page,
                      background: { ...page.background, color: p.color },
                    }));
                    if (strokeColor === '#0F172A') {
                      setStrokeColor('#F1F5F9');
                    }
                    setIsPaperColorPopoverOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? isDark
                        ? 'border-[#6355C7] bg-[#252238] ring-2 ring-[#6355C7]'
                        : 'border-2 border-[#6355C7] bg-white ring-2 ring-[#EFEAFD] shadow-xs'
                      : isDark
                        ? 'border-neutral-700 hover:bg-neutral-800'
                        : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white shadow-2xs'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full border border-white/30 shadow-xs"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className={`text-[11px] font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Color Input */}
          <div className={`pt-2.5 border-t flex items-center justify-between ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}>
            <span className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Свой цвет листа:</span>
            <input
              type="color"
              value={currentPage.background.color}
              onChange={(e) => {
                const newColor = e.target.value;
                updateCurrentPage((page) => ({
                  ...page,
                  background: { ...page.background, color: newColor },
                }));
                if (isColorDark(newColor)) {
                  setStrokeColor('#FFFFFF');
                } else {
                  setStrokeColor('#0F172A');
                }
              }}
              className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-300 p-0"
              title="Выбрать любой цвет"
            />
          </div>
        </div>
      )}

      {/* Popover: Cover Color Selector */}
      {isCoverPopoverOpen && (
        <div 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-8 top-24 p-4 rounded-2xl shadow-2xl z-50 w-80 animate-in fade-in slide-in-from-top-2 duration-150 border ${
            isDark
              ? 'bg-[#181922] border-neutral-700 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          <span className={`text-xs font-bold block mb-2.5 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Цвет обложки тетради:
          </span>

          <div className="grid grid-cols-2 gap-2 mb-3.5 max-h-64 overflow-y-auto pr-1">
            {COVER_PRESETS.map((c) => {
              const isSelected = notebook.coverColor.toLowerCase() === c.color.toLowerCase();
              return (
                <button
                  key={c.color}
                  onClick={() => {
                    onUpdateNotebook({ ...notebook, coverColor: c.color });
                    setIsCoverPopoverOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? isDark
                        ? 'border-[#6355C7] bg-[#252238] ring-2 ring-[#6355C7]'
                        : 'border-2 border-[#6355C7] bg-white ring-2 ring-[#EFEAFD] shadow-xs'
                      : isDark
                        ? 'border-neutral-700 hover:bg-neutral-800'
                        : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white shadow-2xs'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-lg border-2 border-white/80 dark:border-neutral-700 shadow-sm shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className={`text-[11px] font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {c.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#6355C7] ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className={`pt-2.5 border-t flex items-center justify-between ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}>
            <span className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Свой оттенок:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={notebook.coverColor}
                onChange={(e) => onUpdateNotebook({ ...notebook, coverColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-300 p-0"
                title="Выбрать любой цвет"
              />
              <span className={`font-mono text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                {notebook.coverColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Export */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className={`rounded-2xl w-full max-w-sm p-6 shadow-2xl border ${
            isDark
              ? 'bg-[#181922] border-neutral-700 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Экспорт конспектов
            </h3>

            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => {
                  exportToNotoFile(notebook);
                  setIsExportModalOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                  isDark
                    ? 'border-neutral-700 hover:border-[#6355C7] bg-neutral-800/40 text-white'
                    : 'border-neutral-200 hover:border-[#6355C7] bg-white text-neutral-900 shadow-2xs'
                }`}
              >
                <div>
                  <div className={`font-bold group-hover:text-[#6355C7] ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Файл .noto
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Векторный проект тетради</div>
                </div>
                <Download className="w-4 h-4 text-[#6355C7]" />
              </button>

              <button
                onClick={() => {
                  exportNotebookToPdf(notebook);
                  setIsExportModalOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                  isDark
                    ? 'border-neutral-700 hover:border-red-500 bg-neutral-800/40 text-white'
                    : 'border-neutral-200 hover:border-red-500 bg-white text-neutral-900 shadow-2xs'
                }`}
              >
                <div>
                  <div className={`font-bold group-hover:text-red-600 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Документ PDF
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Для печати и отправки</div>
                </div>
                <Download className="w-4 h-4 text-red-600" />
              </button>

              <button
                onClick={() => {
                  exportPageAsImage(currentPage, 'png');
                  setIsExportModalOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                  isDark
                    ? 'border-neutral-700 hover:border-emerald-500 bg-neutral-800/40 text-white'
                    : 'border-neutral-200 hover:border-emerald-500 bg-white text-neutral-900 shadow-2xs'
                }`}
              >
                <div>
                  <div className={`font-bold group-hover:text-emerald-600 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Изображение PNG
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Снимок листа в высоком разрешении</div>
                </div>
                <Download className="w-4 h-4 text-emerald-600" />
              </button>
            </div>

            <div className="flex justify-end pt-4 mt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className={`text-xs font-semibold ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-950'}`}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

