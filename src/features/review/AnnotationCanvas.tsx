/**
 * AnnotationCanvas - React component for annotation drawing
 */

import { useRef, useEffect, useState } from "react";
import { AnnotationLayer } from "./annotationLayer";
import { Shape } from "@models/annotations";

interface AnnotationCanvasProps {
  imageUrl?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  activeTool?: "rect" | "ellipse" | "arrow" | "censor" | "select";
  toolColor?: string;
  toolThickness?: number;
}

export function AnnotationCanvas({
  imageUrl,
  onShapesChange,
  activeTool = "select",
  toolColor = "#FF4444",
  toolThickness = 2,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<AnnotationLayer | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize canvas with proper sizing
    const container = canvasRef.current.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = (width * 9) / 16; // 16:9 aspect ratio

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    // Initialize layer
    layerRef.current = new AnnotationLayer(canvasRef.current);

    // Draw background image if provided
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          layerRef.current?.render();
        }
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setActiveTool(activeTool);
    }
  }, [activeTool]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setToolColor(toolColor);
    }
  }, [toolColor]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setToolThickness(toolThickness);
    }
  }, [toolThickness]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !layerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    layerRef.current.onMouseDown(x, y);
    onShapesChange?.(layerRef.current.getShapes());
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !layerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    layerRef.current.onMouseMove(x, y);
  };

  const handleMouseUp = () => {
    if (!layerRef.current) return;

    setIsDrawing(false);
    layerRef.current.onMouseUp();
    onShapesChange?.(layerRef.current.getShapes());
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };

  return (
    <div className="relative w-full bg-black/5 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
