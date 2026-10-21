// Shared by the browser pages and the Netlify function.

// tag param is comma-separated; a photo matches if it has any of the tags.
export function filterByTag(photos, tagParam) {
  const wanted = (tagParam || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!wanted.length) return photos;
  return photos.filter((p) => p.tags.some((t) => wanted.includes(t)));
}

export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Alt text and on-screen label; photos have no titles, so describe them by tag.
export function describe(photo) {
  return photo.tags.length ? `Photo tagged ${photo.tags.join(", ")}` : "Photo";
}

export function tagCounts(photos) {
  const counts = new Map();
  for (const p of photos) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Resized copy through Netlify Image CDN; full original when no width given.
export function sized(src, width) {
  return width ? `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}` : src;
}
