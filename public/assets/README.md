# Homepage background images

Background images live only in `public/assets/` (served at `/assets/`). Do not use a root-level `assets/` folder.

Place two images here for the homepage view switcher:

- **mirror.webp** – background when "Mirror" is selected
- **frame.webp** – background when "Frame" is selected

Both are shown full viewport (fixed, centered, `object-fit: cover`). Paths in `src/app/page.tsx` point to `/assets/mirror.webp` and `/assets/frame.webp`.
