# Static catalogue demo

Serve this folder using any static web server. For example, from the repository root run `python -m http.server --directory demo 8000` and visit `http://localhost:8000`. The site loads its versioned catalogue from the same origin and filters in the browser. The entries link to pinned revisions and source licence files.

For GitHub Pages, deploy the contents of this folder as the site artifact or use a Pages source branch whose root contains these files. The GitHub Pages setting is separate from this repository's checks.

The weekly evidence workflow checks current source identity, revision, archive state, licence and safety signals. A change requires maintainer review. Consult [CHANGELOG.md](CHANGELOG.md) before replacing a displayed entry.
