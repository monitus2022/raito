# Japanese Tutor — Workplan, Requirements & Spec

**Status:** Ready for implementation — revision 2 (review issues resolved)
**Owner:** single user (native Cantonese speaker, professional written Chinese and English)
**Implementer:** AI agent, reviewed by the owner
**Date:** 2026-11-09
**Revision:** 2 — see §0.1 for the changes made after the first review.

---

## 0. How to use this document

This file is the single source of truth. Read it fully before writing code. Do not infer requirements from chat history; if something is missing, ask the owner.

Hard rules for the implementing agent:

1. **Never commit to `main`.** Every stage of work happens on a feature branch and lands through a pull request that the owner approves. See §12.
2. **One stage, one PR, then stop.** After each phase or content unit, open the PR and wait. Do not begin the next stage until it is approved and merged.
3. **Do not mass-generate content.** Build the preview set (N5 Unit 1, three lessons) end to end, get owner approval, then scale.
4. **Never put secrets in the repo.** Use `.dev.vars` locally and `wrangler secret put` in production.
5. **Content is static and versioned in git.** D1 stores learner progress, settings, and session/attempt metadata only. It never stores content item metadata; `item_id` values are references into the bundled content.
6. **Every piece of generated Japanese content passes the QA gates in §8 before it ships.**
7. **The UI is Traditional Chinese only.** Code, comments, commit messages, and docs are English.
8. When a decision in this document is ambiguous, prefer the smaller scope and ask.
9. **Audio is private.** R2 objects are served through an Access-protected Worker route or short-lived signed URLs. There is no public audio bucket.

### 0.1 Revision 2 changes

This revision resolves the blocking issues found in the first review:

- Staged card introduction and explicit daily budgets (§10.4–10.5), so the review queue cannot exceed the time box.
- Curriculum reordered to remove forward references; word/lesson arithmetic corrected (§4).
- QA gates corrected for katakana, grammar-point granularity, furigana alignment, tokenization, and CI separation (§8).
- `items` removed from D1; content metadata stays in git and the bundle (§6).
- FSRS state columns completed; settings, timezone, and tutor session state added (§6).
- Audio cache hash now includes accent/pitch and post-processing settings (§8.3).
- Access JWT validation and private R2 audio replace header-only trust and public audio (§5, §10.7, §12).
- Deployment and CI separated: `content:publish` builds; deployment happens only from `main` (§8.4, §12.5).
- Backup/export, content versioning, and a 30-day queue simulation added to acceptance (§11, §18).
- Licensing and cost estimates corrected (§14–15).

---

## 1. Product summary

A single-user, self-hosted web app for learning Japanese from zero to JLPT N4 in roughly six months.

The learner already knows hiragana and katakana, recognizes most kanji meanings as a Chinese speaker (with false-friend gaps), and does not need handwriting practice. He learns through context and sentences, not through grammar lectures, and previously abandoned *Minna no Nihongo* because it was lecture-based and dumped vocabulary without a learning system.

The app replaces the missing teacher with four functions: a fixed daily plan, retrieval practice, spaced review, and forced production in conversation.

### Core loop (one button: 今日のメニュー)

```
① Review      due cards, time-boxed to 10–12 min, hard-capped
② New lesson  scenario dialogue → 8–12 target words → 1–2 GrammarPoint objects
③ Conversation 5–8 turns with the LLM tutor, corrections on target patterns
④ Quiz        6–8 items, at least 1 listening item
⑤ Update      results into the knowledge bank, which drives tomorrow's menu
```

Target duration: 30–45 minutes on weekdays, up to 60 on weekends (a second lesson or a listening set).

### Anti-patterns to avoid

- Long grammar explanations. Chinese explanation is on demand, ≤150 characters, always anchored to an example sentence.
- Vocabulary lists without retrieval. Every word enters through a sentence and leaves through spaced cards.
- Unbounded review queues. The queue is time-boxed and capped; overflow is served by priority, not piled up, and two consecutive backlog days trigger a review-only consolidation day (§10.5).
- Unlock gates and streak pressure. The learner sets his own schedule.

---

## 2. Scope

### In scope (v1)

- PWA: Mac Chrome and iPhone Safari, installable.
- Daily menu with review, lesson, conversation, quiz.
- Knowledge bank with per-item, per-card-type spaced repetition (FSRS).
- N5 Unit 1 preview: three lessons + one checkpoint quiz, fully verified, with audio.
- Tutor conversation via OpenRouter.
- Progress view: coverage, mastery, weak list.
- Progress export/backup and cross-device settings.
- Content pipeline: generate → verify → review → audio → publish.
- Deployed on Cloudflare Pages, private behind Cloudflare Access; audio served privately.

### Out of scope (v1, explicitly)

- Speech recognition, speaking practice, pronunciation scoring.
- Handwriting and stroke order.
- Offline mode.
- Multi-user, signup, sharing, public access.
- Reminders and notifications.
- Full mock exams.
- N3–N1 content.
- Native mobile apps.
- Anki import/export.

### Later (not now)

- N4 mass content (after preview approval).
- External listening library (official JLPT samples, Irodori, Erin, podcasts).
- Weekly report and monthly mock exams.
- Pitch-accent F0 QA gate for sentences.
- Streaming tutor responses.

---

## 3. Learner model and assumptions

| Fact | Design consequence |
|---|---|
| Native Cantonese, professional written Chinese | Explanations in Traditional written Chinese; no English in UI; no Chinese–Japanese grammar comparison |
| Recognizes most kanji meanings as a Chinese speaker | Teach Japanese readings and usage, not meanings or stroke order; flag false friends and Japanese-only compounds inline |
| Knows kana | No kana module; start at N5 lesson 1 |
| No speaking practice wanted | No ASR; audio is for listening comprehension |
| Typing is acceptable but slow | Primary input is tap/select; typing is secondary |
| 30–60 min/day, flexible schedule | 30-minute core loop; weekend extension; no streaks |
| Goal: pass N4, ~6 months | ~1,500 words, ~300 kanji, ~170 grammar points; ~150 micro-lessons |
| Quit *Minna no Nihongo* from overload | 8–12 new words per lesson; backlog brake; no word dumps |

---

## 4. Curriculum structure

- **N5:** 24 units, 3 lessons each (~72 lesson slots; Unit 24 is review/checkpoint), ~800 words. Mean ~11 words/lesson; Unit 1 is deliberately light at 8/lesson.
- **N4:** 36 units, 2–3 lessons each (~78 lessons), ~700 additional words. Mean ~9 words/lesson.
- **Total:** ~150 lessons, ~1,500 words, ~300 kanji, ~170 grammar points.
- One lesson = 8–12 new words, 1–2 `GrammarPoint` objects, a 6–8 line dialogue, 5–8 conversation turns, 6–8 quiz items.
- One unit = 2–3 lessons plus a checkpoint quiz.
- A `GrammarPoint` is one explanation (≤150 Chinese characters) plus 3 examples. Closely related particles may be bundled into one point (e.g., か・も), but a lesson may have at most 2 points. This is the granularity G9 counts.
- Coverage is audited against community JLPT lists (JLPT Sensei / Tanos / jpdb) as a checklist only. There is no official JLPT syllabus; do not claim otherwise.
- Kanji are taught through vocabulary, not a separate module; the ~300-kanji goal is tracked from `vocab[].surface` in the coverage view. Reading/listening practice in v1 is the dialogue plus at least one listening item per quiz; a dedicated listening/reading track is a later phase.

