# Nemo: rebuild from the approved illustration

The local `/nemo.html` now uses `dist/nemo-reference-model.js`, not the old
`dist/nemo-model.js`. The old implementation is retained for comparison.

## Construction

- `dist/nemo-reference-shape.js` records torso and fin landmarks in the pixel
  coordinates of the original `dist/assets/fish.png` (1536 x 1024).
- The torso is a new closed, asymmetric loft. Its upper and lower profiles are
  traced separately. Depth is inferred from the approved three-quarter concept;
  it is not a measured reconstruction of an existing fish or an automatic
  image-to-3D model.
- Every fin is rebuilt from its own traced outline and root, with two thin
  surfaces, a rim, and subtle radial relief. Eye surfaces follow the cheek.
  Mouth lips have separate volume and breathing motion.
- Geometry and projected painting use the same image coordinates. A small GPU
  pigment repair replaces the pectoral painted into the torso so the independent
  fin does not leave a duplicate. The original PNG is unchanged.
- The new model retains the `createClownfish`/`animate` interface for existing
  life, steering and swim controllers. It loads only the original illustration;
  the old striped body texture and old material module are not used.

## Verification

- `node --test tests/nemo-reference-model.test.mjs tests/nemo-life.test.mjs tests/nemo-steering.test.mjs tests/nemo-swim.test.mjs`: four passing suites.
- New mesh: 71,472 triangles; finite coordinates and skin weights; bounded
  deformation checked at 30/60/144 simulated frames per second.
- Local WebGL inspected from both sides, three-quarter and front, plus turning.
- Pause/reduced motion inspected in the browser. Two consecutive native viewport
  screenshots of the settled paused scene were byte-identical. Browser media
  emulation is restored after verification.
- A shader compilation error in the first render was fixed; the successful
  render is the basis for the final screenshots, not the first failed frame.

This records implementation and checks. Visual approval still belongs to the
user; no numerical similarity percentage or production acceptance is claimed.
No cloud deployment was made for this local rebuild.

## Follow-up: thickness and attachment defects

The user marked muzzle/chin and pectoral/ventral seams on screenshots. The next
local revision reduces lateral thickness by approximately 23 percent on the
trunk and 29 percent on the cheeks, with a smaller ventral tuck. Length and
dorsal shoulder height are retained. The mouth is narrower and projects less.

Torso UVs sample farther inside the painting rather than its background near
the chin. The pectoral pigment repair covers the complete original painted fin;
fin rim UVs sample slightly inward to avoid its white fringe/background. Fin
relief and rim thickness are reduced. Their roots now follow torso skinning
instead of relying solely on a rigid bone. The face stays with the head bone.

The geometry regression test checks head weights, slimmer bounds and all seven
fin roots against the deformed torso at 30/60/144 fps. Low front and low rear
views are used for browser verification, matching the marked defect views.
