# Static catalogue demo

Serve this folder using any static web server. For example, from the repository root run `python -m http.server --directory demo 8000` and visit `http://localhost:8000`. The site loads its versioned catalogue from the same origin and filters in the browser. The entries link to pinned revisions and source licence files.

For GitHub Pages, select **GitHub Actions** in **Settings → Pages**. **Publish static demo** uploads this folder when the demo or its workflow changes on `main`. You can also run it manually under **Actions**.

The weekly evidence workflow checks current source identity, revision, archive state, licence and safety signals. A change requires maintainer review. Consult [CHANGELOG.md](CHANGELOG.md) before replacing a displayed entry.

After changing scripts or styles, run `npm run build` and `npm run build-catalogue` from the repository root. The build updates asset URLs to match their contents and keys the catalogue request to its snapshot so browsers can load the new release.
