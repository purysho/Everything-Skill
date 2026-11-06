# Catalogue database

The bundled public SQLite releases are immutable and include a SHA-256 manifest. The Node CLI installs a selected version beside the legacy local store and validates it before switching. Older releases remain available for rollback.

Seed records and revision evidence live in `seeds/`. Run `npm run build` and `npm run audit-seeds` to check them against GitHub. Run `npm run build-catalogue` to reproduce the bundled snapshot and static exports. Increment the release version when publishing changed snapshot bytes.

The private index belongs in a separate user-owned data directory. Never commit it, its backups, the local audit history, or generated adapter files.