### N5 unit map (first draft, owner reviews before mass generation)

| # | Scenario | Core grammar | ~Words |
|---|---|---|---|
| 1 | はじめまして | は・です・か・も | 24 |
| 2 | これは何ですか | これ／それ／あれ／何・の | 33 |
| 3 | どこですか | ここ／そこ／あそこ／どこ・に・が あります | 33 |
| 4 | 何時ですか | numbers, time, から／まで | 33 |
| 5 | 毎日の生活 | ます形・を・に・で | 36 |
| 6 | 週末 | ました・ませんでした | 33 |
| 7 | 好きなもの | すき／きらい・が・とても／あまり | 36 |
| 8 | 家族 | がいます・counters 人 | 33 |
| 9 | 家 | に あります／が います・rooms | 36 |
| 10 | 買い物 | prices, counters, をください | 33 |
| 11 | レストラン | がほしい・をください・ましょうか | 36 |
| 12 | 交通 | で／に／から／まで・どのくらい | 33 |
| 13 | 天気 | い形・な形・くないです／じゃないです (polite) | 36 |
| 14 | 休みの日 | たい・ませんか・ましょう | 33 |
| 15 | 病院 | body parts・がいたいです・をください | 36 |
| 16 | 友達 | plain form introduction (dictionary form) | 33 |
| 17 | 趣味 | のがすき・ことができます・まえに | 36 |
| 18 | て形の生活 | てください・ています・てもいい | 33 |
| 19 | お願い | ない形・ないでください | 36 |
| 20 | 経験 | た形・たことがある・たあとで | 33 |
| 21 | 比べる | より・のほうが・いちばん | 36 |
| 22 | 理由 | から・が（but）・ね／よ | 33 |
| 23 | 旅行 | integrated review | 36 |
| 24 | 総復習 | checkpoint + mock section | review |

Word counts are per unit, not per lesson. Unit 1 is 24 words (8/lesson) because it is the preview and first week; later units average 33–36 (11–12/lesson). The ~800 total is a planning target, audited against the level checklist after the preview.

Sequencing rule: a lesson may only use a form introduced in the same or an earlier unit. The machine-readable form is `content/syllabus/n5.yaml` (`units[].introduces`), and G12 checks every lesson against it. This is why plain form (16) precedes のがすき／ことができます (17), and て-form (18) owns てください. The table above and the YAML must stay in sync.

### Preview set (what the agent builds first)

**N5 Unit 1 — はじめまして**, three lessons:

- **L1:** GrammarPoint ①「N は N です」; ②「か・も」. 8 words: 私、学生、先生、名前、友達、はじめまして、どうぞ、よろしく.
- **L2:** GrammarPoint ①「これ／それ／あれ」; ②「N の N・何」. 8 words: 本、ペン、かさ、かばん、時計、ノート、えんぴつ、何.
- **L3:** GrammarPoint ①「ここ／そこ／あそこ／どこ」; ②「N に N が あります」. 8 words: トイレ、受付、教室、図書館、でんわ、いす、つくえ、どこ.
- **Checkpoint:** 15 items, 1 listening set, all from Unit 1.

The final lesson JSON must contain 8–12 words and 1–2 `GrammarPoint` objects (G9); the lists above are the target set, not an upper bound to pad.

---

## 5. Architecture

```
Browser (PWA)
  │  static assets from Cloudflare Pages
  │  fetch /api/*
  ▼
Cloudflare Pages Functions (Workers)
  │  OpenRouter (tutor only)        Access JWT validation
  ▼
D1 (progress/settings)   R2 (private audio)   git (content)
```

### Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS, mobile-first |
| Routing | React Router |
| State/data | TanStack Query (server state) + local component state |
| Validation | Zod, shared between client, functions, and pipeline |
| SRS | `ts-fsrs` (pin the version and FSRS-5/6 model; see decisions log) |
| PWA | `vite-plugin-pwa`, installable, no offline requirement |
| API | Cloudflare Pages Functions under `functions/api/` |
| DB | Cloudflare D1 (SQLite) |
| Audio | Cloudflare R2, private; served through an Access-protected Worker route or short-lived signed URLs |
| Auth | Cloudflare Access, email one-time code, one allowed address; `_middleware` validates the Access JWT, not the email header |
| Secrets | `.dev.vars` locally, `wrangler secret put` in production |
| Tutor LLM | OpenRouter, model configurable via `TUTOR_MODEL`; pin a default and an eval set |
| TTS | VOICEVOX Engine over local HTTP |
| Tests | Vitest (unit/simulation) + Playwright (browser smoke) |
| Deploy | GitHub Actions on `main`; no PR deployments |

Do not use Next.js. The app is a static SPA; no SSR is needed.

### Repository layout

```
raito/                 # existing repository; rename to japanese-tutor before Phase 1 if preferred
  src/                 # React app
    components/
    routes/
    lib/               # fsrs, api client, text rendering
  functions/
    api/               # Pages Functions
    _middleware.ts     # Access JWT validation
  shared/              # Zod schemas shared by client and functions
  pipeline/            # Node CLI (tsx)
    gen.ts
    verify.ts          # deterministic gates (no network/key; G13 when audio exists)
    review.ts          # LLM editor, local only, writes review.md
    tts.ts
    publish.ts         # build only; never deploys
    providers/voicevox.ts
    providers/openrouter.ts
  content/
    syllabus/n5.yaml
    units/n5-u01/*.json
    audio.manifest.json
    jlpt-levels.yaml
    glossary.zh.yaml
    sources.json       # generated attribution index
    manifest.json      # content version + tombstones
  migrations/          # D1 SQL
  infra/               # Terraform: D1, R2, Pages, DNS, Access
  e2e/                 # Playwright smoke tests
  public/
  scripts/
  docs/
    WORKPLAN.MD
  .github/workflows/   # CI + deploy-on-main
  .dev.vars.example
  .gitignore
  .nvmrc
  AGENTS.md
  wrangler.toml
  package.json
```

Single package, pnpm, no monorepo.

---

## 6. Data model (D1)

