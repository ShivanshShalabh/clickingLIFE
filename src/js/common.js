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

// { visitors, downloads } from /api/stats. Each browser counts as one visitor, once.
// Resolves to null where the API is missing (a plain static server).
export async function countVisit() {
  const KEY = "clickingLIFE:counted";
  let counted = true;
  try {
    counted = localStorage.getItem(KEY) === "1";
  } catch {}
  try {
    const res = await fetch(counted ? "/api/stats" : "/api/stats?event=visit", { method: counted ? "GET" : "POST" });
    if (!res.ok) return null;
    if (!counted) try { localStorage.setItem(KEY, "1"); } catch {}
    return res.json();
  } catch {
    return null;
  }
}

// Every download link on the site carries the `download` attribute.
addEventListener("click", (e) => {
  if (e.target.closest?.("a[download][href]")) navigator.sendBeacon("/api/stats?event=download");
});
