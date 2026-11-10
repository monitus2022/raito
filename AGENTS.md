# Agent notes

Read [docs/WORKPLAN.MD](docs/WORKPLAN.MD) before changing code. It is the single source of truth.

- Never commit directly to `main`. Work on a feature branch and open a PR.
- One phase or content unit per PR. Stop and wait for owner approval.
- Do not put secrets in the repo. Use `.dev.vars` locally and Worker secrets in production.
- Content lives in git; learner state lives in the browser (IndexedDB); the server holds no per-user data.
- The UI is Traditional Chinese; code, comments, commits, and docs are English.

Phase 1 is the current stage: scaffold, CI, and deploy configuration. Application features start in Phase 2+.
