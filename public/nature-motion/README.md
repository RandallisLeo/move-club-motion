# Nature / Motion materials

`branch.png`, `branch-grown.png`, and `forest.jpg` are original AI-generated materials made for these Move Club studies with the built-in imagegen tool. The branch materials retain their transparent alpha; the forest has been compressed to JPEG for delivery. No source-site screenshots, brand marks, or extracted video pixels are included in the shipped assets.

Branch prompt: isolated weathered driftwood, long horizontal S curve, silver-grey and taupe wood grain, sparse olive moss, soft overcast studio light, full object with transparent background.

Grown branch: a registered image edit preserving the branch's camera, silhouette, framing and wood grain. Full, tall fine grasses and fernlike sprigs in fresh sage/meadow green, with light silvery tips; roots attach to upper, front and side cracks with some lower-edge foliage. Bare grain gaps, contact shadows and side-lit texture preserve the curved form. The canvas fills the roots then extends masks into the lush canopy, without stretching or sliding its texture.

Forest prompt: ancient Pacific Northwest forest at dawn, tactile moss-covered foreground boulders, misty distant peaks and conifers, low camera, pale natural light, restrained olive and neutral palette.

The loading and text studies additionally use existing project-owned image files from `/feed-adapt/`.

## Scene / Advance — object layers

Made with the built-in imagegen tool as edits of the existing `forest.jpg`. All planes are registered 1536 × 1024 and retain their alpha. Each is a separate asset, rather than copies of the full photograph under CSS gradient masks.

Saved paths:
- `/Users/dairandall/Documents/ChatGPT/Motion Design/public/nature-motion/scene-near.png`
- `/Users/dairandall/Documents/ChatGPT/Motion Design/public/nature-motion/scene-middle.png`
- `/Users/dairandall/Documents/ChatGPT/Motion Design/public/nature-motion/scene-far.png`

Prompt set:
- **Near / background extraction:** keep the exact canvas, camera, lighting and coordinates; isolate the closest moss boulders and ferns across the bottom third by their natural silhouettes. Make the sky, mountain, trees, stream and smaller banks transparent. Preserve stone/leaf contours and edge crops; no recentering, scenery gradient or checkerboard.
- **Middle / background extraction and occlusion repair:** retain the left/right conifers, visible middle trees, stream and smaller river-bank rocks. Remove distant sky/mountains to transparency along branch silhouettes. Remove the nearest large boulders and fill their hidden areas with smaller river-bank stones and stream bed. Preserve composition, palette and lighting; no duplicate foreground boulders or translucent scenery overlay.
- **Far / background plate:** preserve peak positions, sky, dawn lighting and mist. Remove close trunks, branches, side trees, foreground rocks and ferns. Seamlessly reconstruct their occluded areas with continuation of the distant valley and riverbed. Keep the plate fully opaque and continuous.

Runtime: common cover crop and 58% camera horizon. Full depth: near 1.8×, middle 1.38×, far 1.15×; all start at 1.045× to protect edges. One eased progress value drives all three planes. There are no gradient masks or reduced layer opacity.
