import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  FolderOpen, 
  Download, 
  Undo2, 
  Redo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  HelpCircle, 
  Info,
  Grid,
  Sparkles
} from 'lucide-react';
import { ToolType, GridType } from '../types';

interface MenuBarProps {
  theme?: 'light' | 'dark';
  onNewNotebook: () => void;
  onNewPage: () => void;
  onImportNoto: () => void;
  onExport: (format: 'noto' | 'pdf' | 'png' | 'jpeg') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearPage: () => void;
  onZoom: (delta: number) => void;
  onResetZoom: () => void;
  onSetPaperType?: (type: GridType) => void;
  onSelectTool?: (tool: ToolType) => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  isInEditor: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  theme = 'light',
  onNewNotebook,
  onNewPage,
  onImportNoto,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearPage,
  onZoom,
  onResetZoom,
  onSetPaperType,
  onOpenShortcuts,
  onOpenAbout,
  isInEditor,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (cb: () => void) => {
    cb();
    setOpenMenu(null);
  };

  const navClass = isDark
    ? 'bg-[#101117] border-neutral-800 text-neutral-300'
    : 'bg-white border-neutral-200 text-neutral-700 shadow-2xs';

  const btnClass = (menuName: string) => {
    const isActive = openMenu === menuName;
    if (isDark) {
      return `px-2 py-0.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors ${
        isActive ? 'bg-neutral-800 text-white font-medium' : ''
      }`;
    }
    return `px-2 py-0.5 rounded text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 transition-colors ${
      isActive ? 'bg-neutral-100 text-neutral-950 font-semibold' : ''
    }`;
  };

  const dropdownClass = isDark
    ? 'bg-[#181922] border-neutral-700 text-neutral-200 shadow-2xl'
    : 'bg-white border-neutral-200 text-neutral-800 shadow-xl';

  const itemHover = isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-50 text-neutral-800';

  return (
    <nav 
      ref={menuRef} 
      className={`h-7 border-b flex items-center px-3 text-[11px] select-none relative z-40 transition-colors ${navClass}`}
    >
      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
          className={btnClass('file')}
        >
          Файл
        </button>
        {openMenu === 'file' && (
          <div className={`absolute left-0 top-full mt-1 w-52 border rounded-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
            <button
              onClick={() => handleAction(onNewNotebook)}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-blue-500" /> Новая тетрадь</span>
              <span className="text-[10px] text-neutral-400">Ctrl+N</span>
            </button>

            {isInEditor && (
              <button
                onClick={() => handleAction(onNewPage)}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
              >
                <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-500" /> Новая страница</span>
                <span className="text-[10px] text-neutral-400">Ctrl+Shift+N</span>
              </button>
            )}

            <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />

            <button
              onClick={() => handleAction(onImportNoto)}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-blue-500" /> Импорт .noto</span>
              <span className="text-[10px] text-neutral-400">Ctrl+O</span>
            </button>

            {isInEditor && (
              <>
                <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />
                <button
                  onClick={() => handleAction(() => onExport('noto'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Экспорт .noto
                </button>
                <button
                  onClick={() => handleAction(() => onExport('pdf'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <Download className="w-3.5 h-3.5 text-red-500" /> Экспорт PDF
                </button>
                <button
                  onClick={() => handleAction(() => onExport('png'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" /> Экспорт PNG
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
          className={btnClass('edit')}
        >
          Правка
        </button>
        {openMenu === 'edit' && (
          <div className={`absolute left-0 top-full mt-1 w-48 border rounded-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
            <button
              disabled={!canUndo}
              onClick={() => handleAction(onUndo)}
              className={`w-full text-left px-3 py-1.5 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><Undo2 className="w-3.5 h-3.5" /> Отменить</span>
              <span className="text-[10px] text-neutral-400">Ctrl+Z</span>
            </button>
            <button
              disabled={!canRedo}
              onClick={() => handleAction(onRedo)}
              className={`w-full text-left px-3 py-1.5 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><Redo2 className="w-3.5 h-3.5" /> Повторить</span>
              <span className="text-[10px] text-neutral-400">Ctrl+Y</span>
            </button>
            {isInEditor && (
              <>
                <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />
                <button
                  onClick={() => handleAction(onClearPage)}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Очистить страницу
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* View Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
          className={btnClass('view')}
        >
          Вид
        </button>
        {openMenu === 'view' && (
          <div className={`absolute left-0 top-full mt-1 w-48 border rounded-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
            <button
              onClick={() => handleAction(() => onZoom(0.15))}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><ZoomIn className="w-3.5 h-3.5 text-blue-500" /> Приблизить</span>
              <span className="text-[10px] text-neutral-400">Ctrl +</span>
            </button>
            <button
              onClick={() => handleAction(() => onZoom(-0.15))}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><ZoomOut className="w-3.5 h-3.5 text-blue-500" /> Отдалить</span>
              <span className="text-[10px] text-neutral-400">Ctrl -</span>
            </button>
            <button
              onClick={() => handleAction(onResetZoom)}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${itemHover}`}
            >
              <span className="flex items-center gap-2"><Maximize className="w-3.5 h-3.5 text-blue-500" /> Масштаб 70% (По умолчанию)</span>
              <span className="text-[10px] text-neutral-400">Ctrl 0</span>
            </button>

            {isInEditor && onSetPaperType && (
              <>
                <div className={`my-1 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`} />
                <button
                  onClick={() => handleAction(() => onSetPaperType('grid'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <Grid className="w-3.5 h-3.5 text-blue-500" /> Клетка
                </button>
                <button
                  onClick={() => handleAction(() => onSetPaperType('ruled'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> Линейка
                </button>
                <button
                  onClick={() => handleAction(() => onSetPaperType('dots'))}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Точки
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
          className={btnClass('help')}
        >
          Справка
        </button>
        {openMenu === 'help' && (
          <div className={`absolute left-0 top-full mt-1 w-48 border rounded-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
            <button
              onClick={() => handleAction(onOpenShortcuts)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-neutral-400" /> Горячие клавиши
            </button>
            <button
              onClick={() => handleAction(onOpenAbout)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${itemHover}`}
            >
              <Info className="w-3.5 h-3.5 text-neutral-400" /> О программе Noto
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
