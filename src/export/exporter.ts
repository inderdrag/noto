import { Notebook, NotoFileFormat, Page } from '../types';
import { renderPage } from '../drawing-engine/renderer';
import { jsPDF } from 'jspdf';
import { normalizeNotebook } from '../storage/migration';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Converts a string or Blob to a base64 encoded string
 */
async function contentToBase64(content: string | Blob): Promise<string> {
  if (typeof content === 'string') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(',');
      resolve(commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.readAsDataURL(content);
  });
}

/**
 * Triggers a browser/system file download on desktop,
 * or native save/share sheet on mobile devices (Android/iOS/PWA).
 */
export async function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<void> {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });

  // 1. Native Mobile (Capacitor Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await contentToBase64(content);
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: filename,
        text: `Файл: ${filename}`,
        url: fileResult.uri,
        dialogTitle: `Сохранить или отправить ${filename}`,
      });
      return;
    } catch (err) {
      console.warn('Capacitor native export failed, falling back to web methods:', err);
    }
  }

  // 2. Mobile Browser Web Share API (if supported)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.warn('Web Share API error, falling back to download link:', err);
    }
  }

  // 3. Desktop / Browser Classic Download (<a download>)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Exports a notebook into native .noto format (v1.1.0)
 */
export async function exportToNotoFile(notebook: Notebook): Promise<void> {
  const normalized = normalizeNotebook(notebook);
  const fileData: NotoFileFormat = {
    version: '1.1.0',
    application: 'Noto',
    exportedAt: Date.now(),
    notebook: {
      ...normalized,
      updatedAt: Date.now(),
    },
  };

  const json = JSON.stringify(fileData, null, 2);
  const safeTitle = notebook.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_') || 'notebook';
  await downloadFile(json, `${safeTitle}.noto`, 'application/json');
}

/**
 * Reads and parses a .noto file from user file upload.
 * Backward compatible with v1.0.0, v1.1.0, and unwrapped notebook JSON.
 */
export async function importNotoFile(file: File): Promise<Notebook> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файл поврежден или не является валидным JSON.');
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') {
    throw new Error('Некорректный формат файла .noto');
  }

  // Handle direct notebook JSON or wrapped NotoFileFormat (v1.0.0 or v1.1.0)
  let rawNotebook: Notebook;
  if ('application' in obj && obj.application === 'Noto' && 'notebook' in obj) {
    rawNotebook = obj.notebook as Notebook;
  } else if ('pages' in obj && 'title' in obj) {
    rawNotebook = obj as unknown as Notebook;
  } else {
    throw new Error('Файл не содержит данных тетради Noto.');
  }

  // Normalize legacy data (fill missing fields like deleted: false and updatedAt)
  const notebook = normalizeNotebook(rawNotebook);

  // Assign fresh ID if importing to prevent collision
  notebook.id = `nb_imported_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  notebook.title = `${notebook.title} (импорт)`;
  notebook.createdAt = Date.now();
  notebook.updatedAt = Date.now();

  return notebook;
}

/**
 * Renders a page to an offscreen HTMLCanvasElement
 */
export function renderPageToCanvas(page: Page, scale: number = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = page.width * scale;
  canvas.height = page.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);
  renderPage(ctx, page, { pressureEnabled: true });
  return canvas;
}

/**
 * Exports single page to PNG or JPG
 */
export async function exportPageAsImage(page: Page, format: 'png' | 'jpeg', filename?: string): Promise<void> {
  const canvas = renderPageToCanvas(page, 1.5); // High DPI crisp rasterization
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const safeTitle = (filename || page.title || 'page').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
      await downloadFile(blob, `${safeTitle}.${ext}`, mime);
      resolve();
    }, mime, 0.92);
  });
}

/**
 * Exports multiple pages or entire notebook to PDF using jsPDF
 */
export async function exportNotebookToPdf(
  notebook: Notebook,
  pageIndices?: number[]
): Promise<void> {
  const activePages = notebook.pages.filter((p) => !p.deleted);
  const pagesToExport = pageIndices && pageIndices.length > 0
    ? pageIndices.map((i) => activePages[i]).filter(Boolean)
    : activePages;

  if (pagesToExport.length === 0) return;

  const firstPage = pagesToExport[0];
  const orientation = firstPage.width > firstPage.height ? 'landscape' : 'portrait';

  // Initialize jsPDF with standard point dimensions
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [firstPage.width * 0.75, firstPage.height * 0.75],
  });

  for (let i = 0; i < pagesToExport.length; i++) {
    const page = pagesToExport[i];
    if (i > 0) {
      pdf.addPage([page.width * 0.75, page.height * 0.75], page.width > page.height ? 'landscape' : 'portrait');
    }

    const canvas = renderPageToCanvas(page, 1.25);
    const imgData = canvas.toDataURL('image/jpeg', 0.9);

    pdf.addImage(imgData, 'JPEG', 0, 0, page.width * 0.75, page.height * 0.75, undefined, 'FAST');
  }

  const safeTitle = notebook.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_') || 'notebook';
  const pdfBlob = pdf.output('blob');
  await downloadFile(pdfBlob, `${safeTitle}.pdf`, 'application/pdf');
}
