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
import { renderPage, isColorDark, renderShape } from '../drawing-engine/renderer';
import { strokeIntersectsCircle, sliceStrokeByEraser, pointInRect, smoothPoints, getStrokeBounds, getShapeBounds } from '../drawing-engine/math';
import { exportNotebookToPdf, exportPageAsImage, exportToNotoFile } from '../export/exporter';

interface EditorWorkspaceProps {
  notebook: Notebook;
  onBackToLibrary: () => void;
  onUpdateNotebook: (updated: Notebook) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
}) => {
  const isDark = theme === 'dark';
  const currentPageIndex = Math.max(
    0,
    notebook.pages.findIndex((p) => p.id === notebook.currentPageId)
  );
  const currentPage = notebook.pages[currentPageIndex] || notebook.pages[0];

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

  // History Stack
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Clean Popovers: separate Ruling, Paper Color, and Cover Color
  const [isRulingPopoverOpen, setIsRulingPopoverOpen] = useState(false);
  const [isPaperColorPopoverOpen, setIsPaperColorPopoverOpen] = useState(false);
  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);

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

  // Selection Tool State & Dragging
  const [selectedIds, setSelectedIds] = useState<{
    strokeIds: string[];
    shapeIds: string[];
    textIds: string[];
  }>({ strokeIds: [], shapeIds: [], textIds: [] });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isDraggingSelectionRef = useRef(false);
  const dragSelectionStartRef = useRef<Point | null>(null);

  // Close all popovers helper
  const closeAllPopovers = useCallback(() => {
    setIsRulingPopoverOpen(false);
    setIsPaperColorPopoverOpen(false);
    setIsCoverPopoverOpen(false);
    setIsZoomMenuOpen(false);
    setShowToolOptions(false);
    setIsPagesDrawerOpen(false);
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

  // Auto-expand canvas width to 2200px and height to 7500px for vast horizontal room
  useEffect(() => {
    if (currentPage.width < 2000) {
      updateCurrentPage((page) => ({
        ...page,
        width: 2200,
        height: Math.max(7500, page.height),
      }));
    }
  }, [currentPage.id, currentPage.width]);

  // Default zoom 70% when entering the sheet / page as requested
  useEffect(() => {
    const initPageZoom = () => {
      const vWidth = window.innerWidth;
      const defaultScale = 0.70;
      setScale(defaultScale);

      const renderW = currentPage.width * defaultScale;
      setPan({
        x: Math.max(16, (vWidth - renderW) / 2),
        y: 28,
      });
    };

    initPageZoom();
  }, [currentPage.id]);

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
    setHistoryIndex((prev) => prev - 1);
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

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Contrasting studio desk background
    ctx.fillStyle = theme === 'dark' ? '#090A0D' : '#E2E8F0';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    const darkPaper = isColorDark(currentPage.background.color);

    // 2. Physical paper sheet boundaries & drop-shadow
    ctx.save();
    ctx.shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = 24 / scale;
    ctx.shadowOffsetY = 8 / scale;
    ctx.fillStyle = currentPage.background.color;
    ctx.fillRect(0, 0, currentPage.width, currentPage.height);
    ctx.restore();

    // 3. Crisp sheet boundary outline: clearly visible on both light and midnight dark paper
    ctx.save();
    if (darkPaper) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // Gentle, clear border around midnight paper
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)'; // Crisp border around white paper
    }
    ctx.lineWidth = Math.max(1, 1.2 / scale);
    ctx.strokeRect(0, 0, currentPage.width, currentPage.height);
    ctx.restore();

    // 4. Render page contents (strictly bounded within the sheet)
    renderPage(ctx, currentPage, {
      activeStroke: activeStrokeRef.current,
      selection: selectionBox,
      eraserPreview: eraserPreviewRef.current,
      pressureEnabled: true,
    });

    // Active Shape in progress (with live outline for ALL shapes: triangle, star, lines, arrows, rect, circle)
    if (activeShapeRef.current) {
      const s = activeShapeRef.current;
      renderShape(ctx, {
        ...s,
        opacity: 0.9,
      });
    }

    ctx.restore();
  }, [currentPage, pan, scale, selectionBox, theme]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      repaintCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
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

  // Clear entire canvas (with Undo support)
  const handleClearCanvas = () => {
    if (
      (currentPage.strokes?.length || 0) === 0 &&
      (currentPage.shapes?.length || 0) === 0 &&
      (currentPage.texts?.length || 0) === 0 &&
      (currentPage.images?.length || 0) === 0
    ) {
      return;
    }
    updateCurrentPage((page) => ({
      ...page,
      strokes: [],
      shapes: [],
      texts: [],
      images: [],
    }), 'Очистить лист');
    setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
    setSelectionBox(null);
  };

  // Selection actions: Delete, Duplicate, Recolor
  const handleDeleteSelected = () => {
    if (selectedIds.strokeIds.length === 0 && selectedIds.shapeIds.length === 0 && selectedIds.textIds.length === 0) return;
    updateCurrentPage((page) => ({
      ...page,
      strokes: (page.strokes || []).filter((s) => !selectedIds.strokeIds.includes(s.id)),
      shapes: (page.shapes || []).filter((s) => !selectedIds.shapeIds.includes(s.id)),
      texts: (page.texts || []).filter((t) => !selectedIds.textIds.includes(t.id)),
    }), 'Удалить выделенное');
    setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
    setSelectionBox(null);
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.strokeIds.length === 0 && selectedIds.shapeIds.length === 0 && selectedIds.textIds.length === 0) return;
    const offset = 30;
    const newStrokes = (currentPage.strokes || [])
      .filter((s) => selectedIds.strokeIds.includes(s.id))
      .map((s) => ({
        ...s,
        id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        points: s.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
      }));
    const newShapes = (currentPage.shapes || [])
      .filter((s) => selectedIds.shapeIds.includes(s.id))
      .map((s) => ({
        ...s,
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        x: s.x + offset,
        y: s.y + offset,
      }));
    const newTexts = (currentPage.texts || [])
      .filter((t) => selectedIds.textIds.includes(t.id))
      .map((t) => ({
        ...t,
        id: `txt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        x: t.x + offset,
        y: t.y + offset,
      }));

    updateCurrentPage((page) => ({
      ...page,
      strokes: [...(page.strokes || []), ...newStrokes],
      shapes: [...(page.shapes || []), ...newShapes],
      texts: [...(page.texts || []), ...newTexts],
    }), 'Дублировать выделенное');

    setSelectedIds({
      strokeIds: newStrokes.map((s) => s.id),
      shapeIds: newShapes.map((s) => s.id),
      textIds: newTexts.map((t) => t.id),
    });

    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        x: selectionBox.x + offset,
        y: selectionBox.y + offset,
      });
    }
  };

  const handleRecolorSelected = () => {
    if (selectedIds.strokeIds.length === 0 && selectedIds.shapeIds.length === 0 && selectedIds.textIds.length === 0) return;
    updateCurrentPage((page) => ({
      ...page,
      strokes: (page.strokes || []).map((s) => selectedIds.strokeIds.includes(s.id) ? { ...s, color: strokeColor } : s),
      shapes: (page.shapes || []).map((s) => selectedIds.shapeIds.includes(s.id) ? { ...s, strokeColor: strokeColor } : s),
      texts: (page.texts || []).map((t) => selectedIds.textIds.includes(t.id) ? { ...t, color: strokeColor } : t),
    }), 'Перекрасить выделенное');
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Automatically close any open popover as requested!
    closeAllPopovers();

    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return;

    isPointerDownRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const pt = screenToPageCoord(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    pt.pressure = pressure;
    pt.time = Date.now();

    startPointRef.current = pt;

    // Selection move handling
    if (activeTool === 'select' && selectionBox) {
      const inBox = pointInRect(pt, selectionBox);
      if (inBox && (selectedIds.strokeIds.length > 0 || selectedIds.shapeIds.length > 0 || selectedIds.textIds.length > 0)) {
        isDraggingSelectionRef.current = true;
        dragSelectionStartRef.current = pt;
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

    // Dragging active selection
    if (isDraggingSelectionRef.current && dragSelectionStartRef.current && selectionBox) {
      const dx = pt.x - dragSelectionStartRef.current.x;
      const dy = pt.y - dragSelectionStartRef.current.y;
      dragSelectionStartRef.current = pt;

      setSelectionBox((prev) => prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : null);

      updateCurrentPage((page) => ({
        ...page,
        strokes: (page.strokes || []).map((s) => {
          if (!selectedIds.strokeIds.includes(s.id)) return s;
          return {
            ...s,
            points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
          };
        }),
        shapes: (page.shapes || []).map((sh) => {
          if (!selectedIds.shapeIds.includes(sh.id)) return sh;
          return { ...sh, x: sh.x + dx, y: sh.y + dy };
        }),
        texts: (page.texts || []).map((t) => {
          if (!selectedIds.textIds.includes(t.id)) return t;
          return { ...t, x: t.x + dx, y: t.y + dy };
        }),
      }));
      return;
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
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingSelectionRef.current) {
      isDraggingSelectionRef.current = false;
      pushHistory('Переместить выделенное');
      return;
    }

    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
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
      if (selectionBox.width < 5 && selectionBox.height < 5) {
        setSelectionBox(null);
        setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
      } else {
        const selRect = selectionBox;
        const matchedStrokes = (currentPage.strokes || [])
          .filter((s) => s.points.some((p) => pointInRect(p, selRect)))
          .map((s) => s.id);
        const matchedShapes = (currentPage.shapes || [])
          .filter((s) => pointInRect({ x: s.x, y: s.y }, selRect))
          .map((s) => s.id);
        const matchedTexts = (currentPage.texts || [])
          .filter((t) => pointInRect({ x: t.x, y: t.y }, selRect))
          .map((t) => t.id);

        setSelectedIds({
          strokeIds: matchedStrokes,
          shapeIds: matchedShapes,
          textIds: matchedTexts,
        });
      }
    }
  };

  // Eraser engine
  const handleEraserAction = (center: Point) => {
    if (eraserMode === 'object') {
      let hasErased = false;
      const filteredStrokes = (currentPage.strokes || []).filter((s) => {
        const intersects = strokeIntersectsCircle(s, center, eraserRadius);
        if (intersects) hasErased = true;
        return !intersects;
      });

      const filteredShapes = (currentPage.shapes || []).filter((sh) => {
        const cx = sh.x + sh.width / 2;
        const cy = sh.y + sh.height / 2;
        const dist = Math.hypot(cx - center.x, cy - center.y);
        const intersects = dist < eraserRadius + Math.max(Math.abs(sh.width), Math.abs(sh.height)) / 2;
        if (intersects) hasErased = true;
        return !intersects;
      });

      if (hasErased) {
        updateCurrentPage((page) => ({
          ...page,
          strokes: filteredStrokes,
          shapes: filteredShapes,
        }));
      }
    } else {
      let hasErased = false;
      const newStrokes: Stroke[] = [];

      for (const stroke of currentPage.strokes || []) {
        if (strokeIntersectsCircle(stroke, center, eraserRadius)) {
          hasErased = true;
          const pieces = sliceStrokeByEraser(stroke, center, eraserRadius);
          newStrokes.push(...pieces);
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

  // Touch Pinch-to-Zoom for mobile & tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    closeAllPopovers();
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / touchDistanceRef.current;
      touchDistanceRef.current = dist;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      handleZoomDelta(factor, midX, mouseYToCanvas(midY));
    }
  };

  const mouseYToCanvas = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    return clientY - canvas.getBoundingClientRect().top;
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
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
    if (currentPageIndex < notebook.pages.length - 1) {
      onUpdateNotebook({ ...notebook, currentPageId: notebook.pages[currentPageIndex + 1].id });
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      onUpdateNotebook({ ...notebook, currentPageId: notebook.pages[currentPageIndex - 1].id });
    }
  };

  const handleAddPage = () => {
    const newPage: Page = {
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: `Страница ${notebook.pages.length + 1}`,
      order: notebook.pages.length,
      width: currentPage.width || 2200,
      height: currentPage.height || 7500,
      background: { ...currentPage.background },
      strokes: [],
      shapes: [],
      texts: [],
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateNotebook({
      ...notebook,
      pages: [...notebook.pages, newPage],
      currentPageId: newPage.id,
      updatedAt: Date.now(),
    });
  };

  const handleManualSave = () => {
    onUpdateNotebook({ ...notebook, updatedAt: Date.now() });
    setSaveSuccessFeedback(true);
    setTimeout(() => setSaveSuccessFeedback(false), 2000);
  };

  const currentRulingName = RULING_TYPES.find((r) => r.id === currentPage.background.type)?.name || 'Клетка';
  const hasSelectedItems = selectedIds.strokeIds.length > 0 || selectedIds.shapeIds.length > 0 || selectedIds.textIds.length > 0;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans select-none relative w-full h-full transition-colors ${
      isDark ? 'bg-[#0E0F14]' : 'bg-[#F1F5F9]'
    }`}>
      {/* 1. Unified, Modern Studio Top Bar */}
      <header className="absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between gap-4">
        {/* Left Section: Back, Title, Manual Save, Clear Canvas */}
        <div className={`pointer-events-auto flex items-center gap-2 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border shadow-md ${
          isDark 
            ? 'bg-[#12131A]/95 border-neutral-700/80 text-white' 
            : 'bg-white/95 border-neutral-200 text-neutral-900'
        }`}>
          <button
            onClick={onBackToLibrary}
            className={`p-1.5 rounded-xl transition-all ${
              isDark 
                ? 'text-neutral-200 hover:text-white hover:bg-neutral-800' 
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Библиотека тетрадей"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onBlur={() => {
                if (titleInput.trim()) onUpdateNotebook({ ...notebook, title: titleInput.trim() });
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (titleInput.trim()) onUpdateNotebook({ ...notebook, title: titleInput.trim() });
                  setIsEditingTitle(false);
                }
              }}
              onChange={(e) => setTitleInput(e.target.value)}
              className={`text-xs font-bold px-2 py-0.5 rounded-lg border focus:outline-none ${
                isDark 
                  ? 'bg-neutral-800 border-blue-500 text-white' 
                  : 'bg-white border-blue-500 text-neutral-950 shadow-2xs'
              }`}
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className={`text-xs font-bold hover:underline truncate max-w-[140px] sm:max-w-[200px] ${
                isDark ? 'text-white' : 'text-neutral-900'
              }`}
              title="Нажмите, чтобы переименовать тетрадь"
            >
              {notebook.title}
            </button>
          )}

          {/* Save Button: Pure White in Light Theme */}
          <button
            onClick={handleManualSave}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              saveSuccessFeedback
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                  ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700/60'
                  : 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-xs'
            }`}
            title="Сохранить тетрадь"
          >
            {saveSuccessFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Сохранено ✓</span>
              </>
            ) : (
              <span>Сохранить</span>
            )}
          </button>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Clear Canvas / Screen Button: Pure White in Light Theme */}
          <button
            onClick={handleClearCanvas}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isDark
                ? 'text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-900/60'
                : 'text-red-600 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 shadow-xs'
            }`}
            title="Очистить весь лист (можно отменить Ctrl+Z)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить лист</span>
          </button>
        </div>

        {/* Center: Pages Navigator */}
        <div className={`pointer-events-auto hidden md:flex items-center gap-1 backdrop-blur-xl px-3 py-1.5 rounded-2xl border shadow-md text-xs font-medium ${
          isDark 
            ? 'bg-[#12131A]/95 border-neutral-700/80 text-white' 
            : 'bg-white/95 border-neutral-200 text-neutral-900'
        }`}>
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            className={`p-1 rounded-lg disabled:opacity-20 transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Предыдущая страница"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className={`font-mono text-xs font-bold px-2 ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}>
            Стр. {currentPageIndex + 1} из {notebook.pages.length}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPageIndex >= notebook.pages.length - 1}
            className={`p-1 rounded-lg disabled:opacity-20 transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Следующая страница"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddPage}
            className={`px-2 py-1 rounded-lg font-bold ml-1 transition-all flex items-center gap-1 ${
              isDark
                ? 'bg-blue-950/60 text-blue-400 hover:bg-blue-900/60'
                : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 shadow-2xs'
            }`}
            title="Добавить страницу"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Стр.</span>
          </button>

          <button
            onClick={() => setIsPagesDrawerOpen(!isPagesDrawerOpen)}
            className={`p-1.5 rounded-lg transition-all ml-0.5 ${
              isPagesDrawerOpen
                ? 'bg-blue-600 text-white'
                : isDark
                  ? 'text-neutral-300 hover:bg-neutral-800'
                  : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Миниатюры страниц"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Right Section: Clean Separated Controls: [Разметка] [Цвет листа] [Обложка] [Тема] */}
        <div className={`pointer-events-auto flex items-center gap-2 backdrop-blur-xl px-3 py-1.5 rounded-2xl border shadow-md text-xs ${
          isDark 
            ? 'bg-[#12131A]/95 border-neutral-700/80 text-white' 
            : 'bg-white/95 border-neutral-200 text-neutral-900'
        }`}>
          
          {/* 1. SEPARATED: RULING / GRID SELECTOR */}
          <div className="relative">
            <button
              data-popover-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsRulingPopoverOpen(!isRulingPopoverOpen);
                setIsPaperColorPopoverOpen(false);
                setIsCoverPopoverOpen(false);
              }}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs ${
                isRulingPopoverOpen
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 border-2 border-blue-600 shadow-xs'
                  : isDark
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700/60'
                    : 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-xs'
              }`}
              title="Выбрать разлиновку (Клетка, Линейка, Точки, Чистый)"
            >
              <Grid className="w-3.5 h-3.5 text-blue-500" />
              <span>Разметка: {currentRulingName}</span>
            </button>

            {isRulingPopoverOpen && (
              <div 
                data-popover="true"
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-2.5 p-4 rounded-2xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-150 border ${
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
                              ? 'border-blue-600 bg-blue-950/60 ring-2 ring-blue-500 text-blue-300'
                              : 'border-2 border-blue-600 bg-white ring-2 ring-blue-100 text-blue-600 font-bold shadow-xs'
                            : isDark
                              ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                              : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800 bg-white shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <IconComp className="w-4 h-4 text-blue-500" />
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
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
                      <span className="font-mono text-blue-600 font-bold">
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
                              ? 'bg-blue-600 text-white border-blue-600'
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
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. SEPARATED: PAPER COLOR SELECTOR */}
          <div className="relative">
            <button
              data-popover-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsPaperColorPopoverOpen(!isPaperColorPopoverOpen);
                setIsRulingPopoverOpen(false);
                setIsCoverPopoverOpen(false);
              }}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-2 text-xs ${
                isPaperColorPopoverOpen
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 border-2 border-blue-600 shadow-xs'
                  : isDark
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700/60'
                    : 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-xs'
              }`}
              title="Выбрать цвет фона бумаги (Белая, Крем, Midnight, Графит)"
            >
              <span>Цвет листа</span>
              <span
                className="w-4 h-4 rounded-full inline-block border-2 border-black/30 dark:border-white/50 shadow-xs shrink-0"
                style={{ backgroundColor: currentPage.background.color }}
              />
            </button>

            {isPaperColorPopoverOpen && (
              <div 
                data-popover="true"
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-2.5 p-4 rounded-2xl shadow-2xl z-50 w-76 animate-in fade-in slide-in-from-top-2 duration-150 border ${
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
                              ? 'border-blue-600 bg-blue-950/60 ring-2 ring-blue-500'
                              : 'border-2 border-blue-600 bg-white ring-2 ring-blue-100 shadow-xs'
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
                  Тёмная бумага (комфортная для глаз):
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
                              ? 'border-blue-600 bg-blue-950/60 ring-2 ring-blue-500'
                              : 'border-2 border-blue-600 bg-white ring-2 ring-blue-100 shadow-xs'
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
                      updateCurrentPage((page) => ({
                        ...page,
                        background: { ...page.background, color: e.target.value },
                      }));
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-300 p-0"
                    title="Выбрать любой цвет"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. SEPARATED: COVER SELECTOR */}
          <div className="relative">
            <button
              data-popover-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsCoverPopoverOpen(!isCoverPopoverOpen);
                setIsRulingPopoverOpen(false);
                setIsPaperColorPopoverOpen(false);
              }}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-2 text-xs ${
                isCoverPopoverOpen
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 border-2 border-blue-600 shadow-xs'
                  : isDark
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700/60'
                    : 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-xs'
              }`}
              title="Выбрать цвет обложки тетради"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-500" />
              <span>Обложка</span>
              <span
                className="w-4 h-4 rounded-full inline-block border-2 border-white dark:border-neutral-900 shadow-sm shrink-0"
                style={{ backgroundColor: notebook.coverColor }}
              />
            </button>

            {isCoverPopoverOpen && (
              <div 
                data-popover="true"
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-2.5 p-4 rounded-2xl shadow-2xl z-50 w-80 animate-in fade-in slide-in-from-top-2 duration-150 border ${
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
                              ? 'border-blue-600 bg-blue-950/60 ring-2 ring-blue-500'
                              : 'border-2 border-blue-600 bg-white ring-2 ring-blue-100 shadow-xs'
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
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0" />}
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
          </div>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Theme Toggle Button: Pure White in Light Theme */}
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded-xl transition-all ${
              isDark
                ? 'border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 shadow-xs'
            }`}
            title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={`p-1.5 rounded-xl disabled:opacity-20 transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Отменить (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={`p-1.5 rounded-xl disabled:opacity-20 transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200 shadow-2xs'
            }`}
            title="Повторить (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Export Button: Pure White with bold Blue accent in Light Theme */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white border-2 border-blue-600 hover:bg-blue-50 text-blue-600'
            }`}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Экспорт</span>
          </button>
        </div>
      </header>

      {/* 2. Expansive Interactive Canvas on Desk */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full touch-none block absolute inset-0 ${
          isSpacePressed || activeTool === 'pan'
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'eraser'
            ? 'cursor-crosshair'
            : 'cursor-crosshair'
        }`}
      />

      {/* 3. Floating Selection Toolbar (when elements are selected) */}
      {selectionBox && hasSelectedItems && (
        <div
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
            onClick={handleDuplicateSelected}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              isDark
                ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
            }`}
            title="Дублировать выделенные элементы"
          >
            <Copy className="w-3.5 h-3.5 text-blue-500" />
            <span>Копия</span>
          </button>
          <button
            onClick={handleRecolorSelected}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              isDark
                ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
            }`}
            title="Применить текущий цвет к выделению"
          >
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            <span>Цвет</span>
          </button>
          <button
            onClick={handleDeleteSelected}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
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
            onClick={() => {
              setSelectionBox(null);
              setSelectedIds({ strokeIds: [], shapeIds: [], textIds: [] });
            }}
            className={`p-1 rounded-lg ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
            title="Снять выделение"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Floating Zoom Controller */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto flex flex-col items-end">
        {/* Zoom Presets Popover */}
        {isZoomMenuOpen && (
          <div
            data-popover="true"
            onClick={(e) => e.stopPropagation()}
            className={`mb-2 w-52 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 text-xs font-semibold ${
              isDark
                ? 'bg-[#181922] border-neutral-700 text-neutral-200'
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
            ].map((item) => {
              const isSelected = Math.abs(scale - item.value) < 0.03;
              return (
                <button
                  key={item.label}
                  onClick={() => handleSetPresetZoom(item.value)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? isDark ? 'bg-blue-600/30 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold'
                      : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
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
                <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                Вписать во весь экран
              </span>
            </button>
          </div>
        )}

        <div className={`flex items-center gap-1 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl border shadow-2xl text-xs font-bold ${
          isDark
            ? 'bg-[#12131A]/95 border-neutral-700/80 text-white'
            : 'bg-white/95 border-neutral-200 text-neutral-900'
        }`}>
          {/* Zoom Out Button */}
          <button
            onClick={() => handleZoomDelta(0.85)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Уменьшить масштаб (Ctrl -)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Current Zoom Percentage & Preset Selector */}
          <button
            data-popover-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomMenuOpen(!isZoomMenuOpen);
            }}
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-colors flex items-center gap-1 ${
              isDark
                ? 'text-white hover:text-blue-400 hover:bg-neutral-800/60'
                : 'text-neutral-900 hover:text-blue-600 hover:bg-neutral-100'
            }`}
            title="Выбрать масштаб листа (кликните для списка)"
          >
            <span>{Math.round(scale * 100)}%</span>
          </button>

          {/* Zoom In Button */}
          <button
            onClick={() => handleZoomDelta(1.15)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Увеличить масштаб (Ctrl +)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Two Opposing Arrows (Maximize2): Fit to width / Full Page View Toggle */}
          {(() => {
            const fitScale = Math.max(0.3, Math.min(2.5, (window.innerWidth - 48) / currentPage.width));
            const isFitWidth = Math.abs(scale - fitScale) < 0.05;
            return (
              <button
                onClick={handleToggleFitToWidth}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isFitWidth
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                      ? 'text-neutral-200 hover:bg-neutral-800'
                      : 'text-neutral-700 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
                }`}
                title={
                  isFitWidth
                    ? 'Вернуть масштаб 70%'
                    : 'Вписать лист во весь экран по ширине'
                }
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            );
          })()}
        </div>
      </div>

      {/* 5. High-Contrast Bottom Tool Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
        {/* Tool Options Popover */}
        {showToolOptions && (
          <div 
            data-popover="true"
            onClick={(e) => e.stopPropagation()}
            className={`mb-3 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 border ${
              isDark
                ? 'bg-[#181922] border-neutral-700 text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {['pen', 'pencil', 'marker'].includes(activeTool) && (
              <>
                <div className="flex items-center gap-1.5">
                  {PRESET_STROKE_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setStrokeWidth(size)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all ${
                        strokeWidth === size
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                            : 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-200 shadow-2xs'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className={`w-px h-5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

                <div className="flex items-center gap-2">
                  {PREMIUM_INKS.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setStrokeColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-6 h-6 rounded-full shadow-xs transition-transform ${
                        c.border ? 'border-2 border-neutral-400' : 'border border-black/20'
                      } ${strokeColor === c.color ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'}`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-6 h-6 rounded-full cursor-pointer border border-neutral-400 p-0"
                    title="Свой оттенок чернил"
                  />
                </div>

                <div className={`w-px h-5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

                <div className={`flex items-center gap-2 text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  <span>Непрозрачность:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={strokeOpacity}
                    onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                    className="w-20 accent-blue-600 cursor-pointer"
                  />
                  <span className={`font-mono w-7 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {Math.round(strokeOpacity * 100)}%
                  </span>
                </div>
              </>
            )}

            {activeTool === 'eraser' && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEraserMode('partial')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      eraserMode === 'partial'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                          : 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-200 shadow-2xs'
                    }`}
                  >
                    Стирать часть штриха
                  </button>
                  <button
                    onClick={() => setEraserMode('object')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      eraserMode === 'object'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                          : 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-200 shadow-2xs'
                    }`}
                  >
                    Удалять объект целиком
                  </button>
                </div>

                <div className={`w-px h-5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

                <div className={`flex items-center gap-2 text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  <span>Размер ластика:</span>
                  <input
                    type="range"
                    min="6"
                    max="50"
                    value={eraserRadius}
                    onChange={(e) => setEraserRadius(parseInt(e.target.value, 10))}
                    className="w-28 accent-blue-600 cursor-pointer"
                  />
                  <span className={`font-mono ${isDark ? 'text-white' : 'text-neutral-900'}`}>{eraserRadius}px</span>
                </div>
              </>
            )}

            {['rect', 'circle', 'triangle', 'line', 'dashed-line', 'arrow', 'dashed-arrow', 'star'].includes(activeTool) && (
              <div className="flex items-center gap-1.5 flex-wrap max-w-sm">
                {[
                  { id: 'line', icon: Minus, label: 'Линия' },
                  { id: 'dashed-line', icon: Minus, label: 'Пунктирная линия', isDashed: true },
                  { id: 'arrow', icon: ArrowRight, label: 'Стрелка' },
                  { id: 'dashed-arrow', icon: ArrowRight, label: 'Пунктирная стрелка', isDashed: true },
                  { id: 'rect', icon: Square, label: 'Прямоугольник' },
                  { id: 'circle', icon: Circle, label: 'Круг' },
                  { id: 'triangle', icon: Triangle, label: 'Треугольник' },
                  { id: 'star', icon: Star, label: 'Звезда' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTool(s.id as ToolType)}
                      className={`p-2.5 rounded-xl transition-all relative flex items-center justify-center ${
                        activeTool === s.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                            : 'bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-200 shadow-2xs'
                      }`}
                      title={s.label}
                    >
                      <Icon className={`w-4 h-4 ${s.isDashed ? 'stroke-dasharray-2' : ''}`} />
                      {s.isDashed && (
                        <span className="absolute bottom-0.5 text-[8px] font-mono font-bold leading-none">--</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* High-Contrast Tool Dock: Pure White in Light Theme */}
        <div 
          data-popover-trigger="true"
          onClick={(e) => e.stopPropagation()}
          className={`backdrop-blur-xl px-3 py-2 rounded-2xl border shadow-2xl flex items-center gap-1.5 ${
            isDark
              ? 'bg-[#12131A]/95 border-neutral-700/80'
              : 'bg-white/95 border-neutral-200'
          }`}
        >
          {/* Pen */}
          <button
            onClick={() => {
              setActiveTool('pen');
              setShowToolOptions(activeTool === 'pen' ? !showToolOptions : true);
            }}
            className={`p-2.5 rounded-xl transition-all relative ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Ручка (1)"
          >
            <PenTool className="w-5 h-5" />
            <span
              className="w-2.5 h-2.5 rounded-full absolute bottom-1 right-1 border border-white shadow-xs"
              style={{ backgroundColor: strokeColor }}
            />
          </button>

          {/* Pencil */}
          <button
            onClick={() => {
              setActiveTool('pencil');
              setShowToolOptions(activeTool === 'pencil' ? !showToolOptions : true);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'pencil'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Карандаш (2)"
          >
            <div className="w-5 h-5 flex items-center justify-center font-serif font-bold text-sm">✎</div>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => {
              setActiveTool('marker');
              setShowToolOptions(activeTool === 'marker' ? !showToolOptions : true);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'marker'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Маркер (3)"
          >
            <Highlighter className="w-5 h-5" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => {
              setActiveTool('eraser');
              setShowToolOptions(activeTool === 'eraser' ? !showToolOptions : true);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'eraser'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Ластик (4)"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <div className={`w-px h-6 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Shapes */}
          <button
            onClick={() => {
              if (['line', 'dashed-line', 'arrow', 'dashed-arrow', 'rect', 'circle', 'triangle', 'star'].includes(activeTool)) {
                setShowToolOptions(!showToolOptions);
              } else {
                setActiveTool('rect');
                setShowToolOptions(true);
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              ['line', 'dashed-line', 'arrow', 'dashed-arrow', 'rect', 'circle', 'triangle', 'star'].includes(activeTool)
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Фигуры и линии (5)"
          >
            <Square className="w-5 h-5" />
          </button>

          {/* Text */}
          <button
            onClick={() => {
              setActiveTool('text');
              setShowToolOptions(false);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Текст (T)"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Image */}
          <label
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-800'
                : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Вставить картинку"
          >
            <ImageIcon className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) insertImageFile(f);
                e.target.value = '';
              }}
            />
          </label>

          {/* Select */}
          <button
            onClick={() => {
              setActiveTool('select');
              setShowToolOptions(false);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Выделение и перемещение (V)"
          >
            <MousePointer className="w-5 h-5" />
          </button>

          {/* Pan */}
          <button
            onClick={() => {
              setActiveTool('pan');
              setShowToolOptions(false);
            }}
            className={`p-2.5 rounded-xl transition-all ${
              activeTool === 'pan'
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : isDark
                  ? 'text-neutral-200 hover:bg-neutral-800'
                  : 'text-neutral-800 hover:bg-neutral-100 bg-white border border-neutral-200/80 shadow-2xs'
            }`}
            title="Перемещение (H / Пробел)"
          >
            <Hand className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Inline Text Editor */}
      {editingText && (
        <div
          className={`absolute z-40 p-2.5 rounded-2xl shadow-2xl border-2 border-blue-500 ${
            isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
          }`}
          style={{
            left: pan.x + editingText.x * scale,
            top: pan.y + editingText.y * scale,
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
          />
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button
              onClick={() => setEditingText(null)}
              className={`px-2.5 py-1 text-xs font-semibold ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-950'}`}
            >
              Отмена
            </button>
            <button
              onClick={() => {
                if (editingText.text.trim()) {
                  const newTextObj: TextObject = {
                    id: `txt_${Date.now()}`,
                    x: editingText.x,
                    y: editingText.y,
                    width: 250,
                    height: 50,
                    text: editingText.text,
                    fontSize: editingText.fontSize,
                    fontFamily: 'Inter, sans-serif',
                    color: editingText.color,
                    bold: editingText.bold,
                    italic: editingText.italic,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  updateCurrentPage((page) => ({
                    ...page,
                    texts: [...(page.texts || []), newTextObj],
                  }), 'Add text');
                }
                setEditingText(null);
              }}
              className={`px-3.5 py-1 text-xs font-bold rounded-lg shadow-xs transition-all ${
                isDark ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Вставить
            </button>
          </div>
        </div>
      )}

      {/* Pages Side Drawer */}
      {isPagesDrawerOpen && (
        <aside 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 bottom-0 w-64 border-l z-40 p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-150 ${
            isDark 
              ? 'bg-[#181922] border-neutral-700 text-white' 
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isDark ? 'border-neutral-700' : 'border-neutral-200'}`}>
            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Страницы ({notebook.pages.length})
            </span>
            <button
              onClick={handleAddPage}
              className={`p-1 rounded-xl transition-all ${
                isDark 
                  ? 'hover:bg-neutral-800 text-neutral-200' 
                  : 'hover:bg-neutral-100 text-neutral-800 bg-white border border-neutral-200 shadow-2xs'
              }`}
              title="Новая страница"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {notebook.pages.map((p, idx) => {
              const isCurrent = p.id === currentPage.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onUpdateNotebook({ ...notebook, currentPageId: p.id })}
                  className={`group rounded-xl p-2.5 border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500'
                      : isDark
                        ? 'border-neutral-700 hover:border-neutral-500 bg-[#12131A]'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white shadow-2xs'
                  }`}
                >
                  <div
                    className="h-24 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-2 flex items-center justify-center relative overflow-hidden shadow-xs"
                    style={{ backgroundColor: p.background.color }}
                  >
                    <span className="text-[10px] font-mono font-bold text-neutral-400">Стр. #{idx + 1}</span>
                  </div>
                  <div className={`flex items-center justify-between text-xs font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                    <span className="truncate">{p.title || `Стр. ${idx + 1}`}</span>
                    {notebook.pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const remaining = notebook.pages.filter((pg) => pg.id !== p.id);
                          onUpdateNotebook({
                            ...notebook,
                            pages: remaining,
                            currentPageId: remaining[0].id,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
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
                    ? 'border-neutral-700 hover:border-blue-500 bg-neutral-800/40 text-white'
                    : 'border-neutral-200 hover:border-blue-500 bg-white text-neutral-900 shadow-2xs'
                }`}
              >
                <div>
                  <div className={`font-bold group-hover:text-blue-600 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Файл .noto
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Векторный проект тетради</div>
                </div>
                <Download className="w-4 h-4 text-blue-600" />
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
