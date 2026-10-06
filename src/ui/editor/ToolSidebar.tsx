import React from 'react';
import { ChevronRight, ChevronLeft, Grid, FileText, AlignLeft, CircleDot, Check } from 'lucide-react';
import { ToolType, GridType, EraserMode } from '../../types';

interface ToolSidebarProps {
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  eraserMode?: EraserMode;
  eraserRadius?: number;
  currentRulingType?: GridType;
  currentRulingName: string;
  currentPaperColor?: string;
  currentGridSize?: number;
  isLandscape: boolean;
  isOpen: boolean;
  theme: 'light' | 'dark';
  onToggleOpen: () => void;
  onSetStrokeColor: (color: string) => void;
  onSetStrokeWidth: (width: number) => void;
  onSetStrokeOpacity: (opacity: number) => void;
  onSetEraserMode?: (mode: EraserMode) => void;
  onSetEraserRadius?: (radius: number) => void;
  onSetRulingType?: (type: GridType) => void;
  onSetPaperColor?: (color: string) => void;
  onSetGridSize?: (size: number) => void;
  onToggleOrientation: () => void;
}

export const ToolSidebar: React.FC<ToolSidebarProps> = ({
  activeTool,
  strokeColor,
  strokeWidth,
  strokeOpacity,
  eraserMode = 'partial',
  eraserRadius = 16,
  currentRulingType = 'grid',
  currentRulingName,
  currentPaperColor = '#FFFFFF',
  currentGridSize = 24,
  isLandscape,
  isOpen,
  theme,
  onToggleOpen,
  onSetStrokeColor,
  onSetStrokeWidth,
  onSetStrokeOpacity,
  onSetEraserMode,
  onSetEraserRadius,
  onSetRulingType,
  onSetPaperColor,
  onSetGridSize,
  onToggleOrientation,
}) => {
  const isDark = theme === 'dark';

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className={`absolute right-3 top-3 z-20 px-3 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
          isDark 
            ? 'bg-[#181928] border-neutral-700 text-neutral-300 hover:bg-neutral-800' 
            : 'bg-white border-[#E2E4EC] text-neutral-700 hover:bg-neutral-50 shadow-2xs'
        }`}
        title="Развернуть параметры инструмента"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Параметры</span>
      </button>
    );
  }

  const toolName = 
    activeTool === 'marker' ? 'Маркер' :
    activeTool === 'eraser' ? 'Ластик' :
    activeTool === 'text' ? 'Текст' :
    activeTool === 'select' ? 'Выделение' :
    activeTool === 'pan' ? 'Рука' :
    ['rect', 'circle', 'triangle', 'star', 'line', 'arrow'].includes(activeTool) ? 'Фигуры' :
    'Тонкое перо';

  const INK_PALETTE = [
    { color: '#1E1E24', title: 'Глубокий чёрный' },
    { color: '#4A5568', title: 'Графит' },
    { color: '#2B6CB0', title: 'Королевский синий' },
    { color: '#3182CE', title: 'Небесный' },
    { color: '#6355C7', title: 'Фирменный Noto' },
    { color: '#9F7AEA', title: 'Лаванда' },
    { color: '#E53E3E', title: 'Коралл' },
    { color: '#38A169', title: 'Мята' },
    { color: '#D69E2E', title: 'Янтарь' },
  ];

  const PAPER_PRESETS = [
    { color: '#FFFFFF', name: 'Белая' },
    { color: '#FDFBF7', name: 'Крем' },
    { color: '#12131C', name: 'Midnight' },
    { color: '#1E1F2A', name: 'Графит' },
  ];

  return (
    <aside className={`w-72 shrink-0 border-l flex flex-col justify-between p-4 select-none transition-all z-10 overflow-y-auto ${
      isDark ? 'bg-[#12131F] border-neutral-800' : 'bg-white border-[#EAEBF2]'
    }`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
            ПАРАМЕТРЫ ПЕРА
          </span>
          <button
            onClick={onToggleOpen}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-0.5 rounded"
            title="Скрыть панель"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {toolName}
          </h4>
        </div>

        {/* 1. Ink Color Swatches */}
        {activeTool !== 'eraser' && (
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 block mb-2">
              ОТТЕНКИ ЧЕРНИЛ
            </label>
            <div className="grid grid-cols-5 gap-2">
              {INK_PALETTE.map((swatch) => (
                <button
                  key={swatch.color}
                  onClick={() => onSetStrokeColor(swatch.color)}
                  style={{ backgroundColor: swatch.color }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative ${
                    strokeColor.toLowerCase() === swatch.color.toLowerCase()
                      ? 'ring-2 ring-offset-2 ring-[#6355C7] scale-110 shadow-xs'
                      : 'hover:scale-105 border border-black/10'
                  }`}
                  title={swatch.title}
                />
              ))}
              <label 
                className="w-7 h-7 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center cursor-pointer hover:border-[#6355C7] text-neutral-400 text-xs font-bold"
                title="Свой оттенок"
              >
                +
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => onSetStrokeColor(e.target.value)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* 2. Eraser Mode if active */}
        {activeTool === 'eraser' && onSetEraserMode && onSetEraserRadius && (
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-neutral-400 block">
              РЕЖИМ ЛАСТИКА
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onSetEraserMode('partial')}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                  eraserMode === 'partial'
                    ? 'bg-[#6355C7] text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                Часть штриха
              </button>
              <button
                onClick={() => onSetEraserMode('object')}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                  eraserMode === 'object'
                    ? 'bg-[#6355C7] text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                Объект целиком
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
                <span>Размер ластика</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300">{eraserRadius}px</span>
              </div>
              <input
                type="range"
                min="6"
                max="50"
                value={eraserRadius}
                onChange={(e) => onSetEraserRadius(parseInt(e.target.value, 10))}
                className="w-full accent-[#6355C7] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 3. Thickness Presets & Slider */}
        {activeTool !== 'eraser' && (
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span className="text-[11px] font-semibold">ТОЛЩИНА ШТРИХА</span>
              <span className="text-neutral-700 dark:text-neutral-300 font-mono text-xs font-bold">
                {strokeWidth} px
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mb-2.5">
              {[1, 2, 3, 5, 8, 12].map((sz) => (
                <button
                  key={sz}
                  onClick={() => onSetStrokeWidth(sz)}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    strokeWidth === sz
                      ? 'bg-[#6355C7] text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="30"
                value={strokeWidth}
                onChange={(e) => onSetStrokeWidth(parseInt(e.target.value, 10))}
                className="flex-1 accent-[#6355C7] cursor-pointer"
              />
              <span 
                className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center shrink-0 bg-neutral-50 dark:bg-neutral-800"
              >
                <span 
                  className="rounded-full shrink-0" 
                  style={{ 
                    width: Math.min(18, Math.max(2, strokeWidth)), 
                    height: Math.min(18, Math.max(2, strokeWidth)),
                    backgroundColor: strokeColor 
                  }} 
                />
              </span>
            </div>
          </div>
        )}

        {/* 4. Opacity Slider */}
        {activeTool !== 'eraser' && (
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span className="text-[11px] font-semibold">НЕПРОЗРАЧНОСТЬ</span>
              <span className="text-neutral-700 dark:text-neutral-300 font-mono text-xs font-bold">
                {Math.round(strokeOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={strokeOpacity}
              onChange={(e) => onSetStrokeOpacity(parseFloat(e.target.value))}
              className="w-full accent-[#6355C7] cursor-pointer"
            />
          </div>
        )}

        {/* 5. Sheet / Paper specs */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
          <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
            НАСТРОЙКИ ЛИСТА
          </div>

          {/* Ruling options */}
          {onSetRulingType && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'grid', label: 'Клетка', icon: Grid },
                  { id: 'ruled', label: 'Линейка', icon: AlignLeft },
                  { id: 'dots', label: 'Точки', icon: CircleDot },
                  { id: 'blank', label: 'Чистый', icon: FileText },
                ].map((r) => {
                  const Icon = r.icon;
                  const isSel = currentRulingType === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSetRulingType(r.id as GridType)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isSel
                          ? 'bg-[#EFEAFD] text-[#6355C7] dark:bg-[#28253B] dark:text-[#B3A6F6] font-semibold border border-[#6355C7]/30'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Slider for Grid / Line / Dot step size */}
              {currentRulingType !== 'blank' && onSetGridSize && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                    <span className="text-[11px] font-semibold">
                      {currentRulingType === 'grid' 
                        ? 'РАЗМЕР КЛЕТКИ' 
                        : currentRulingType === 'ruled' 
                        ? 'ИНТЕРВАЛ ЛИНЕЙКИ' 
                        : 'ШАГ ТОЧЕК'}
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-300 font-mono text-xs font-bold">
                      {currentGridSize || 28} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={currentRulingType === 'ruled' ? 20 : 16}
                    max={currentRulingType === 'ruled' ? 56 : 48}
                    step="2"
                    value={currentGridSize || 28}
                    onChange={(e) => onSetGridSize(parseInt(e.target.value, 10))}
                    className="w-full accent-[#6355C7] cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Paper color swatches */}
          {onSetPaperColor && (
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1.5">Цвет бумаги:</span>
              <div className="flex items-center gap-2">
                {PAPER_PRESETS.map((p) => {
                  const isSel = currentPaperColor.toLowerCase() === p.color.toLowerCase();
                  return (
                    <button
                      key={p.color}
                      onClick={() => onSetPaperColor(p.color)}
                      style={{ backgroundColor: p.color }}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer relative ${
                        isSel
                          ? 'ring-2 ring-[#6355C7] scale-110 shadow-xs border-transparent'
                          : 'border-neutral-300 dark:border-neutral-600 hover:scale-105'
                      }`}
                      title={p.name}
                    >
                      {isSel && <Check className="w-3 h-3 text-[#6355C7] mx-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orientation segmented selector */}
          <div className="pt-1">
            <span className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">ОРИЕНТАЦИЯ:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (isLandscape) onToggleOrientation();
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !isLandscape
                    ? 'bg-[#EFEAFD] text-[#6355C7] dark:bg-[#28253B] dark:text-[#B3A6F6] font-semibold border border-[#6355C7]/30 shadow-2xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <span>Книжная</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isLandscape) onToggleOrientation();
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isLandscape
                    ? 'bg-[#EFEAFD] text-[#6355C7] dark:bg-[#28253B] dark:text-[#B3A6F6] font-semibold border border-[#6355C7]/30 shadow-2xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <span>Альбомная</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