```sql
CREATE TABLE profile (
  id               TEXT PRIMARY KEY,          -- always 'me'
  target_level     TEXT NOT NULL DEFAULT 'N4',
  target_exam_date TEXT,
  timezone         TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
  created_at       TEXT NOT NULL
);

-- Content item metadata is NOT stored in D1. `item_id` values reference IDs
-- in the bundled content (content/units/...). Git remains the single source
-- of truth for content, which avoids drift and publish-time writes.

CREATE TABLE attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       TEXT,                      -- nullable for quiz items without an item id
  card_type     TEXT,                      -- reading | meaning | audio | cloze | production; null for conversation-only corrections
  correct       INTEGER NOT NULL,
  latency_ms    INTEGER,
  mode          TEXT NOT NULL,             -- review | quiz | conversation
  lesson_id     TEXT,
  session_id    TEXT,                      -- conversation session, when mode = conversation
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_attempts_item ON attempts(item_id, created_at);
CREATE INDEX idx_attempts_mode ON attempts(mode, created_at);

CREATE TABLE review_state (
  item_id        TEXT NOT NULL,
  card_type      TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT 'new',  -- new | learning | review | relearning
  stability      REAL NOT NULL DEFAULT 0,
  difficulty     REAL NOT NULL DEFAULT 0,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  due_at         TEXT NOT NULL,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  last_review    TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (item_id, card_type)
);
CREATE INDEX idx_review_due ON review_state(due_at);
CREATE INDEX idx_review_item ON review_state(item_id);

CREATE TABLE lesson_progress (
  lesson_id     TEXT PRIMARY KEY,
  unit_id       TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'lesson', -- lesson | checkpoint
  status        TEXT NOT NULL,                  -- available | in_progress | done
  score         REAL,
  started_at    TEXT,
  completed_at  TEXT
);

CREATE TABLE conversations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     TEXT NOT NULL,
  turn_index     INTEGER NOT NULL,
  lesson_id      TEXT NOT NULL,
  role           TEXT NOT NULL,             -- student | tutor
  content        TEXT NOT NULL,             -- JSON envelope
  model          TEXT,
  prompt_version TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_conversations_session ON conversations(session_id, turn_index);

CREATE TABLE settings (
  id            TEXT PRIMARY KEY,               -- always 'me'
  furigana      TEXT NOT NULL DEFAULT 'all',    -- all | kanji | off
  accent        TEXT NOT NULL DEFAULT 'on',     -- on | off
  voice         TEXT NOT NULL DEFAULT 'female',
  speed         REAL NOT NULL DEFAULT 1.0,
  updated_at    TEXT NOT NULL
);

CREATE TABLE daily_stats (
  day             TEXT PRIMARY KEY,               -- YYYY-MM-DD in profile.timezone
  due_count       INTEGER NOT NULL,
  reviewed_count  INTEGER NOT NULL,
  new_count       INTEGER NOT NULL,
  backlog         INTEGER NOT NULL,
  consolidation   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE flags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL,                  -- audio | content | ui
  ref           TEXT NOT NULL,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'open',   -- open | resolved | waived
  created_at    TEXT NOT NULL,
  resolved_at   TEXT
);
```

Notes:

- `profile` and `settings` each have exactly one row, seeded by the first migration.
- `state`, `scheduled_days`, and `learning_steps` are required by `ts-fsrs`'s `Card` type. Pin the `ts-fsrs` version and the FSRS model (FSRS-5 vs FSRS-6) in `package.json` and the decisions log.
- All timestamps are UTC ISO 8601. The planner uses `profile.timezone` to decide "today"; never use the Worker's local date. `daily_stats` is the persisted day boundary used for the two-day backlog rule, consolidation state, and readiness history.
- `locked` is intentionally absent: there are no unlock gates. Lessons are presented in order but are not blocked by streaks.
- No foreign keys: single user, and content IDs intentionally have no D1 parent table. Orphan `review_state` rows are handled by the content tombstone/migration process (§7.11).

---

## 7. Content schema

All content is JSON, validated with Zod, stored in `content/units/<unit>/<lesson>.json`.

### 7.1 Ruby text

```ts
type RubyToken = { t: string; r?: string; readingSource?: "jmdict" | "override" }; // r only for kanji runs
// 私(わたし)は学生(がくせい)です
// [{t:"私",r:"わたし"},{t:"は"},{t:"学生",r:"がくせい"},{t:"です"}]
```

Store tokens, not HTML. The renderer emits `<ruby>`. Furigana toggle: all / kanji only / off.

### 7.2 Lesson

```ts
type Lesson = {
  schemaVersion: 1;
  id: string;                 // "n5-u01-l01"
  unit: string;               // "n5-u01"
  level: "N5" | "N4";
  titleZh: string;
  scenarioZh: string;
  estimatedMinutes: number;
  objectivesZh: string[];
  grammar: GrammarPoint[];    // 1–2 points (G9)
  vocab: VocabItem[];         // 8–12 words (G9)
  sentences: Sentence[];      // every example and listening sentence; ids are stable
  dialogue: DialogueLine[];
  quiz: QuizItem[];           // 6–8 items; checkpoint may have 15
  conversation: ConversationSpec;
  sources: SourceRef[];
  qa: {
    status: "draft" | "verified" | "flagged";
    checkedAt: string;
    gates: Record<string, "pass" | "waived" | "fail">;
    flags: string[];
  };
};
```

### 7.3 Grammar point

```ts
type GrammarPoint = {
  id: string;                 // "n5-g-001"
  pattern: string;            // "〜は〜です"
  level: "N5" | "N4";
  explanationZh: string;      // <= 150 chars, written Chinese
  exampleIds: string[];       // exactly 3 Sentence ids from lesson.sentences
};
```

### 7.4 Vocabulary

```ts
type VocabItem = {
  id: string;                 // "n5-v-0001"
  surface: string;            // 私
  reading: string;            // わたし
  pos: string;                // pronoun | noun | i-adj | na-adj | verb-godan | verb-ichidan | ...
  glossZh: string;            // 我 (written Chinese, no Latin, no romaji)
  accent: number;             // Kanjium accent nucleus; 0 = flat
  tts: string;                // kana-only
  audio?: string;             // R2 key (hash)
  noteZh?: string;            // e.g. 漢字與中文意義不同
  exampleId: string;          // Sentence.id in lesson.sentences
  cardTypes?: ("reading" | "meaning" | "audio" | "cloze" | "production")[]; // optional override
};
```

### 7.5 Dialogue

```ts
type DialogueLine = {
  id: string;                 // stable id within the lesson
  speaker: "A" | "B" | "N";
  voice: "female" | "male";
  tokens: RubyToken[];
  tts: string;                // kana-only, numbers spelled out
  zh: string;
  audio?: string;             // R2 key
  audioSlow?: string;
};
```

### 7.6 Quiz

```ts
type QuizItem = {
  id: string;
  type:
    | "kanji_reading" | "orthography" | "context_cloze"
    | "paraphrase" | "usage" | "sentence_order"
    | "passage_grammar"
    | "listening_task" | "listening_point"
    | "listening_response";
  itemId?: string;            // knowledge-bank item under test
  prompt: string;             // Chinese instruction
  tokens?: RubyToken[];
  choices?: string[];
  answerIndex?: number;
  audio?: string;
  tts?: string;               // required for listening_* (G10)
  sentenceId?: string;        // optional reference into lesson.sentences
  explanationZh: string;
};
```

`listening_*` items require `audio` and either `tts` or a `sentenceId` whose `Sentence` has `tts` (G10).

