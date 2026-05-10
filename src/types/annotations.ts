/**
 * Annotation shape type definitions
 */

export type ShapeType = "rect" | "ellipse" | "arrow" | "censor";
export type ArrowType = "end" | "start" | "both";
export type CensorShapeType = "rect" | "circle";
export type CensorBlendType = "pixelate" | "blur";

export interface BaseShape {
  id: string;
  type: ShapeType;
  color: string;
  thickness: number;
  selected?: boolean;
}

export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrowType: ArrowType;
}

export interface CensorAnnotation extends BaseShape {
  type: "censor";
  x: number;
  y: number;
  w: number;
  h: number;
  censorShape: CensorShapeType;
  censorType: CensorBlendType;
  strength: number; // 1-10 for pixelate block size or blur radius
}

export type Shape = RectShape | EllipseShape | ArrowShape | CensorAnnotation;

export interface AnnotationLayer {
  shapes: Shape[];
  history: Shape[][];
  selectedShapeId: string | null;
  draftShape: Shape | null;
}

export const DEFAULT_COLORS = [
  "#FF4444", // Red
  "#FF9900", // Orange
  "#FFFF00", // Yellow
  "#00CC00", // Green
  "#0099FF", // Blue
  "#6600FF", // Purple
  "#FFFFFF", // White
];

export const DEFAULT_THICKNESS_OPTIONS = [1, 2, 4];
