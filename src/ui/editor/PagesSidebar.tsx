import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Notebook, Page } from '../../types';

interface PagesSidebarProps {
  notebook: Notebook;
  currentPageId: string;
  isOpen: boolean;
  theme: 'light' | 'dark';
  onToggleOpen: () => void;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
}

export const PagesSidebar: React.FC<PagesSidebarProps> = ({
  notebook,
  currentPageId,
  isOpen,
  theme,
  onToggleOpen,
  onSelectPage,
  onAddPage,
  onDeletePage,
}) => {
  const isDark = theme === 'dark';
  const activePages = notebook.pages.filter((p) => !p.deleted);

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className={`absolute left-3 top-4 z-20 p-1.5 rounded-full border shadow-sm transition-colors cursor-pointer ${
          isDark 
            ? 'bg-[#181928] border-neutral-700 text-neutral-300 hover:bg-neutral-800' 
            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-2xs'
        }`}
        title="Показать страницы"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className={`w-44 shrink-0 border-r flex flex-col justify-between p-3 select-none transition-all z-10 ${
      isDark ? 'bg-[#12131F] border-neutral-800' : 'bg-white border-[#EAEBF2]'
    }`}>
      <div>
        <div className="flex items-center justify-between pb-2 mb-2">
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
            Страницы ({activePages.length})
          </span>
          <button
            onClick={onToggleOpen}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-0.5 rounded"
            title="Скрыть панель"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable list of pages */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
          {activePages.map((p, idx) => {
            const isCur = p.id === currentPageId;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPage(p.id)}
                className={`rounded-xl p-2 cursor-pointer transition-all relative group ${
                  isCur
                    ? 'border-2 border-[#6355C7] bg-[#F7F6FC] dark:bg-neutral-800/60 shadow-xs'
                    : 'border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 bg-white dark:bg-neutral-900'
                }`}
              >
                {/* Mini paper canvas preview */}
                <div 
                  className="h-28 rounded-lg border border-neutral-100 dark:border-neutral-800 p-2 flex flex-col justify-between overflow-hidden relative bg-white shadow-2xs"
                >
                  <div className="text-[10px] font-bold text-[#1E3A8A] truncate">
                    {p.title || `Страница ${idx + 1}`}
                  </div>
                  <div className="space-y-1.5 opacity-25">
                    <div className="h-0.5 bg-neutral-400 w-3/4 rounded-full" />
                    <div className="h-0.5 bg-neutral-400 w-1/2 rounded-full" />
                    <div className="h-0.5 bg-neutral-400 w-2/3 rounded-full" />
                  </div>
                  {idx === 0 && (
                    <svg className="w-12 h-6 text-[#1E3A8A] opacity-60 ml-auto" viewBox="0 0 50 30" fill="none">
                      <path d="M5 5 Q 25 35, 45 5" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600 dark:text-neutral-300 mt-1.5 px-0.5">
                  <span className="truncate">Страница {idx + 1}</span>
                  {activePages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:text-red-700 transition-opacity"
                      title="Удалить страницу"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onAddPage}
        className={`w-full py-2 rounded-xl text-xs font-medium border text-center transition-colors cursor-pointer mt-3 flex items-center justify-center gap-1.5 ${
          isDark
            ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-2xs'
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Страница</span>
      </button>
    </aside>
  );
};
