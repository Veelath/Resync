# V6 frontend integration report

## Changes

- `src/types.ts`: Accept `key_strength` findings and an optional `v6_dimensions` score payload.
- `src/App.tsx`: Render model strengths as green evidence highlights and finding cards, add Key Strengths counts and filtering beside Major Issues, and show five advisory dimension bars when valid 0–1 values are present. Existing verified alignments remain a separate category.
- No CSS file changed; existing emerald, rose, and progress bar styles are reused.

## Verification

### 1. `npm.cmd run lint` — PASS

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

Exit code: 0.

### 2. `npm.cmd run build` — PASS

```text
> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 2092 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                  0.42 kB │ gzip:   0.29 kB
dist/assets/gemini-DHLTES1e.svg                  7.06 kB │ gzip:   2.91 kB
dist/assets/spacy-DyVR-Ylk.png                  11.55 kB
dist/assets/guidance-reference-BYdGxvCf.webp    64.17 kB
dist/assets/Untitled_design__1_-DI7xLwWX.webp  169.98 kB
dist/assets/IBMPlexMono-Regular-CaE70L_R.ttf   173.05 kB
dist/assets/IBMPlexSans-Regular-Bl2SjS7V.ttf   200.50 kB
dist/assets/index-B6FiHSH4.css                  94.25 kB │ gzip:  16.54 kB
dist/assets/index-CJT9JSGv.js                  396.81 kB │ gzip: 123.81 kB
dist/assets/index-LDPz5oF2.js                  683.42 kB │ gzip: 178.38 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 14.24s
```

Exit code: 0. The chunk size warning is from Vite.

### 3. Results rendering in the existing server — PASS

`netstat -ano | findstr ':3000 :3001'` showed both ports listening. I reused `http://127.0.0.1:3000` in Playwright. I temporarily supplied two local scan variants through a `?v6-preview` route, inspected the rendered DOM, then removed the route and fixture. The mixed scan contained one `key_strength` and one `material_issue`; the issue-only scan contained one `material_issue`.

Captured mixed-scan DOM result:

```json
{
  "keyStrengthLabels": ["Key Strengths (1)"],
  "issueLabels": ["Major Issues (1)"],
  "dimensions": [
    { "label": "Objectives alignment", "value": "80" },
    { "label": "Methodology fit", "value": "60" },
    { "label": "Numeric consistency", "value": "0" },
    { "label": "Claim support", "value": "70" },
    { "label": "Overall coherence", "value": "75" }
  ],
  "marks": [
    { "text": "The conclusion overstates a null result.", "bg": "oklch(0.892 0.058 10.001)" },
    { "text": "The objectives align with the measured outcomes.", "bg": "oklch(0.905 0.093 164.15)" }
  ]
}
```

After selecting `Key Strengths (1)`, the captured panel began `KEY STRENGTHS (1)\n\nShow all (2)\nExpand All\nKey Strength\n#1\nObjectives ↔ Results\nObjectives align with outcomes`; the selected filter used `bg-emerald-700 text-white`.

Captured issue-only DOM result:

```json
{
  "tabs": ["Overview", "Inconsistencies (1)", "Coherence Pairs (0)", "Citations (0)"],
  "strength": "Key Strengths (0)",
  "issue": "Major Issues (1)",
  "marks": [{ "text": "The conclusion overstates a null result.", "bg": "oklch(0.892 0.058 10.001)" }],
  "errors": false
}
```

The tab label was subsequently changed to `Findings` to account for both positive and negative model findings; lint and build were rerun after that change.

### 4. Final worktree commands — PASS (scoped changes identified)

Commands run:

```text
git -c safe.directory=D:/RESYNC_DEV/web/Resync-1 status --short --branch
git -c safe.directory=D:/RESYNC_DEV/web/Resync-1 diff --stat
```

Captured tracked diff stat:

```text
 src/App.tsx                         | 180 +++++++++++++++++++++++++-----------
 src/assets/guidance-reference.png   | Bin 1446264 -> 0 bytes
 src/imports/Untitled_design__1_.png | Bin 801931 -> 0 bytes
 src/types.ts                        |   3 +-
 4 files changed, 126 insertions(+), 57 deletions(-)
```

Captured `git status --short --branch` output:

