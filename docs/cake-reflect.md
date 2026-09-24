# Cake / Reflect

Local preview: `http://localhost:5173/studies/cake-reflect`.
Gallery: study `018`, Space category, `/#cake-reflect`.

## Interaction

- The stand turns clockwise, easing up to its natural pace after a pause.
- Hover the visible cakes, mirrors, platter or their editing buttons to pause. Empty canvas space, the page and the sidebar keep the stand turning. A picking mask distinguishes visible scene surfaces from background pixels, independently of which cake can be edited. Horizontal and vertical drags move the visible stand with the hand: dragging down brings the near edge down and reveals more of the top; dragging up lowers the viewing angle. Diagonal drags combine both axes. Releasing over the subject keeps it still; releasing over empty space resumes rotation.
- Choose 3, 6, or 8 radial, double-sided mirrors. Changing the count automatically fills every compartment.
- Hover a real cake on the turntable to reveal its × at the center of its curved outer face, then click to remove it. The same button becomes + at exactly that position and becomes × again when restored. Both actions share one projected anchor per cake. Mirror images never trigger editing controls; an obscured slot becomes accessible by turning the stand or revealing the slices. Restore-anchor visibility queries include the missing cake body only in the picking pass, preserving the same mirror occlusion without creating an invisible hover target.
- On touch screens, tap a cake to reveal its × and hold the scene still. Keyboard users can tab to named remove/restore actions that become visible on focus.
- Top view and Reveal slices sit in the sidebar. Reveal slices hides the vertical mirrors so the actual cakes and the spaces between them are visible. The two views can be combined.
- Keyboard focus pauses the stand. Left/right arrows turn it; up/down arrows tilt the view; Home/End move to the rotation limits. System reduced motion disables automatic rotation and camera easing; manual controls remain available.
- The shared gallery replay control restores the initial three cakes and view.

## Cake design

Each of the eight cakes has separate geometry, height, material treatment, and decoration:

| Cake | Form and decoration |
| --- | --- |
| Mint & wafer | Chocolate glaze, tall hollow striped wafer rolls, cherry and cream |
| Blackberry & macaron | Larger tilted macaron with plump matte shells, uneven baked feet and soft berry filling; off-center blackberry clusters and crumbs |
| Lemon & blueberry | Thin tilted lemon half-slice with pith, membranes and pulp, differently sized blueberries |
| Strawberry shortcake | Seeded strawberry with leaves, sponge, jam and cream layers |
| Chocolate opera | Chocolate shards, gold accent, alternating chocolate and cream |
| Matcha mille crêpe | Fine repeated crêpe layers, green cream, leaves |
| Raspberry ribbon | Gold ribbon loop, berry cluster, raspberry glaze |
| Birthday confetti | Rainbow layers, candle and flame, colored sprinkles |

Each cut face is offset 0.06 scene units from its mirror. These are actual gaps in the geometry, with visible cut faces and space around the center. They stay present in reflections and when mirrors are hidden.

Cream uses one continuous, low piped surface with seven nozzle folds and a gently curved crown. It has no stacked rings or separate cone tiers. Chocolate decorations use thin, angular slabs with cut edges. Fruit and garnish use deliberate asymmetry: tapered strawberry shoulders and irregular inset seeds; a cherry stem dimple and curved stem; thin, cupped, serrated leaves with veins. Fruit and cream placements vary in size, spacing and angle rather than forming uniform rows.

The strawberry tip sits inside the icing, with a visible contact area and a tight soft shadow at the same position. This keeps the berry grounded in both the real slice and its reflections, including at low viewing angles.

The macaron has fuller shells and a thicker filling. Its placement comes from the lowest point of the rotated lower shell, with a small inset into the icing and a contact shadow at that same point. Its existing larger diameter is preserved for 3/6/8 mirror layouts.

## Rendering and reuse

- `cake-reflect.tsx`: component, direct surface actions, pointer and keyboard input.
- `cake-reflect-model.ts`: eight cake definitions, 3/6/8 mirror counts, presence state, rotation behavior.
- `cake-reflect-engine.ts`: WebGL lifecycle, frame scheduling, camera movement, GPU picking and projected empty-slot actions.
- `cake-reflect-shader.ts`: analytic intersections for cake wedges, decorative solids, finite mirror panels and the reflective platter; bounded surface tracing for cream, fruit and leaves. An offscreen ID pass stops at mirrors and identifies only physical cakes. Picking-only floor footprints locate empty slots without affecting the visible scene.

Rays can reflect up to ten times against double-sided mirror panels and the platter, sampling the real section geometry after each bounce. This is a stylized optical prototype with approximate studio lighting, not a photographic material or fabrication simulation. Cake assets are procedural; arbitrary image or 3D-model import is not implemented.

Visible mirror edges use analytic pixel coverage, a consistent minimum line weight and depth occlusion. They are filtered across both sides of the panel boundary instead of using a hard strip narrower than a screen pixel, keeping the fine outlines continuous during rotation.

Each mirror has a small rounded outer top corner (0.18 scene-unit radius). The reflective silhouette, picking boundary and filtered outline share that shape, including in repeated reflections.

The renderer stops scheduling frames when the scene is held still, offscreen, or in a hidden document, except while a camera transition finishes. It releases its GPU resources, render targets, listeners and observers on unmount. Moving and still frames use the same 1.5–2 device pixels per CSS pixel, followed by a spatial FXAA pass over the entire image. This smooths cake layers, the platter, mirror images and silhouettes without changing resolution at pause/release. Picking uses a separate, unfiltered ID target and asynchronous readback. Hover queries keep only the latest pointer position, empty-slot visibility queries are throttled during automatic rotation, and dragging never queues a picking pass.

The component uses the shared paper-stage token `--stage-paper: #f7f7fa`, including the shader background. Controls share the stage background, with no separate sidebar surface or vertical divider. Page canvas remains `--background: #fcfcfd`. Control borders, selection tint, accent, radii and type use shared tokens; metadata and interaction captions use Geist Mono. The detail page reads its title, index, category, description and tags from the gallery's experiment record. All study styles use the `cake-reflect` prefix. The gallery stage keeps the shared `.demo-stage` height.

## Verification

- Production build, TypeScript and targeted lint pass.
- Ten model tests cover clockwise motion, hover/focus/drag/touch-inspection/reduced-motion holds, release while hovering, bidirectional drag, bounded view tilting and automatic filling for every mirror count.
- Browser checks cover 3/6/8 mirrors, removing all cakes, restoring one, automatic refill, top view, mirror reveal, dragging horizontally and vertically, keyboard rotation, hover pause and resume. Eight-mirror framing stays complete at both vertical-drag limits.
- The latest browser pass verifies that a reflected cake does not trigger ×, hovering different points on one real cake keeps × at the same outer-face center, and removal exposes only one physical +. Mirror outlines stay continuous at checked three-, six- and eight-mirror angles after horizontal and diagonal dragging; the browser reports no shader errors.
- Hover boundary checks verify that canvas background and sidebar positions keep rotating, cake and mirror positions pause, and mirrors never produce an editing ×. Dragging into empty space resumes motion on release. Keyboard focus still pauses, switching back to mouse controls clears that hold, and remove/restore buttons remain usable without resuming the stand beneath the pointer.
- Responsive checks at 1440, 820 and 390 pixels confirm no horizontal overflow and shared stage heights. Desktop same-row stage edges align. The sidebar contains only mirror counts and the two view controls; remove/restore actions stay on the turntable.

This study is local for review. GitHub synchronization and Vercel publication require explicit approval under the repository's release rules.
