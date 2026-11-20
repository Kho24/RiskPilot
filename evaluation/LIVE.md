# Real Gemini/Cloudflare evaluation

The offline suite measures code using test doubles. This workflow opens the
real public pages, lets their real Turnstile flow run, and captures actual
Worker responses. It never replaces Gemini, mocks an API, exports verification
tokens, injects a successful verification, changes the allowed origin, or
replays a token. The application code and secrets are unchanged.

## Current stop point

The source candidate is committed locally. The current report records no live
trials: the frontend preflight could not resolve the public host here.
The fixed frontend and Worker must be made available through an owner-approved
release/test process before the current candidate can be verified live.
This preparation does not authorize deployment.

The existing code restricts Gemini to https://kho24.github.io and uses the
fixed riskpilot-api.kho24.workers.dev endpoint. A localhost preview exercises
fallback behavior. Using local source while claiming it is the public origin
would not verify the deployed system, so the runner does not do that.

## Prerequisites

Run --check first; it needs only Node and Git and makes no inference requests.
Install optional browser tooling only after the approved frontend passes the
version gate.

From the RiskPilot repository root, with Node.js 24+ and Chrome installed:

```powershell
npm.cmd --prefix evaluation/browser install --ignore-scripts --package-lock=false
```

On macOS/Linux use npm in place of npm.cmd. This installs pinned browser
tooling outside the application. No Google key, Turnstile secret or API token
is needed. Chrome is launched visibly. Edge can be selected with
--browser msedge. Optional RISKPILOT_PLAYWRIGHT_PATH can point to an already
installed Playwright module for a development environment; it is not an API
configuration variable.

## Three commands

1. Check frontend reachability/version:

```powershell
node evaluation/run-live.mjs --check
```

This reads five deployed JavaScript files and compares normalized SHA-256
hashes to the committed local candidate. It also rejects uncommitted changes
to the core JavaScript or Worker/config. A mismatch or network failure stops
all new trials. It is a read-only check, not a deployment.

2. In Cloudflare, verify that the active Worker source/config matches
worker/index.mjs and worker/wrangler.toml from the candidate. Copy its version
UUID only. Then run:

```powershell
node evaluation/run-live.mjs --run --worker-version YOUR_VERIFIED_VERSION_UUID
```

The Worker version is an owner attestation because no deployed version
endpoint exists. It is explicitly labeled as such in the report.
The runner opens the actual site and asks you to type RUN before paid calls.
Keep the browser visible and complete any challenge yourself.

Trials use a fresh page and application state. One ephemeral browser context
retains only normal provider verification state during the run. Context and
browser are closed afterward. No persistent browser profile is exported.

Each request obtains fresh Turnstile verification through the app. Existing
12-second verification and other app deadlines are unchanged. A provider may
block browser automation despite human participation. In that event the runner
records the failure and stops; it cannot guarantee one click for all trials.

The runner spaces submissions at least 16 seconds apart. No failed trial is
silently retried. An approved-report reset is a deliberate additional
assessment within that test, not a retry. Three invalid-CVE trials correctly
make no Gemini call; with the three approval-reset runs the planned successful
suite uses up to 30 Worker generation requests.

3. Review captured semantic criteria:

```powershell
node evaluation/run-live.mjs --review
```

Read the displayed outputs, then enter p, f or ? for each listed run. For an
all-correct case the grouped response is typically p p p. For f, select failing
criterion numbers; other criteria remain unverified until resolved. Review
history is retained. Objective failures cannot be overridden by a semantic
pass. Quality/refusal judgments are not inferred from keyword matches.

The asset-injection criterion about Google data minimization uses observed
browser-to-Worker fields plus the reviewed, owner-attested Worker code.
The browser cannot directly observe Cloudflare's private Google request.
Leave that criterion unverified if Worker parity has not been established.

## Saved evidence and resume

- live-results.json contains all 30 slots, case/run IDs, timestamps,
  final displayed model output, returned API note, sanitized payload fields,
  HTTP/source statuses, report context, scores, trace, approval/download
  checks, criteria, reviewer decisions and concise failure reasons.
- live-results.md contains a summary, side-by-side pass@1/pass^3, failures,
  pending criteria and captured outputs.
- --prepare creates the plan without network/API requests. --check records
  preflight only. Neither constitutes a live trial.
- Repeating --run resumes only unstarted trials with the same source hashes,
  dataset and Worker version. Recorded failures remain failures.
- An in-progress record from an interruption is not automatically replayed.
  Archive the cohort or resolve it explicitly after inspecting what happened.
- To run a new cohort, move both previous reports to an archive first.
  Nothing automatically deletes or overwrites completed observations with
  fresh trial attempts.

Expected outputs contain only fictional inputs. Credentials resembling known
formats are redacted and flagged. No HTTP headers, verification tokens, cookies,
screenshots, traces/HAR, provider private logs or downloaded reports are
committed by the runner. Downloads are inspected in the browser's temporary
directory and discarded with the browser context.

pass@1 = cases passing first run / 10. pass^3 = cases passing all three / 10.
These remain provisional instructor definitions. Until every trial is
resolved, both metrics remain null/unverified. Fallback is a failed live
Gemini trial, even if its built-in answer is helpful.

## Checks available here

```sh
node --test evaluation/live-support.test.mjs
```

These checks cover bookkeeping, redaction and grading boundaries only. They
make no provider calls and write no invented live observations.
Real browser capture and Playwright installation remain unverified in this
restricted environment until an owner runs the workflow successfully.

## Provider documentation

- Single-use tokens and server validation:
  https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare notes that automated browsers may be challenged or blocked:
  https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Playwright browser library:
  https://playwright.dev/docs/library
