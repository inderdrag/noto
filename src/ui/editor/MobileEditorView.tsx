import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Undo2, 
  Redo2, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Pen, 
  Eraser, 
  Type, 
  Hand, 
  MoreHorizontal, 
  X, 
  Check, 
  Highlighter, 
  Square, 
  Circle as CircleIcon, 
  Triangle, 
  Star, 
  Minus, 
  ArrowRight, 
  Image as ImageIcon, 
  MousePointer, 
  Trash2, 
  Share2,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';
import { Notebook, Page, ToolType, EraserMode, GridType, TextObject } from '../../types';

interface MobileEditorViewProps {
  notebook: Notebook;
  currentPage: Page;
  currentPageIndex: number;
  totalPages: number;
  activePages: Page[];
  theme: 'light' | 'dark';
  currentRulingName: string;
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  eraserMode: EraserMode;
  eraserRadius: number;
  historyIndex: number;
  historyLength: number;
  scale: number;
  isLandscapeScreen: boolean;
  editingText: {
    id?: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
  } | null;
  onBackToLibrary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onSelectPage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onSelectTool: (tool: ToolType) => void;
  onSetStrokeColor: (color: string) => void;
  onSetStrokeWidth: (width: number) => void;
  onSetStrokeOpacity: (opacity: number) => void;
  onSetEraserMode: (mode: EraserMode) => void;
  onSetEraserRadius: (radius: number) => void;
  onSetRulingType: (type: GridType) => void;
  onSetPaperColor: (color: string) => void;
  onSetGridSize: (size: number) => void;
  onTogglePageOrientation: () => void;
  onClearPage: () => void;
  onOpenExportModal: () => void;
  onInsertImageClick: () => void;
  onFinishEditingText: () => void;
  onChangeEditingText: (updates: Partial<{ text: string; fontSize: number; color: string; bold: boolean; italic: boolean }>) => void;
  onToggleFitToWidth: () => void;
}

