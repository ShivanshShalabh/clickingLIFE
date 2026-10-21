// /slideshow?tag=snow,sunset&interval=8&fit=cover&zoom=off
import { describe, filterByTag, shuffle } from "./photos.js";
import { loadManifest, preload, screenWidth } from "./common.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const tag = params.get("tag") || "";
const seconds = Math.max(3, Number(params.get("interval")) || 8);
const cover = params.get("fit") === "cover";
const stage = $("#stage");
const progress = $("#progress");

document.documentElement.style.setProperty("--dur", `${seconds}s`);

let queue = [];
let seen = [];
let pos = -1;
let timer;
let paused = false;
let zoom = params.get("zoom") !== "off";

function message(title, text, link) {
  document.querySelector(".hud").hidden = true;
  const box = document.createElement("div");
  box.className = "stage-message";
  box.innerHTML = `<h1></h1><p></p>`;
  box.querySelector("h1").textContent = title;
  box.querySelector("p").textContent = text + " ";
  if (link) box.querySelector("p").append(Object.assign(document.createElement("a"), link));
  stage.replaceChildren(box);
}

// Endless random order: reshuffle each lap, never repeating the last photo first.
function nextPhoto() {
  if (!queue.length) {
    const last = seen.at(-1);
    queue = shuffle(photos);
    if (queue.length > 1 && queue[0] === last) queue.push(queue.shift());
  }
  return queue.shift();
}

async function go(step) {
  clearTimeout(timer);
  if (step > 0 && pos === seen.length - 1) seen.push(nextPhoto());
  pos = Math.max(0, Math.min(seen.length - 1, pos + step));
  const photo = seen[pos];

  const img = await preload(photo.src, screenWidth());
  if (seen[pos] !== photo) return; // user skipped while loading
  img.className = "slide burns" + (cover ? " cover" : "");
  img.alt = describe(photo);
  img.style.setProperty("--dx", `${(Math.random() * 4 - 2).toFixed(2)}%`);
  img.style.setProperty("--dy", `${(Math.random() * 4 - 2).toFixed(2)}%`);
  img.style.transformOrigin = `${20 + Math.random() * 60}% ${20 + Math.random() * 60}%`;

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  backdrop.style.setProperty("--bg", `url("${img.src}")`);

  const old = [...stage.children];
  stage.append(backdrop, img);
  requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("on")));
  setTimeout(() => old.forEach((el) => el.remove()), 2000);

  $("#meta").textContent = photo.tags.join(", ");
  progress.classList.remove("run");
  void progress.offsetWidth; // restart the CSS animation
  progress.classList.add("run");

  preload(peek().src, screenWidth());
  schedule();
}

const peek = () => (pos < seen.length - 1 ? seen[pos + 1] : (queue[0] ??= nextPhoto()));

function schedule() {
  clearTimeout(timer);
  if (!paused) timer = setTimeout(() => go(1), seconds * 1000);
}

function togglePause() {
  paused = !paused;
  document.body.classList.toggle("paused", paused);
  $(".i-pause").toggleAttribute("hidden", paused);
  $(".i-play").toggleAttribute("hidden", !paused);
  $("#pause").setAttribute("aria-label", paused ? "Play (space)" : "Pause (space)");
  // a resumed slide gets a fresh full interval, matching the restarted progress bar
  if (!paused) go(0);
  else clearTimeout(timer);
}

// slow Ken Burns zoom on each slide; the choice is kept in the URL so it survives reloads
function setZoom(on) {
  zoom = on;
  document.body.classList.toggle("no-zoom", !on);
  $("#zoom").setAttribute("aria-pressed", on);
  $(".i-off").toggleAttribute("hidden", on);
  if (on) params.delete("zoom");
  else params.set("zoom", "off");
  history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

$("#next").onclick = () => go(1);
$("#prev").onclick = () => go(-1);
$("#pause").onclick = togglePause;
$("#fullscreen").onclick = toggleFullscreen;
$("#zoom").onclick = () => setZoom(!zoom);

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === " " && e.target === document.body) { e.preventDefault(); togglePause(); }
  else if (e.key.toLowerCase() === "f") toggleFullscreen();
  else if (e.key.toLowerCase() === "z") setZoom(!zoom);
});

// hide controls and cursor after a few still seconds
let idle;
const wake = () => {
  document.body.classList.remove("idle");
  clearTimeout(idle);
  idle = setTimeout(() => document.body.classList.add("idle"), 2500);
};
["mousemove", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, wake, { passive: true }));
wake();

setZoom(zoom);

let photos = [];
try {
  photos = filterByTag((await loadManifest()).photos, tag);
  if (photos.length) go(1);
  else if (tag) message("Nothing tagged that yet.", `No photos match “${tag}”.`, { href: "/slideshow", textContent: "Play everything" });
  else message("No photos yet.", "Add images to the photos folder and redeploy.", { href: "/", textContent: "Back to the gallery" });
} catch (err) {
  message("Photos could not load.", err.message);
}
