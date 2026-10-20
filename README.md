# Artistic Creation Environment

Artistic Creation Environment is a WordPress plugin that adds an immersive **Creative** container block with interactive WebGL and canvas backgrounds, plus animated text effects for the block editor. Drop content inside a Creative block and it sits on top of a live generative background.

**Status: early-stage (version 0.1.0).** One listed background, Holographic Mesh, is marked as a concept in the settings page and is not yet available.

## Features

- A **Creative** block (`artistic-creation-environment/creative`) with selectable backgrounds: Liquid Splash, ASCII World, Aurora Flow, Glass Caustics, Neon Topography, Particle Constellation and Magnetic Dust.
- Rich-text text effects: Scramble, Magic, Aurora, Neon, Prism, Plasma, Inferno and Glass.
- Button effects, and a liquid glass lens effect for targets inside Creative blocks.
- A settings page with defaults for the liquid fluid simulation (diffusion, pressure, autoplay intensity, audio input, bloom, sunrays and more).
- Scripts load only when the rendered page uses them. The block editor preloads everything so previews can switch effects without reloading.
- Bundled libraries, so nothing is fetched from external CDNs. See `THIRD-PARTY-NOTICES.md`.

## Requirements

- WordPress 6.9 or later
- PHP 7.4 or later
- A modern browser with WebGL for the WebGL backgrounds

## Installation

### From a release

1. Download the zip from the [latest GitHub Release](https://github.com/AceMedia/Artistic-Creation-Environment/releases/latest).
2. In WordPress, go to **Plugins > Add New > Upload Plugin**, choose the zip and install.
3. Activate **Artistic Creation Environment**.

### From source

```bash
git clone https://github.com/AceMedia/Artistic-Creation-Environment.git
cd Artistic-Creation-Environment
npm install
npm run build
```

`build/` is committed, so the plugin is installable without a build step.

## Usage

1. Edit a page or post and insert the **Creative** block.
2. Choose a background in the block settings and add your content inside.
3. Select text and apply one of the text effects from the formatting toolbar.
4. Set site-wide fluid defaults under **Settings > Artistic Creation Environment**.

## Development

```bash
npm install
npm start               # watch the editor bundle
npm run build           # wp-scripts build, then copy standalone effects
npm run build:effects   # copy effect runtimes only (scripts/copy-effects.mjs)
```

The editor bundle is built from `src/index.js`. Standalone effect runtimes in `src/` are copied to `build/` by `scripts/copy-effects.mjs`. To test, load a local WordPress page with each effect and check for a non-blank canvas, no console errors and sensible reduced-motion behaviour.

## Licence

GPL-2.0-or-later. See `LICENSE`.

## Author and repository

Shane Rounce, [AceMedia](https://acemedia.ninja).
Repository: https://github.com/AceMedia/Artistic-Creation-Environment
