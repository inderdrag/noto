import { Notebook, Folder, AppSettings } from '../types';
import { StorageAdapter } from './StorageAdapter';
import { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';
import { SQLiteStorageAdapter } from './SQLiteStorageAdapter';
import { isAndroid } from '../utils/platform';

// Re-export interface and implementation
export type { StorageAdapter };
export { IndexedDBStorageAdapter, SQLiteStorageAdapter };

// Re-export page defaults and starter data
export {
  DEFAULT_PAGE_BACKGROUND,
  getStandardPageDimensions,
  DEFAULT_SETTINGS,
  createStarterData,
} from './defaults';

/**
 * Global active storage adapter instance:
 * - On Android: SQLiteStorageAdapter (@capacitor-community/sqlite)
 * - On PC (Windows, macOS, Linux, Electron) & Web: IndexedDBStorageAdapter
 */
export const storageAdapter: StorageAdapter = isAndroid()
  ? new SQLiteStorageAdapter()
  : new IndexedDBStorageAdapter();

let activeAdapter: StorageAdapter = storageAdapter;

export function getStorageAdapter(): StorageAdapter {
  return activeAdapter;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  activeAdapter = adapter;
}

/**
 * Storage API: Notebooks (backed by StorageAdapter)
 */
export async function dbGetAllNotebooks(): Promise<Notebook[]> {
  return activeAdapter.getAllNotebooks();
}

export async function dbSaveNotebook(notebook: Notebook): Promise<void> {
  return activeAdapter.saveNotebook(notebook);
}

export async function dbSaveAllNotebooks(notebooks: Notebook[]): Promise<void> {
  return activeAdapter.saveAllNotebooks(notebooks);
}

export async function dbDeleteNotebook(id: string): Promise<void> {
  return activeAdapter.deleteNotebook(id);
}

/**
 * Storage API: Folders (backed by StorageAdapter)
 */
export async function dbGetFolders(): Promise<Folder[]> {
  return activeAdapter.getFolders();
}

export async function dbSaveFolders(folders: Folder[]): Promise<void> {
  return activeAdapter.saveFolders(folders);
}

/**
 * Storage API: Settings (backed by StorageAdapter)
 */
export async function dbGetSettings(): Promise<AppSettings> {
  return activeAdapter.getSettings();
}

export function dbSaveSettings(settings: AppSettings): void {
  activeAdapter.saveSettings(settings);
}

/**
 * Emergency Snapshot for Crash Recovery (backed by StorageAdapter)
 */
export function saveCrashSnapshot(notebook: Notebook): void {
  activeAdapter.saveCrashSnapshot(notebook);
}

export function getCrashSnapshot(): { notebook: Notebook; time: number } | null {
  return activeAdapter.getCrashSnapshot();
}

export function clearCrashSnapshot(): void {
  activeAdapter.clearCrashSnapshot();
}
