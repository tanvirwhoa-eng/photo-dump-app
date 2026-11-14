import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Magnet,
} from 'lucide-react';
import { ProjectState } from '../types/studio';
import { getSlideDimensions } from '../utils/konvaScene';
import { ViewportState } from './PanoramicCanvas';

interface MiniMapBarProps {
  project: ProjectState;
  viewport: ViewportState;
  containerSize: { width: number; height: number };
  onJumpToSlide: (slideIndex: number) => void;
  onViewportChange: (next: ViewportState) => void;
  onZoomStep: (delta: number) => void;
  onFitView: () => void;
  onAddSlide: () => void;
  onDeleteSlide: (slideId: string) => void;
  onMoveSlide: (fromIdx: number, toIdx: number) => void;
  activeSlideIndex: number;
  panMode: boolean;
  onTogglePanMode: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

export const MiniMapBar: React.FC<MiniMapBarProps> = ({
  project,
  viewport,
  containerSize,
  onJumpToSlide,
  onViewportChange,
  onZoomStep,
  onFitView,
  onAddSlide,
  onDeleteSlide,
  onMoveSlide,
  activeSlideIndex,
  panMode,
  onTogglePanMode,
  snapEnabled,
  onToggleSnap,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { slideWidth, slideHeight, totalWidth } = getSlideDimensions(project);

  // Viewport rectangle normalized 0..1 across total panoramic width
  const visibleWorldWidth = containerSize.width / Math.max(0.05, viewport.zoom);
  const worldLeft = -viewport.panX / Math.max(0.05, viewport.zoom);
  const indicatorLeftPct = Math.max(
    0,
    Math.min(100, (worldLeft / Math.max(1, totalWidth)) * 100)
  );
  const indicatorWidthPct = Math.max(
    8,
    Math.min(100, (visibleWorldWidth / Math.max(1, totalWidth)) * 100)
  );

  const scrubToClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetWorldCenterX = ratio * totalWidth;
    onViewportChange({
      ...viewport,
      panX: containerSize.width / 2 - targetWorldCenterX * viewport.zoom,
      panY: (containerSize.height - slideHeight * viewport.zoom) / 2,
    });
  };

  const activeSlide = project.slides[activeSlideIndex];

  return (
    <div className="flex flex-col gap-2 px-3 py-2 bg-white/95 dark:bg-[#1A1A20]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800/80">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Slide Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddSlide}
            disabled={project.slides.length >= 10}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-40 text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>

          {activeSlide && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onMoveSlide(activeSlideIndex, activeSlideIndex - 1)}
                disabled={activeSlideIndex <= 0}
                title="Move slide left"
                aria-label="Move slide left"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 font-mono-tabular whitespace-nowrap">
                Slide {activeSlideIndex + 1}/{project.slides.length}
              </span>
              <button
                type="button"
                onClick={() => onMoveSlide(activeSlideIndex, activeSlideIndex + 1)}
                disabled={activeSlideIndex >= project.slides.length - 1}
                title="Move slide right"
                aria-label="Move slide right"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteSlide(activeSlide.id)}
                disabled={project.slides.length <= 2}
                title="Delete current slide"
                aria-label="Delete current slide"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Panoramic Slide Mini-Map Scrubber */}
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            scrubToClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) scrubToClientX(e.clientX);
          }}
          className="relative flex-1 min-w-[160px] max-w-md h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden cursor-pointer flex"
          title="Click or drag to scrub across slides"
        >
          {project.slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToSlide(idx);
              }}
              className={`relative flex-1 h-full border-r last:border-r-0 border-zinc-300/70 dark:border-zinc-700/70 flex items-center justify-center text-[11px] font-mono-tabular transition-colors cursor-pointer ${
                idx === activeSlideIndex
                  ? 'text-indigo-600 dark:text-indigo-300 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {idx + 1}
              {/* Mini footprint dots for layers overlapping this slide */}
              <span className="sr-only">Jump to slide {idx + 1}</span>
            </button>
          ))}

          {/* Active viewport highlight box */}
          <div
            className="pointer-events-none absolute top-0.5 bottom-0.5 rounded border-2 border-[#6366F1] bg-[#6366F1]/12 transition-[left,width] duration-75"
            style={{
              left: `${indicatorLeftPct}%`,
              width: `${Math.min(100 - indicatorLeftPct, indicatorWidthPct)}%`,
            }}
          />
        </div>

        {/* Snap, Pan & Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSnap}
            title="Toggle Magnetic Alignment Guides (Hold Alt to bypass)"
            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              snapEnabled
                ? 'bg-[#6366F1]/15 text-[#6366F1] dark:text-[#818CF8] border-[#6366F1]/40'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>
          <button
            type="button"
            onClick={onTogglePanMode}
            title="Toggle Hand / Pan Mode"
            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              panMode
                ? 'bg-[#6366F1] text-white border-[#6366F1]'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pan</span>
          </button>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => onZoomStep(-0.15)}
              aria-label="Zoom out"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono-tabular text-zinc-700 dark:text-zinc-300 min-w-[46px] text-center">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomStep(0.15)}
              aria-label="Zoom in"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onFitView}
              title="Fit canvas to screen"
              aria-label="Fit canvas to screen"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
