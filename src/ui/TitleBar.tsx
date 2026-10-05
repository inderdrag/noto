import React from 'react';
import { Minus, Square, X, Sun, Moon, Maximize2, Minimize2 } from 'lucide-react';

interface TitleBarProps {
  documentTitle?: string;
  isSaving?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCloseApp?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  documentTitle,
  isSaving = false,
  theme,
  onToggleTheme,
  onCloseApp,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`h-8 select-none border-b flex items-center justify-between px-3 text-[11px] z-50 transition-colors ${
      isDark 
        ? 'bg-[#0D0E14] border-neutral-800 text-neutral-400' 
        : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs'
    }`}>
      {/* Brand & Document Name */}
      <div className="flex items-center gap-2 font-medium">
        <span className={`font-bold tracking-tight flex items-center gap-1.5 ${
          isDark ? 'text-white' : 'text-neutral-900'
        }`}>
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          Noto
        </span>
        <span className={isDark ? 'text-neutral-700' : 'text-neutral-300'}>/</span>
        <span className={`truncate max-w-[240px] ${
          isDark ? 'text-neutral-400' : 'text-neutral-700 font-medium'
        }`}>
          {documentTitle || 'Digital Notebook'}
        </span>
      </div>

      {/* Center saving feedback */}
      <div className="text-[10px] flex items-center gap-1">
        {isSaving ? (
          <span className="text-blue-500 animate-pulse font-medium">Сохранение...</span>
        ) : (
          <span className={isDark ? 'text-neutral-500' : 'text-neutral-400'}>Сохранено</span>
        )}
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          className={`w-6 h-5 rounded flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' 
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-950'
          }`}
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-600" />}
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Оконный режим' : 'На весь экран'}
          className={`w-6 h-5 rounded flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' 
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-950'
          }`}
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>

        <div className={`w-px h-3 mx-1 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />

        <button
          title="Свернуть"
          className={`w-6 h-5 rounded flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200' 
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={toggleFullscreen}
          title="Развернуть"
          className={`w-6 h-5 rounded flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200' 
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Square className="w-2 h-2" />
        </button>
        <button
          onClick={onCloseApp}
          title="Закрыть"
          className="w-6 h-5 rounded flex items-center justify-center hover:bg-red-500 hover:text-white text-neutral-400 transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
