import { Notebook, Folder, AppSettings, Page, PageBackground, GridType } from '../types';

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  color: '#FFFFFF',
  type: 'grid',
  gridSize: 24,
  gridColor: '#94A3B8',
  gridOpacity: 0.9,
  lineWidth: 1,
};

/**
 * Standard page dimensions:
 * - Blank paper: ISO 216 standard A4 format (840 x 1188 px, 210 x 297 mm)
 * - Grid, Ruled, Dots: Russian school notebook format (850 x 1120 px, 170 x 205 mm)
 */
export function getStandardPageDimensions(type: GridType = 'grid', isLandscape: boolean = false): { width: number; height: number } {
  if (type === 'blank') {
    return isLandscape 
      ? { width: 1188, height: 840 }
      : { width: 840, height: 1188 };
  }
  return isLandscape
    ? { width: 1120, height: 850 }
    : { width: 850, height: 1120 };
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  pressureSensitivity: true,
  smoothingEnabled: true,
  smoothingStrength: 0.5,
  defaultPaperType: 'grid',
  defaultPaperColor: '#FFFFFF',
  defaultGridSpacing: 24,
  autosaveIntervalMs: 800,
  hardwareAcceleration: true,
};

/**
 * Creates initial starter notebooks demonstrating academic & personal notebooks
 */
