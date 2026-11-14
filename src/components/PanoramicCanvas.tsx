import React, { useEffect, useRef, useState, useCallback } from 'react';
import Konva from 'konva';
import {
  CanvasLayer,
  ProjectState,
  TextLayer,
} from '../types/studio';
import {
  getSlideDimensions,
  renderBackgroundLayer,
  renderContentLayers,
} from '../utils/konvaScene';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

interface PanoramicCanvasProps {
  project: ProjectState;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<CanvasLayer>, commitHistory?: boolean) => void;
  onEditTextLayer: (layer: TextLayer) => void;
  viewport: ViewportState;
  onViewportChange: (next: ViewportState) => void;
  onContainerSizeChange?: (size: { width: number; height: number }) => void;
  theme: 'dark' | 'light';
  panMode: boolean;
  snapEnabled?: boolean;
}

type SnapKind = 'slide-center' | 'slide-edge' | 'safe-margin' | 'object';

interface SnapTarget {
  pos: number;
  kind: SnapKind;
  label: string;
  spanStart?: number;
  spanEnd?: number;
}

interface SnapGuide {
  orientation: 'V' | 'H';
  pos: number;
  kind: SnapKind;
  label: string;
  anchorPos: number; // orthogonal coordinate on dragged object for snap dot
  spanStart?: number;
  spanEnd?: number;
}

const SNAP_THRESHOLD_PX = 12;

