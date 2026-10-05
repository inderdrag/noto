import { Notebook, Folder, AppSettings, Page, PageBackground } from '../types';

const DB_NAME = 'noto_notebook_db';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';
const STORE_FOLDERS = 'folders';
const STORE_SETTINGS = 'settings';
const STORE_CRASH_RECOVERY = 'crash_recovery';

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  color: '#FFFFFF',
  type: 'grid',
  gridSize: 25,
  gridColor: '#94A3B8',
  gridOpacity: 0.9,
  lineWidth: 1,
};

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
    title: 'Алгебра: Квадратные уравнения',
    order: 0,
    width: 1400,
    height: 1900,
    background: {
      color: '#FFFFFF',
      type: 'grid',
      gridSize: 25,
      gridColor: '#E2E8F0',
      gridOpacity: 0.85,
      lineWidth: 1,
    },
    strokes: [
      {
        id: 'stroke_math_title',
        tool: 'pen',
        color: '#1E293B',
        width: 3,
        opacity: 1,
        points: [
          { x: 100, y: 150, pressure: 0.6 },
          { x: 140, y: 148, pressure: 0.7 },
          { x: 220, y: 152, pressure: 0.6 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    shapes: [
      {
        id: 'shape_box_1',
        type: 'rect',
        x: 80,
        y: 200,
        width: 620,
        height: 150,
        strokeColor: '#3B82F6',
        strokeWidth: 2,
        fillColor: 'rgba(59, 130, 246, 0.04)',
        opacity: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    texts: [
      {
        id: 'text_math_title',
        x: 90,
        y: 90,
        width: 600,
        height: 48,
        text: 'Тема: Решение квадратных уравнений',
        fontSize: 26,
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_math_formula',
        x: 110,
        y: 225,
        width: 560,
        height: 100,
        text: 'Общий вид:  ax² + bx + c = 0\nДискриминант:  D = b² - 4ac\nКорни:  x₁,₂ = (-b ± √D) / (2a)',
        fontSize: 20,
        fontFamily: 'monospace',
        color: '#1E293B',
        bold: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'text_note_sample',
        x: 110,
        y: 380,
        width: 700,
        height: 80,
        text: '• Если D > 0 — уравнение имеет 2 различных корня.\n• Если D = 0 — один корень кратности 2.\n• Если D < 0 — действительных корней нет.',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        color: '#475569',
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
    width: 1400,
    height: 1900,
    background: {
      color: '#FFFFFF',
      type: 'grid',
      gridSize: 25,
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
    width: 1400,
    height: 1900,
    background: {
      color: '#FAF8F5',
      type: 'ruled',
      gridSize: 28,
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
    width: 1400,
    height: 1900,
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

  const notebooks: Notebook[] = [
    {
      id: 'nb_math',
      title: 'Математика',
      folderId: 'folder_study',
      coverColor: '#2563EB',
      coverPattern: 'grid',
      pages: [mathPage1, mathPage2],
      currentPageId: 'page_math_1',
      favorite: true,
      createdAt: Date.now() - 3600 * 1000 * 24 * 2,
      updatedAt: Date.now() - 3600 * 1000 * 2,
    },
    {
      id: 'nb_physics',
      title: 'Физика',
      folderId: 'folder_study',
      coverColor: '#059669',
      coverPattern: 'stripes',
      pages: [physicsPage],
      currentPageId: 'page_physics_1',
      favorite: false,
      createdAt: Date.now() - 3600 * 1000 * 24 * 5,
      updatedAt: Date.now() - 3600 * 1000 * 12,
    },
    {
      id: 'nb_ideas',
      title: 'Идеи & Заметки',
      folderId: 'folder_personal',
      coverColor: '#7C3AED',
      coverPattern: 'dots',
      pages: [ideasPage],
      currentPageId: 'page_ideas_1',
      favorite: true,
      createdAt: Date.now() - 3600 * 1000 * 24 * 1,
      updatedAt: Date.now() - 1000 * 60 * 30,
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
        const list: Notebook[] = req.result || [];
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
    if (raw) return JSON.parse(raw);
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
