import { filterByTag, shuffle, sized, tagCounts } from "../../src/js/photos.js";

let manifest;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" },
  });

export default async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams;

  if (!manifest) {
    const res = await fetch(new URL("/manifest.json", url.origin));
    if (!res.ok) return json({ error: `Could not load manifest.json (HTTP ${res.status})` }, 500);
    manifest = await res.json();
  }

  const photos = filterByTag(manifest.photos, q.get("tag"));
  if (!photos.length) {
    const known = tagCounts(manifest.photos).map(([t]) => t);
    return json({ error: `No photos match tag "${q.get("tag")}".`, tags: known }, 404);
  }

  if (url.pathname === "/api/random") {
    const photo = shuffle(photos)[0];
    if (q.get("format") === "json") return json({ ...photo, url: new URL(photo.src, url.origin).href });
    const width = Number(q.get("w")) || 0;
    return new Response(null, {
      status: 302,
      headers: { location: sized(photo.src, width), "cache-control": "no-store" },
    });
  }

  const ordered = q.get("shuffle") === "true" ? shuffle(photos) : photos;
  const limit = Number(q.get("limit")) || ordered.length;
  return json({ count: photos.length, photos: ordered.slice(0, limit), tags: tagCounts(photos) });
};

export const config = { path: ["/api/photos", "/api/random"] };
