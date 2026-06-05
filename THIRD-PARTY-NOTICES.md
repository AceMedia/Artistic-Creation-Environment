# Third-Party Notices

This plugin bundles browser-side reference code so WordPress installs can run without fetching assets from external CDNs.

## html2canvas

- File: `src/html2canvas.vendor.js`
- Purpose: DOM snapshot support for liquid glass rendering.
- Upstream: https://html2canvas.hertzen.com/
- Licence: MIT

## liquidGL

- File: `src/liquidGL.vendor.js`
- Purpose: WebGL lens renderer used by liquid glass targets.
- Local notes: bundled with ACE-specific guards around visibility, pointer events, tinting, stacking, and refresh behaviour.

## Fluid Simulation Reference

- Files: `src/fluid-simulation.js`, `src/vendor/fluid-sim-upstream.js`
- Purpose: Pavel Dobryakov-style WebGL fluid simulation adapted for the Creative block.
- Upstream reference: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
- Licence: MIT
