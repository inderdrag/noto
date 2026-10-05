import { Notebook, NotoFileFormat, Page } from '../types';
import { renderPage } from '../drawing-engine/renderer';
import { jsPDF } from 'jspdf';

/**
 * Triggers a browser/system file download for a blob or data
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports a notebook into native .noto format
 */
export function exportToNotoFile(notebook: Notebook): void {
  const fileData: NotoFileFormat = {
    version: '1.0.0',
    application: 'Noto',
    exportedAt: Date.now(),
    notebook: {
      ...notebook,
      updatedAt: Date.now(),
    },
  };

  const json = JSON.stringify(fileData, null, 2);
  const safeTitle = notebook.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_') || 'notebook';
  downloadFile(json, `${safeTitle}.noto`, 'application/json');
}

/**
 * Reads and parses a .noto file from user file upload
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

  // Handle direct notebook JSON or wrapped NotoFileFormat
  let notebook: Notebook;
  if ('application' in obj && obj.application === 'Noto' && 'notebook' in obj) {
    notebook = obj.notebook as Notebook;
  } else if ('pages' in obj && 'title' in obj) {
    notebook = obj as unknown as Notebook;
  } else {
    throw new Error('Файл не содержит данных тетради Noto.');
  }

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
export function exportPageAsImage(page: Page, format: 'png' | 'jpeg', filename?: string): void {
  const canvas = renderPageToCanvas(page, 1.5); // High DPI crisp rasterization
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  canvas.toBlob((blob) => {
    if (!blob) return;
    const safeTitle = (filename || page.title || 'page').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
    downloadFile(blob, `${safeTitle}.${ext}`, mime);
  }, mime, 0.92);
}

/**
 * Exports multiple pages or entire notebook to PDF using jsPDF
 */
export async function exportNotebookToPdf(
  notebook: Notebook,
  pageIndices?: number[]
): Promise<void> {
  const pagesToExport = pageIndices && pageIndices.length > 0
    ? pageIndices.map((i) => notebook.pages[i]).filter(Boolean)
    : notebook.pages;

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
  pdf.save(`${safeTitle}.pdf`);
}
