import React, { useState } from 'react';
import { 
  Undo2, 
  Redo2, 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Minus, 
  ArrowRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { ToolType, EraserMode } from '../../types';

interface FloatingToolbarProps {
  activeTool: ToolType;
  showToolOptions: boolean;
  eraserMode: EraserMode;
  eraserRadius: number;
  historyIndex: number;
  historyLength: number;
  theme: 'light' | 'dark';
  onSelectTool: (tool: ToolType) => void;
  onToggleToolOptions: () => void;
  onSetEraserMode: (mode: EraserMode) => void;
  onSetEraserRadius: (radius: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImageClick: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  activeTool,
  showToolOptions,
  eraserMode,
  eraserRadius,
  historyIndex,
  historyLength,
  theme,
  onSelectTool,
  onToggleToolOptions,
  onSetEraserMode,
  onSetEraserRadius,
  onUndo,
  onRedo,
  onInsertImageClick,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDark = theme === 'dark';

  const tools: { id: ToolType; label: string }[] = [
    { id: 'pen', label: 'Перо' },
    { id: 'marker', label: 'Маркер' },
    { id: 'eraser', label: 'Ластик' },
    { id: 'rect', label: 'Фигуры' },
    { id: 'text', label: 'Текст' },
    { id: 'image', label: 'Изображение' },
    { id: 'select', label: 'Выделение' },
    { id: 'pan', label: 'Рука' },
  ];

  const isShapeTool = ['rect', 'circle', 'triangle', 'star', 'line', 'arrow'].includes(activeTool);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto transition-all duration-200 max-w-[calc(100vw-16px)]">
      {isCollapsed ? (
        /* Subtle, very pleasant expand button without text */
        <button
          onClick={() => setIsCollapsed(false)}
          className={`px-4 py-1.5 rounded-full border shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-[#161726] border-neutral-700/80 text-neutral-300 hover:text-white hover:bg-[#202237]'
              : 'bg-white border-[#E2E4EC] text-neutral-600 hover:text-[#6355C7] hover:bg-white shadow-sm'
          }`}
          title="Панель инструментов"
        >
          <ChevronDown className="w-4 h-4 text-[#6355C7] dark:text-[#A79AF3]" />
        </button>
      ) : (
        /* Main Pill Dock */
        <div className={`px-2 py-1.5 rounded-2xl border shadow-md flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-24px)] overflow-x-auto ${
          isDark ? 'bg-[#161726] border-neutral-800 text-neutral-200' : 'bg-white border-[#E8E9F2] text-neutral-700'
        }`}>
          {tools.map((t) => {
            const isActive = 
              activeTool === t.id || 
              (t.id === 'rect' && isShapeTool);

            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'image') {
                    onInsertImageClick();
                  } else {
                    onSelectTool(t.id);
                    if (t.id === 'rect' || t.id === 'eraser') {
                      onToggleToolOptions();
                    }
                  }
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#6355C7] text-white font-semibold shadow-xs'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {t.label}
              </button>
            );
          })}

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Undo & Redo buttons */}
          <button
            onClick={onUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white disabled:opacity-20 cursor-pointer"
            title="Отменить (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={historyIndex >= historyLength - 1}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white disabled:opacity-20 cursor-pointer"
            title="Повторить (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-neutral-700' : 'bg-neutral-200'}`} />

          {/* Discreet Collapse Button */}
          <button
            onClick={() => {
              setIsCollapsed(true);
              if (showToolOptions) onToggleToolOptions();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Свернуть панель"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-options for shapes & eraser (pop out below the dock) */}
      {!isCollapsed && showToolOptions && isShapeTool && (
        <div 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`mt-2 p-2 rounded-2xl border shadow-xl flex items-center gap-1.5 animate-in fade-in duration-100 ${
            isDark ? 'bg-[#181928] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-800'
          }`}
        >
          {[
            { id: 'line', icon: Minus, label: 'Линия' },
            { id: 'arrow', icon: ArrowRight, label: 'Стрелка' },
            { id: 'rect', icon: Square, label: 'Прямоугольник' },
            { id: 'circle', icon: Circle, label: 'Круг' },
            { id: 'triangle', icon: Triangle, label: 'Треугольник' },
            { id: 'star', icon: Star, label: 'Звезда' },
          ].map((s) => {
            const Icon = s.icon;
            const isSel = activeTool === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectTool(s.id as ToolType)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isSel
                    ? 'bg-[#6355C7] text-white shadow-xs'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
                title={s.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {!isCollapsed && showToolOptions && activeTool === 'eraser' && (
        <div 
          data-popover="true"
          onClick={(e) => e.stopPropagation()}
          className={`mt-2 p-2.5 rounded-2xl border shadow-xl flex items-center gap-3 text-xs animate-in fade-in duration-100 ${
            isDark ? 'bg-[#181928] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-800'
          }`}
        >
          <button
            onClick={() => onSetEraserMode('partial')}
            className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
              eraserMode === 'partial'
                ? 'bg-[#6355C7] text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Часть штриха
          </button>
          <button
            onClick={() => onSetEraserMode('object')}
            className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
              eraserMode === 'object'
                ? 'bg-[#6355C7] text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Объект целиком
          </button>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-neutral-400">Радиус:</span>
            <input
              type="range"
              min="8"
              max="40"
              value={eraserRadius}
              onChange={(e) => onSetEraserRadius(parseInt(e.target.value, 10))}
              className="w-16 accent-[#6355C7] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
