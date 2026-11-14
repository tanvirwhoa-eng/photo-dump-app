import Konva from 'konva';
import JSZip from 'jszip';
import { ProjectState } from '../types/studio';
import {
  getSlideDimensions,
  renderBackgroundLayer,
  renderContentLayers,
} from './konvaScene';

export interface SlicedSlideResult {
  index: number;
  slideId: string;
  filename: string;
  dataUrl: string;
}

export type ExportFormat = 'png' | 'jpeg';

/**
 * Renders the panoramic project at full native resolution (e.g. 1080x1350 per slide)
 * and slices each slide boundary cleanly using a slide-sized offscreen stage so
 * even 10-slide 9:16 projects never exceed mobile browser canvas memory limits.
 */
export async function renderAndSliceCarousel(
  project: ProjectState,
  format: ExportFormat = 'png'
): Promise<SlicedSlideResult[]> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { slideWidth, slideHeight, totalWidth } = getSlideDimensions(project);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${slideWidth}px`;
  container.style.height = `${slideHeight}px`;
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const stage = new Konva.Stage({
    container,
    width: slideWidth,
    height: slideHeight,
  });

  const bgLayer = new Konva.Layer({ listening: false });
  const contentLayer = new Konva.Layer({ listening: false });
  stage.add(bgLayer);
  stage.add(contentLayer);

  try {
    renderBackgroundLayer(bgLayer, project, totalWidth, slideWidth, slideHeight);
    await renderContentLayers(contentLayer, project.layers, false, 1);

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';
    const results: SlicedSlideResult[] = [];

    for (let i = 0; i < project.slides.length; i++) {
      const offsetX = -i * slideWidth;
      bgLayer.x(offsetX);
      contentLayer.x(offsetX);
      stage.batchDraw();

      const dataUrl = stage.toDataURL({
        x: 0,
        y: 0,
        width: slideWidth,
        height: slideHeight,
        pixelRatio: 1,
        mimeType,
        quality: format === 'jpeg' ? 0.95 : 1,
      });

      results.push({
        index: i,
        slideId: project.slides[i].id,
        filename: `carousel_slide_${i + 1}.${ext}`,
        dataUrl,
      });
    }

    return results;
  } finally {
    stage.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadSlidesAsZip(
  slides: SlicedSlideResult[],
  projectTitle: string
) {
  const zip = new JSZip();
  const folderName = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'panoframe-carousel';

  for (const slide of slides) {
    const base64 = slide.dataUrl.split(',')[1];
    if (base64) {
      zip.file(slide.filename, base64, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, `${folderName}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
