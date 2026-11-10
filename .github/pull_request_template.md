## Stage

Phase N — <name> / Unit <id>

## What changed

-

## How to verify

1.

## Evidence

- [ ] Screenshots (UI)
- [ ] Audio samples (TTS)
- [ ] review.md (content)
- [ ] QA gates pass (§8)
- [ ] 30-day simulation (planner changes)

## Checklist

- [ ] Phase checkpoint in §13 is met
- [ ] No secrets or .dev.vars included; secret scan passes
- [ ] Works on Mac Chrome and iPhone Safari (if UI); audio requires a tap
- [ ] `pnpm typecheck`, `lint`, `test`, `test:e2e`, `build` pass
- [ ] Export/import round-trips (if progress or data model changed)
