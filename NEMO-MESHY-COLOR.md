# Meshy Nemo coloring

**Current version: `original-reference-4`.** The user explicitly withdrew previous border/transparency requests. The original reference PNG is now the active texture on the entire body and all fins. Its orange, black border, pale outer rim and ray details are preserved without recoloring or alpha changes. `KHR_materials_unlit` preserves photographed pigment without additional directional lighting. Only a small forward-facing nose region uses inferred baked pigment to avoid mirroring the side eye down the center of the face. All source vertices and triangles are preserved; faces are partitioned into two materials. The earlier passes below are historical and superseded.

Source: `C:/Users/Thientran/Downloads/highres.glb`, 137,023 vertices and 274,042 triangles, position-only geometry.

Output: `dist/assets/nemo-meshy-colored.glb`, with embedded reference PNG, bilateral projected UVs, smooth normals and nonmetallic material. Source position and index buffers are preserved. The original downloaded model is unchanged. A copy of the output is saved as `C:/Users/Thientran/Downloads/highres-colored.glb`.

Reference: user's supplied orange/white/black clownfish PNG, copied unchanged to `dist/assets/nemo-meshy-reference.png`. UVs map the model's side bounds to the fish silhouette. Nose-facing surfaces sample clean cheek orange to avoid projecting the side eye into the center of the face.

Rebuild from the project folder:

```powershell
python scripts/color-meshy.py C:/Users/Thientran/Downloads/highres.glb dist/assets/nemo-meshy-reference.png dist/assets/nemo-meshy-colored.glb
```

Preview: `http://127.0.0.1:8080/nemo-meshy.html`. Separate static preview; the existing animated Nemo page has not been switched to this asset.

Verified in browser from both sides, oblique and front views. This is a first coloring pass from one side image; both flanks use the same projected pattern. Top, underside and fin intersections may need hand-painted UV work for close-up accuracy. No skeleton or swimming animation was added. No cloud deployment.

Fin-rim follow-up: pale neutral pixels on the outer tail, dorsal and ventral fin regions receive warm amber vertex tint and up to 28% transparency. Body bands stay opaque. The reference PNG is unchanged; the exported GLB embeds `COLOR_0` RGBA and uses `alphaMode: BLEND`, so the treatment is included in the downloadable model.

Current crown/tail fix supersedes the earlier material treatment: reference pigment is bilinearly sampled, converted from sRGB to linear and baked into `COLOR_0` on the dense mesh. The active material no longer multiplies that color by the reference texture. This allows direct blending of nose pigment without sliding UVs across the eye and white band, which caused a jagged crown streak. The crown stripe retains the original side projection; only the nose center in front of the stripe receives a smooth spatial orange blend. The original image and UVs remain embedded for reference.

The outer tail's pale rim now reaches 3% opacity, with a two-pixel neighborhood to fade the narrow outline between vertices. Other fin rims retain the earlier subtle transparency. Verified in WebGL at a steep overhead/front angle and side view; geometry remains unchanged. Evidence: `qa/nemo-meshy-crown-fixed.png` and `qa/nemo-meshy-tail-transparent.png`.

## Current reference-border pass

The user rejected the translucent amber treatment. It left mottled pale/brown outlines and weakened the dark tail border. This pass supersedes the transparency settings above: all vertex alpha is now 1 and the GLB material is OPAQUE. Neutral pale pixels in the outer fin regions are replaced by charcoal pigment sampled inside the reference tail's black border. The orange field, ray shading and black border profile remain sampled from the reference. The pale-pixel neighborhood includes the upper/lower fins, not just the tail. Body stripes and the earlier nose-center correction are retained.

Both sides and the overhead/front view were visually checked in WebGL. A larger reference image is shown below the preview for comparison. Evidence: `qa/nemo-meshy-reference-borders.png`. This targets the orange/black fin pattern while removing the photographed pale outer fringe as requested earlier; it does not reproduce that pale fringe. A single side reference cannot establish identical appearance on unseen surfaces. No geometry changes or animation were added.

## Original-reference pass (current)

Removed all fin-edge masking, amber tinting, rim expansion and transparency. Reference faces use the original PNG directly, not interpolated baked vertex colors. Inferred nose faces retain vertex pigment in their own material so they do not multiply a texture by baked colors. The viewer honors the unlit export with MeshBasicMaterial. This restores the actual tail orange/black proportions and pale outer edge present in the photograph. Checked from the side, opposite side and overhead/front in WebGL. Export verification compares the embedded PNG byte-for-byte with the supplied reference, and the triangle multiset with the source model. Evidence: `qa/nemo-meshy-original-reference.png`.

## Main Nemo page integration

