import { getSupabase } from './supabaseClient';
import { authManager } from '../auth/authManager';
import { Notebook, Folder, Page } from '../types';
import { mergePages } from './pageMerger';
import { uploadImageToStorage } from './imageStorage';
import { 
  dbGetAllNotebooks, 
  dbSaveNotebook, 
  dbGetFolders, 
  dbSaveFolders 
} from '../storage/db';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChangesCount: number;
  syncError: string | null;
}

interface QueuedAction {
  type: 'upsert_notebook' | 'delete_notebook' | 'upsert_folder';
  id: string;
  data?: any;
  timestamp: number;
}

export class SyncManager {
  private deviceId: string;
  private status: SyncStatus;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private queue: QueuedAction[] = [];
  private onRemoteUpdateCallback: (() => void) | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.queue = this.loadQueue();
    this.status = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncedAt: this.loadLastSynced(),
      pendingChangesCount: this.queue.length,
      syncError: null,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivity(true));
      window.addEventListener('offline', () => this.handleConnectivity(false));
    }
  }

  private getOrCreateDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'device_unknown';
    let id = localStorage.getItem('noto_device_id');
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('noto_device_id', id);
    }
    return id;
  }

  private loadQueue(): QueuedAction[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const saved = localStorage.getItem('noto_sync_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private saveQueue() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('noto_sync_offline_queue', JSON.stringify(this.queue));
      this.status.pendingChangesCount = this.queue.length;
      this.notify();
    } catch {
      // ignore
    }
  }

  private loadLastSynced(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const s = localStorage.getItem('noto_last_synced_at');
    return s ? parseInt(s, 10) : null;
  }

  private setLastSynced(time: number) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noto_last_synced_at', time.toString());
    }
    this.status.lastSyncedAt = time;
  }

  private handleConnectivity(online: boolean) {
    this.status.isOnline = online;
    this.notify();
    if (online) {
      // Network appeared: sync queued and pending changes
      this.syncNow();
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public subscribe(cb: (status: SyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public setOnRemoteUpdate(cb: () => void) {
    this.onRemoteUpdateCallback = cb;
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.status });
    }
  }

  /**
   * Schedules a debounced sync (600ms) after local save
   */
  public scheduleSync(notebook?: Notebook) {
    if (notebook) {
      // Enqueue action in case app closes or goes offline
      this.enqueue({
        type: 'upsert_notebook',
        id: notebook.id,
        data: notebook,
        timestamp: Date.now(),
      });
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.syncNow(notebook);
    }, 600);
  }

  private enqueue(action: QueuedAction) {
    // Replace duplicate queue entries for the same entity
    this.queue = this.queue.filter((a) => !(a.type === action.type && a.id === action.id));
    this.queue.push(action);
    this.saveQueue();
  }

  /**
   * Main sync engine:
   * 1. Pushes local notebook changes (with images uploaded to Supabase Storage)
   * 2. Merges page elements using CRDT Last-Write-Wins (mergePages)
   * 3. Pulls remote updates and updates local storage
   */
  public async syncNow(targetNotebook?: Notebook): Promise<boolean> {
    const supabase = getSupabase();
    const user = authManager.getUser();

    // If Supabase is not configured or user is not logged in, work offline without errors
    if (!supabase || user.isGuest || !user.email) {
      this.status.isSyncing = false;
      this.status.syncError = null;
      this.status.pendingChangesCount = 0;
      this.notify();
      return true;
    }

    if (!this.status.isOnline) {
      this.status.syncError = 'Офлайн (изменения сохранены в очереди)';
      this.status.pendingChangesCount = this.queue.length;
      this.notify();
      return false;
    }

    this.status.isSyncing = true;
    this.status.syncError = null;
    this.notify();

    try {
      const userId = user.id;

      // 1. Push Folders FIRST (to ensure foreign key references in notebooks remain valid)
      const localFolders = await dbGetFolders();
      for (const f of localFolders) {
        const { error: folderError } = await supabase.from('folders').upsert({
          id: f.id,
          user_id: userId,
          name: f.name,
          icon: f.icon || null,
          color: f.color || null,
          created_at: f.createdAt,
          updated_at: f.updatedAt || f.createdAt,
          deleted: Boolean(f.deleted),
        });

        if (folderError) {
          console.warn('[SyncManager] Folder upsert error:', folderError.message);
        }
      }

      // 2. Push Notebooks SECOND
      const notebooksToPush: Notebook[] = [];
      if (targetNotebook) {
        notebooksToPush.push(targetNotebook);
      } else {
        const localNbs = await dbGetAllNotebooks();
        notebooksToPush.push(...localNbs);
      }

      // Set of deleted folder IDs to avoid dangling references
      const locallyDeletedFolderIds = new Set(
        localFolders.filter((f) => f.deleted).map((f) => f.id)
      );

      for (const nb of notebooksToPush) {
        // If notebook references a deleted folder, reset folderId to null
        const effectiveFolderId = (nb.folderId && !locallyDeletedFolderIds.has(nb.folderId))
          ? nb.folderId
          : null;

        // Upsert Notebook Record
        const { error: nbError } = await supabase.from('notebooks').upsert({
          id: nb.id,
          user_id: userId,
          title: nb.title,
          folder_id: effectiveFolderId,
          cover_color: nb.coverColor,
          cover_pattern: nb.coverPattern || 'plain',
          current_page_id: nb.currentPageId,
          favorite: Boolean(nb.favorite),
          created_at: nb.createdAt,
          updated_at: nb.updatedAt,
          deleted: false,
        });

        if (nbError) {
          console.warn('[SyncManager] Notebook upsert error:', nbError.message);
        }

        // 3. Push Pages THIRD (for each notebook)
        for (const page of nb.pages || []) {
          // Process and upload base64 images to Supabase Storage bucket
          if (page.images && page.images.length > 0) {
            for (const img of page.images) {
              if (img.src && img.src.startsWith('data:')) {
                img.src = await uploadImageToStorage(img, userId, page.id);
              }
            }
          }

          // Fetch remote page if exists to perform element-level CRDT merge
          const { data: remotePageRows } = await supabase
            .from('pages')
            .select('*')
            .eq('id', page.id)
            .limit(1);

          let finalPage = page;
          if (remotePageRows && remotePageRows.length > 0) {
            const rawRemote = remotePageRows[0];
            const remotePage: Page = {
              id: rawRemote.id,
              title: rawRemote.title,
              order: rawRemote.order_num,
              width: rawRemote.width,
              height: rawRemote.height,
              background: rawRemote.background,
              strokes: rawRemote.strokes || [],
              shapes: rawRemote.shapes || [],
              texts: rawRemote.texts || [],
              images: rawRemote.images || [],
              createdAt: rawRemote.created_at,
              updatedAt: rawRemote.updated_at,
              deleted: rawRemote.deleted,
            };
            finalPage = mergePages(page, remotePage);
          }

          await supabase.from('pages').upsert({
            id: finalPage.id,
            user_id: userId,
            notebook_id: nb.id,
            title: finalPage.title,
            order_num: finalPage.order,
            width: finalPage.width,
            height: finalPage.height,
            background: finalPage.background,
            strokes: finalPage.strokes,
            shapes: finalPage.shapes,
            texts: finalPage.texts,
            images: finalPage.images,
            created_at: finalPage.createdAt,
            updated_at: finalPage.updatedAt,
            deleted: Boolean(finalPage.deleted),
          });
        }
      }

      // 4. Pull Remote Folders
      const { data: remoteFolders } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId);

      let finalFolders = localFolders;
      if (remoteFolders && remoteFolders.length > 0) {
        const localFolderMap = new Map(localFolders.map((f) => [f.id, f]));
        const mergedFolders: Folder[] = [];
        let hasFolderChanges = false;

        for (const rf of remoteFolders) {
          const locF = localFolderMap.get(rf.id);
          const rfUpdatedAt = Number(rf.updated_at) || Number(rf.created_at);
          const rfDeleted = Boolean(rf.deleted);

          if (!locF) {
            mergedFolders.push({
              id: rf.id,
              name: rf.name,
              icon: rf.icon,
              color: rf.color,
              createdAt: Number(rf.created_at),
              updatedAt: rfUpdatedAt,
              deleted: rfDeleted,
            });
            hasFolderChanges = true;
          } else {
            const locUpdatedAt = locF.updatedAt || locF.createdAt;
            if (rfUpdatedAt > locUpdatedAt) {
              mergedFolders.push({
                id: rf.id,
                name: rf.name,
                icon: rf.icon,
                color: rf.color,
                createdAt: locF.createdAt,
                updatedAt: rfUpdatedAt,
                deleted: rfDeleted,
              });
              hasFolderChanges = true;
            } else {
              mergedFolders.push(locF);
            }
            localFolderMap.delete(rf.id);
          }
        }

        for (const remaining of localFolderMap.values()) {
          mergedFolders.push(remaining);
        }

        finalFolders = mergedFolders;
        if (hasFolderChanges) {
          await dbSaveFolders(finalFolders);
        }
      }

      // Collect all deleted folder IDs
      const allDeletedFolderIds = new Set(
        finalFolders.filter((f) => f.deleted).map((f) => f.id)
      );

      // 5. Pull Remote Notebooks & Pages that may have changed on other devices
      const { data: remoteNotebooks } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (remoteNotebooks && remoteNotebooks.length > 0) {
        const { data: allRemotePages } = await supabase
          .from('pages')
          .select('*')
          .eq('user_id', userId)
          .order('order_num', { ascending: true });

        const localNotebooks = await dbGetAllNotebooks();
        const localNbMap = new Map(localNotebooks.map((n) => [n.id, n]));
        let hasRemoteUpdates = false;

        for (const remNb of remoteNotebooks) {
          const pagesForNb = (allRemotePages || [])
            .filter((p) => p.notebook_id === remNb.id)
            .map((p) => ({
              id: p.id,
              title: p.title,
              order: p.order_num,
              width: p.width,
              height: p.height,
              background: p.background,
              strokes: p.strokes || [],
              shapes: p.shapes || [],
              texts: p.texts || [],
              images: p.images || [],
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              deleted: p.deleted,
            }));

          // If notebook folder is deleted, reset folderId to null
          const resolvedFolderId = (remNb.folder_id && !allDeletedFolderIds.has(remNb.folder_id))
            ? remNb.folder_id
            : null;

          const localNb = localNbMap.get(remNb.id);
          if (!localNb) {
            // New remote notebook: add to local
            const assembled: Notebook = {
              id: remNb.id,
              title: remNb.title,
              folderId: resolvedFolderId,
              coverColor: remNb.cover_color,
              coverPattern: remNb.cover_pattern || 'plain',
              pages: pagesForNb,
              currentPageId: remNb.current_page_id || pagesForNb[0]?.id || `page_${Date.now()}`,
              favorite: Boolean(remNb.favorite),
              createdAt: remNb.created_at,
              updatedAt: remNb.updated_at,
            };
            await dbSaveNotebook(assembled);
            hasRemoteUpdates = true;
          } else {
            // Merge pages
            if (remNb.updated_at > localNb.updatedAt || (localNb.folderId && allDeletedFolderIds.has(localNb.folderId))) {
              const mergedPages: Page[] = [];
              const localPageMap = new Map((localNb.pages || []).map((p) => [p.id, p]));

              for (const remPage of pagesForNb) {
                const locPage = localPageMap.get(remPage.id);
                if (locPage) {
                  mergedPages.push(mergePages(locPage, remPage));
                  localPageMap.delete(remPage.id);
                } else {
                  mergedPages.push(remPage);
                }
              }

              // Append any local pages not on remote
              for (const remainingLoc of localPageMap.values()) {
                mergedPages.push(remainingLoc);
              }

              const updatedLocalNb: Notebook = {
                ...localNb,
                title: remNb.title,
                folderId: resolvedFolderId,
                coverColor: remNb.cover_color,
                coverPattern: remNb.cover_pattern || localNb.coverPattern,
                favorite: Boolean(remNb.favorite),
                pages: mergedPages,
                updatedAt: Math.max(localNb.updatedAt, remNb.updated_at),
              };
              await dbSaveNotebook(updatedLocalNb);
              hasRemoteUpdates = true;
            }
          }
        }

        // Also check if any existing local notebook has a folder that was just deleted
        for (const locNb of localNotebooks) {
          if (locNb.folderId && allDeletedFolderIds.has(locNb.folderId)) {
            const updated = { ...locNb, folderId: null, updatedAt: Date.now() };
            await dbSaveNotebook(updated);
            hasRemoteUpdates = true;
          }
        }

        if (hasRemoteUpdates && this.onRemoteUpdateCallback) {
          this.onRemoteUpdateCallback();
        }
      }

      // Clear offline queue on successful sync
      this.queue = [];
      this.saveQueue();
      this.setLastSynced(Date.now());
      this.status.isSyncing = false;
      this.status.syncError = null;
      this.status.pendingChangesCount = 0;
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('[SyncManager] Sync failed:', err);
      this.status.isSyncing = false;
      this.status.syncError = err?.message || 'Ошибка синхронизации';
      this.notify();
      return false;
    }
  }
}

export const syncManager = new SyncManager();
