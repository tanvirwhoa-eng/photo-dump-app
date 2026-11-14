import { PaperTextureType } from '../types/studio';

const patternCache = new Map<string, HTMLCanvasElement>();

/**
 * Generates a tileable procedural paper/film grain canvas pattern for seamless backgrounds.
 */
export function getPaperTextureCanvas(
  type: PaperTextureType,
  intensity: number
): HTMLCanvasElement | null {
  if (type === 'none' || intensity <= 0.005) return null;

  const key = `${type}-${Math.round(intensity * 100)}`;
  const cached = patternCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Deterministic pseudo-random for crisp repeatable grain
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const alphaMax = Math.min(180, Math.round(intensity * 260));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = rand();

      if (type === 'fine-grain') {
        const val = r > 0.5 ? 255 : 0;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = Math.round(rand() * alphaMax * 0.55);
      } else if (type === 'warm-paper') {
        const speckle = r > 0.85 ? 60 : r < 0.15 ? 245 : 195;
        data[idx] = speckle;
        data[idx + 1] = Math.max(0, speckle - 10);
        data[idx + 2] = Math.max(0, speckle - 26);
        data[idx + 3] = Math.round(rand() * alphaMax * 0.65);
      } else if (type === 'linen') {
        const weaveH = Math.sin((y / 3) * Math.PI) * 0.5 + 0.5;
        const weaveV = Math.sin((x / 3) * Math.PI) * 0.5 + 0.5;
        const weave = (weaveH + weaveV) * 0.5;
        const val = weave > 0.55 ? 255 : 25;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = Math.round((weave * 0.6 + rand() * 0.4) * alphaMax * 0.45);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  patternCache.set(key, canvas);
  return canvas;
}

/**
 * Computes linear gradient start/end coordinates for a rectangle given angle in degrees.
 */
export function getLinearGradientPoints(width: number, height: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const half = len / 2;
  return {
    start: {
      x: cx - Math.cos(rad) * half,
      y: cy - Math.sin(rad) * half,
    },
    end: {
      x: cx + Math.cos(rad) * half,
      y: cy + Math.sin(rad) * half,
    },
  };
}
