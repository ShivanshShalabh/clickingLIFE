import { describe, filterByTag, shuffle, tagCounts } from "./photos.js";
import { countVisit, loadManifest, preload, screenWidth, setImage } from "./common.js";
import { mountSun } from "./sky.js";

const $ = (s) => document.querySelector(s);
const wordmark = $(".wordmark");
const gallery = $("#gallery");
const tagbar = $("#tags");
const lightbox = $("#lightbox");
const lbImg = lightbox.querySelector("img");

let all = [];
let shown = [];
let current = 0;

mountSun($(".sun"));

countVisit().then((stats) => {
  if (!stats) return;
  const n = (count, word) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
  $("#stats").textContent = `${n(stats.visitors, "visitor")} · ${n(stats.downloads, "download")}`;
  $("#stats").hidden = false;
});

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const tagFromUrl = () => new URLSearchParams(location.search).get("tag") || "";

function withTag(path, tag) {
  return tag ? `${path}?tag=${encodeURIComponent(tag)}` : path;
}

function renderTags(active) {
  const counts = tagCounts(all);
  tagbar.hidden = counts.length === 0;
  const chip = (tag, label, n) =>
    `<button class="tag" type="button" data-tag="${esc(tag)}" aria-pressed="${tag === active}">${esc(label)}<sup>${n}</sup></button>`;
  tagbar.innerHTML = chip("", "everything", all.length) + counts.map(([t, n]) => chip(t, t, n)).join("");
}

function renderGallery(tag) {
  shown = filterByTag(all, tag);
  $("#play").href = withTag("/slideshow", tag);
  $("#random").href = withTag("/random", tag);
  $("#count").textContent = tag
    ? `${shown.length} of ${all.length} photos tagged ${tag}`
    : all.length ? `${all.length} photo${all.length === 1 ? "" : "s"} so far` : "No photos yet";

  if (!all.length) {
    gallery.innerHTML = `<section class="empty">
      <h2>The film is still in the camera.</h2>
      <p>Add images to <code>photos/</code> and push. Put them in folders like <code>photos/snow/</code> and each folder name becomes a tag.</p>
    </section>`;
    return;
  }

  gallery.innerHTML = "";
  shown.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className = "photo";
    btn.type = "button";
    btn.dataset.index = i;
    const img = document.createElement("img");
    img.alt = describe(p);
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("load", () => img.classList.add("loaded"));
    setImage(img, p.src, 720);
    btn.append(img);
    gallery.append(btn);
  });
}

function select(tag, push = true) {
  if (push) history.pushState(null, "", withTag(location.pathname, tag));
  renderTags(tag);
  renderGallery(tag);
}

function show(index) {
  current = (index + shown.length) % shown.length;
  const p = shown[current];
  lbImg.alt = describe(p);
  setImage(lbImg, p.src, screenWidth());
  lightbox.querySelector("[data-download]").href = p.src;
  lightbox.querySelector(".tags").innerHTML = p.tags
    .map((t) => `<a href="${esc(withTag("/", t))}" data-tag="${esc(t)}">${esc(t)}</a>`)
    .join("");
  // warm up the neighbours so arrow keys feel instant
  preload(shown[(current + 1) % shown.length].src, screenWidth());
}

function open(index, x, y) {
  show(index);
  lightbox.style.setProperty("--ix", `${x}px`);
  lightbox.style.setProperty("--iy", `${y}px`);
  lightbox.classList.add("iris");
  lightbox.classList.remove("open");
  lightbox.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => lightbox.classList.add("open")));
}

gallery.addEventListener("click", (e) => {
  const btn = e.target.closest(".photo");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  open(Number(btn.dataset.index), r.left + r.width / 2, r.top + r.height / 2);
});

tagbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tag");
  if (btn) select(btn.dataset.tag);
});

lightbox.addEventListener("click", (e) => {
  const step = e.target.closest("[data-step]");
  if (step) return show(current + Number(step.dataset.step));
  if (e.target.closest("[data-close]")) return lightbox.close();
  const tagLink = e.target.closest("a[data-tag]");
  if (tagLink) {
    e.preventDefault();
    lightbox.close();
    select(tagLink.dataset.tag);
    tagbar.scrollIntoView({ behavior: "smooth" });
  }
});

lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") show(current + 1);
  if (e.key === "ArrowLeft") show(current - 1);
});

addEventListener("popstate", () => select(tagFromUrl(), false));

try {
  const manifest = await loadManifest();
  all = manifest.photos;
  if (manifest.archive) {
    const archiveLink = $("#download-all");
    archiveLink.href = manifest.archive.src;
    archiveLink.querySelector("small").textContent = `${Math.round(manifest.archive.bytes / 1e6)} MB`;
    archiveLink.hidden = false;
  }
} catch (err) {
  gallery.innerHTML = `<section class="empty"><h2>Photos could not load.</h2><p>${err.message}. Run <code>npm run build</code> to create it.</p></section>`;
}

select(tagFromUrl(), false);

if (all.length) {
  const pick = shuffle(all)[0];
  const img = await preload(pick.src, 1600);
  wordmark.style.setProperty("--fill", `url("${img.src}")`);
  wordmark.classList.add("filled");
}
wordmark.classList.add("ready");