The user approved this model and requested replacing the previous Nemo. `dist/nemo.js` now loads the approved GLB through `dist/nemo-meshy-model.js` for both Nemo and the companion. The main page uses the approved reference image and updated cache versions. Camera distance is adjusted for the downloaded mesh's bounds. The existing movement, steering, pause, greeting and view controls are retained.

The source GLB has no skeleton. Runtime animation adds a continuous GPU body/tail wave that preserves fin attachments, with the face held still. Inspection sets all wave and turn amplitudes to zero, preserving the approved mesh and texture exactly. This is a basic body deformation, not a separate fin/eye/mouth rig, and does not alter the downloadable GLB. Main and companion share immutable geometry/texture but keep independent material uniforms.

Validation: five Node tests pass (GLB integrity and independent animation state plus life, steering and swim tests). WebGL checked on the main page in inspection, turning and auto mode with the companion visible; no current browser errors. Evidence: `qa/nemo-main-meshy.png` and `qa/nemo-main-meshy-turn.png`. Local only; no cloud deployment.

## Flexible body, independent fins and facial motion (`flexible-2`)

User requested independent fin movement, breathing mouth/gills, gaze towards the pointer, and a more flexible full body. Added smooth per-vertex attachment masks in `dist/nemo-meshy-motion.js`, inferred from reference pixels and the mesh's depth. Four median fin regions flutter with different phases, each pectoral has its own hinge/phase, and the caudal fin has an additional delayed flick. These are soft regional deformations of the supplied mesh, not seven newly separated rigged meshes.

The body now carries a wave from the head through the trunk to the tail, with tangent-aligned cross sections and a gradual bend during turns. Effort/turn/gaze transitions use delta-based exponential smoothing. The painted pupil region shifts inside the iris; a localized gill patch expands subtly. Jaw vertices open/close with an integrated breathing phase, and an added dark oral interior follows the same full-body deformation. The approved texture/GLB is unchanged. Inspection resets every deformation and hides the oral accessory; pause leaves the current animation state frozen. Pointer gaze is active in live modes including hover, cruise, turn and auto. Companion smoothing receives the actual frame delta too.

Verification for this pass: eight Node tests pass, covering the GLB, bounded region masks and presence on both pectorals, independent fin phases, breathing/gaze state, static reset, separate companion uniforms and smoothing at 30/60/144 fps, plus existing life/steering/swim checks. JS syntax and whitespace checks pass. Shader assembly hooks are checked, but actual WebGL compilation and visual quality of these new deformations are **not yet verified**: browser tooling rejected opening the localhost page due to its URL security policy. Earlier screenshots show the earlier basic animation only; no new screenshot is claimed for this pass.

## Organic turn experiment (`organic-turn-3`)

Turns now brake translation before tight changes in heading. The head steering yaw leads the torso yaw; the torso and motion direction follow with a short lag. Tail bend follows the trunk more slowly. Pectoral strokes share the steering propulsion phase and receive opposite turn biases. A single decaying exit impulse strengthens the tail flick and forward acceleration once the new heading is nearly aligned. Head lead is also applied as a local curved deformation, rather than only rotating the entire fish. Inspection resets these states.

The Quay đầu demonstration alternates between two destinations every seven seconds, allowing approach, slowing, reversal and recovery rather than continuously chasing a circular moving target. Speed remains along torso heading to avoid sideways translation.

Local regression tests check braking distance during a sharp reversal, head/torso lag, delayed tail response, exit impulse, angular acceleration bounds and destination arrival using torso heading at 30/60/144 fps. Eight tests pass. This is an implemented motion experiment, **not yet visually accepted or live-WebGL verified**; the browser tool's previously reported localhost URL block remains unresolved. No new screenshots or live quality claims for this pass.


## Swimming arc correction (`arc-turn-4`)

The user rejected the preceding turn because braking nearly stopped translation while yaw continued. Swimming angular velocity is now bounded by forward speed divided by a 0.48-unit minimum radius. Propulsion continues through large heading changes; arrival braking applies when facing the destination. Torso heading is the actual velocity heading, with head anticipation handled locally in the mesh. Head, tail and pectoral deformation remain active.

Quay dau now follows an oval look-ahead route instead of alternating stationary destinations. Its far lane lies behind the initial lane; random heading drift is disabled for this demonstration and arrival braking is disabled because it is a continuous route. Other travel modes share the radius constraint. Stationary hover/greeting retain slow orientation changes.

Eight Node tests pass. New trajectory checks cover minimum radius, forward speed, lateral displacement during a 180-degree reversal, frame-rate consistency at 30/60/144 fps and two minutes of bounded demo loops. Existing destination arrival, life, swim and mesh checks also pass. JS syntax checks pass. Actual WebGL appearance remains unverified because the browser tool rejected localhost access; this is not visual acceptance. Approved GLB/color assets are unchanged.