### 7.7 Conversation spec

```ts
type ConversationSpec = {
  roleZh: string;             // e.g. 初次見面的日本人
  goalZh: string;
  targetItemIds: string[];    // must be used by the learner
  openingSentenceId?: string; // optional Sentence.id
  openingJa: string;          // fallback if no sentence id
  maxTurns: number;           // 5–8
  constraints: {
    maxLevel: "N5";
    allowUnlearnedInTutorSpeech: true;
    requireChineseSupport: true;
  };
};
```

### 7.8 Tutor response envelope

The tutor must return JSON, validated by Zod, retried once on failure.

```ts
type TutorTurn = {
  replyJa: { tokens: RubyToken[]; tts: string }[]; // 1–3 sentences
  replyZh: string;                                  // support, written Chinese
  corrections: {
    original: string;
    corrected: string;
    reasonZh: string;
    itemId?: string;
  }[];
  usedItemIds: string[];          // items the tutor used in this turn
  learnerUsedItemIds: string[];   // target items the learner actually produced
  hintZh: string | null;
  nextPromptJa: string | null;
};
```

### 7.9 Sentence

Every example sentence, grammar example, and listening prompt lives in `lesson.sentences`. This is the target of `VocabItem.exampleId` and `GrammarPoint.exampleIds`.

```ts
type Sentence = {
  id: string;                 // "n5-u01-l01-s01"; stable and unique in the unit
  tokens: RubyToken[];
  tts: string;                // kana-only
  zh: string;                 // written Chinese
  audio?: string;             // R2 key
  audioSlow?: string;         // R2 key
  source?: SourceRef;         // provenance for Tatoeba/JMdict/licence
};
```

### 7.10 Source reference

```ts
type SourceRef = {
  source: "tatoeba" | "jmdict" | "kanjidic2" | "kanjium" | "generated";
  id?: string;
  url?: string;
  license: "CC-BY-2.0-FR" | "CC-BY-SA-4.0" | "CC0" | "internal" | "other";
  note?: string;
};
```

### 7.11 Content versioning and stable IDs

- Every lesson has `schemaVersion`. `content/manifest.json` records the content version and the audio-manifest version used by the build.
- IDs are permanent. Once a published `item_id` is used, it is never reused for a different word, grammar point, or sentence. A rename keeps the ID.
- Removing an item writes a tombstone to `content/manifest.json` (`{ id, retiredAt, reason }`). A migration either keeps the `review_state` history (recommended) or archives it; it never silently orphans rows.
- A change to `Reading`/`Surface` that changes the audio hash must re-render that item's audio (§8.3).

---

## 8. Content pipeline

Five commands, run in order. Local only; content is committed, audio is uploaded.

```bash
pnpm content:gen     --unit n5-u01   # generate drafts; skips existing files unless --force
pnpm content:verify  --unit n5-u01   # deterministic gates; G13 only when audio exists; no network/key
pnpm content:review  --unit n5-u01   # LLM editor; local only; writes review.md
pnpm content:audio   --unit n5-u01   # render missing/changed audio; upload to R2
pnpm content:audio   --check         # verify manifest entries against private R2 objects
pnpm content:publish                 # build static content bundle; does NOT deploy
```

### 8.1 Generate

- Model: OpenRouter, strong model, configurable (`GEN_MODEL`). Pin a default in `.dev.vars.example` and record the model and prompt version in `content/manifest.json`.
- Prefer **retrieval over generation** for example sentences: query Tatoeba for attested Japanese sentences matching the target word and grammar, with a Chinese translation; generate only when no suitable sentence exists. Rank candidates by level fit, sentence length (≤30 characters), and translation quality; record the Tatoeba ID and licence in `Sentence.source`.
- Every lesson must declare its target word and grammar IDs; the generator may not add IDs outside the unit. The target IDs are the `vocab[].id` and `grammar[].id` fields.
- `content:gen` skips existing lesson files unless `--force`. It is not deterministic; idempotency applies to audio uploads, not to generation.
- Output is a draft; it is never served.

### 8.2 Verify — QA gates

G1–G12 must pass (or be explicitly waived in `qa.flags` with a reason) before audio generation. G13 runs after audio generation and must pass before publish.

| Gate | Check |
|---|---|
| G1 | Zod schema valid; `schemaVersion` present |
| G2 | Furigana matches the JMdict reading for every token. Readings are produced by a Japanese tokenizer available to the Node pipeline (`kuromoji.js` or a Sudachi WASM binding; MeCab/SudachiPy only as an explicit dev dependency) and aligned to JMdict; jukujikun or irregular overrides require owner approval and are marked in `readingSource` |
| G3 | Every content word in the dialogue is a target word, previously taught, or in the glossed whitelist. Tokenize and lemmatize with the same tokenizer; function words come from a committed whitelist, not a hand-written regex |
| G4 | Every grammar pattern is in the assigned unit set |
| G5 | No N3+ vocabulary against `content/jlpt-levels.yaml` (versioned checklist derived from JLPT Sensei/Tanos; unknown words go to review) |
| G6 | `tts` is kana + Japanese punctuation only: `/^[ぁ-ゖァ-ヺー・、。！？「」『』…\s]+$/u`; no kanji, Latin, or digits |
| G7 | `glossZh` and explanations contain no Latin letters and no romaji |
| G8 | Dialogue 6–8 lines; each sentence ≤ 30 characters |
| G9 | Exactly 8–12 new words and 1–2 `GrammarPoint` objects; each point has one explanation and exactly 3 examples. Checkpoint quizzes are exempt and have 15 items |
| G10 | Every dialogue line, every `Sentence`, and every listening `QuizItem` has a `tts` field (directly or via `sentenceId`) |
| G11 | IDs are unique within the unit and stable; no duplicate `item_id` across lessons |
| G12 | Prerequisite check against `content/syllabus/n5.yaml`: every form used is introduced in the same or an earlier unit; no forward references |
| G13 | Audio manifest coverage: every `audio` reference has a manifest entry. R2 object existence is checked by `content:audio --check` with R2 credentials. Before the audio phase, missing references are listed as pending; they must be zero before publish |

Second layer: a verifier model, prompted as a Japanese editor, checks naturalness, level, and whether the Chinese explanation matches the pattern. It is the separate local command `content:review` and writes `review.md` with line references. It never runs in CI and never receives a key from CI.

Do not auto-accept a lesson with any unresolved flag. A waived flag must state a reason and have owner approval. The owner reviews `review.md` per unit.

### 8.3 Audio

Provider: **VOICEVOX Engine**, local HTTP at `127.0.0.1:50021`.

