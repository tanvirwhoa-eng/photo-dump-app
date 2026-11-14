export interface StickerAsset {
  id: string;
  name: string;
  category: 'paper' | 'arrows' | 'shapes' | 'frames';
  viewBoxWidth: number;
  viewBoxHeight: number;
  pathData: string;
  defaultFill: string;
  defaultStroke: string;
  defaultStrokeWidth: number;
  defaultOpacity: number;
}

export const STICKER_LIBRARY: StickerAsset[] = [
  {
    id: 'torn-paper-strip',
    name: 'Torn Paper Strip',
    category: 'paper',
    viewBoxWidth: 400,
    viewBoxHeight: 110,
    pathData:
      'M0,22 L18,14 L36,24 L56,10 L74,21 L95,12 L116,25 L138,11 L159,23 L180,14 L203,26 L225,11 L248,22 L270,13 L292,25 L314,12 L338,23 L360,11 L382,22 L400,15 L400,92 L380,99 L358,88 L336,100 L314,87 L290,98 L268,89 L245,101 L224,88 L200,98 L178,87 L155,100 L134,89 L112,99 L90,88 L68,99 L46,87 L24,98 L0,89 Z',
    defaultFill: '#F4F1EA',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'washi-tape',
    name: 'Washi Tape',
    category: 'paper',
    viewBoxWidth: 260,
    viewBoxHeight: 72,
    pathData:
      'M12,6 L248,6 L256,18 L249,30 L258,42 L250,54 L256,66 L10,66 L3,54 L10,42 L2,30 L9,18 Z',
    defaultFill: '#E5DEC9',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 0.85,
  },
  {
    id: 'masking-corner',
    name: 'Tape Tab',
    category: 'paper',
    viewBoxWidth: 180,
    viewBoxHeight: 60,
    pathData:
      'M8,4 L172,4 L178,16 L171,30 L178,44 L172,56 L8,56 L2,44 L9,30 L2,16 Z',
    defaultFill: '#D4A373',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 0.78,
  },
  {
    id: 'curved-arrow',
    name: 'Curved Swipe Arrow',
    category: 'arrows',
    viewBoxWidth: 220,
    viewBoxHeight: 120,
    pathData:
      'M16,92 C60,24 140,22 194,68 L178,34 L190,28 L212,78 L160,88 L157,75 L186,70 C138,34 68,36 27,99 Z',
    defaultFill: '#FFFFFF',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'swipe-arrow',
    name: 'Swipe Arrow',
    category: 'arrows',
    viewBoxWidth: 240,
    viewBoxHeight: 80,
    pathData:
      'M10,36 L196,36 L168,12 L177,3 L228,40 L177,77 L168,68 L196,44 L10,44 Z',
    defaultFill: '#FFFFFF',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'organic-blob-1',
    name: 'Organic Blob',
    category: 'shapes',
    viewBoxWidth: 220,
    viewBoxHeight: 220,
    pathData:
      'M114,16 C158,14 198,46 206,92 C214,138 188,192 142,204 C96,216 38,196 18,152 C-2,108 16,46 58,26 C78,16 96,17 114,16 Z',
    defaultFill: '#6366F1',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 0.9,
  },
  {
    id: 'organic-blob-2',
    name: 'Soft Pebble',
    category: 'shapes',
    viewBoxWidth: 240,
    viewBoxHeight: 190,
    pathData:
      'M66,22 C112,4 186,18 214,66 C242,114 216,170 162,180 C108,190 36,172 18,128 C0,84 20,40 66,22 Z',
    defaultFill: '#E2D9C8',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 0.92,
  },
  {
    id: 'arch-frame',
    name: 'Arch Outline',
    category: 'frames',
    viewBoxWidth: 200,
    viewBoxHeight: 280,
    pathData:
      'M100,12 C152,12 188,52 188,108 L188,268 L12,268 L12,108 C12,52 48,12 100,12 Z M100,24 C56,24 24,58 24,108 L24,256 L176,256 L176,108 C176,58 144,24 100,24 Z',
    defaultFill: '#1C1917',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'pill-frame',
    name: 'Pill Outline',
    category: 'frames',
    viewBoxWidth: 260,
    viewBoxHeight: 110,
    pathData:
      'M55,8 L205,8 C231,8 252,29 252,55 C252,81 231,102 205,102 L55,102 C29,102 8,81 8,55 C8,29 29,8 55,8 Z M55,18 C34,18 18,34 18,55 C18,76 34,92 55,92 L205,92 C226,92 242,76 242,55 C242,34 226,18 205,18 Z',
    defaultFill: '#FFFFFF',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'starburst-seal',
    name: 'Editorial Seal',
    category: 'shapes',
    viewBoxWidth: 180,
    viewBoxHeight: 180,
    pathData:
      'M90,6 L104,34 L132,16 L130,48 L164,44 L146,72 L176,86 L148,104 L166,132 L134,132 L138,164 L108,148 L92,176 L76,148 L46,164 L50,132 L18,132 L36,104 L8,86 L38,72 L20,44 L54,48 L52,16 L80,34 Z',
    defaultFill: '#F59E0B',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'four-point-spark',
    name: 'Editorial Spark',
    category: 'shapes',
    viewBoxWidth: 140,
    viewBoxHeight: 140,
    pathData:
      'M70,4 C74,48 92,66 136,70 C92,74 74,92 70,136 C66,92 48,74 4,70 C48,66 66,48 70,4 Z',
    defaultFill: '#FFFFFF',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
  },
  {
    id: 'film-strip-frame',
    name: 'Film Sprocket Bar',
    category: 'frames',
    viewBoxWidth: 360,
    viewBoxHeight: 54,
    pathData:
      'M0,0 L360,0 L360,54 L0,54 Z M18,12 L42,12 L42,42 L18,42 Z M66,12 L90,12 L90,42 L66,42 Z M114,12 L138,12 L138,42 L114,42 Z M162,12 L186,12 L186,42 L162,42 Z M210,12 L234,12 L234,42 L210,42 Z M258,12 L282,12 L282,42 L258,42 Z M306,12 L330,12 L330,42 L306,42 Z',
    defaultFill: '#18181B',
    defaultStroke: 'transparent',
    defaultStrokeWidth: 0,
    defaultOpacity: 0.9,
  },
];

export function getStickerById(id: string): StickerAsset {
  return STICKER_LIBRARY.find((s) => s.id === id) ?? STICKER_LIBRARY[0];
}
