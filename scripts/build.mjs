// Builds the static site into dist/: copies src/ and photos/, writes
// dist/manifest.json listing every image under photos/ with folder names as tags,
// and packs all photos into one zip for the "Download all" link.
import { closeSync, cpSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { crc32 } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const PHOTOS = join(ROOT, "photos");
const DIST = join(ROOT, "dist");
const ARCHIVE = "clickingLIFE-photos.zip";
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (IMAGE_EXTS.has(extname(entry.name).toLowerCase())) yield full;
  }
}

// Minimal zip writer. Entries are stored uncompressed: photos are already
// compressed, so deflate would cost build time for almost no size gain.
function writeZip(out, files) {
  const fd = openSync(out, "w");
  const central = [];
  let offset = 0;
  const write = (buf) => { writeSync(fd, buf); offset += buf.length; };

  for (const { path, name } of files) {
    const data = readFileSync(path);
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const d = statSync(path).mtime;
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    if (offset + data.length > 0xffffffff) throw new Error("Photos exceed 4 GB; the zip writer does not support ZIP64");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);       // version needed
    local.writeUInt16LE(0x0800, 6);   // UTF-8 file names
    local.writeUInt16LE(0, 8);        // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);       // version made by
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);

    write(local);
    write(nameBuf);
    write(data);
  }

  const dirStart = offset;
  central.forEach(write);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(offset - dirStart, 12);
  end.writeUInt32LE(dirStart, 16);
  write(end);
  closeSync(fd);
  return offset;
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(SRC, DIST, { recursive: true });
cpSync(PHOTOS, join(DIST, "photos"), { recursive: true });

const files = [...walk(PHOTOS)]
  .map((path) => ({ path, parts: relative(PHOTOS, path).split(sep) }))
  .sort((a, b) => a.parts.join("/").localeCompare(b.parts.join("/")));

const photos = files.map(({ parts }) => ({
  src: "/photos/" + parts.map(encodeURIComponent).join("/"),
  tags: [...new Set(parts.slice(0, -1).map((t) => t.toLowerCase()))],
}));

const manifest = { photos };
if (files.length) {
  const bytes = writeZip(join(DIST, ARCHIVE), files.map(({ path, parts }) => ({ path, name: `clickingLIFE/${parts.join("/")}` })));
  manifest.archive = { src: `/${ARCHIVE}`, bytes };
}

writeFileSync(join(DIST, "manifest.json"), JSON.stringify(manifest));
console.log(`manifest: ${photos.length} photos${manifest.archive ? `, ${ARCHIVE} ${(manifest.archive.bytes / 1e6).toFixed(1)} MB` : ""}`);
