import { getSupabase } from '../sync/supabaseClient';

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
    this.initSupabaseAuth();
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
      storageQuotaMb: 5120,
      usedStorageMb: 6.8,
    };
    localStorage.setItem('noto_user_profile', JSON.stringify(guest));
    return guest;
  }

  private initSupabaseAuth() {
    const supabase = getSupabase();
    if (!supabase) return;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.setAuthenticatedUser(session.user);
      }
    }).catch(() => {});

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.setAuthenticatedUser(session.user);
      } else {
        this.setGuestUser();
      }
    });
  }

  private setAuthenticatedUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
    const name = (sbUser.user_metadata?.full_name as string) || sbUser.email?.split('@')[0] || 'Пользователь Noto';
    this.user = {
      id: sbUser.id,
      name,
      email: sbUser.email || null,
      isGuest: false,
      storageQuotaMb: 10240, // 10 GB cloud quota
      usedStorageMb: 8.5,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noto_user_profile', JSON.stringify(this.user));
    }
    this.notify();
  }

  private setGuestUser() {
    this.user = {
      id: 'local_user',
      name: 'Пользователь Noto',
      email: null,
      isGuest: true,
      storageQuotaMb: 5120,
      usedStorageMb: 6.8,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noto_user_profile', JSON.stringify(this.user));
    }
    this.notify();
  }

  public getUser(): UserProfile {
    return { ...this.user };
  }

  public isAuthenticated(): boolean {
    return !this.user.isGuest && Boolean(this.user.email);
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

  public async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase не настроен в .env' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      this.setAuthenticatedUser(data.user);
    }
    return { success: true };
  }

  public async signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase не настроен в .env' };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session?.user) {
      this.setAuthenticatedUser(data.session.user);
      return { success: true };
    }

    return { success: true, message: 'Проверьте почту для подтверждения регистрации' };
  }

  public async signOut(): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    this.setGuestUser();
  }

  private notify() {
    for (const l of this.listeners) {
      l({ ...this.user });
    }
  }
}

export const authManager = new AuthManager();
