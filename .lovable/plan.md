# Mindscape Companion — Production Hardening Plan

The request spans 14 phases. Much of phases 2–11 is already built in your project (DSM disorders, search, analyzer, learning, clinical, bookings, chat, research, admin, Capacitor). I'll focus this round on what's actually broken or unsafe, then layer the remaining modules in follow-up rounds so each ships verified.

## Round 1 — Critical security + data model (this turn)

**Migration 1: lock down subscriptions**
- Drop `sub insert own` and `sub update own` policies on `public.subscriptions`.
- Keep `sub read own` + `sub admin all`. Only `service_role` (server fn) and admins can write tier/expiry.
- Add a `seed_free_subscription` trigger on `auth.users` so every new user gets a `free` row automatically (no client insert needed).

**Migration 2: relational client linkage on clinical_assessments**
- Add `client_id uuid` column (nullable for back-compat) and index.
- Keep `patient_label` for off-platform clients but require ONE of (`client_id`, `patient_label`) via CHECK.
- RLS: practitioner owns row (already enforced); add policy so the linked client can `SELECT` their own assessments.

**Migration 3: audit log table**
- `audit_logs(id, actor_id, action, entity, entity_id, metadata jsonb, created_at)`.
- RLS: admin read-all; users read own actor rows; inserts via service_role only.

**Migration 4: tighten role self-assignment**
- Already restricted to `student`/`patient`. Confirmed — no change.
- Clients (patient role) auto-assigned by `handle_new_user` trigger → no approval needed. Already true.

## Round 2 — Profile system per role (next turn)

New tables: `researcher_profiles`, `student_profiles`, `client_profiles` (mental-health history, private). `practitioner_profiles` already exists as `psychologist_profiles`. Each role's onboarding routes to a profile-creation step before dashboard.

## Round 3 — Client wellness module

`mood_entries`, `sleep_entries`, `journal_entries` with AI tone analysis via existing `analyzer.functions.ts`. Crisis-keyword detection triggers hotline UI. CBT/breathing tools as static content components.

## Round 4 — Clinician SOAP + treatment plans

Extend `clinical_assessments` with `soap_subjective/objective/assessment/plan` columns and session-summary view.

## Round 5 — Researcher analytics

Anonymized aggregate views (no PII), comorbidity matrix from `disorder_relations`, existing CSV/JSON export already shipped.

## Round 6 — Android build fix

Recreate Capacitor Android platform cleanly:
```
bunx cap add android   # regenerates capacitor.settings.gradle
bun run build           # produces dist/client/index.html
bunx cap sync android
```
Document in README. (Cannot run Android Studio from here — instructions only.)

## Technical notes
- DSM full-text seeding: parsing the 1000+ page PDF and inserting every disorder is a separate batch job. I'll do it in a dedicated round after the schema is locked, so we don't churn data while changing tables.
- No edge functions — all server logic stays in `createServerFn`.
- Ethical guardrail: analyzer output already uses suggestive language, not diagnosis. I'll add a hard banner on client-facing results.

## This turn delivers
Round 1 migrations + a one-page README section explaining Android build steps and how to verify each fixed security finding.

Reply **continue** to apply Round 1, or tell me which round to prioritize.