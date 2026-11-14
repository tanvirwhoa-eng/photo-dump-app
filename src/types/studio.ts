export type AspectRatioId = '4:5' | '1:1' | '9:16';

export interface AspectRatioSpec {
  id: AspectRatioId;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: Record<AspectRatioId, AspectRatioSpec> = {
  '4:5': {
    id: '4:5',
    label: 'Portrait (4:5)',
    shortLabel: '4:5',
    width: 1080,
    height: 1350,
  },
  '1:1': {
    id: '1:1',
    label: 'Square (1:1)',
    shortLabel: '1:1',
    width: 1080,
    height: 1080,
  },
  '9:16': {
    id: '9:16',
    label: 'Story / Reel (9:16)',
    shortLabel: '9:16',
    width: 1080,
    height: 1920,
  },
};

export type FillType = 'solid' | 'linear-gradient' | 'radial-gradient';

export interface SlideFill {
  type: FillType;
  color: string;
  gradientColors: [string, string];
  gradientAngle: number;
}

export type PaperTextureType = 'none' | 'fine-grain' | 'warm-paper' | 'linen';

export interface BackgroundConfig {
  mode: 'global' | 'per-slide';
  global: SlideFill;
  perSlide: Record<string, SlideFill>;
  paperTexture: PaperTextureType;
  grainIntensity: number; // 0 to 0.5
}

export interface Slide {
  id: string;
}

export type CanvasFontFamily =
  | 'Playfair Display'
  | 'Montserrat'
  | 'Bebas Neue'
  | 'Inter'
  | 'Caveat';

export const CANVAS_FONTS: { id: CanvasFontFamily; label: string; category: string }[] = [
  { id: 'Playfair Display', label: 'Playfair Display', category: 'Editorial Serif' },
  { id: 'Montserrat', label: 'Montserrat', category: 'Geometric Sans' },
  { id: 'Bebas Neue', label: 'Bebas Neue', category: 'Condensed Display' },
  { id: 'Inter', label: 'Inter', category: 'Clean Grotesque' },
  { id: 'Caveat', label: 'Caveat', category: 'Handwritten' },
];

export type ImageMaskType = 'none' | 'rounded' | 'circle' | 'polaroid' | 'free-crop';

export type FilterPreset = 'none' | 'vintage' | 'grayscale' | 'crisp' | 'warm';

export interface ImageFilters {
  preset: FilterPreset;
  brightness: number; // -0.4 to 0.4
  contrast: number; // -50 to 50
  saturation: number; // -1 to 1
  grayscale: boolean;
  sepia: boolean;
}

export interface LayerBase {
  id: string;
  type: 'image' | 'text' | 'sticker';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  mask: ImageMaskType;
  cornerRadius: number;
  cropX: number; // normalized 0..1
  cropY: number; // normalized 0..1
  cropWidth: number; // normalized 0.1..1
  cropHeight: number; // normalized 0.1..1
  polaroidCaption: string;
  filters: ImageFilters;
  borderColor: string;
  borderWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  fontFamily: CanvasFontFamily;
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  fontStyle: 'normal' | 'italic';
  fill: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  backgroundColor: string;
  backgroundPadding: number;
  backgroundRadius: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface StickerLayer extends LayerBase {
  type: 'sticker';
  stickerId: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowEnabled: boolean;
}

export type CanvasLayer = ImageLayer | TextLayer | StickerLayer;

export interface ProjectState {
  id: string;
  title: string;
  aspectRatio: AspectRatioId;
  slides: Slide[];
  background: BackgroundConfig;
  layers: CanvasLayer[];
}

export interface CarouselTemplate {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  previewImages: string[];
  project: Omit<ProjectState, 'id'>;
}

export type StudioToolTab =
  | 'photos'
  | 'text'
  | 'stickers'
  | 'background'
  | 'templates'
  | 'layers';

export interface UploadedPhoto {
  id: string;
  name: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}
