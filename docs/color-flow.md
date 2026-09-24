# Color / Flow — one material workstation

Gallery study 021 uses the existing `sand-flow` anchor and source entry. Five material studies live in one two-column component: vertical square material selectors, an interactive square preview on the left, and the selected material’s parameter panel on the right. Each renderer remains independent.

- Tidal sand: palette, speed, flow scale, grain. Uses the original ticket’s Paper Dithering warp/random shader; see `sand-flow.md` for exact defaults and attribution.
- Marbled ink: palette, speed, swirl. Uses the unmodified official Paper Warp shader and ShaderMount runtime from `@paper-design/shaders` 0.0.81 with embedded noise. Attribution is under `public/licenses/paper-shaders/` and the expanded panel links to the original.
- Liquid metal: palette, speed, relief.
- Moving print: palette, speed, dot size.
- Prism stream: palette, light pace, band width. A Canvas 2D renderer bakes 1,535 straight colored fibers with rough edges and soft scattering. A continuous animated reflection field modulates the material per pixel, preserving its grain inside highlights without stamping separate bright shapes. Static microscopic grain and a gradual highlight shoulder retain texture. Band width compresses the entire dense bundle across its direction; it never removes strands. The renderer pauses outside the viewport and respects reduced motion through the shared playback lifecycle.

Click the square selectors, or use Up/Down and Home/End while focused. Only the active renderer is mounted; switching starts the selected material at its defaults. The studio keeps only color swatches and quiet gray sliders; narrative copy and internal Pause/Restart controls are omitted. Values appear on slider hover/focus. Accessible labels, reduced-motion handling, whole-card tilt, and the shared gallery replay remain. Gallery replay resets the component to sand.

The gallery component spans two columns above 720px, one below, and retains the shared stage height. Its square preview is capped at 300px and shrinks with available space. On narrow component widths, the selectors stay vertical beside the preview while parameters move below. Short stages omit narrative copy so controls remain reachable.

All five `/studies/` routes open this same combined component with their corresponding material selected. Standalone presentation uses the same layout in a 370px stage.

Local verification: production build, TypeScript, focused lint, desktop/tablet/mobile layout, four-way selection and keyboard navigation. No publishing or GitHub push is authorized.

## Custom color direction

Each material has four palettes (20 total). The existing defaults stay selected on mount.

| Material | Warm options | Cool options |
| --- | --- | --- |
| Sand | Apricot, Petal | Lagoon, Iris |
| Ink | Coral, Peach | Mint, Periwinkle |
| Metal | Champagne, Rose gold | Glacier, Lavender |
| Print | Watermelon, Papaya | Bluebell, Lilac |
| Prism stream | Ember | Aurora, Opal, Silver |

The print’s third ink derives from its active paper tint, preserving each palette’s temperature. Material thumbnails derive colors from the default palette; selectors remain flat dots. All five materials retain the subtle pointer-following white reflection (16% alpha); reduced motion disables it and pointer exit fades it out.
