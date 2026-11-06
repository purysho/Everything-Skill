# Security policy

The Phase 1 CLI is offline. It handles curated metadata and bound lexical queries, opens the public database read-only, and does not run tools, code, commands or packages supplied by indexed sources. Only Conditional results are returned. Exclusions expose category counts. Treat displayed metadata as untrusted data.

The planned security pipeline checks prompt injection, suspicious code, dependencies, credentials, permissions, installation commands, ownership changes, and unsafe MCP capabilities. High-risk findings are hard blocked. User-visible reports provide redacted summaries. Security records are append-only. Resource approval is version-specific and is rescinded when a changed resource has yet to pass a new scan.

Backups contain private data. Keep them in a user-owned location and restore only your own backups. Windows permissions depend on the folder ACL.
