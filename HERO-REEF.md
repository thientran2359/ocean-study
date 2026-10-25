# Local reef hero — 2026-10-13

The user approved a light two-column concept: text on the left and a 3D rock/anemone with two Nemo on the right. The previous full-page ocean/scroll animation is removed from the homepage. The existing encounter content remains below as a normal static section. The standalone Nemo study is retained.

## Implementation

- `dist/index.html`, `dist/style.css`, `dist/app.js`: responsive light hero, existing species/about interactions, labelled dialog and focus restoration.
- `dist/reef-model.js`: deterministic procedural rock shelf/back wall, 176 curved tapered tentacles in a merged mesh with individually phased GPU sway; lavender/peach/cream vertex pigment. This is a code-generated 3D model, not the generated concept image or a scanned asset. Physical material is opaque with soft lighting, not actual subsurface scattering.
- `dist/reef-hero.js`: local Three.js rendering confined to the hero; two instances of the approved Meshy GLB share geometry/texture with independent motion uniforms. Continuous tangent-aligned routes, body/fin/breath animation and subtle pointer gaze. One smaller fish stays near the anemone. Scene depth handles occlusion.
- Pause freezes scene time and motion. Reduced-motion starts paused. Hidden/offscreen scenes stop updating/rendering; pixel ratio capped at 1.5. Static reference imagery remains visible during loading or if WebGL fails.
- Approved GLB/texture and the independent Nemo study are unchanged by this hero implementation.

## Validation and limits

10 Node tests pass: geometry/weights/shader assembly, both forward swimming paths and camera framing at desktop/mobile aspect ratios, approved GLB integrity and existing Nemo behavior regressions. JS syntax and diff whitespace checks pass. Local HTTP checks verify HTML, CSS, modules and the GLB return 200 with byte-for-byte matching files.

These are code and mathematical checks, not real browser visual QA. Actual WebGL shader compilation, visual fidelity, UI interactions and on-device performance remain unverified because browser access was previously blocked. No screenshot or exact match to the AI concept is claimed. Local only, no cloud publication.

Preview: http://127.0.0.1:8080/?v=reef-hero-1
