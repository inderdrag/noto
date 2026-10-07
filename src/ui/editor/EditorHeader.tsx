import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Sun, Moon, Trash2, Check, ArrowLeft } from 'lucide-react';
import { NotoIcon } from '../NotoLogo';
import { Notebook, Page, GridType } from '../../types';

interface EditorHeaderProps {
  notebook: Notebook;
  currentPage: Page;
  currentPageIndex: number;
  totalPages: number;
  currentRulingName: string;
  isSheetFullscreen: boolean;
  theme: 'light' | 'dark';
  saveSuccessFeedback?: boolean;
  onBackToLibrary: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onClearPage?: () => void;
  onToggleSheetFullscreen: () => void;
  onToggleTheme: () => void;
  onOpenExportModal: () => void;
  onOpenRulingPopover: () => void;
  onOpenPaperColorPopover: () => void;
  onOpenCoverPopover: () => void;
  isEditingTitle: boolean;
  titleInput: string;
  onStartEditingTitle: () => void;
  onChangeTitleInput: (val: string) => void;
  onSubmitTitle: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  notebook,
  currentPage,
  currentPageIndex,
  totalPages,
  currentRulingName,
  isSheetFullscreen,
  theme,
  saveSuccessFeedback,
  onBackToLibrary,
  onPrevPage,
  onNextPage,
  onAddPage,
  onClearPage,
  onToggleSheetFullscreen,
  onToggleTheme,
  onOpenExportModal,
  onOpenRulingPopover,
  onOpenPaperColorPopover,
  onOpenCoverPopover,
  isEditingTitle,
  titleInput,
  onStartEditingTitle,
  onChangeTitleInput,
  onSubmitTitle,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="shrink-0 flex flex-col z-20 select-none">
      {/* Main Header Navbar */}
      <header className={`min-h-[48px] px-3 sm:px-8 pl-safe pr-safe flex items-center justify-between border-b gap-2 ${
        isDark ? 'bg-[#12131F] border-neutral-800' : 'bg-white border-[#EAEBF2]'
      }`}>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={onBackToLibrary}
            className={`px-2.5 sm:px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark 
                ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700' 
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-2xs'
            }`}
            title="В библиотеку"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">В библиотеку</span>
          </button>
          <div className={`w-px h-4 hidden sm:block ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={onBackToLibrary}>
            <NotoIcon size={20} color="#6355C7" />
            <span className="font-bold tracking-tight text-base sm:text-lg text-neutral-900 dark:text-white hidden xs:inline">
              Noto
            </span>
          </div>
        </div>

        {/* Center: Notebook Title & Saved badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onBlur={onSubmitTitle}
              onKeyDown={(e) => e.key === 'Enter' && onSubmitTitle()}
              onChange={(e) => onChangeTitleInput(e.target.value)}
              className="text-sm sm:text-base font-semibold border-b border-[#6355C7] bg-transparent outline-none text-center max-w-[140px] sm:max-w-xs"
            />
          ) : (
            <button
              onClick={onStartEditingTitle}
              className="text-sm sm:text-base font-semibold hover:underline text-neutral-900 dark:text-white cursor-pointer truncate max-w-[130px] sm:max-w-xs"
              title="Нажмите, чтобы переименовать"
            >
              {notebook.title}
            </button>
          )}
          <span className="text-[11px] sm:text-xs text-neutral-400 shrink-0">· {currentPageIndex + 1}/{totalPages}</span>
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            Сохранено
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onClearPage && (
            <button
              onClick={onClearPage}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                isDark
                  ? 'border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-800'
                  : 'border-neutral-200 text-neutral-500 hover:text-red-600 hover:bg-neutral-50 shadow-2xs'
              }`}
              title="Очистить страницу (можно отменить Ctrl+Z)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenExportModal}
            className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${
              isDark 
                ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700' 
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-2xs'
            }`}
          >
            Экспорт
          </button>
        </div>
      </header>

      {/* 3. Subheader Toolbar Strip */}
      <div className={`min-h-[38px] px-3 sm:px-8 pl-safe pr-safe flex items-center justify-between border-b text-xs overflow-x-auto ${
        isDark ? 'bg-[#151624] border-neutral-800' : 'bg-white border-[#EAEBF2]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
            <span>Страница {currentPageIndex + 1} / {totalPages}</span>
            <button
              onClick={onPrevPage}
              disabled={currentPageIndex <= 0}
              className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
              title="Предыдущая страница"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
              title="Следующая страница"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
