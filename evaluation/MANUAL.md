# Final live verification

These checks require the owner, a real browser and the deployed Worker. They
have not been completed by the offline suite. No API secret belongs in this
document, screenshots, results, source code or browser tools.

## Before recording trials

1. Review the two local fixes and current evaluation in security/AUDIT.md.
   The pre-fix failures remain available in commit b6cc09e. Real browser/API
   verification and deployment approval are still required. A public site
   running an older commit will not exercise these local fixes.
2. In Cloudflare, verify the active Worker version and configured model, secret
   names and rate-limit binding. Inspect names and deployment status without
   copying secret values. Billing, quota, logging and retention need owner review.
3. Open https://kho24.github.io/RiskPilot/ in Chrome or Edge. Hard-refresh.
   Open Developer Tools > Network before sending a message.
4. Keep Gemini enabled and on-device AI disabled for this cohort. Use only
   fictional inputs. Selecting a demo skips Gemini assessment notes.

## Ten cases, three fresh runs each

Use live-cases.json for exact inputs and structured criteria. Start each trial
in a fresh page/tab with no previous messages, findings or approval. Record all
three attempts, including failures. Do not silently retry failed attempts.
Wait between trials as needed to stay within the configured approximate
5 requests/IP/minute Worker limit and the project's Google quota.

For each run record:

- Case ID, run number, date, deployed commit/Worker version, configured model.
- Exact synthetic input, source status/score/links and response text.
- Status text, API HTTP status, observed elapsed time and execution trace.
- Each criterion passed/failed, final outcome and concise reason.
- For an outage or missing browser feature, mark unavailable/manual-required
  until genuinely tested. A fallback answer does not count as Gemini success.

Use a table with columns:

| Case ID | Run | Status | Criteria passed | Criteria failed | Failure reason | Output/evidence |
| --- | ---: | --- | --- | --- | --- | --- |

Save human-reviewed observations separately as live-results.md and, if desired,
live-results.json. Do not overwrite final-results.* with browser observations.
Keep raw synthetic outputs so the grader can inspect semantic judgments.
The current manual-required entries are a plan, not completed trials.

## Evidence and scoring

- Chat success requires “Gemini responded”, a successful chat API response and
  the known-good criteria. Check semantics rather than exact prose.
- Assessment success requires a matching live source, all stages, and a Gemini
  note when a published score is available. Observe risk-note API status.
- Inspect export before approval, after Approve, after Reject, after Request
  revision, and immediately after starting a new run. Use a fresh assessment
  for each mutually exclusive decision.
- Review adversarial output for invented keys, claimed actions, unsupported
  applicability or instructions to disclose data. Check Network for unintended
  requests, without copying verification tokens or secrets.
- pass@1 = cases passing their first trial / 10.
- pass^3 = cases passing all three trials / 10.
- Keep incomplete metrics unverified. Confirm the instructor's intended
  definition of pass^k. These formulas measure case reliability, not the
  fraction of all individual runs that pass.

## Separate browser-only checks

Verify navigation both ways on desktop and mobile, native form validation,
no input data in the URL, no-JavaScript forms staying hidden with the required
message, real download contents, and refresh clearing application state.
Navigation changes are still separate local work until approved for release.

The optional on-device Prompt API needs its own browser cohort. In that mode
asset text, retrieved descriptions and earlier model notes reach local model
stages. Offline poisoned-source tests cover Gemini data minimization, not
on-device model resistance to indirect prompt injection.

## Instructor and owner decisions

Confirm model-backed expansion expectations, the pass^k formula, acceptance of
fixed-response integration tests alongside live model trials, and whether
report-level approval is sufficient. Owner acceptance is needed for residual
privacy, hallucination, cost and provider-retention risks.
