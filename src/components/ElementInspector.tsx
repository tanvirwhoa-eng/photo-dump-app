import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  CANVAS_FONTS,
  CanvasFontFamily,
  CanvasLayer,
  FilterPreset,
  ImageLayer,
  ImageMaskType,
  StickerLayer,
  TextLayer,
} from '../types/studio';
import { DEFAULT_FILTERS } from '../data/templates';

interface ElementInspectorProps {
  layer: CanvasLayer;
  onUpdate: (id: string, patch: Partial<CanvasLayer>, commitHistory?: boolean) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const COLOR_SWATCHES = [
  '#FFFFFF',
  '#1C1917',
  '#6366F1',
  '#F59E0B',
  '#0F766E',
  '#E11D48',
  '#EFECE6',
  '#D4A373',
];

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  layer,
  onUpdate,
  onReorder,
  onDuplicate,
  onDelete,
}) => {
  const applyFilterPreset = (imgLayer: ImageLayer, preset: FilterPreset) => {
    if (preset === 'none') {
      onUpdate(imgLayer.id, { filters: { ...DEFAULT_FILTERS } }, true);
    } else if (preset === 'vintage') {
      onUpdate(
        imgLayer.id,
        {
          filters: {
            preset: 'vintage',
            brightness: 0.03,
            contrast: 10,
            saturation: -0.2,
            grayscale: false,
            sepia: true,
          },
        },
        true
      );
    } else if (preset === 'grayscale') {
      onUpdate(
        imgLayer.id,
        {
          filters: {
            preset: 'grayscale',
            brightness: 0,
            contrast: 18,
            saturation: 0,
            grayscale: true,
            sepia: false,
          },
        },
        true
      );
    } else if (preset === 'crisp') {
      onUpdate(
        imgLayer.id,
        {
          filters: {
            preset: 'crisp',
            brightness: 0.04,
            contrast: 22,
            saturation: 0.18,
            grayscale: false,
            sepia: false,
          },
        },
        true
      );
    } else if (preset === 'warm') {
      onUpdate(
        imgLayer.id,
        {
          filters: {
            preset: 'warm',
            brightness: 0.05,
            contrast: 6,
            saturation: 0.24,
            grayscale: false,
            sepia: false,
          },
        },
        true
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Layer Actions */}
      <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onReorder(layer.id, 'up')}
          title="Bring Forward"
          className="flex-1 min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onReorder(layer.id, 'down')}
          title="Send Backward"
          className="flex-1 min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onUpdate(layer.id, { locked: !layer.locked }, true)}
          title={layer.locked ? 'Unlock' : 'Lock'}
          className="flex-1 min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          {layer.locked ? (
            <Lock className="w-4 h-4 text-amber-500" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(layer.id)}
          title="Duplicate"
          className="flex-1 min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(layer.id)}
          title="Delete"
          className="flex-1 min-h-[36px] flex items-center justify-center rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Common Opacity */}
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex justify-between">
          <span>Opacity</span>
          <span className="font-mono-tabular">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(e) => onUpdate(layer.id, { opacity: Number(e.target.value) }, true)}
          className="accent-[#6366F1]"
        />
      </label>

      {/* IMAGE INSPECTOR */}
      {layer.type === 'image' && (
        <>
          {/* Crop & Mask Shape */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Frame & Crop Mask
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'none', label: 'Sharp' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'polaroid', label: 'Polaroid' },
                  { id: 'free-crop', label: 'Free Crop' },
                ] as { id: ImageMaskType; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onUpdate(
                      layer.id,
                      {
                        mask: m.id,
                        cornerRadius:
                          m.id === 'rounded' && layer.cornerRadius < 12
                            ? 24
                            : layer.cornerRadius,
                      },
                      true
                    )
                  }
                  className={`min-h-[36px] px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    layer.mask === m.id
                      ? 'bg-[#6366F1] text-white border-[#6366F1]'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {layer.mask === 'polaroid' && (
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                <span>Polaroid Note</span>
                <input
                  type="text"
                  value={layer.polaroidCaption}
                  onChange={(e) =>
                    onUpdate(layer.id, { polaroidCaption: e.target.value }, true)
                  }
                  placeholder="Write a handwritten note..."
                  className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-[#6366F1]"
                />
              </label>
            )}

            {layer.mask === 'free-crop' && (
              <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Crop Zoom</span>
                    <span className="font-mono-tabular">
                      {Math.round((1 / Math.max(0.2, layer.cropWidth)) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={1}
                    step={0.05}
                    value={layer.cropWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const maxOffset = Math.max(0, 1 - val);
                      onUpdate(
                        layer.id,
                        {
                          cropWidth: val,
                          cropHeight: val,
                          cropX: Math.min(layer.cropX, maxOffset),
                          cropY: Math.min(layer.cropY, maxOffset),
                        },
                        true
                      );
                    }}
                    className="accent-[#6366F1]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Pan Horizontal</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.01, 1 - layer.cropWidth)}
                    step={0.02}
                    value={layer.cropX}
                    onChange={(e) =>
                      onUpdate(layer.id, { cropX: Number(e.target.value) }, true)
                    }
                    className="accent-[#6366F1]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Pan Vertical</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.01, 1 - layer.cropHeight)}
                    step={0.02}
                    value={layer.cropY}
                    onChange={(e) =>
                      onUpdate(layer.id, { cropY: Number(e.target.value) }, true)
                    }
                    className="accent-[#6366F1]"
                  />
                </label>
              </div>
            )}

            {(layer.mask === 'rounded' || layer.mask === 'none' || layer.mask === 'free-crop') && (
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Corner Radius</span>
                  <span className="font-mono-tabular">{layer.cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={140}
                  step={4}
                  value={layer.cornerRadius}
                  onChange={(e) =>
                    onUpdate(layer.id, { cornerRadius: Number(e.target.value) }, true)
                  }
                  className="accent-[#6366F1]"
                />
              </label>
            )}
          </div>

          {/* Filters & Adjustments */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Filters & Tone
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'none', label: 'Natural' },
                  { id: 'vintage', label: 'Vintage' },
                  { id: 'grayscale', label: 'B&W' },
                  { id: 'crisp', label: 'Crisp' },
                  { id: 'warm', label: 'Warm' },
                ] as { id: FilterPreset; label: string }[]
              ).map((fp) => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => applyFilterPreset(layer, fp.id)}
                  className={`min-h-[34px] px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    layer.filters.preset === fp.id
                      ? 'bg-[#6366F1] text-white border-[#6366F1]'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {fp.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Brightness</span>
                <span className="font-mono-tabular">
                  {Math.round(layer.filters.brightness * 100)}
                </span>
              </div>
              <input
                type="range"
                min={-0.35}
                max={0.35}
                step={0.03}
                value={layer.filters.brightness}
                onChange={(e) =>
                  onUpdate(
                    layer.id,
                    {
                      filters: {
                        ...layer.filters,
                        preset: 'none',
                        brightness: Number(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="accent-[#6366F1]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Contrast</span>
                <span className="font-mono-tabular">{layer.filters.contrast}</span>
              </div>
              <input
                type="range"
                min={-40}
                max={45}
                step={2}
                value={layer.filters.contrast}
                onChange={(e) =>
                  onUpdate(
                    layer.id,
                    {
                      filters: {
                        ...layer.filters,
                        preset: 'none',
                        contrast: Number(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="accent-[#6366F1]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Saturation</span>
                <span className="font-mono-tabular">
                  {Math.round(layer.filters.saturation * 100)}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={layer.filters.saturation}
                onChange={(e) =>
                  onUpdate(
                    layer.id,
                    {
                      filters: {
                        ...layer.filters,
                        preset: 'none',
                        saturation: Number(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="accent-[#6366F1]"
              />
            </label>
          </div>

          {/* Border & Drop Shadow */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Outline & Shadow
            </span>
            <div className="flex items-center justify-between gap-2">
              <label className="flex-1 flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Border</span>
                  <span className="font-mono-tabular">{layer.borderWidth}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={layer.borderWidth}
                  onChange={(e) =>
                    onUpdate(layer.id, { borderWidth: Number(e.target.value) }, true)
                  }
                  className="accent-[#6366F1]"
                />
              </label>
              <input
                type="color"
                value={layer.borderColor}
                onChange={(e) =>
                  onUpdate(layer.id, { borderColor: e.target.value }, true)
                }
                aria-label="Border color"
                className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer shrink-0"
              />
            </div>

            <label className="flex items-center justify-between min-h-[36px] text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <span>Drop Shadow</span>
              <input
                type="checkbox"
                checked={layer.shadowEnabled}
                onChange={(e) =>
                  onUpdate(layer.id, { shadowEnabled: e.target.checked }, true)
                }
                className="w-4 h-4 accent-[#6366F1]"
              />
            </label>

            {layer.shadowEnabled && (
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Shadow Blur</span>
                  <span className="font-mono-tabular">{layer.shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={80}
                  step={2}
                  value={layer.shadowBlur}
                  onChange={(e) =>
                    onUpdate(layer.id, { shadowBlur: Number(e.target.value) }, true)
                  }
                  className="accent-[#6366F1]"
                />
              </label>
            )}
          </div>
        </>
      )}

      {/* TEXT INSPECTOR */}
      {layer.type === 'text' && (
        <TextInspectorFields
          layer={layer}
          onUpdate={(patch, commit = true) => onUpdate(layer.id, patch, commit)}
        />
      )}

      {/* STICKER INSPECTOR */}
      {layer.type === 'sticker' && (
        <StickerInspectorFields
          layer={layer}
          onUpdate={(patch, commit = true) => onUpdate(layer.id, patch, commit)}
        />
      )}
    </div>
  );
};

const TextInspectorFields: React.FC<{
  layer: TextLayer;
  onUpdate: (patch: Partial<TextLayer>, commit?: boolean) => void;
}> = ({ layer, onUpdate }) => {
  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Text Content</span>
        <textarea
          rows={3}
          value={layer.text}
          onChange={(e) => onUpdate({ text: e.target.value }, true)}
          className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-[#6366F1]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Font Family</span>
        <select
          value={layer.fontFamily}
          onChange={(e) =>
            onUpdate({ fontFamily: e.target.value as CanvasFontFamily }, true)
          }
          className="min-h-[38px] px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-[#6366F1]"
        >
          {CANVAS_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label} ({f.category})
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            onUpdate({ fontWeight: layer.fontWeight === '700' ? '400' : '700' }, true)
          }
          className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold border cursor-pointer ${
            layer.fontWeight === '700' || layer.fontWeight === '600'
              ? 'bg-[#6366F1] text-white border-[#6366F1]'
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() =>
            onUpdate(
              { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' },
              true
            )
          }
          className={`flex-1 min-h-[36px] rounded-lg text-xs italic border cursor-pointer ${
            layer.fontStyle === 'italic'
              ? 'bg-[#6366F1] text-white border-[#6366F1]'
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          Italic
        </button>
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
          {(
            [
              { id: 'left', Icon: AlignLeft },
              { id: 'center', Icon: AlignCenter },
              { id: 'right', Icon: AlignRight },
            ] as const
          ).map(({ id, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onUpdate({ align: id }, true)}
              aria-label={`Align ${id}`}
              className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded cursor-pointer ${
                layer.align === id
                  ? 'bg-white dark:bg-zinc-800 text-[#6366F1]'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex justify-between">
          <span>Size</span>
          <span className="font-mono-tabular">{layer.fontSize}px</span>
        </div>
        <input
          type="range"
          min={18}
          max={240}
          step={2}
          value={layer.fontSize}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) }, true)}
          className="accent-[#6366F1]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex justify-between">
          <span>Letter Spacing</span>
          <span className="font-mono-tabular">{layer.letterSpacing}</span>
        </div>
        <input
          type="range"
          min={-4}
          max={24}
          step={1}
          value={layer.letterSpacing}
          onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) }, true)}
          className="accent-[#6366F1]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex justify-between">
          <span>Line Height</span>
          <span className="font-mono-tabular">{layer.lineHeight.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.85}
          max={2.1}
          step={0.05}
          value={layer.lineHeight}
          onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) }, true)}
          className="accent-[#6366F1]"
        />
      </label>

      {/* Text Color */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Text Color</span>
          <input
            type="color"
            value={layer.fill}
            onChange={(e) => onUpdate({ fill: e.target.value }, true)}
            aria-label="Text color"
            className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer"
          />
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onUpdate({ fill: hex }, true)}
              className={`h-6 rounded border cursor-pointer ${
                layer.fill.toLowerCase() === hex.toLowerCase()
                  ? 'border-[#6366F1] ring-2 ring-[#6366F1]/40'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`Set text color ${hex}`}
            />
          ))}
        </div>
      </div>

      {/* Text Highlight Background */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">Highlight Box</span>
        <div className="flex items-center gap-2">
          {layer.backgroundColor ? (
            <>
              <input
                type="color"
                value={layer.backgroundColor}
                onChange={(e) =>
                  onUpdate({ backgroundColor: e.target.value }, true)
                }
                aria-label="Highlight color"
                className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onUpdate({ backgroundColor: '' }, true)}
                className="px-2 py-1 text-[11px] rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                onUpdate(
                  {
                    backgroundColor: '#6366F1',
                    backgroundPadding: 18,
                    backgroundRadius: 10,
                  },
                  true
                )
              }
              className="px-2.5 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Add Highlight
            </button>
          )}
        </div>
      </div>

      <label className="flex items-center justify-between min-h-[34px] text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
        <span>Drop Shadow</span>
        <input
          type="checkbox"
          checked={layer.shadowEnabled}
          onChange={(e) => onUpdate({ shadowEnabled: e.target.checked }, true)}
          className="w-4 h-4 accent-[#6366F1]"
        />
      </label>
    </div>
  );
};

const StickerInspectorFields: React.FC<{
  layer: StickerLayer;
  onUpdate: (patch: Partial<StickerLayer>, commit?: boolean) => void;
}> = ({ layer, onUpdate }) => {
  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Fill Color
          </span>
          <input
            type="color"
            value={layer.fill}
            onChange={(e) => onUpdate({ fill: e.target.value }, true)}
            aria-label="Sticker fill color"
            className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer"
          />
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onUpdate({ fill: hex }, true)}
              className={`h-6 rounded border cursor-pointer ${
                layer.fill.toLowerCase() === hex.toLowerCase()
                  ? 'border-[#6366F1] ring-2 ring-[#6366F1]/40'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`Set sticker color ${hex}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex-1 flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Outline Width</span>
            <span className="font-mono-tabular">{layer.strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={layer.strokeWidth}
            onChange={(e) =>
              onUpdate(
                {
                  strokeWidth: Number(e.target.value),
                  stroke:
                    layer.stroke === 'transparent' ? '#FFFFFF' : layer.stroke,
                },
                true
              )
            }
            className="accent-[#6366F1]"
          />
        </label>
        <input
          type="color"
          value={layer.stroke === 'transparent' ? '#FFFFFF' : layer.stroke}
          onChange={(e) => onUpdate({ stroke: e.target.value }, true)}
          aria-label="Sticker outline color"
          className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer shrink-0"
        />
      </div>

      <label className="flex items-center justify-between min-h-[34px] text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
        <span>Drop Shadow</span>
        <input
          type="checkbox"
          checked={layer.shadowEnabled}
          onChange={(e) => onUpdate({ shadowEnabled: e.target.checked }, true)}
          className="w-4 h-4 accent-[#6366F1]"
        />
      </label>
    </div>
  );
};
