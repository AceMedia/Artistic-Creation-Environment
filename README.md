# Artistic Creation Environment

Artistic Creation Environment is a WordPress plugin that adds an immersive Creative container block plus artistic button and text effects. It currently ships WebGL/canvas backgrounds for liquid splash, ASCII world, aurora flow, particle constellation, neon topography, glass caustics, and magnetic dust.

## Requirements

- WordPress 6.9 or later
- PHP 7.4 or later
- Node.js and npm for asset builds

## Build

```sh
npm install
npm run build
```

`build/` is intentionally committed so the plugin remains installable without a deployment-time asset build. The build step compiles the editor bundle with `@wordpress/scripts` and copies standalone effect runtimes from `src/` with `scripts/copy-effects.mjs`.

## Runtime Loading

Frontend pages enqueue only the scripts needed by rendered markup:

- selected Creative background runtime plus `frontend.js`
- liquid glass vendor/runtime scripts only when liquid glass markup is present
- button, scramble, and magic text runtimes only when their saved classes appear

The block editor still preloads the full runtime set so previews can switch effects without a reload.

## Browser Verification

Run a local WordPress page containing each effect and check:

- each Creative preview renders a nonblank canvas or ASCII output
- no console errors are emitted during initialisation
- liquid glass creates lenses, keeps targets visible and clickable, supports tinting and fade reveal, and refreshes after scroll/resize
- reduced-motion mode avoids unnecessary animation where the runtime supports it

## Repository Extraction

This plugin is intended to live in `AceMedia/Artistic-Creation-Environment` and be submoduled back into `AceMedia/EgbertTaylor` at `assets/plugins/Artistic-Creation-Environment`.
