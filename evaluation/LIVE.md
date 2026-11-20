# Production live verification: automation blocked

## Three evidence sets

| Evidence | Recorded result | What it establishes |
| --- | --- | --- |
| Automated final-system evaluation | 231/231 offline trials; 77 cases x 3; pass@1 and pass^3 100% | Current schema, guardrails, regression/adversarial coverage and output validation against synthetic providers |
| Production Playwright | 3 failures; 27 unrun slots | Verification stopped before model output; trial 3 directly confirms zero Worker POSTs |
| Ordinary-browser manual verification | PASS, owner-reported | Gemini chat, real CVE/all stages, adversarial response and six approval/export checks |

The three production attempts remain failed in live-results.json and
live-results.md. All had browser-verification fallback and no Worker/Gemini
response. Trial 3 captured SDK/challenge resources, visible/focused browser
state, no token and zero Worker POSTs before the frontend's 12-second deadline.
Trials 1 and 2 have matching timing but lack request-event diagnostics.
The one challenge-resource HTTP 401 does not identify the precise provider cause.
No Worker or Gemini defect was demonstrated.

## Preserve the production security gate

Turnstile prevents this instrumented automated browser from reaching the API.
Cloudflare documents that Playwright can be detected as a bot and blocked.
Production Turnstile automation is not a supported verification path here.
Do not resume the production suite or change keys, Turnstile, deadlines,
allowed origins or evaluation criteria to make it pass. Do not use test keys,
token replay, stealth changes or simulated responses as production evidence.
This does not claim that Turnstile blocks every bot or prevents prompt injection.

The owner completed [MANUAL.md](MANUAL.md) in an ordinary browser and reported
success, including genuine Turnstile and Gemini responses. The separate
[manual-results.json](manual-results.json) records those supplied observations;
exact execution timestamps and transcripts were not supplied. Reproduction
steps remain in MANUAL.md. Do not rerun production automation for this evidence.
The short manual release checklist is not a completed 10-case x 3 genuine-model
study; confirm whether the instructor requires that additional live study.
The original live-cases.json criteria remain unchanged.

## Safe read-only checks

    node evaluation/run-live.mjs --check
    node --test evaluation/live-support.test.mjs

The first command compares public frontend hashes to committed source and
makes no inference request. The second runs offline harness bookkeeping,
redaction and diagnostic regression checks; it writes no live successes.
The saved cohort's frontend parity passed. The active Worker version/source
must be verified by the owner in Cloudflare; there is no automatic backend
version endpoint. A localhost preview uses fallback, not the real public
Gemini bridge.

The runner code and optional browser tooling are retained for reproducibility
and diagnosis. They are not a supported production challenge bypass. Normal
operation obtains a fresh, single-use verification token per API request.

## Evidence handling

Raw observations, failed criteria and the prior diagnostic explanation remain
preserved. The classifier correction recognizes the frontend's ellipsis.
New diagnostic capture counts the browser frame tree as well as the DOM, whose
query can miss a frame inside a shadow root. Neither correction changes grades.

Do not reset, delete or overwrite the three failures with successful manual
observations. Save manual notes/screenshots and the approved fictional report
separately. Never retain tokens, headers, cookies, HAR or credentials.
Fallback and unrun slots never count as successful Gemini trials. The production
metrics remain unverified while the cohort has pending slots; offline 100%
metrics must never be presented as live Gemini performance.

## References

- [Cloudflare automation testing guidance](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Cloudflare client-side error codes, including challenge HTTP 401](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/)
- [Token server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
