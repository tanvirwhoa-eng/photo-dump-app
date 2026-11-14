import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  X,
} from 'lucide-react';
import { ASPECT_RATIOS, ProjectState } from '../types/studio';
import {
  ExportFormat,
  SlicedSlideResult,
  downloadDataUrl,
  downloadSlidesAsZip,
  renderAndSliceCarousel,
} from '../utils/exportEngine';

interface ExportModalProps {
  open: boolean;
  project: ProjectState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  project,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [slides, setSlides] = useState<SlicedSlideResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviewIdx(0);

    renderAndSliceCarousel(project, format)
      .then((res) => {
        if (!cancelled) {
          setSlides(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render carousel.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, project, format]);

  if (!open) return null;

  const spec = ASPECT_RATIOS[project.aspectRatio];

  const jumpPreview = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIdx));
    setPreviewIdx(clamped);
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== previewIdx) setPreviewIdx(idx);
  };

  const handleDownloadZip = async () => {
    if (slides.length === 0) return;
    setZipping(true);
    try {
      await downloadSlidesAsZip(slides, project.title);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export Carousel"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#1A1A20] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Export Seamless Carousel
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-tabular mt-0.5">
              {project.slides.length} slides · {spec.width} × {spec.height}px native resolution
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {(['png', 'jpeg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-2.5 py-1 rounded text-xs font-medium uppercase cursor-pointer transition-colors ${
                    format === fmt
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close export modal"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Instagram Swipeable Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[360px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0F0F12] overflow-hidden">
              {/* Mock Feed Frame Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-[10px] font-bold text-[#6366F1]">
                    PF
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {project.title}
                  </span>
                </div>
                <span className="text-xs font-mono-tabular text-zinc-500 dark:text-zinc-400">
                  {slides.length > 0 ? `${previewIdx + 1} / ${slides.length}` : '—'}
                </span>
              </div>

              {/* Swipeable Viewport */}
              <div
                className="relative w-full bg-zinc-200 dark:bg-zinc-900"
                style={{
                  aspectRatio: `${spec.width} / ${spec.height}`,
                }}
              >
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#6366F1]" />
                    <span className="text-xs">Rendering {spec.width}px slices...</span>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-rose-500">
                    {error}
                  </div>
                ) : (
                  <>
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
                    >
                      {slides.map((s) => (
                        <div
                          key={s.slideId}
                          className="w-full h-full shrink-0 snap-center"
                        >
                          <img
                            src={s.dataUrl}
                            alt={`Slide ${s.index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>

                    {previewIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => jumpPreview(previewIdx - 1)}
                        aria-label="Previous slide"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    {previewIdx < slides.length - 1 && (
                      <button
                        type="button"
                        onClick={() => jumpPreview(previewIdx + 1)}
                        aria-label="Next slide"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Instagram Carousel Dots */}
              <div className="flex items-center justify-center gap-1.5 py-2.5">
                {project.slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => jumpPreview(idx)}
                    aria-label={`Preview slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === previewIdx
                        ? 'w-4 bg-[#6366F1]'
                        : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Download Actions & Individual Slices */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <button
              type="button"
              disabled={loading || zipping || slides.length === 0}
              onClick={handleDownloadZip}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {zipping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>
                {zipping
                  ? 'Packaging ZIP...'
                  : `Download All (${slides.length} Slides .ZIP)`}
              </span>
            </button>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Individual Slices
              </span>
              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {slides.map((s) => (
                  <div
                    key={s.slideId}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={s.dataUrl}
                        alt={s.filename}
                        className="w-10 h-12 rounded object-cover bg-zinc-200 dark:bg-zinc-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {s.filename}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono-tabular">
                          Slide {s.index + 1} · {spec.width}×{spec.height}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(s.dataUrl, s.filename)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-[#6366F1] text-xs font-medium text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
