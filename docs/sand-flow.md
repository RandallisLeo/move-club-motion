# Sand / Flow material within Color / Flow

Local preview: http://localhost:3000/#sand-flow

## Source

The user supplied `admit-one-ticket.tsx` in `/Users/dairandall/.codex/attachments/411ab6bd-1c31-4998-b7e2-65cb6529c68e/pasted-text.txt`. Its `ditheringFragmentShader` template is byte-identical to `@paper-design/shaders` 0.0.81's Dithering template. The ticket uses the generative Dithering branch, not its alternative ImageDithering branch.

Original ticket defaults (recorded for provenance; the current card uses custom Apricot colors): back `#ef671c`, front `#ffc691`, shape `warp`, type `random`, pixel size `0.5`, scale `1`, speed `0.4`. `colorHighlight` and the radial gradient are not used in that generative branch. A separate pointer-positioned white reflection has alpha 0.16.

## Integration

The previous procedural approximation and artificial edge bloom have been replaced with the unmodified official Dithering shader and ShaderMount runtime. The current default palette is Apricot (`#f68b5c` / `#fff2af`); original ticket colors are no longer used. Existing Apache-2.0 license and notices are retained in `public/licenses/paper-shaders/`.

`components/demos/sand-dithering-engine.ts` adapts the original renderer to the existing lifecycle. At default settings, the original 741px reference width is mapped to the smaller square by setting scale to `surfaceWidth / 741`. This preserves horizontal material framing and reveals more vertical material than the wide ticket. Grain size remains in actual CSS pixels.

Controls: 1× speed maps to the original 0.4; Flow scale changes the material zoom; Grain 80% maps to the original 0.5px random dither. The original translucent reflection follows the pointer above the surface, without changing shader coordinates. No ticket typography, notch geometry, sounds, or unrelated setup instructions were imported.

Only the active material is mounted. Reduced motion and offscreen/hidden-tab playback suspension use the existing lifecycle. Color swatches remain flat; material selectors remain transparent with only the selected outline.

This reuses the source algorithm and defaults, but does not claim an identical video phase or composition: the viewport is square and the source video phase is unknown. Local only; no deployment or push.