```text
## development...origin/development [ahead 6]
 M src/App.tsx
 D src/assets/guidance-reference.png
 D src/imports/Untitled_design__1_.png
 M src/types.ts
?? .ai-backup/
?? CONCEPT_AND_FONT_REVIEW.md
?? OVERNIGHT_RUN_REPORT.md
?? RESULTS_UI_AUDIT.md
?? "The string is missing the terminator\357\200\272 \357\200\242."
?? UI_AUDIT_REPORT.md
?? UI_REDESIGN_PLAN.md
?? V6_FRONTEND_INTEGRATION_REPORT.md
?? VERIFICATION_REPORT.md
?? audit/C1.patch
?? audit/C10.patch
?? audit/C12.patch
?? audit/C13.patch
?? audit/C2.patch
?? audit/C3.patch
?? audit/C5.patch
?? audit/C6.patch
?? audit/C7.patch
?? audit/C8.patch
?? audit/C9.patch
?? audit/boundaries.patch
?? audit/citation-xai-live-audit-2026-10-20.md
?? audit/dashboard-bottom-1680.png
?? audit/dashboard-bottom-320.png
?? audit/dashboard-bottom-390.png
?? audit/dashboard-guidance-1680.png
?? audit/dashboard-outputs-guidance-1680.png
?? audit/dashboard-process-section-1680.png
?? audit/demo-route.patch
?? audit/home-bottom-1680.png
?? audit/home-bottom-320.png
?? audit/home-bottom-390.png
?? audit/results-citations.png
?? audit/results-coherence-pairs.png
?? audit/results-inconsistencies.png
?? audit/results-overview.png
?? audit/results-selected-finding.png
?? audit/section-view.patch
?? audit/verification-1280-citations.png
?? audit/verification-1280-coherence-pairs.png
?? audit/verification-1280-inconsistencies.png
?? audit/verification-1280-overview.png
?? audit/verification-390-citations.png
?? audit/verification-390-inspector.png
?? audit/verification-390-overview.png
?? bun.lock
?? concepts/
?? scripts/verify-dashboard-layout.cjs
?? src/assets/guidance-reference.webp
?? src/imports/Untitled_design__1_.webp
```

`git status` showed `M src/App.tsx`, `M src/types.ts`, the two deleted PNGs above, and numerous pre-existing untracked audit, report, asset, and backup files. The PNG deletions, replacement WebP files, and other `src/App.tsx` hunks were present before this session and belong to concurrent work; none were discarded. This report is the only additional root file from this session. `git diff --stat` excludes untracked files. The temporary `.playwright-mcp/` output was removed after inspection.

## Deliberate limits

- The backend field name and nesting were still in flux. The UI currently reads optional `score_breakdown.v6_dimensions`, either as direct dimension keys or under `dimensions`, and accepts a numeric value or `{ score: number }` per dimension. Unknown, absent, null, non-finite, and out-of-range values are omitted. Reconcile this adapter once the backend response is finalized.
- No new chart library, stylesheet, server, commit, or push was added.

## Reconciliation

The finalized backend sends `score_breakdown.v6_dimensions` as pair keys (`role_a::role_b`) whose values are dimension dictionaries. `src/types.ts` now describes that exact shape. `src/App.tsx` averages each dimension across pair entries with finite values in `[0, 1]`; null or invalid values do not enter the divisor. A dimension with no valid pair values has no bar. The sidebar calls the result a “pair average.” The earlier direct-key and `dimensions` adapter described above has been removed.

### Final code checks

`npm.cmd run lint` — **PASS**, exit code 0:

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

`npm.cmd run build` — **PASS**, exit code 0:

```text
> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 2092 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                  0.42 kB │ gzip:   0.29 kB
dist/assets/gemini-DHLTES1e.svg                  7.06 kB │ gzip:   2.91 kB
dist/assets/spacy-DyVR-Ylk.png                  11.55 kB
dist/assets/guidance-reference-BYdGxvCf.webp    64.17 kB
dist/assets/Untitled_design__1_-DI7xLwWX.webp  169.98 kB
dist/assets/IBMPlexMono-Regular-CaE70L_R.ttf   173.05 kB
dist/assets/IBMPlexSans-Regular-Bl2SjS7V.ttf   200.50 kB
dist/assets/index-B6FiHSH4.css                  94.25 kB │ gzip:  16.54 kB
dist/assets/index-CJT9JSGv.js                  396.81 kB │ gzip: 123.81 kB
dist/assets/index-DKg77tD4.js                  683.40 kB │ gzip: 178.37 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 11.38s
```

