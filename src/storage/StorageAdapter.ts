import { Notebook, Folder, AppSettings } from '../types';

/**
 * StorageAdapter defines the contract for persistent storage in Noto.
 * Implementations can target IndexedDB (web/electron), SQLite (mobile/Android),
 * FileSystem (desktop), or remote cloud sync.
 */
export interface StorageAdapter {
  // Notebook operations
  getAllNotebooks(): Promise<Notebook[]>;
  saveNotebook(notebook: Notebook): Promise<void>;
  saveAllNotebooks(notebooks: Notebook[]): Promise<void>;
  deleteNotebook(id: string): Promise<void>;

  // Folder operations
  getFolders(): Promise<Folder[]>;
  saveFolders(folders: Folder[]): Promise<void>;

  // Settings operations
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void> | void;

  // Crash recovery operations
  saveCrashSnapshot(notebook: Notebook): void;
  getCrashSnapshot(): { notebook: Notebook; time: number } | null;
  clearCrashSnapshot(): void;
}
