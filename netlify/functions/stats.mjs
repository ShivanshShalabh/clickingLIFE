import { getStore } from "@netlify/blobs";

const EVENTS = { visit: "visitors", download: "downloads" };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" },
  });

const read = async (store, key) => (await store.get(key, { type: "json" })) ?? 0;

// Blobs has no atomic increment, so write only if nobody else wrote since we read, and retry otherwise.
async function bump(store, key) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await store.getWithMetadata(key, { type: "json" });
    const next = (current?.data ?? 0) + 1;
    const { modified } = await store.setJSON(key, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (modified) return next;
  }
  throw new Error(`Too many concurrent updates to ${key}`);
}

export default async (req) => {
  const store = getStore({ name: "stats", consistency: "strong" });

  if (req.method === "POST") {
    const key = EVENTS[new URL(req.url).searchParams.get("event")];
    if (!key) return json({ error: `event must be one of: ${Object.keys(EVENTS).join(", ")}` }, 400);
    await bump(store, key);
  } else if (req.method !== "GET") {
    return json({ error: "Use GET to read counts or POST ?event=visit|download to add one" }, 405);
  }

  const [visitors, downloads] = await Promise.all([read(store, "visitors"), read(store, "downloads")]);
  return json({ visitors, downloads });
};

export const config = { path: "/api/stats" };
