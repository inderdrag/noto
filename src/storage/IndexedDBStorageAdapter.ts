import { Notebook, Folder, AppSettings } from '../types';
import { StorageAdapter } from './StorageAdapter';
import { DEFAULT_SETTINGS, createStarterData } from './defaults';
import { normalizeNotebook } from './migration';

const DB_NAME = 'noto_notebook_db';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';
const STORE_FOLDERS = 'folders';
const STORE_SETTINGS = 'settings';
const STORE_CRASH_RECOVERY = 'crash_recovery';

/**
 * IndexedDBStorageAdapter provides persistent storage using the browser's IndexedDB,
 * with graceful localStorage fallback when IndexedDB is unavailable or restricted.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    // Request persistent storage to protect local notebooks from eviction on Android / Web
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {});
    }

    this.dbPromise = new Promise((resolve, reject) => {
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
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Notebook Operations ---

  async getAllNotebooks(): Promise<Notebook[]> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readonly');
        const store = tx.objectStore(STORE_NOTEBOOKS);
        const req = store.getAll();
        req.onsuccess = () => {
          const rawList: Notebook[] = req.result || [];
          const list = rawList.map((nb) => normalizeNotebook(nb));

          if (list.length === 0) {
            const starter = createStarterData();
            const normalizedStarter = starter.notebooks.map((nb) => normalizeNotebook(nb));
            this.saveAllNotebooks(normalizedStarter);
            this.saveFolders(starter.folders);
            resolve(normalizedStarter);
          } else {
            resolve(list);
          }
        };
        req.onerror = () => resolve(this.fallbackLoadNotebooks());
      });
    } catch {
      return this.fallbackLoadNotebooks();
    }
  }

  async saveNotebook(notebook: Notebook): Promise<void> {
    notebook.updatedAt = Date.now();
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
        const store = tx.objectStore(STORE_NOTEBOOKS);
        const req = store.put(notebook);
        req.onsuccess = () => {
          this.fallbackSaveSingleNotebook(notebook);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.fallbackSaveSingleNotebook(notebook);
    }
  }

  async saveAllNotebooks(notebooks: Notebook[]): Promise<void> {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
      const store = tx.objectStore(STORE_NOTEBOOKS);
      for (const nb of notebooks) {
        store.put(nb);
      }
      tx.oncomplete = () => this.fallbackSaveAllNotebooks(notebooks);
    } catch {
      this.fallbackSaveAllNotebooks(notebooks);
    }
  }

  async deleteNotebook(id: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
        const store = tx.objectStore(STORE_NOTEBOOKS);
        const req = store.delete(id);
        req.onsuccess = () => {
          this.fallbackDeleteNotebook(id);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.fallbackDeleteNotebook(id);
    }
  }

  // --- Folder Operations ---

  async getFolders(): Promise<Folder[]> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FOLDERS, 'readonly');
        const store = tx.objectStore(STORE_FOLDERS);
        const req = store.getAll();
        req.onsuccess = () => {
          const list: Folder[] = req.result || [];
          resolve(list);
        };
        req.onerror = () => resolve(this.fallbackGetFolders());
      });
    } catch {
      return this.fallbackGetFolders();
    }
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    try {
      const db = await this.openDatabase();
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      for (const f of folders) {
        store.put(f);
      }
    } catch {
      // fallback in localStorage below
    }
    try {
      localStorage.setItem('noto_folders', JSON.stringify(folders));
    } catch {
      // ignore
    }
  }

  // --- Settings Operations ---

  async getSettings(): Promise<AppSettings> {
    try {
      const raw = localStorage.getItem('noto_settings');
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem('noto_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  // --- Crash Recovery Operations ---

  saveCrashSnapshot(notebook: Notebook): void {
    try {
      localStorage.setItem('noto_crash_recovery_nb', JSON.stringify(notebook));
      localStorage.setItem('noto_crash_recovery_time', Date.now().toString());
    } catch {
      // ignore
    }
  }

  getCrashSnapshot(): { notebook: Notebook; time: number } | null {
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

  clearCrashSnapshot(): void {
    try {
      localStorage.removeItem('noto_crash_recovery_nb');
      localStorage.removeItem('noto_crash_recovery_time');
    } catch {
      // ignore
    }
  }

  // --- LocalStorage Fallbacks ---

  private fallbackLoadNotebooks(): Notebook[] {
    try {
      const raw = localStorage.getItem('noto_notebooks_backup');
      if (raw) {
        const parsed: Notebook[] = JSON.parse(raw);
        return parsed.map((nb) => normalizeNotebook(nb));
      }
    } catch {
      // ignore
    }
    const starter = createStarterData();
    const normalizedStarter = starter.notebooks.map((nb) => normalizeNotebook(nb));
    this.fallbackSaveAllNotebooks(normalizedStarter);
    return normalizedStarter;
  }

  private fallbackSaveAllNotebooks(notebooks: Notebook[]): void {
    try {
      localStorage.setItem('noto_notebooks_backup', JSON.stringify(notebooks));
    } catch {
      // ignore
    }
  }

  private fallbackSaveSingleNotebook(notebook: Notebook): void {
    try {
      const list = this.fallbackLoadNotebooks();
      const idx = list.findIndex((n) => n.id === notebook.id);
      if (idx >= 0) list[idx] = notebook;
      else list.push(notebook);
      this.fallbackSaveAllNotebooks(list);
    } catch {
      // ignore
    }
  }

  private fallbackDeleteNotebook(id: string): void {
    try {
      const list = this.fallbackLoadNotebooks().filter((n) => n.id !== id);
      this.fallbackSaveAllNotebooks(list);
    } catch {
      // ignore
    }
  }

  private fallbackGetFolders(): Folder[] {
    try {
      const raw = localStorage.getItem('noto_folders');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return createStarterData().folders;
  }
}
