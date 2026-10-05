import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  MoreVertical, 
  Download, 
  Copy, 
  Trash2, 
  Edit3, 
  UploadCloud,
  Sun,
  Moon
} from 'lucide-react';
import { Notebook, Folder } from '../types';
import { exportToNotoFile } from '../export/exporter';

interface LibraryViewProps {
  notebooks: Notebook[];
  folders: Folder[];
  onOpenNotebook: (id: string) => void;
  onQuickCreateNotebook: () => void;
  onRenameNotebook: (id: string, newTitle: string) => void;
  onDuplicateNotebook: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onImportNotoFile: (file: File) => void;
  showWelcome: boolean;
  onDismissWelcome: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  notebooks,
  folders,
  onOpenNotebook,
  onQuickCreateNotebook,
  onRenameNotebook,
  onDuplicateNotebook,
  onDeleteNotebook,
  onToggleFavorite,
  onImportNotoFile,
  showWelcome,
  onDismissWelcome,
  theme,
  onToggleTheme,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingId && renameInput.trim()) {
      onRenameNotebook(renamingId, renameInput.trim());
      setRenamingId(null);
    }
  };

  const filteredNotebooks = notebooks
    .filter((nb) => {
      if (selectedFolderId !== 'all' && nb.folderId !== selectedFolderId) return false;
      if (activeTab === 'favorites' && !nb.favorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = nb.title.toLowerCase().includes(q);
        const matchesPages = nb.pages.some((p) => p.title.toLowerCase().includes(q));
        if (!matchesTitle && !matchesPages) return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex-1 flex overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-[#0E0F14] text-neutral-100' : 'bg-[#F8FAFC] text-neutral-900'
    }`}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".noto,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportNotoFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full px-8 py-6">
        {/* Minimal Header */}
        <header className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b shrink-0 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}>
              Noto
            </h1>
            <p className={`text-xs mt-0.5 ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Your digital notebook
            </p>
          </div>

          {/* Action cluster: Search + Filters + Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по конспектам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isDark
                    ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500'
                    : 'bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 shadow-xs'
                }`}
              />
            </div>

            {/* Folder Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setSelectedFolderId('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedFolderId === 'all'
                    ? isDark
                      ? 'font-bold text-white bg-neutral-800'
                      : 'font-bold text-neutral-950 bg-white border border-neutral-300 shadow-xs'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-950 bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                Все
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    selectedFolderId === f.id
                      ? isDark
                        ? 'font-bold text-white bg-neutral-800'
                        : 'font-bold text-neutral-950 bg-white border border-neutral-300 shadow-xs'
                      : isDark
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600 hover:text-neutral-950 bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            <div className={`w-px h-4 mx-1 hidden sm:block ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />

            {/* Theme Switcher Button: Pure White in Light Theme */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl transition-all ${
                isDark
                  ? 'border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                  : 'border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs'
              }`}
              title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* Import Button: Pure White in Light Theme */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                  : 'border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
              <span>Импорт</span>
            </button>

            {/* Direct creation button: Pure White with bold Blue accent in Light Theme */}
            <button
              onClick={onQuickCreateNotebook}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-white border-2 border-blue-600 hover:bg-blue-50 text-blue-600 shadow-xs'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Новая тетрадь</span>
            </button>
          </div>
        </header>

        {/* Quiet welcome on first run */}
        {showWelcome && (
          <div className={`my-6 p-5 rounded-2xl border flex items-center justify-between ${
            isDark 
              ? 'bg-neutral-900/60 border-neutral-800/60' 
              : 'bg-white border-neutral-200 shadow-xs'
          }`}>
            <div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Чистое пространство для ваших конспектов
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Нажмите «Новая тетрадь», чтобы сразу перейти на полноэкранный лист и начать писать.
              </p>
            </div>
            <button
              onClick={onDismissWelcome}
              className={`text-xs font-medium px-3 py-1 ${
                isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Notebooks Grid */}
        <div className="flex-1 overflow-y-auto pt-6 pb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* New Notebook Card: clicks directly into full-screen editor! */}
            <div
              onClick={onQuickCreateNotebook}
              className={`group h-64 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDark
                  ? 'border border-dashed border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/30'
                  : 'border-2 border-dashed border-neutral-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 shadow-xs'
              }`}
              title="Создать и сразу открыть тетрадь"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all mb-2 ${
                isDark
                  ? 'bg-neutral-800 text-neutral-400 group-hover:bg-white group-hover:text-neutral-900'
                  : 'bg-white border border-neutral-300 text-neutral-700 group-hover:border-blue-500 group-hover:text-blue-600 shadow-xs'
              }`}>
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className={`text-xs transition-colors ${
                isDark
                  ? 'font-medium text-neutral-400 group-hover:text-white'
                  : 'font-bold text-neutral-900 group-hover:text-blue-600'
              }`}>
                Новая тетрадь
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">Открыть сразу</span>
            </div>

            {/* Notebook Cards */}
            {filteredNotebooks.map((nb) => {
              const isMenuOpen = menuOpenId === nb.id;
              return (
                <div
                  key={nb.id}
                  onClick={() => onOpenNotebook(nb.id)}
                  className={`group relative flex flex-col h-64 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-2xs hover:shadow-md'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Notebook Cover */}
                  <div
                    className="h-44 p-4 flex flex-col justify-between relative overflow-hidden transition-transform duration-300 group-hover:scale-[1.01]"
                    style={{ backgroundColor: nb.coverColor }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20" />

                    <div className="relative z-10 pl-2">
                      <h3 className="text-white font-medium text-sm leading-snug tracking-tight line-clamp-2">
                        {nb.title}
                      </h3>
                    </div>

                    <div className="relative z-10 pl-2 flex items-center justify-between text-[11px] text-white/70 font-mono">
                      <span>{nb.pages.length} стр.</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(nb.id);
                        }}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <Star className={`w-3.5 h-3.5 ${nb.favorite ? 'fill-white text-white' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className={`flex-1 px-3 py-2 flex items-center justify-between text-[11px] ${
                    isDark
                      ? 'text-neutral-400 bg-neutral-900'
                      : 'text-neutral-600 bg-white border-t border-neutral-100'
                  }`}>
                    <span className="truncate">{formatDate(nb.updatedAt)}</span>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(isMenuOpen ? null : nb.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                            : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 bottom-full mb-1 w-44 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                            isDark
                              ? 'bg-[#181922] border border-neutral-700 text-neutral-200'
                              : 'bg-white border border-neutral-200 text-neutral-800'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setRenamingId(nb.id);
                              setRenameInput(nb.title);
                              setMenuOpenId(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                              isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-500" /> Переименовать
                          </button>
                          <button
                            onClick={() => {
                              onDuplicateNotebook(nb.id);
                              setMenuOpenId(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                              isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-500" /> Дублировать
                          </button>
                          <button
                            onClick={() => {
                              exportToNotoFile(nb);
                              setMenuOpenId(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                              isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <Download className="w-3.5 h-3.5 text-purple-500" /> Экспорт .noto
                          </button>
                          <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />
                          <button
                            onClick={() => {
                              onDeleteNotebook(nb.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal: Rename */}
      {renamingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl w-full max-w-xs p-5 shadow-2xl border ${
            isDark
              ? 'bg-[#181922] border-neutral-700 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-neutral-950'}`}>
              Переименовать
            </h3>
            <form onSubmit={handleConfirmRename}>
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 ${
                  isDark
                    ? 'bg-neutral-800 border-none text-white'
                    : 'bg-white border border-neutral-300 text-neutral-900 shadow-2xs'
                }`}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className={`px-3 py-1 text-xs ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    isDark
                      ? 'bg-white text-neutral-900 hover:bg-neutral-200'
                      : 'bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 shadow-xs'
                  }`}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
