# clickingLIFE

A photo gallery for everyday pictures: sunrises, sunsets, snow, trees. It is a static site on Netlify with one small serverless function for the API. There is no database and no upload form. The `photos/` folder in this repo is the source of truth.

The page colors follow the visitor's local time of day (dawn, day, dusk, night). Click the sun in the header to cycle through the four skies.

## Adding photos

Put images anywhere under `photos/` (jpg, jpeg, png, webp, avif, gif), then commit and push. Netlify rebuilds the site on its own.

Each folder in a photo's path becomes a tag, in lowercase:

```
photos/sunset/lake.jpg             -> tags: sunset
photos/nature/snow/first-snow.jpg  -> tags: nature, snow
photos/IMG_2041.jpg                -> no tags
```

Filenames are never shown on the site. Photos are labeled by their tags only.

Keep originals at a sensible size (about 4000px on the long edge or less). Netlify's Image CDN makes the small versions for the grid, but GitHub refuses files over 100 MB, and big repos make every deploy slower.

## Pages

| URL | What it shows |
| --- | --- |
| `/` | Gallery with tag filters and a "Download all" link (a zip of every photo, built on each deploy). Click a photo to open it; arrow keys move between photos, and the download button saves the original. |
| `/?tag=snow` | Gallery filtered to one tag. |
| `/slideshow` | Full-screen slideshow in random order. Space pauses, arrows skip, F goes full screen, Z turns the slow zoom on or off. |
| `/slideshow?tag=sunset,snow&interval=5&fit=cover&zoom=off` | Only those tags, 5 seconds per photo, photos fill the screen instead of fitting inside it, no slow zoom. |
| `/random` | One random photo, with a download button. Press "Another one" or R for the next. |
| `/random?tag=trees` | Random photo from one tag. |

## API

`tag` takes one tag or a comma-separated list. A photo matches if it has any of the listed tags. Tags are not case-sensitive.

- `GET /api/photos` returns `{ count, photos, tags }`. Optional: `tag`, `shuffle=true`, `limit=10`.
- `GET /api/random` redirects (302) to a random image file. Use it directly as an image: `<img src="https://your-site.netlify.app/api/random?tag=snow&w=1200">`. Optional: `tag`; `w` returns a resized copy that many pixels wide.
- `GET /api/random?format=json` returns the photo's details instead of redirecting.

If nothing matches, both endpoints return 404 with the list of known tags.

- `GET /api/stats` returns `{ visitors, downloads }`. The gallery footer shows these numbers.
- `POST /api/stats?event=visit` or `?event=download` adds one and returns the new counts. The pages call it for you: each browser counts as one visitor (remembered in `localStorage`), and every click on a download button, including "Download all", counts as one download.

The counts live in a Netlify Blobs store named `stats`. They are approximate: anyone can POST to the endpoint, a visitor who clears site data counts again, and photos saved by right-click or by opening the file URL directly are not counted. To reset them, delete the `visitors` and `downloads` entries under Blobs in the Netlify UI.

## Deploying to Netlify

1. Push this repo to GitHub.
2. In Netlify, choose "Add new site", then "Import an existing project", and pick the repo.
3. Netlify reads `netlify.toml`, so the build settings fill in on their own. Deploy.

## Running locally

```
npm run build   # writes dist/ and dist/manifest.json
npm run dev     # build, then run Netlify's local server (API and image resizing included)
```

To view only the pages without the API, serve `dist/` with any static server, for example `python3 -m http.server -d dist`. Pages then use the original images, because image resizing exists only on Netlify.

## License

Photos © 2026 Shivansh Shalabh, licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). You may use and share them for personal, non-commercial purposes with credit to "Shivansh Shalabh / clickingLIFE". Commercial use, such as ads, products for sale, stock sites or client work, needs permission first.

The site code is MIT licensed. See [LICENSE](LICENSE) for both.

## Layout

```
photos/                 your images (folders become tags)
src/                    HTML, CSS and browser JavaScript, copied into dist/ as-is
src/js/photos.js        tag filtering and shuffling, shared by pages and the API
scripts/build.mjs       builds dist/ and the photo manifest
netlify/functions/      /api/photos, /api/random and /api/stats
```
