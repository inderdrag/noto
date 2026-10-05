export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  isGuest: boolean;
  avatarUrl?: string;
  storageQuotaMb: number;
  usedStorageMb: number;
}

export class AuthManager {
  private user: UserProfile;
  private listeners: ((user: UserProfile) => void)[] = [];

  constructor() {
    this.user = this.loadUser();
  }

  private loadUser(): UserProfile {
    if (typeof localStorage === 'undefined') {
      return {
        id: 'local_guest',
        name: 'Noto User',
        email: null,
        isGuest: true,
        storageQuotaMb: 1024,
        usedStorageMb: 4.2,
      };
    }

    const saved = localStorage.getItem('noto_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }

    const guest: UserProfile = {
      id: 'local_user',
      name: 'Пользователь Noto',
      email: null,
      isGuest: true,
      storageQuotaMb: 5120, // 5GB local quota
      usedStorageMb: 6.8,
    };
    localStorage.setItem('noto_user_profile', JSON.stringify(guest));
    return guest;
  }

  public getUser(): UserProfile {
    return { ...this.user };
  }

  public subscribe(cb: (user: UserProfile) => void): () => void {
    this.listeners.push(cb);
    cb(this.user);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public updateProfile(updates: Partial<UserProfile>) {
    this.user = { ...this.user, ...updates };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noto_user_profile', JSON.stringify(this.user));
    }
    this.notify();
  }

  private notify() {
    for (const l of this.listeners) {
      l({ ...this.user });
    }
  }
}

export const authManager = new AuthManager();
