# NodeMP Documentation

Source for the NodeMP documentation site, built with
[Astro Starlight](https://starlight.astro.build/) and published to
https://docs.nodemp.com.

## Develop

```bash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # static output in dist/
```

Content lives in `src/content/docs/` — English at the top level, Russian under
`ru/`. Navigation, theme and i18n are configured in `astro.config.mjs`. Design
and implementation notes are in `specs/` and `plans/`.

## Deployment

Pushing to `main` triggers the GitHub Actions workflow
(`.github/workflows/deploy.yml`), which builds the site and publishes it to
GitHub Pages on the `docs.nodemp.com` custom domain.
