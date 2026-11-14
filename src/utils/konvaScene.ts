import Konva from 'konva';
import {
  ASPECT_RATIOS,
  BackgroundConfig,
  CanvasLayer,
  ImageLayer,
  ProjectState,
  SlideFill,
  StickerLayer,
  TextLayer,
} from '../types/studio';
import { getStickerById } from '../data/stickers';
import { getLinearGradientPoints, getPaperTextureCanvas } from './canvasTextures';

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImageCached(src: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(src);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      imageCache.delete(src);
      reject(err);
    };
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function applyFillToRect(rect: Konva.Rect, fill: SlideFill, width: number, height: number) {
  if (fill.type === 'solid') {
    rect.fill(fill.color);
    rect.fillLinearGradientColorStops([]);
    rect.fillRadialGradientColorStops([]);
  } else if (fill.type === 'linear-gradient') {
    const pts = getLinearGradientPoints(width, height, fill.gradientAngle);
    rect.fillPriority('linear-gradient');
    rect.fillLinearGradientStartPoint(pts.start);
    rect.fillLinearGradientEndPoint(pts.end);
    rect.fillLinearGradientColorStops([0, fill.gradientColors[0], 1, fill.gradientColors[1]]);
  } else {
    rect.fillPriority('radial-gradient');
    rect.fillRadialGradientStartPoint({ x: width / 2, y: height / 2 });
    rect.fillRadialGradientEndPoint({ x: width / 2, y: height / 2 });
    rect.fillRadialGradientStartRadius(0);
    rect.fillRadialGradientEndRadius(Math.max(width, height) * 0.72);
    rect.fillRadialGradientColorStops([0, fill.gradientColors[0], 1, fill.gradientColors[1]]);
  }
}

export function renderBackgroundLayer(
  bgLayer: Konva.Layer,
  project: ProjectState,
  totalWidth: number,
  slideWidth: number,
  slideHeight: number
) {
  bgLayer.destroyChildren();

  const bg: BackgroundConfig = project.background;

  if (bg.mode === 'global') {
    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: totalWidth,
      height: slideHeight,
      listening: false,
    });
    applyFillToRect(rect, bg.global, totalWidth, slideHeight);
    bgLayer.add(rect);
  } else {
    project.slides.forEach((slide, idx) => {
      const fill = bg.perSlide[slide.id] ?? bg.global;
      const rect = new Konva.Rect({
        x: idx * slideWidth,
        y: 0,
        width: slideWidth,
        height: slideHeight,
        listening: false,
      });
      applyFillToRect(rect, fill, slideWidth, slideHeight);
      bgLayer.add(rect);
    });
  }

  // Seamless paper / grain overlay
  const patternCanvas = getPaperTextureCanvas(bg.paperTexture, bg.grainIntensity);
  if (patternCanvas) {
    const grainRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: totalWidth,
      height: slideHeight,
      fillPatternImage: patternCanvas as unknown as HTMLImageElement,
      fillPatternRepeat: 'repeat',
      listening: false,
    });
    bgLayer.add(grainRect);
  }
}

function computeCoverCrop(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number
) {
  const sx = Math.max(0, Math.min(1, cropX)) * imgW;
  const sy = Math.max(0, Math.min(1, cropY)) * imgH;
  const sw = Math.max(0.05, Math.min(1 - cropX, cropW)) * imgW;
  const sh = Math.max(0.05, Math.min(1 - cropY, cropH)) * imgH;

  const srcRatio = sw / sh;
  const dstRatio = Math.max(0.01, targetW / Math.max(1, targetH));

  let finalW = sw;
  let finalH = sh;
  let finalX = sx;
  let finalY = sy;

  if (srcRatio > dstRatio) {
    finalW = sh * dstRatio;
    finalX = sx + (sw - finalW) / 2;
  } else {
    finalH = sw / dstRatio;
    finalY = sy + (sh - finalH) / 2;
  }

  return { x: finalX, y: finalY, width: finalW, height: finalH };
}

