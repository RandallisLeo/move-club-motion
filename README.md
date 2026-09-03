# Move Club

An open playground for making, collecting, and sharing interactive motion design.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and replace the placeholder with the final GitHub repository URL.

## Add an experiment

1. Add a component to `components/demos/`.
2. Add its metadata to `data/experiments.ts`.
3. Register the component in `components/motion-gallery.tsx`.
4. Push to GitHub. Your connected hosting provider will rebuild the site.

## License

MIT. Reuse and adapt the experiments with attribution appreciated.