- Voices: `No.7` (female, announcer style) and `青山龍星` (male) — final choice after the bake-off in §9.
- For each line: `POST /audio_query`, then `applyAccent(query, accentSpec)`, then `POST /synthesis`. VOICEVOX's `AudioQuery` carries an explicit `pitch` per mora; editing only the phrase `accent` field is not sufficient. The `applyAccent` adapter maps Kanjium's accent position to high/low morae and rewrites `moras[].pitch`. Validate the mapping against a 30-word reference set before rendering Unit 1.
- Accent editing applies to single-word items only. Sentence-level accent remains the engine default in v1; the F0 gate is post-v1 (§9).
- Render two speeds: normal and 0.85× (separate synthesis, not client-side time-stretch).
- Post-process with ffmpeg: trim silence, loudness-normalise to −16 LUFS, encode MP3 mono 64 kbps.
- Cache key: `sha256(provider|engineVersion|voice|speed|tts|accentSpec|pitchSpec|ffmpegVersion|lufs|bitrate|normalizationVersion)`. Persist the full render spec in `content/audio.manifest.json` so a changed accent or post-processing setting always produces a new hash.
- Upload to R2 as `audio/<hash>.mp3`; update the manifest. Upload goes to the private bucket; playback uses an Access-protected Worker route or a short-lived signed URL.
- Never re-render an unchanged hash. `--force` re-renders; otherwise skip existing hashes and verify the R2 object exists before recording the manifest entry.

### 8.4 Publish

- Bundle `content/` as static JSON into the app build. `content:publish` only builds.
- Deployment is a separate step: `.github/workflows/deploy.yml` runs on `main` after merge, then `wrangler pages deploy`. There is no deployment from a PR or from `content:publish`.
- No content writes to D1 at publish time.

---

## 9. Audio bake-off (first pipeline task)

Before rendering the preview set, compare three options on 30 sentences:

1. VOICEVOX No.7 / 青山龍星 with accent editing.
2. Style-Bert-VITS2 JP-Extra (neutral JVNV model).
3. Azure `ja-JP-NanamiNeural` (reference only; requires an Azure Speech key/account. If unavailable, skip option 3 and record why in the bake-off sheet).

Test set must include: 箸/橋, 雨/飴, 生, counters (3日, 1人, 4月8日, 20歳), compound nouns (東京大学), particle attachment, a long embedded clause, katakana loanwords, prices, question intonation, and a two-speaker dialogue turn.

Score: accent correctness against Kanjium, clarity, naturalness, speed consistency, artifacts. Output an HTML page with side-by-side players and a scoring sheet. Pass threshold: no more than 2 accent errors in 30 sentences, no obvious artifacts, and naturalness ≥4/5 on the owner's sheet.

Decision rule: VOICEVOX wins unless it is clearly worse on accent; keep the provider interface so the choice is reversible. Record the scoring sheet in the Phase 3 PR.

A later audio phase (post-v1) adds an automated F0 gate: extract the pitch contour (Parselmouth), classify morae high/low, compare with the expected accent, and flag mismatches for re-render or sentence replacement. It is not a v1 dependency; v1 relies on the owner's listening pass.

---

## 10. Application specification

### 10.1 Screens

| Route | Purpose |
|---|---|
| `/` | Today: one primary button, due count, next lesson, progress to N4 |
| `/lesson/:id` | Dialogue → words → grammar → quiz → conversation |
| `/review` | Card queue, time-boxed |
| `/progress` | Coverage, mastery, weak list |
| `/settings` | Furigana toggle, accent toggle, voice, speed, export, reset (persisted in D1) |
| `/about` | Attributions and licences |

No login screen. Cloudflare Access handles entry; the middleware validates the Access JWT, not the email header.

### 10.2 Today

- Primary CTA: 今日のメニュー.
- Secondary: 只做複習 (review only) and 繼續上次.
- Shows: cards due, new cards remaining, next lesson title, words known / total, estimated N4 readiness date.
- Readiness uses `profile.timezone` and `profile.target_exam_date`; show "not enough data" until at least 14 days of history exist.
- No streaks, no guilt copy.

### 10.3 Lesson renderer

1. **Dialogue:** first play is user-initiated (tap 再生); after that, line-by-line playback may auto-advance. Do not autoplay before a user gesture on iOS Safari. Furigana on, Chinese hidden until tap, normal and slow playback.
2. **Words:** card per word — surface, furigana, optional high/low accent marker, audio, Chinese gloss, one example. "Already know this" skips the intro but still schedules a check.
3. **Grammar:** one `GrammarPoint` at a time, ≤150-character explanation, 3 examples with audio, then 3 quick drills.
4. **Quiz:** 6–8 items, at least one listening.
5. **Conversation:** 5–8 turns; session id; inline correction for target patterns; end-of-turn summary for other errors.
6. **Done:** what changed in the knowledge bank, next review date.

### 10.4 Review cards

Five card types exist per item, but they are **introduced in stages**, not all at lesson completion. This keeps new-card load bounded. `VocabItem.cardTypes` is an exception override (for example, a function word that should not have a production card); it must be justified in QA and may not be used to introduce all five at once.

| Stage | Card types | When |
|---|---|---|
| 1 | meaning, reading | lesson completion (2 cards/word) |
| 2 | audio, cloze | after both stage-1 cards reach the Review state |
| 3 | production | after reading and meaning stability ≥ 7 days |

| Type | Prompt |
|---|---|
| reading | sentence with the word hidden → choose/type the reading |
| meaning | word or audio → choose the Chinese gloss |
| audio | hear the word in a sentence → choose meaning |
| cloze | sentence with a blank → choose the word |
| production | Chinese prompt → type the Japanese word into a frame, or tap-select from 4 choices |

Grading: incorrect → `Again`; correct but slow (>8 s) or after a hint → `Hard`; correct → `Good`; correct in <3 s with no hint → `Easy`. Log latency with every attempt.

New-card cap: 24 stage-1 cards per day (up to 12 words). A 10-word lesson introduces 20; a 12-word lesson introduces 24. Stage-2 and stage-3 cards use a separate **promotion budget** of 10 cards per day, so card types can mature without blocking new words. Total new cards per day never exceed 34.

### 10.5 Knowledge bank and planner

- FSRS state per `(item_id, card_type)`.
- Mastery = reading and meaning stability ≥ 21 days, reps ≥ 3 on both, and at least one successful production.
- Daily budget: the 50-card/12-minute box applies to **due review cards**; new and promotion cards are part of the lesson time and have their own caps (24 stage-1 + 10 promotion).
- Queue priority: overdue days × (1 + lapses), then `due_at`. The cap is enforced server-side.
- Overflow: remaining due cards stay due. There is no "decay" or "rebuild" step. If the due backlog exceeds 50 cards for two consecutive days, the next day is a consolidation day.
- Unstable word = any card in Learning/Relearning or stability < 7 days. If more than 25 introduced words are unstable, the next lesson is a consolidation lesson with no new words.
- A consolidation lesson is composed dynamically from existing content: 10 weakest words, 5 sentences, 1 listening item. It is not a git lesson and adds no new items.
- The weak list is deduped by item, top 20 lapsed, and injected into the tutor prompt.

### 10.6 Tutor prompt rules

System prompt must enforce:

- Traditional written Chinese for explanations; no English; no romaji in display fields. Ruby readings are allowed.
- No Chinese–Japanese grammar comparison. Demonstrate with examples.
- Target Chinese–Japanese ratio: 70/30 at N5, 50/50 at N4. Record the actual ratio per turn and flag drift in the eval.
- ≤150 characters per explanation, anchored to a sentence from the current lesson.
- Japanese must stay within the current level; the tutor may use unlearned grammar in its own speech but must not require the learner to produce it.
- Correct the current lesson's target patterns immediately; summarise other errors at the end of the turn.
- If the learner asks something above level: answer in one sentence, then return to the lesson.
- Reply in the JSON envelope from §7.8. No prose outside JSON.
- Context: send the lesson summary, `targetItemIds`, weak list, and the last 8 turns. Cap the prompt by tokens; never resend the entire lesson.
- On invalid JSON, retry once. If the second attempt is invalid, return a safe fallback envelope (`replyZh` apologising, `hintZh` with the next step), flag the turn, and do not break the conversation.

### 10.7 API

```ts
type ReviewCard = {
  itemId: string;
  cardType: "reading" | "meaning" | "audio" | "cloze" | "production";
  prompt: string;
  choices?: string[];
  answerIndex?: number;
  audio?: string;
  sentenceId?: string;
};
```

```
GET  /api/today              -> { dueCount, newCardsRemaining, nextLesson, consolidation }
GET  /api/review/queue       -> { cards: ReviewCard[], estimatedMinutes }
POST /api/review             { itemId, cardType, correct, latencyMs } -> updated ReviewState
GET  /api/lesson/:id         -> { lesson, progress }
POST /api/quiz               { lessonId, quizItemId, answerIndex, latencyMs } -> { result, updatedCards }
POST /api/chat               { sessionId?, lessonId, message } -> { sessionId, turn: TutorTurn }
POST /api/lesson/:id/done    { score? }
GET  /api/progress
GET  /api/settings
PUT  /api/settings           { furigana, accent, voice, speed }
GET  /api/export             -> JSON snapshot of progress/settings (owner only)
POST /api/flag               { kind, ref, note }
GET  /api/health
```

All request and response bodies are validated with shared Zod schemas. `_middleware.ts` validates `Cf-Access-Jwt-Assertion` against the team JWKS and the Access application AUD; it does not trust `Cf-Access-Authenticated-User-Email`. Every hostname (custom domain, `pages.dev`, preview URLs) must be behind Access or return 404. `/api/health` is the only unauthenticated route and returns no data. Restore is a CLI operation (`wrangler d1 import` or a documented migration), not a public API.

---

## 11. Acceptance criteria (v1)

The preview is done when:

1. The PWA installs and runs on Mac Chrome and iPhone Safari. First audio play requires a tap; no autoplay before a gesture.
2. Cloudflare Access blocks everyone except the owner's email. The middleware validates the Access JWT; `pages.dev`, preview URLs, and R2 are not reachable without Access.
3. 今日のメニュー loads with a due count, new-card remaining count, and the next lesson.
4. Unit 1 has three lessons and a checkpoint, all `verified`, with no unresolved flags.
5. Each lesson renders dialogue, ruby, Chinese-on-tap, audio (normal and slow), words, grammar, and a 6–8 item quiz; the checkpoint has 15 items.
6. Every audio reference has a manifest entry and is served through the private audio route and plays on both devices; a missing clip raises a flag and falls back to the browser voice.
7. Review schedules cards with FSRS (including `state`, `scheduled_days`, `learning_steps`) and persists across devices.
8. The tutor survives a 100-turn test: valid envelopes after at most one retry ≥99%, no English or romaji, no over-level demands, and the fallback envelope works.
9. Corrections are logged as attempts and appear in the weak list.
10. `/progress` shows words known/total, grammar coverage, and the weak list; readiness uses the profile timezone and shows "not enough data" before 14 days.
11. `pnpm content:gen|verify|review|audio` runs clean on Unit 1. `gen` skips existing files, `verify` passes deterministically in CI, and re-running audio uploads nothing new.
12. No secrets in git; secret scanning passes; `wrangler.toml` contains no keys.
13. `main` contains only approved merges. No phase was committed directly to `main`, and every stage has a merged PR.
14. Settings persist across devices; reset requires confirmation and offers export first.
15. Backup/export produces a restorable snapshot; restore is documented and has been tested once.
16. A 30-day simulated study keeps the review queue within 50 cards/12 minutes, with no unbounded backlog, and triggers consolidation correctly.
17. Content versioning is exercised: `schemaVersion` present, IDs stable, and a rename test leaves no orphaned `review_state` rows.

---

## 12. Git and review workflow

**`main` is protected. The agent never pushes to it.**

### 12.1 Branching

- `main` — always deployable, updated only by approved PR merges.
- `feat/phase-N-<slug>` — one implementation phase, e.g. `feat/phase-4a-app-shell`.
- `content/n5-uXX` — one content unit or batch, e.g. `content/n5-u01-preview`.
- `fix/<slug>` — bug fixes and hotfixes.

Branch from the latest `main`. No branch may outlive one stage. No force-push after a PR is opened.

### 12.2 Stages that require a PR

Each row is a separate branch and a separate PR:

| Stage | Branch |
|---|---|
| Phase 1 scaffold + CI + deploy | `feat/phase-1-scaffold` |
| Phase 2 content spec + Unit 1 lessons | `feat/phase-2-content` |
| Phase 3 audio pipeline + Unit 1 audio | `feat/phase-3-audio` |
| Phase 4a app shell + Today + lesson renderer | `feat/phase-4a-app-shell` |
| Phase 4b review/progress shells + settings UI | `feat/phase-4b-review-shell` |
| Phase 5a FSRS, attempts, review queue | `feat/phase-5a-fsrs` |
| Phase 5b planner, backlog brake, quiz grading | `feat/phase-5b-planner` |
| Phase 6 tutor | `feat/phase-6-tutor` |
| Phase 7 progress + polish + backup/export | `feat/phase-7-polish` |
| Each later content unit | `content/n5-uXX` |

Phase 0 is owner setup and does not enter the repository history.

### 12.3 PR requirements

Every PR must contain:

- What changed and why.
- Which phase or unit it completes.
- Step-by-step verification instructions.
- Evidence: screenshots for UI changes, short audio samples for TTS changes, `review.md` for content, and the 30-day simulation output for planner changes.
- The QA gate results from §8.
- A checklist confirming the phase checkpoint in §13 is met.
- Confirmation that no secrets, `.dev.vars`, or API keys are included, plus the secret-scan result.
- For progress or data-model changes, confirmation that export/import still round-trips.

Keep each PR small enough to review in one sitting. If a phase is too large, split it into sequential PRs, each still gated.

### 12.4 Review and merge

- The owner reviews and approves. The agent never approves or merges its own PR.
- A PR may be opened as a **draft** at the start of a phase for visibility, but a draft is never merged. Mark it ready for review only when the phase checkpoint is met.
- Address review comments with new commits on the same branch.
- Merge by **squash merge** only, then delete the branch.
- If approval is not given, stop and wait. Do not start the next stage and do not merge "temporarily".