### Rendering check on existing server

**PASS.** I reused `http://127.0.0.1:3000`; ports 3000 and 3001 were already listening. I temporarily supplied `?v6-reconcile=strength` and `?v6-reconcile=issue` fixtures through the Results screen, then removed the fixture. The payload had three real-format pair keys: `objectives::methodology`, `methodology::results`, and `results::discussion`. `numeric_consistency` was null in every pair; `methodology_fit` was null in one pair. The expected means were 70%, 60%, omitted, 70%, and 70% in dimension order.

Captured Playwright browser evaluation on `http://127.0.0.1:3000/?v6-reconcile=strength`:

```json
{
  "summary": "ADVISORY DIMENSIONS · PAIR AVERAGE\n\nObjectives alignment\n70%\nMethodology fit\n60%\nClaim support\n70%\nOverall coherence\n70%",
  "bars": [
    { "label": "Objectives alignment", "value": "70" },
    { "label": "Methodology fit", "value": "60" },
    { "label": "Claim support", "value": "70" },
    { "label": "Overall coherence", "value": "70" }
  ],
  "strength": "Key Strengths (1)",
  "issue": "Major Issues (1)",
  "marks": [
    { "text": "The conclusion overstates a null result.", "bg": "oklch(0.892 0.058 10.001)" },
    { "text": "The objectives align with the measured outcomes.", "bg": "oklch(0.905 0.093 164.15)" }
  ]
}
```

Captured Playwright browser evaluation on `http://127.0.0.1:3000/?v6-reconcile=issue`:

```json
{
  "tabs": ["Overview", "Findings (1)", "Coherence Pairs (0)", "Citations (0)"],
  "strength": "Key Strengths (0)",
  "issue": "Major Issues (1)",
  "bars": ["70", "60", "70", "70"],
  "greenMarks": 0
}
```

The preview route, preview manuscript, and generated Playwright files were removed. No commit or push was made.

Final `git -c safe.directory=D:/RESYNC_DEV/web/Resync-1 diff --stat` — **PASS** for this session's scope; the PNG deletions and other App hunks remain from concurrent work:

```text
 src/App.tsx                         | 179 +++++++++++++++++++++++++-----------
 src/assets/guidance-reference.png   | Bin 1446264 -> 0 bytes
 src/imports/Untitled_design__1_.png | Bin 801931 -> 0 bytes
 src/types.ts                        |   3 +-
 4 files changed, 125 insertions(+), 57 deletions(-)
```

`git -c safe.directory=D:/RESYNC_DEV/web/Resync-1 diff --check` — **PASS**, exit code 0 with no output. Final `git status --short --branch` still listed `M src/App.tsx`, `M src/types.ts`, the pre-existing PNG deletions and untracked files, and this report; it did not list a preview fixture or `.playwright-mcp/`.

## Pre-Manuscript Render Investigation

### What was observed

The real-run evidence in [`audit/verification-1280-overview.png`](audit/verification-1280-overview.png) is not the sample/demo path. It shows the completed PAPAIA scan identified in the workspace report as `48055d44-f5fa-4f27-a47f-4577882c7153`. In the center manuscript pane, directly below the Results title card, there is a lone lowercase `i` on its own line. The manuscript then begins with the repeated PAPAIA title and cover-page text ("A Capstone Research Proposal", faculty/university lines, and author information). There is no spinner, error banner, JSON dump, or lorem-ipsum placeholder in that captured region; the anomalous content is the isolated `i` before the manuscript text.

The current browser session could not reopen that real run: the frontend has no URL/deep-link loader for an `analysis_run_id`, its `localStorage` and `sessionStorage` were empty, and unauthenticated `GET /api/scans/48055d44-f5fa-4f27-a47f-4577882c7153` and `/manuscript` both returned `401 Unauthorized`. I therefore did not use the sample view as evidence and could not honestly capture a post-fix screenshot of the authenticated real run in this session.

