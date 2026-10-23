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

## Coherence Ring and Progress-Step Label Fixes

### Bug 1 — coherence ring

#### Finding before the fix

- The live Results route is ResultsScreen in src/App.tsx, not the unreferenced legacy src/components/ResultDetails.tsx.
- src/App.tsx:423-424 used the band helper, but classified solid with the green strong tone. The Results ring call at src/App.tsx:3507 did not pass scan.score_breakdown.band, so real scans fell back to score-only cutoffs.
- The canonical backend bands are in D:\RESYNC_DEV\backend\bcknd\resync - backend\services\scoring.py:431-436: Strong for scores >=85, Solid for scores >=70, and Needs Revision below 70.
- The reported four-way ring/percentage-bar layout is not present in this checkout. The actual Results implementation has one SVG progress arc plus four category rows showing counts. The before live sample DOM reported:

~~~text
ariaLabel: Coherence score: 74 out of 100, Moderate Coherence
dataBand: moderate
arcDasharray: 176.68317083788995 238.76104167282426
rows: Overall Status 1; Verified Alignment 3; Key Strength 0; Major Issue 3
~~~

The dash length is 74% of the 238.761 circumference, so the fill was already score-driven; the real defect was that the color did not use the backend band. The before screenshot showed the single 74/100 ring with its amber/brand gradient, not a static four-way split.

#### Fix

- src/App.tsx:423-424 now maps Strong/High to green, Solid/Moderate/Medium to the existing amber tone, and Needs Revision/weak bands to rose.
- src/App.tsx:2250-2251 derives displayBand from the real scan.score_breakdown.band and keeps the sample's existing Moderate Coherence label.
- src/App.tsx:3507 passes band=displayBand to the Results ring.

After the fix, the live sample Results render reported:

~~~text
ariaLabel: Coherence score: 74 out of 100, Moderate Coherence
dataBand: moderate
arcDasharray: 176.68317083788995 238.76104167282426
bandColor: #92400e
bandSurface: #fffbeb
~~~

The screenshot showed the 74/100 ring still filled to 74%, with the existing amber moderate treatment and the same visible category rows. A real authenticated scan was not available in this browser session; the real-scan band path is verified in source from scan.score_breakdown.band to ScoreRing.

#### Highlight verification

No highlight fix was needed. Both views already use the established categories:

- Real scans: src/App.tsx:2866-2899 maps material_issue to major-issue, key_strength to key-strength, and other findings to affected-section; src/App.tsx:2274-2311 supplies the rose, emerald, and blue styles.
- Sample report: src/App.tsx:2948-3155 uses the same rose/emerald/blue families in its inline marks.

The live sample DOM before and after returned distinct classes/colors, including bg-rose-200 for issue marks, bg-emerald-200 for strength/alignment marks, and bg-blue-200 for affected-section marks. No flat single-color highlight view was observed.

### Bug 2 — redundant progress-step labels

#### Finding before the fix

- The active ProcessingScreen at src/App.tsx:1788-1905 rendered the four requested steps and the redundant expression at src/App.tsx:1874-1877: Done, Running…, or —.
- The unreferenced legacy src/components/ScanForm.tsx:495-535 contained the same visible Done and Running… labels, so both copies were cleaned up.

#### Fix and after verification

- Removed only the trailing status-text spans from src/App.tsx and src/components/ScanForm.tsx.
- Kept the status icons, step titles, progress bar, finalizing state, and footer.

The reproduced post-fix ProcessingScreen snapshot was:

~~~text
progressbar "Manuscript analysis progress" value="50"
Reading your manuscript
Checking section alignment
Analyzing cross-chapter coherence
Verifying citation links
Typically 2–3 minutes · do not close this tab
~~~

There was no Done, Running…, or — beside any step. The screenshot showed the check icons for completed steps, the active/pulsing dot state, the progress bar, and the unchanged footer.

### Verification commands

~~~text
npm run lint
> react-example@0.0.0 lint
> tsc --noEmit
exit code 0

