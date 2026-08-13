# EraPrint

EraPrint is a fan-made, mobile-first entertainment personality game. A new visitor makes 13 choices, receives an EraPrint built from eight personality signals and 12 Era profiles, and can share or compare that persisted result with friends.

No Google or email login is required. When Supabase is configured, the app uses an anonymous authenticated session so a browser can own its profile, refine it over time, and create social experiences without exposing private profile IDs.

## Current features

### Initial EraPrint

- Exactly 5 fixed anchor questions followed by 8 adaptive questions.
- The first result is generated only after all 13 questions are answered.
- Adaptive selection is deterministic and runs on the server.
- 8 personality signals, 12 Era profiles, and a 30-question catalog.
- Primary, Secondary, and Hidden Era results.
- Archetype, Clarity, full Era Blend, strongest signals, and fingerprint.
- Browser-safe public question data; hidden choice effects stay server-side.
- Responsive UI for mobile, tablet, and desktop.

### Persisted public results

- Anonymous Supabase persistence with Row Level Security.
- Immutable public result URLs at `/result/{snapshotId}`.
- Public result pages read stored snapshot values rather than recalculating them.
- PNG Share Card generation, native sharing when available, downloads, and copied result text.
- Old shared URLs remain unchanged when a profile is refined later.

### Living EraPrint

- An owner can optionally refine their latest persisted EraPrint.
- Refinement continues through unused adaptive questions until the user finishes later or exhausts the catalog.
- Previously answered questions are never selected again.
- Results are calculated from the full cumulative answer history.
- A completed refinement creates a new immutable snapshot instead of overwriting the old one.
- Snapshot history records the previous snapshot, answer count, catalog version, and scoring version.
- The updated result can show meaningful changes from the immediately previous snapshot.
- Refinement stops only when the 30-question catalog is exhausted.
- Only the profile owner can refine a snapshot, and refinement must start from the latest owned snapshot.

### EraMatch

- Create an invite from a persisted EraPrint.
- A friend joins with their own latest persisted EraPrint or completes EraPrint first.
- Compares all 8 signals and both 12-Era blends.
- Shows an overall match score, strongest shared signals, biggest contrast, shared Era, and side-by-side profiles.
- Match results are immutable and keep referencing the exact snapshots used when the match was created.
- Public match result pages include links back to Profile A and Profile B when snapshot links are available.

### Circle

- Create a Circle from a persisted EraPrint and invite 3–10 members.
- Public lobby with member count, join state, invite actions, and owner-only reveal.
- Circle results include Primary, Secondary, and Hidden Circle Eras, averaged signals, strongest signals, Most United, Most Different, Era Blend, and member profiles.
- Circle membership and finalized results keep the exact snapshots used at that time.
- A later Living EraPrint refinement does not change an old Circle result.

## Intentionally not implemented

- Google login.
- Email/password login.
- Cross-device account recovery or profile history.
- Real Rarity population statistics.

The current profile ownership boundary is designed so an anonymous profile can later be attached to a permanent account without replacing its snapshot history.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Supabase Auth with anonymous sign-in
- PostgreSQL / Supabase Database
- Vitest
- Tailwind PostCSS plus project CSS

## Architecture and security

Hidden scoring data does **not** go to the browser bundle.

The browser imports `src/lib/data/public-catalog.ts`, which contains only the question and choice content needed to render the game. Hidden choice-to-signal effects, internal Era vectors, scoring, and adaptive ranking remain in server code.

The initial game and Living EraPrint use separate validation boundaries:

```text
validateInitialGameSequence(...)
  enforces the ordered 5-anchor + 8-adaptive initial flow

validateLivingEraPrintAnswers(...)
  validates the cumulative history and every new deterministic answer
```

For every adaptive step, the selector:

1. calculates current signal evidence;
2. finds the closest Era candidates;
3. looks for signals that distinguish those candidates;
4. considers evidence gaps and category diversity;
5. excludes answered questions;
6. uses deterministic ranking and tie-breaking.

The same answers, answered-question set, catalog, and scoring version produce the same next question. The selector does not use `Math.random()`.

## Scoring model V1

Every signal begins conceptually at neutral `50`.

```text
signalScore = 50 + 25 * totalEffect / (evidenceCount + 3)
reliability = evidenceCount / (evidenceCount + 3)
```

Scores are clamped to `0..100`. The prior of `3` prevents a small amount of evidence from creating an extreme value.

Era comparison uses the complete 8-dimensional signal vector rather than assigning answers directly to an Era:

```text
answer
  → hidden signal effects
  → 8-signal EraPrint
  → comparison with 12 Era profiles
```

Era values are adjusted toward neutral when evidence reliability is low:

```text
adjustedEraSignal = 50 + reliability * (eraSignal - 50)
affinity = exp(-distance / 0.008)
```

Affinities are normalized into the Era Blend. These values are entertainment-profile affinities, not psychological probabilities or scientific accuracy claims.

Clarity comes from actual evidence coverage and reliability. It is not automatically increased merely because a refinement round was completed.

## Persistence model

Core reference tables:

```text
traits
eras
era_trait_profiles
questions
question_choices
choice_trait_effects
```

