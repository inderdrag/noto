/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TitleBar } from './ui/TitleBar';
import { MenuBar } from './ui/MenuBar';
import { LibraryView } from './ui/LibraryView';
import { EditorWorkspace } from './ui/EditorWorkspace';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { AboutModal } from './ui/AboutModal';
import { 
  Notebook, 
  Folder, 
  AppSettings, 
  GridType, 
  ToolType 
} from './types';
import { 
  dbGetAllNotebooks, 
  dbSaveNotebook, 
  dbDeleteNotebook, 
  dbGetFolders, 
  dbSaveFolders, 
  dbGetSettings, 
  dbSaveSettings,
  DEFAULT_SETTINGS,
  DEFAULT_PAGE_BACKGROUND
} from './storage/db';
import { importNotoFile, exportToNotoFile, exportNotebookToPdf, exportPageAsImage } from './export/exporter';

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Autosave timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toast notifier
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [loadedNbs, loadedFolders, loadedSettings] = await Promise.all([
          dbGetAllNotebooks(),
          dbGetFolders(),
          dbGetSettings(),
        ]);
        setNotebooks(loadedNbs);
        setFolders(loadedFolders);
        setSettings(loadedSettings);

        const hasSeenWelcome = localStorage.getItem('noto_seen_welcome');
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Sync theme with document class and data-theme attribute
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [settings.theme]);

  // Toggle theme
  const handleToggleTheme = () => {
    const nextTheme: 'light' | 'dark' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    dbSaveSettings(updated);
  };

  // Active notebook
  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId) || null;

  // Handle notebook updates with autosave feedback
  const handleUpdateNotebook = useCallback((updated: Notebook) => {
    setIsSaving(true);
    setNotebooks((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await dbSaveNotebook(updated);
      setIsSaving(false);
    }, 600);
  }, []);

  // Quick create notebook (Instant 1-click creation directly into full-screen editor)
  const handleQuickCreateNotebook = () => {
    const newPageId = `page_${Date.now()}`;
    const newNb: Notebook = {
      id: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: `Тетрадь ${notebooks.length + 1}`,
      folderId: null,
      coverColor: '#2563EB',
      coverPattern: 'plain',
      pages: [
        {
          id: newPageId,
          title: 'Страница 1',
          order: 0,
          width: 2200,
          height: 7500,
          background: {
            color: '#FFFFFF',
            type: 'grid',
            gridSize: 25,
            gridColor: '#3B82F6',
            gridOpacity: 0.9,
            lineWidth: 1,
          },
          strokes: [],
          shapes: [],
          texts: [],
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      currentPageId: newPageId,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotebooks((prev) => [newNb, ...prev]);
    dbSaveNotebook(newNb);
    setActiveNotebookId(newNb.id);
    setShowWelcome(false);
    localStorage.setItem('noto_seen_welcome', 'true');
    showToast(`Создана тетрадь «${newNb.title}»`);
  };

  // Create notebook
  const handleCreateNotebook = (data: {
    title: string;
    folderId: string | null;
    coverColor: string;
    coverPattern: 'plain' | 'stripes' | 'dots' | 'grid' | 'leather';
    paperType: GridType;
  }) => {
    const newPageId = `page_${Date.now()}`;
    const newNb: Notebook = {
      id: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: data.title,
      folderId: data.folderId,
      coverColor: data.coverColor,
      coverPattern: data.coverPattern,
      pages: [
        {
          id: newPageId,
          title: 'Страница 1',
          order: 0,
          width: 2200,
          height: 7500,
          background: {
            ...DEFAULT_PAGE_BACKGROUND,
            type: data.paperType,
          },
          strokes: [],
          shapes: [],
          texts: [],
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      currentPageId: newPageId,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotebooks((prev) => [newNb, ...prev]);
    dbSaveNotebook(newNb);
    setActiveNotebookId(newNb.id);
    setShowWelcome(false);
    localStorage.setItem('noto_seen_welcome', 'true');
    showToast(`Тетрадь «${newNb.title}» создана`);
  };

  // Rename notebook
  const handleRenameNotebook = (id: string, newTitle: string) => {
    const nb = notebooks.find((n) => n.id === id);
    if (!nb) return;
    const updated = { ...nb, title: newTitle, updatedAt: Date.now() };
    handleUpdateNotebook(updated);
  };

  // Duplicate notebook
  const handleDuplicateNotebook = (id: string) => {
    const source = notebooks.find((n) => n.id === id);
    if (!source) return;
    const dup: Notebook = {
      ...JSON.parse(JSON.stringify(source)),
      id: `nb_${Date.now()}_dup`,
      title: `${source.title} (копия)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotebooks((prev) => [dup, ...prev]);
    dbSaveNotebook(dup);
    showToast(`Тетрадь «${dup.title}» создана`);
  };

  // Delete notebook
  const handleDeleteNotebook = async (id: string) => {
    const nb = notebooks.find((n) => n.id === id);
    const title = nb?.title || '';
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    if (activeNotebookId === id) setActiveNotebookId(null);
    await dbDeleteNotebook(id);
    showToast(`Тетрадь «${title}» удалена`);
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    const nb = notebooks.find((n) => n.id === id);
    if (!nb) return;
    const updated = { ...nb, favorite: !nb.favorite, updatedAt: Date.now() };
    handleUpdateNotebook(updated);
  };

  // Create folder
  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name,
      icon: 'folder',
      color: '#3B82F6',
      createdAt: Date.now(),
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    dbSaveFolders(updated);
    showToast(`Раздел «${name}» создан`);
  };

  // Import .noto file
  const handleImportNotoFile = async (file: File) => {
    try {
      const importedNb = await importNotoFile(file);
      setNotebooks((prev) => [importedNb, ...prev]);
      await dbSaveNotebook(importedNb);
      setActiveNotebookId(importedNb.id);
      showToast(`Тетрадь «${importedNb.title}» успешно импортирована`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка импорта файла .noto';
      showToast(msg);
    }
  };

  // New Page in current notebook
  const handleNewPage = () => {
    if (!activeNotebook) return;
    const newPageId = `page_${Date.now()}`;
    const firstPage = activeNotebook.pages[0];
    const newPage = {
      id: newPageId,
      title: `Страница ${activeNotebook.pages.length + 1}`,
      order: activeNotebook.pages.length,
      width: firstPage?.width || 1400,
      height: firstPage?.height || 1900,
      background: firstPage ? { ...firstPage.background } : DEFAULT_PAGE_BACKGROUND,
      strokes: [],
      shapes: [],
      texts: [],
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    handleUpdateNotebook({
      ...activeNotebook,
      pages: [...activeNotebook.pages, newPage],
      currentPageId: newPageId,
      updatedAt: Date.now(),
    });
  };

  // Menu bar export action
  const handleExport = (format: 'noto' | 'pdf' | 'png' | 'jpeg') => {
    if (!activeNotebook) return;
    if (format === 'noto') {
      exportToNotoFile(activeNotebook);
    } else if (format === 'pdf') {
      exportNotebookToPdf(activeNotebook);
    } else {
      const curPage =
        activeNotebook.pages.find((p) => p.id === activeNotebook.currentPageId) ||
        activeNotebook.pages[0];
      if (curPage) {
        exportPageAsImage(curPage, format);
      }
    }
  };

  return (
    <div 
      data-theme={settings.theme}
      className={`w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors ${
        settings.theme === 'dark' 
          ? 'bg-[#0E0F14] text-neutral-100 dark' 
          : 'bg-[#F8FAFC] text-neutral-900'
      }`}
    >
      {/* Native Desktop OS Window Titlebar */}
      <TitleBar
        documentTitle={activeNotebook ? activeNotebook.title : 'Библиотека конспектов'}
        isSaving={isSaving}
        theme={settings.theme === 'dark' ? 'dark' : 'light'}
        onToggleTheme={handleToggleTheme}
        onCloseApp={() => {
          if (activeNotebookId) setActiveNotebookId(null);
        }}
      />

      {/* Standalone Desktop Menu Bar */}
      <MenuBar
        theme={settings.theme === 'dark' ? 'dark' : 'light'}
        onNewNotebook={handleQuickCreateNotebook}
        onNewPage={handleNewPage}
        onImportNoto={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.noto,application/json';
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) handleImportNotoFile(f);
          };
          input.click();
        }}
        onExport={handleExport}
        onUndo={() => {}}
        onRedo={() => {}}
        canUndo={true}
        canRedo={true}
        onClearPage={() => {}}
        onZoom={() => {}}
        onResetZoom={() => {}}
        onSelectTool={() => {}}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        isInEditor={!!activeNotebook}
      />

      {/* Main View: Library or Editor */}
      {activeNotebook ? (
        <EditorWorkspace
          notebook={activeNotebook}
          onBackToLibrary={() => setActiveNotebookId(null)}
          onUpdateNotebook={handleUpdateNotebook}
          theme={settings.theme === 'dark' ? 'dark' : 'light'}
          onToggleTheme={handleToggleTheme}
        />
      ) : (
        <LibraryView
          notebooks={notebooks}
          folders={folders}
          onOpenNotebook={(id) => setActiveNotebookId(id)}
          onQuickCreateNotebook={handleQuickCreateNotebook}
          onRenameNotebook={handleRenameNotebook}
          onDuplicateNotebook={handleDuplicateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onToggleFavorite={handleToggleFavorite}
          onCreateFolder={handleCreateFolder}
          onImportNotoFile={handleImportNotoFile}
          showWelcome={showWelcome}
          onDismissWelcome={() => {
            setShowWelcome(false);
            localStorage.setItem('noto_seen_welcome', 'true');
          }}
          theme={settings.theme === 'dark' ? 'dark' : 'light'}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Floating System Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* About Noto & Technical Architecture Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
