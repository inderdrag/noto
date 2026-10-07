import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CloudOff, 
  Check, 
  RotateCw, 
  Mail, 
  Lock, 
  LogOut, 
  User, 
  AlertCircle,
  Database,
  ExternalLink
} from 'lucide-react';
import { authManager, UserProfile } from '../auth/authManager';
import { syncManager, SyncStatus } from '../sync/syncManager';
import { isSupabaseConfigured, setCustomSupabaseConfig } from '../sync/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark' | 'system';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, theme = 'light' }) => {
  const [user, setUser] = useState<UserProfile>(authManager.getUser());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom Supabase configuration (optional fallback if not in .env)
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(
    typeof localStorage !== 'undefined' ? localStorage.getItem('noto_supabase_url') || '' : ''
  );
  const [customKey, setCustomKey] = useState(
    typeof localStorage !== 'undefined' ? localStorage.getItem('noto_supabase_anon_key') || '' : ''
  );

  const isDark = theme === 'dark';

  useEffect(() => {
    const unsubAuth = authManager.subscribe(setUser);
    const unsubSync = syncManager.subscribe(setSyncStatus);
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Пожалуйста, введите email и пароль');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const res = await authManager.signUpWithEmail(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Ошибка при регистрации');
        } else {
          setSuccessMsg(res.message || 'Регистрация успешна! Вы вошли в аккаунт.');
          syncManager.syncNow();
        }
      } else {
        const res = await authManager.signInWithEmail(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Неверный email или пароль');
        } else {
          setSuccessMsg('Вход выполнен успешно');
          syncManager.syncNow();
          setTimeout(() => onClose(), 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authManager.signOut();
  };

  const handleManualSync = async () => {
    setLoading(true);
    await syncManager.syncNow();
    setLoading(false);
  };

  const handleSaveConfig = () => {
    setCustomSupabaseConfig(customUrl.trim(), customKey.trim());
    setSuccessMsg('Настройки Supabase сохранены');
    setShowConfig(false);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${
          isDark ? 'bg-[#151624] border-neutral-800 text-white' : 'bg-white border-[#E2E4EC] text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#6355C7]/10 flex items-center justify-center text-[#6355C7]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Синхронизация Noto</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Облачное хранилище Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {/* Account Status Card */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#1C1D2E] border-neutral-800' : 'bg-[#F8F9FC] border-neutral-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs">
                  {user.email ? user.email[0].toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    {user.email ? user.email : 'Локальный режим (Гость)'}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {user.email ? 'Аккаунт подключён' : 'Данные хранятся только на этом устройстве'}
                  </div>
                </div>
              </div>

              {user.email && (
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-xs rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Выйти из аккаунта"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Выйти</span>
                </button>
              )}
            </div>

            {/* Sync Status indicators */}
            {user.email && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {syncStatus.isSyncing ? (
                    <span className="flex items-center gap-1 text-blue-500 font-medium">
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Синхронизация...
                    </span>
                  ) : syncStatus.isOnline ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" /> Синхронизировано
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <CloudOff className="w-3.5 h-3.5" /> Офлайн
                    </span>
                  )}
                  {syncStatus.pendingChangesCount > 0 && (
                    <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.2 rounded-full text-neutral-600 dark:text-neutral-300">
                      в очереди: {syncStatus.pendingChangesCount}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleManualSync}
                  disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                  className="text-xs font-semibold text-[#6355C7] hover:underline cursor-pointer disabled:opacity-40"
                >
                  Синхронизировать
                </button>
              </div>
            )}
          </div>

          {/* If user is NOT logged in: Show Email Sign In / Sign Up Form */}
          {!user.email && (
            <form onSubmit={handleSubmitAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-neutral-600 dark:text-neutral-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#6355C7] ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-neutral-600 dark:text-neutral-400">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#6355C7] ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#6355C7] hover:bg-[#5244B4] text-white font-semibold text-xs transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти в аккаунт'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg(null);
                  }}
                  className="text-xs text-[#6355C7] hover:underline font-medium cursor-pointer"
                >
                  {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>
            </form>
          )}

          {/* Supabase Connection Setup toggle */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3 h-3" />
              <span>{showConfig ? 'Скрыть параметры Supabase' : 'Параметры подключения Supabase (URL / Ключ)'}</span>
            </button>

            {showConfig && (
              <div className="mt-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-0.5">Supabase URL</label>
                  <input
                    type="text"
                    placeholder="https://xyz.supabase.co"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full p-1.5 text-xs rounded-lg border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-0.5">Anon Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full p-1.5 text-xs rounded-lg border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-400">
                    {configured ? '✓ Подключено к Supabase' : '⚠ Не настроено'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-3 py-1 bg-[#6355C7] text-white text-[11px] font-semibold rounded-lg hover:bg-[#5244B4] cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Шифрование и RLS включены</span>
          <span>Офлайн-персистентность активна</span>
        </div>
      </div>
    </div>
  );
};
