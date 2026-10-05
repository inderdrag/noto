import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1', action: 'Ручка (Pen)' },
    { key: '2', action: 'Карандаш (Pencil)' },
    { key: '3', action: 'Маркер (Highlighter)' },
    { key: '4', action: 'Ластик (Eraser)' },
    { key: '5', action: 'Фигуры (Shapes)' },
    { key: 'T', action: 'Текст (Text)' },
    { key: 'V', action: 'Выделение (Select)' },
    { key: 'H', action: 'Перемещение (Pan)' },
    { key: 'Space + Drag', action: 'Панорамирование по холсту' },
    { key: 'Ctrl + Колесо', action: 'Масштабирование (Zoom)' },
    { key: 'Ctrl + Z', action: 'Отменить действие' },
    { key: 'Ctrl + Y', action: 'Повторить действие' },
    { key: 'Ctrl + V', action: 'Вставка картинки/скриншота' },
    { key: 'Delete', action: 'Удалить выделенное' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800 mb-3">
          <div className="flex items-center gap-2 font-medium text-xs text-neutral-900 dark:text-white">
            <Command className="w-3.5 h-3.5 text-neutral-500" />
            <span>Горячие клавиши</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <span className="text-neutral-600 dark:text-neutral-400">{s.action}</span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 rounded text-neutral-700 dark:text-neutral-300">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 mt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
