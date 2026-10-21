// /random?tag=snow — one photo at a time, opened with a shutter iris.
import { describe, filterByTag, shuffle } from "./photos.js";
import { countVisit, loadManifest, preload, screenWidth } from "./common.js";

countVisit();

const stage = document.querySelector("#stage");
const title = document.querySelector("#title");
const download = document.querySelector("#download");
const another = document.querySelector("#another");
const tag = new URLSearchParams(location.search).get("tag") || "";

let deck = [];
let last;

function draw() {
  if (!deck.length) {
    deck = shuffle(photos);
    if (deck.length > 1 && deck[0] === last) deck.push(deck.shift());
  }
  return (last = deck.shift());
}

async function reveal(x = innerWidth / 2, y = innerHeight / 2) {
  const photo = draw();
  const img = await preload(photo.src, screenWidth());

  const frame = document.createElement("div");
  frame.className = "stage iris";
  frame.style.setProperty("--ix", `${x}px`);
  frame.style.setProperty("--iy", `${y}px`);
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  backdrop.style.setProperty("--bg", `url("${img.src}")`);
  img.className = "slide on";
  img.alt = describe(photo);
  frame.append(backdrop, img);

  const old = [...stage.children];
  stage.append(frame);
  requestAnimationFrame(() => requestAnimationFrame(() => frame.classList.add("open")));
  setTimeout(() => old.forEach((el) => el.remove()), 1000);
  title.textContent = photo.tags.join(", ");
  download.href = photo.src;
}

another.addEventListener("click", (e) => {
  // keyboard activation reports 0,0 — open from the button's centre instead
  const r = another.getBoundingClientRect();
  reveal(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
});
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" || e.key === "ArrowRight") reveal();
});

let photos = [];
try {
  photos = filterByTag((await loadManifest()).photos, tag);
} catch (err) {
  title.textContent = `Photos could not load: ${err.message}`;
}
if (photos.length) reveal();
else {
  another.hidden = true;
  download.hidden = true;
  if (!title.textContent) title.textContent = tag ? `No photos match “${tag}” yet.` : "No photos yet.";
}
