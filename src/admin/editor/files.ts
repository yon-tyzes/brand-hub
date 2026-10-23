// Helpers for files dropped or picked in the editor.
import { slugify } from "./modules.ts";

/** "pocket-comet_HORIZONTAL full.svg" becomes "Pocket comet horizontal full". */
export function cleanName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/[-_.\s]+/g, " ").trim().toLowerCase();
  return stem ? stem.charAt(0).toUpperCase() + stem.slice(1) : "Untitled";
}

export const extension = (fileName: string) => (fileName.match(/\.([^.]+)$/)?.[1] ?? "").toLowerCase();

/** Provisional path for an uploaded file: files/<folder>/<slug>.<ext>, unique against `taken`. */
export function uploadPath(folder: string, fileName: string, taken: Set<string>): string {
  const ext = extension(fileName);
  const stem = slugify(fileName.replace(/\.[^.]+$/, ""));
  let path = `files/${folder}/${stem}.${ext}`;
  for (let n = 2; taken.has(path); n++) path = `files/${folder}/${stem}-${n}.${ext}`;
  return path;
}

/** Pixel size of a raster image, or undefined when the browser cannot read it. */
export async function imageSize(blob: Blob): Promise<{ width: number; height: number } | undefined> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return undefined;
  }
}

export const isRaster = (name: string) => ["png", "jpg", "jpeg", "webp", "gif"].includes(extension(name));
