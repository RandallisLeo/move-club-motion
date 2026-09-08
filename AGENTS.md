# Move Club — Project Instructions

## Scope

These instructions apply to this repository root and every descendant folder.

Move Club is a growing gallery of independent motion studies. Its central rule is:

> Keep the gallery visually coherent; keep every motion study creatively independent.

Do not make different animations behave alike merely to create consistency. Consistency belongs to the shared page shell, typography, palette, controls, imagery treatment, and implementation quality—not to the motion concept itself.

## Writing and storytelling

Treat every user-facing writing sample—especially social posts, introductions, launch copy, and project descriptions—as a short story rather than a summary of facts.

- Open with a concrete moment, observation, tension, or impulse that makes the reader want to continue. Avoid starting with a generic statement about the importance of design or motion.
- Build a clear progression: what caught Randall's attention, why watching or thinking was no longer enough, what he decided to make or learn, and how the reader can join or respond.
- Use specific first-person language and preserve Randall's natural, curious voice. Do not replace it with polished marketing language or broad slogans.
- Let the project name and explanation arrive after the hook has created a reason to care.
- End with a simple invitation when appropriate, such as exploring the work or sharing a related study.
- Before presenting a sample, check that its opening creates curiosity and that each sentence advances the story.

## Shared visual DNA

Preserve and reuse the established tokens in `app/globals.css` for all UI outside an individual demo stage:

- Canvas: `--background: #fcfcfd`
- Primary text: `--foreground: #20242b`
- Surface: `--paper: #ffffff`
- Secondary text: `--ink-soft: #707681`
- Dividers and quiet borders: `--line: #e3e6eb`
- Accent: `--accent: #6b6ff9`
- Accent tint: `--accent-soft: #eeeeff`
- Shared radius: `--radius: 0.75rem`

Use Geist Sans for titles, descriptions, labels, and controls. Use Geist Mono for indices, categories, status text, captions, and compact technical metadata. Preserve the current restrained hierarchy: dark titles, quiet grey supporting text, thin dividers, generous whitespace, and small mono metadata.

The shared visual character is precise, calm, lightly tactile, and editorial. Prefer soft elevation, restrained borders, clean crops, and one clear interaction cue. Avoid heavy outlines, glossy chrome, arbitrary page-wide gradients, decorative clutter, or introducing a new brand palette outside a demo.

## Shared gallery shell

Unless the user explicitly requests a global redesign, preserve the existing:

- sticky header, wordmark, navigation, and GitHub treatment;
- filter row and collection status;
- responsive three/two/one-column project grid;
- project index, title, replay control, stage, description, Code link, and footer-tag structure;
- About and source sections;
- `dark`, `blue`, and `paper` stage tones.

Use Lucide for interface icons. Match the current thin stroke language and existing icon sizes before introducing a new size. Do not mix emoji, filled icon packs, or one-off hand-drawn interface icons into the shared shell.

Keep shared links free of decorative diagonal arrows and external-link symbols. Prefer text for Code and X links; an official GitHub brand mark beside its label is welcome. Reserve directional icons for controls where the direction communicates an actual interaction.

Controls should feel related through shape, color, type, focus treatment, and subtle feedback. They do not need identical hover or press animation when the interaction calls for something different.

## Freedom inside each motion stage

The content inside `.demo-stage` may be completely unique. A study may use its own choreography, easing, timing, interaction model, local palette, materials, 2D or 3D treatment, Canvas, WebGL, SVG, or other rendering techniques.

Do not normalize animation duration, easing, trajectory, sequencing, or visual effect across studies. The motion idea is the subject of each card and must remain distinct.

Images may be chosen freely and may be random. Do not create or require a shared image library unless the user asks for one. New images should still:

- load reliably from project-owned or stable sources;
- use deliberate cropping and aspect ratios;
- avoid visible watermarks and accidental low-resolution artifacts;
- include meaningful alternative text when the image conveys content;
- leave the shared card metadata and controls visually undisturbed.

