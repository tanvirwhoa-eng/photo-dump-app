import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Moon,
  Palette,
  Redo2,
  Shapes,
  SlidersHorizontal,
  Sun,
  Type,
  Undo2,
  X,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  AspectRatioId,
  BackgroundConfig,
  CanvasFontFamily,
  CanvasLayer,
  CarouselTemplate,
  ImageLayer,
  ProjectState,
  StickerLayer,
  StudioToolTab,
  TextLayer,
  UploadedPhoto,
} from './types/studio';
import {
  CAROUSEL_TEMPLATES,
  DEFAULT_FILTERS,
  instantiateTemplate,
} from './data/templates';
import { StickerAsset } from './data/stickers';
import { getSlideDimensions } from './utils/konvaScene';
import {
  getSavedTheme,
  loadProjectFromStorage,
  loadUploadedPhotos,
  saveProjectToStorage,
  saveTheme,
  saveUploadedPhotos,
} from './utils/storage';
import { PanoramicCanvas, ViewportState } from './components/PanoramicCanvas';
import { MiniMapBar } from './components/MiniMapBar';
import { ToolDrawerContent } from './components/ToolDrawerContent';
import { ElementInspector } from './components/ElementInspector';
import { ExportModal } from './components/ExportModal';
import { TextEditorModal } from './components/TextEditorModal';

const MAX_HISTORY = 40;

interface HistoryState {
  past: ProjectState[];
  present: ProjectState;
  future: ProjectState[];
}

function createInitialProject(): ProjectState {
  return instantiateTemplate(CAROUSEL_TEMPLATES[0]);
}