export function buildImageNode(
  layer: ImageLayer,
  imgEl: HTMLImageElement,
  interactive: boolean,
  cachePixelRatio = 1
): Konva.Group {
  const group = new Konva.Group({
    id: layer.id,
    name: 'canvas-layer',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: interactive && !layer.locked,
    listening: interactive,
  });

  const w = layer.width;
  const h = layer.height;
  const isPolaroid = layer.mask === 'polaroid';
  const isCircle = layer.mask === 'circle';
  const radius =
    layer.mask === 'rounded'
      ? Math.min(layer.cornerRadius || 24, Math.min(w, h) / 2)
      : layer.mask === 'none' || layer.mask === 'free-crop'
        ? Math.min(layer.cornerRadius || 0, Math.min(w, h) / 2)
        : 0;

  // Shadow holder or Polaroid background card
  if (isPolaroid) {
    const card = new Konva.Rect({
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: '#FAF9F6',
      cornerRadius: 8,
      stroke: layer.borderWidth > 0 ? layer.borderColor : 'rgba(0,0,0,0.08)',
      strokeWidth: layer.borderWidth > 0 ? layer.borderWidth : 2,
      shadowEnabled: layer.shadowEnabled,
      shadowColor: layer.shadowColor,
      shadowBlur: layer.shadowBlur,
      shadowOffsetX: layer.shadowOffsetX,
      shadowOffsetY: layer.shadowOffsetY,
      shadowOpacity: layer.shadowOpacity,
    });
    group.add(card);

    const padSide = Math.round(w * 0.06);
    const padTop = Math.round(w * 0.06);
    const padBottom = Math.round(w * 0.21);
    const photoW = Math.max(20, w - padSide * 2);
    const photoH = Math.max(20, h - padTop - padBottom);

    const photoClipGroup = new Konva.Group({
      x: padSide,
      y: padTop,
      clipX: 0,
      clipY: 0,
      clipWidth: photoW,
      clipHeight: photoH,
    });

    const crop = computeCoverCrop(
      imgEl.naturalWidth || layer.naturalWidth,
      imgEl.naturalHeight || layer.naturalHeight,
      photoW,
      photoH,
      layer.cropX,
      layer.cropY,
      layer.cropWidth,
      layer.cropHeight
    );

    const kImg = new Konva.Image({
      image: imgEl,
      x: 0,
      y: 0,
      width: photoW,
      height: photoH,
      crop,
    });
    applyImageFilters(kImg, layer, cachePixelRatio);
    photoClipGroup.add(kImg);
    group.add(photoClipGroup);

    if (layer.polaroidCaption.trim()) {
      const caption = new Konva.Text({
        x: padSide,
        y: padTop + photoH + Math.round(padBottom * 0.22),
        width: photoW,
        height: padBottom * 0.7,
        text: layer.polaroidCaption,
        fontFamily: 'Caveat',
        fontSize: Math.max(20, Math.round(w * 0.068)),
        fill: '#292524',
        align: 'center',
        verticalAlign: 'middle',
      });
      group.add(caption);
    }
    return group;
  }

  // Shadow backing for non-polaroid images (so clipped shapes still cast crisp drop shadows!)
  if (layer.shadowEnabled) {
    if (isCircle) {
      group.add(
        new Konva.Ellipse({
          x: w / 2,
          y: h / 2,
          radiusX: w / 2,
          radiusY: h / 2,
          fill: '#000000',
          shadowEnabled: true,
          shadowColor: layer.shadowColor,
          shadowBlur: layer.shadowBlur,
          shadowOffsetX: layer.shadowOffsetX,
          shadowOffsetY: layer.shadowOffsetY,
          shadowOpacity: layer.shadowOpacity,
        })
      );
    } else {
      group.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: w,
          height: h,
          cornerRadius: radius,
          fill: '#000000',
          shadowEnabled: true,
          shadowColor: layer.shadowColor,
          shadowBlur: layer.shadowBlur,
          shadowOffsetX: layer.shadowOffsetX,
          shadowOffsetY: layer.shadowOffsetY,
          shadowOpacity: layer.shadowOpacity,
        })
      );
    }
  }

  const clipGroup = new Konva.Group({
    x: 0,
    y: 0,
    clipFunc: (ctx) => {
      if (isCircle) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
      } else if (radius > 0) {
        const r = Math.min(radius, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.closePath();
      }
    },
  });

  const crop = computeCoverCrop(
    imgEl.naturalWidth || layer.naturalWidth,
    imgEl.naturalHeight || layer.naturalHeight,
    w,
    h,
    layer.cropX,
    layer.cropY,
    layer.cropWidth,
    layer.cropHeight
  );

  const kImg = new Konva.Image({
    image: imgEl,
    x: 0,
    y: 0,
    width: w,
    height: h,
    crop,
  });
  applyImageFilters(kImg, layer, cachePixelRatio);
  clipGroup.add(kImg);
  group.add(clipGroup);

  if (layer.borderWidth > 0) {
    if (isCircle) {
      group.add(
        new Konva.Ellipse({
          x: w / 2,
          y: h / 2,
          radiusX: w / 2,
          radiusY: h / 2,
          stroke: layer.borderColor,
          strokeWidth: layer.borderWidth,
          listening: false,
        })
      );
    } else {
      group.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: w,
          height: h,
          cornerRadius: radius,
          stroke: layer.borderColor,
          strokeWidth: layer.borderWidth,
          listening: false,
        })
      );
    }
  }

  return group;
}