### 12.5 CI on pull requests

Run on every PR and require it to pass before review:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (FSRS, planner, schema, 30-day simulation)
- `pnpm content:verify --all` when `content/` changes (deterministic G1–G12; G13 manifest coverage runs when an audio manifest exists; R2 existence is checked locally with `content:audio --check`; no API key, no network)
- `pnpm build`
- `pnpm test:e2e` (Playwright smoke on Chromium; iPhone Safari remains a manual gate)
- secret scan (e.g. `gitleaks detect`)

`content:review` (the LLM editor) is not run in CI. It runs locally, and its `review.md` is attached to the PR.

No **production** deployment from a PR. Production deployment happens only from `main` via `.github/workflows/deploy.yml` after merge: build, `pnpm content:publish`, `wrangler pages deploy`. Protected preview deployments are allowed for owner review, but every preview hostname must be behind Access and must never receive production secrets.

### 12.6 Branch protection (owner configures)

- Require a pull request before merging.
- Require at least one approval.
- Dismiss stale approvals when new commits are pushed.
- Block force pushes and deletions on `main`.
- Require status checks to pass, including the secret scan.
- Do not allow bypass, including for administrators.
- Require every preview deployment to be behind Access, or disable previews.

### 12.7 PR template

Create `.github/pull_request_template.md`:

```md
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
```

### 12.8 Exceptions

There are none for `main`. If `main` is broken, open a `fix/` PR, request expedited review, and still wait for approval.

---

## 13. Implementation phases

Each phase below is one branch and one PR (see §12). Do not start a phase until the previous PR is approved and merged.

Rough effort (agent-days; owner review is separate): Phase 1 1–2; Phase 2 4–6; Phase 3 3–5; Phase 4a 3–5; Phase 4b 1–2; Phase 5a 3–4; Phase 5b 3–4; Phase 6 2–4; Phase 7 3–5; each later unit 0.5–1.5 plus review. These are estimates, not commitments; update them after Phase 1.

### Phase 0 — Account setup and infrastructure provisioning

- [ ] Use the existing private repo `raito` (or rename it to `japanese-tutor` before Phase 1); add the agent.
- [ ] Enable branch protection on `main`: require a PR, require one approval, block force pushes and deletion (§12.6).
- [ ] `wrangler login`, or provide a scoped API token with Pages, D1, R2, Access, and DNS edit permissions.
- [ ] Fill in `infra/terraform.tfvars` and run `terraform apply` in `infra/`. It creates the D1 database, the private R2 bucket, the Pages project, the custom domain with its DNS record, and both Access applications (custom domain and `*.pages.dev`). The agent runs this when given a token; the owner supplies the account, zone, subdomain, and email.
- [ ] Copy `terraform output wrangler_vars` and `d1_database_id` into `wrangler.toml`.
- [ ] Manual, because no API expresses it: enabling Zero Trust for the account the first time (terms, team domain), accepting R2 billing if prompted, adding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets, and installing VOICEVOX plus ffmpeg.
- [ ] Put the OpenRouter key in `.dev.vars`; set a monthly cap (suggest $10). Do not put it in CI for `content:verify`.
- [ ] Confirm the subdomain, the Access email, the profile timezone, and the target exam date (if any).

### Phase 1 — Scaffold, CI, and deploy

- Vite + React + TS + Tailwind + Router + Query + Zod + ts-fsrs (pin the version and FSRS model).
- Pages Functions skeleton, `_middleware.ts` (Access JWT validation), `/api/health`.
- D1 migrations from §6; seed `profile` and `settings`; `wrangler.toml`; non-secret `TEAM_DOMAIN` and `POLICY_AUD` vars for Access JWT validation.
- `.github/workflows/ci.yml` (typecheck, lint, test, build, secret scan) and `deploy.yml` (main only).
- Deploy a hello-world build to a protected preview (or to `main` after merge) and verify Access rejects a request without a JWT and accepts the owner.
- **Checkpoint:** owner can open the deployed URL, gets the Access email code, sees "ok"; `pages.dev` and preview URLs are closed.

### Phase 2 — Content spec and preview content

- Implement schemas, `content:gen`, deterministic `content:verify` (G1–G12), and local `content:review`.
- Implement the prerequisite graph (G12) and the tokenizer/furigana alignment (G2–G3).
- Generate Unit 1 (three lessons), fix all QA flags, and run `content:review`.
- Produce `review.md`; owner reviews and approves.
- **Checkpoint:** owner approves the three lessons' Japanese, Chinese, and level fit; G1–G12 pass in CI without a key (G13 runs in Phase 3).

### Phase 3 — Audio

- Bake-off (§9); pick the voice; document the scoring sheet.
- Implement `applyAccent` (Kanjium → VOICEVOX mora pitch), two speeds, full render-spec hashing, private R2 upload, manifest.
- Render Unit 1; owner listens on both devices through the Access-protected route.
- **Checkpoint:** owner signs off on audio; every reference has a manifest entry and an R2 object.

### Phase 4a — App shell, Today, and lesson renderer

- Today, lesson, settings routes; review/progress may be placeholders.
- Ruby renderer, audio player with tap-to-start, Chinese-on-tap.
- **Checkpoint:** Unit 1 playable end to end without the tutor or review.

### Phase 4b — Review/progress shells and settings

- Review and progress route shells; settings UI (furigana, accent, voice, speed, export, reset).
- Persist settings through `/api/settings`; wire the reset confirmation and export-first flow.
- **Checkpoint:** settings survive a reload and a second device; reset requires confirmation.

### Phase 5a — FSRS, attempts, and review queue

- FSRS wiring with `state`/`scheduled_days`/`learning_steps`; attempts; staged card introduction.
- `GET /api/review/queue`, `POST /api/review`; server-side caps and priority.
- **Checkpoint:** two days of simulated review produce a correct queue; no card type is introduced before its stage.

### Phase 5b — Planner, backlog brake, and quiz grading

- Mastery, weak list, daily budget, consolidation composition.
- Quiz grading and attempt logging; readiness estimate.
- **Checkpoint:** a 30-day simulated study stays within 50 cards/12 minutes and triggers consolidation correctly; the tomorrow menu is correct.

### Phase 6 — Tutor

- `/api/chat` with OpenRouter, session state, envelope validation, retry, fallback.
- Prompt per §10.6; correction logging; weak-list injection; ratio tracking.
- **Checkpoint:** 100-turn test: valid envelopes after at most one retry ≥99%, no English/romaji, no over-level demands, fallback works.

### Phase 7 — Progress, polish, and backup

- Coverage view, weak list, readiness; empty/error states; loading states; iPhone audio unlock.
- `GET /api/export`; documented restore; Playwright smoke; secret scan.
- **Checkpoint:** acceptance criteria §11 all pass; export has been restored once.

### Phase 8 — Scale

