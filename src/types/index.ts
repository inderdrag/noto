export type StrokeTool = 'pen' | 'pencil' | 'marker';

export type ShapeType =
  | 'line'
  | 'arrow'
  | 'dashed-line'
  | 'dashed-arrow'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'star';

export type ToolType =
  | StrokeTool
  | 'eraser'
  | ShapeType
  | 'text'
  | 'image'
  | 'select'
  | 'pan';

export type EraserMode = 'partial' | 'object';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  tool: StrokeTool;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  opacity: number;
  rotation?: number;
  dashed?: boolean;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface TextObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface ImageObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  rotation?: number;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export type GridType = 'blank' | 'grid' | 'ruled' | 'dots';

export interface PageBackground {
  color: string;
  type: GridType;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  lineWidth: number;
}

export interface Page {
  id: string;
  title: string;
  order: number;
  width: number;
  height: number;
  background: PageBackground;
  strokes: Stroke[];
  shapes: Shape[];
  texts: TextObject[];
  images: ImageObject[];
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  folderId?: string | null;
  coverColor: string;
  coverPattern?: 'plain' | 'stripes' | 'dots' | 'grid' | 'leather';
  pages: Page[];
  currentPageId: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NotoFileFormat {
  version: string;
  application: 'Noto';
  exportedAt: number;
  notebook: Notebook;
}

export interface HistoryEntry {
  pageId: string;
  description: string;
  strokes: Stroke[];
  shapes: Shape[];
  texts: TextObject[];
  images: ImageObject[];
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  pressureSensitivity: boolean;
  smoothingEnabled: boolean;
  smoothingStrength: number; // 0 to 1
  defaultPaperType: GridType;
  defaultPaperColor: string;
  defaultGridSpacing: number;
  autosaveIntervalMs: number;
  hardwareAcceleration: boolean;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeIds: string[];
  shapeIds: string[];
  textIds: string[];
  imageIds: string[];
}