Profile and EraPrint history:

```text
profiles
game_sessions
answers
eraprint_snapshots
eraprint_snapshot_answers
eraprint_trait_scores
```

Social tables:

```text
eraprint_match_invites
eraprint_matches
eraprint_circles
eraprint_circle_members
eraprint_circle_results
```

One anonymous profile can own many immutable snapshots:

```text
Profile
├── Historical Snapshot — 8 answers (legacy initial flow)
├── Snapshot 1 — 13 answers
└── Snapshot 2 — cumulative refinement history
```

`eraprint_snapshot_answers` stores the exact cumulative answer manifest for each snapshot. `previous_snapshot_id` links its history. Result evidence and snapshots are append-only so old result, Match, Circle, and Share Card sources cannot silently change.

Browser writes use the anonymous Supabase JWT and PostgreSQL RLS. Server routes revalidate ownership, question sequence, choices, and scoring rather than trusting result values submitted by the browser.

## User-facing routes

```text
/                              homepage
/play                          initial 13-question EraPrint
/result                        result calculation and initial persistence
/result/{snapshotId}           immutable public EraPrint snapshot
/refine/{snapshotId}           owner-only Living EraPrint round
/match/{inviteId}              EraMatch invite
/match/result/{matchId}        immutable public EraMatch result
/circle/{circleId}             Circle lobby
/circle/result/{resultId}      immutable public Circle result
```

## Server endpoints

Initial EraPrint:

```text
POST /api/game/next
POST /api/game/result
POST /api/game/persist
POST /api/share-card
```

Living EraPrint:

```text
GET  /api/refine/{snapshotId}/state
POST /api/refine/{snapshotId}/session
POST /api/refine/{snapshotId}/answer
POST /api/refine/{snapshotId}/next
POST /api/refine/{snapshotId}/complete
```

EraMatch and Circle:

```text
POST /api/match/invites
POST /api/match/invites/{inviteId}/complete
GET  /api/match/snapshots/current

POST /api/circle
POST /api/circle/{circleId}/join
GET  /api/circle/{circleId}/participant
POST /api/circle/{circleId}/finalize
```

## Quick start

Requirements:

- Node.js `20.9.0` or newer.

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Demo mode

The initial 13-question game and local result work without Supabase. The latest initial answer session is kept in `localStorage`, while scoring still runs through the Next.js server route.

Features that require owned persisted snapshots—Living EraPrint, immutable public result URLs, EraMatch, and Circle—require Supabase configuration.

## Connect Supabase

1. Create a Supabase project.
2. Enable anonymous sign-ins in Supabase Auth.
3. Copy the environment file:

```bash
cp .env.example .env.local
```

4. Set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. Link the Supabase CLI and apply migrations:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

6. Run `supabase/seed.sql` through the SQL editor or a local Supabase seed workflow.

Migration history:

```text
supabase/migrations/202608070001_init.sql
supabase/migrations/202608070002_public_results.sql
supabase/migrations/202608080001_era_match_v1.sql
supabase/migrations/202608090001_match_result_profile_links.sql
supabase/migrations/202608100001_circle_v1.sql
supabase/migrations/202608100002_living_eraprint_v1.sql
supabase/migrations/202608110001_resumable_refinement.sql
supabase/migrations/202608110002_circle_lobby_roles.sql
supabase/migrations/202608110003_circle_result_member_identity.sql
supabase/migrations/202608120001_circle_lobby_creator_identity.sql
supabase/migrations/202608130001_continuous_refinement.sql
supabase/migrations/202608130002_remove_refinement_modes.sql
supabase/migrations/202608130003_initial_thirteen.sql
```

The seed contains 8 traits, 12 Eras, 96 Era-signal values, 30 questions, all public choices, and all hidden effects.

## Verification

Run the complete project checks:

```bash
npm run typecheck
npm run lint
npm test
npm run verify:catalog
npm run build
```

Other available commands:

```bash
npm run test:watch
npm run verify:engine
npm run check
npm start
```

## Key source files

```text
src/lib/data/catalog.ts
  server-only scoring catalog

src/lib/data/public-catalog.ts
  browser-safe question and choice content

src/lib/scoring/scoring-engine.ts
  scoring, deterministic adaptation, validation, archetypes, fingerprints

src/components/game-client.tsx
  initial game UI

src/components/result-display.tsx
  local and persisted result presentation, sharing, social entry points

src/components/refine-client.tsx
  Living EraPrint question flow

src/components/match-invite-client.tsx
src/components/match-result-display.tsx
  EraMatch invite and result UI

src/components/circle-lobby-client.tsx
src/components/circle-result-display.tsx
  Circle lobby and result UI

src/lib/repositories/
  Supabase persistence and public-read boundaries

tests/scoring-engine.test.ts
tests/era-match.test.ts
tests/circle-engine.test.ts
  deterministic scoring and social-engine tests
```

## IP / fan-project note

EraPrint is an unofficial fan project. It uses original UI and original copy and does not ship official photos, album artwork, long lyrics, logos, or voice/likeness assets. Keep a visible fan-made/unofficial disclaimer when deploying publicly and obtain appropriate legal review before commercial use.