export const MobileEditorView: React.FC<MobileEditorViewProps> = ({
  notebook,
  currentPage,
  currentPageIndex,
  totalPages,
  activePages,
  theme,
  currentRulingName,
  activeTool,
  strokeColor,
  strokeWidth,
  strokeOpacity,
  eraserMode,
  eraserRadius,
  historyIndex,
  historyLength,
  scale,
  isLandscapeScreen,
  editingText,
  onBackToLibrary,
  onUndo,
  onRedo,
  onPrevPage,
  onNextPage,
  onAddPage,
  onSelectPage,
  onDeletePage,
  onSelectTool,
  onSetStrokeColor,
  onSetStrokeWidth,
  onSetStrokeOpacity,
  onSetEraserMode,
  onSetEraserRadius,
  onSetRulingType,
  onSetPaperColor,
  onSetGridSize,
  onTogglePageOrientation,
  onClearPage,
  onOpenExportModal,
  onInsertImageClick,
  onFinishEditingText,
  onChangeEditingText,
  onToggleFitToWidth,
}) => {
  const isDark = theme === 'dark';

  // Panels & Modals State
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsTab, setOptionsTab] = useState<'tool' | 'page'>('tool');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPagesDrawerOpen, setIsPagesDrawerOpen] = useState(false);

  // Palettes
  const QUICK_PALETTE = [
    '#1E3A8A', // Deep blue
    '#2B2D42', // Dark graphite
    '#A05240', // Terracotta
    '#6B8E23', // Olive green
    '#6355C7', // Signature purple
    '#DC2626', // Red
    '#16A34A', // Green
    '#D97706', // Amber
  ];

  const PAPER_PRESETS = [
    { color: '#FFFFFF', name: 'Белая' },
    { color: '#FDFBF7', name: 'Крем' },
    { color: '#12131C', name: 'Midnight' },
    { color: '#1E1F2A', name: 'Графит' },
  ];

  const RULINGS: { id: GridType; name: string }[] = [
    { id: 'grid', name: 'Клетка' },
    { id: 'ruled', name: 'Линейка' },
    { id: 'dots', name: 'Точки' },
    { id: 'blank', name: 'Чистый' },
  ];

  // Tool label & thickness display
  const toolDisplayName =
    activeTool === 'pen' ? 'Перо' :
    activeTool === 'marker' ? 'Маркер' :
    activeTool === 'eraser' ? 'Ластик' :
    activeTool === 'text' ? 'Текст' :
    activeTool === 'pan' ? 'Рука' :
    activeTool === 'select' ? 'Выделение' :
    'Фигура';

  const strokeMm = (strokeWidth * 0.25).toFixed(1).replace('.', ',');

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-30 select-none overflow-hidden">
      {/* 1. TOP HEADER BAR */}
      <div className="pt-safe px-3 sm:px-4 pt-3 flex flex-col gap-2">
        <header className="flex items-center justify-between w-full pointer-events-auto">
          {/* Back button + Notebook Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBackToLibrary}
              className={`w-10 h-10 rounded-full border shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-[#181928] border-neutral-700 text-neutral-200 hover:bg-neutral-800' 
                  : 'bg-white border-[#E2E4EC] text-neutral-800 hover:bg-neutral-50 shadow-2xs'
              }`}
              title="В библиотеку"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate max-w-[150px] sm:max-w-xs leading-tight">
                {notebook.title}
              </span>
              <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 truncate leading-tight">
                {editingText ? (
                  'Текст · черновик'
                ) : isLandscapeScreen ? (
                  `✓ Сохранено · страница ${currentPageIndex + 1} из ${totalPages}`
                ) : (
                  '✓ Сохранено'
                )}
              </span>
            </div>
          </div>

          {/* Right Info in Landscape + Undo / Redo buttons */}
          <div className="flex items-center gap-2">
            {isLandscapeScreen && !editingText && (
              <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mr-2 hidden sm:inline">
                {currentRulingName} · {currentPage.background.type === 'grid' ? '5 мм' : 'лист'}
              </span>
            )}

            <button
              onClick={onUndo}
              disabled={historyIndex <= 0}
              className={`w-10 h-10 rounded-full border shadow-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-30 ${
                isDark 
                  ? 'bg-[#181928] border-neutral-700 text-neutral-200' 
                  : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
              }`}
              title="Отменить (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={onRedo}
              disabled={historyIndex >= historyLength - 1}
              className={`w-10 h-10 rounded-full border shadow-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-30 ${
                isDark 
                  ? 'bg-[#181928] border-neutral-700 text-neutral-200' 
                  : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
              }`}
              title="Повторить (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. SUBHEADER: Page Navigator Strip (Only in Portrait or when space permits) */}
        {!editingText && !isLandscapeScreen && (
          <div className="flex items-center justify-between w-full pointer-events-auto mt-1">
            {/* Page switcher pill: [田] 1 из 2 [>] */}
            <div className={`rounded-2xl border shadow-xs px-3 py-1.5 flex items-center gap-2 text-xs font-semibold ${
              isDark ? 'bg-[#181928] border-neutral-700 text-neutral-200' : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
            }`}>
              <button
                onClick={() => setIsPagesDrawerOpen(true)}
                className="hover:text-[#6355C7] transition-colors cursor-pointer flex items-center"
                title="Все страницы"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              
              <button 
                onClick={onPrevPage} 
                disabled={currentPageIndex <= 0}
                className="disabled:opacity-20 hover:text-[#6355C7] transition-colors cursor-pointer"
                title="Предыдущая"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-xs">
                {currentPageIndex + 1} из {totalPages}
              </span>

              <button
                onClick={onNextPage}
                disabled={currentPageIndex >= totalPages - 1}
                className="disabled:opacity-20 hover:text-[#6355C7] transition-colors cursor-pointer"
                title="Следующая страница"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Center zoom info */}
            <button
              onClick={onToggleFitToWidth}
              className="text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-[#6355C7] transition-colors cursor-pointer"
              title="Нажмите, чтобы вписать по ширине"
            >
              Верх листа · {Math.round(scale * 100)}%
            </button>

            {/* Add Page + */}
            <button
              onClick={onAddPage}
              className={`w-9 h-9 rounded-2xl border shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-[#181928] border-neutral-700 text-neutral-200' 
                  : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
              }`}
              title="Добавить страницу"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. LANDSCAPE BOTTOM-LEFT PAGE CONTROLS (shown on landscape) */}
      {!editingText && isLandscapeScreen && (
        <div className="absolute bottom-4 left-4 z-30 pointer-events-auto flex items-center gap-3">
          <div className={`rounded-2xl border shadow-xs px-3 py-1.5 flex items-center gap-2 text-xs font-semibold ${
            isDark ? 'bg-[#181928] border-neutral-700 text-neutral-200' : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
          }`}>
            <button
              onClick={() => setIsPagesDrawerOpen(true)}
              className="hover:text-[#6355C7] transition-colors cursor-pointer flex items-center"
              title="Все страницы"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs">
              {currentPageIndex + 1} из {totalPages}
            </span>

            <button
              onClick={onNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              className="disabled:opacity-20 hover:text-[#6355C7] transition-colors cursor-pointer"
              title="Следующая страница"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onToggleFitToWidth}
            className="text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-[#6355C7] transition-colors cursor-pointer"
          >
            Верх листа · {Math.round(scale * 100)}%
          </button>

          <button
            onClick={onAddPage}
            className={`w-9 h-9 rounded-2xl border shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
              isDark 
                ? 'bg-[#181928] border-neutral-700 text-neutral-200' 
                : 'bg-white border-[#E2E4EC] text-neutral-800 shadow-2xs'
            }`}
            title="Добавить страницу"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. TEXT EDITING FLOATING BAR (When typing text on mobile) */}
      {editingText && (
        <div className="pb-safe px-3 mb-3 pointer-events-auto flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-2 flex items-center justify-between gap-2 ${
            isDark ? 'bg-[#181928] border-neutral-700 text-white' : 'bg-white border-[#E2E4EC] text-neutral-900'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-[#2A234B] text-[#6355C7] dark:text-[#A79AF3] flex items-center justify-center font-bold">
                <Type className="w-4 h-4" />
              </div>
              
              {/* Font Size picker */}
              <select
                value={editingText.fontSize}
                onChange={(e) => onChangeEditingText({ fontSize: Number(e.target.value) })}
                className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border cursor-pointer ${
                  isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                }`}
              >
                {[12, 14, 16, 18, 20, 24, 30, 36].map((s) => (
                  <option key={s} value={s}>{s} пт</option>
                ))}
              </select>

              {/* Bold toggle */}
              <button
                onClick={() => onChangeEditingText({ bold: !editingText.bold })}
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  editingText.bold
                    ? 'bg-[#6355C7] text-white'
                    : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Жирный шрифт"
              >
                B
              </button>

              {/* Color dot picker */}
              <button
                onClick={() => {
                  const colors = ['#1E1E24', '#2563EB', '#6355C7', '#DC2626', '#16A34A'];
                  const curIdx = colors.indexOf(editingText.color);
                  const nextColor = colors[(curIdx + 1) % colors.length];
                  onChangeEditingText({ color: nextColor });
                }}
                className="w-7 h-7 rounded-full border-2 border-white shadow-xs cursor-pointer transition-transform active:scale-95"
                style={{ backgroundColor: editingText.color }}
                title="Сменить цвет текста"
              />
            </div>

            {/* Done button */}
            <button
              onClick={onFinishEditingText}
              className="px-4 py-1.5 rounded-xl bg-[#6355C7] hover:bg-[#5244B4] text-white text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Готово</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN DRAWING DOCK (Normal Mode) */}
      {!editingText && !isOptionsOpen && (
        <div className={`pb-safe pointer-events-auto ${
          isLandscapeScreen 
            ? 'absolute right-4 top-1/2 -translate-y-1/2' 
            : 'px-4 mb-3 w-full flex flex-col items-center'
        }`}>
          {/* Quick status strip above dock (Portrait only) */}
          {!isLandscapeScreen && (
            <div className="w-full flex items-center justify-between px-2 mb-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                  style={{ backgroundColor: strokeColor }} 
                />
                <span>{toolDisplayName} · {strokeMm} мм</span>
              </div>
              <span>Рука — двигать лист</span>
            </div>
          )}

          {/* The Dock Card */}
          <div className={`rounded-3xl border shadow-xl p-1.5 transition-all ${
            isDark ? 'bg-[#181928] border-neutral-700/80 text-white' : 'bg-white border-[#E2E4EC] text-neutral-800'
          } ${
            isLandscapeScreen ? 'flex flex-col gap-1.5 w-16 items-center py-2' : 'w-full max-w-sm flex items-center justify-between'
          }`}>
            {/* 1. Перо */}
            <button
              onClick={() => {
                if (activeTool === 'pen' || activeTool === 'marker') {
                  setIsOptionsOpen(true);
                  setOptionsTab('tool');
                } else {
                  onSelectTool('pen');
                }
              }}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isLandscapeScreen ? 'w-13 h-13' : 'flex-1 py-2'
              } ${
                activeTool === 'pen' || activeTool === 'marker'
                  ? 'bg-[#6355C7] text-white font-bold shadow-sm'
                  : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Перо (нажмите для параметров)"
            >
              <Pen className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Перо</span>
            </button>

            {/* 2. Ластик */}
            <button
              onClick={() => {
                if (activeTool === 'eraser') {
                  onSetEraserMode(eraserMode === 'object' ? 'partial' : 'object');
                } else {
                  onSelectTool('eraser');
                }
              }}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isLandscapeScreen ? 'w-13 h-13' : 'flex-1 py-2'
              } ${
                activeTool === 'eraser'
                  ? 'bg-[#6355C7] text-white font-bold shadow-sm'
                  : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Ластик"
            >
              <Eraser className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Ластик</span>
            </button>

            {/* 3. Текст */}
            <button
              onClick={() => onSelectTool('text')}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isLandscapeScreen ? 'w-13 h-13' : 'flex-1 py-2'
              } ${
                activeTool === 'text'
                  ? 'bg-[#6355C7] text-white font-bold shadow-sm'
                  : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Текст"
            >
              <Type className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Текст</span>
            </button>

            {/* 4. Рука */}
            <button
              onClick={() => onSelectTool('pan')}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isLandscapeScreen ? 'w-13 h-13' : 'flex-1 py-2'
              } ${
                activeTool === 'pan'
                  ? 'bg-[#6355C7] text-white font-bold shadow-sm'
                  : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Рука (перемещение листа)"
            >
              <Hand className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Рука</span>
            </button>

            {/* 5. Ещё / Выбор */}
            <button
              onClick={() => setIsMoreMenuOpen(true)}
              className={`flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isLandscapeScreen ? 'w-13 h-13' : 'flex-1 py-2'
              } ${
                ['rect', 'circle', 'triangle', 'star', 'line', 'arrow', 'select'].includes(activeTool)
                  ? 'bg-[#6355C7] text-white font-bold shadow-sm'
                  : isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title={activeTool === 'select' ? 'Выделение активно' : 'Ещё инструменты'}
            >
              {activeTool === 'select' ? (
                <>
                  <MousePointer className="w-4 h-4 mb-0.5 text-white" />
                  <span className="text-[10px] leading-tight font-bold text-white">Выбор</span>
                </>
              ) : (
                <>
                  <MoreHorizontal className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] leading-tight">Ещё</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 6. TOOLS & SHEET OPTIONS SHEET / CARD (Matching Images 1 & 2) */}
      {isOptionsOpen && (
        <div className={`pb-safe pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200 ${
          isLandscapeScreen 
            ? 'absolute right-4 top-16 bottom-4 w-80' 
            : 'px-3 mb-2 w-full flex justify-center'
        }`}>
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-4 flex flex-col gap-3.5 ${
            isDark ? 'bg-[#181928] border-neutral-700 text-white' : 'bg-white border-[#E2E4EC] text-neutral-900'
          }`}>
            {/* Header Tabs: [ Перо ] [ Лист ] and [ ✕ ] */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <button
                  onClick={() => setOptionsTab('tool')}
                  className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    optionsTab === 'tool'
                      ? 'bg-[#EDE9FE] dark:bg-[#252238] text-[#6355C7] dark:text-[#A79AF3] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Перо
                </button>
                <button
                  onClick={() => setOptionsTab('page')}
                  className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    optionsTab === 'page'
                      ? 'bg-[#EDE9FE] dark:bg-[#252238] text-[#6355C7] dark:text-[#A79AF3] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Лист
                </button>
              </div>

              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT: ПЕРО */}
            {optionsTab === 'tool' && (
              <div className="space-y-3">
                {/* Pen / Marker selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectTool('pen');
                      onSetStrokeOpacity(1.0);
                    }}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      activeTool === 'pen'
                        ? 'border-2 border-[#6355C7] bg-[#F7F6FC] dark:bg-[#201C38] text-[#6355C7] dark:text-[#A79AF3]'
                        : isDark ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <Pen className="w-3.5 h-3.5" />
                    <span>Перо</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('marker');
                      onSetStrokeOpacity(0.35);
                    }}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      activeTool === 'marker'
                        ? 'border-2 border-[#6355C7] bg-[#F7F6FC] dark:bg-[#201C38] text-[#6355C7] dark:text-[#A79AF3]'
                        : isDark ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <Highlighter className="w-3.5 h-3.5" />
                    <span>Маркер</span>
                  </button>
                </div>

                {/* Color swatches */}
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                    Цвет
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {QUICK_PALETTE.map((c) => {
                      const isSelected = strokeColor.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          onClick={() => onSetStrokeColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                            isSelected ? 'ring-2 ring-offset-2 ring-[#6355C7]' : ''
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thickness Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-400">Толщина</span>
                    <span className="text-[#6355C7] dark:text-[#A79AF3]">{strokeMm} мм</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={strokeWidth}
                    onChange={(e) => onSetStrokeWidth(Number(e.target.value))}
                    className="w-full accent-[#6355C7] cursor-pointer"
                  />
                </div>

                {/* Wavy line preview */}
                <div className={`rounded-2xl p-2.5 flex items-center justify-between border ${
                  isDark ? 'bg-neutral-800/60 border-neutral-700' : 'bg-[#F9F8FD] border-[#ECEAF5]'
                }`}>
                  <svg className="h-6 w-3/4 overflow-visible" viewBox="0 0 200 30">
                    <path
                      d="M 10 20 Q 50 0, 90 20 T 170 20"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={Math.min(10, Math.max(1.5, strokeWidth * 0.7))}
                      strokeLinecap="round"
                      strokeOpacity={strokeOpacity}
                    />
                  </svg>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {Math.round(strokeOpacity * 100)}%
                  </span>
                </div>

                {/* More options link */}
                <button
                  onClick={() => {
                    setIsOptionsOpen(false);
                    setIsMoreMenuOpen(true);
                  }}
                  className="w-full flex items-center justify-between py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#6355C7] transition-colors cursor-pointer"
                >
                  <span>Ещё: фигуры, изображение, выделение</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>

                {/* Sheet link hint */}
                <button
                  onClick={() => setOptionsTab('page')}
                  className="w-full text-left text-[11px] text-neutral-400 hover:underline pt-1 border-t border-neutral-100 dark:border-neutral-800 cursor-pointer"
                >
                  Лист: клетка, линейка, без линий и цвет бумаги
                </button>
              </div>
            )}

            {/* TAB CONTENT: ЛИСТ */}
            {optionsTab === 'page' && (
              <div className="space-y-3">
                {/* Ruling selector */}
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                    Разлиновка страницы
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {RULINGS.map((r) => {
                      const isSel = currentPage.background.type === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => onSetRulingType(r.id)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                            isSel
                              ? 'border-2 border-[#6355C7] bg-[#F7F6FC] dark:bg-[#201C38] text-[#6355C7] dark:text-[#A79AF3]'
                              : isDark ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-700'
                          }`}
                        >
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Paper color presets */}
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                    Цвет листа
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {PAPER_PRESETS.map((p) => {
                      const isSel = currentPage.background.color.toLowerCase() === p.color.toLowerCase();
                      return (
                        <button
                          key={p.color}
                          onClick={() => onSetPaperColor(p.color)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSel
                              ? 'border-2 border-[#6355C7] shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <span 
                            className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-600" 
                            style={{ backgroundColor: p.color }} 
                          />
                          <span className="text-neutral-700 dark:text-neutral-300 text-[10px]">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orientation & Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={onTogglePageOrientation}
                    className="flex-1 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Повернуть лист</span>
                  </button>

                  <button
                    onClick={onClearPage}
                    className="py-1.5 px-3 rounded-xl border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Очистить страницу"
                  >
                    Очистить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MORE TOOLS MODAL (Фигуры, Изображение, Выделение, Экспорт) */}
      {isMoreMenuOpen && (
        <div 
          onClick={() => setIsMoreMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-50 pointer-events-auto flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl border shadow-2xl p-4 flex flex-col gap-3 ${
              isDark ? 'bg-[#181928] border-neutral-700 text-white' : 'bg-white border-[#E2E4EC] text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Инструменты и функции
              </span>
              <button 
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shape tools grid */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">Геометрические фигуры</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rect', label: 'Прямоугольник', icon: Square },
                  { id: 'circle', label: 'Круг', icon: CircleIcon },
                  { id: 'triangle', label: 'Треугольник', icon: Triangle },
                  { id: 'star', label: 'Звезда', icon: Star },
                  { id: 'line', label: 'Линия', icon: Minus },
                  { id: 'arrow', label: 'Стрелка', icon: ArrowRight },
                ].map((s) => {
                  const Icon = s.icon;
                  const isSel = activeTool === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSelectTool(s.id as ToolType);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`py-2 px-1 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSel
                          ? 'border-2 border-[#6355C7] bg-[#EDE9FE] text-[#6355C7] font-bold'
                          : isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate max-w-full">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Image, Selection, Export, Ruling */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onInsertImageClick();
                }}
                className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-[#6355C7]" />
                <span>Фото</span>
              </button>

              <button
                onClick={() => {
                  onSelectTool('select');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                  activeTool === 'select'
                    ? 'border-[#6355C7] bg-[#EDE9FE] text-[#6355C7]'
                    : isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <MousePointer className="w-4 h-4 text-[#6355C7]" />
                <span>Выделение</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenExportModal();
                }}
                className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <Share2 className="w-4 h-4 text-emerald-500" />
                <span>Экспорт</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsOptionsOpen(true);
                  setOptionsTab('page');
                }}
                className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <span>Лист</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. PAGES DRAWER MODAL (When tapping [田] 1 из 2) */}
      {isPagesDrawerOpen && (
        <div
          onClick={() => setIsPagesDrawerOpen(false)}
          className="fixed inset-0 bg-black/50 z-50 pointer-events-auto flex justify-start animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-72 max-w-[85vw] h-full p-4 flex flex-col justify-between border-r shadow-2xl ${
              isDark ? 'bg-[#12131F] border-neutral-800 text-white' : 'bg-white border-[#E2E4EC] text-neutral-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Страницы ({activePages.length})
                </span>
                <button
                  onClick={() => setIsPagesDrawerOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List of page cards */}
              <div className="space-y-2.5 max-h-[calc(100vh-170px)] overflow-y-auto pr-1">
                {activePages.map((pg, idx) => {
                  const isCur = pg.id === currentPage.id;
                  return (
                    <div
                      key={pg.id}
                      onClick={() => {
                        onSelectPage(pg.id);
                        setIsPagesDrawerOpen(false);
                      }}
                      className={`p-2 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCur
                          ? 'border-2 border-[#6355C7] bg-[#F7F6FC] dark:bg-[#201C38]'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-12 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400 shadow-2xs">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                            {pg.title || `Страница ${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {pg.background.type === 'grid' ? 'В клетку' : pg.background.type === 'ruled' ? 'В линейку' : 'Чистый'}
                          </span>
                        </div>
                      </div>

                      {activePages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(pg.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          title="Удалить страницу"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add page button */}
            <button
              onClick={() => {
                onAddPage();
                setIsPagesDrawerOpen(false);
              }}
              className="w-full py-2.5 rounded-2xl bg-[#6355C7] hover:bg-[#5244B4] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer mt-3"
            >
              <Plus className="w-4 h-4" />
              <span>Новая страница</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