### Root cause

`ResultsScreen` fetches the real manuscript at [`src/App.tsx:2062-2064`](src/App.tsx:2062) and previously stored `res.text` unchanged. The real manuscript renderer then emitted that string verbatim with `whitespace-pre-wrap` at [`src/App.tsx:2691`](src/App.tsx:2691) and [`src/App.tsx:2849-2898`](src/App.tsx:2849). The only existing cleanup was `extractDisplayTitle` at [`src/App.tsx:2000-2013`](src/App.tsx:2000), whose `trivial` check already treats a standalone Roman-numeral line such as `i` as non-title content; that cleanup was not applied to the manuscript body. This is unrelated to the `finding_status`/`key_strength` and `v6_dimensions` changes, which do not touch manuscript fetching or rendering.

`src/components/ResultDetails.tsx:59-62` has a separate legacy caller, but `App` does not import or mount `ResultDetails`; the live Results screen is the `ResultsScreen` path above.

### Fix

Added `normalizeManuscriptPreview` at [`src/App.tsx:2016-2019`](src/App.tsx:2016) and applied it before storing the fetched text at [`src/App.tsx:2064`](src/App.tsx:2064). It removes a leading BOM/blank-line-prefixed numeric or Roman-numeral page marker, so the observed `i\nPAPAIA...` input begins at `PAPAIA...` while the rest of the manuscript remains unchanged.

### Verification

- `normalizeManuscriptPreview` self-check: **PASS** (`i\nPAPAIA: AN AI-POWERED SYSTEM` becomes `PAPAIA: AN AI-POWERED SYSTEM`).
- `npm.cmd run lint`: **PASS**, `tsc --noEmit`, exit code 0.
- `npm.cmd run build`: **PASS**, 2,092 modules transformed; Vite completed in 30.02s. The existing chunk-size warning (>500 kB) remains and is unrelated.
- `git diff --check`: **PASS**.
- Live browser console check: the only current-page error was the unrelated missing `/favicon.ico` (`404`); no manuscript render error was observed. A post-fix real-run screenshot remains **not captured** because the authenticated session required to load the documented run was unavailable and the backend rejected both read requests with `401`.

## Stuck Manuscript Loading Diagnostic

### 1. Loading fetch and state path

`package.json` defines `dev: vite`, `lint: tsc --noEmit`, and `build: vite build`. Before using the UI, `netstat` showed the repository's Vite process already listening on `127.0.0.1:3000` (PID 31140), so I reused it rather than starting a second server; no `:3001` listener was present in that check, and the local backend was listening on `127.0.0.1:8000` (PID 5012).

The live Results path is `ResultsScreen` in `src/App.tsx`, not the legacy `src/components/ResultDetails.tsx` (the latter is not imported or mounted). The real-data effect at [`src/App.tsx:2058-2072`](src/App.tsx:2058) runs only when `isSample` is false, an `analysis_run_id` exists, `manuscriptText` is still null, and there is no existing error. It sets `manuscriptLoading` to `true`, calls `fetchManuscript`, stores normalized text on a successful `{ available: true, text }` response, maps known failure reasons to an error message, and always clears loading in `.finally()`.

The visible Overview branch at `src/App.tsx:2683-2695` uses the same loading state and displays `Loading manuscript text…` (a single Unicode ellipsis). The exact three-dot string from the owner’s wording is also present in the primary inline renderer at `src/App.tsx:2843-2847`.

Before this fix, [`src/services/api.ts:579-599`](src/services/api.ts:579) performed the GET and awaited `response.json()` with no `AbortController`, timeout, or retry. Settled non-2xx responses and rejected fetches were already converted into an error and reached the App `.catch/.finally` path; they do not explain an infinite spinner. A request or response-body promise that never settles does: neither `.then`, `.catch`, nor `.finally` runs, so the UI can remain on `Loading manuscript text...` forever.

### 2. Breadcrumb/title source

The pre-fix title fallback at `src/App.tsx:2080-2083` used `scan.doc_url.split('/').pop()`. For `https://docs.google.com/document/d/<id>/edit?usp=sharing`, that returns the literal `edit?usp=sharing`, which the breadcrumb and Overview heading both rendered. This is a secondary defect: it produces the wrong label, but it does not cause the preview request to hang.