- Batch-generate Unit 2 onward, one unit at a time, with the owner reviewing `review.md`.
- Ship each unit as its own `content/n5-uXX` PR with `review.md` and audio samples. Do not batch several units into one PR.
- Keep the preview deployable at all times; repeat the 30-day simulation at least once after a new card-type/stage change.

---

## 14. Open-source materials and licensing

| Source | Use | Licence |
|---|---|---|
| JMdict / JMdict-simplified | readings, POS, English glosses | CC BY-SA 4.0 |
| KANJIDIC2 | kanji readings, frequency | CC BY-SA 4.0 |
| Kanjium | pitch accent | CC BY-SA 4.0 |
| Tatoeba | example sentences; audio filtered to CC BY / BY-SA / CC0 | CC BY 2.0 FR, audio varies |
| Chinese Wiktionary | Chinese gloss cross-check | CC BY-SA 4.0 |
| Tae Kim's Guide | grammar reference, rewritten | CC BY-NC-SA |
| Official JLPT samples | listening reference, personal use only | copyrighted |
| VOICEVOX Engine + voice models | TTS | engine LGPL-3.0; each voice model has its own terms/credit |
| Style-Bert-VITS2 | bake-off reference only | AGPL-3.0; model terms vary |
| Irodori / Erin / NHK Easy / podcasts | external links only | free, all rights reserved |

Rules:

- Include an Attributions page listing every source and licence. Generate it from `content/sources.json` (built from lesson `sources`).
- Audio is private. R2 is not public; playback goes through the Access-protected Worker route or a signed URL.
- JMdict has no Chinese glosses; Chinese glosses are generated and spot-checked, then cached.
- Official JLPT samples are external links only; never host the audio. Tae Kim's Guide is CC BY-NC-SA and is used only for private reference; if the app becomes public, replace it with original explanations or a public-domain source.
- Tatoeba sentences require attribution; Tatoeba audio is filtered to CC BY / BY-SA / CC0.
- Check VOICEVOX voice-library terms and include the required credit for the chosen voice.
- JLPT Sensei / Tanos / jpdb are checklist references only; do not redistribute their lists. Check their terms before bulk use.
- The app stays private. If it ever becomes public, re-audit every licence, turn Tier 2 audio into links, and revisit the ShareAlike/NC question.

---

## 15. Costs

| Item | Estimate |
|---|---|
| Cloudflare Pages / D1 / Access | free tier |
| R2 (~0.5–1 GB audio for 150 lessons, two speeds) | free tier / cents |
| VOICEVOX | free, local |
| OpenRouter tutor | $1–5/month at 30–45 min/day; cap $10 |
| Content generation + LLM editor | $10–40 one-time for 150 lessons, model-dependent |
| Optional Azure reference | free tier ~0.5M chars/month; requires an Azure key |
| Owner review | 150 lessons × 10–15 min = 25–38 hours |

---

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| LLM writes unnatural Japanese | Tatoeba retrieval first; verifier model; owner review per unit |
| Wrong readings fossilised | kana-only `tts` field; JMdict validation; G2/G6 gates |
| Pitch-accent errors in sentence-level TTS | single-word accent editing; owner listening pass; F0 gate post-v1; replace failing sentences |
| Review queue explodes | staged card types; 24 stage-1 + 10 promotion cards/day; 50 cards/12 min; 30-day simulation |
| Curriculum forward references | prerequisite graph; G12 in CI; owner reviews the unit map |
| Agent mass-generates junk | preview gate; per-unit review; no auto-accept with flags |
| Scope creep | explicit non-goals §2 |
| VOICEVOX voice sounds synthetic | bake-off; provider interface; Azure fallback |
| iOS audio blocked | explicit user gesture before first play; tap-to-start; preload after gesture |
| D1 latency | single user; index `due_at`; cache static content in the bundle |
| D1 data loss | nightly export; documented restore; test the restore once |
| Content drift between git and D1 | no `items` table; content IDs only; manifest + tombstones |
| Access bypass | JWT validation; all hostnames behind Access; private R2 |
| Secrets leaked | `.dev.vars` ignored; Worker secrets; no keys in `wrangler.toml`; secret scan |
| Licensing violation (public audio/copyright) | private R2; JLPT links only; licence audit before any public release |
| Timeline slips | effort estimates; split phases; preview-first; reduce scope, not quality |

---

## 17. Decisions log

| # | Decision |
|---|---|
| 1 | PWA (React + Vite), not React Native |
| 2 | Written Chinese (Traditional) only; no English UI; no romaji |
| 3 | No Chinese–Japanese grammar comparison; examples instead |
| 4 | Dialogue-first lesson flow |
| 5 | 8–12 new words per lesson; staged card types; 24 stage-1 + 10 promotion cards/day; backlog brake at 25 unstable words |
| 6 | Review time-boxed to 10–12 min, capped at 50 cards |
| 7 | FSRS per `(item, card_type)`; pin `ts-fsrs` and the FSRS model |
| 8 | Tutor 70/30 Chinese–Japanese at N5, 50/50 at N4; enforced in the prompt and tracked per turn |
| 9 | Light pitch-accent display from N5; no drilling; toggle in settings |
| 10 | No ASR, handwriting, reminders, offline, multi-user |
| 11 | Content static in git; D1 stores progress, settings, and sessions only; no `items` table; audio in private R2 |
| 12 | Cloudflare Pages + Functions + D1 + R2 + Access |
| 13 | OpenRouter for the tutor; model configurable; pin a default and an eval set |
| 14 | VOICEVOX with accent editing; bake-off decides the final voice; F0 gate post-v1 |
| 15 | 150 micro-lessons total (N5 72 + N4 78); preview = N5 Unit 1 (3 lessons + checkpoint) |
| 16 | Access JWT validation; every hostname behind Access; private R2 |
| 17 | Backup/export is a v1 requirement |
| 18 | Deterministic QA runs in CI; the LLM editor runs locally |
| 19 | Deployment only from `main` via CI; `content:publish` never deploys |
| 20 | The 30-day queue simulation is an acceptance gate |
| 21 | Learner state stays in D1. Re-confirmed against an R2-only object store: R2 conditional writes are atomic and reads are strongly consistent after a write, so it is feasible, but a whole-object rewrite per card, no multi-key atomicity, and no SQL would move merge and replay logic into the app. Durable Objects with SQLite were also considered and rejected as a lateral move for this single-user workload |
| 22 | Cloudflare infrastructure is managed in Terraform under `infra/`, not by dashboard clicks. Content deployment (`wrangler pages deploy`) and D1 migrations stay in Wrangler; Terraform owns resource creation only |

---

## 18. Definition of done for the preview

- §11 acceptance criteria pass on both devices.
- Every phase and every unit landed as a separate PR that the owner approved; `main` has no direct commits.
- A 30-day simulated study passes the queue budget; the owner then studies Unit 1 for seven days and the planner behaves correctly.
- The owner has listened to every clip and flagged none.
- `review.md` has no unresolved flags. Waived flags state a reason and have owner approval.
- Backup/export has been run and restored once.
- Scaling to Unit 2 requires no code changes, only `content:gen → verify → review → audio`.

