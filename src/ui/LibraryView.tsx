import React, { useState, useRef, useMemo } from 'react';
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
  Check,
  FolderPlus,
  ArrowUpDown
} from 'lucide-react';
import { Notebook, Folder } from '../types';
import { exportToNotoFile } from '../export/exporter';
import { NotoIcon } from './NotoLogo';

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
  zoom?: number;
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
  theme,
  onToggleTheme,
  onCreateFolder,
  zoom = 1,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'pages'>('updated');
  
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingId && renameInput.trim()) {
      onRenameNotebook(renamingId, renameInput.trim());
      setRenamingId(null);
    }
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const totalPages = useMemo(() => {
    return notebooks.reduce((acc, nb) => acc + nb.pages.length, 0);
  }, [notebooks]);

  // Filter & Sort notebooks
  const filteredNotebooks = useMemo(() => {
    return notebooks
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
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title, 'ru');
        }
        if (sortBy === 'pages') {
          return b.pages.length - a.pages.length;
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [notebooks, selectedFolderId, activeTab, searchQuery, sortBy]);

  // Most recent notebook for the "Продолжить с места остановки" widget
  const recentNotebook = useMemo(() => {
    if (notebooks.length === 0) return null;
    return [...notebooks].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }, [notebooks]);

  const recentPage = useMemo(() => {
    if (!recentNotebook) return null;
    const cur = recentNotebook.pages.find((p) => p.id === recentNotebook.currentPageId);
    return cur || recentNotebook.pages[0] || null;
  }, [recentNotebook]);

  // Dynamic extraction of the latest notes / text lines written on the sheet
  const recentSnippets = useMemo(() => {
    if (!recentNotebook) return [];
    const page = recentPage || recentNotebook.pages[0];
    if (!page) return [recentNotebook.title];

    if (page.texts && page.texts.length > 0) {
      const allLines: string[] = [];
      const sortedTexts = [...page.texts].sort((a, b) => (a.y || 0) - (b.y || 0));
      for (const t of sortedTexts) {
        if (t.text) {
          const lines = t.text.split('\n').map((l) => l.trim()).filter(Boolean);
          allLines.push(...lines);
        }
      }
      if (allLines.length > 0) {
        return allLines.slice(-3);
      }
    }

    if (page.strokes && page.strokes.length > 0) {
      return [page.title || recentNotebook.title, `Штрихов на листе: ${page.strokes.length}`];
    }

    return [page.title || recentNotebook.title, 'Чистый лист'];
  }, [recentNotebook, recentPage]);

  const formatCardDate = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const d = new Date(ts);
    
    // Within 24 hours
    if (diff < 24 * 3600 * 1000) {
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `Сегодня, ${hours}:${minutes}`;
    }
    // Yesterday
    if (diff < 48 * 3600 * 1000) {
      return 'Вчера';
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const getFolderLabel = (folderId?: string | null) => {
    const f = folders.find((item) => item.id === folderId);
    return f ? f.name : 'Личное';
  };

  const getCoverPastel = (color?: string | null, idx: number = 0) => {
    if (color && color.startsWith('#')) {
      // Map saturated colors to soft matching pastels
      if (color === '#2563EB' || color === '#1E3A8A' || color === '#0284C7') return '#BBD6FA';
      if (color === '#7C3AED' || color === '#9333EA') return '#D3C3F5';
      if (color === '#059669' || color === '#10B981') return '#A8DCD1';
      if (color === '#E11D48' || color === '#EA580C') return '#FBC9BC';
      return color;
    }
    const presets = ['#BBD6FA', '#D3C3F5', '#A8DCD1', '#FBC9BC'];
    return presets[idx % presets.length];
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans select-none transition-colors ${
      isDark ? 'bg-[#0E0F17] text-neutral-100' : 'bg-[#F7F8FC] text-neutral-900'
    }`}>
      {/* Hidden file input for .noto import */}
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

      {/* Main Navigation Header */}
      <header className={`h-16 px-8 flex items-center justify-between shrink-0 border-b ${
        isDark ? 'bg-[#12131F] border-neutral-800' : 'bg-white border-[#EAEBF2]'
      }`}>
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('all')}>
            <NotoIcon size={26} color="#6355C7" />
            <span className="font-bold tracking-tight text-xl text-neutral-900 dark:text-white">
              Noto
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-6 text-sm">
            <button
              onClick={() => setActiveTab('all')}
              className={`font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'text-neutral-900 dark:text-white font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Мои тетради
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'favorites'
                  ? 'text-neutral-900 dark:text-white font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Избранное
              {notebooks.filter((n) => n.favorite).length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFEAFD] text-[#6355C7] dark:bg-neutral-800 font-semibold">
                  {notebooks.filter((n) => n.favorite).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Center Search bar */}
        <div className="relative w-80 max-w-sm hidden md:block">
          <input
            type="text"
            placeholder="Поиск тетрадей   ⌘ K"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-5 pr-4 py-2 text-xs rounded-full focus:outline-none focus:ring-2 focus:ring-[#6355C7] transition-all text-center placeholder:text-neutral-400 ${
              isDark
                ? 'bg-[#181928] border border-neutral-700/80 text-white'
                : 'bg-[#F2F1F8] border border-transparent text-neutral-800'
            }`}
          />
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-5 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#181928] border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                : 'bg-white border-[#E0E2EC] text-neutral-700 hover:bg-neutral-50 shadow-2xs'
            }`}
          >
            Импорт
          </button>
          <button
            onClick={onQuickCreateNotebook}
            className="px-5 py-2 text-xs font-semibold rounded-full bg-[#6355C7] hover:bg-[#5244B4] text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-98"
          >
            Новая тетрадь
          </button>
        </div>
      </header>

      {/* Main Scrollable Canvas / Viewport */}
      <div 
        className="flex-1 overflow-y-auto px-8 py-8 max-w-7xl mx-auto w-full flex flex-col justify-between transition-all duration-150"
        style={{ zoom: zoom ? `${zoom}` : '1' }}
      >
        <div>
          {/* Page Heading & Meta Counter */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                {activeTab === 'favorites' ? 'Избранные тетради' : 'Мои тетради'}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Все ваши мысли — в одном уютном месте.
              </p>
            </div>
            <div className="text-xs text-neutral-400">
              {notebooks.length} {notebooks.length === 1 ? 'тетрадь' : notebooks.length < 5 ? 'тетради' : 'тетрадей'} · {totalPages} {totalPages === 1 ? 'страница' : totalPages < 5 ? 'страницы' : 'страниц'}
            </div>
          </div>

          {/* Filter Pills & Sort Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            {/* Category / Folder tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFolderId('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedFolderId === 'all'
                    ? 'bg-[#EFEAFD] text-[#6355C7] dark:bg-[#252238] dark:text-[#A79AF3] font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Все
              </button>

              {folders.map((folder) => {
                const isActive = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#EFEAFD] text-[#6355C7] dark:bg-[#252238] dark:text-[#A79AF3] font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {folder.name}
                  </button>
                );
              })}

              {/* Add folder button / input */}
              {isCreatingFolder ? (
                <form onSubmit={handleCreateNewFolder} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Новый раздел..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-full border border-[#6355C7] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none w-28"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded-full bg-[#6355C7] text-white hover:bg-[#5244B4]"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 px-1"
                  >
                    Отмена
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  title="Добавить раздел"
                  className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="hidden sm:inline">Сортировка:</span>
              <div className="relative inline-block">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`appearance-none bg-transparent pr-5 text-xs text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer outline-none`}
                >
                  <option value="updated" className={isDark ? 'bg-neutral-900' : 'bg-white'}>По изменению</option>
                  <option value="title" className={isDark ? 'bg-neutral-900' : 'bg-white'}>По названию</option>
                  <option value="pages" className={isDark ? 'bg-neutral-900' : 'bg-white'}>По страницам</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-neutral-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Grid Layout (Notebooks cards + "Продолжить с места остановки" sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Notebook Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredNotebooks.map((nb, idx) => {
                const pastel = getCoverPastel(nb.coverColor, idx);
                const folderName = getFolderLabel(nb.folderId);
                const isMenuOpen = menuOpenId === nb.id;

                return (
                  <div
                    key={nb.id}
                    onClick={() => {
                      if (renamingId !== nb.id) onOpenNotebook(nb.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer relative group ${
                      isDark
                        ? 'bg-[#151622] border-neutral-800 hover:border-neutral-700 hover:shadow-lg'
                        : 'bg-white border-[#E8E9F2] hover:border-[#D5D8E6] hover:shadow-md'
                    }`}
                  >
                    {/* Notebook Cover Thumbnail */}
                    <div 
                      style={{ backgroundColor: pastel }}
                      className="w-28 h-36 rounded-xl flex flex-col justify-between p-3 shrink-0 shadow-xs relative overflow-hidden transition-transform group-hover:scale-102"
                    >
                      {/* Spine / bookmark line */}
                      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-black/5" />
                      
                      <div className="text-[11px] font-bold text-neutral-800 leading-snug break-words mt-3">
                        {nb.title}
                      </div>

                      {/* Cover rule indicator */}
                      <div className="w-8 h-0.5 bg-neutral-800/20 my-auto" />

                      {/* Folder tag */}
                      <div className="text-[9px] uppercase tracking-wider text-neutral-600/80 font-semibold truncate">
                        {folderName}
                      </div>
                    </div>

                    {/* Notebook Meta details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-32 py-1">
                      <div>
                        <div className="text-[11px] text-neutral-400 font-medium">
                          {folderName}
                        </div>

                        {renamingId === nb.id ? (
                          <form 
                            onSubmit={handleConfirmRename} 
                            onClick={(e) => e.stopPropagation()} 
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="mt-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={renameInput}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onBlur={handleConfirmRename}
                              onChange={(e) => setRenameInput(e.target.value)}
                              className="text-base font-semibold border-b-2 border-[#6355C7] bg-transparent outline-none w-full text-neutral-900 dark:text-white"
                            />
                          </form>
                        ) : (
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-white truncate mt-0.5">
                            {nb.title}
                          </h3>
                        )}

                        <div className="text-xs text-neutral-400 mt-1">
                          {nb.pages.length} {nb.pages.length === 1 ? 'страница' : nb.pages.length < 5 ? 'страницы' : 'страниц'}
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        {formatCardDate(nb.updatedAt)}
                      </div>
                    </div>

                    {/* Context Menu / Quick actions button */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => setMenuOpenId(isMenuOpen ? null : nb.id)}
                        className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl border p-1 z-30 shadow-xl ${
                          isDark ? 'bg-[#1C1D2C] border-neutral-700 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
                        }`}>
                          <button
                            onClick={() => {
                              onToggleFavorite(nb.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                          >
                            <Star className={`w-3.5 h-3.5 ${nb.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                            {nb.favorite ? 'Убрать из избранного' : 'В избранное'}
                          </button>
                          <button
                            onClick={() => {
                              setRenamingId(nb.id);
                              setRenameInput(nb.title);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Переименовать
                          </button>
                          <button
                            onClick={() => {
                              onDuplicateNotebook(nb.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" /> Дублировать
                          </button>
                          <button
                            onClick={() => {
                              exportToNotoFile(nb);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" /> Экспорт .noto
                          </button>
                          <div className="border-t my-1 border-neutral-200 dark:border-neutral-700" />
                          <button
                            onClick={() => {
                              onDeleteNotebook(nb.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredNotebooks.length === 0 && (
                <div className="col-span-2 py-16 text-center text-neutral-400">
                  <p className="text-sm">Нет тетрадей в этой категории.</p>
                  <button
                    onClick={onQuickCreateNotebook}
                    className="mt-3 text-xs text-[#6355C7] hover:underline font-medium"
                  >
                    + Создать новую тетрадь
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: "ПРОДОЛЖИТЬ С МЕСТА ОСТАНОВКИ" widget */}
            {recentNotebook && (
              <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-[#181928] border-neutral-800'
                  : 'bg-[#F2F1F8] border-[#E8E6F2]'
              }`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Продолжить с места остановки
                </div>

                {/* Miniature Sheet Preview Card */}
                <div 
                  onClick={() => onOpenNotebook(recentNotebook.id)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200/80 cursor-pointer flex flex-col justify-between min-h-[190px] relative overflow-hidden group hover:shadow-md transition-all"
                >
                  {/* Subtle Grid Pattern on Paper */}
                  <div 
                    className="absolute inset-0 opacity-15 pointer-events-none" 
                    style={{
                      backgroundImage: 'radial-gradient(#6366F1 1px, transparent 1px)',
                      backgroundSize: '16px 16px'
                    }} 
                  />

                  <div>
                    <h4 className="text-sm font-bold text-[#1E3A8A] truncate">
                      {recentPage?.title || recentNotebook.title}
                    </h4>

                    {/* Latest handwritten / typed note snippets preview */}
                    <div className="mt-4 font-mono text-sm text-[#1E3A8A] font-semibold space-y-1">
                      {recentSnippets.map((line, idx) => (
                        <div key={idx} className="italic truncate" title={line}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-400 mt-6">
                    Страница 1 из {recentNotebook.pages.length}
                  </div>
                </div>

                {/* Notebook Info & Open Button */}
                <div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    {recentNotebook.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatCardDate(recentNotebook.updatedAt)} · страниц 1 из {recentNotebook.pages.length}
                  </p>
                </div>

                <button
                  onClick={() => onOpenNotebook(recentNotebook.id)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-semibold bg-[#6355C7] hover:bg-[#5244B4] text-white shadow-sm transition-all cursor-pointer active:scale-99"
                >
                  Открыть тетрадь
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Info Bar */}
        <footer className={`mt-10 pt-4 border-t flex items-center justify-end text-[11px] text-neutral-400 ${
          isDark ? 'border-neutral-800' : 'border-[#EAEBF2]'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Все изменения сохранены</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
