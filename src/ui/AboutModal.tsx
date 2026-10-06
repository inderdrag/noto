import React from 'react';
import { X, Monitor, Smartphone, Cpu, HardDrive, Cloud } from 'lucide-react';
import { NotoIcon } from './NotoLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <NotoIcon size={32} />
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
                Noto — Your digital notebook
              </h3>
              <p className="text-[11px] text-neutral-400">
                Версия 1.0.0 (Standalone Desktop & Mobile Core)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed overflow-y-auto max-h-[70vh] pr-1">
          <p className="text-neutral-500 dark:text-neutral-400">
            Noto спроектирован как минималистичный автономный инструмент для конспектов, чертежей и формул. Пространство избавлено от визуального шума, а рабочий лист является главным элементом.
          </p>

          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white mb-0.5">
                <Monitor className="w-3.5 h-3.5 text-neutral-500" />
                <span>Windows Desktop (`Noto.exe`)</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Сборка через легковесный нативный рантайм Tauri v2 (~15 МБ вместо 150 МБ у Electron), интеграция в меню «Пуск» и быстрый старт.
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white mb-0.5">
                <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                <span>Android & iOS</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Прямая поддержка аппаратных стилусов S-Pen и Apple Pencil (W3C PointerEvents Level 3 с нажимом `pressure` и отсечением ладони).
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white mb-0.5">
                <Cpu className="w-3.5 h-3.5 text-neutral-500" />
                <span>Векторный Drawing Engine</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Сглаживание сплайнами Катмулла-Рома, частичное стирание резкой штрихов на лету, поддержка формул и фигур.
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white mb-0.5">
                <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
                <span>Формат .noto & Автономность</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Полная независимость от интернета. Хранение в IndexedDB и переносимый векторный формат <code>.noto</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