function readFileAsDataUrl(file: File): Promise<{
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        resolve({
          src,
          naturalWidth: img.naturalWidth || 1080,
          naturalHeight: img.naturalHeight || 1080,
        });
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: createInitialProject(),
    future: [],
  }));
  const [hydrated, setHydrated] = useState(false);

  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<StudioToolTab>('photos');
  const [mobileSheetMode, setMobileSheetMode] = useState<'none' | 'tool' | 'inspector'>('none');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingTextLayer, setEditingTextLayer] = useState<TextLayer | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const [containerSize, setContainerSize] = useState({ width: 900, height: 640 });
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.36,
    panX: 48,
    panY: 48,
  });
  const hasFittedInitially = useRef(false);

  const project = history.present;

  // Apply theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Hydrate saved project & uploaded photos from IndexedDB on mount
  useEffect(() => {
    let active = true;
    Promise.all([loadProjectFromStorage(), loadUploadedPhotos()]).then(
      ([savedProject, savedPhotos]) => {
        if (!active) return;
        if (savedProject && savedProject.slides?.length >= 2) {
          setHistory({ past: [], present: savedProject, future: [] });
        }
        if (savedPhotos && savedPhotos.length > 0) {
          setUploadedPhotos(savedPhotos);
        }
        setHydrated(true);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  // Auto-save project to IndexedDB (debounced)
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveProjectToStorage(project);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project, hydrated]);

  // Auto-save uploaded photos
  useEffect(() => {
    if (!hydrated) return;
    saveUploadedPhotos(uploadedPhotos);
  }, [uploadedPhotos, hydrated]);

  const commitProject = useCallback(
    (updater: (prev: ProjectState) => ProjectState, recordHistory = true) => {
      setHistory((curr) => {
        const nextPresent = updater(curr.present);
        if (nextPresent === curr.present) return curr;
        if (!recordHistory) {
          return { ...curr, present: nextPresent };
        }
        return {
          past: [...curr.past.slice(-(MAX_HISTORY - 1)), curr.present],
          present: nextPresent,
          future: [],
        };
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      return {
        past: curr.past.slice(0, -1),
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: curr.future.slice(1),
      };
    });
  }, []);

  // Compute active slide index based on viewport center
  const activeSlideIndex = useMemo(() => {
    const { slideWidth } = getSlideDimensions(project);
    const centerXWorld = (containerSize.width / 2 - viewport.panX) / Math.max(0.05, viewport.zoom);
    const idx = Math.floor(centerXWorld / slideWidth);
    return Math.max(0, Math.min(project.slides.length - 1, idx));
  }, [project, containerSize.width, viewport]);

  const fitCanvasToViewport = useCallback(
    (targetProject: ProjectState = project, size = containerSize) => {
      const { slideWidth, slideHeight, totalWidth } = getSlideDimensions(targetProject);
      const padX = 56;
      const padY = 64;
      const availW = Math.max(200, size.width - padX);
      const availH = Math.max(200, size.height - padY);

      const fitAllZoom = Math.min(availW / totalWidth, availH / slideHeight);
      const fitComfortZoom = Math.min(availW / (slideWidth * Math.min(targetProject.slides.length, 2.2)), availH / slideHeight);
      const zoom = Math.max(0.12, Math.min(1.2, size.width < 768 ? fitComfortZoom : Math.max(fitAllZoom, fitComfortZoom * 0.85)));

      const renderedWidth = totalWidth * zoom;
      const panX =
        renderedWidth <= size.width
          ? (size.width - renderedWidth) / 2
          : 28;
      const panY = (size.height - slideHeight * zoom) / 2;

      setViewport({ zoom, panX, panY });
    },
    [project, containerSize]
  );

  // Fit on initial measure
  useEffect(() => {
    if (!hasFittedInitially.current && containerSize.width > 100 && containerSize.height > 100) {
      hasFittedInitially.current = true;
      fitCanvasToViewport(project, containerSize);
    }
  }, [containerSize, fitCanvasToViewport, project]);

  const handleJumpToSlide = useCallback(
    (slideIdx: number) => {
      const { slideWidth, slideHeight } = getSlideDimensions(project);
      const clamped = Math.max(0, Math.min(project.slides.length - 1, slideIdx));
      const slideCenterX = clamped * slideWidth + slideWidth / 2;
      setViewport((vp) => ({
        ...vp,
        panX: containerSize.width / 2 - slideCenterX * vp.zoom,
        panY: (containerSize.height - slideHeight * vp.zoom) / 2,
      }));
    },
    [project, containerSize]
  );

  const handleZoomStep = useCallback(
    (delta: number) => {
      setViewport((vp) => {
        const nextZoom = Math.max(0.1, Math.min(2.2, vp.zoom + delta));
        const cx = containerSize.width / 2;
        const cy = containerSize.height / 2;
        const worldX = (cx - vp.panX) / vp.zoom;
        const worldY = (cy - vp.panY) / vp.zoom;
        return {
          zoom: nextZoom,
          panX: cx - worldX * nextZoom,
          panY: cy - worldY * nextZoom,
        };
      });
    },
    [containerSize]
  );

  // Layer CRUD
  const handleUpdateLayer = useCallback(
    (id: string, patch: Partial<CanvasLayer>, commitHistory = true) => {
      commitProject(
        (prev) => ({
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === id ? ({ ...l, ...patch } as CanvasLayer) : l
          ),
        }),
        commitHistory
      );
    },
    [commitProject]
  );

  const handleDeleteLayer = useCallback(
    (id: string) => {
      commitProject((prev) => ({
        ...prev,
        layers: prev.layers.filter((l) => l.id !== id),
      }));
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
        setMobileSheetMode((m) => (m === 'inspector' ? 'none' : m));
      }
    },
    [commitProject, selectedLayerId]
  );

  const handleDuplicateLayer = useCallback(
    (id: string) => {
      const newId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      commitProject((prev) => {
        const idx = prev.layers.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const source = prev.layers[idx];
        const copy: CanvasLayer = {
          ...JSON.parse(JSON.stringify(source)),
          id: newId,
          name: `${source.name} Copy`,
          x: source.x + 36,
          y: source.y + 36,
          locked: false,
        };
        const nextLayers = [...prev.layers];
        nextLayers.splice(idx + 1, 0, copy);
        return { ...prev, layers: nextLayers };
      });
      setSelectedLayerId(newId);
    },
    [commitProject]
  );

  const handleReorderLayer = useCallback(
    (id: string, direction: 'up' | 'down') => {
      commitProject((prev) => {
        const idx = prev.layers.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (targetIdx < 0 || targetIdx >= prev.layers.length) return prev;
        const next = [...prev.layers];
        const [item] = next.splice(idx, 1);
        next.splice(targetIdx, 0, item);
        return { ...prev, layers: next };
      });
    },
    [commitProject]
  );

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (isEditingInput) return;
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        if (isEditingInput) return;
        e.preventDefault();
        handleRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingInput) {
        if (selectedLayerId) {
          const layer = project.layers.find((l) => l.id === selectedLayerId);
          if (layer && !layer.locked) {
            e.preventDefault();
            handleDeleteLayer(selectedLayerId);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleDeleteLayer, selectedLayerId, project.layers]);

  // Multi-image upload handler
  const handleUploadFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const loaded = await Promise.all(
      validFiles.map(async (file) => {
        const meta = await readFileAsDataUrl(file);
        return {
          id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          src: meta.src,
          naturalWidth: meta.naturalWidth,
          naturalHeight: meta.naturalHeight,
        };
      })
    );

    setUploadedPhotos((prev) => [...loaded, ...prev]);

    // Also place uploaded photos onto the active slide automatically if user uploaded 1–3 photos
    const { slideWidth, slideHeight } = getSlideDimensions(project);
    const startSlideX = activeSlideIndex * slideWidth;
    const newLayers: ImageLayer[] = loaded.map((photo, i) => {
      const ratio = photo.naturalWidth / Math.max(1, photo.naturalHeight);
      const targetW = 680;
      const targetH = Math.round(targetW / Math.max(0.35, Math.min(2.5, ratio)));
      return {
        id: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'image',
        name: photo.name,
        src: photo.src,
        naturalWidth: photo.naturalWidth,
        naturalHeight: photo.naturalHeight,
        x: Math.round(startSlideX + (slideWidth - targetW) / 2 + i * 36),
        y: Math.round((slideHeight - targetH) / 2 + i * 36),
        width: targetW,
        height: targetH,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        mask: 'rounded',
        cornerRadius: 16,
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        polaroidCaption: '',
        filters: { ...DEFAULT_FILTERS },
        borderColor: '#FFFFFF',
        borderWidth: 0,
        shadowEnabled: true,
        shadowColor: '#000000',
        shadowBlur: 28,
        shadowOffsetX: 0,
        shadowOffsetY: 14,
        shadowOpacity: 0.3,
      };
    });

    commitProject((prev) => ({
      ...prev,
      layers: [...prev.layers, ...newLayers],
    }));

    if (newLayers.length > 0) {
      setSelectedLayerId(newLayers[newLayers.length - 1].id);
      setPanMode(false);
    }
  };

  const handleAddPhotoLayer = (photo: {
    name: string;
    src: string;
    naturalWidth: number;
    naturalHeight: number;
  }) => {
    const { slideWidth, slideHeight } = getSlideDimensions(project);
    const ratio = photo.naturalWidth / Math.max(1, photo.naturalHeight);
    const targetW = 700;
    const targetH = Math.round(targetW / Math.max(0.35, Math.min(2.5, ratio)));
    const newId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newLayer: ImageLayer = {
      id: newId,
      type: 'image',
      name: photo.name,
      src: photo.src,
      naturalWidth: photo.naturalWidth,
      naturalHeight: photo.naturalHeight,
      x: Math.round(activeSlideIndex * slideWidth + (slideWidth - targetW) / 2),
      y: Math.round((slideHeight - targetH) / 2),
      width: targetW,
      height: targetH,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      mask: 'rounded',
      cornerRadius: 16,
      cropX: 0,
      cropY: 0,
      cropWidth: 1,
      cropHeight: 1,
      polaroidCaption: '',
      filters: { ...DEFAULT_FILTERS },
      borderColor: '#FFFFFF',
      borderWidth: 0,
      shadowEnabled: true,
      shadowColor: '#000000',
      shadowBlur: 28,
      shadowOffsetX: 0,
      shadowOffsetY: 14,
      shadowOpacity: 0.3,
    };

    commitProject((prev) => ({ ...prev, layers: [...prev.layers, newLayer] }));
    setSelectedLayerId(newId);
    setPanMode(false);
    setMobileSheetMode('none');
  };

  const handleAddTextLayer = (preset: {
    text: string;
    fontFamily: CanvasFontFamily;
    fontSize: number;
    fontWeight: '400' | '600' | '700';
    fontStyle: 'normal' | 'italic';
    fill: string;
    backgroundColor: string;
    letterSpacing: number;
  }) => {
    const { slideWidth, slideHeight } = getSlideDimensions(project);
    const newId = `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const boxW = 760;

    // Smart contrast color if background is bright and preset text is white
    const activeBg =
      project.background.mode === 'global'
        ? project.background.global.color
        : project.background.perSlide[project.slides[activeSlideIndex]?.id]?.color ??
          project.background.global.color;
    const isLightBg =
      /^#[efdc]/i.test(activeBg) && !preset.backgroundColor;

    const newLayer: TextLayer = {
      id: newId,
      type: 'text',
      name: 'Text Layer',
      text: preset.text,
      x: Math.round(activeSlideIndex * slideWidth + (slideWidth - boxW) / 2),
      y: Math.round(slideHeight * 0.42),
      width: boxW,
      height: Math.round(preset.fontSize * 1.4),
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fontStyle: preset.fontStyle,
      fill: isLightBg ? '#1C1917' : preset.fill,
      align: 'center',
      letterSpacing: preset.letterSpacing,
      lineHeight: 1.2,
      backgroundColor: preset.backgroundColor,
      backgroundPadding: preset.backgroundColor ? 20 : 0,
      backgroundRadius: preset.backgroundColor ? 10 : 0,
      shadowEnabled: false,
      shadowColor: '#000000',
      shadowBlur: 16,
      shadowOffsetX: 0,
      shadowOffsetY: 6,
    };

    commitProject((prev) => ({ ...prev, layers: [...prev.layers, newLayer] }));
    setSelectedLayerId(newId);
    setPanMode(false);
    setMobileSheetMode('none');
  };

  const handleAddStickerLayer = (sticker: StickerAsset) => {
    const { slideWidth, slideHeight } = getSlideDimensions(project);
    const newId = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const targetW = 320;
    const targetH = Math.round(
      targetW * (sticker.viewBoxHeight / sticker.viewBoxWidth)
    );

    const newLayer: StickerLayer = {
      id: newId,
      type: 'sticker',
      name: sticker.name,
      stickerId: sticker.id,
      x: Math.round(activeSlideIndex * slideWidth + (slideWidth - targetW) / 2),
      y: Math.round((slideHeight - targetH) / 2),
      width: targetW,
      height: targetH,
      rotation: 0,
      opacity: sticker.defaultOpacity,
      locked: false,
      visible: true,
      fill: sticker.defaultFill,
      stroke: sticker.defaultStroke,
      strokeWidth: sticker.defaultStrokeWidth,
      shadowEnabled: false,
    };

    commitProject((prev) => ({ ...prev, layers: [...prev.layers, newLayer] }));
    setSelectedLayerId(newId);
    setPanMode(false);
    setMobileSheetMode('none');
  };

  // Slide Management
  const handleAddSlide = () => {
    if (project.slides.length >= 10) return;
    const nextIdx = project.slides.length;
    commitProject((prev) => ({
      ...prev,
      slides: [...prev.slides, { id: `slide-${Date.now()}` }],
    }));
    setTimeout(() => handleJumpToSlide(nextIdx), 60);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (project.slides.length <= 2) return;
    const idx = project.slides.findIndex((s) => s.id === slideId);
    if (idx === -1) return;
    const { slideWidth } = getSlideDimensions(project);
    const removedStart = idx * slideWidth;
    const removedEnd = (idx + 1) * slideWidth;

    commitProject((prev) => {
      const nextSlides = prev.slides.filter((s) => s.id !== slideId);
      const nextLayers = prev.layers
        .filter((l) => {
          const cx = l.x + l.width / 2;
          return cx < removedStart || cx >= removedEnd;
        })
        .map((l) => {
          if (l.x + l.width / 2 >= removedEnd) {
            return { ...l, x: l.x - slideWidth };
          }
          return l;
        });
      return {
        ...prev,
        slides: nextSlides,
        layers: nextLayers,
      };
    });
    setSelectedLayerId(null);
  };

  const handleMoveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= project.slides.length || fromIdx === toIdx) return;
    const { slideWidth } = getSlideDimensions(project);

    commitProject((prev) => {
      const nextSlides = [...prev.slides];
      const [moved] = nextSlides.splice(fromIdx, 1);
      nextSlides.splice(toIdx, 0, moved);

      // Swap layers centered in fromIdx and toIdx
      const fromStart = fromIdx * slideWidth;
      const fromEnd = (fromIdx + 1) * slideWidth;
      const toStart = toIdx * slideWidth;
      const toEnd = (toIdx + 1) * slideWidth;
      const delta = (toIdx - fromIdx) * slideWidth;

      const nextLayers = prev.layers.map((l) => {
        const cx = l.x + l.width / 2;
        if (cx >= fromStart && cx < fromEnd) {
          return { ...l, x: l.x + delta };
        }
        if (cx >= toStart && cx < toEnd) {
          return { ...l, x: l.x - delta };
        }
        return l;
      });

      return { ...prev, slides: nextSlides, layers: nextLayers };
    });

    setTimeout(() => handleJumpToSlide(toIdx), 40);
  };

  const handleAspectRatioChange = (ratio: AspectRatioId) => {
    if (ratio === project.aspectRatio) return;
    const nextProject = { ...project, aspectRatio: ratio };
    commitProject(() => nextProject);
    setTimeout(() => fitCanvasToViewport(nextProject, containerSize), 40);
  };

  const handleApplyTemplate = (tpl: CarouselTemplate) => {
    const fresh = instantiateTemplate(tpl);
    commitProject(() => fresh);
    setSelectedLayerId(null);
    setMobileSheetMode('none');
    setTimeout(() => fitCanvasToViewport(fresh, containerSize), 50);
  };

  const selectedLayer = useMemo(
    () => project.layers.find((l) => l.id === selectedLayerId) ?? null,
    [project.layers, selectedLayerId]
  );

  const navTabs: { id: StudioToolTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'photos', label: 'Photos', Icon: ImagePlus },
    { id: 'text', label: 'Text', Icon: Type },
    { id: 'stickers', label: 'Stickers', Icon: Shapes },
    { id: 'background', label: 'Backdrop', Icon: Palette },
    { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
    { id: 'layers', label: 'Layers', Icon: Layers },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F4F4F7] dark:bg-[#0F0F12] text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* TOP STUDIO BAR */}
      <header className="h-14 shrink-0 px-3 sm:px-5 flex items-center justify-between gap-3 bg-white dark:bg-[#1A1A20] border-b border-zinc-200 dark:border-zinc-800/90 z-30">
        {/* Left: Brand & Undo/Redo */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
            PanoFrame
          </span>

          <div className="flex items-center gap-0.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.past.length === 0}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={history.future.length === 0}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Aspect Ratio Selector */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {(Object.keys(ASPECT_RATIOS) as AspectRatioId[]).map((ratioKey) => {
            const spec = ASPECT_RATIOS[ratioKey];
            const active = project.aspectRatio === ratioKey;
            return (
              <button
                key={ratioKey}
                type="button"
                onClick={() => handleAspectRatioChange(ratioKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {spec.label}
              </button>
            );
          })}
        </div>

        {/* Mobile compact ratio switch */}
        <div className="flex md:hidden items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {(Object.keys(ASPECT_RATIOS) as AspectRatioId[]).map((ratioKey) => (
            <button
              key={ratioKey}
              type="button"
              onClick={() => handleAspectRatioChange(ratioKey)}
              className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                project.aspectRatio === ratioKey
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {ratioKey}
            </button>
          ))}
        </div>

        {/* Right: Theme Toggle & Export CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to Light Studio' : 'Switch to Dark Studio'}
            aria-label="Toggle dark mode"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* DESKTOP LEFT RAIL + TOOL DRAWER */}
        <aside className="hidden lg:flex shrink-0 bg-white dark:bg-[#1A1A20] border-r border-zinc-200 dark:border-zinc-800/90 z-20">
          {/* Icon Rail */}
          <nav
            aria-label="Studio tools"
            className="w-[72px] flex flex-col items-center py-3 gap-1.5 border-r border-zinc-200 dark:border-zinc-800/80"
          >
            {navTabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`w-14 min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#6366F1]/14 text-[#6366F1] dark:text-[#818CF8]'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tool Panel Content */}
          <div className="w-72 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white capitalize">
                {activeTab === 'background' ? 'Backdrop & Texture' : activeTab}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ToolDrawerContent
                activeTab={activeTab}
                project={project}
                activeSlideIndex={activeSlideIndex}
                selectedLayerId={selectedLayerId}
                uploadedPhotos={uploadedPhotos}
                onUploadFiles={handleUploadFiles}
                onAddPhotoLayer={handleAddPhotoLayer}
                onAddTextLayer={handleAddTextLayer}
                onAddStickerLayer={handleAddStickerLayer}
                onUpdateBackground={(bg: BackgroundConfig, commit = true) =>
                  commitProject((prev) => ({ ...prev, background: bg }), commit)
                }
                onApplyTemplate={handleApplyTemplate}
                onSelectLayer={(id) => {
                  setSelectedLayerId(id);
                  setPanMode(false);
                }}
                onReorderLayer={handleReorderLayer}
                onToggleLockLayer={(id) => {
                  const l = project.layers.find((x) => x.id === id);
                  if (l) handleUpdateLayer(id, { locked: !l.locked });
                }}
                onToggleVisibleLayer={(id) => {
                  const l = project.layers.find((x) => x.id === id);
                  if (l) handleUpdateLayer(id, { visible: !l.visible });
                }}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
              />
            </div>
          </div>
        </aside>

        {/* CENTER PANORAMIC CANVAS + MINI-MAP */}
        <main className="flex-1 min-w-0 flex flex-col relative bg-[#E8E8EE] dark:bg-[#0F0F12]">
          <div className="flex-1 min-h-0 relative">
            <PanoramicCanvas
              project={project}
              selectedLayerId={selectedLayerId}
              onSelectLayer={(id) => {
                setSelectedLayerId(id);
                if (!id) {
                  setMobileSheetMode((m) => (m === 'inspector' ? 'none' : m));
                }
              }}
              onUpdateLayer={handleUpdateLayer}
              onEditTextLayer={(layer) => setEditingTextLayer(layer)}
              viewport={viewport}
              onViewportChange={setViewport}
              onContainerSizeChange={setContainerSize}
              theme={theme}
              panMode={panMode}
              snapEnabled={snapEnabled}
            />

            {/* Mobile Floating Contextual Quick Actions when a layer is selected */}
            {selectedLayer && (
              <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-2xl bg-white/95 dark:bg-[#1A1A20]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <button
                  type="button"
                  onClick={() => setMobileSheetMode('inspector')}
                  className="min-h-[38px] px-3 rounded-xl bg-[#6366F1] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Edit {selectedLayer.type}</span>
                </button>
                {selectedLayer.type === 'text' && (
                  <button
                    type="button"
                    onClick={() => setEditingTextLayer(selectedLayer)}
                    className="min-h-[38px] px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Type
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDuplicateLayer(selectedLayer.id)}
                  aria-label="Duplicate layer"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLayer(selectedLayer.id)}
                  aria-label="Delete layer"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <MiniMapBar
            project={project}
            viewport={viewport}
            containerSize={containerSize}
            onJumpToSlide={handleJumpToSlide}
            onViewportChange={setViewport}
            onZoomStep={handleZoomStep}
            onFitView={() => fitCanvasToViewport(project, containerSize)}
            onAddSlide={handleAddSlide}
            onDeleteSlide={handleDeleteSlide}
            onMoveSlide={handleMoveSlide}
            activeSlideIndex={activeSlideIndex}
            panMode={panMode}
            onTogglePanMode={() => setPanMode((p) => !p)}
            snapEnabled={snapEnabled}
            onToggleSnap={() => setSnapEnabled((s) => !s)}
          />
        </main>

        {/* DESKTOP RIGHT CONTEXTUAL INSPECTOR */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-white dark:bg-[#1A1A20] border-l border-zinc-200 dark:border-zinc-800/90 z-20 min-h-0">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {selectedLayer ? selectedLayer.name : 'Inspector'}
            </h2>
            {selectedLayer?.type === 'text' && (
              <button
                type="button"
                onClick={() => setEditingTextLayer(selectedLayer)}
                className="text-xs font-medium text-[#6366F1] hover:underline whitespace-nowrap cursor-pointer"
              >
                Pop-out Editor
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedLayer ? (
              <ElementInspector
                layer={selectedLayer}
                onUpdate={handleUpdateLayer}
                onReorder={handleReorderLayer}
                onDuplicate={handleDuplicateLayer}
                onDelete={handleDeleteLayer}
              />
            ) : (
              <div className="flex flex-col gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                  Click any photo, text box, or sticker on the canvas to adjust crop masks, filters, typography, shadows, or layer order.
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Canvas Shortcuts
                  </span>
                  <div className="flex justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/70">
                    <span>Zoom</span>
                    <span className="font-mono-tabular">Ctrl + Scroll</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/70">
                    <span>Edit Text</span>
                    <span className="font-mono-tabular">Double-Click</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/70">
                    <span>Undo / Redo</span>
                    <span className="font-mono-tabular">Ctrl+Z / Ctrl+Y</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Delete Selected</span>
                    <span className="font-mono-tabular">Backspace / Del</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <nav
        aria-label="Mobile studio tools"
        className="lg:hidden shrink-0 grid grid-cols-6 bg-white dark:bg-[#1A1A20] border-t border-zinc-200 dark:border-zinc-800 z-30"
      >
        {navTabs.map(({ id, label, Icon }) => {
          const isOpen = mobileSheetMode === 'tool' && activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (mobileSheetMode === 'tool' && activeTab === id) {
                  setMobileSheetMode('none');
                } else {
                  setActiveTab(id);
                  setMobileSheetMode('tool');
                }
              }}
              className={`min-h-[54px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                isOpen
                  ? 'text-[#6366F1] dark:text-[#818CF8]'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE BOTTOM SHEET DRAWER */}
      {mobileSheetMode !== 'none' && (
        <div className="lg:hidden fixed inset-x-0 bottom-[55px] z-40 max-h-[62vh] flex flex-col rounded-t-3xl bg-white dark:bg-[#1A1A20] border-t border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white capitalize pt-2">
              {mobileSheetMode === 'inspector'
                ? selectedLayer?.name ?? 'Inspector'
                : activeTab === 'background'
                  ? 'Backdrop & Texture'
                  : activeTab}
            </h3>
            <button
              type="button"
              onClick={() => setMobileSheetMode('none')}
              aria-label="Close drawer"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {mobileSheetMode === 'inspector' && selectedLayer ? (
              <ElementInspector
                layer={selectedLayer}
                onUpdate={handleUpdateLayer}
                onReorder={handleReorderLayer}
                onDuplicate={handleDuplicateLayer}
                onDelete={handleDeleteLayer}
              />
            ) : (
              <ToolDrawerContent
                activeTab={activeTab}
                project={project}
                activeSlideIndex={activeSlideIndex}
                selectedLayerId={selectedLayerId}
                uploadedPhotos={uploadedPhotos}
                onUploadFiles={handleUploadFiles}
                onAddPhotoLayer={handleAddPhotoLayer}
                onAddTextLayer={handleAddTextLayer}
                onAddStickerLayer={handleAddStickerLayer}
                onUpdateBackground={(bg, commit = true) =>
                  commitProject((prev) => ({ ...prev, background: bg }), commit)
                }
                onApplyTemplate={handleApplyTemplate}
                onSelectLayer={(id) => {
                  setSelectedLayerId(id);
                  setPanMode(false);
                }}
                onReorderLayer={handleReorderLayer}
                onToggleLockLayer={(id) => {
                  const l = project.layers.find((x) => x.id === id);
                  if (l) handleUpdateLayer(id, { locked: !l.locked });
                }}
                onToggleVisibleLayer={(id) => {
                  const l = project.layers.find((x) => x.id === id);
                  if (l) handleUpdateLayer(id, { visible: !l.visible });
                }}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
              />
            )}
          </div>
        </div>
      )}

      {/* INLINE TEXT EDITOR MODAL */}
      <TextEditorModal
        layer={editingTextLayer}
        onSave={(id, text) => handleUpdateLayer(id, { text }, true)}
        onClose={() => setEditingTextLayer(null)}
      />

      {/* HIGH-RESOLUTION EXPORT MODAL */}
      <ExportModal
        open={exportOpen}
        project={project}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
