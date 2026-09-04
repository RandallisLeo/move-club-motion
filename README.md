![Move Club — Ongoing Motion Studies](./public/github-cover.png)

# Move Club

**An open, ongoing collection of small interaction and motion studies.**

[Explore the live playground](https://move-club-photo-motion.ranlous.chatgpt.site) · Built by [Randall D](https://github.com/RandallisLeo)

> **Ongoing:** this collection will keep growing as I study, rebuild, and remix motion patterns found in everyday interfaces.

## Why I built it

Most motion references show the final visual result, but not the decisions that make it feel right. Move Club keeps the interaction and its implementation together, so every study can be experienced, inspected, remixed, and learned from.

It is part sketchbook, part reference shelf, and part open invitation: a place to explore how timing, continuity, layering, masks, springs, and spatial relationships can make interfaces feel clearer and more expressive.

## Motion studies

| No. | Study | Focus | Live | Source |
| --- | --- | --- | --- | --- |
| 001 | Photo / Select | Tactile selection feedback | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#photo-selection) | [Code](./components/demos/photo-selection.tsx) |
| 002 | Actions / Reveal | Contextual action entrance | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#action-reveal) | [Code](./components/demos/action-reveal.tsx) |
| 003 | Count / Reel | Masked rolling digits | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#rolling-counter) | [Code](./components/demos/rolling-counter.tsx) |
| 004 | Folder / Hover | Shared-element navigation | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#fluid-folder-hover) | [Code](./components/demos/fluid-folder-hover.tsx) |
| 005 | Cards / Transfer | Staggered spatial transfer | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#card-flight) | [Code](./components/demos/card-flight.tsx) |
| 006 | Folder / Depth | Layering, glass, and composition | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#folder-preview) | [Code](./components/demos/folder-preview.tsx) |
| 007 | Grid / Reflow | Spring-based layout reflow | [Demo](https://move-club-photo-motion.ranlous.chatgpt.site/#spring-reflow) | [Code](./components/demos/spring-reflow.tsx) |

## Run it locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Add a study

1. Add a component to `components/demos/`.
2. Add its metadata to `data/experiments.ts`.
3. Register the component in `components/motion-gallery.tsx`.
4. Add the new study to the table above.

## Built with

React · TypeScript · Motion · Vinext · Cloudflare Workers

## License

MIT. Reuse and adapt the experiments with attribution appreciated.
