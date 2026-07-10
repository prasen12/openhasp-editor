import * as fs from 'fs';
import { encodePNG } from './png';

/**
 * Decodes LVGL v8 binary image files (as produced by the LVGL image converter /
 * the openHASP image conversion tooling and flashed to the device's LittleFS).
 *
 * File layout: a 4-byte little-endian header (lv_img_header_t: cf:5, always_zero:3,
 * reserved:2, w:11, h:11) followed by raw pixel data whose layout depends on `cf`.
 * See https://docs.lvgl.io/8.3/overview/image.html
 */

const LV_IMG_CF_TRUE_COLOR = 4;
const LV_IMG_CF_TRUE_COLOR_ALPHA = 5;
const LV_IMG_CF_TRUE_COLOR_CHROMA_KEYED = 6;
const LV_IMG_CF_INDEXED_8BIT = 10;
const LV_IMG_CF_ALPHA_8BIT = 14;

// LVGL's documented default LV_COLOR_CHROMA_KEY (pure green, 0x00FF00) encoded as RGB565.
const CHROMA_KEY_RGB565 = 0x07e0;

export interface DecodedLvglImage {
  width: number;
  height: number;
  /** width * height * 4 bytes, row-major, top-down. */
  rgba: Buffer;
}

function rgb565ToRgb(px: number): [number, number, number] {
  const r5 = (px >> 11) & 0x1f;
  const g6 = (px >> 5) & 0x3f;
  const b5 = px & 0x1f;
  return [(r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2)];
}

function decodeTrueColor(pixels: Buffer, rgba: Buffer, count: number, chromaKeyed: boolean): boolean {
  if (pixels.length < count * 2) return false;
  for (let i = 0; i < count; i++) {
    const px = pixels.readUInt16LE(i * 2);
    const [r, g, b] = rgb565ToRgb(px);
    const o = i * 4;
    rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b;
    rgba[o + 3] = chromaKeyed && px === CHROMA_KEY_RGB565 ? 0 : 255;
  }
  return true;
}

function decodeTrueColorAlpha(pixels: Buffer, rgba: Buffer, count: number): boolean {
  if (pixels.length < count * 3) return false;
  for (let i = 0; i < count; i++) {
    const off = i * 3;
    const [r, g, b] = rgb565ToRgb(pixels.readUInt16LE(off));
    const o = i * 4;
    rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = pixels[off + 2];
  }
  return true;
}

function decodeIndexed8(pixels: Buffer, rgba: Buffer, count: number): boolean {
  const paletteBytes = 256 * 4; // lv_color32_t palette entries: B, G, R, A
  if (pixels.length < paletteBytes + count) return false;
  const palette = pixels.subarray(0, paletteBytes);
  const indices = pixels.subarray(paletteBytes);
  for (let i = 0; i < count; i++) {
    const po = indices[i] * 4;
    const o = i * 4;
    rgba[o] = palette[po + 2];
    rgba[o + 1] = palette[po + 1];
    rgba[o + 2] = palette[po];
    rgba[o + 3] = palette[po + 3];
  }
  return true;
}

function decodeAlpha8(pixels: Buffer, rgba: Buffer, count: number): boolean {
  if (pixels.length < count) return false;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    rgba[o] = 0; rgba[o + 1] = 0; rgba[o + 2] = 0; rgba[o + 3] = pixels[i];
  }
  return true;
}

/** Decodes raw LVGL .bin bytes to an RGBA pixel buffer. Returns null for unsupported color formats. */
export function decodeLvglBin(buffer: Buffer): DecodedLvglImage | null {
  if (buffer.length < 4) return null;

  const header = buffer.readUInt32LE(0);
  const cf = header & 0x1f;
  const w = (header >>> 10) & 0x7ff;
  const h = (header >>> 21) & 0x7ff;
  if (w === 0 || h === 0) return null;

  const pixels = buffer.subarray(4);
  const count = w * h;
  const rgba = Buffer.alloc(count * 4);

  let ok: boolean;
  switch (cf) {
    case LV_IMG_CF_TRUE_COLOR:
      ok = decodeTrueColor(pixels, rgba, count, false);
      break;
    case LV_IMG_CF_TRUE_COLOR_CHROMA_KEYED:
      ok = decodeTrueColor(pixels, rgba, count, true);
      break;
    case LV_IMG_CF_TRUE_COLOR_ALPHA:
      ok = decodeTrueColorAlpha(pixels, rgba, count);
      break;
    case LV_IMG_CF_INDEXED_8BIT:
      ok = decodeIndexed8(pixels, rgba, count);
      break;
    case LV_IMG_CF_ALPHA_8BIT:
      ok = decodeAlpha8(pixels, rgba, count);
      break;
    default:
      // Unsupported color format (raw/indexed 1-4bit/alpha 1-4bit/reserved/user-encoded).
      return null;
  }

  return ok ? { width: w, height: h, rgba } : null;
}

/** Reads and decodes an LVGL .bin file, returning a `data:image/png;base64,...` URI, or null on failure. */
export function decodeLvglBinFileToDataUri(filePath: string): string | null {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return null;
  }
  const decoded = decodeLvglBin(buffer);
  if (!decoded) return null;
  const png = encodePNG(decoded.rgba, decoded.width, decoded.height);
  return `data:image/png;base64,${png.toString('base64')}`;
}