## CSS isolation is mandatory

Every study must have one unique root class, for example `.liquid-stack-demo`, and all study-specific selectors must be scoped beneath that root or use an equally unique prefix.

- Never add unscoped element rules such as `button`, `img`, `span`, or `div` for a single study.
- Do not change `.site-header`, `.work-section`, `.project-grid`, `.project-card`, `.project-meta`, `.demo-stage`, `.project-description`, `.project-footer`, `.icon-button`, or shared typography tokens to solve a local demo problem.
- Define study-only CSS variables on the study root.
- Prefer existing global tokens for shared UI; local colors are allowed inside the study.
- Avoid `!important` and specificity escalation.
- Before editing `app/globals.css`, decide explicitly whether each new rule is shared infrastructure or a locally scoped study rule.
- Verify that hover, focus, animation, and responsive rules cannot affect another card.

## Adding a motion study

1. Add the component at `components/demos/<slug>.tsx`.
2. Give the component a unique root class and keep its styles isolated.
3. Add its metadata to `data/experiments.ts`. Use a concise `Object / Behavior` title when it fits, a three-digit index, a clear category, and short descriptive copy.
4. Register the new component explicitly in `components/motion-gallery.tsx`; do not rely on an unrelated fallback component.
5. Preserve the `replayKey` contract so the shared replay control can restart the study.
6. Keep its Code link pointed at the matching source file.
7. Add a new filter only when the new study genuinely needs a new category.
8. Confirm the card behaves at desktop, tablet, and mobile widths without clipping or leaking layout styles.
9. Preserve keyboard access, visible focus, semantic controls, and the user's reduced-motion preference.
10. Run `npm run build` after implementation and fix actual errors before delivery.

## Visual acceptance checklist

Before considering a new study complete, confirm:

- the page still reads unmistakably as Move Club before interacting with the new card;
- shared colors, typography roles, spacing rhythm, icon family, borders, radii, and elevation remain consistent;
- the study itself has a distinct motion idea rather than copying another card's choreography;
- imagery feels intentional even when selected freely or randomly;
- local styles do not alter any existing study;
- text and controls remain legible, responsive, keyboard accessible, and usable with reduced motion;
- the production build passes.

## Publishing boundaries

Vercel is the publishing path for the public website and should preserve `https://move-club-motion.vercel.app` when updating it. GitHub is the public source showcase for every published motion study.

- **Local-first approval gate:** every new motion study must be designed, implemented, built, and previewed locally first. A request to add, build, revise, or finish a study authorizes local work only; it does not authorize a website deployment.
- Present the working local version to the user and wait for explicit approval before creating a hosted version or synchronizing it to the live website. Feedback or requested revisions return the study to the local review cycle.
- Only clear approval such as “确认上线”, “同步到网站”, or an equivalent statement authorizes publishing that reviewed change. Approval applies only to the currently reviewed change and is not standing permission for future studies. For Move Club, this approval authorizes the complete release checklist below; do not stop after only the GitHub or Vercel step.

### Required release checklist

Every approved release must complete all of these steps:

1. **Sync the new motion source to GitHub.** Commit and push the study component and all required registry, metadata, style, asset, and dependency changes. Keep the component filename, experiment slug, registry reference, displayed study name, and source path aligned.
2. **Create and verify the study-to-source link.** The published card's `Code` link must point to the matching file on the GitHub `main` branch. Verify the remote file exists at that exact URL after pushing; a local path or unpushed file does not count.
3. **Publish the same reviewed version to Vercel.** Run the production build, deploy it to the existing Move Club Vercel project, preserve `https://move-club-motion.vercel.app`, and verify the public site is serving the release.

- Keep `.openai/` local and ignored; never publish hosting configuration or credentials to GitHub.
- Do not deploy or push merely because a local study was added or completed.
- A request that explicitly asks only for a GitHub sync authorizes only the GitHub portion. A full release approval authorizes the complete checklist above.
- Never commit secrets, local environment files, generated build output, or hosting credentials.