### 3. Reproduction path

The repository contains the real completed run ID `48055d44-f5fa-4f27-a47f-4577882c7153` and the Google Docs source URL used by the earlier audit. There is no URL/deep-link loader for an `analysis_run_id`, and this browser session had no authenticated Supabase storage. Direct calls to the local backend therefore produced:

```text
GET http://127.0.0.1:8000/api/scans/48055d44-f5fa-4f27-a47f-4577882c7153       STATUS=401 BODY=
GET http://127.0.0.1:8000/api/scans/48055d44-f5fa-4f27-a47f-4577882c7153/manuscript STATUS=401 BODY=
```

I did not present that unauthenticated response as a real completed Results render. To exercise the same live `isSample=false` code path, I temporarily supplied a Google-Docs-shaped scan fixture with `doc_url` ending in `edit?usp=sharing`, `analysis_run_id` set to a diagnostic ID, and the observed counter shape (5 findings, 7 pairs, 25 citations). The temporary fixture was removed after the reproduction. The preview request still went to the local backend; only the browser fetch promise was held pending after the request, isolating the frontend’s no-timeout behavior.

### 4. Captured network result and root cause

Before the fix, the Chrome DevTools viewport screenshot showed a white Overview card with the heading `edit?usp=sharing` and the loading message `Loading manuscript text…` below it (visually the same three-dot message reported by the owner). The tab bar simultaneously showed `Findings (5)`, `Coherence Pairs (7)`, and `Citations (25)`. There was no manuscript paragraph content in the card and no visible error state.

Chrome DevTools captured two preview requests in this reproduction:

```text
GET http://localhost:8000/api/scans/diagnostic-google-doc-run/manuscript [net::ERR_FAILED]
Console: Access to fetch ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present ...
```

The direct backend call above captured the corresponding unauthenticated `401` with an empty body. The authenticated Google-Docs backend behavior could not be verified from this session, so the lead that the backend only serves Google Docs previews remains unconfirmed. No backend file/line is named or changed: the evidence here identifies `/api/scans/{id}/manuscript` as the endpoint and shows an auth/CORS failure in this environment, not a confirmed backend Google Docs implementation defect. If an authenticated backend request can hang while reading Google Docs, that endpoint should also gain an upstream timeout, but that is not established by this reproduction and is outside this repository.

### 5. Frontend fix

- [`src/services/api.ts:580-620`](src/services/api.ts:580) now wraps the preview fetch and JSON read in a 15-second `AbortController` race, returns a distinct `timeout` reason, and preserves an HTTP status for settled non-2xx responses.
- [`src/App.tsx:2063-2072`](src/App.tsx:2063) renders a clear timeout or HTTP-specific error and still clears loading in `finally`, so the loading state cannot hang silently.
- [`src/App.tsx:2082-2095`](src/App.tsx:2082) parses URL pathnames instead of taking the raw slash tail and labels a Google Docs document `Google Docs manuscript` until a real title is available.

The fix is independent of today’s `finding_status`/`key_strength` and `v6_dimensions` work: those fields affect finding classification and the sidebar score breakdown, while this change is limited to the manuscript-preview service state and document-label fallback.

### 6. After-fix verification

The same temporary `isSample=false` reproduction was rerun after the fix. Its post-fix snapshot reported:

```text
Home
/ Google Docs manuscript
Overview
Findings (5)
Coherence Pairs (7)
Citations (25)
Google Docs manuscript
Manuscript preview timed out. Please try again.
```

The after screenshot showed the same Results layout and counters, but no `Loading manuscript text...`; the Overview card showed the `Google Docs manuscript` label and the red alert `Manuscript preview timed out. Please try again.` The browser console recorded `fetchManuscript failed: Error: manuscript-preview-timeout`. This confirms the pending-preview case now resolves to a real error state rather than an indefinite spinner; actual manuscript paragraphs could not be shown because the backend request was unauthenticated/CORS-blocked.

Final checks:

```text
npm.cmd run lint  -> PASS, tsc --noEmit, exit code 0
npm.cmd run build -> PASS, Vite 6.4.3, 2,092 modules transformed, exit code 0
git diff --check -> PASS, no output
```