npm run build
vite v6.4.3 building for production...
✓ 2092 modules transformed.
✓ built in 29.34s
exit code 0
~~~

The build kept the existing Vite warning about chunks larger than 500 kB. git diff --check also passed with exit code 0 and no output. The only browser console/network error observed was the unrelated pre-existing GET /favicon.ico [404]; no Results or ProcessingScreen runtime error was observed.

## Results Screen Mockup Layout

### Built

1. The left pane now keeps the manuscript visible independently of the analysis tabs, with a manuscript eyebrow, the existing derived title in a serif display face, completion badge, divider, and a live assessment line. The real-scan line takes the band from `score_breakdown.band`, counts `inconsistencies`, and counts distinct nonempty `section_a`/`section_b` values touched by those findings. The sample path uses its own findings and assessed paragraph headings. The existing red, green, and blue highlight classes remain in use. See `src/App.tsx:2093`, `src/App.tsx:2197`, `src/App.tsx:2667`.
2. The current score ring and its existing advisory/count content remain at the top right. The pre-existing band-color change was preserved. The mockup's four-color ring and four percentage cards were not added. See `src/App.tsx:2866`.
3. A collapsible Coherence analysis section now contains AI synthesis, Recommendations, and References above the existing four tabs. AI synthesis uses the existing sample assessment or the real scan's `score_breakdown.biggest_lever.reason`, with an empty state when that reason is absent; the existing Strongest Alignment and Needs Attention cards were moved into it. Recommendations use only a finding's nonempty `evidence_a` (falling back to `evidence_b`) together with its `suggested_fix`; the count is the number of qualifying cards. References use the scan's existing citation list and existing citation renderer, with the requested guidance footer. See `src/App.tsx:2201`, `src/App.tsx:2322`, `src/App.tsx:2905`, `src/App.tsx:2926`, `src/App.tsx:2947`, `src/App.tsx:2958`.
4. The old left-pane four-tab strip was removed. Overview, Findings, Coherence Pairs, and Citations now sit below the new tab block on the right; the latter three retain their prior content and counts. Overview shows the existing Report by Section names and detection statuses, which provide a useful summary while the manuscript itself remains continuously visible on the left. Both the real and sample paths use this same layout. See `src/App.tsx:2971`, `src/App.tsx:3000`, `src/App.tsx:3001`, `src/App.tsx:3130`, `src/App.tsx:3209`.

### Omitted for lack of data

- No subtitle: neither the backend scan result nor the existing sample report provides a dedicated subtitle.
- No “Page 1 of 12” counter: no page count or current page is provided.
- No category eyebrow on reference entries: citation records do not have a category field.
- No separate publication/source line: the citation record supplies raw reference text and optional link/title/authors/year, but no reliably separate source field. Publication details remain in the citation text when present.
- No invented synthesis prose when `biggest_lever.reason` is absent, and no recommendation cards for findings without both a quote and suggested fix. The real backend currently supplies suggested fixes, not guaranteed sentence-level rewrites.

### Render verification and comparison

There was no authenticated browser session. I temporarily injected a fixture with the full `ScanResponse` field shape, two findings, two citations, a score breakdown, and manuscript text, then rendered `ResultsScreen` with `isSample=false` at `http://localhost:3000/?__verify_results`. This exercised the real-scan branch but was **not a completed backend scan**. The fixture code and browser storage entries were removed afterward. In the browser, the real path showed the derived title, 2 findings across 3 touched sections, 2 recommendation cards, 2 references, the four old tabs with their counts, and the original Findings content. Collapsing the analysis hid its contents while the manuscript stayed visible. The sample path also rendered the shared structure and was checked at desktop and mobile widths.

