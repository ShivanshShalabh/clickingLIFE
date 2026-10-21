// The page palette follows the viewer's local sky. Phase lives on <html data-sky>.
const PHASES = ["dawn", "day", "dusk", "night"];

export function phaseFor(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

// 0 at sunrise (6:00), 1 at sunset (18:00); night uses the same arc for the moon.
function arcProgress(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const t = h >= 6 && h < 18 ? (h - 6) / 12 : (((h - 18 + 24) % 24) / 12);
  return Math.min(Math.max(t, 0), 1);
}

export function setSky(phase) {
  document.documentElement.dataset.sky = phase;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
}

// Places the sun element on its arc; clicking it steps through the sky phases.
export function mountSun(el) {
  const t = arcProgress();
  el.style.setProperty("--arc-x", `${8 + t * 84}%`);
  el.style.setProperty("--arc-y", `${(1 - Math.sin(t * Math.PI)) * 70 + 8}%`);
  el.addEventListener("click", () => {
    const next = PHASES[(PHASES.indexOf(document.documentElement.dataset.sky) + 1) % PHASES.length];
    setSky(next);
    el.setAttribute("aria-label", `Sky: ${next}. Change sky`);
  });
  el.setAttribute("aria-label", `Sky: ${document.documentElement.dataset.sky}. Change sky`);
}

setSky(phaseFor());
