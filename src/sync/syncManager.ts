export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChangesCount: number;
  syncError: string | null;
}

export class SyncManager {
  private deviceId: string;
  private status: SyncStatus;
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.status = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncedAt: null,
      pendingChangesCount: 0,
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

  private handleConnectivity(online: boolean) {
    this.status.isOnline = online;
    this.notify();
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

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.status });
    }
  }

  /**
   * Syncs pending local changes with cloud backend (pluggable with Firebase / Supabase)
   */
  public async syncNow(): Promise<boolean> {
    if (!this.status.isOnline) {
      this.status.syncError = 'Нет подключения к сети';
      this.notify();
      return false;
    }

    this.status.isSyncing = true;
    this.status.syncError = null;
    this.notify();

    try {
      // Simulate or perform sync handshake
      await new Promise((resolve) => setTimeout(resolve, 800));
      this.status.lastSyncedAt = Date.now();
      this.status.pendingChangesCount = 0;
      this.status.isSyncing = false;
      this.notify();
      return true;
    } catch {
      this.status.isSyncing = false;
      this.status.syncError = 'Ошибка синхронизации';
      this.notify();
      return false;
    }
  }
}

export const syncManager = new SyncManager();
