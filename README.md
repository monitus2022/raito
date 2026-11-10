# Raito — Japanese Tutor

A private, single-user PWA for learning Japanese from zero to JLPT N4 in roughly six months.

**Status:** Phase 1 scaffold is in progress: React/Vite shell, IndexedDB state layer, stateless Pages Functions, Terraform for Cloudflare resources, CI, and deploy workflows. Deployment and Access verification are blocked on the Phase 0 setup (Cloudflare project, R2, Access).

## Why "Raito" (ライト)?

The name works two ways:

- **raito / ライト → light** — a lightweight learner and a lightweight app: learn lightning fast.
- **raito → right** — get the right knowledge, at the right level and the right time.

## Source of truth

All requirements, schemas, QA gates, phases, and review rules live in [docs/WORKPLAN.MD](docs/WORKPLAN.MD). Read it before changing code.

## What it will be

- A 30–45 minute daily loop: review → lesson → conversation → quiz.
- FSRS spaced repetition per `(item, card_type)`, with a hard time-boxed review queue.
- N5 Unit 1 preview first (three lessons + checkpoint), then one unit per PR.
- React + TypeScript + Vite PWA on Cloudflare Pages with private R2 audio behind Cloudflare Access.
- Learner state lives in the browser (IndexedDB), so the server stores nothing per user and the app needs no accounts.
- Tutor conversation via OpenRouter; audio generated locally with VOICEVOX.

## Repository layout

```text
src/                 React app
functions/api/       Cloudflare Pages Functions
shared/              Zod schemas shared by client and functions
pipeline/            Content generation, verification, review, TTS, publish (Phase 2+)
content/             Versioned lesson JSON, syllabus, manifests (Phase 2+)
infra/               Terraform for R2, Pages, DNS, and Access
e2e/                 Playwright smoke tests
scripts/             Local tooling
docs/                Workplan and project documentation
```

## Working agreement

- `main` is protected. Never commit directly to it; every stage lands via an approved PR.
- One phase or content unit per PR. Wait for approval before starting the next stage.
- Content is versioned in git. Learner state lives in the browser; the server holds no per-user data.
- Never commit secrets. Use `.dev.vars` locally and Worker secrets in production.
- The UI is Traditional Chinese; code, comments, commits, and docs are English.

## Documentation

- [Workplan, requirements, and spec](docs/WORKPLAN.MD)
- [Revision 2 changes](docs/WORKPLAN.MD#01-revision-2-changes)
- [Revision 3 changes: local-first state](docs/WORKPLAN.MD#02-revision-3-changes)

## License

Private personal project. Third-party content and tools retain their own licenses; see §14 of the workplan.