Screenshots, all outside the repo under `C:\Users\NHMIER\.claude\jobs\4a24cd9e\tmp\mockup-verify\`:

- `real-full.png` — full desktop Results screen.
- `real-header.png` — left header block.
- `real-synthesis.png`, `real-recommendations.png`, `real-references.png` — each new tab selected.
- `real-old-tabs.png` — the four existing tabs below the new block.
- `sample-final.png`, `sample-mobile.png` — sample desktop and mobile checks.

Concrete differences from mockups 01–04: the current score ring and score details remain by explicit scope; the right pane also retains its existing Analysis header, filters, recommendation list, and finding inspector, so it is longer than the mockup. The application navigation uses Home and its existing controls rather than the mockup's Scans breadcrumb. The fixture had 2 findings/2 references and the existing sample has 10 findings across 8 touched sections, 4 qualifying recommendations, and 6 citations, rather than the mockup's illustrative 10/5 and 3-card counts. Reference entries have no category or separate source line. The real manuscript plain-text preview includes its original title line as part of the document text. The subtitle and page counter are absent as noted above.

### Command output

```text
npm run lint
> react-example@0.0.0 lint
> tsc --noEmit
exit code 0

npm run build
> react-example@0.0.0 build
> vite build
vite v6.4.3 building for production...
✓ 2092 modules transformed.
dist/assets/index-UOUS64NL.css                  94.88 kB │ gzip: 16.64 kB
dist/assets/index-CJT9JSGv.js                  396.81 kB │ gzip: 123.81 kB
dist/assets/index-B-Ez09y9.js                  676.24 kB │ gzip: 176.78 kB
✓ built in 10.56s
exit code 0
```

The build also reported its existing warning for a chunk over 500 kB. `git diff --check` exited 0 with only line-ending warnings for the already modified report and `ScanForm.tsx`.

```text
warning: in the working copy of 'V6_FRONTEND_INTEGRATION_REPORT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/components/ScanForm.tsx', LF will be replaced by CRLF the next time Git touches it
 V6_FRONTEND_INTEGRATION_REPORT.md   | 156 ++++++++
 src/App.tsx                         | 705 +++++++++++-------------------------
 src/assets/guidance-reference.png   | Bin 1446264 -> 0 bytes
 src/components/ScanForm.tsx         |   8 +-
 src/imports/Untitled_design__1_.png | Bin 801931 -> 0 bytes
 5 files changed, 376 insertions(+), 493 deletions(-)
