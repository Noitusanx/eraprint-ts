# EraPrint

EraPrint is a fan-made, mobile-first personality game. A user makes eight quick choices; the server converts those answers into eight personality traits, compares the resulting vector against 12 era profiles, and returns a Primary, Secondary, and Hidden Era plus an archetype and clarity score.

This repository is the MVP discussed in the product design conversation. It intentionally stops at the first complete EraPrint experience. EraMatch, Circle, Living EraPrint history, and real population rarity are the next product layers and can reuse the same trait vector and database model.

## Stack

- Next.js 16 + App Router
- TypeScript
- React 19
- Supabase Auth (anonymous users)
- PostgreSQL / Supabase Database
- Vitest for scoring tests
- Plain CSS (no UI framework required)

## What is implemented

- 8 locked personality traits
- 12 era profiles
- 30-question content bank
- 5 fixed anchor questions + 3 adaptive questions
- Hidden answer-to-trait weights (`-2..+2`)
- Reliability-weighted trait scoring
- Reliability-adjusted era matching
- Primary / Secondary / Hidden era blend
- Rule-based archetype
- EraPrint clarity
- Stable EraPrint fingerprint code
- Mobile-first game UI
- Result UI with all 8 traits and all 12 era affinities
- Local demo mode (Supabase is optional)
- Optional anonymous Supabase persistence
- PostgreSQL migration + complete seed data
- Row Level Security policies
- Unit tests for the scoring engine

## Important architecture detail

Hidden scoring weights do **not** go to the browser bundle.

The browser imports only `src/lib/data/public-catalog.ts`, which contains question text and choices. Adaptive question selection and final scoring are executed by server routes:

```text
POST /api/game/next
POST /api/game/result
POST /api/game/persist
```

The full scoring catalog lives in `src/lib/data/catalog.ts` and is only used by server-side scoring code and tests.

## Quick start — demo mode

You do not need Supabase just to try the game.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

In demo mode, the latest answer session is kept in `localStorage`. The result is still calculated by the Next.js server route.

## Run verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Catalog-specific verification:

```bash
npm run verify:catalog
```

## Connect Supabase

### 1. Create a Supabase project

Create a project in the Supabase dashboard.

### 2. Enable anonymous sign-ins

In Supabase Auth settings, enable anonymous sign-ins. EraPrint uses anonymous auth so first-time users do not need email/password.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

### 4. Apply database schema and seed

With the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then run the seed SQL in the Supabase SQL editor, or use a local Supabase workflow that executes `supabase/seed.sql`.

Files included:

```text
supabase/migrations/202608070001_init.sql
supabase/seed.sql
```

The seed contains:

- 8 traits
- 12 eras
- 96 era-trait values
- 30 questions
- all choices
- all hidden trait effects

## Scoring model V1

### Trait score

Every trait starts conceptually at neutral `50`.

For each trait:

```text
traitScore = 50 + 25 * totalEffect / (evidenceCount + 3)
```

Then clamp to `0..100`.

Reliability:

```text
reliability = evidenceCount / (evidenceCount + 3)
```

The `+3` prior prevents one answer from creating an extreme personality score.

### Era comparison

The app does not use logic such as:

```text
answer A -> +10 reputation
```

Instead:

```text
answer
  -> trait effects
  -> 8-dimensional user vector
  -> compare against 12 era vectors
```

Before comparing, an era profile is shrunk toward neutral when a user trait has low reliability:

```text
adjustedEraTrait = 50 + reliability * (eraTrait - 50)
```

Weighted squared distance is converted to affinity with:

```text
affinity = exp(-distance / 0.008)
```

All affinities are normalized to a 100% Era Blend.

These percentages are entertainment-model affinity weights, not psychological probabilities.

## Adaptive question flow

The first five questions are fixed anchors:

```text
Q01 Relationship
Q03 Lifestyle
Q04 Conflict
Q11 Future
Q19 Imagination
```

After those five answers, the server:

1. computes the preliminary trait vector;
2. finds the top three candidate eras;
3. measures which traits best separate those candidates;
4. ranks unanswered questions by discrimination + current information deficit;
5. applies light category balancing;
6. picks one of the top candidates using a deterministic hash of prior answers.

This repeats until the user has answered eight choices total.

## Database model

Reference/configuration tables:

```text
traits
eras
era_trait_profiles
questions
question_choices
choice_trait_effects
```

User data:

```text
profiles
game_sessions
answers
eraprint_snapshots
eraprint_trait_scores
```

`choice_trait_effects` is intentionally not granted to browser roles.

Game persistence uses a client-generated `client_request_id` so writes are idempotent even if React development mode triggers effects more than once. The browser only obtains an anonymous Supabase JWT; `/api/game/persist` re-validates the exact adaptive sequence, recalculates the EraPrint on the server, and writes through PostgreSQL RLS. The browser never submits a trusted score/result payload.

## Key source files

```text
src/lib/data/catalog.ts
  private scoring catalog

src/lib/data/public-catalog.ts
  browser-safe question content

src/lib/scoring/scoring-engine.ts
  trait scoring, era matching, adaptive selection, archetypes

src/app/api/game/next/route.ts
  adaptive question endpoint

src/app/api/game/result/route.ts
  result calculation endpoint

src/app/api/game/persist/route.ts
  trusted Supabase persistence endpoint

src/components/game-client.tsx
  eight-choice game UI

src/components/result-client.tsx
  EraPrint result UI

tests/scoring-engine.test.ts
  scoring unit tests
```

## Product scope after this MVP

The next features should reuse the existing `eraprint_trait_scores` vector:

1. Living EraPrint — append daily choices and create new snapshots.
2. EraMatch — compare two users' trait vectors and era blends.
3. Swiftie Circle — aggregate 3–10 vectors and calculate group dynamics.
4. Real Rarity — aggregate stable signatures only after enough eligible profiles exist.

Do not implement those by creating separate personality systems.

## IP / fan-project note

This project uses original UI, generic era names, and original copy. It does not ship official photos, album artwork, long lyrics, logos, or voice/likeness assets. Keep a visible fan-made / unofficial disclaimer if deploying publicly, and obtain appropriate legal review before commercial use.
