import { Notebook, Folder, AppSettings, Page, PageBackground, GridType } from '../types';

const DB_NAME = 'noto_notebook_db';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';
const STORE_FOLDERS = 'folders';
const STORE_SETTINGS = 'settings';
const STORE_CRASH_RECOVERY = 'crash_recovery';

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
 * - Grid, Ruled, Dots: Russian school notebook format (850 x 1025 px, 170 x 205 mm)
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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
        db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_CRASH_RECOVERY)) {
        db.createObjectStore(STORE_CRASH_RECOVERY, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Creates initial starter notebooks demonstrating academic & personal notebooks
 */
export function createStarterData(): { notebooks: Notebook[]; folders: Folder[] } {
  const folders: Folder[] = [
    { id: 'folder_study', name: 'Учёба', icon: 'folder', color: '#3B82F6', createdAt: Date.now() },
    { id: 'folder_personal', name: 'Личное', icon: 'bookmark', color: '#10B981', createdAt: Date.now() },
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

/**
 * Storage API: Notebooks
 */
export async function dbGetAllNotebooks(): Promise<Notebook[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOTEBOOKS, 'readonly');
      const store = tx.objectStore(STORE_NOTEBOOKS);
      const req = store.getAll();
      req.onsuccess = () => {
        const rawList: Notebook[] = req.result || [];
        const list = rawList.map((nb) => ({
          ...nb,
          pages: nb.pages.map((p) => ({
            ...p,
            height: p.height > 1200 ? 1150 : (p.height || 1150),
          })),
        }));
        if (list.length === 0) {
          const starter = createStarterData();
          dbSaveAllNotebooks(starter.notebooks);
          dbSaveFolders(starter.folders);
          resolve(starter.notebooks);
        } else {
          resolve(list);
        }
      };
      req.onerror = () => resolve(fallbackLoadNotebooks());
    });
  } catch {
    return fallbackLoadNotebooks();
  }
}

export async function dbSaveNotebook(notebook: Notebook): Promise<void> {
  notebook.updatedAt = Date.now();
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
      const store = tx.objectStore(STORE_NOTEBOOKS);
      const req = store.put(notebook);
      req.onsuccess = () => {
        fallbackSaveSingleNotebook(notebook);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    fallbackSaveSingleNotebook(notebook);
  }
}

export async function dbSaveAllNotebooks(notebooks: Notebook[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    for (const nb of notebooks) {
      store.put(nb);
    }
    tx.oncomplete = () => fallbackSaveAllNotebooks(notebooks);
  } catch {
    fallbackSaveAllNotebooks(notebooks);
  }
}

export async function dbDeleteNotebook(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
      const store = tx.objectStore(STORE_NOTEBOOKS);
      const req = store.delete(id);
      req.onsuccess = () => {
        fallbackDeleteNotebook(id);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    fallbackDeleteNotebook(id);
  }
}

/**
 * Storage API: Folders
 */
export async function dbGetFolders(): Promise<Folder[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FOLDERS, 'readonly');
      const store = tx.objectStore(STORE_FOLDERS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: Folder[] = req.result || [];
        resolve(list);
      };
      req.onerror = () => resolve(fallbackGetFolders());
    });
  } catch {
    return fallbackGetFolders();
  }
}

export async function dbSaveFolders(folders: Folder[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    const store = tx.objectStore(STORE_FOLDERS);
    for (const f of folders) {
      store.put(f);
    }
  } catch {
    // fallback in localStorage
  }
  localStorage.setItem('noto_folders', JSON.stringify(folders));
}

/**
 * Storage API: Settings
 */
export async function dbGetSettings(): Promise<AppSettings> {
  try {
    const raw = localStorage.getItem('noto_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function dbSaveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem('noto_settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Emergency Snapshot for Crash Recovery
 */
export function saveCrashSnapshot(notebook: Notebook) {
  try {
    localStorage.setItem('noto_crash_recovery_nb', JSON.stringify(notebook));
    localStorage.setItem('noto_crash_recovery_time', Date.now().toString());
  } catch {
    // ignore
  }
}

export function getCrashSnapshot(): { notebook: Notebook; time: number } | null {
  try {
    const raw = localStorage.getItem('noto_crash_recovery_nb');
    const timeStr = localStorage.getItem('noto_crash_recovery_time');
    if (raw && timeStr) {
      return { notebook: JSON.parse(raw), time: parseInt(timeStr, 10) };
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearCrashSnapshot() {
  localStorage.removeItem('noto_crash_recovery_nb');
  localStorage.removeItem('noto_crash_recovery_time');
}

// LocalStorage Fallbacks
function fallbackLoadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem('noto_notebooks_backup');
    if (raw) {
      const parsed: Notebook[] = JSON.parse(raw);
      return parsed.map((nb) => ({
        ...nb,
        pages: nb.pages.map((p) => ({
          ...p,
          height: p.height > 1200 ? 1150 : (p.height || 1150),
        })),
      }));
    }
  } catch {
    // ignore
  }
  const starter = createStarterData();
  fallbackSaveAllNotebooks(starter.notebooks);
  return starter.notebooks;
}

function fallbackSaveAllNotebooks(notebooks: Notebook[]): void {
  try {
    localStorage.setItem('noto_notebooks_backup', JSON.stringify(notebooks));
  } catch {
    // ignore
  }
}

function fallbackSaveSingleNotebook(notebook: Notebook): void {
  try {
    const list = fallbackLoadNotebooks();
    const idx = list.findIndex((n) => n.id === notebook.id);
    if (idx >= 0) list[idx] = notebook;
    else list.push(notebook);
    fallbackSaveAllNotebooks(list);
  } catch {
    // ignore
  }
}

function fallbackDeleteNotebook(id: string): void {
  try {
    const list = fallbackLoadNotebooks().filter((n) => n.id !== id);
    fallbackSaveAllNotebooks(list);
  } catch {
    // ignore
  }
}

function fallbackGetFolders(): Folder[] {
  try {
    const raw = localStorage.getItem('noto_folders');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return createStarterData().folders;
}