export function createStarterData(): { notebooks: Notebook[]; folders: Folder[] } {
  const now = Date.now();
  const folders: Folder[] = [
    { id: 'folder_study', name: 'Учёба', icon: 'folder', color: '#3B82F6', createdAt: now, updatedAt: now, deleted: false },
    { id: 'folder_personal', name: 'Личное', icon: 'bookmark', color: '#10B981', createdAt: now, updatedAt: now, deleted: false },
  ];

  const mathPage1: Page = {
    id: 'page_math_1',
    title: 'План проекта и заметки',
    order: 0,
    width: 850,
    height: 1120,
    background: {
      color: '#FFFFFF',
      type: 'grid',
      gridSize: 24,
      gridColor: '#E2E8F0',
      gridOpacity: 0.85,
      lineWidth: 1,
    },
    strokes: [
      {
        id: 'stroke_underline',
        tool: 'pen',
        color: '#6355C7',
        width: 3,
        opacity: 0.9,
        points: [
          { x: 80, y: 390, pressure: 0.8 },
          { x: 480, y: 390, pressure: 0.8 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'stroke_check',
        tool: 'pen',
        color: '#10B981',
        width: 3,
        opacity: 1,
        points: [
          { x: 80, y: 560, pressure: 0.7 },
          { x: 92, y: 575, pressure: 0.8 },
          { x: 112, y: 550, pressure: 0.8 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'stroke_highlight',
        tool: 'marker',
        color: '#FEF08A',
        width: 28,
        opacity: 0.5,
        points: [
          { x: 80, y: 470, pressure: 1 },
          { x: 520, y: 470, pressure: 1 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    shapes: [],
    texts: [
      {
        id: 'text_math_meta',
        x: 80,
        y: 300,
        width: 400,
        height: 24,
        text: 'ПЛАН & ЗАМЕТКИ',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        color: '#6355C7',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_math_title',
        x: 80,
        y: 335,
        width: 600,
        height: 44,
        text: 'Рабочие заметки и наброски',
        fontSize: 32,
        fontFamily: 'Inter, sans-serif',
        color: '#1E293B',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_sec1_body',
        x: 80,
        y: 430,
        width: 600,
        height: 120,
        text: '1. Составить список ключевых задач\n2. Проверить пропорции рабочего листа\n3. Организовать тетради по темам',
        fontSize: 18,
        fontFamily: 'Inter, sans-serif',
        color: '#1E293B',
        bold: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_sec2_body',
        x: 80,
        y: 580,
        width: 600,
        height: 80,
        text: 'Идеи: добавить экспорт в векторный формат и синхронизацию.',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        color: '#475569',
        bold: false,
        italic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mathPage2: Page = {
    id: 'page_math_2',
    title: 'Геометрия: Теорема Пифагора',
    order: 1,
    width: 850,
    height: 1120,
    background: {
      color: '#FFFFFF',
      type: 'grid',
      gridSize: 24,
      gridColor: '#E2E8F0',
      gridOpacity: 0.85,
      lineWidth: 1,
    },
    strokes: [],
    shapes: [
      {
        id: 'shape_pythagoras_triangle',
        type: 'triangle',
        x: 120,
        y: 220,
        width: 280,
        height: 200,
        strokeColor: '#0EA5E9',
        strokeWidth: 3,
        fillColor: 'rgba(14, 165, 233, 0.08)',
        opacity: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    texts: [
      {
        id: 'text_geom_title',
        x: 90,
        y: 90,
        width: 600,
        height: 48,
        text: 'Теорема Пифагора & свойства',
        fontSize: 26,
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_geom_formula',
        x: 440,
        y: 240,
        width: 400,
        height: 120,
        text: 'a² + b² = c²\n\nгде c — гипотенуза,\na и b — катеты треугольника.',
        fontSize: 19,
        fontFamily: 'Inter, sans-serif',
        color: '#1E293B',
        bold: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const physicsPage: Page = {
    id: 'page_physics_1',
    title: 'Механика: Законы Ньютона',
    order: 0,
    width: 850,
    height: 1120,
    background: {
      color: '#FAF8F5',
      type: 'ruled',
      gridSize: 32,
      gridColor: '#E5E0D8',
      gridOpacity: 0.9,
      lineWidth: 1,
    },
    strokes: [],
    shapes: [],
    texts: [
      {
        id: 'text_phys_title',
        x: 100,
        y: 80,
        width: 600,
        height: 48,
        text: 'Классическая механика: Законы движения',
        fontSize: 24,
        fontFamily: 'Inter, sans-serif',
        color: '#18181B',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_phys_content',
        x: 100,
        y: 160,
        width: 750,
        height: 200,
        text: '1-й закон: Существуют такие системы отсчета (инерциальные), в которых тело движется равномерно и прямолинейно, если на него не действуют другие тела.\n\n2-й закон Ньютона:  F = m · a\n\n3-й закон Ньютона:  F₁ = -F₂  (действие равно противодействию)',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        color: '#27272A',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const ideasPage: Page = {
    id: 'page_ideas_1',
    title: 'Планы и архитектура проекта',
    order: 0,
    width: 850,
    height: 1120,
    background: {
      color: '#FFFFFF',
      type: 'dots',
      gridSize: 24,
      gridColor: '#CBD5E1',
      gridOpacity: 0.7,
      lineWidth: 1,
    },
    strokes: [],
    shapes: [],
    texts: [
      {
        id: 'text_idea_title',
        x: 100,
        y: 80,
        width: 500,
        height: 48,
        text: 'Noto: Идеи & Roadmap',
        fontSize: 26,
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_idea_content',
        x: 100,
        y: 160,
        width: 650,
        height: 250,
        text: '✓ Собственный векторный движок с учетом давления стилуса\n✓ Формат .noto для сохранения всех векторных слоев\n✓ Поддержка бумаги: клетка, линейка, точки, чистый лист\n✓ Автономная работа без интернета\n✓ Готовность к компиляции в Noto.exe через Tauri / Electron\n✓ Экспорт в PDF / PNG / JPG',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        color: '#334155',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const notebook4Page: Page = {
    id: 'page_nb4_1',
    title: 'Страница 1',
    order: 0,
    width: 850,
    height: 1120,
    background: {
      color: '#FFFFFF',
      type: 'grid',
      gridSize: 24,
      gridColor: '#E2E8F0',
      gridOpacity: 0.85,
      lineWidth: 1,
    },
    strokes: [],
    shapes: [],
    texts: [
      {
        id: 'text_nb4_title',
        x: 100,
        y: 120,
        width: 500,
        height: 48,
        text: 'Тетрадь 4: Личные заметки',
        fontSize: 26,
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const notebooks: Notebook[] = [
    {
      id: 'nb_notebook4',
      title: 'Тетрадь 4',
      folderId: 'folder_personal',
      coverColor: '#BBD6FA',
      coverPattern: 'plain',
      pages: [notebook4Page],
      currentPageId: 'page_nb4_1',
      favorite: false,
      createdAt: Date.now() - 3600 * 1000 * 24 * 3,
      updatedAt: Date.now() - 3600 * 1000 * 24 * 1,
    },
    {
      id: 'nb_ideas',
      title: 'Идеи & Заметки',
      folderId: 'folder_personal',
      coverColor: '#D3C3F5',
      coverPattern: 'dots',
      pages: [ideasPage],
      currentPageId: 'page_ideas_1',
      favorite: false,
      createdAt: Date.now() - 3600 * 1000 * 24 * 1,
      updatedAt: Date.now() - 3600 * 1000 * 24 * 1,
    },
    {
      id: 'nb_math',
      title: 'Математика',
      folderId: 'folder_study',
      coverColor: '#BBD6FA',
      coverPattern: 'grid',
      pages: [mathPage1, mathPage2],
      currentPageId: 'page_math_1',
      favorite: true,
      createdAt: Date.now() - 3600 * 1000 * 24 * 2,
      updatedAt: Date.now() - 1000 * 60 * 15,
    },
    {
      id: 'nb_physics',
      title: 'Физика',
      folderId: 'folder_study',
      coverColor: '#A8DCD1',
      coverPattern: 'stripes',
      pages: [physicsPage],
      currentPageId: 'page_physics_1',
      favorite: false,
      createdAt: Date.now() - 3600 * 1000 * 24 * 5,
      updatedAt: Date.now() - 3600 * 1000 * 48,
    },
  ];

  return { notebooks, folders };
}
