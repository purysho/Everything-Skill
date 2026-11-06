# Static catalogue demo

Serve this folder using any static web server. For example, from the repository root run `python -m http.server --directory demo 8000` and visit `http://localhost:8000`. The site loads its versioned catalogue from the same origin and filters in the browser. The entries link to pinned revisions and source licence files.

For GitHub Pages, select **GitHub Actions** in **Settings → Pages** and manually run **Publish static demo** under **Actions**. The workflow uploads this folder as the site artifact.

The weekly evidence workflow checks current source identity, revision, archive state, licence and safety signals. A change requires maintainer review. Consult [CHANGELOG.md](CHANGELOG.md) before replacing a displayed entry.