function applyImageFilters(kImg: Konva.Image, layer: ImageLayer, pixelRatio: number) {
  const f = layer.filters;
  const activeFilters: NonNullable<Parameters<Konva.Image['filters']>[0]> = [];

  if (Math.abs(f.brightness) > 0.005) {
    activeFilters.push(Konva.Filters.Brighten);
    kImg.brightness(f.brightness);
  }
  if (Math.abs(f.contrast) > 0.5) {
    activeFilters.push(Konva.Filters.Contrast);
    kImg.contrast(f.contrast);
  }
  if (Math.abs(f.saturation) > 0.01) {
    activeFilters.push(Konva.Filters.HSL);
    kImg.saturation(f.saturation);
  }
  if (f.grayscale) {
    activeFilters.push(Konva.Filters.Grayscale);
  }
  if (f.sepia) {
    activeFilters.push(Konva.Filters.Sepia);
  }

  if (activeFilters.length > 0) {
    kImg.filters(activeFilters);
    kImg.cache({ pixelRatio: Math.max(0.5, Math.min(2, pixelRatio)) });
  }
}

export function buildTextNode(layer: TextLayer, interactive: boolean): Konva.Group {
  const group = new Konva.Group({
    id: layer.id,
    name: 'canvas-layer',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: interactive && !layer.locked,
    listening: interactive,
  });

  const fontStyleStr = `${layer.fontStyle === 'italic' ? 'italic ' : ''}${layer.fontWeight}`;

  const textNode = new Konva.Text({
    x: 0,
    y: 0,
    width: layer.width,
    text: layer.text,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontStyle: fontStyleStr,
    fill: layer.fill,
    align: layer.align,
    letterSpacing: layer.letterSpacing,
    lineHeight: layer.lineHeight,
    shadowEnabled: layer.shadowEnabled,
    shadowColor: layer.shadowColor,
    shadowBlur: layer.shadowBlur,
    shadowOffsetX: layer.shadowOffsetX,
    shadowOffsetY: layer.shadowOffsetY,
    shadowOpacity: 0.5,
  });

  const measuredHeight = Math.max(layer.fontSize * layer.lineHeight, textNode.height());
  group.height(measuredHeight);

  if (layer.backgroundColor) {
    const pad = layer.backgroundPadding || 16;
    const bgRect = new Konva.Rect({
      x: -pad,
      y: -pad * 0.65,
      width: layer.width + pad * 2,
      height: measuredHeight + pad * 1.3,
      fill: layer.backgroundColor,
      cornerRadius: layer.backgroundRadius || 8,
    });
    group.add(bgRect);
  }

  group.add(textNode);
  return group;
}

export function buildStickerNode(layer: StickerLayer, interactive: boolean): Konva.Group {
  const asset = getStickerById(layer.stickerId);

  const group = new Konva.Group({
    id: layer.id,
    name: 'canvas-layer',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: interactive && !layer.locked,
    listening: interactive,
  });

  const scaleX = layer.width / asset.viewBoxWidth;
  const scaleY = layer.height / asset.viewBoxHeight;

  const path = new Konva.Path({
    x: 0,
    y: 0,
    data: asset.pathData,
    scaleX,
    scaleY,
    fill: layer.fill,
    stroke: layer.strokeWidth > 0 ? layer.stroke : undefined,
    strokeWidth: layer.strokeWidth > 0 ? layer.strokeWidth / Math.max(0.1, (scaleX + scaleY) / 2) : 0,
    fillRule: 'evenodd',
    shadowEnabled: layer.shadowEnabled,
    shadowColor: '#000000',
    shadowBlur: 24,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowOpacity: 0.25,
  });

  // Transparent hit rect so thin outlines / hollow frames are effortless to tap & drag
  const hitRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: layer.width,
    height: layer.height,
    fill: 'rgba(0,0,0,0.001)',
  });

  group.add(hitRect);
  group.add(path);
  return group;
}

export async function renderContentLayers(
  contentLayer: Konva.Layer,
  layers: CanvasLayer[],
  interactive: boolean,
  cachePixelRatio = 1
) {
  contentLayer.destroyChildren();

  const imageLayers = layers.filter((l): l is ImageLayer => l.visible && l.type === 'image');
  const loadedImages = new Map<string, HTMLImageElement>();

  await Promise.all(
    imageLayers.map(async (imgLayer) => {
      try {
        const img = await loadImageCached(imgLayer.src);
        loadedImages.set(imgLayer.id, img);
      } catch {
        // Skip broken image gracefully
      }
    })
  );

  for (const layer of layers) {
    if (!layer.visible) continue;
    if (layer.type === 'image') {
      const imgEl = loadedImages.get(layer.id);
      if (imgEl) {
        contentLayer.add(buildImageNode(layer, imgEl, interactive, cachePixelRatio));
      }
    } else if (layer.type === 'text') {
      contentLayer.add(buildTextNode(layer, interactive));
    } else if (layer.type === 'sticker') {
      contentLayer.add(buildStickerNode(layer, interactive));
    }
  }
}

export function getSlideDimensions(project: ProjectState) {
  const spec = ASPECT_RATIOS[project.aspectRatio];
  const slideWidth = spec.width;
  const slideHeight = spec.height;
  const totalWidth = slideWidth * project.slides.length;
  return { slideWidth, slideHeight, totalWidth };
}
