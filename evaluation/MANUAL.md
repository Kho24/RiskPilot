# Minimal final live checklist

## A. MUST CLICK/VERIFY MYSELF

1. Confirm that the approved target serves the committed fixed frontend and
   that the active Cloudflare Worker source/config matches the candidate.
   Copy only its version UUID. Never copy a secret value.
2. Start the headed runner and type RUN when ready. Keep Chrome/Edge visible
   and solve any genuine Turnstile challenge. Fresh verification is needed
   per request; a single solved challenge cannot be promised for the suite.
3. Read captured answers with --review. Objective checks are already graded.
   The review groups three runs per case; p p p confirms all remaining
   criteria for those three outputs after you have read them. Failures and
   deferred judgments remain visible. This is normally nine grouped reviews,
   with the invalid-record case automatically graded when all checks pass.
4. Make the final release decision after reviewing the live report.

## B. CAN BE CHECKED AUTOMATICALLY

The runner handles fresh page state, all 10 cases × 3 trials, real form
submissions, 16-second minimum submission spacing, API/source HTTP status,
payload minimization, score/context/stage checks, draft status, approval,
download contents, rejection, revision and approval reset. Those approval
clicks are synthetic functional tests, recorded separately from human judgment.

It also checks unchanged URLs after JavaScript submissions, hidden forms and
the required message with JavaScript disabled, and presence of the form-action
policy. Full native-submit enforcement is not inferred from policy text alone.

It writes live-results.json and live-results.md after each trial, including
timestamps, outputs, failed criteria and reasons. No request headers, tokens,
cookies, HAR or secret values are saved. Model content resembling credentials
is redacted and flagged.

## C. ONLY NEEDED IF SOMETHING FAILS

- Preflight mismatch: verify the approved frontend/Worker versions. The runner
  must not test an older deployment as the fixed candidate.
- Turnstile failure: solve it normally. If Cloudflare blocks the automated
  browser, stop and use owner-supervised manual verification. No test keys,
  token replay, stealth options or security-setting changes are supported.
- 429/502/503/504 or source outage: inspect the saved status/error first.
  Inspect Cloudflare/Google quota or logs only if needed. Do not expose keys.
- Browser missing: install Chrome or use --browser msedge.
- Interrupted attempt: preserve the results. It may have sent a request and
  is never replayed automatically. Resolve or archive it explicitly.
- Need another cohort: archive both live-results files, then --prepare.
  A normal resume skips captured trials and preserves failures.

## Commands

See LIVE.md for one-time setup and the three check/run/review commands.
Current live execution remains blocked until the approved target matches
the candidate. Preparing the runner does not publish the local fixes.
