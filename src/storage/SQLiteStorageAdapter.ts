import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Notebook, Folder, AppSettings } from '../types';
import { StorageAdapter } from './StorageAdapter';
import { DEFAULT_SETTINGS, createStarterData } from './defaults';
import { normalizeNotebook } from './migration';
import { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';

const DB_NAME = 'noto_db';
const DB_VERSION = 1;

/**
 * SQLiteStorageAdapter provides persistent relational storage for Android
 * using @capacitor-community/sqlite, conforming to the StorageAdapter contract.
 */
export class SQLiteStorageAdapter implements StorageAdapter {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initPromise: Promise<SQLiteDBConnection> | null = null;
  private fallbackAdapter = new IndexedDBStorageAdapter();

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  private async getDb(): Promise<SQLiteDBConnection> {
    if (this.db) {
      return this.db;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const isConn = await this.sqlite.isConnection(DB_NAME, false);
        let conn: SQLiteDBConnection;

        if (isConn.result) {
          conn = await this.sqlite.retrieveConnection(DB_NAME, false);
        } else {
          conn = await this.sqlite.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            DB_VERSION,
            false
          );
        }

        const isOpened = await conn.isExists();
        if (isOpened.result) {
          try {
            await conn.open();
          } catch {
            // Already open or opened during retrieve
          }
        } else {
          await conn.open();
        }

        // Initialize SQLite schema
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS notebooks (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS crash_recovery (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            time INTEGER NOT NULL
          );
        `);

        this.db = conn;
        return conn;
      } catch (err) {
        console.warn('[SQLiteStorageAdapter] Failed to initialize SQLite, using fallback:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  // --- Notebook Operations ---

  async getAllNotebooks(): Promise<Notebook[]> {
    try {
      const db = await this.getDb();
      const res = await db.query('SELECT data FROM notebooks ORDER BY updated_at DESC;');
      const rows = res.values || [];

      if (rows.length === 0) {
        const starter = createStarterData();
        const normalizedStarter = starter.notebooks.map((nb) => normalizeNotebook(nb));
        await this.saveAllNotebooks(normalizedStarter);
        await this.saveFolders(starter.folders);
        return normalizedStarter;
      }

      return rows.map((row: { data: string }) => {
        const parsed: Notebook = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return normalizeNotebook(parsed);
      });
    } catch {
      return this.fallbackAdapter.getAllNotebooks();
    }
  }

  async saveNotebook(notebook: Notebook): Promise<void> {
    const now = Date.now();
    notebook.updatedAt = now;
    const normalized = normalizeNotebook(notebook);

    try {
      const db = await this.getDb();
      await db.run(
        'INSERT OR REPLACE INTO notebooks (id, data, updated_at) VALUES (?, ?, ?);',
        [normalized.id, JSON.stringify(normalized), normalized.updatedAt]
      );
    } catch {
      await this.fallbackAdapter.saveNotebook(notebook);
    }
  }

  async saveAllNotebooks(notebooks: Notebook[]): Promise<void> {
    try {
      const db = await this.getDb();
      for (const nb of notebooks) {
        const normalized = normalizeNotebook(nb);
        await db.run(
          'INSERT OR REPLACE INTO notebooks (id, data, updated_at) VALUES (?, ?, ?);',
          [normalized.id, JSON.stringify(normalized), normalized.updatedAt]
        );
      }
    } catch {
      await this.fallbackAdapter.saveAllNotebooks(notebooks);
    }
  }

  async deleteNotebook(id: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.run('DELETE FROM notebooks WHERE id = ?;', [id]);
    } catch {
      await this.fallbackAdapter.deleteNotebook(id);
    }
  }

  // --- Folder Operations ---

  async getFolders(): Promise<Folder[]> {
    try {
      const db = await this.getDb();
      const res = await db.query('SELECT data FROM folders;');
      const rows = res.values || [];

      if (rows.length === 0) {
        const starter = createStarterData();
        await this.saveFolders(starter.folders);
        return starter.folders;
      }

      return rows.map((row: { data: string }) => {
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      });
    } catch {
      return this.fallbackAdapter.getFolders();
    }
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    try {
      const db = await this.getDb();
      await db.run('DELETE FROM folders;');
      for (const f of folders) {
        await db.run(
          'INSERT OR REPLACE INTO folders (id, data) VALUES (?, ?);',
          [f.id, JSON.stringify(f)]
        );
      }
    } catch {
      await this.fallbackAdapter.saveFolders(folders);
    }
  }

  // --- Settings Operations ---

  async getSettings(): Promise<AppSettings> {
    try {
      const db = await this.getDb();
      const res = await db.query('SELECT data FROM settings WHERE key = ?;', ['app_settings']);
      const rows = res.values || [];
      if (rows.length > 0) {
        const parsed = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      return this.fallbackAdapter.getSettings();
    }
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const db = await this.getDb();
      await db.run(
        'INSERT OR REPLACE INTO settings (key, data) VALUES (?, ?);',
        ['app_settings', JSON.stringify(settings)]
      );
    } catch {
      await this.fallbackAdapter.saveSettings(settings);
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
    this.getDb().then((db) => {
      db.run(
        'INSERT OR REPLACE INTO crash_recovery (id, data, time) VALUES (?, ?, ?);',
        ['latest', JSON.stringify(notebook), Date.now()]
      ).catch(() => {});
    }).catch(() => {});
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
    this.getDb().then((db) => {
      db.run('DELETE FROM crash_recovery WHERE id = ?;', ['latest']).catch(() => {});
    }).catch(() => {});
  }
}