```

The worktree already contained unrelated modifications and untracked files at the start of this task. This implementation changed only the Results section of `src/App.tsx` and appended this report section; the earlier `App.tsx` and `ScanForm.tsx` edits were preserved. No commit or push was made.


## Results Panel Removals and Research Type

### Changes

- Removed the legacy Hide Analysis / Detailed Analysis & Recommendations header and collapse toggle. The right pane starts with the score ring; its four count rows and real-scan advisory dimension bars remain (src/App.tsx:2638-2679).
- Removed the separate Assessment filters, numbered Recommendations sidebar, Report by Section disclosure, Highlight Key, coherence badge, summary/guidance/categories block, and the finding inspector (src/App.tsx:2679-3053). The collapsible Coherence analysis and its three tabs, plus Overview, Findings, Coherence Pairs, and Citations, remain (src/App.tsx:2681-3052).
- The Overview tab uses the same section data as the removed Report by Section disclosure. Per the requested stop condition, its section list was preserved (src/App.tsx:2774); deleting it would empty Overview. For scans without a template, the list now falls back to detected and missing section names (src/App.tsx:1847-1859).
- Inline highlights are plain mark elements with the existing colors (src/App.tsx:2119,2188-2190). The inspector state and click handlers are gone. Findings cards retain their own expandable content inside the Findings tab.
- Removed the research type dropdown, its required-field gate, and scope-only copy from the main upload flow. The normal scan sends no template; a user can still attach or load an optional chapter template (src/App.tsx:1103-1115,1143,1247-1409). src/components/ScanForm.tsx already had no research type select or request field and was left unchanged by this task.

### Backend and payload check

The actual backend is D:\RESYNC_DEV\backend\bcknd\resync - backend. ScanRequest has no request research_type field; only user_id is required and template_toc defaults to None (main.py:289-324). research_type: Optional[str] = None at main.py:387 belongs to the response score breakdown. The pipeline passes req.template_toc to the parser (main.py:616-618). When the template is omitted, the parser runs auto_detect_sections, sets auto_detected: True, and returns the detected research type and confidence (services/parser.py:199-229). Its keyword heuristic returns quantitative, qualitative, mixed, or unknown (services/parser.py:429-450), and confidence affects structural scoring (main.py:634-637, services/scoring.py:92). Supplying a template instead takes the TOC path and returns research_type: "unknown" (services/parser.py:304-306); auto detection for scans with custom templates would require a backend change.

Chrome DevTools captured the frontend's intercepted outgoing POST /api/scans/start body with an unauthenticated fixture user: {"user_id":"fixture-user","doc_url":"https://docs.google.com/document/d/fixture-id/edit"}. It contains neither research_type nor template_toc. Capture: C:\Users\NHMIER\.claude\jobs\4a24cd9e\tmp\removal-verify\outgoing-scan-payload.json. No credit-consuming request was submitted. The running backend's OpenAPI schema confirmed only user_id is required and there is no request research_type field. A direct parser self-check in the backend .venv with an omitted template returned {'auto_detected': True, 'research_type': 'quantitative', 'detection_confidence': 1.0}.

### Visual and DOM verification

Screenshots are outside the repo in C:\Users\NHMIER\.claude\jobs\4a24cd9e\tmp\removal-verify\:

- sample-right-top.jpg, sample-right-bottom.jpg
- real-fixture-right-top.jpg, real-fixture-right-bottom.jpg
- scan-setup-no-dropdown.jpg

The real view used a temporary fixture shaped from a backend response because no authenticated session was available. The fixture and test routes were removed afterward. In both sample and real DOM checks, a highlighted manuscript passage was MARK with no role or tab index, its cursor was auto, and clicking it left "Why the AI Flagged This" absent. The sample retained all seven requested tabs. The real Overview fallback showed section rows after the template omission change.

### Commands

    npm run lint
    > react-example@0.0.0 lint
    > tsc --noEmit
    exit code 0

    npm run build
    > react-example@0.0.0 build
    > vite build
    vite v6.4.3 building for production...
    ? 2092 modules transformed.
    dist/assets/index-Ciiu9OhX.css  94.84 kB ? gzip: 16.63 kB
    dist/assets/index-CJT9JSGv.js  396.81 kB ? gzip: 123.81 kB
    dist/assets/index-DqJBi7DY.js  649.73 kB ? gzip: 171.13 kB
    ? built in 12.37s
    exit code 0

Vite warned that a chunk exceeds 500 kB. git diff --check exited 0 with line-ending warnings for the previously modified report and ScanForm.tsx. No commit or push was made.

## Dimension Cards, Progress Markers, and Back Navigation

### Task 1 — dimension cards

- `src/App.tsx:277,2133-2142,2645-2666`: added five fixed sample values (72, 68, 75, 70, 74) and rendered both sample and real advisory dimensions as a 2×2 tile grid plus a full-width Overall coherence tile. The real scan still averages finite pair values within `[0,1]`; each missing dimension renders `—` with an empty bar, and the group disappears when all five are missing. Existing amber, emerald, rose, blue, and primary color classes supply the dots and bars.
- `src/App.tsx:2669`: removed the four count rows beneath the score ring and their now-unused status palette fields. The ring, band, and Coherence analysis remain.
- Browser evidence: sample displayed `72%, 68%, 75%, 70%, 74%`; a temporary response-shaped real-scan fixture displayed `74%, 70%, —, 72%, 76%`. The fixture was removed from `App.tsx` after capture. No authenticated real scan was available.

### Task 2 — processing markers

- `src/App.tsx:1781-1818`: each pipeline marker is now at the row's right edge. The Finalizing row retains its title and subtitle and no longer has a trailing “Finalizing…” label.
- `src/components/ScanForm.tsx:495-544`: applied the same right-edge order to completed, active, and pending markers in its separate full-screen scanning overlay.
- Browser evidence: the live `ProcessingScreen` showed 25% at mid-progress and 99% with the Finalizing row visible. The `ScanForm` overlay was code-reviewed and passed lint/build; its authenticated upload flow was not exercised.

### Task 3 — back/navigation audit

`App.tsx` switches screens with React state. Before this change it did not add browser history entries; browser Back could leave the app or fail to return to the preceding app screen. `src/App.tsx:5290-5412` now records meaningful screens in `window.history.state`, handles `popstate`, and replaces transient processing/login/signup entries with the next meaningful destination. Back falls back to Home at the first internal entry and protects authenticated screens after sign-out.

| Control (current file:line) | Screen | Before | After / decision |
| --- | --- | --- | --- |
| Back, `src/App.tsx:1184` | Upload step 1 | Landing page, even when opened from Dashboard | Previous meaningful screen; Home only with no previous screen. Fixed. |
| Back to Step 1, `src/App.tsx:1184,1632` | Upload step 2 | Upload step 1 | Same local step; correct. |
| Home breadcrumb, `src/App.tsx:2452` | Results | Landing page | Explicit Home link; retained as allowed. Browser Back now returns the previous meaningful screen. |
| Back, `src/App.tsx:3279` | Login, Signup, Reset Password | Landing page | Previous meaningful screen, with Home fallback. Fixed through shared AuthLayout. |
| Back to login, `src/App.tsx:3904` | Reset Password | Login | Explicit login destination; retained. General Back skips auth screens. |
| Back to packages, `src/App.tsx:5054` | Dashboard payment modal | Package selection | Same local modal step; correct. |
| Return to Dashboard, `src/App.tsx:5277` | Payment receipt | Dashboard | Explicit destination; correct. |
| Back to top, `src/App.tsx:400` | Home/Dashboard | Scrolls to top | Scroll control; correct. |
| Back; Back to Manuscript Upload, `src/components/ScanForm.tsx:365,960` | Separate ScanForm | `onBack` callback or browser Back; local upload step | ScanForm is not mounted by App; callback and local step retained. |
| `< Home`, `src/components/ResultDetails.tsx:230` | Separate ResultDetails | `onBack` callback or browser Back | Explicit Home breadcrumb in an unmounted component; retained. |
| Back to landing page, `src/components/AuthAndLanding.tsx:136,240,333` | Separate auth views | Landing page | Explicit destination in unmounted components; retained. |
| Browser Back | Any App screen | No state-based screen history | Restores the previous meaningful screen; processing and auth entries resolve to their prior screen. Fixed. |

Click-through output from Playwright against `http://localhost:3000`:

```text
login: 1
login Back: home
signup: 1
signup Back: home
upload Back: home (temporary unauthenticated route fixture, removed)
browser Back from sample: Check your manuscript for coherence.
```

The upload fallback and sample browser Back were exercised. An authenticated Dashboard → Upload → real Results click-through could not be run without a session; the history logic and production build were checked, and no test fixture remains in the app.

### Screenshots

All screenshots are outside the repository under `C:\Users\NHMIER\.claude\jobs\4a24cd9e\tmp\cards-progress-back-verify\`:

- `sample-results-right-pane-top.png`
- `real-results-right-pane-top-missing-dimension.png` (temporary response-shaped fixture)
- `processing-mid-progress.png`
- `processing-finalizing.png`

### Commands and output

```text
npm run lint
> tsc --noEmit
exit code 0

npm run build
vite v6.4.3 building for production...
✓ 2092 modules transformed.
✓ built in 11.12s
exit code 0
Warning: some chunks are larger than 500 kB after minification.

git diff --check
exit code 0 (existing LF/CRLF warnings for the report and ScanForm.tsx)
```

No commit or push was made.
