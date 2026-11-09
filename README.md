# Raito — Japanese Tutor

A private, single-user PWA for learning Japanese from zero to JLPT N4 in roughly six months.

**Status:** Workplan revision 2 is ready for review. The application has not been scaffolded yet; implementation starts with Phase 1 after this PR merges.

## Source of truth

All requirements, schemas, QA gates, phases, and review rules live in [docs/WORKPLAN.MD](docs/WORKPLAN.MD). Read it before changing code.

## What it will be

- A 30–45 minute daily loop: review → lesson → conversation → quiz.
- FSRS spaced repetition per `(item, card_type)`, with a hard time-boxed review queue.
- N5 Unit 1 preview first (three lessons + checkpoint), then one unit per PR.
- React + TypeScript + Vite PWA on Cloudflare Pages, D1, private R2, and Cloudflare Access.
- Tutor conversation via OpenRouter; audio generated locally with VOICEVOX.

## Planned repository layout

```text
src/                 React app
functions/api/       Cloudflare Pages Functions
pipeline/            Content generation, verification, review, TTS, publish
content/             Versioned lesson JSON, syllabus, manifests
migrations/          D1 migrations
e2e/                 Playwright smoke tests
docs/                Workplan and project documentation
```

## Working agreement

- `main` is protected. Never commit directly to it; every stage lands via an approved PR.
- One phase or content unit per PR. Wait for approval before starting the next stage.
- Content is versioned in git. D1 stores learner progress, settings, and session metadata only.
- Never commit secrets. Use `.dev.vars` locally and Worker secrets in production.
- The UI is Traditional Chinese; code, comments, commits, and docs are English.

## Documentation

- [Workplan, requirements, and spec](docs/WORKPLAN.MD)
- [Revision 2 changes](docs/WORKPLAN.MD#01-revision-2-changes)

## License

Private personal project. Third-party content and tools retain their own licenses; see §14 of the workplan.
