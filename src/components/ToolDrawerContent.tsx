import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Plus,
  Trash2,
  Type,
  Unlock,
  Upload,
  Shapes,
} from 'lucide-react';
import {
  BackgroundConfig,
  CanvasFontFamily,
  CanvasLayer,
  CarouselTemplate,
  PaperTextureType,
  ProjectState,
  SlideFill,
  StudioToolTab,
  UploadedPhoto,
} from '../types/studio';
import { STICKER_LIBRARY, StickerAsset } from '../data/stickers';
import { CAROUSEL_TEMPLATES, SAMPLE_LIBRARY_PHOTOS } from '../data/templates';

interface ToolDrawerContentProps {
  activeTab: StudioToolTab;
  project: ProjectState;
  activeSlideIndex: number;
  selectedLayerId: string | null;
  uploadedPhotos: UploadedPhoto[];
  onUploadFiles: (files: FileList) => void;
  onAddPhotoLayer: (photo: { name: string; src: string; naturalWidth: number; naturalHeight: number }) => void;
  onAddTextLayer: (preset: {
    text: string;
    fontFamily: CanvasFontFamily;
    fontSize: number;
    fontWeight: '400' | '600' | '700';
    fontStyle: 'normal' | 'italic';
    fill: string;
    backgroundColor: string;
    letterSpacing: number;
  }) => void;
  onAddStickerLayer: (sticker: StickerAsset) => void;
  onUpdateBackground: (bg: BackgroundConfig, commitHistory?: boolean) => void;
  onApplyTemplate: (template: CarouselTemplate) => void;
  onSelectLayer: (id: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onToggleLockLayer: (id: string) => void;
  onToggleVisibleLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
}

const SOLID_SWATCHES = [
  '#0F0F12',
  '#18181B',
  '#27272A',
  '#EFECE6',
  '#F6F2EA',
  '#FFFFFF',
  '#E5DEC9',
  '#1E1B4B',
  '#0F766E',
  '#7C2D12',
];

const GRADIENT_PRESETS: { name: string; colors: [string, string]; angle: number }[] = [
  { name: 'Obsidian Indigo', colors: ['#0D0E14', '#1E1B4B'], angle: 120 },
  { name: 'Warm Sand', colors: ['#EFECE6', '#D6CBB8'], angle: 135 },
  { name: 'Espresso Dusk', colors: ['#1C1917', '#3F2E26'], angle: 145 },
  { name: 'Alpine Mist', colors: ['#E2E8F0', '#94A3B8'], angle: 160 },
  { name: 'Terracotta Glow', colors: ['#9A3412', '#F59E0B'], angle: 125 },
  { name: 'Sage Linen', colors: ['#ECFDF5', '#A7F3D0'], angle: 140 },
];

export const ToolDrawerContent: React.FC<ToolDrawerContentProps> = ({
  activeTab,
  project,
  activeSlideIndex,
  selectedLayerId,
  uploadedPhotos,
  onUploadFiles,
  onAddPhotoLayer,
  onAddTextLayer,
  onAddStickerLayer,
  onUpdateBackground,
  onApplyTemplate,
  onSelectLayer,
  onReorderLayer,
  onToggleLockLayer,
  onToggleVisibleLayer,
  onDuplicateLayer,
  onDeleteLayer,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stickerCategory, setStickerCategory] = useState<'all' | StickerAsset['category']>('all');

  const activeSlide = project.slides[activeSlideIndex] ?? project.slides[0];
  const currentFill: SlideFill =
    project.background.mode === 'global'
      ? project.background.global
      : project.background.perSlide[activeSlide?.id] ?? project.background.global;

  const updateCurrentFill = (patch: Partial<SlideFill>, commit = true) => {
    const nextFill = { ...currentFill, ...patch };
    if (project.background.mode === 'global') {
      onUpdateBackground(
        {
          ...project.background,
          global: nextFill,
        },
        commit
      );
    } else if (activeSlide) {
      onUpdateBackground(
        {
          ...project.background,
          perSlide: {
            ...project.background.perSlide,
            [activeSlide.id]: nextFill,
          },
        },
        commit
      );
    }
  };

  if (activeTab === 'photos') {
    return (
      <div className="flex flex-col gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Multiple Photos</span>
        </button>

        {uploadedPhotos.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Your Uploads ({uploadedPhotos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {uploadedPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onAddPhotoLayer(photo)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] transition-colors cursor-pointer"
                >
                  <img
                    src={photo.src}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/75 to-transparent text-[11px] text-white truncate text-left">
                    {photo.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Studio Stock Library
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_LIBRARY_PHOTOS.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onAddPhotoLayer(photo)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] transition-colors cursor-pointer"
              >
                <img
                  src={photo.src}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/75 to-transparent text-[11px] text-white truncate text-left">
                  {photo.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'text') {
    const presets: Array<{
      label: string;
      preview: string;
      fontFamily: CanvasFontFamily;
      fontSize: number;
      fontWeight: '400' | '600' | '700';
      fontStyle: 'normal' | 'italic';
      fill: string;
      backgroundColor: string;
      letterSpacing: number;
    }> = [
      {
        label: 'Editorial Serif Headline',
        preview: 'Quiet Luxury',
        fontFamily: 'Playfair Display',
        fontSize: 96,
        fontWeight: '600',
        fontStyle: 'normal',
        fill: '#FFFFFF',
        backgroundColor: '',
        letterSpacing: -1,
      },
      {
        label: 'Bold Condensed Display',
        preview: 'NEW COLLECTION',
        fontFamily: 'Bebas Neue',
        fontSize: 140,
        fontWeight: '700',
        fontStyle: 'normal',
        fill: '#FFFFFF',
        backgroundColor: '',
        letterSpacing: 4,
      },
      {
        label: 'Clean Body & Caption',
        preview: 'Add a story or editorial caption here.',
        fontFamily: 'Montserrat',
        fontSize: 34,
        fontWeight: '400',
        fontStyle: 'normal',
        fill: '#FFFFFF',
        backgroundColor: '',
        letterSpacing: 0,
      },
      {
        label: 'Highlighted Label',
        preview: 'SWIPE TO EXPLORE',
        fontFamily: 'Inter',
        fontSize: 30,
        fontWeight: '600',
        fontStyle: 'normal',
        fill: '#FFFFFF',
        backgroundColor: '#6366F1',
        letterSpacing: 3,
      },
      {
        label: 'Handwritten Script',
        preview: 'captured on 35mm',
        fontFamily: 'Caveat',
        fontSize: 78,
        fontWeight: '700',
        fontStyle: 'normal',
        fill: '#FFFFFF',
        backgroundColor: '',
        letterSpacing: 1,
      },
    ];

    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() =>
            onAddTextLayer({
              text: 'Double-tap to edit text',
              fontFamily: 'Playfair Display',
              fontSize: 72,
              fontWeight: '600',
              fontStyle: 'normal',
              fill: '#FFFFFF',
              backgroundColor: '',
              letterSpacing: 0,
            })
          }
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Text Box</span>
        </button>

        <div className="flex flex-col gap-2 pt-1">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Typography Presets
          </h3>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                onAddTextLayer({
                  text: p.preview,
                  fontFamily: p.fontFamily,
                  fontSize: p.fontSize,
                  fontWeight: p.fontWeight,
                  fontStyle: p.fontStyle,
                  fill: p.fill,
                  backgroundColor: p.backgroundColor,
                  letterSpacing: p.letterSpacing,
                })
              }
              className="w-full p-3 rounded-xl text-left bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] transition-colors cursor-pointer"
            >
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                {p.label}
              </div>
              <div
                className="text-lg text-zinc-900 dark:text-zinc-100 truncate"
                style={{
                  fontFamily: p.fontFamily,
                  fontWeight: Number(p.fontWeight),
                  fontStyle: p.fontStyle,
                }}
              >
                {p.preview}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'stickers') {
    const categories: Array<{ id: 'all' | StickerAsset['category']; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'paper', label: 'Tape & Paper' },
      { id: 'arrows', label: 'Arrows' },
      { id: 'shapes', label: 'Shapes' },
      { id: 'frames', label: 'Frames' },
    ];
    const filtered =
      stickerCategory === 'all'
        ? STICKER_LIBRARY
        : STICKER_LIBRARY.filter((s) => s.category === stickerCategory);

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setStickerCategory(cat.id)}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                stickerCategory === cat.id
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {filtered.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => onAddStickerLayer(sticker)}
              className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] flex flex-col items-center gap-2 transition-colors cursor-pointer"
            >
              <div className="w-full h-14 flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${sticker.viewBoxWidth} ${sticker.viewBoxHeight}`}
                  className="max-w-full max-h-full"
                >
                  <path
                    d={sticker.pathData}
                    fill={
                      sticker.defaultFill === '#FFFFFF'
                        ? 'currentColor'
                        : sticker.defaultFill
                    }
                    fillRule="evenodd"
                    className={
                      sticker.defaultFill === '#FFFFFF'
                        ? 'text-zinc-800 dark:text-zinc-100'
                        : ''
                    }
                  />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 truncate w-full text-center">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'background') {
    const textures: { id: PaperTextureType; label: string }[] = [
      { id: 'none', label: 'Clean' },
      { id: 'fine-grain', label: 'Fine Grain' },
      { id: 'warm-paper', label: 'Warm Paper' },
      { id: 'linen', label: 'Linen Weave' },
    ];

    return (
      <div className="flex flex-col gap-4">
        {/* Global vs Per-Slide Mode */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Scope
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() =>
                onUpdateBackground({ ...project.background, mode: 'global' }, true)
              }
              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                project.background.mode === 'global'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Entire Panorama
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateBackground({ ...project.background, mode: 'per-slide' }, true)
              }
              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                project.background.mode === 'per-slide'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Slide {activeSlideIndex + 1} Only
            </button>
          </div>
        </div>

        {/* Fill Type */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Fill Type
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {(
              [
                { id: 'solid', label: 'Solid' },
                { id: 'linear-gradient', label: 'Linear' },
                { id: 'radial-gradient', label: 'Radial' },
              ] as const
            ).map((ft) => (
              <button
                key={ft.id}
                type="button"
                onClick={() => updateCurrentFill({ type: ft.id }, true)}
                className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentFill.type === ft.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {currentFill.type === 'solid' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Color
              </span>
              <input
                type="color"
                value={currentFill.color}
                onChange={(e) => updateCurrentFill({ color: e.target.value }, false)}
                onBlur={(e) => updateCurrentFill({ color: e.target.value }, true)}
                className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer"
                aria-label="Custom background color"
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SOLID_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => updateCurrentFill({ color: hex }, true)}
                  className={`h-9 rounded-lg border transition-transform hover:scale-105 cursor-pointer ${
                    currentFill.color.toLowerCase() === hex.toLowerCase()
                      ? 'border-[#6366F1] ring-2 ring-[#6366F1]/40'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={`Set color ${hex}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>Start Color</span>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <input
                    type="color"
                    value={currentFill.gradientColors[0]}
                    onChange={(e) =>
                      updateCurrentFill(
                        {
                          gradientColors: [e.target.value, currentFill.gradientColors[1]],
                        },
                        true
                      )
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                  <span className="font-mono-tabular text-[11px]">
                    {currentFill.gradientColors[0]}
                  </span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>End Color</span>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <input
                    type="color"
                    value={currentFill.gradientColors[1]}
                    onChange={(e) =>
                      updateCurrentFill(
                        {
                          gradientColors: [currentFill.gradientColors[0], e.target.value],
                        },
                        true
                      )
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                  <span className="font-mono-tabular text-[11px]">
                    {currentFill.gradientColors[1]}
                  </span>
                </div>
              </label>
            </div>

            {currentFill.type === 'linear-gradient' && (
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Angle</span>
                  <span className="font-mono-tabular">{currentFill.gradientAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={currentFill.gradientAngle}
                  onChange={(e) =>
                    updateCurrentFill({ gradientAngle: Number(e.target.value) }, false)
                  }
                  onMouseUp={(e) =>
                    updateCurrentFill(
                      { gradientAngle: Number((e.target as HTMLInputElement).value) },
                      true
                    )
                  }
                  className="accent-[#6366F1]"
                />
              </label>
            )}

            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((gp) => (
                <button
                  key={gp.name}
                  type="button"
                  onClick={() =>
                    updateCurrentFill(
                      {
                        gradientColors: gp.colors,
                        gradientAngle: gp.angle,
                      },
                      true
                    )
                  }
                  className="h-11 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] transition-colors cursor-pointer"
                  style={{
                    background: `linear-gradient(${gp.angle}deg, ${gp.colors[0]}, ${gp.colors[1]})`,
                  }}
                  title={gp.name}
                  aria-label={gp.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paper & Grain Overlay */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Paper & Grain Texture
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {textures.map((tex) => (
              <button
                key={tex.id}
                type="button"
                onClick={() =>
                  onUpdateBackground(
                    {
                      ...project.background,
                      paperTexture: tex.id,
                      grainIntensity:
                        tex.id === 'none'
                          ? 0
                          : Math.max(0.14, project.background.grainIntensity),
                    },
                    true
                  )
                }
                className={`min-h-[38px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  project.background.paperTexture === tex.id
                    ? 'bg-[#6366F1] text-white border-[#6366F1]'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {tex.label}
              </button>
            ))}
          </div>
          {project.background.paperTexture !== 'none' && (
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              <div className="flex justify-between">
                <span>Grain Strength</span>
                <span className="font-mono-tabular">
                  {Math.round(project.background.grainIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.45}
                step={0.02}
                value={project.background.grainIntensity}
                onChange={(e) =>
                  onUpdateBackground(
                    {
                      ...project.background,
                      grainIntensity: Number(e.target.value),
                    },
                    true
                  )
                }
                className="accent-[#6366F1]"
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'templates') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Start from an editable panoramic layout. Photos, typography, and colors can all be customized.
        </p>
        {CAROUSEL_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onApplyTemplate(tpl)}
            className="group w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#6366F1] text-left transition-colors cursor-pointer"
          >
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 h-24 rounded-lg overflow-hidden">
              {tpl.previewImages.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={tpl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {tpl.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {tpl.subtitle}
                </div>
              </div>
              <span className="text-xs font-medium text-[#6366F1] shrink-0">
                Use
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Layers tab (render top-most layer first)
  const reversedLayers = [...project.layers].reverse();

  return (
    <div className="flex flex-col gap-2">
      {reversedLayers.length === 0 ? (
        <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
          No layers yet. Add photos, text, or stickers from the toolbar.
        </div>
      ) : (
        reversedLayers.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#6366F1]/12 border-[#6366F1]'
                  : 'bg-zinc-100/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                {layer.type === 'image' ? (
                  <img
                    src={layer.src}
                    alt={layer.name}
                    className="w-full h-full object-cover"
                  />
                ) : layer.type === 'text' ? (
                  <Type className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                ) : (
                  <Shapes className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {layer.type === 'text' ? layer.text.replace(/\n/g, ' ') : layer.name}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 hidden" />
                  <span>{layer.type}</span>
                </div>
              </div>

              <div
                className="flex items-center gap-0.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onReorderLayer(layer.id, 'up')}
                  title="Bring Forward"
                  aria-label="Bring Forward"
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorderLayer(layer.id, 'down')}
                  title="Send Backward"
                  aria-label="Send Backward"
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleVisibleLayer(layer.id)}
                  title={layer.visible ? 'Hide' : 'Show'}
                  aria-label={layer.visible ? 'Hide' : 'Show'}
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  {layer.visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 opacity-50" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLockLayer(layer.id)}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                  aria-label={layer.locked ? 'Unlock' : 'Lock'}
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateLayer(layer.id)}
                  title="Duplicate"
                  aria-label="Duplicate"
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLayer(layer.id)}
                  title="Delete"
                  aria-label="Delete"
                  className="min-h-[32px] min-w-[28px] flex items-center justify-center rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