export const PanoramicCanvas: React.FC<PanoramicCanvasProps> = ({
  project,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onEditTextLayer,
  viewport,
  onViewportChange,
  onContainerSizeChange,
  theme,
  panMode,
  snapEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const bgLayerRef = useRef<Konva.Layer | null>(null);
  const contentLayerRef = useRef<Konva.Layer | null>(null);
  const guideLayerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Latest props in refs for Konva event callbacks
  const projectRef = useRef(project);
  projectRef.current = project;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const selectedIdRef = useRef(selectedLayerId);
  selectedIdRef.current = selectedLayerId;
  const panModeRef = useRef(panMode);
  panModeRef.current = panMode;
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const altPressedRef = useRef(false);
  const callbacksRef = useRef({
    onSelectLayer,
    onUpdateLayer,
    onEditTextLayer,
    onViewportChange,
  });
  callbacksRef.current = {
    onSelectLayer,
    onUpdateLayer,
    onEditTextLayer,
    onViewportChange,
  };

  // Track active pointer pan
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{
    active: boolean;
    lastDist: number;
    lastCenter: { x: number; y: number };
  }>({ active: false, lastDist: 0, lastCenter: { x: 0, y: 0 } });

  // Measure container cleanly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        const size = { width: Math.round(rect.width), height: Math.round(rect.height) };
        setContainerSize(size);
        onContainerSizeChange?.(size);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onContainerSizeChange]);

  const drawGuideOverlay = useCallback((snapGuides: SnapGuide[] = []) => {
    const guideLayer = guideLayerRef.current;
    if (!guideLayer) return;
    guideLayer.destroyChildren();

    const proj = projectRef.current;
    const zoom = Math.max(0.05, viewportRef.current.zoom);
    const { slideWidth, slideHeight, totalWidth } = getSlideDimensions(proj);
    const isDark = theme === 'dark';

    // Outer frame border
    guideLayer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: totalWidth,
        height: slideHeight,
        stroke: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(24,24,27,0.22)',
        strokeWidth: 1.5 / zoom,
        listening: false,
      })
    );

    // Dashed vertical slide dividers (non-exportable)
    for (let i = 1; i < proj.slides.length; i++) {
      const x = i * slideWidth;
      guideLayer.add(
        new Konva.Line({
          points: [x, 0, x, slideHeight],
          stroke: '#6366F1',
          strokeWidth: 2 / zoom,
          dash: [10 / zoom, 8 / zoom],
          opacity: 0.78,
          listening: false,
        })
      );
    }

    // Slide number tags above each slide frame
    for (let i = 0; i < proj.slides.length; i++) {
      const x = i * slideWidth;
      const fontSize = Math.round(13 / zoom);
      const label = new Konva.Text({
        x: x + 8 / zoom,
        y: -26 / zoom,
        text: `Slide ${i + 1}`,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize,
        fontStyle: '600',
        fill: isDark ? '#A1A1AA' : '#52525B',
        listening: false,
      });
      guideLayer.add(label);
    }

    // Magnetic alignment snap guides (highlighted with glow, anchor dots, and label pill)
    const getGuideColor = (kind: SnapKind) => {
      switch (kind) {
        case 'slide-center':
          return '#EC4899'; // Vibrant magenta for center alignment
        case 'slide-edge':
          return '#06B6D4'; // Vibrant cyan for slide edges & boundaries
        case 'safe-margin':
          return '#6366F1'; // Indigo for safe margin guides
        case 'object':
          return '#F43F5E'; // Coral rose for object-to-object alignment
      }
    };

    for (const g of snapGuides) {
      const color = getGuideColor(g.kind);
      if (g.orientation === 'V') {
        const y1 = g.spanStart !== undefined ? Math.min(g.spanStart, g.anchorPos) - 24 / zoom : -36 / zoom;
        const y2 = g.spanEnd !== undefined ? Math.max(g.spanEnd, g.anchorPos) + 24 / zoom : slideHeight + 36 / zoom;

        // Soft highlight halo
        guideLayer.add(
          new Konva.Line({
            points: [g.pos, y1, g.pos, y2],
            stroke: color,
            strokeWidth: 7 / zoom,
            opacity: 0.24,
            listening: false,
          })
        );
        // Crisp alignment guide line
        guideLayer.add(
          new Konva.Line({
            points: [g.pos, y1, g.pos, y2],
            stroke: color,
            strokeWidth: 2 / zoom,
            dash: g.kind === 'safe-margin' ? [6 / zoom, 4 / zoom] : undefined,
            listening: false,
          })
        );
        // Snap anchor diamond/circle at contact point
        guideLayer.add(
          new Konva.Circle({
            x: g.pos,
            y: g.anchorPos,
            radius: 5 / zoom,
            fill: '#FFFFFF',
            stroke: color,
            strokeWidth: 2 / zoom,
            listening: false,
          })
        );
        // Floating alignment label tag
        const label = new Konva.Label({
          x: g.pos + 8 / zoom,
          y: Math.max(-18 / zoom, y1 + 10 / zoom),
          listening: false,
        });
        label.add(
          new Konva.Tag({
            fill: color,
            cornerRadius: 4 / zoom,
          })
        );
        label.add(
          new Konva.Text({
            text: g.label,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 11 / zoom,
            fontStyle: '600',
            fill: '#FFFFFF',
            padding: 4 / zoom,
          })
        );
        guideLayer.add(label);
      } else {
        const x1 = g.spanStart !== undefined ? Math.min(g.spanStart, g.anchorPos) - 24 / zoom : -36 / zoom;
        const x2 = g.spanEnd !== undefined ? Math.max(g.spanEnd, g.anchorPos) + 24 / zoom : totalWidth + 36 / zoom;

        // Soft highlight halo
        guideLayer.add(
          new Konva.Line({
            points: [x1, g.pos, x2, g.pos],
            stroke: color,
            strokeWidth: 7 / zoom,
            opacity: 0.24,
            listening: false,
          })
        );
        // Crisp alignment guide line
        guideLayer.add(
          new Konva.Line({
            points: [x1, g.pos, x2, g.pos],
            stroke: color,
            strokeWidth: 2 / zoom,
            dash: g.kind === 'safe-margin' ? [6 / zoom, 4 / zoom] : undefined,
            listening: false,
          })
        );
        // Snap anchor circle at contact point
        guideLayer.add(
          new Konva.Circle({
            x: g.anchorPos,
            y: g.pos,
            radius: 5 / zoom,
            fill: '#FFFFFF',
            stroke: color,
            strokeWidth: 2 / zoom,
            listening: false,
          })
        );
        // Floating alignment label tag
        const label = new Konva.Label({
          x: Math.max(8 / zoom, x1 + 10 / zoom),
          y: g.pos + 8 / zoom,
          listening: false,
        });
        label.add(
          new Konva.Tag({
            fill: color,
            cornerRadius: 4 / zoom,
          })
        );
        label.add(
          new Konva.Text({
            text: g.label,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 11 / zoom,
            fontStyle: '600',
            fill: '#FFFFFF',
            padding: 4 / zoom,
          })
        );
        guideLayer.add(label);
      }
    }

    // Center crosshair intersection indicator when both X and Y snap simultaneously
    const vGuide = snapGuides.find((g) => g.orientation === 'V');
    const hGuide = snapGuides.find((g) => g.orientation === 'H');
    if (vGuide && hGuide) {
      guideLayer.add(
        new Konva.Circle({
          x: vGuide.pos,
          y: hGuide.pos,
          radius: 7 / zoom,
          fill: 'rgba(255,255,255,0.2)',
          stroke: '#FFFFFF',
          strokeWidth: 2 / zoom,
          listening: false,
        })
      );
    }

    guideLayer.batchDraw();
  }, [theme]);

  // Track Alt key to allow temporary snap bypass while dragging
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altPressedRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altPressedRef.current = false;
    };
    const onBlur = () => {
      altPressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Initialize Konva Stage once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stage = new Konva.Stage({
      container: el,
      width: el.clientWidth || 800,
      height: el.clientHeight || 600,
    });

    const bgLayer = new Konva.Layer({ listening: false });
    const contentLayer = new Konva.Layer();
    const guideLayer = new Konva.Layer({ listening: false });

    const transformer = new Konva.Transformer({
      rotateAnchorOffset: 34,
      anchorSize: 11,
      anchorCornerRadius: 3,
      anchorStroke: '#6366F1',
      anchorFill: '#FFFFFF',
      anchorStrokeWidth: 2,
      borderStroke: '#6366F1',
      borderStrokeWidth: 1.75,
      keepRatio: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 6,
      ignoreStroke: true,
      boundBoxFunc: (oldBox, newBox) => {
        if (Math.abs(newBox.width) < 30 || Math.abs(newBox.height) < 20) {
          return oldBox;
        }
        return newBox;
      },
    });

    stage.add(bgLayer);
    stage.add(contentLayer);
    stage.add(guideLayer);
    contentLayer.add(transformer);

    stageRef.current = stage;
    bgLayerRef.current = bgLayer;
    contentLayerRef.current = contentLayer;
    guideLayerRef.current = guideLayer;
    transformerRef.current = transformer;

    // Click empty stage to deselect
    stage.on('mousedown touchstart', (e) => {
      if (panModeRef.current || e.evt instanceof MouseEvent && e.evt.button === 1) {
        const pos = stage.getPointerPosition();
        if (pos) {
          isPanningRef.current = true;
          panStartRef.current = {
            pointerX: pos.x,
            pointerY: pos.y,
            panX: viewportRef.current.panX,
            panY: viewportRef.current.panY,
          };
        }
        return;
      }

      if (e.target === stage) {
        callbacksRef.current.onSelectLayer(null);
        const pos = stage.getPointerPosition();
        if (pos) {
          isPanningRef.current = true;
          panStartRef.current = {
            pointerX: pos.x,
            pointerY: pos.y,
            panX: viewportRef.current.panX,
            panY: viewportRef.current.panY,
          };
        }
        return;
      }

      // Find top-level canvas-layer group
      let node: Konva.Node | null = e.target;
      while (node && node !== contentLayer && node.name() !== 'canvas-layer') {
        node = node.getParent();
      }
      if (node && node.name() === 'canvas-layer') {
        callbacksRef.current.onSelectLayer(node.id());
      }
    });

    stage.on('mousemove touchmove', (e) => {
      if (pinchRef.current.active) return;
      if (!isPanningRef.current) return;
      if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const dx = pos.x - panStartRef.current.pointerX;
      const dy = pos.y - panStartRef.current.pointerY;
      callbacksRef.current.onViewportChange({
        ...viewportRef.current,
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      });
    });

    stage.on('mouseup touchend', () => {
      isPanningRef.current = false;
    });

    // Wheel pan & Ctrl/Cmd+Wheel zoom
    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const vp = viewportRef.current;

      if (e.evt.ctrlKey || e.evt.metaKey) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const scaleBy = 1.07;
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(0.08, Math.min(2.5, direction > 0 ? vp.zoom * scaleBy : vp.zoom / scaleBy));
        const worldX = (pointer.x - vp.panX) / vp.zoom;
        const worldY = (pointer.y - vp.panY) / vp.zoom;
        callbacksRef.current.onViewportChange({
          zoom: newZoom,
          panX: pointer.x - worldX * newZoom,
          panY: pointer.y - worldY * newZoom,
        });
      } else {
        const dx = e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX;
        const dy = e.evt.shiftKey ? 0 : e.evt.deltaY;
        callbacksRef.current.onViewportChange({
          ...vp,
          panX: vp.panX - dx,
          panY: vp.panY - dy,
        });
      }
    });

    // Touch pinch-to-zoom + 2-finger pan on DOM element
    const contentEl = stage.content;
    const getTouchDist = (t0: Touch, t1: Touch) =>
      Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const getTouchCenter = (t0: Touch, t1: Touch, rect: DOMRect) => ({
      x: (t0.clientX + t1.clientX) / 2 - rect.left,
      y: (t0.clientY + t1.clientY) / 2 - rect.top,
    });

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        ev.preventDefault();
        isPanningRef.current = false;
        const rect = contentEl.getBoundingClientRect();
        pinchRef.current = {
          active: true,
          lastDist: getTouchDist(ev.touches[0], ev.touches[1]),
          lastCenter: getTouchCenter(ev.touches[0], ev.touches[1], rect),
        };
      }
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 2 && pinchRef.current.active) {
        ev.preventDefault();
        const rect = contentEl.getBoundingClientRect();
        const dist = getTouchDist(ev.touches[0], ev.touches[1]);
        const center = getTouchCenter(ev.touches[0], ev.touches[1], rect);
        const vp = viewportRef.current;

        const scaleFactor = dist / Math.max(1, pinchRef.current.lastDist);
        const newZoom = Math.max(0.08, Math.min(2.5, vp.zoom * scaleFactor));

        const worldX = (pinchRef.current.lastCenter.x - vp.panX) / vp.zoom;
        const worldY = (pinchRef.current.lastCenter.y - vp.panY) / vp.zoom;

        callbacksRef.current.onViewportChange({
          zoom: newZoom,
          panX: center.x - worldX * newZoom,
          panY: center.y - worldY * newZoom,
        });

        pinchRef.current.lastDist = dist;
        pinchRef.current.lastCenter = center;
      }
    };

    const onTouchEnd = (ev: TouchEvent) => {
      if (ev.touches.length < 2) {
        pinchRef.current.active = false;
      }
    };

    contentEl.addEventListener('touchstart', onTouchStart, { passive: false });
    contentEl.addEventListener('touchmove', onTouchMove, { passive: false });
    contentEl.addEventListener('touchend', onTouchEnd);

    return () => {
      contentEl.removeEventListener('touchstart', onTouchStart);
      contentEl.removeEventListener('touchmove', onTouchMove);
      contentEl.removeEventListener('touchend', onTouchEnd);
      stage.destroy();
    };
  }, []);

  // Resize stage when container size updates
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.width(containerSize.width);
    stage.height(containerSize.height);
    stage.batchDraw();
  }, [containerSize]);

  // Apply pan & zoom transform across layers
  useEffect(() => {
    const layers = [bgLayerRef.current, contentLayerRef.current, guideLayerRef.current];
    for (const layer of layers) {
      if (!layer) continue;
      layer.position({ x: viewport.panX, y: viewport.panY });
      layer.scale({ x: viewport.zoom, y: viewport.zoom });
    }
    drawGuideOverlay();
    stageRef.current?.batchDraw();
  }, [viewport, drawGuideOverlay]);

  // Render background & content layers whenever project changes
  useEffect(() => {
    let cancelled = false;
    const bgLayer = bgLayerRef.current;
    const contentLayer = contentLayerRef.current;
    const transformer = transformerRef.current;
    if (!bgLayer || !contentLayer || !transformer) return;

    const { slideWidth, slideHeight, totalWidth } = getSlideDimensions(project);
    renderBackgroundLayer(bgLayer, project, totalWidth, slideWidth, slideHeight);
    bgLayer.batchDraw();

    // Detach transformer before rebuilding children
    transformer.nodes([]);
    transformer.remove();

    const syncScene = async () => {
      await renderContentLayers(contentLayer, project.layers, !panMode, Math.max(0.75, viewportRef.current.zoom));
      if (cancelled) return;

      // Wire drag snapping, transform end, and text double-click handlers
      const nodes = contentLayer.getChildren();
      for (const rawNode of nodes) {
        const node: Konva.Node = rawNode;
        const layerData = project.layers.find((l) => l.id === node.id());
        if (!layerData) continue;

        if (layerData.type === 'text') {
          node.on('dblclick dbltap', () => {
            const latest = projectRef.current.layers.find((l) => l.id === node.id());
            if (latest && latest.type === 'text' && !latest.locked) {
              callbacksRef.current.onEditTextLayer(latest);
            }
          });
        }

        node.on('dragmove', () => {
          if (!snapEnabledRef.current || altPressedRef.current) {
            drawGuideOverlay([]);
            return;
          }

          const zoom = Math.max(0.05, viewportRef.current.zoom);
          const threshold = SNAP_THRESHOLD_PX / zoom;
          const proj = projectRef.current;
          const dims = getSlideDimensions(proj);

          const vTargets: SnapTarget[] = [];
          const hTargets: SnapTarget[] = [
            { pos: 0, kind: 'slide-edge', label: 'Top Edge' },
            { pos: dims.slideHeight / 2, kind: 'slide-center', label: 'Vertical Center' },
            { pos: dims.slideHeight, kind: 'slide-edge', label: 'Bottom Edge' },
            { pos: 48, kind: 'safe-margin', label: 'Safe Margin' },
            { pos: dims.slideHeight - 48, kind: 'safe-margin', label: 'Safe Margin' },
          ];

          for (let i = 0; i < proj.slides.length; i++) {
            const sx = i * dims.slideWidth;
            vTargets.push(
              { pos: sx, kind: 'slide-edge', label: i === 0 ? 'Canvas Left' : `Slide ${i}/${i + 1} Edge` },
              { pos: sx + dims.slideWidth / 2, kind: 'slide-center', label: `Slide ${i + 1} Center` },
              { pos: sx + 48, kind: 'safe-margin', label: 'Safe Margin' },
              { pos: sx + dims.slideWidth - 48, kind: 'safe-margin', label: 'Safe Margin' }
            );
            if (i === proj.slides.length - 1) {
              vTargets.push({ pos: sx + dims.slideWidth, kind: 'slide-edge', label: 'Canvas Right' });
            }
          }

          // Neighboring layers (excluding shadow blur so visual bounds align accurately)
          for (const other of contentLayer.getChildren()) {
            if (other === node || other === transformer) continue;
            const oBox = other.getClientRect({ relativeTo: contentLayer, skipShadow: true });
            vTargets.push(
              { pos: oBox.x, kind: 'object', label: 'Align Edge', spanStart: oBox.y, spanEnd: oBox.y + oBox.height },
              { pos: oBox.x + oBox.width / 2, kind: 'object', label: 'Align Center', spanStart: oBox.y, spanEnd: oBox.y + oBox.height },
              { pos: oBox.x + oBox.width, kind: 'object', label: 'Align Edge', spanStart: oBox.y, spanEnd: oBox.y + oBox.height }
            );
            hTargets.push(
              { pos: oBox.y, kind: 'object', label: 'Align Edge', spanStart: oBox.x, spanEnd: oBox.x + oBox.width },
              { pos: oBox.y + oBox.height / 2, kind: 'object', label: 'Align Center', spanStart: oBox.x, spanEnd: oBox.x + oBox.width },
              { pos: oBox.y + oBox.height, kind: 'object', label: 'Align Edge', spanStart: oBox.x, spanEnd: oBox.x + oBox.width }
            );
          }

          const box = node.getClientRect({ relativeTo: contentLayer, skipShadow: true });
          const nodeV = [box.x, box.x + box.width / 2, box.x + box.width];
          const nodeH = [box.y, box.y + box.height / 2, box.y + box.height];

          let bestDx: number | null = null;
          let bestVTarget: SnapTarget | null = null;
          let minAbsDx = threshold;

          for (const nv of nodeV) {
            for (const tv of vTargets) {
              const diff = tv.pos - nv;
              if (Math.abs(diff) < minAbsDx) {
                minAbsDx = Math.abs(diff);
                bestDx = diff;
                bestVTarget = tv;
              }
            }
          }

          let bestDy: number | null = null;
          let bestHTarget: SnapTarget | null = null;
          let minAbsDy = threshold;

          for (const nh of nodeH) {
            for (const th of hTargets) {
              const diff = th.pos - nh;
              if (Math.abs(diff) < minAbsDy) {
                minAbsDy = Math.abs(diff);
                bestDy = diff;
                bestHTarget = th;
              }
            }
          }

          if (bestDx !== null) {
            node.x(node.x() + bestDx);
          }
          if (bestDy !== null) {
            node.y(node.y() + bestDy);
          }

          const snappedBox = node.getClientRect({ relativeTo: contentLayer, skipShadow: true });
          const activeGuides: SnapGuide[] = [];

          if (bestDx !== null && bestVTarget) {
            activeGuides.push({
              orientation: 'V',
              pos: bestVTarget.pos,
              kind: bestVTarget.kind,
              label: bestVTarget.label,
              anchorPos: snappedBox.y + snappedBox.height / 2,
              spanStart:
                bestVTarget.spanStart !== undefined
                  ? Math.min(bestVTarget.spanStart, snappedBox.y)
                  : undefined,
              spanEnd:
                bestVTarget.spanEnd !== undefined
                  ? Math.max(bestVTarget.spanEnd, snappedBox.y + snappedBox.height)
                  : undefined,
            });
          }

          if (bestDy !== null && bestHTarget) {
            activeGuides.push({
              orientation: 'H',
              pos: bestHTarget.pos,
              kind: bestHTarget.kind,
              label: bestHTarget.label,
              anchorPos: snappedBox.x + snappedBox.width / 2,
              spanStart:
                bestHTarget.spanStart !== undefined
                  ? Math.min(bestHTarget.spanStart, snappedBox.x)
                  : undefined,
              spanEnd:
                bestHTarget.spanEnd !== undefined
                  ? Math.max(bestHTarget.spanEnd, snappedBox.x + snappedBox.width)
                  : undefined,
            });
          }

          drawGuideOverlay(activeGuides);
        });

        node.on('dragend', () => {
          drawGuideOverlay([]);
          callbacksRef.current.onUpdateLayer(
            node.id(),
            { x: Math.round(node.x()), y: Math.round(node.y()) },
            true
          );
        });

        node.on('transformend', () => {
          const sx = node.scaleX();
          const sy = node.scaleY();
          const newX = Math.round(node.x());
          const newY = Math.round(node.y());
          const newRot = Math.round(node.rotation());

          node.scaleX(1);
          node.scaleY(1);

          const latest = projectRef.current.layers.find((l) => l.id === node.id());
          if (!latest) return;

          if (latest.type === 'text') {
            const newWidth = Math.max(80, Math.round(latest.width * sx));
            const newFontSize = Math.max(16, Math.min(360, Math.round(latest.fontSize * sy)));
            callbacksRef.current.onUpdateLayer(
              node.id(),
              {
                x: newX,
                y: newY,
                width: newWidth,
                fontSize: newFontSize,
                rotation: newRot,
              },
              true
            );
          } else {
            callbacksRef.current.onUpdateLayer(
              node.id(),
              {
                x: newX,
                y: newY,
                width: Math.max(40, Math.round(latest.width * sx)),
                height: Math.max(40, Math.round(latest.height * sy)),
                rotation: newRot,
              },
              true
            );
          }
        });
      }

      contentLayer.add(transformer);

      // Re-attach transformer to selected layer if visible & unlocked
      const selId = selectedIdRef.current;
      if (selId && !panMode) {
        const target = contentLayer.findOne(`#${selId}`);
        const layerObj = project.layers.find((l) => l.id === selId);
        if (target && layerObj && !layerObj.locked && layerObj.visible) {
          if (layerObj.type === 'text') {
            transformer.enabledAnchors([
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
            ]);
            transformer.keepRatio(true);
          } else {
            transformer.enabledAnchors([
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
            ]);
            transformer.keepRatio(true);
          }
          transformer.nodes([target]);
        } else {
          transformer.nodes([]);
        }
      } else {
        transformer.nodes([]);
      }

      contentLayer.batchDraw();
      drawGuideOverlay();
    };

    syncScene();
    return () => {
      cancelled = true;
    };
  }, [project, panMode, drawGuideOverlay]);

  // Update transformer attachment when only selection changes
  useEffect(() => {
    const contentLayer = contentLayerRef.current;
    const transformer = transformerRef.current;
    if (!contentLayer || !transformer) return;

    if (selectedLayerId && !panMode) {
      const target = contentLayer.findOne(`#${selectedLayerId}`);
      const layerObj = project.layers.find((l) => l.id === selectedLayerId);
      if (target && layerObj && !layerObj.locked && layerObj.visible) {
        if (layerObj.type === 'text') {
          transformer.enabledAnchors([
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right',
          ]);
        } else {
          transformer.enabledAnchors([
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]);
        }
        transformer.nodes([target]);
      } else {
        transformer.nodes([]);
      }
    } else {
      transformer.nodes([]);
    }
    contentLayer.batchDraw();
  }, [selectedLayerId, panMode, project.layers]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden touch-none select-none ${
        panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      aria-label="Panoramic carousel canvas"
    />
  );
};
