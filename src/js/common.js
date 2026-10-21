import { sized } from "./photos.js";

// { photos: [{ src, tags }], archive?: { src, bytes } }
export async function loadManifest() {
  const res = await fetch("/manifest.json");
  if (!res.ok) throw new Error(`manifest.json returned HTTP ${res.status}`);
  return res.json();
}

// Netlify Image CDN only exists on Netlify (or `netlify dev`); fall back to the original file.
export function setImage(img, src, width) {
  img.onerror = () => {
    img.onerror = null;
    img.src = src;
  };
  img.src = sized(src, width);
}

export function preload(src, width) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (img.src.endsWith(src)) return resolve(img);
      img.src = src;
    };
    img.src = sized(src, width);
  });
}

// Viewport-sized width, rounded so the CDN caches a few variants instead of many.
export const screenWidth = () =>
  Math.min(2560, Math.ceil((innerWidth * devicePixelRatio) / 320) * 320);
