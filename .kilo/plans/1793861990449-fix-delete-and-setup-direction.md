# Trade logger: permanent deletes + Setup 1/2 long/short scenarios (stable IDs)

## Clarified intent (from user)
- **Setups:** Keep **2 setup cards/families** — Setup 1 and Setup 2. The user chooses **Long/Short at the beginning** of recording; that direction selects the correct **long or short scenario variant** for the chosen setup (Setup 1 has a long + short scenario; Setup 2 has a long + short scenario). **Do not** split into 4 separate setup cards/IDs and do not lock direction to the card.
- **Entry confluences:** Must be the correct *vice versa* per direction (mirrored rules for short vs long) for both setups.

## Current status (implemented in codebase — verify in runtime)
- **Delete persistence / cloud sync:** `src/App.tsx` applies realtime snapshots even when empty and guards in-flight deletes; `src/lib/cloudSync.ts` adds `users/{uid}/deletedTrades/{id}` tombstones, filters tombstoned IDs in `performFullSync` and `subscribeToTrades`, and never re-uploads tombstoned records. `src/lib/tradeStorage.ts` local delete unchanged.
- **Direction-aware confluences (stable IDs):** `src/types/trade.ts` defines `SETUP_1_GATES`/`SETUP_2_GATES` (long) + `SETUP_1_GATES_SHORT`/`SETUP_2_GATES_SHORT`; `getGatesForScenario(scenario, direction)` selects by direction. `SCENARIOS` descriptions are neutral. `src/components/LogTrade/LogTradeView.tsx` keeps 2 setup cards, keeps independent Direction control, and renders cards/banners/stop hint/gate checklist using `direction` + `getGatesForScenario(scenario, direction)`.
- **Data model:** `ScenarioId` remains `SETUP_1_VELOCITY` | `SETUP_2_DEEP_RETEST` (+ legacy). `TradeRecord` stores `direction` separately — **no migration**.

## Remaining work (actionable)

### 1) Sanity-check gate copy consistency (optional, low risk)
- **`src/types/trade.ts`** — Ensure `SETUP_1_GATES` / `SETUP_2_GATES` (long variants) use unambiguous Long-specific wording where the short variants now exist (remove residual “(or below/above for Short)” phrasing if present) so each variant reads clearly on its own. Keep semantics identical.
- Risk: copy-only; no logic/data change.

### 2) Runtime verification (required before considering done)
- **Deletion (guest):** delete trade(s), including the last one → refresh → stays deleted.
- **Deletion (signed-in/Firestore):** delete → refresh/new session/second tab → stays deleted; confirm trade doc removed and `users/{uid}/deletedTrades/{id}` exists. If deletes resurrect across devices/sessions, confirm Firestore rules allow read/write for `users/{uid}/deletedTrades/*` alongside `trades/*` and `screenshots/*`.
- **Setups (both directions):** with **Direction = Long** then **Short** (chosen at start/changed independently), select **Setup 1** and **Setup 2** → confluences/gates/banners/stop hint show the correct long vs short (vice versa) rules for that setup. Save a Long and a Short for each setup and confirm History/Analytics display the stored `direction` + setup correctly.
- **Typecheck:** `npx tsc --noEmit` passes (already validated in this session; re-run after any edits).

## Non-goals (per user decision)
- No split `ScenarioId`s (e.g., `SETUP_1_LONG/SHORT`), no 4 setup cards, no data migration/backfill for existing trades.
- No direction↔card locking.

## Risks / notes
- Tombstone approach depends on Firestore security rules permitting `deletedTrades`; without rules, cloud delete-permanence may be partial.
- Existing saved trades keep their stored `scenario` + `direction`; presentation now interprets them with direction-aware confluences.
